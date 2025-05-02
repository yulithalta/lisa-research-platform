import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertCameraSchema, buildRtspUrl } from "@shared/schema";
import { ZodError } from "zod";
import { spawn, exec as execCallback } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs";
import ffmpeg from 'fluent-ffmpeg';
import { v4 as uuidv4 } from 'uuid';
import archiver from 'archiver';
import { registerSensorRoutes } from "./sensor-routes";
import ping from 'ping';
import { sensorDataMapper } from "./sensor-data-mapper";
import * as jsonRoutes from "./json-routes";
import { mqttClient } from './mqtt-client-simple';
import { log as customLog } from './vite';

// Constantes
const RECORDINGS_DIR = process.env.RECORDINGS_DIR || path.join(process.cwd(), 'recordings');
const SESSIONS_DIR = process.env.SESSIONS_DIR || path.join(process.cwd(), 'sessions');
import { fileManager } from './fileManager';

// Función auxiliar para registrar actividad de usuario
function logActivity(userId: number, action: string, details: Record<string, any>) {
  try {
    storage.createAccessLog({
      userId,
      action,
      resourceType: 'recording',
      resourceId: details.recordingId?.toString() || 'unknown',
      details: details
    });
    console.log(`Activity logged: ${action}`);
  } catch (error) {
    console.error('Error logging activity:', error);
  }
}

// Nueva función mejorada para descargar sesión con FileManager
async function downloadSessionWithFileManager(req: any, res: any) {
  if (!req.isAuthenticated()) return res.sendStatus(401);

  try {
    // Obtener ID de la sesión y datos de la base de datos
    const sessionId = parseInt(req.params.id);
    const session = await storage.getSessionById(sessionId);
    
    if (!session) {
      console.error(`Session ${sessionId} not found in database`);
      return res.status(404).json({ error: 'Sesión no encontrada' });
    }
    
    console.log(`Preparing download for session ${sessionId}: ${session.name}`);
    
    // Verificar directorios de la sesión
    const sessionDir = path.join(SESSIONS_DIR, `Session${sessionId}`);
    
    // Crear el directorio de la sesión si no existe
    if (!fs.existsSync(sessionDir)) {
      fs.mkdirSync(sessionDir, { recursive: true });
      console.log(`Created session directory: ${sessionDir}`);
    }
    
    // Obtener información de grabaciones y archivos relacionados con esta sesión
    const sessionRecordings = await storage.getRecordingsBySessionId(parseInt(req.params.id));
    console.log(`Encontradas ${sessionRecordings.length} grabaciones asociadas a la sesión ${req.params.id}`);
    
    // Crear objeto de archivos para pasar al fileManager
    const files: { fileName: string }[] = [];
    
    // 1. Añadir grabaciones de la base de datos
    for (const recording of sessionRecordings) {
      if (recording.filePath) {
        const fileName = path.basename(recording.filePath);
        files.push({ fileName });
        console.log(`Añadiendo archivo de grabación: ${fileName}`);
      }
    }
    
    // 2. Buscar archivos MP4 en directorios relacionados con la sesión
    const dirsToCheck = [
      path.join(process.cwd(), 'sessions', `Session${sessionId}`, 'recordings'),
      RECORDINGS_DIR
    ];
    
    for (const dir of dirsToCheck) {
      if (!fs.existsSync(dir)) continue;
      
      try {
        const dirFiles = fs.readdirSync(dir).filter(file => 
          file.endsWith('.mp4') && 
          (file.includes(`session${sessionId}`) || file.includes(`sess${sessionId}`))
        );
        
        for (const file of dirFiles) {
          files.push({ fileName: file });
          console.log(`Añadiendo archivo MP4 encontrado: ${file}`);
        }
      } catch (err) {
        console.error(`Error leyendo directorio ${dir}:`, err);
      }
    }
    
    // 3. Buscar archivos de sensores
    const sensorDataPath = path.join(sessionDir, 'sensor_data');
    if (fs.existsSync(sensorDataPath)) {
      try {
        const sensorFiles = fs.readdirSync(sensorDataPath).filter(file => 
          file.endsWith('.json') || file.endsWith('.csv')
        );
        
        for (const file of sensorFiles) {
          files.push({ fileName: file });
          console.log(`Añadiendo archivo de sensor: ${file}`);
        }
      } catch (err) {
        console.error(`Error leyendo directorio de sensores:`, err);
      }
    }
    
    // 4. Usar la nueva implementación mejorada del fileManager para crear el ZIP
    console.log(`Creando ZIP con ${files.length} archivos usando fileManager`);
    
    try {
      // Usar la implementación mejorada para crear el archivo ZIP
      const zipBuffer = await fileManager.createSessionZip(session, files);
      
      // Determinar el nombre del archivo ZIP
      const zipFileName = `${session.name || `Session-${sessionId}`}.zip`;
      
      // Enviar la respuesta al cliente
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename=${zipFileName}`);
      res.send(zipBuffer);
      
      // Registrar actividad de descarga
      logActivity(req.user?.id || 1, "sessionDownload", {
        sessionId: sessionId,
        filesCount: files.length
      });
      
      console.log(`ZIP descargado exitosamente para la sesión ${sessionId}`);
      return true;
    } catch (zipError) {
      console.error('Error creando ZIP:', zipError);
      throw zipError;
    }
  } catch (error) {
    console.error('Error downloading session:', error);
    res.status(500).json({ message: "Failed to download session" });
    return false;
  }
}
export async function registerRoutes(app: Express): Promise<Server> {
  // Configurar autenticación
  setupAuth(app);
  // Registrar rutas para sensores
  registerSensorRoutes(app);
  // Registrar rutas JSON estáticas
  jsonRoutes.registerRoutes(app);
  // Descarga de sesión
  app.get("/api/sessions/:id/download", async (req, res) => {
    // Usar la nueva función mejorada para descargar la sesión
    return await downloadSessionWithFileManager(req, res);
  });
  // Crear el servidor HTTP y WebSocket
  const server = createServer(app);
  return server;
}
