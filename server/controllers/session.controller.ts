import { Request, Response } from 'express';
import { storage } from '../storage';
import { archiveService } from '../services/archive.service';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Controlador para la gestión de sesiones
 * Implementa principios de Clean Code y Single Responsibility
 */
export const sessionController = {
  /**
   * Descarga todos los archivos de una sesión en formato ZIP
   */
  downloadSession: async (req: Request, res: Response): Promise<void> => {
    if (!req.isAuthenticated()) {
      res.sendStatus(401);
      return;
    }

    try {
      // Obtener ID de la sesión y datos de la base de datos
      const sessionId = parseInt(req.params.id);
      const session = await storage.getSessionById(sessionId);
      
      if (!session) {
        console.error(`Session ${sessionId} not found in database`);
        res.status(404).json({ error: 'Sesión no encontrada' });
        return;
      }
      
      console.log(`Preparing download for session ${sessionId}: ${session.name}`);
      
      // Asegurar que existe el directorio de la sesión
      const SESSIONS_DIR = process.env.SESSIONS_DIR || path.join(process.cwd(), 'sessions');
      const sessionDir = path.join(SESSIONS_DIR, `Session${sessionId}`);
      
      if (!fs.existsSync(sessionDir)) {
        fs.mkdirSync(sessionDir, { recursive: true });
        console.log(`Created session directory: ${sessionDir}`);
      }
      
      // Obtener grabaciones asociadas a esta sesión
      const sessionRecordings = await storage.getRecordingsBySessionId(sessionId);
      console.log(`Encontradas ${sessionRecordings.length} grabaciones asociadas a la sesión ${sessionId}`);
      
      // Preparar lista de archivos para incluir en el ZIP
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
      const RECORDINGS_DIR = process.env.RECORDINGS_DIR || path.join(process.cwd(), 'recordings');
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
      
      // 4. Usar el servicio de archivos para crear el ZIP
      console.log(`Creando ZIP con ${files.length} archivos`);
      
      try {
        // Usar el servicio para crear el archivo ZIP
        const zipBuffer = await archiveService.createSessionZip(session, files);
        
        // Determinar el nombre del archivo ZIP
        const zipFileName = `${session.name || `Session-${sessionId}`}.zip`;
        
        // Enviar la respuesta al cliente
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename=${zipFileName}`);
        res.send(zipBuffer);
        
        // Registrar actividad de descarga
        try {
          storage.createAccessLog({
            userId: req.user?.id || 1,
            action: "sessionDownload",
            resourceType: 'session',
            resourceId: sessionId.toString(),
            details: {
              sessionId,
              filesCount: files.length
            },
            success: true
          });
        } catch (logError) {
          console.error('Error al registrar actividad de descarga:', logError);
        }
        
        console.log(`ZIP descargado exitosamente para la sesión ${sessionId}`);
      } catch (zipError) {
        console.error('Error creando ZIP:', zipError);
        res.status(500).json({ error: 'Error al crear el archivo ZIP' });
      }
    } catch (error) {
      console.error('Error downloading session:', error);
      res.status(500).json({ error: "No se pudo descargar la sesión" });
    }
  }
};
