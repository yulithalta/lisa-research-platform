import { Request, Response } from 'express';
import * as jsonDataService from './json-data-service';
import { storage } from './storage';
import fs from 'fs';
import path from 'path';
import archiver from 'archiver';
import { logger } from '@/lib/services/logger';

/**
 * Calcula la duración entre dos fechas y devuelve un objeto con la duración formateada
 * @param start Fecha de inicio
 * @param end Fecha de fin
 * @returns Objeto con la duración en ms, formato legible, horas, minutos y segundos
 */
function calculateDuration(start: Date, end: Date) {
  const diffMs = end.getTime() - start.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const hours = Math.floor(diffSec / 3600);
  const minutes = Math.floor((diffSec % 3600) / 60);
  const seconds = diffSec % 60;
  
  return {
    ms: diffMs,
    formatted: `${hours}h ${minutes}m ${seconds}s`,
    hours,
    minutes,
    seconds
  };
}

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
    
    const sensorData = await jsonDataService.getLatestSensorData(sensorIds);
    res.json(sensorData);
  } catch (error) {
    logger.error('Error obteniendo datos recientes de sensores:', error);
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
    const filePath = await jsonDataService.exportSensorData({
      sessionId,
      startTime: session.startTime,
      endTime: session.endTime || new Date(),
      format
    });
    
    // Enviar archivo
    const fileName = path.basename(filePath);
    res.download(filePath, fileName, (err) => {
      if (err) {
        logger.error('Error enviando archivo:', err);
      } else {
        // Limpiar archivo temporal después de enviar
        setTimeout(() => {
          try {
            if (fs.existsSync(filePath)) {
              fs.unlinkSync(filePath);
            }
          } catch (cleanupError) {
            logger.error('Error limpiando archivo temporal:', cleanupError);
          }
        }, 5000);
      }
    });
  } catch (error) {
    logger.error('Error exportando datos de sensores:', error);
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
      logger.info(`Archivo ZIP creado: ${zipFilePath}, tamaño: ${archive.pointer()} bytes`);
      
      // Enviar archivo ZIP al cliente
      res.download(zipFilePath, zipFileName, (err) => {
        if (err) {
          logger.error('Error enviando archivo ZIP:', err);
        } else {
          // Limpiar archivo temporal después de enviar
          setTimeout(() => {
            try {
              if (fs.existsSync(zipFilePath)) {
                fs.unlinkSync(zipFilePath);
              }
            } catch (cleanupError) {
              logger.error('Error limpiando archivo ZIP temporal:', cleanupError);
            }
          }, 5000);
        }
      });
    });
    
    archive.on('error', (err) => {
      logger.error('Error creando archivo ZIP:', err);
      res.status(500).json({ error: 'Error creando archivo ZIP' });
    });
    
    // Iniciar el archivo ZIP
    archive.pipe(output);
    
    // Exportar datos de sensores en ambos formatos: JSON y CSV
    const sensorJsonPath = await jsonDataService.exportSensorData({
      sessionId,
      startTime: session.startTime,
      endTime: session.endTime || new Date(),
      format: 'json'
    });
    
    const sensorCsvPath = await jsonDataService.exportSensorData({
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
    
    // Obtener todos los datos de cámara para acceder a sus prefijos
    const allCameras = await storage.getAllCameras();
    // Crear un mapa para acceder rápidamente a las cámaras por ID
    const camerasMap = new Map(allCameras.map(cam => [cam.id, cam]));
    
    // Definir directorios candidatos para buscar archivos - optimizado según el análisis actual del sistema
    const sessionIdStr = String(sessionId);
    const dirsToCheck = [
      // Directorio principal de grabaciones
      // RUTA PRIORITARIA - Donde se está guardando actualmente según la corrección
      path.join(process.cwd(), 'sessions', `Session${sessionIdStr}`, 'recordings'),
      // Otras posibles rutas con mayor probabilidad
      path.join(process.cwd(), 'sessions', `Session${sessionIdStr}`),
      path.join(process.cwd(), 'sessions', `session${sessionIdStr}`),
      path.join(process.cwd(), 'recordings'),
      // Directorio específico de sesiones (estructuras antiguas)
      // Directorios específicos de sesión con formatos UUID
      ...fs.existsSync(path.join(process.cwd(), 'sessions')) 
        ? fs.readdirSync(path.join(process.cwd(), 'sessions'))
            .filter(dir => dir.startsWith('Session') && fs.statSync(path.join(process.cwd(), 'sessions', dir)).isDirectory())
            .map(dir => path.join(process.cwd(), 'sessions', dir))
        : [],
      // Directorios de grabaciones específicos por sesión
      path.join(process.cwd(), 'recordings', `session-${sessionIdStr}`),
      path.join(process.cwd(), 'recordings', `session_${sessionIdStr}`),
      path.join(process.cwd(), 'recordings', `Session${sessionIdStr}`),
      path.join(process.cwd(), 'recordings', `session${sessionIdStr}`),
      // Ubicaciones de prueba/test
      path.join(process.cwd(), 'recordings', 'test-session'),
      // Directorios alternativos en /data
      path.join(process.cwd(), 'data', 'recordings'),
      path.join(process.cwd(), 'data', 'sessions'),
      path.join(process.cwd(), 'data', 'sessions', `Session${sessionIdStr}`),
      path.join(process.cwd(), 'data', 'sessions', `session${sessionIdStr}`),
      path.join(process.cwd(), 'data', 'sessions', `${sessionIdStr}`),
      path.join(process.cwd(), 'data', `session-${sessionIdStr}`),
      path.join(process.cwd(), 'data', `session_${sessionIdStr}`),
      // Rutas con variables de entorno
      path.join(process.env.DATA_DIR || "./data", 'recordings'),
      path.join(process.env.RECORDINGS_DIR || "./recordings"),
      // Directorio temporal
      path.join(process.cwd(), 'temp', `session${sessionIdStr}`)
    ];
    
    logger.info(`Buscando grabaciones para sesión ${sessionId} en ${dirsToCheck.length} directorios`);
    logger.info(`Encontradas ${recordings.length} grabaciones asociadas a la sesión ${sessionId}`);
    
    // Crear el directorio de sesión y grabaciones si no existe
    const sessionDir = path.join(process.cwd(), 'sessions', `Session${sessionIdStr}`);
    const sessionRecordingsDir = path.join(sessionDir, 'recordings');
    
    // Crear directorios necesarios
    if (!fs.existsSync(sessionDir)) {
      fs.mkdirSync(sessionDir, { recursive: true });
      logger.info(`Creado directorio de sesión: ${sessionDir}`);
    }
    
    if (!fs.existsSync(sessionRecordingsDir)) {
      fs.mkdirSync(sessionRecordingsDir, { recursive: true });
      logger.info(`Creado directorio de grabaciones para sesión: ${sessionRecordingsDir}`);
    }
    
    // Mover archivos de grabación de la ubicación temporal a la carpeta de sesión
    const recordingsDir = path.join(process.cwd(), 'recordings');
    if (fs.existsSync(recordingsDir)) {
      try {
        const files = fs.readdirSync(recordingsDir);
        for (const file of files) {
          // Verificar si el archivo es un MP4 y pertenece a esta sesión
          if (file.endsWith('.mp4') && (
              file.includes(`session${sessionIdStr}`) || 
              file.includes(`Session${sessionIdStr}`) ||
              file.includes(`s${sessionIdStr}_`) ||
              recordings.some(rec => file.includes(`cam${rec.cameraId}`))
            )) {
            
            const sourcePath = path.join(recordingsDir, file);
            const destPath = path.join(sessionRecordingsDir, file);
            
            // Verificar si el archivo es una grabación de esta sesión buscando por ID de cámara
            const isCameraRecording = recordings.some(rec => {
              const cameraId = rec.cameraId;
              return file.includes(`cam${cameraId}`) || 
                     file.includes(`camera${cameraId}`) ||
                     file.includes(`c${cameraId}_`);
            });
            
            if (isCameraRecording) {
              logger.info(`Moviendo archivo de grabación a carpeta de sesión: ${file}`);
              try {
                // Si el archivo no existe en destino, copiarlo
                if (!fs.existsSync(destPath)) {
                  fs.copyFileSync(sourcePath, destPath);
                  logger.info(`✅ Archivo copiado exitosamente: ${destPath}`);
                }
              } catch (moveError) {
                logger.error(`Error moviendo archivo ${file}: ${moveError}`);
              }
            }
          }
        }
      } catch (readError) {
        logger.error(`Error leyendo directorio de grabaciones: ${readError}`);
      }
    }
    
    let videoFilesAdded = 0;
    
    for (const recording of recordings) {
      let fileFound = false;
      
      // Obtener el prefijo de grabación de la cámara
      const camera = camerasMap.get(recording.cameraId);
      const cameraPrefix = camera?.recordingPrefix || `cam${recording.cameraId}`;
      
      logger.info(`Procesando grabación ${recording.id} para cámara ${recording.cameraId} (prefix: ${cameraPrefix})`);
      
      // Verificar si el archivo existe directamente
      if (recording.filePath && fs.existsSync(recording.filePath)) {
        logger.info(`Añadiendo video directamente al ZIP: ${recording.filePath}`);
        const fileName = path.basename(recording.filePath);
        archive.file(recording.filePath, { name: `recordings/${fileName}` });
        fileFound = true;
        videoFilesAdded++;
      } else {
        // Si no existe, buscar alternativas
        const basename = recording.filePath ? path.basename(recording.filePath) : `${cameraPrefix}-${recording.id}.mp4`;
        
        logger.info(`Buscando archivo con nombre base: ${basename}`);
        
        // Primero probar con el mismo nombre de archivo en diferentes directorios
        for (const dir of dirsToCheck) {
          if (!fs.existsSync(dir)) continue;
          
          const testPath = path.join(dir, basename);
          if (fs.existsSync(testPath)) {
            logger.info(`Archivo original no encontrado, usando alternativa: ${testPath}`);
            archive.file(testPath, { name: `recordings/${basename}` });
            fileFound = true;
            videoFilesAdded++;
            break;
          }
        }
        
        // Si aún no se encuentra, buscar archivos por patrones mejorados
        if (!fileFound) {
          for (const dir of dirsToCheck) {
            if (!fs.existsSync(dir) || fileFound) continue;
            
            try {
              // Lista mejorada de patrones a buscar, priorizando el prefijo de cámara y sesión
              const searchPatterns = [
                // Patrones exactos por sesión y cámara - mayor prioridad
                new RegExp(`^session${sessionId}[-_].*?camera${recording.cameraId}.*\\.mp4$`, 'i'),
                new RegExp(`^Session${sessionId}[-_].*?cam${recording.cameraId}.*\\.mp4$`, 'i'),
                new RegExp(`^session${sessionId}[-_].*?cam${recording.cameraId}.*\\.mp4$`, 'i'),
                new RegExp(`^s${sessionId}[-_].*?cam${recording.cameraId}.*\\.mp4$`, 'i'),
                
                // Buscar por el prefijo exacto definido para esta cámara
                new RegExp(`^${cameraPrefix}.*\\.mp4$`, 'i'),
                
                // Patrones con el ID de la cámara
                new RegExp(`cam${recording.cameraId}[-_].*\\.mp4$`, 'i'),
                new RegExp(`camera${recording.cameraId}[-_].*\\.mp4$`, 'i'),
                new RegExp(`[-_]${recording.cameraId}[-_].*\\.mp4$`),
                new RegExp(`c${recording.cameraId}[-_].*\\.mp4$`, 'i'),
                
                // Patrones que incluyen tanto sesión como cámara en cualquier orden
                new RegExp(`.*session${sessionId}.*cam${recording.cameraId}.*\\.mp4$`, 'i'),
                new RegExp(`.*cam${recording.cameraId}.*session${sessionId}.*\\.mp4$`, 'i'),
                new RegExp(`.*s${sessionId}.*cam${recording.cameraId}.*\\.mp4$`, 'i'),
                
                // Cualquier archivo que contenga la ID de la cámara y alguna indicación de sesión
                new RegExp(`.*session.*cam${recording.cameraId}.*\\.mp4$`, 'i'),
                new RegExp(`.*cam${recording.cameraId}.*\\.mp4$`, 'i')
              ];
              
              const files = fs.readdirSync(dir);
              
              // Buscar archivos que coincidan con alguno de los patrones
              for (const pattern of searchPatterns) {
                if (fileFound) break;
                
                const matchingFiles = files.filter(file => pattern.test(file));
                if (matchingFiles.length > 0) {
                  // Ordenar por fecha de modificación para obtener el más reciente si hay varios
                  const filePath = path.join(dir, matchingFiles[0]);
                  logger.info(`Encontrado archivo específico para cámara: ${filePath} (patrón: ${pattern})`);
                  archive.file(filePath, { name: `recordings/${matchingFiles[0]}` });
                  fileFound = true;
                  videoFilesAdded++;
                  break;
                }
              }
            } catch (err) {
              logger.error(`Error buscando archivos alternativos en ${dir}:`, err);
            }
          }
        }
        
        // Como último recurso, buscar recursivamente en directorios relevantes
        if (!fileFound) {
          const recursiveSearchDirs = [
            // DIRECTORIO PRIORITARIO - Ubicación correcta según la corrección
            path.join(process.cwd(), 'sessions', `Session${sessionIdStr}`),
            path.join(process.cwd(), 'sessions'),
            path.join(process.cwd(), 'recordings')
          ];
          
          for (const dir of recursiveSearchDirs) {
            if (!fs.existsSync(dir) || fileFound) continue;
            
            try {
              // Función para buscar archivos MP4 recursivamente con mayor detalle
              const searchRecursively = (directory: string, depth: number = 0): string[] => {
                if (depth > 3) return []; // Aumentar profundidad para buscar más exhaustivamente
                
                logger.info(`Buscando recursivamente en ${directory} (nivel ${depth})`);
                const results: string[] = [];
                if (!fs.existsSync(directory)) {
                  logger.info(`  - Directorio no existe: ${directory}`);
                  return results;
                }
                
                try {
                  const items = fs.readdirSync(directory);
                  logger.info(`  - Encontrados ${items.length} items en directorio`);
                  
                  for (const item of items) {
                    const fullPath = path.join(directory, item);
                    
                    try {
                      const stat = fs.statSync(fullPath);
                      
                      if (stat.isDirectory()) {
                        // Buscar primero en directorios con nombres más relevantes
                        const dirPriority = item.toLowerCase().includes('recording') || 
                                          item.toLowerCase().includes('session') || 
                                          item.includes(sessionIdStr) ||
                                          item.includes(`Session${sessionIdStr}`) ? 5 : 0;
                        
                        if (dirPriority > 0) {
                          logger.info(`  - Directorio prioritario para búsqueda: ${item}`);
                        }
                        
                        // Buscar en subdirectorios
                        const subdirResults = searchRecursively(fullPath, depth + 1);
                        if (subdirResults.length > 0) {
                          logger.info(`  - Encontrados ${subdirResults.length} archivos en subdirectorio ${item}`);
                        }
                        results.push(...subdirResults);
                      } else if (stat.isFile() && item.endsWith('.mp4')) {
                        // Verificar de manera más detallada si el archivo coincide
                        const matchesCameraId = 
                          item.includes(`cam${recording.cameraId}`) || 
                          item.includes(`camera${recording.cameraId}`) ||
                          item.includes(`c${recording.cameraId}`) ||
                          item.includes(cameraPrefix);
                          
                        const matchesSessionId =
                          item.includes(`session${sessionId}`) ||
                          item.includes(`Session${sessionId}`) ||
                          item.includes(`s${sessionId}_`);
                        
                        // Prioridad en archivos que coinciden con cámara y sesión
                        if (matchesCameraId && matchesSessionId) {
                          logger.info(`  - ✅ Coincidencia perfecta (cámara+sesión): ${item}`);
                          results.unshift(fullPath); // Añadir al principio (prioridad máxima)
                        }
                        // Segunda prioridad: coincide con el ID de cámara
                        else if (matchesCameraId) {
                          logger.info(`  - ✓ Coincidencia por cámara: ${item}`);
                          results.push(fullPath);
                        }
                        // Tercera prioridad: coincide con el ID de sesión
                        else if (matchesSessionId) {
                          logger.info(`  - ○ Coincidencia por sesión: ${item}`);
                          results.push(fullPath);
                        }
                        // También buscar cualquier MP4 que tenga un patrón relacionado
                        else if (
                          item.includes(cameraPrefix.toLowerCase()) || 
                          item.includes(`${recording.cameraId}`) ||
                          item.includes(`${sessionIdStr}`)
                        ) {
                          logger.info(`  - Posible coincidencia por patrón parcial: ${item}`);
                          results.push(fullPath);
                        }
                      }
                    } catch (itemErr) {
                      logger.error(`  - Error procesando item ${item}: ${itemErr}`);
                    }
                  }
                } catch (readErr) {
                  logger.error(`  - Error leyendo directorio ${directory}: ${readErr}`);
                }
                
                return results;
              };
              
              const foundFiles = searchRecursively(dir);
              if (foundFiles.length > 0) {
                // Usar el primer archivo encontrado
                const filePath = foundFiles[0];
                const fileName = path.basename(filePath);
                logger.info(`Encontrado archivo mediante búsqueda recursiva: ${filePath}`);
                archive.file(filePath, { name: `recordings/${fileName}` });
                fileFound = true;
                videoFilesAdded++;
                break;
              }
            } catch (err) {
              logger.error(`Error en búsqueda recursiva en ${dir}:`, err);
            }
          }
        }
        
        if (!fileFound) {
          logger.warn(`No se encontró archivo de video para grabación ${recording.id} (cámara ${recording.cameraId}, prefijo: ${cameraPrefix})`);
        }
      }
    }
    
    logger.info(`Total de archivos de video añadidos al ZIP: ${videoFilesAdded} de ${recordings.length} grabaciones`);
    
    // Añadir un informe de las grabaciones incluidas
    const recordingsReport = {
      sessionId: Number(sessionId),
      sessionName: session.name,
      totalRecordings: recordings.length,
      includedRecordings: videoFilesAdded,
      recordingsDetails: recordings.map(rec => ({
        id: rec.id,
        cameraId: rec.cameraId,
        cameraPrefix: camerasMap.get(rec.cameraId)?.recordingPrefix || `cam${rec.cameraId}`,
        filePath: rec.filePath,
        startTime: rec.startTime,
        endTime: rec.endTime
      }))
    };
    
    archive.append(JSON.stringify(recordingsReport, null, 2), { name: 'metadata/recordings_report.json' });
    
    // Añadir metadatos de la sesión con información detallada
    const metadataFileName = `session_metadata.json`;
    const metadataFile = path.join(tempDir, metadataFileName);
    
    // Crear un objeto de metadatos detallado
    const sessionMetadata = {
      sessionName: session.name,
      sessionId: session.id,
      researcher: session.metadata?.researcher || "",
      participants: session.metadata?.participants || "",
      description: session.description || "",
      tags: session.tags || [],
      date: {
        start: session.startTime.toISOString(),
        end: session.endTime ? session.endTime.toISOString() : new Date().toISOString(),
        duration: calculateDuration(session.startTime, session.endTime || new Date())
      },
      project: session.metadata?.project || "",
      location: session.metadata?.location || "",
      cameras: recordings.map(rec => ({
        id: rec.cameraId,
        name: camerasMap.get(rec.cameraId)?.name || `Camera ${rec.cameraId}`,
        recordingId: rec.id,
        startTime: rec.startTime,
        endTime: rec.endTime,
        filePath: rec.filePath
      })),
      sensors: session.metadata?.selectedSensors || [],
      exportDate: new Date().toISOString(),
      status: session.status || "completed",
      notes: session.notes || ""
    };
    
    fs.writeFileSync(metadataFile, JSON.stringify(sessionMetadata, null, 2));
    
    archive.file(metadataFile, { name: 'metadata/session_metadata.json' });
    
    // Añadir AllData.json si existe
    const allDataPath = path.join(process.cwd(), 'data', 'sensor_data', sessionId, 'AllData.json');
    if (fs.existsSync(allDataPath)) {
      archive.file(allDataPath, { name: 'sensor_data/AllData.json' });
    }
    
    // Finalizar el ZIP
    await archive.finalize();
    
  } catch (error) {
    logger.error('Error exportando todos los datos de la sesión:', error);
    res.status(500).json({ error: 'Error exportando datos de la sesión' });
  }
}

/**
 * Verificar la conexión con el almacenamiento de datos
 */
export async function testSensorDataConnection(req: Request, res: Response) {
  try {
    const isConnected = await jsonDataService.testSensorDataConnection();
    res.json({ connected: isConnected });
  } catch (error) {
    logger.error('Error verificando conexión con datos de sensores:', error);
    res.status(500).json({ error: 'Error verificando conexión con datos de sensores' });
  }
}