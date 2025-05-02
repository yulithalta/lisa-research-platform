import { Request, Response } from 'express';
import { storage } from '../storage';
import { archiveService, ZipProgress } from '../services/archive.service';
import { sessionService } from '../services/session.service';
import path from 'path';
import fs from 'fs';

/**
 * Controlador para la gestión de sesiones
 * Implementa principios de Clean Code y Single Responsibility
 */
export const sessionController = {
  /**
   * Obtiene el progreso de la exportación de una sesión
   */
  getExportProgress: async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.isAuthenticated()) {
        res.status(401).json({ error: 'No autorizado' });
        return;
      }
      
      const sessionId = parseInt(req.params.id);
      if (isNaN(sessionId)) {
        res.status(400).json({ error: 'ID de sesión inválido' });
        return;
      }
      
      const progress = archiveService.getZipProgress(sessionId);
      if (!progress) {
        res.status(404).json({ error: 'No se encontró información de progreso para esta sesión' });
        return;
      }
      
      res.json(progress);
    } catch (error) {
      console.error('Error al obtener progreso de exportación:', error);
      res.status(500).json({ error: 'Error al obtener progreso de exportación' });
    }
  },
  
  /**
   * Registra un archivo de grabación en una sesión
   */
  registerRecordingFile: async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.isAuthenticated()) {
        res.status(401).json({ error: 'No autorizado' });
        return;
      }
      
      const { sessionId, filePath, cameraId } = req.body;
      
      if (!sessionId || !filePath) {
        res.status(400).json({ error: 'Faltan parámetros requeridos' });
        return;
      }
      
      await sessionService.registerRecordingFile(
        parseInt(sessionId), 
        filePath, 
        cameraId ? parseInt(cameraId) : undefined
      );
      
      res.json({ success: true, message: 'Archivo registrado correctamente' });
    } catch (error) {
      console.error('Error al registrar archivo de grabación:', error);
      res.status(500).json({ error: 'Error al registrar archivo de grabación' });
    }
  },
  
  /**
   * Registra un archivo de datos de sensor en una sesión
   */
  registerSensorDataFile: async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.isAuthenticated()) {
        res.status(401).json({ error: 'No autorizado' });
        return;
      }
      
      const { sessionId, filePath, sensorId } = req.body;
      
      if (!sessionId || !filePath) {
        res.status(400).json({ error: 'Faltan parámetros requeridos' });
        return;
      }
      
      await sessionService.registerSensorDataFile(
        parseInt(sessionId), 
        filePath, 
        sensorId
      );
      
      res.json({ success: true, message: 'Archivo de datos registrado correctamente' });
    } catch (error) {
      console.error('Error al registrar archivo de datos de sensor:', error);
      res.status(500).json({ error: 'Error al registrar archivo de datos de sensor' });
    }
  },
  
  /**
   * Finaliza una sesión y consolida sus archivos
   */
  finalizeSession: async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.isAuthenticated()) {
        res.status(401).json({ error: 'No autorizado' });
        return;
      }
      
      const sessionId = parseInt(req.params.id);
      if (isNaN(sessionId)) {
        res.status(400).json({ error: 'ID de sesión inválido' });
        return;
      }
      
      const session = await storage.getSessionById(sessionId);
      if (!session) {
        res.status(404).json({ error: 'Sesión no encontrada' });
        return;
      }
      
      await sessionService.finalizeSession(sessionId, session);
      
      // Actualizar el estado de la sesión en la base de datos
      await storage.updateSession(sessionId, {
        ...session,
        status: 'completed',
        endTime: session.endTime ? new Date(session.endTime) : new Date()
      });
      
      res.json({ success: true, message: 'Sesión finalizada correctamente' });
    } catch (error) {
      console.error('Error al finalizar sesión:', error);
      res.status(500).json({ error: 'Error al finalizar sesión' });
    }
  },
  
  /**
   * Descarga todos los archivos de una sesión en formato ZIP
   * Con barra de progreso y manejo mejorado de archivos
   */
  downloadSession: async (req: Request, res: Response): Promise<void> => {
    if (!req.isAuthenticated()) {
      res.status(401).json({ error: 'No autorizado' });
      return;
    }
    
    try {
      // Obtener ID de la sesión desde los parámetros de la URL
      const sessionId = parseInt(req.params.id);
      if (isNaN(sessionId)) {
        res.status(400).json({ error: 'ID de sesión inválido' });
        return;
      }
      
      // Obtener datos de la sesión desde la base de datos
      const session = await storage.getSessionById(sessionId);
      if (!session) {
        res.status(404).json({ error: 'Sesión no encontrada' });
        return;
      }
      
      console.log(`Iniciando descarga para sesión ${sessionId}: ${session.name}`);
      
      // Iniciar la creación del ZIP de forma asíncrona
      const zipFilePath = await archiveService.createSessionZipAsync(sessionId, session);
      
      // Verificar si el archivo se creó correctamente
      if (!fs.existsSync(zipFilePath)) {
        res.status(500).json({ error: 'Error al crear el archivo ZIP' });
        return;
      }
      
      // Nombre del archivo para la descarga basado en el nombre de la sesión
      const sessionName = session.name ? 
        session.name.replace(/[\\/:*?"<>|]/g, '_') : // Reemplazar caracteres inválidos
        `Session_${sessionId}`;
      const filename = `${sessionName}_${sessionId}.zip`;
      
      // Configurar headers para la descarga
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      
      // Enviar el archivo como respuesta
      const fileStream = fs.createReadStream(zipFilePath);
      fileStream.pipe(res);
      
      // Eliminar el archivo temporal cuando se complete la descarga
      fileStream.on('end', () => {
        archiveService.cleanupTempFile(zipFilePath);
        
        // Registrar actividad de descarga exitosa
        try {
          storage.createAccessLog({
            userId: req.user?.id || 1,
            action: "sessionDownload",
            resourceType: 'session',
            resourceId: sessionId.toString(),
            details: {
              sessionId,
              sessionName: session.name,
              downloadTime: new Date().toISOString()
            },
            success: true
          });
        } catch (logError) {
          console.error('Error al registrar actividad de descarga:', logError);
        }
        
        console.log(`ZIP descargado exitosamente para la sesión ${sessionId}`);
      });
      
      // Manejar errores en el stream
      fileStream.on('error', (error) => {
        console.error('Error al enviar el archivo ZIP:', error);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Error al enviar el archivo ZIP' });
        }
        archiveService.cleanupTempFile(zipFilePath);
      });
    } catch (error) {
      console.error('Error al descargar sesión:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Error al descargar sesión' });
      }
    }
  }
};
