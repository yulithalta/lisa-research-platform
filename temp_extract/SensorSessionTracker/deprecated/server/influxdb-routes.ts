import { Request, Response } from 'express';
import * as influxdbService from './influxdb-service';
import { storage } from './storage';
import fs from 'fs';
import path from 'path';
import archiver from 'archiver';

/**
 * Obtener los datos más recientes de los sensores
 */
export async function getLatestSensorData(req: Request, res: Response) {
  try {
    // Obtener IDs de sensores específicos si se proporcionan
    const sensorIds = req.query.sensors ? 
      Array.isArray(req.query.sensors) ? 
        req.query.sensors.map(s => String(s)) : [String(req.query.sensors)] 
      : undefined;
    
    const sensorData = await influxdbService.getLatestSensorData(sensorIds);
    res.json(sensorData);
  } catch (error) {
    console.error('Error obteniendo datos recientes de sensores:', error);
    res.status(500).json({ error: 'Error obteniendo datos de sensores' });
  }
}

/**
 * Exportar datos de sensores para una sesión específica
 */
export async function exportSessionSensorData(req: Request, res: Response) {
  try {
    const { sessionId } = req.params;
    const format = (req.query.format as 'json' | 'csv') || 'csv';
    
    // Obtener información de la sesión para determinar el rango de tiempo
    const session = await storage.getSessionById(Number(sessionId));
    if (!session) {
      return res.status(404).json({ error: 'Sesión no encontrada' });
    }
    
    // Exportar datos
    const filePath = await influxdbService.exportSensorData({
      sessionId,
      startTime: session.startTime,
      endTime: session.endTime || new Date(),
      format
    });
    
    // Enviar archivo
    const fileName = path.basename(filePath);
    res.download(filePath, fileName, (err) => {
      if (err) {
        console.error('Error enviando archivo:', err);
      } else {
        // Limpiar archivo temporal después de enviar
        setTimeout(() => {
          try {
            if (fs.existsSync(filePath)) {
              fs.unlinkSync(filePath);
            }
          } catch (cleanupError) {
            console.error('Error limpiando archivo temporal:', cleanupError);
          }
        }, 5000);
      }
    });
  } catch (error) {
    console.error('Error exportando datos de sensores:', error);
    res.status(500).json({ error: 'Error exportando datos de sensores' });
  }
}

/**
 * Exportar todos los datos de una sesión (grabaciones y datos de sensores)
 */
export async function exportAllSessionData(req: Request, res: Response) {
  try {
    const { sessionId } = req.params;
    
    // Obtener información de la sesión
    const session = await storage.getSessionById(Number(sessionId));
    if (!session) {
      return res.status(404).json({ error: 'Sesión no encontrada' });
    }
    
    // Crear archivo ZIP usando el nombre de la sesión
    // Sanitizar el nombre para usarlo en nombre de archivo
    const sanitizedName = session.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    // Usar el nombre de la sesión para el archivo ZIP
    const zipFileName = `${sanitizedName}.zip`;
    const zipFilePath = path.join(process.cwd(), 'temp', zipFileName);
    
    // Asegurar que el directorio existe
    const tempDir = path.join(process.cwd(), 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    const output = fs.createWriteStream(zipFilePath);
    const archive = archiver('zip', {
      zlib: { level: 5 } // Nivel de compresión
    });
    
    // Escuchar eventos del archivo
    output.on('close', () => {
      console.log(`Archivo ZIP creado: ${zipFilePath}, tamaño: ${archive.pointer()} bytes`);
      
      // Enviar archivo ZIP al cliente
      res.download(zipFilePath, zipFileName, (err) => {
        if (err) {
          console.error('Error enviando archivo ZIP:', err);
        } else {
          // Limpiar archivo temporal después de enviar
          setTimeout(() => {
            try {
              if (fs.existsSync(zipFilePath)) {
                fs.unlinkSync(zipFilePath);
              }
            } catch (cleanupError) {
              console.error('Error limpiando archivo ZIP temporal:', cleanupError);
            }
          }, 5000);
        }
      });
    });
    
    archive.on('error', (err) => {
      console.error('Error creando archivo ZIP:', err);
      res.status(500).json({ error: 'Error creando archivo ZIP' });
    });
    
    // Iniciar el archivo ZIP
    archive.pipe(output);
    
    // Exportar datos de sensores en ambos formatos: JSON y CSV
    const sensorJsonPath = await influxdbService.exportSensorData({
      sessionId,
      startTime: session.startTime,
      endTime: session.endTime || new Date(),
      format: 'json'
    });
    
    const sensorCsvPath = await influxdbService.exportSensorData({
      sessionId,
      startTime: session.startTime,
      endTime: session.endTime || new Date(),
      format: 'csv'
    });
    
    // Añadir ambos archivos al ZIP
    archive.file(sensorJsonPath, { name: `sensor_data/${path.basename(sensorJsonPath)}` });
    archive.file(sensorCsvPath, { name: `sensor_data/${path.basename(sensorCsvPath)}` });
    
    // Añadir grabaciones al ZIP
    const recordings = await storage.getSessionRecordings(Number(sessionId));
    for (const recording of recordings) {
      if (fs.existsSync(recording.filePath)) {
        archive.file(recording.filePath, { 
          name: `recordings/${path.basename(recording.filePath)}`
        });
      }
    }
    
    // Añadir metadatos de la sesión
    const metadataFileName = `session_metadata.json`;
    const metadataFile = path.join(tempDir, metadataFileName);
    fs.writeFileSync(metadataFile, JSON.stringify({
      session,
      recordings,
      exportDate: new Date().toISOString()
    }, null, 2));
    
    archive.file(metadataFile, { name: 'metadata/session_metadata.json' });
    
    // Finalizar el ZIP
    await archive.finalize();
    
  } catch (error) {
    console.error('Error exportando todos los datos de la sesión:', error);
    res.status(500).json({ error: 'Error exportando datos de la sesión' });
  }
}

/**
 * Verificar la conexión con InfluxDB
 */
export async function testInfluxDBConnection(req: Request, res: Response) {
  try {
    const isConnected = await influxdbService.testInfluxDBConnection();
    res.json({ connected: isConnected });
  } catch (error) {
    console.error('Error verificando conexión con InfluxDB:', error);
    res.status(500).json({ error: 'Error verificando conexión con InfluxDB' });
  }
}