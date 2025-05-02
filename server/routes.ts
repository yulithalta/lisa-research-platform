import express, { type Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { fileManager } from "./fileManager";
import path from "path";
import fs from "fs";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup static file serving for uploads directory
  const uploadsDir = path.join(process.cwd(), "uploads");
  
  // Create uploads directory if it doesn't exist
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  
  app.use("/uploads", express.static(uploadsDir));

  // API endpoints
  // Get stats
  app.get("/api/stats", async (req, res) => {
    try {
      const stats = await storage.getStats();
      res.json(stats);
    } catch (error) {
      console.error("Error getting stats:", error);
      res.status(500).json({ error: "Failed to get stats" });
    }
  });

  // Get all sensors
  app.get("/api/sensors", async (req, res) => {
    try {
      const sensors = await storage.getAllSensors();
      res.json(sensors);
    } catch (error) {
      console.error("Error getting sensors:", error);
      res.status(500).json({ error: "Failed to get sensors" });
    }
  });

  // Get all sessions
  app.get("/api/sessions", async (req, res) => {
    try {
      const sessions = await storage.getAllSessions();
      res.json(sessions);
    } catch (error) {
      console.error("Error getting sessions:", error);
      res.status(500).json({ error: "Failed to get sessions" });
    }
  });

  // Get session by ID
  app.get("/api/sessions/:sessionId", async (req, res) => {
    try {
      const { sessionId } = req.params;
      const session = await storage.getSessionById(sessionId);
      
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }
      
      res.json(session);
    } catch (error) {
      console.error("Error getting session:", error);
      res.status(500).json({ error: "Failed to get session" });
    }
  });

  // Get session files
  app.get("/api/sessions/:sessionId/files", async (req, res) => {
    try {
      const { sessionId } = req.params;
      const files = await storage.getSessionFiles(sessionId);
      res.json(files);
    } catch (error) {
      console.error("Error getting session files:", error);
      res.status(500).json({ error: "Failed to get session files" });
    }
  });

  // Download a session as ZIP
  app.get("/api/sessions/:sessionId/download", async (req, res) => {
    try {
      const { sessionId } = req.params;
      
      // Validate that the session exists
      const session = await storage.getSessionById(sessionId);
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }
      
      // Get all files for this session
      const files = await storage.getSessionFiles(sessionId);
      
      // Create a ZIP file with all session files
      const zipBuffer = await fileManager.createSessionZip(session, files);
      
      // Set headers for download
      res.set({
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="session_${sessionId}.zip"`,
        'Content-Length': zipBuffer.length,
      });
      
      // Send the ZIP file
      res.send(zipBuffer);
      
    } catch (error) {
      console.error("Error downloading session:", error);
      res.status(500).json({ error: "Failed to download session" });
    }
  });

  // Download a single file
  app.get("/api/files/download/:fileName", async (req, res) => {
    try {
      const { fileName } = req.params;
      const filePath = await fileManager.getFilePath(fileName);
      
      if (!filePath || !fs.existsSync(filePath)) {
        return res.status(404).json({ error: "File not found" });
      }
      
      res.download(filePath, fileName);
      
    } catch (error) {
      console.error("Error downloading file:", error);
      res.status(500).json({ error: "Failed to download file" });
    }
  });

  // Stream a video file
  app.get("/api/files/stream/:fileName", async (req, res) => {
    try {
      const { fileName } = req.params;
      const filePath = await fileManager.getFilePath(fileName);
      
      if (!filePath || !fs.existsSync(filePath)) {
        return res.status(404).json({ error: "File not found" });
      }
      
      const stat = fs.statSync(filePath);
      const fileSize = stat.size;
      const range = req.headers.range;
      
      if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunksize = (end - start) + 1;
        const file = fs.createReadStream(filePath, { start, end });
        
        res.writeHead(206, {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunksize,
          'Content-Type': 'video/mp4',
        });
        
        file.pipe(res);
      } else {
        res.writeHead(200, {
          'Content-Length': fileSize,
          'Content-Type': 'video/mp4',
        });
        
        fs.createReadStream(filePath).pipe(res);
      }
      
    } catch (error) {
      console.error("Error streaming file:", error);
      res.status(500).json({ error: "Failed to stream file" });
    }
  });

  // Delete a session
  app.delete("/api/sessions/:sessionId", async (req, res) => {
    try {
      const { sessionId } = req.params;
      
      // Validate that the session exists
      const session = await storage.getSessionById(sessionId);
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }
      
      // Get all files for this session to delete them
      const files = await storage.getSessionFiles(sessionId);
      
      // Delete all session files
      await Promise.all(files.map(file => fileManager.deleteFile(file.fileName)));
      
      // Delete the session from storage
      await storage.deleteSession(sessionId);
      
      res.json({ success: true });
      
    } catch (error) {
      console.error("Error deleting session:", error);
      res.status(500).json({ error: "Failed to delete session" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}

