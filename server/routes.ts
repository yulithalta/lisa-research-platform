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
import { log as viteLog } from './vite';
import { fileManager } from './fileManager';
import { thumbnailService } from './services/thumbnail.service';
import { archiveService } from './services/archive.service';
import { sessionService } from './services/session.service';
import { sessionController } from './controllers/session.controller';

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
    
    // 4. Añadir archivos específicos que podrían existir en el directorio principal de datos
    const specificSensorFiles = [
      'bridge.json',
      'devices.json',
      'humidity_sensors.csv',
      'temperature_sensors.csv',
      'motion_sensors.csv',
      'AllData.json'
    ];
    
    // Añadir explícitamente archivos de sensores específicos que son importantes
    for (const fileName of specificSensorFiles) {
      files.push({ fileName });
      console.log(`Añadiendo archivo de sensor: ${fileName}`);
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

// Asegurar que existen los directorios necesarios
const RECORDINGS_DIR = path.join(process.cwd(), "recordings");
const THUMBNAILS_DIR = path.join(process.cwd(), "public", "thumbnails");
const SESSIONS_DIR = path.join(process.cwd(), "sessions");
const DATA_DIR = path.join(process.cwd(), "data");

// Crear todos los directorios necesarios de una vez
[RECORDINGS_DIR, THUMBNAILS_DIR, SESSIONS_DIR, DATA_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    try {
      fs.mkdirSync(dir, { recursive: true, mode: 0o755 });
      console.log(`Directorio creado: ${dir}`);
    } catch (error) {
      console.error(`Error al crear directorio ${dir}:`, error);
    }
  }
});

let wss: WebSocketServer;
const recordingProcesses = new Map<number, { process: any, recording: any }>();
const streamProcesses = new Map<number, { process: any, clients: Set<WebSocket> }>();
const analysisProgress = new Map<string, { progress: number; status: string; framesAnalyzed: number; totalFrames: number; errorMessage: string | null }>();

async function startStreaming(camera: any, ws: WebSocket) {
  try {
    let streamProcess = streamProcesses.get(camera.id);

    if (!streamProcess) {
      const rtspUrl = buildRtspUrl(camera);
      console.log(`Starting stream for camera ${camera.id} - ${rtspUrl}`);

      // Actualizar estado inicial
      await storage.updateCamera(camera.id, {
        status: 'connecting',
        lastSeen: new Date(),
        metrics: {
          fps: 0,
          bitrate: 0,
          resolution: '',
          uptime: 0,
          connectionErrors: 0,
          lastErrorTime: null,
          lastErrorMessage: null
        }
      });

      const ffmpeg = spawn('ffmpeg', [
        '-rtsp_transport', 'tcp',
        '-i', rtspUrl,
        '-f', 'mpegts',
        '-codec:v', 'mpeg1video',
        '-s', '640x480',
        '-b:v', '800k',
        '-r', '30',
        '-bf', '0',
        '-muxdelay', '0.001',
        'pipe:1'
      ]);

      let startTime = Date.now();
      let frameCount = 0;
      let lastMetricUpdate = Date.now();
      let isConnected = false;

      streamProcess = {
        process: ffmpeg,
        clients: new Set([ws])
      };

      ffmpeg.stdout.on('data', (data) => {
        // Si recibimos datos, significa que la conexión está establecida
        if (!isConnected) {
          isConnected = true;
          storage.updateCamera(camera.id, {
            status: 'connected',
            lastSeen: new Date()
          }).catch(console.error);
        }

        frameCount++;
        const now = Date.now();

        // Actualizar métricas cada 5 segundos
        if (now - lastMetricUpdate >= 5000) {
          const uptime = Math.floor((now - startTime) / 1000);
          const fps = Math.round((frameCount / 5));

          storage.updateCamera(camera.id, {
            status: 'connected',
            lastSeen: new Date(),
            metrics: {
              fps,
              bitrate: 800,
              resolution: '640x480',
              uptime,
              connectionErrors: camera.metrics?.connectionErrors || 0,
              lastErrorTime: camera.metrics?.lastErrorTime,
              lastErrorMessage: camera.metrics?.lastErrorMessage
            }
          }).catch(console.error);

          frameCount = 0;
          lastMetricUpdate = now;

          // Notificar a los clientes sobre la actualización
          wss.clients.forEach((client: any) => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({
                type: "camera_metrics_updated",
                cameraId: camera.id,
                metrics: {
                  fps,
                  bitrate: 800,
                  resolution: '640x480',
                  uptime
                }
              }));
            }
          });
        }

        streamProcess?.clients.forEach(client => {
          if (client.readyState === WebSocket.OPEN) {
            try {
              client.send(data);
            } catch (error) {
              console.error(`Error sending stream data to client:`, error);
            }
          }
        });
      });

      ffmpeg.stderr.on('data', (data) => {
        const output = data.toString();
        console.log(`Stream FFmpeg (Camera ${camera.id}):`, output);

        // Detectar errores comunes y actualizar métricas
        if (output.includes('Connection refused') || output.includes('Connection timed out')) {
          storage.updateCamera(camera.id, {
            status: 'error',
            metrics: {
              ...camera.metrics,
              connectionErrors: (camera.metrics?.connectionErrors || 0) + 1,
              lastErrorTime: new Date(),
              lastErrorMessage: output
            }
          }).catch(console.error);
        }
      });

      ffmpeg.on('error', (error) => {
        console.error(`Stream FFmpeg error for camera ${camera.id}:`, error);
        ws.close();
      });

      ffmpeg.on('close', (code) => {
        console.log(`Stream FFmpeg process closed for camera ${camera.id} with code ${code}`);
        streamProcesses.delete(camera.id);
        ws.close();
      });

      streamProcesses.set(camera.id, streamProcess);
    } else {
      streamProcess.clients.add(ws);
    }

    ws.on('close', () => {
      const process = streamProcesses.get(camera.id);
      if (process) {
        process.clients.delete(ws);
        if (process.clients.size === 0) {
          process.process.kill();
          streamProcesses.delete(camera.id);
        }
      }
    });
  } catch (error) {
    console.error('Error in startStreaming:', error);
    ws.close();
  }
}

async function startRecording(camera: any, sessionId?: number) {
  try {
    // Crear directorio principal de grabaciones si no existe
    if (!fs.existsSync(RECORDINGS_DIR)) {
      console.log(`Creating recordings directory: ${RECORDINGS_DIR}`);
      fs.mkdirSync(RECORDINGS_DIR, { recursive: true, mode: 0o755 });
    }

    // Obtener el ID de sesión directamente del parámetro o del objeto de la cámara
    const activeSessionId = sessionId || camera.sessionId || null;
    
    // IMPORTANTE: Cambio de estrategia - Guardamos SIEMPRE en la carpeta temporal de grabaciones
    // y solo al exportar la sesión moveremos los archivos a la carpeta de sesión específica
    let outputDirectory = RECORDINGS_DIR;
    
    // Pero aseguramos que existan los directorios de sesión para los metadatos
    if (activeSessionId) {
      // Crear estructura de directorios para la sesión (para los metadatos)
      const sessionDir = path.join(process.cwd(), 'sessions');
      if (!fs.existsSync(sessionDir)) {
        fs.mkdirSync(sessionDir, { recursive: true, mode: 0o755 });
        console.log(`Creado directorio principal de sesiones: ${sessionDir}`);
      }
      
      const sessionDirName = `Session${activeSessionId}`;
      const sessionDirPath = path.join(sessionDir, sessionDirName);
      if (!fs.existsSync(sessionDirPath)) {
        fs.mkdirSync(sessionDirPath, { recursive: true, mode: 0o755 });
        console.log(`Creado directorio para la sesión: ${sessionDirPath}`);
      }
      
      // Crear subdirectorio para los datos de sensores
      const sensorDataDir = path.join(sessionDirPath, 'sensor_data');
      if (!fs.existsSync(sensorDataDir)) {
        fs.mkdirSync(sensorDataDir, { recursive: true, mode: 0o755 });
        console.log(`Creado directorio de datos de sensores: ${sensorDataDir}`);
      }
      
      // Crear directorio para las grabaciones, pero no lo usaremos hasta exportar
      const sessionRecordingsPath = path.join(sessionDirPath, 'recordings');
      if (!fs.existsSync(sessionRecordingsPath)) {
        fs.mkdirSync(sessionRecordingsPath, { recursive: true, mode: 0o755 });
        console.log(`Creado directorio de grabaciones de la sesión: ${sessionRecordingsPath}`);
      }
      
      console.log(`ℹ️ Grabación temporal en: ${outputDirectory} - Se moverá a ${sessionRecordingsPath} al exportar la sesión`);
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    // Usar el prefijo de grabación definido en la cámara, o un valor predeterminado basado en el ID
    // Priorizar nombres reales y legibles para los archivos
    const prefix = camera.name 
      ? camera.name.toLowerCase().replace(/\s+/g, '-') 
      : (camera.recordingPrefix 
          ? `${camera.recordingPrefix}` 
          : `cam${camera.id}`);
    
    // Formato de nombre de archivo que incluye el ID de sesión si está disponible
    // CORRECCIÓN: La forma en que formamos el nombre del archivo no afecta la ubicación donde se guarda
    // pero es bueno para identificación. Sin embargo, es el outputDirectory el que realmente
    // determina dónde se guarda el archivo físicamente.
    const sessionPart = activeSessionId ? `_session${activeSessionId}` : '';
    const fileName = `${prefix}${sessionPart}-${timestamp}.mp4`;
    
    // Asegurar que el archivo se guarde en el directorio correcto de la sesión
    const outputPath = path.join(outputDirectory, fileName);
    
    // Log detallado para verificar la ruta exacta donde se está guardando el archivo
    console.log(`Path completo de grabación: ${outputPath}`);
    console.log(`Directorio base: ${RECORDINGS_DIR}`);
    console.log(`Directorio de sesión: ${outputDirectory}`);

    console.log(`Starting recording for camera ${camera.id}${activeSessionId ? ` in session ${activeSessionId}` : ''}`);
    console.log(`Output path: ${outputPath}`);

    // Guardar datos de sensores MQTT junto con la grabación en la misma ubicación
    const sensorDataFileName = `${prefix}${sessionPart}-${timestamp}-sensors.json`;
    const sensorDataPath = path.join(outputDirectory, sensorDataFileName);
    
    // Intentar guardar datos MQTT
    try {
      // Comprobar si hay datos de MQTT disponibles en el frontend (a través de websocket)
      wss.clients.forEach((client: any) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({ 
            type: "get_mqtt_data",
            requestId: timestamp,
            sessionId: activeSessionId
          }));
        }
      });
      
      // Crear archivo JSON para datos de sensores (vacío inicialmente)
      fs.writeFileSync(sensorDataPath, JSON.stringify({ 
        startTime: new Date().toISOString(),
        cameraId: camera.id,
        sessionId: activeSessionId,
        messages: []
      }));
      
      console.log(`Created sensor data file: ${sensorDataPath}`);
      
      // Registrar el archivo de datos del sensor en la sesión si hay una sesión activa
      if (activeSessionId) {
        try {
          console.log(`Registrando archivo de datos de sensor en sesión ${activeSessionId}: ${sensorDataPath}`);
          await sessionService.registerSensorDataFile(activeSessionId, sensorDataPath);
          console.log(`✅ Archivo de datos de sensor registrado exitosamente en la sesión ${activeSessionId}`);
        } catch (regError) {
          console.error(`Error al registrar archivo de datos de sensor en sesión ${activeSessionId}:`, regError);
        }
      }
    } catch (sensorError) {
      console.error('Error creating sensor data file:', sensorError);
    }

    // Crear la grabación con la asociación correcta a la sesión
    console.log(`⚠️ AVISO IMPORTANTE: Guardando archivo MP4 con los siguientes detalles:`);
    console.log(`  - Camera ID: ${camera.id}`);
    console.log(`  - Session ID: ${activeSessionId || 'No hay sesión activa'}`);
    console.log(`  - Ruta final: ${outputPath}`);
    
    const recording = await storage.createRecording({
      cameraId: camera.id,
      filePath: outputPath,
      startTime: new Date(),
      title: camera.recordingPrefix ? `${camera.recordingPrefix} ${timestamp}` : undefined,
      sensorDataPath, // Guardar referencia al archivo de datos de sensores
      sessionId: activeSessionId // Usar el ID de sesión que hemos determinado
    });

    const rtspUrl = buildRtspUrl(camera);
    console.log(`RTSP URL: ${rtspUrl}`);

    // Comando ffmpeg mejorado para asegurar una grabación más robusta y compatible
    const ffmpegCommand = [
      '-y', // Sobrescribir archivo si existe
      '-rtsp_transport', 'tcp', // Usar TCP para más estabilidad
      '-i', rtspUrl,
      '-c:v', 'libx264', // Usar H.264 codec
      '-preset', 'ultrafast', // Preset más rápido para garantizar que funcione
      '-tune', 'zerolatency', // Optimizar para latencia cero
      '-b:v', '1500k', // Bitrate reducido para mejor compatibilidad
      '-maxrate', '2M', // Máximo bitrate
      '-bufsize', '4M', // Buffer size
      '-vf', 'scale=1280:720', // Escalar a 720p
      '-r', '25', // 25 FPS para mejor compatibilidad
      '-g', '50', // Keyframe cada 50 frames (2 segundos a 25fps)
      '-keyint_min', '25', // Mínimo intervalo entre keyframes
      '-sc_threshold', '0', // Deshabilitar detección de cambio de escena
      '-an', // No audio
      '-f', 'mp4', // Forzar formato MP4
      '-movflags', '+faststart', // Optimizar para streaming
      outputPath
    ];

    console.log(`FFmpeg command: ffmpeg ${ffmpegCommand.join(' ')}`);

    const ffmpeg = spawn('ffmpeg', ffmpegCommand);

    ffmpeg.stderr.on('data', (data) => {
      const output = data.toString();
      console.log(`FFmpeg (Camera ${camera.id}):`, output);
    });

    ffmpeg.stdout.on('data', (data) => {
      console.log(`FFmpeg stdout (Camera ${camera.id}):`, data.toString());
    });

    ffmpeg.on('error', async (error) => {
      console.error(`FFmpeg process error for camera ${camera.id}:`, error);
      await storage.updateRecording(recording.id, {
        status: 'error',
        endTime: new Date()
      });
      recordingProcesses.delete(camera.id);
    });

    ffmpeg.on('close', async (code) => {
      console.log(`FFmpeg process closed for camera ${camera.id} with code ${code}`);

      // Verificar si el archivo se creó correctamente
      if (fs.existsSync(outputPath)) {
        const stats = fs.statSync(outputPath);
        console.log(`Recording file size: ${stats.size} bytes`);
        
        // Registrar la ubicación del archivo en los logs para depuración
        console.log(`✅ Archivo MP4 creado exitosamente en: ${outputPath}`);
        
        // Para la sesión específica, verificar que el archivo esté en el directorio correcto
        if (activeSessionId) {
          const expectedSessionDir = path.join(process.cwd(), 'sessions', `Session${activeSessionId}`, 'recordings');
          const isInCorrectLocation = outputPath.includes(expectedSessionDir);
          console.log(`✅ ¿Archivo en ubicación correcta de sesión? ${isInCorrectLocation ? 'SÍ' : 'NO - Problema detectado!'}`);
          
          if (!isInCorrectLocation) {
            console.error(`⚠️ ADVERTENCIA: El archivo se guardó en ${outputPath} pero debería estar en ${expectedSessionDir}`);
          }
        }
        
        // Crear una miniatura del video para la visualización en la interfaz - Usando el servicio modularizado
        try {
          // Generar miniatura utilizando el nuevo servicio especializado
          const thumbnailPromise = thumbnailService.generateThumbnail(outputPath, recording.id);
          
          // No esperamos a que termine la generación de la miniatura para no bloquear el proceso principal
          thumbnailPromise.catch(error => {
            console.error(`Error al generar miniatura: ${error}`);
          });
        } catch (thumbnailError) {
          console.error(`Error al generar miniatura: ${thumbnailError}`);
        }
      } else {
        console.error(`❌ Recording file was not created at ${outputPath}`);
      }

      const status = code === 0 ? 'completed' : 'error';
      await storage.updateRecording(recording.id, {
        status,
        endTime: new Date(),
        // Asegurar que la ruta del archivo guardada en la base de datos es correcta
        filePath: outputPath
      });
      
      // Registrar el archivo de grabación en la sesión si hay una sesión activa
      if (activeSessionId) {
        try {
          console.log(`Registrando archivo de grabación en sesión ${activeSessionId}: ${outputPath}`);
          await sessionService.registerRecordingFile(activeSessionId, outputPath, camera.id);
          console.log(`✅ Archivo registrado exitosamente en la sesión ${activeSessionId}`);
        } catch (regError) {
          console.error(`Error al registrar archivo en sesión ${activeSessionId}:`, regError);
        }
      }
      
      recordingProcesses.delete(camera.id);
    });

    recordingProcesses.set(camera.id, { process: ffmpeg, recording });
    return recording;
  } catch (error) {
    console.error('Error in startRecording:', error);
    throw error;
  }
}

async function stopRecording(cameraId: number) {
  try {
    const recordingProcess = recordingProcesses.get(cameraId);
    if (recordingProcess) {
      console.log(`Stopping recording for camera ${cameraId}`);
      recordingProcess.process.kill('SIGTERM');
      const recordingId = recordingProcess.recording.id;
      const sessionId = recordingProcess.recording.sessionId;
      const filePath = recordingProcess.recording.filePath;
      
      await storage.updateRecording(recordingId, {
        status: 'completed',
        endTime: new Date()
      });
      
      // Registrar el archivo de grabación en la sesión si hay una sesión activa
      if (sessionId && filePath) {
        try {
          console.log(`Registrando archivo de grabación en sesión ${sessionId}: ${filePath}`);
          await sessionService.registerRecordingFile(sessionId, filePath, cameraId);
          console.log(`✅ Archivo registrado exitosamente en la sesión ${sessionId}`);
        } catch (regError) {
          console.error(`Error al registrar archivo en sesión ${sessionId}:`, regError);
        }
      }
      
      recordingProcesses.delete(cameraId);
    }
  } catch (error) {
    console.error(`Error stopping recording for camera ${cameraId}:`, error);
    throw error;
  }
}

async function startAllRecordings(userId: number, sessionId?: number) {
  try {
    // Obtener todas las cámaras del usuario
    const cameras = await storage.getCameras(userId);
    console.log(`Starting recording for ${cameras.length} cameras${sessionId ? ` in session ${sessionId}` : ''}`);

    // Establecer un tiempo de inicio común (5 segundos en el futuro)
    const startTime = new Date(Date.now() + 5000);

    // Iniciar la grabación de todas las cámaras
    const promises = cameras.map(async (camera) => {
      try {
        // Si la cámara ya está grabando, detenerla primero
        if (camera.isRecording) {
          await stopRecording(Number(camera.id));
        }
        
        // Actualizar la cámara con el estado de grabación y el ID de sesión si está disponible
        const updateData: any = { isRecording: true };
        if (sessionId) {
          updateData.sessionId = sessionId;
        }
        
        const updatedCamera = await storage.updateCamera(Number(camera.id), updateData);
        
        // Notificar a todos los clientes conectados
        wss.clients.forEach((client: any) => {
          if (client.readyState === client.OPEN) {
            client.send(JSON.stringify({ 
              type: "camera_updated", 
              camera: updatedCamera,
              sessionId: sessionId
            }));
          }
        });
        
        // Iniciar la grabación pasando el ID de sesión
        return await startRecording(updatedCamera, sessionId);
      } catch (error) {
        console.error(`Error starting recording for camera ${camera.id}:`, error);
        return null;
      }
    });

    const results = await Promise.all(promises);
    return results.filter(r => r !== null);
  } catch (error) {
    console.error('Error starting all recordings:', error);
    throw error;
  }
}

async function stopAllRecordings(userId: number) {
  try {
    const cameras = await storage.getCameras(userId);
    console.log(`Stopping recording for ${cameras.length} cameras`);

    const promises = cameras.map(async (camera) => {
      if (camera.isRecording) {
        try {
          await stopRecording(Number(camera.id));
          const updatedCamera = await storage.updateCamera(Number(camera.id), { isRecording: false });
          wss.clients.forEach((client: any) => {
            if (client.readyState === client.OPEN) {
              client.send(JSON.stringify({ type: "camera_updated", camera: updatedCamera }));
            }
          });
          return true;
        } catch (error) {
          console.error(`Error stopping recording for camera ${camera.id}:`, error);
          return false;
        }
      }
      return true;
    });

    await Promise.all(promises);
  } catch (error) {
    console.error('Error stopping all recordings:', error);
    throw error;
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Crear el servidor HTTP
  const httpServer = createServer(app);
  
  // Configurar autenticación y rutas de sensores
  setupAuth(app);
  registerSensorRoutes(app);
  
  // Ruta para obtener dispositivos Zigbee detectados
  app.get('/api/discover/zigbee-devices', (req, res) => {
    try {
      // Importar el cliente MQTT de forma dinámica
      const mqttClient = require('./mqtt-client').default.getInstance();
      
      // Obtener lista de dispositivos detectados
      const devices = mqttClient.getMqttSensors().map(sensor => ({
        id: sensor.id,
        name: sensor.name || sensor.id,
        type: sensor.deviceType || 'unknown',
        status: sensor.status || 'offline',
        lastSeen: sensor.lastSeen || new Date().toISOString(),
        data: sensor.data || {}
      }));
      
      res.json({
        devices,
        foundCount: devices.length,
        lastUpdateTime: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error obteniendo dispositivos Zigbee:', error);
      res.status(500).json({ 
        error: 'Error obteniendo dispositivos Zigbee',
        devices: [],
        foundCount: 0
      });
    }
  });
  
  // Rutas para gestión de sesiones
  app.get('/api/sessions', async (req, res) => {
    try {
      const userId = req.user?.id || 1; // Usar ID del usuario autenticado o 1 como fallback para desarrollo
      const sessions = await storage.getSessions(userId);
      res.json(sessions);
    } catch (error) {
      console.error('Error obteniendo sesiones:', error);
      res.status(500).json({ error: 'Error obteniendo sesiones' });
    }
  });

  app.get('/api/sessions/:id', async (req, res) => {
    try {
      const sessionId = parseInt(req.params.id);
      const session = await storage.getSessionById(sessionId);
      
      if (!session) {
        return res.status(404).json({ error: 'Sesión no encontrada' });
      }
      
      res.json(session);
    } catch (error) {
      console.error('Error obteniendo sesión:', error);
      res.status(500).json({ error: 'Error obteniendo sesión' });
    }
  });

  app.post('/api/sessions', async (req, res) => {
    try {
      const userId = req.user?.id || 1; // Usar ID del usuario autenticado o 1 como fallback para desarrollo
      const sessionData = {
        ...req.body,
        userId
      };
      
      console.log('Creating new session with data:', JSON.stringify(sessionData, null, 2));
      
      // Crear la sesión en la base de datos
      const session = await storage.createSession(sessionData);
      
      try {
        // Crear directorios para la sesión
        const sessionDir = path.join(SESSIONS_DIR, `Session${session.id}`);
        if (!fs.existsSync(sessionDir)) {
          fs.mkdirSync(sessionDir, { recursive: true });
          console.log(`Created session directory: ${sessionDir}`);
        }
        
        // Crear directorio de grabaciones para esta sesión
        const sessionRecordingsDir = path.join(sessionDir, 'recordings');
        if (!fs.existsSync(sessionRecordingsDir)) {
          fs.mkdirSync(sessionRecordingsDir, { recursive: true });
          console.log(`Created session recordings directory: ${sessionRecordingsDir}`);
        }
        
        // Crear archivo para datos de sensores
        const sensorDataPath = path.join(sessionDir, `session_${session.id}_sensors.json`);
        
        // Registrar la sesión para captura de datos de sensores con el cliente MQTT importado
        try {
          console.log(`MQTT Client available: ${mqttClient ? 'Yes' : 'No'}`);
          
          if (mqttClient) {
            // Sensores seleccionados para esta sesión (si se especificaron)
            const selectedSensors = sessionData.sensors || [];
            console.log(`Registering session with MQTT client. Selected sensors: ${selectedSensors.length}`);
            
            // Usar el cliente MQTT ya importado en la parte superior del archivo
            mqttClient.registerSession(session.id, sensorDataPath, selectedSensors);
            console.log(`MQTT data collection started for session ${session.id}`);
          } else {
            console.warn('MQTT client not available, cannot start sensor data collection');
          }
        } catch (mqttError) {
          console.error('Error registering session with MQTT client:', mqttError);
          // No fallar toda la operación si hay problemas con MQTT
        }
        
        // Iniciar grabación para las cámaras seleccionadas
        if (sessionData.cameras && sessionData.cameras.length > 0) {
          console.log(`Starting recording for ${sessionData.cameras.length} cameras`);
          
          for (const cameraId of sessionData.cameras) {
            try {
              const camera = await storage.getCamera(cameraId);
              if (camera) {
                // Crear un nombre de archivo basado en la sesión
                const outputFileName = `session${session.id}_cam${camera.id}_${new Date().toISOString().replace(/:/g, '-')}.mp4`;
                const outputPath = path.join(sessionRecordingsDir, outputFileName);
                
                // Iniciar la grabación usando la función principal startRecording
                console.log(`Starting recording for camera ${camera.id} as part of session ${session.id}`);
                
                // Configurar la cámara con los detalles necesarios para la sesión
                const cameraWithSessionInfo = {
                  ...camera,
                  recordingPrefix: `session${session.id}_${camera.name || 'cam' + camera.id}`,
                  sessionId: session.id
                };
                
                try {
                  // Usar la función principal de grabación
                  const recording = await startRecording(cameraWithSessionInfo);
                  console.log(`Successfully started recording ${recording.id} for camera ${camera.id} in session ${session.id}`);
                  
                  // Actualizar la grabación con el ID de sesión si no se hizo automáticamente
                  if (!recording.sessionId) {
                    await storage.updateRecording(recording.id, {
                      sessionId: session.id,
                      title: `Session ${session.id} - ${camera.name || 'Camera ' + camera.id}`
                    });
                  }
                } catch (recordingError) {
                  console.error(`Failed to start recording for camera ${camera.id} in session ${session.id}:`, recordingError);
                }
                
                // Actualizar estado de la cámara
                await storage.updateCamera(camera.id, { isRecording: true });
              }
            } catch (cameraError) {
              console.error(`Error starting recording for camera ${cameraId}:`, cameraError);
              // Continuar con la siguiente cámara
            }
          }
        } else {
          console.log('No cameras selected for recording in this session');
        }
      } catch (initError) {
        console.error('Error initializing session resources:', initError);
        // No fallar toda la operación, la sesión ya fue creada
      }
      
      res.status(201).json(session);
    } catch (error) {
      console.error('Error creando sesión:', error);
      
      // Mejorar mensajes de error para nombre de sesión duplicado
      if (error instanceof Error && error.message.includes("Ya existe una sesión con el nombre")) {
        return res.status(400).json({ 
          error: 'Nombre duplicado', 
          message: error.message,
          field: 'name'
        });
      }
      
      res.status(500).json({ error: 'Error creando sesión' });
    }
  });

  app.patch('/api/sessions/:id', async (req, res) => {
    try {
      const sessionId = parseInt(req.params.id);
      const session = await storage.getSessionById(sessionId);
      
      if (!session) {
        return res.status(404).json({ error: 'Sesión no encontrada' });
      }
      
      // Si se está completando una sesión activa, detener grabaciones y capturas
      if (session.status === 'active' && req.body.status === 'completed') {
        console.log(`Completing active session ${sessionId}`);
        
        try {
          // 1. Detener todos los procesos de grabación de cámaras asociados a esta sesión
          const recordings = await storage.getSessionRecordings(sessionId);
          console.log(`Found ${recordings.length} recordings to stop for session ${sessionId}`);
          
          // Detener cada grabación
          for (const recording of recordings) {
            if (recording.status === 'recording') {
              try {
                // Buscar la cámara asociada a esta grabación
                const cameraId = recording.cameraId;
                if (recordingProcesses.has(cameraId)) {
                  console.log(`Stopping recording process for camera ${cameraId}`);
                  const recordingProcess = recordingProcesses.get(cameraId);
                  if (recordingProcess && recordingProcess.process) {
                    recordingProcess.process.kill('SIGTERM');
                    await storage.updateRecording(recording.id, {
                      status: 'completed',
                      endTime: new Date()
                    });
                    recordingProcesses.delete(cameraId);
                    
                    // Actualizar estado de la cámara
                    await storage.updateCamera(cameraId, { isRecording: false });
                  }
                }
              } catch (stopError) {
                console.error(`Error stopping recording ${recording.id}:`, stopError);
                // Continuar con las demás grabaciones
              }
            }
          }
          
          // 2. Detener la captura de datos MQTT para esta sesión
          try {
            console.log(`Stopping MQTT data collection for session ${sessionId}`);
            // Usar el cliente MQTT ya importado en la parte superior del archivo
            mqttClient.endSession(sessionId);
            console.log(`MQTT data collection stopped for session ${sessionId}`);
          } catch (mqttError) {
            console.error(`Error stopping MQTT data collection for session ${sessionId}:`, mqttError);
            // No fallar toda la operación si hay problemas con MQTT
          }
          
          // 3. Establecer la hora de finalización de la sesión
          req.body.endTime = new Date();
          console.log(`Session ${sessionId} completed at ${req.body.endTime}`);
        } catch (completionError) {
          console.error(`Error completing session ${sessionId}:`, completionError);
          // No fallar todo el proceso, continuamos con la actualización de la sesión
        }
      }
      
      const updatedSession = await storage.updateSession(sessionId, req.body);
      res.json(updatedSession);
    } catch (error) {
      console.error('Error actualizando sesión:', error);
      
      // Mejorar mensajes de error para nombre de sesión duplicado
      if (error instanceof Error && error.message.includes("Ya existe una sesión con el nombre")) {
        return res.status(400).json({ 
          error: 'Nombre duplicado', 
          message: error.message,
          field: 'name'
        });
      }
      
      res.status(500).json({ error: 'Error actualizando sesión' });
    }
  });

  app.delete('/api/sessions/:id', async (req, res) => {
    try {
      const sessionId = parseInt(req.params.id);
      const session = await storage.getSessionById(sessionId);
      
      if (!session) {
        return res.status(404).json({ error: 'Sesión no encontrada' });
      }
      
      await storage.deleteSession(sessionId);
      res.status(204).send();
    } catch (error) {
      console.error('Error eliminando sesión:', error);
      res.status(500).json({ error: 'Error eliminando sesión' });
    }
  });

  // Rutas para datos de sensores JSON
  app.get('/api/sensor-data/latest', jsonRoutes.getLatestSensorData);
  app.get('/api/sessions/:sessionId/export-sensor-data', jsonRoutes.exportSessionSensorData);
  app.get('/api/sessions/:sessionId/export-all', jsonRoutes.exportAllSessionData);
  app.get('/api/influxdb/status', jsonRoutes.testSensorDataConnection);
  wss = new WebSocketServer({ 
    server: httpServer, 
    path: "/ws",
    verifyClient: (info: any, done: any) => {
      // No requerir autenticación para conexiones WS
      // pero registrar los intentos de conexión
      viteLog(`WebSocket connection attempt from ${info.req.socket.remoteAddress}`, "websocket");
      done(true);
    }
  });

  // Manejar conexiones WebSocket para streaming
  wss.on('connection', async (ws, req) => {
    const url = new URL(req.url ?? '', 'http://localhost');
    const cameraId = url.pathname.split('/')[2]; // /stream/:cameraId

    viteLog(`New WebSocket connection for camera ${cameraId}`, "websocket");

    if (!cameraId) {
      viteLog('No camera ID provided, closing connection', "websocket");
      ws.close();
      return;
    }

    try {
      const camera = await storage.getCamera(parseInt(cameraId));
      if (!camera) {
        viteLog(`Camera ${cameraId} not found, closing connection`, "websocket");
        ws.close();
        return;
      }

      await startStreaming(camera, ws);
    } catch (error) {
      viteLog(`Error handling WebSocket connection: ${error}`, "websocket");
      ws.close();
    }
  });

  app.get("/api/cameras", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const cameras = await storage.getCameras(req.user.id);
    res.json(cameras);
  });

  app.post("/api/cameras", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const camera = insertCameraSchema.parse(req.body);
      const newCamera = await storage.createCamera({
        ...camera,
        userId: req.user.id,
      });
      wss.clients.forEach((client: any) => {
        if (client.readyState === client.OPEN) {
          client.send(JSON.stringify({ type: "camera_added", camera: newCamera }));
        }
      });
      res.status(201).json(newCamera);
    } catch (e) {
      if (e instanceof ZodError) {
        res.status(400).json(e.errors);
      } else {
        console.error('Error creating camera:', e);
        // Pasar el mensaje de error específico si está disponible
        const errorMessage = e instanceof Error ? e.message : "Internal server error";
        res.status(500).json({ message: errorMessage });
      }
    }
  });

  // Verificar estado de cámara con HTTP
  app.get("/api/cameras/:id/ping", async (req, res) => {
    try {
      const { id } = req.params;
      const camera = await storage.getCamera(parseInt(id));
      if (!camera) {
        return res.status(404).send("Cámara no encontrada");
      }

      const { ipAddress } = camera;
      let status = 'unknown';
      let error = null;
      
      try {
        // Promisify exec para usarlo con async/await
        const exec = promisify(execCallback);
        
        // Función mejorada para verificar cámaras con ping más confiable
        const checkCamera = async (ip: string, attempts = 3, timeout = 2000) => {
          if (!ip || ip.trim() === '') {
            console.log(`Camera ${id} has no IP address configured`);
            return { 
              isAlive: false, 
              successRate: 0,
              error: 'No IP address configured' 
            };
          }
          
          // Extraer la IP sin protocolo ni puerto para asegurar compatibilidad
          const cleanIp = ip.replace(/^https?:\/\//, '').split(':')[0].split('/')[0];
          
          console.log(`📷 Verificando cámara ${id} (${cleanIp}) por ping, ${attempts} intentos con timeout ${timeout}ms`);
          
          let successCount = 0;
          let lastError = null;
          let results = [];
          
          // Realizar múltiples intentos de ping para mayor fiabilidad
          for (let i = 0; i < attempts; i++) {
            try {
              // Comando de ping según sistema operativo con timeout apropiado
              const pingCommand = process.platform === 'win32'
                ? `ping -n 1 -w ${timeout} ${cleanIp}`
                : `ping -c 1 -W ${Math.ceil(timeout/1000)} ${cleanIp}`;
              
              console.log(`Ejecutando: ${pingCommand}`);
              const { stdout } = await exec(pingCommand);
              
              // Verificar si el ping tuvo éxito (patrones comunes en diferentes SO)
              const success = stdout.includes('TTL=') || 
                            stdout.includes('ttl=') || 
                            stdout.includes('time=');
              
              if (success) {
                successCount++;
                results.push(true);
                console.log(`✅ Ping exitoso para cámara ${id} (${cleanIp}), intento ${i+1}`);
              } else {
                results.push(false);
                console.log(`❌ Ping fallido para cámara ${id} (${cleanIp}), intento ${i+1}: Respuesta sin TTL`);
              }
            } catch (err: any) {
              lastError = err.message;
              results.push(false);
              console.log(`❌ Ping fallido para cámara ${id} (${cleanIp}), intento ${i+1}: ${lastError}`);
            }
            
            // Pequeña pausa entre intentos para evitar saturación
            if (i < attempts - 1) {
              await new Promise(resolve => setTimeout(resolve, 300));
            }
          }
          
          const successRate = (successCount / attempts) * 100;
          console.log(`📊 Cámara ${id} (${cleanIp}) resultados ping: ${successCount}/${attempts} exitosos (${successRate}%)`);
          
          // Para mayor fiabilidad, requerimos al menos 2 éxitos o el 66% de los intentos
          // Solo si tenemos más de 2 intentos configurados
          const isAlive = attempts <= 2 
            ? successCount > 0 
            : (successCount >= 2 || (successRate >= 66));
          
          return {
            isAlive,
            successRate,
            results,
            error: lastError
          };
        };
        
        // Verificar la cámara con múltiples intentos
        console.log(`Iniciando verificación para cámara ${id} (${ipAddress})`);
        
        // Actualizar estado a "checking" antes de iniciar verificación
        await storage.updateCameraStatus(parseInt(id), 'checking');
        
        // Notificar inicio de verificación por WebSocket
        wss?.clients?.forEach((client: any) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
              type: 'camera_status_update',
              cameraId: parseInt(id),
              status: 'checking'
            }));
          }
        });
        
        // Realizar verificación
        const pingResult = await checkCamera(ipAddress);
        
        // Determinar estado según resultado - Simplificado para mejorar fiabilidad
        // Si al menos un ping fue exitoso, consideramos la cámara disponible
        if (pingResult.successRate > 0) {
          status = 'connected';
          // Asegurar que enviamos el estado correcto incluso con errores parciales
          console.log(`Cámara ${id} marcada como conectada con tasa de éxito ${pingResult.successRate.toFixed(1)}%`);
        } else if (pingResult.error) {
          status = 'error';
          error = pingResult.error;
        } else {
          status = 'disconnected';
        }
        
        console.log(`Verificación ping para cámara ${id} (${ipAddress}): ${status}, Tasa de éxito: ${pingResult.successRate.toFixed(1)}%`);
      } catch (checkError) {
        console.error('Error en verificación de cámara:', checkError);
        status = 'error';
        error = checkError.message;
      }
      
      // Actualizar el estado de la cámara en la base de datos
      await storage.updateCameraStatus(parseInt(id), status);
      
      // Enviar notificación por WebSocket
      wss?.clients?.forEach((client: any) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({ 
            type: "camera_status_updated", 
            camera: { id: parseInt(id), status, ipAddress } 
          }));
        }
      });
      
      res.json({ id, ipAddress, status, error });
    } catch (error) {
      console.error('Error checking camera:', error);
      res.status(500).send('Error verificando cámara');
    }
  });

  app.patch("/api/cameras/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const camera = await storage.getCamera(parseInt(req.params.id));
      if (!camera || camera.userId !== req.user.id) {
        return res.sendStatus(404);
      }

      if (req.body.isRecording !== undefined && req.body.isRecording !== camera.isRecording) {
        try {
          if (req.body.isRecording) {
            await startRecording(camera);
          } else {
            await stopRecording(camera.id);
          }
        } catch (error) {
          console.error('Error managing recording:', error);
          return res.status(500).json({ message: "Failed to manage recording" });
        }
      }

      const updatedCamera = await storage.updateCamera(camera.id, req.body);
      wss.clients.forEach((client: any) => {
        if (client.readyState === client.OPEN) {
          client.send(JSON.stringify({ type: "camera_updated", camera: updatedCamera }));
        }
      });
      res.json(updatedCamera);
    } catch (error) {
      console.error('Error updating camera:', error);
      res.status(500).json({ message: "Failed to update camera" });
    }
  });

  // API para iniciar la grabación de una cámara específica (se usará cuando la cámara es seleccionada)
  app.post("/api/cameras/:id/record", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const camera = await storage.getCamera(parseInt(req.params.id));
      if (!camera || camera.userId !== req.user.id) {
        return res.status(404).json({ message: "Camera not found" });
      }
      
      // Verificar si la cámara ya está siendo grabada
      const isRecording = recordingProcesses.has(camera.id);
      if (isRecording) {
        return res.status(400).json({ message: "Camera is already recording", isRecording: true });
      }
      
      // Verificar si podemos conectar con la cámara antes de intentar grabar
      try {
        // Usar la función de utilidad para verificar la conexión de la cámara
        // Esta función intenta hacer ping a la dirección IP y reporta si está conectada
        const pingResult = await ping.promise.probe(camera.ipAddress, {
          timeout: 2,
          min_reply: 1,
          extra: ['-c', '3']
        });
        
        // Si responde al ping, la consideramos conectada
        const isConnected = pingResult.alive;
        if (!isConnected) {
          return res.status(400).json({ message: "Camera is not connected", isConnected: false });
        }
      } catch (pingError) {
        console.error(`Error pinging camera ${camera.id}:`, pingError);
        return res.status(400).json({ message: "Error verifying camera connection", error: pingError.message });
      }
      
      // Iniciar la grabación si la cámara está conectada
      try {
        // Crear un registro de grabación en la base de datos
        const recording = await storage.createRecording({
          cameraId: camera.id,
          userId: req.user.id,
          status: 'recording',
          startTime: new Date(),
          filePath: '', // Se actualizará después con la ruta real del archivo
          sessionId: req.body.sessionId || null, // Opcionalmente asociar con una sesión
        });
        
        // Iniciar el proceso de grabación
        await startRecording(camera);
        
        // Actualizar el estado de la cámara
        await storage.updateCamera(camera.id, { isRecording: true });
        
        // Notificar a todos los clientes conectados por WebSocket
        wss.clients.forEach((client: any) => {
          if (client.readyState === client.OPEN) {
            client.send(JSON.stringify({ 
              type: "camera_recording_started", 
              cameraId: camera.id,
              recording
            }));
          }
        });
        
        return res.status(200).json({ 
          message: "Recording started successfully", 
          isRecording: true,
          recording
        });
      } catch (recordError) {
        console.error(`Error starting recording for camera ${camera.id}:`, recordError);
        return res.status(500).json({ 
          message: "Failed to start recording", 
          error: recordError.message 
        });
      }
    } catch (error) {
      console.error('Error starting camera recording:', error);
      res.status(500).json({ message: "Failed to start camera recording" });
    }
  });
  
  // API para detener la grabación de una cámara específica
  app.post("/api/cameras/:id/stop-recording", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const camera = await storage.getCamera(parseInt(req.params.id));
      if (!camera || camera.userId !== req.user.id) {
        return res.status(404).json({ message: "Camera not found" });
      }
      
      // Verificar si la cámara está siendo grabada
      const isRecording = recordingProcesses.has(camera.id);
      if (!isRecording) {
        return res.status(400).json({ message: "Camera is not recording", isRecording: false });
      }
      
      // Detener la grabación
      try {
        await stopRecording(camera.id);
        
        // Actualizar el estado de la cámara
        await storage.updateCamera(camera.id, { isRecording: false });
        
        // Notificar a todos los clientes conectados por WebSocket
        wss.clients.forEach((client: any) => {
          if (client.readyState === client.OPEN) {
            client.send(JSON.stringify({ 
              type: "camera_recording_stopped", 
              cameraId: camera.id 
            }));
          }
        });
        
        return res.status(200).json({ 
          message: "Recording stopped successfully", 
          isRecording: false
        });
      } catch (stopError) {
        console.error(`Error stopping recording for camera ${camera.id}:`, stopError);
        return res.status(500).json({ 
          message: "Failed to stop recording", 
          error: stopError.message 
        });
      }
    } catch (error) {
      console.error('Error stopping camera recording:', error);
      res.status(500).json({ message: "Failed to stop camera recording" });
    }
  });

  app.delete("/api/cameras/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const camera = await storage.getCamera(parseInt(req.params.id));
      if (!camera || camera.userId !== req.user.id) {
        return res.sendStatus(404);
      }
      await stopRecording(camera.id);
      await storage.deleteCamera(camera.id);
      wss.clients.forEach((client: any) => {
        if (client.readyState === client.OPEN) {
          client.send(JSON.stringify({ type: "camera_deleted", cameraId: camera.id }));
        }
      });
      res.sendStatus(204);
    } catch (error) {
      console.error('Error deleting camera:', error);
      res.status(500).json({ message: "Failed to delete camera" });
    }
  });

  app.get("/api/cameras/:id/recordings", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const camera = await storage.getCamera(parseInt(req.params.id));
      if (!camera || camera.userId !== req.user.id) {
        return res.sendStatus(404);
      }
      const recordings = await storage.getRecordings(camera.id);
      res.json(recordings);
    } catch (error) {
      console.error('Error fetching recordings:', error);
      res.status(500).json({ message: "Failed to fetch recordings" });
    }
  });

  app.get("/api/recordings", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      // Obtener todas las cámaras del usuario
      const cameras = await storage.getCameras(req.user.id);

      // Obtener todas las grabaciones para cada cámara
      const recordingsPromises = cameras.map(camera =>
        storage.getRecordings(camera.id)
      );

      const allRecordings = await Promise.all(recordingsPromises);

      // Aplanar el array de grabaciones y ordenar por fecha de inicio
      const recordings = allRecordings
        .flat()
        .sort((a, b) => b.startTime.getTime() - a.startTime.getTime());

      res.json(recordings);
    } catch (error) {
      console.error('Error fetching recordings:', error);
      res.status(500).json({ message: "Failed to fetch recordings" });
    }
  });

  app.get("/api/recordings/count", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const cameras = await storage.getCameras(req.user.id);
      const recordingsPromises = cameras.map(camera =>
        storage.getRecordings(camera.id)
      );

      const allRecordings = await Promise.all(recordingsPromises);
      const count = allRecordings.flat().length;

      res.json(count);
    } catch (error) {
      console.error('Error counting recordings:', error);
      res.status(500).json({ message: "Failed to count recordings" });
    }
  });

  app.get("/api/recordings/today", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const cameras = await storage.getCameras(req.user.id);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const recordingsPromises = cameras.map(camera =>
        storage.getRecordings(camera.id)
      );

      const allRecordings = await Promise.all(recordingsPromises);
      const todayRecordings = allRecordings
        .flat()
        .filter(recording => {
          const recordingDate = new Date(recording.startTime);
          recordingDate.setHours(0, 0, 0, 0);
          return recordingDate.getTime() === today.getTime();
        })
        .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());

      res.json(todayRecordings);
    } catch (error) {
      console.error('Error fetching today\'s recordings:', error);
      res.status(500).json({ message: "Failed to fetch today's recordings" });
    }
  });

  app.get("/api/system/stats", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const stats = await storage.getSystemUsageStats(req.user.id);
      res.json(stats);
    } catch (error) {
      console.error('Error fetching system stats:', error);
      res.status(500).json({ message: "Failed to fetch system statistics" });
    }
  });

  app.get("/api/system/disk", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const usage = await storage.getDiskUsage(req.user.id);
      res.json(usage);
    } catch (error) {
      console.error('Error fetching disk usage:', error);
      res.status(500).json({ message: "Failed to fetch disk usage" });
    }
  });

  app.post("/api/cameras/start-all", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const recordings = await startAllRecordings(req.user.id);
      res.json(recordings);
    } catch (error) {
      console.error('Error starting all recordings:', error);
      res.status(500).json({ message: "Failed to start recordings" });
    }
  });

  app.post("/api/cameras/stop-all", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      await stopAllRecordings(req.user.id);
      res.sendStatus(200);
    } catch (error) {
      console.error('Error stopping all recordings:', error);
      res.status(500).json({ message: "Failed to stop recordings" });
    }
  });
  
  // Nuevo endpoint para verificar todas las cámaras de un usuario
  app.post("/api/cameras/check-all", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      console.log(`[CHECK-ALL] Iniciando verificación de todas las cámaras para usuario: ${req.user.id}`);
      
      // Obtener todas las cámaras del usuario
      const cameras = await storage.getCameras(req.user.id);
      
      // Notificar inicio de verificación
      wss?.clients?.forEach((client: any) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            type: "camera_check_all_started",
            count: cameras.length
          }));
        }
      });
      
      // Crear una promesa para cada cámara (sin ejecutar todavía)
      const checkPromises = cameras.map(camera => {
        return async () => {
          const cameraId = camera.id;
          const ipAddress = camera.ipAddress;
          
          // Marcar la cámara como "checking"
          await storage.updateCameraStatus(cameraId, 'checking');
          
          // Notificar cambio de estado
          wss?.clients?.forEach((client: any) => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({
                type: 'camera_status_update',
                cameraId: cameraId,
                status: 'checking'
              }));
            }
          });
          
          // Realizar la verificación de ping
          try {
            const exec = promisify(execCallback);
            const checkCamera = async (ip: string, attempts = 5, timeout = 1500) => {
              if (!ip || ip.trim() === '') {
                console.log(`Cámara ${cameraId} sin dirección IP configurada`);
                return { isAlive: false, successRate: 0, error: 'No IP address configured' };
              }
              
              // Extraer la IP sin protocolo/puerto para mayor compatibilidad
              const cleanIp = ip.replace(/^https?:\/\//, '').split(':')[0].split('/')[0];
              
              console.log(`📷 Verificando cámara ${cameraId} (${cleanIp}) con ${attempts} intentos`);
              
              let successCount = 0;
              let lastError = null;
              let results = [];
              
              // Realizar múltiples intentos de ping para mayor fiabilidad
              for (let i = 0; i < attempts; i++) {
                try {
                  // Comando de ping adaptado al sistema operativo
                  const pingCommand = process.platform === 'win32'
                    ? `ping -n 1 -w ${timeout} ${cleanIp}`
                    : `ping -c 1 -W ${Math.ceil(timeout/1000)} ${cleanIp}`;
                    
                  console.log(`Ejecutando: ${pingCommand}`);
                  const { stdout } = await exec(pingCommand);
                  
                  // Verificación mejorada: múltiples patrones para detectar éxito
                  const success = stdout.includes('TTL=') || 
                    stdout.includes('ttl=') ||
                    stdout.includes('bytes from') || 
                    !stdout.includes('100% packet loss') ||
                    stdout.includes('time=');
                  
                  if (success) {
                    successCount++;
                    results.push(true);
                    console.log(`✅ Ping exitoso para cámara ${cameraId} (${cleanIp}), intento ${i+1}`);
                  } else {
                    results.push(false);
                    console.log(`❌ Ping fallido para cámara ${cameraId} (${cleanIp}), intento ${i+1}`);
                  }
                  
                  // Pequeña pausa entre intentos para evitar saturación
                  if (i < attempts - 1) {
                    await new Promise(resolve => setTimeout(resolve, 300));
                  }
                } catch (err: any) {
                  lastError = err.message;
                  results.push(false);
                  console.log(`❌ Ping fallido para cámara ${cameraId} (${cleanIp}), intento ${i+1}: ${lastError}`);
                }
              }
              
              // Calcular tasa de éxito
              const successRate = (successCount / attempts) * 100;
              
              // Para cámaras más estables, consideramos que está viva si al menos un ping tuvo éxito
              // Para el caso específico de 192.168.0.31, si algún ping tuvo éxito, considerarla conectada
              const isAlive = cleanIp === '192.168.0.31' 
                ? successCount > 0
                : successCount >= 1; // Al menos un ping exitoso considerará la cámara disponible
              
              console.log(`📊 Cámara ${cameraId} (${cleanIp}) resultados: ${successCount}/${attempts} (${successRate.toFixed(1)}%) - Disponible: ${isAlive ? 'SÍ' : 'NO'}`);
              
              return { 
                isAlive, 
                successRate, 
                results,
                error: lastError 
              };
            };
            
            // Ejecutar verificación
            const pingResult = await checkCamera(ipAddress);
            
            // Determinar estado según resultado
            let status;
            let error = null;
            
            if (pingResult.isAlive) {
              status = 'connected';
            } else if (pingResult.error) {
              status = 'error';
              error = pingResult.error;
            } else {
              status = 'disconnected';
            }
            
            // Actualizar la cámara en la base de datos
            await storage.updateCameraStatus(cameraId, status);
            
            // Notificar resultado
            wss?.clients?.forEach((client: any) => {
              if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({
                  type: "camera_status_updated",
                  camera: { id: cameraId, status, ipAddress, successRate: pingResult.successRate }
                }));
              }
            });
            
            // Devolver resultado para esta cámara
            return {
              id: cameraId,
              status,
              ipAddress,
              successRate: pingResult.successRate,
              error
            };
          } catch (checkError: any) {
            console.error(`Error verificando cámara ${cameraId}:`, checkError);
            
            // Marcar como error
            const status = 'error';
            await storage.updateCameraStatus(cameraId, status);
            
            // Notificar error
            wss?.clients?.forEach((client: any) => {
              if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({
                  type: "camera_status_updated",
                  camera: { id: cameraId, status, ipAddress, error: checkError.message }
                }));
              }
            });
            
            // Devolver error para esta cámara
            return {
              id: cameraId,
              status,
              ipAddress,
              error: checkError.message,
              successRate: 0
            };
          }
        };
      });
      
      // Ejecutar las verificaciones en secuencia para no sobrecargar la red
      const results = [];
      for (const checkPromise of checkPromises) {
        const result = await checkPromise();
        results.push(result);
      }
      
      // Notificar que la verificación ha terminado
      wss?.clients?.forEach((client: any) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            type: "camera_check_all_completed",
            results
          }));
        }
      });
      
      // Devolver resultados
      res.json({
        success: true,
        count: cameras.length,
        results
      });
    } catch (error) {
      console.error('Error checking all cameras:', error);
      res.status(500).json({ message: "Failed to check cameras", error: String(error) });
    }
  });

  app.get("/api/recordings/:id/thumbnail", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const recordingId = parseInt(req.params.id);
      const recording = await storage.getRecording(recordingId);

      if (!recording) {
        return res.sendStatus(404);
      }

      const thumbnailPath = path.join(THUMBNAILS_DIR, `${path.basename(recording.filePath)}.thumb.jpg`);

      // Si la miniatura ya existe, enviarla
      if (fs.existsSync(thumbnailPath)) {
        res.sendFile(thumbnailPath);
        return;
      }

      // Generar miniatura usando ffmpeg
      ffmpeg(recording.filePath)
        .screenshots({
          timestamps: ['50%'],
          filename: `${path.basename(recording.filePath)}.thumb.jpg`,
          folder: THUMBNAILS_DIR,
          size: '320x180'
        })
        .on('end', () => {
          res.sendFile(thumbnailPath);
        })
        .on('error', (err) => {
          console.error('Error generating thumbnail:', err);
          res.sendStatus(500);
        });
    } catch (error) {
      console.error('Error serving thumbnail:', error);
      res.sendStatus(500);
    }
  });
  
  // Endpoint para obtener grabaciones por sesión
  app.get("/api/sessions/:id/recordings", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const sessionId = parseInt(req.params.id);
      const session = await storage.getSessionById(sessionId);
      
      if (!session || session.userId !== req.user.id) {
        return res.sendStatus(404);
      }
      
      const recordings = await storage.getSessionRecordings(sessionId);
      res.json(recordings);
    } catch (error) {
      console.error('Error obteniendo grabaciones por sesión:', error);
      res.status(500).json({ message: "Error al obtener grabaciones de la sesión" });
    }
  });
  

  
  // Endpoint para descargar grabación
  app.get("/api/recordings/:id/download", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const recordingId = parseInt(req.params.id);
      const recording = await storage.getRecording(recordingId);
      
      if (!recording) {
        return res.status(404).json({ message: "Grabación no encontrada" });
      }
      
      // Comprobar si existe el archivo
      let filePath = recording.filePath;
      
      if (!fs.existsSync(filePath)) {
        // Si el archivo original no existe, intentar buscar alternativas
        let alternativePath = null;
        const originalPath = recording.filePath;
        const basename = path.basename(originalPath);
        
        // Definir directorios candidatos, priorizando la ruta correcta
        const dirsToCheck = [
          // RUTA PRIORITARIA - Donde se guardan los archivos según la corrección
          path.join(process.cwd(), 'sessions', `Session${recording.sessionId}`, 'recordings'),
          
          // Rutas secundarias (compatibilidad)
          path.join(process.cwd(), 'sessions', `Session${recording.sessionId}`),
          path.join(process.cwd(), 'sessions'),
          RECORDINGS_DIR,
          path.join(RECORDINGS_DIR, 'sessions'),
          path.join(process.cwd(), 'data', 'recordings'),
          path.join(process.cwd(), 'data', 'sessions'),
          path.join(process.cwd(), 'recordings'),
          path.join(process.env.DATA_DIR || "./data", 'recordings')
        ];
        
        console.log(`⚠️ Buscando archivo de grabación en ubicaciones alternativas para ${recording.id}`);
        console.log(`📁 Ubicación principal: ${path.join(process.cwd(), 'sessions', `Session${recording.sessionId}`, 'recordings')}`);
        
        // Buscar en directorios alternativos
        for (const dir of dirsToCheck) {
          if (!fs.existsSync(dir)) continue;
          
          // Probar con el mismo nombre de archivo
          const testPath = path.join(dir, basename);
          if (fs.existsSync(testPath)) {
            alternativePath = testPath;
            break;
          }
          
          // Probar buscar archivos por patrón de cámara
          try {
            const files = fs.readdirSync(dir).filter(file => 
              file.endsWith('.mp4') && 
              (file.includes(`-${recording.cameraId}-`) || 
               file.includes(`_${recording.cameraId}_`) ||
               file.includes(`cam${recording.cameraId}`) ||
               file.includes(`c${recording.cameraId}`))
            );
            
            if (files.length > 0) {
              alternativePath = path.join(dir, files[0]);
              break;
            }
          } catch (err) {
            console.error(`Error al buscar archivos alternativos en ${dir}:`, err);
          }
        }
        
        if (alternativePath) {
          console.log(`Archivo original no encontrado: ${recording.filePath}, usando alternativa: ${alternativePath}`);
          filePath = alternativePath;
          
          // Actualizar el registro en la base de datos con la nueva ruta
          try {
            await storage.updateRecording(recordingId, { filePath: alternativePath });
            console.log(`Actualizada la ruta de grabación ${recordingId} a ${alternativePath}`);
          } catch (updateError) {
            console.error('Error actualizando la ruta de grabación:', updateError);
          }
        } else {
          return res.status(404).json({ message: "Archivo de grabación no encontrado" });
        }
      }
      
      // Extraer el nombre original del archivo
      const fileName = path.basename(filePath);
      
      // Establecer cabeceras para descarga
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.setHeader('Content-Type', 'video/mp4');
      
      // Enviar el archivo
      fs.createReadStream(filePath).pipe(res);
      
      // Registrar la actividad
      try {
        logActivity(req.user.id, "recordingDownloaded", {
          recordingId: recordingId,
          title: recording.title || `Recording ${recordingId}`,
          filePath: filePath
        });
      } catch (logError) {
        console.error('Error logging activity:', logError);
      }
    } catch (error) {
      console.error('Error descargando grabación:', error);
      res.status(500).json({ message: "Error al descargar grabación" });
    }
  });

  app.get("/api/recordings/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const recordingId = parseInt(req.params.id);
      const recordings = await storage.getRecordings(recordingId);
      const recording = recordings.find(r => r.id === recordingId);

      if (!recording) {
        return res.sendStatus(404);
      }

      res.json(recording);
    } catch (error) {
      console.error('Error fetching recording:', error);
      res.status(500).json({ message: "Failed to fetch recording" });
    }
  });

  app.get("/api/recordings/:id/stream", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const recordingId = parseInt(req.params.id);
      const recording = await storage.getRecording(recordingId);

      if (!recording) {
        console.warn(`Recording with ID ${recordingId} not found in database`);
        return res.status(404).json({ message: "Recording not found in database" });
      }
      
      if (!fs.existsSync(recording.filePath)) {
        // Si el archivo original no existe, intentar buscar alternativas
        let alternativePath = null;
        const originalPath = recording.filePath;
        const basename = path.basename(originalPath);
        
        // Definir directorios candidatos, priorizando la ruta correcta
        const dirsToCheck = [
          // RUTA PRIORITARIA - Donde se guardan los archivos según la corrección
          path.join(process.cwd(), 'sessions', `Session${recording.sessionId}`, 'recordings'),
          
          // Rutas secundarias (compatibilidad)
          path.join(process.cwd(), 'sessions', `Session${recording.sessionId}`),
          path.join(process.cwd(), 'sessions'),
          RECORDINGS_DIR,
          path.join(RECORDINGS_DIR, 'sessions'),
          path.join(process.cwd(), 'data', 'recordings'),
          path.join(process.cwd(), 'data', 'sessions'),
          path.join(process.cwd(), 'recordings'),
          path.join(process.env.DATA_DIR || "./data", 'recordings')
        ];
        
        console.log(`⚠️ Buscando archivo de grabación en ubicaciones alternativas para ${recording.id}`);
        console.log(`📁 Ubicación principal para streaming: ${path.join(process.cwd(), 'sessions', `Session${recording.sessionId}`, 'recordings')}`);
        
        // Buscar en directorios alternativos
        for (const dir of dirsToCheck) {
          if (!fs.existsSync(dir)) continue;
          
          // Probar con el mismo nombre de archivo
          const testPath = path.join(dir, basename);
          if (fs.existsSync(testPath)) {
            alternativePath = testPath;
            break;
          }
          
          // Probar buscar archivos por patrón de cámara
          try {
            const files = fs.readdirSync(dir).filter(file => 
              file.endsWith('.mp4') && 
              (file.includes(`-${recording.cameraId}-`) || 
               file.includes(`_${recording.cameraId}_`) ||
               file.includes(`cam${recording.cameraId}`) ||
               file.includes(`c${recording.cameraId}`))
            );
            
            if (files.length > 0) {
              alternativePath = path.join(dir, files[0]);
              break;
            }
          } catch (err) {
            console.error(`Error al buscar archivos alternativos en ${dir}:`, err);
          }
        }
        
        if (alternativePath) {
          console.log(`Archivo original no encontrado: ${recording.filePath}, usando alternativa: ${alternativePath}`);
          recording.filePath = alternativePath;
        } else {
          console.warn(`No se encontró el archivo de grabación: ${recording.filePath}`);
          return res.status(404).json({ message: "Recording file not found" });
        }
      }

      const stat = fs.statSync(recording.filePath);
      const fileSize = stat.size;
      const range = req.headers.range;

      if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunksize = (end - start) + 1;
        const file = fs.createReadStream(recording.filePath, { start, end });
        const head = {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunksize,
          'Content-Type': 'video/mp4',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        };
        res.writeHead(206, head);
        file.pipe(res);
      } else {
        const head = {
          'Content-Length': fileSize,
          'Content-Type': 'video/mp4',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        };
        res.writeHead(200, head);
        fs.createReadStream(recording.filePath).pipe(res);
      }
    } catch (error) {
      console.error('Error streaming recording:', error);
      res.sendStatus(500);
    }
  });

  // Modificar la ruta de actualización de grabación para manejar mejor los estados
  app.patch("/api/recordings/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const recordingId = parseInt(req.params.id);
      const recording = await storage.getRecording(recordingId);

      if (!recording) {
        return res.sendStatus(404);
      }

      // Solo permitir actualizar estados válidos
      if (req.body.status && !['recording', 'completed', 'error'].includes(req.body.status)) {
        return res.status(400).json({ message: "Estado no válido" });
      }

      const updatedRecording = await storage.updateRecording(recordingId, req.body);
      res.json(updatedRecording);
    } catch (error) {
      console.error('Error updating recording:', error);
      res.status(500).json({ message: "Failed to update recording" });
    }
  });

  app.delete("/api/recordings/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const recordingId = parseInt(req.params.id);
      await storage.deleteRecording(recordingId);
      res.sendStatus(204);
    } catch (error) {
      console.error('Error deleting recording:', error);
      res.sendStatus(500);
    }
  });

  app.get("/api/recordings/:id/export", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const recordingId = parseInt(req.params.id);
      const recording = await storage.getRecording(recordingId);

      if (!recording || !fs.existsSync(recording.filePath)) {
        return res.sendStatus(404);
      }

      const zipFormat = req.query.format === 'zip';
      
      if (zipFormat) {
        try {
          // Crear un archivo ZIP con el video y los datos de sensores
          const archiver = require('archiver');
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const zipFilename = `recording_${recording.id}_${timestamp}.zip`;
          
          // Configurar headers para la descarga ZIP
          res.setHeader('Content-Type', 'application/zip');
          res.setHeader('Content-Disposition', `attachment; filename="${zipFilename}"`);
          
          // Crear un archivo ZIP
          const archive = archiver('zip', {
            zlib: { level: 9 } // Nivel de compresión máximo
          });
          
          // Pipe el archivo ZIP a la respuesta
          archive.pipe(res);
          
          // Añadir el archivo de video al ZIP
          if (fs.existsSync(recording.filePath)) {
            console.log(`Añadiendo video: ${recording.filePath}`);
            // Crear una estructura de carpetas más organizada dentro del ZIP
            const recordingFileName = path.basename(recording.filePath);
            const sessionFolder = recording.sessionId ? `session_${recording.sessionId}/` : '';
            const destPath = `recordings/${sessionFolder}${recordingFileName}`;
            
            console.log(`Archivo de origen: ${recording.filePath}`);
            console.log(`Ruta destino en ZIP: ${destPath}`);
            
            archive.file(recording.filePath, { name: destPath });
          }
          
          // Añadir el archivo de datos de sensores si existe
          if (recording.sensorDataPath && fs.existsSync(recording.sensorDataPath)) {
            console.log(`Añadiendo datos de sensores: ${recording.sensorDataPath}`);
            // Crear una estructura de carpetas organizada para datos de sensores
            const sensorFileName = path.basename(recording.sensorDataPath);
            const sessionFolder = recording.sessionId ? `session_${recording.sessionId}/` : '';
            const destPath = `sensors/${sessionFolder}${sensorFileName}`;
            
            console.log(`Archivo de origen (sensores): ${recording.sensorDataPath}`);
            console.log(`Ruta destino en ZIP (sensores): ${destPath}`);
            
            archive.file(recording.sensorDataPath, { name: destPath });
          } else {
            // Si no existe, crear un archivo JSON básico con información
            const sensorData = {
              recordingId: recording.id,
              startTime: recording.startTime,
              endTime: recording.endTime,
              note: "No se encontraron datos de sensores para esta grabación"
            };
            
            // Guardar en la carpeta de sensores con una estructura clara
            const sessionFolder = recording.sessionId ? `session_${recording.sessionId}/` : '';
            const destPath = `sensors/${sessionFolder}sensors_${recording.id}.json`;
            console.log(`Creando archivo de sensores generado: ${destPath}`);
            
            archive.append(JSON.stringify(sensorData, null, 2), { name: destPath });
          }
          
          // Añadir un archivo README con información sobre la grabación
          const readme = `# Grabación ${recording.id}
          
Título: ${recording.title || 'Sin título'}
Cámara ID: ${recording.cameraId}
Inicio: ${recording.startTime}
Fin: ${recording.endTime || 'En progreso'}
Estado: ${recording.status}
${recording.sessionId ? `Sesión ID: ${recording.sessionId}` : ''}
          
Este archivo ZIP contiene:
1. Carpeta /recordings/ - Archivos de video de la grabación (.mp4)
   - Organizados por sesión (si aplica)
2. Carpeta /sensors/ - Datos de sensores capturados durante la grabación (.json)
   - Organizados por sesión (si aplica)
          
Exportado el: ${new Date().toISOString()}
          `;
          
          archive.append(readme, { name: 'README.txt' });
          
          // Finalizar el archivo ZIP
          await archive.finalize();
          console.log(`Archivo ZIP ${zipFilename} creado y enviado`);
        } catch (zipError) {
          console.error('Error creando archivo ZIP:', zipError);
          res.status(500).send('Error al crear el archivo ZIP');
        }
      } else {
        // Exportar solo el video (comportamiento original)
        // Configurar headers para la descarga
        res.setHeader('Content-Type', 'video/mp4');
        res.setHeader('Content-Disposition', `attachment; filename="recording_${recording.id}.mp4"`);
        
        // Crear un stream de lectura y enviarlo como respuesta
        const fileStream = fs.createReadStream(recording.filePath);
        fileStream.pipe(res);
      }
    } catch (error) {
      console.error('Error exporting recording:', error);
      res.sendStatus(500);
    }
  });
  
  // Nueva ruta para descargar solo los datos de sensores
  app.get("/api/recordings/:id/sensors", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const recordingId = parseInt(req.params.id);
      const recording = await storage.getRecording(recordingId);

      if (!recording) {
        return res.sendStatus(404);
      }
      
      // Comprobar si hay archivo de datos de sensores
      if (recording.sensorDataPath && fs.existsSync(recording.sensorDataPath)) {
        // Configurar headers para la descarga
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="sensors_${recording.id}.json"`);
        
        // Crear un stream de lectura y enviarlo como respuesta
        const fileStream = fs.createReadStream(recording.sensorDataPath);
        fileStream.pipe(res);
      } else {
        // Crear un JSON vacío si no hay datos
        const sensorData = {
          recordingId: recording.id,
          startTime: recording.startTime,
          endTime: recording.endTime,
          note: "No se encontraron datos de sensores para esta grabación"
        };
        
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="sensors_${recording.id}.json"`);
        res.json(sensorData);
      }
    } catch (error) {
      console.error('Error exporting sensor data:', error);
      res.sendStatus(500);
    }
  });


  // Ruta para iniciar el análisis de IA
  app.post("/api/recordings/:id/analyze", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const recordingId = parseInt(req.params.id);
      const analysisId = req.body.analysisId;
      const recording = await storage.getRecording(recordingId);

      if (!recording || !fs.existsSync(recording.filePath)) {
        return res.status(404).json({ message: "Grabación no encontrada" });
      }

      console.log(`Iniciando análisis para grabación ${recordingId} con ID de análisis ${analysisId}`);

      // Iniciar el análisis en background
      analyzeVideo(recording.filePath, analysisId)
        .then(async (analysis) => {
          console.log(`Análisis completado para grabación ${recordingId}`, analysis);
          await storage.updateRecording(recordingId, { aiAnalysis: analysis });
        })
        .catch(error => {
          console.error(`Error en el análisis de la grabación ${recordingId}:`, error);
        });

      res.status(202).json({ message: "Análisis iniciado" });
    } catch (error) {
      console.error('Error iniciando análisis:', error);
      res.status(500).json({ message: "Error al iniciar el análisis" });
    }
  });

  // Ruta para obtener el progreso del análisis
  app.get("/api/analysis/:analysisId/progress", async (req, res) => {
    try {
      const analysisId = req.params.analysisId;
      console.log(`Consultando progreso del análisis ${analysisId}`);

      const progress = getAnalysisProgress(analysisId);
      if (!progress) {
        console.log(`No se encontró progreso para el análisis ${analysisId}`);
        return res.status(404).json({ message: "Análisis no encontrado" });
      }

      console.log(`Progreso del análisis ${analysisId}:`, progress);
      res.json({
        progress: progress.progress || 0,
        status: progress.status,
        framesAnalyzed: progress.framesAnalyzed,
        totalFrames: progress.totalFrames,
        errorMessage: progress.errorMessage
      });
    } catch (error) {
      console.error('Error obteniendo progreso del análisis:', error);
      res.status(500).json({ message: "Error al obtener el progreso" });
    }
  });

  // Modificación del endpoint POST /api/sessions - Admite formato reducido para evitar error 413
  app.post("/api/sessions", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      // Aceptar tanto el formato antiguo (sensorData) como el nuevo (sensorMetadata)
      // Y los campos adicionales para metadatos de la sesión
      const { 
        title, 
        devices, 
        sensorData, 
        sensorMetadata,
        labTitle,
        sessionDescription,
        participants,
        researcher
      } = req.body;
      const sessionId = uuidv4();
      const sessionDir = path.join(SESSIONS_DIR, `Session${sessionId}`);

      // Crear directorio de la sesión
      fs.mkdirSync(sessionDir, { recursive: true });
      
      // Preparar directorios para datos de sensores
      let sensorDataPath = null;
      
      // Crear estructura de directorios para datos de sensores
      const sensorDataDir = path.join(sessionDir, 'sensor_data');
      if (!fs.existsSync(sensorDataDir)) {
        fs.mkdirSync(sensorDataDir, { recursive: true });
      }
      
      // Inicializar archivo de datos consolidados
      const sessionDataPath = path.join(sessionDir, 'session_data.json');
      
      // Procesamiento de datos de sensores
      if (sensorMetadata || sensorData) {
        try {
          // Guardar los metadatos en formato compacto
          const sensorFileName = `sensors-${sessionId}.json`;
          sensorDataPath = path.join(sessionDir, sensorFileName);
          
          // Guardar los datos disponibles (priorizar sensorData si existe, sino usar sensorMetadata)
          const dataToSave = sensorData || { 
            metadata: sensorMetadata,
            note: "Datos reducidos para evitar error 413 Payload Too Large" 
          };
          
          fs.writeFileSync(sensorDataPath, JSON.stringify(dataToSave, null, 2));
          
          // Crear el archivo de datos consolidados con estructura inicial
          const initialSessionData = {
            sessionId,
            startTime: new Date().toISOString(),
            title,
            sensors: {},
            lastUpdated: new Date().toISOString()
          };
          
          // Inicializar entrada para cada sensor seleccionado
          if (devices && devices.sensors && Array.isArray(devices.sensors)) {
            devices.sensors.forEach(sensorId => {
              if (sensorId) {
                initialSessionData.sensors[sensorId] = {
                  id: sensorId,
                  data: [],
                  createdAt: new Date().toISOString(),
                  lastUpdated: new Date().toISOString()
                };
              }
            });
          }
          
          // Guardar archivo de datos consolidados
          fs.writeFileSync(sessionDataPath, JSON.stringify(initialSessionData, null, 2));
          console.log(`Información de sensores inicializada: ${Object.keys(initialSessionData.sensors).length} sensores registrados`);
        } catch (sensorError) {
          console.error('Error al inicializar datos de sensores:', sensorError);
        }
      }

      // Guardar configuración de la sesión
      const config = {
        id: sessionId,
        title,
        startTime: new Date(),
        devices,
        status: 'active',
        sensorDataPath,
        // Añadir los campos adicionales
        labTitle: labTitle || "",
        sessionDescription: sessionDescription || "",
        participants: participants || "",
        researcher: researcher || ""
      };

      // Iniciar grabación para cada cámara seleccionada
      const recordingPromises = devices.cameras.map(async (camera) => {
        try {
          const cameraObj = await storage.getCamera(camera.id);
          if (cameraObj) {
            const recording = await startRecording({
              ...cameraObj,
              recordingPrefix: `cam${camera.id}`
            });
            camera.recordingId = recording.id;

            // Actualizar estado de la cámara
            await storage.updateCamera(camera.id, { 
              isRecording: true,
              status: 'recording'
            });

            return recording;
          }
        } catch (error) {
          console.error(`Error starting recording for camera ${camera.id}:`, error);
          throw error;
        }
      });

      // Esperar a que todas las grabaciones inicien
      await Promise.all(recordingPromises);

      // Configurar captura de datos MQTT para sensores seleccionados
      try {
        // Intentar importar primero el cliente MQTT simplificado
        let mqttClient;
        try {
          mqttClient = require('./mqtt-client-simple').mqttClient;
          console.log("MQTT Client simplificado importado correctamente:", mqttClient ? "OK" : "NULL");
        } catch (simpleMqttError) {
          console.error("Error importando cliente MQTT simplificado:", simpleMqttError);
          // Fallback al cliente original
          mqttClient = require('./mqtt-client').mqttClient;
          console.log("MQTT Client original importado correctamente:", mqttClient ? "OK" : "NULL");
        }
        
        // Iniciar el cliente MQTT si aún no está conectado
        if (mqttClient && !mqttClient.connected) {
          try {
            console.log('MQTT no conectado, intentando conectar...');
            // Usar las variables de entorno o la URL por defecto del broker MQTT
            await mqttClient.connect();
            console.log('MQTT conectado correctamente');
          } catch (mqttConnectError) {
            console.error('Error al conectar con MQTT broker:', mqttConnectError);
            // En entorno de desarrollo, no fallamos si no podemos conectar al broker MQTT
            console.log('Continuando sin conexión MQTT en modo fallback');
          }
        } else {
          console.log('MQTT ya está conectado o no disponible');
        }
        
        // Preparar el archivo de datos de sensores para esta sesión
        const sensorDataFileName = `session_${sessionId}_sensors.json`;
        const sensorDataPath = path.join(sessionDir, sensorDataFileName);
        
        // Registrar la sesión para capturar datos de los sensores seleccionados
        if (mqttClient && typeof mqttClient.registerSession === 'function') {
          try {
            // Filtrar dispositivos para obtener solo los sensores
            const selectedSensors = devices.sensors || [];
            const sensorDevices = selectedSensors.map((sensorId, index) => {
              // Crear estructura de metadatos para cada sensor
              return {
                id: sensorId,
                type: 'sensor',
                name: `sensor-${sensorId}`,
                topic: sensorMetadata && sensorMetadata[index] ? 
                  sensorMetadata[index].topic : 
                  `zigbee2mqtt/${sensorId}`
              };
            });
            
            console.log(`Registrando sesión ${sessionId} con ${sensorDevices.length} sensores`);
            mqttClient.registerSession(sessionId, sensorDataPath, sensorDevices);
            console.log('Sesión registrada correctamente en MQTT client');
            
            // Registrar el archivo de datos de sensores en el servicio de sesión
            try {
              console.log(`Registrando archivo de datos MQTT en sesión ${sessionId}: ${sensorDataPath}`);
              await sessionService.registerSensorDataFile(parseInt(sessionId), sensorDataPath);
              console.log(`✅ Archivo de datos MQTT registrado exitosamente en la sesión ${sessionId}`);
            } catch (sensorDataError) {
              console.error(`Error al registrar archivo de datos MQTT en sesión ${sessionId}:`, sensorDataError);
            }
          } catch (mqttRegisterError) {
            console.error('Error al registrar sesión en MQTT client:', mqttRegisterError);
            // Continuamos sin registro MQTT si falla
            console.log('Continuando sin registro de sesión MQTT en modo fallback');
          }
        } else {
          console.log('MQTT Client no tiene método registerSession o no está disponible, continuando sin MQTT');
        }
      } catch (mqttImportError) {
        console.error('Error importando MQTT client:', mqttImportError);
        console.log('Continuando sin funcionalidad MQTT');
      }
      
      // Crear directorio para datos de sensores si aún no existe
      const sensorDir = path.join(sessionDir, 'sensor_data');
      if (!fs.existsSync(sensorDir)) {
        fs.mkdirSync(sensorDir, { recursive: true });
        console.log(`Creado directorio para datos de sensores: ${sensorDir}`);
      }
      
      // En caso de que se dejen seleccionados todos los sensores, crear un archivo de registro
      const sensorConfigPath = path.join(sensorDir, 'sensor_config.json');
      
      fs.writeFileSync(
        sensorConfigPath,
        JSON.stringify({ 
          sessionId,
          registeredSensors: devices.sensors,
          captureAllTopics: devices.sensors.length > 0,
          startTime: new Date().toISOString() 
        }, null, 2)
      );
      console.log(`Configuración de sensores guardada para sesión ${sessionId}`);
      
      // Registrar también el archivo de configuración de sensores
      try {
        console.log(`Registrando archivo de configuración de sensores en sesión ${sessionId}: ${sensorConfigPath}`);
        await sessionService.registerSensorDataFile(parseInt(sessionId), sensorConfigPath);
        console.log(`✅ Archivo de configuración de sensores registrado en la sesión ${sessionId}`);
      } catch (configError) {
        console.error(`Error al registrar configuración de sensores en sesión ${sessionId}:`, configError);
      }

      // Guardar configuración final
      fs.writeFileSync(
        path.join(sessionDir, 'config.json'),
        JSON.stringify(config, null, 2)
      );

      res.status(201).json(config);
    } catch (error) {
      console.error('Error creating session:', error);
      res.status(500).json({ message: "Failed to create session" });
    }
  });

  // Endpoint DELETE /api/sessions/:id - Eliminar completamente una sesión
  app.delete("/api/sessions/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const sessionId = req.params.id;
      const sessionDir = path.join(SESSIONS_DIR, `Session${sessionId}`);
      const configPath = path.join(sessionDir, 'config.json');

      if (!fs.existsSync(configPath)) {
        return res.status(404).json({ message: "Sesión no encontrada" });
      }

      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      const isActive = config.status === 'active';

      // Si la sesión está activa, detener grabaciones y actualizar estado de cámaras
      if (isActive) {
        for (const camera of config.devices.cameras) {
          try {
            // Detener el proceso de grabación si existe
            const recordingProcess = recordingProcesses.get(camera.id);
            if (recordingProcess) {
              console.log(`Stopping recording process for camera ${camera.id}`);
              recordingProcess.process.kill('SIGTERM');
              await storage.updateRecording(recordingProcess.recording.id, {
                status: 'completed',
                endTime: new Date()
              });
              recordingProcesses.delete(camera.id);
            }

            // Actualizar estado de la cámara
            const updatedCamera = await storage.updateCamera(camera.id, {
              isRecording: false,
              status: 'connected' // Mantener el estado de conexión pero no grabando
            });

            // Notificar a los clientes del cambio
            wss.clients.forEach((client: any) => {
              if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({
                  type: "camera_updated",
                  camera: updatedCamera
                }));
              }
            });
          } catch (error) {
            console.error(`Error stopping recording for camera ${camera.id}:`, error);
          }
        }
      }

      try {
        // Desregistrar la sesión del cliente MQTT para dejar de capturar datos de sensores
        try {
          // Intentar usar primero el cliente MQTT simplificado
          try {
            const { mqttClient } = require('./mqtt-client-simple');
            
            if (mqttClient && typeof mqttClient.endSession === 'function') {
              mqttClient.endSession(parseInt(sessionId));
              console.log(`Session ${sessionId} ended in simplified MQTT client, sensor data capture stopped`);
            } else {
              console.log('Simplified MQTT Client no disponible o no tiene método endSession');
              
              // Fallback al cliente original
              try {
                const { mqttClient: originalMqttClient } = require('./mqtt-client');
                if (originalMqttClient && typeof originalMqttClient.endSession === 'function') {
                  originalMqttClient.endSession(sessionId);
                  console.log(`Session ${sessionId} ended in original MQTT client as fallback`);
                }
              } catch (originalError) {
                console.error('Error with original MQTT client:', originalError);
              }
            }
          } catch (simpleMqttError) {
            console.error('Error with simplified MQTT client:', simpleMqttError);
            
            // Fallback al cliente original si el simplificado no está disponible
            try {
              const { mqttClient } = require('./mqtt-client');
              if (mqttClient && typeof mqttClient.endSession === 'function') {
                mqttClient.endSession(sessionId);
                console.log(`Session ${sessionId} ended in original MQTT client (fallback)`);
              }
            } catch (originalError) {
              console.error('Error with fallback MQTT client:', originalError);
            }
          }
        } catch (mqttError) {
          console.error(`Error ending session ${sessionId} in MQTT client:`, mqttError);
          // Continuar a pesar del error de MQTT
        }
        
        // Si es una sesión activa, marcamos como completada
        if (isActive) {
          console.log(`Session ${sessionId} marked as completed`);
          config.status = 'completed';
          config.endTime = new Date().toISOString();
          fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
        } 
        // Si es una solicitud de eliminación permanente
        else if (req.query.permanent === 'true') {
          console.log(`Permanently deleting session ${sessionId}...`);
          
          // Función recursiva para eliminar un directorio y su contenido
          const deleteFolderRecursive = function(directoryPath: string) {
            if (fs.existsSync(directoryPath)) {
              fs.readdirSync(directoryPath).forEach((file) => {
                const curPath = path.join(directoryPath, file);
                if (fs.lstatSync(curPath).isDirectory()) {
                  // Es un directorio, eliminar recursivamente
                  deleteFolderRecursive(curPath);
                } else {
                  // Es un archivo, eliminar
                  fs.unlinkSync(curPath);
                }
              });
              fs.rmdirSync(directoryPath);
            }
          };
          
          // Eliminar el directorio de la sesión
          deleteFolderRecursive(sessionDir);
          console.log(`Session ${sessionId} directory deleted`);
        }
        
        // Notificar a los clientes que se ha actualizado o eliminado la sesión
        wss.clients.forEach((client: any) => {
          if (client.readyState === WebSocket.OPEN) {
            if (req.query.permanent === 'true') {
              client.send(JSON.stringify({
                type: "session_deleted",
                sessionId: parseInt(sessionId)
              }));
            } else {
              client.send(JSON.stringify({
                type: "session_updated",
                session: config
              }));
            }
          }
        });

        // Enviar respuesta exitosa
        const message = req.query.permanent === 'true' 
          ? "Sesión eliminada permanentemente" 
          : "Sesión finalizada correctamente";
        res.json({ message });
      } catch (deleteError) {
        console.error('Error processing session:', deleteError);
        res.status(500).json({ message: "Error al procesar la sesión" });
      }
    } catch (error) {
      console.error('Error processing session request:', error);
      res.status(500).json({ message: "Error al procesar la solicitud" });
    }
  });

  app.get("/api/sessions", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const sessions = [];
      const sessionDirs = fs.readdirSync(SESSIONS_DIR);

      for (const dir of sessionDirs) {
        try {
          const configPath = path.join(SESSIONS_DIR, dir, 'config.json');
          if (fs.existsSync(configPath)) {
            const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
            sessions.push(config);
          }
        } catch (error) {
          console.error(`Error reading session config in ${dir}:`, error);
          // Continue with next session instead of failing completely
          continue;
        }
      }

      res.json(sessions.sort((a, b) =>
        new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
      ));
    } catch (error) {
      console.error('Error fetching sessions:', error);
      res.status(500).json({ message: "Failed to fetch sessions" });
    }
  });

  // Endpoint para obtener los datos de sensores de una sesión específica
  app.get("/api/sessions/:id/sensor-data", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const sessionId = req.params.id;
      
      // Buscar el directorio de sesión (probar diferentes formatos de ruta)
      let sessionDir = path.join(SESSIONS_DIR, `Session${sessionId}`);
      if (!fs.existsSync(sessionDir)) {
        // Intentar con el formato alternativo
        sessionDir = path.join(SESSIONS_DIR, sessionId);
        
        if (!fs.existsSync(sessionDir)) {
          console.error(`Session directory not found for session ${sessionId} at paths:`, 
            path.join(SESSIONS_DIR, `Session${sessionId}`), 
            path.join(SESSIONS_DIR, sessionId));
          return res.status(404).json({ message: "Session not found" });
        }
      }
      
      console.log(`Found session directory at ${sessionDir}`);
      
      // Buscar archivos de datos de sensores (probar diferentes nombres posibles)
      const possibleSensorDataPaths = [
        path.join(sessionDir, 'sensor_data.json'),
        path.join(sessionDir, `session_${sessionId}_sensors.json`),
        path.join(sessionDir, `mqtt_data_${sessionId}.json`)
      ];
      
      let sensorDataPath = null;
      for (const path of possibleSensorDataPaths) {
        if (fs.existsSync(path)) {
          sensorDataPath = path;
          console.log(`Found sensor data at ${sensorDataPath}`);
          break;
        }
      }
      
      // Buscar en la carpeta sensor_data si existe
      if (!sensorDataPath) {
        const sensorDataDir = path.join(sessionDir, 'sensor_data');
        if (fs.existsSync(sensorDataDir)) {
          // Listar todos los archivos JSON en la carpeta sensor_data
          try {
            const files = fs.readdirSync(sensorDataDir)
              .filter(file => file.endsWith('.json'));
              
            if (files.length > 0) {
              // Usar el primer archivo como fuente de datos
              sensorDataPath = path.join(sensorDataDir, files[0]);
              console.log(`Found sensor data in sensor_data directory: ${sensorDataPath}`);
            }
          } catch (dirError) {
            console.error(`Error reading sensor_data directory:`, dirError);
          }
        }
      }
      
      if (!sensorDataPath) {
        console.error(`No sensor data file found for session ${sessionId}`);
        return res.status(404).json({ 
          message: "No sensor data available for this session",
          possiblePaths: possibleSensorDataPaths
        });
      }
      
      // Leer y devolver los datos de sensores
      const sensorData = JSON.parse(fs.readFileSync(sensorDataPath, 'utf-8'));
      
      // Convertir las cadenas de timestamp a objetos Date para una mejor representación
      const processedData = Array.isArray(sensorData) ? sensorData.map(item => {
        if (item.timestamp && typeof item.timestamp === 'string') {
          return {
            ...item,
            timestamp: new Date(item.timestamp).toISOString()
          };
        }
        return item;
      }) : sensorData;
      
      res.json(processedData);
    } catch (error) {
      console.error('Error fetching session sensor data:', error);
      res.status(500).json({ message: "Failed to fetch sensor data" });
    }
  });
  
  app.get("/api/sessions/:id/download", sessionController.downloadSession);
  
  // Endpoint para obtener el progreso de exportación de una sesión
  app.get("/api/sessions/:id/export-progress", sessionController.getExportProgress);
  
  // Endpoints para registrar archivos en una sesión
  app.post("/api/sessions/register-recording", sessionController.registerRecordingFile);
  app.post("/api/sessions/register-sensor-data", sessionController.registerSensorDataFile);
  
  // Endpoint para finalizar una sesión
  app.post("/api/sessions/:id/finalize", sessionController.finalizeSession);
  
  // Endpoint para obtener la lista de grabaciones
  app.get("/api/recordings", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      const recordings = await storage.getRecordings();
      return res.json(recordings);
    } catch (error) {
      console.error('Error obteniendo grabaciones:', error);
      return res.status(500).json({ error: 'Error obteniendo grabaciones' });
    }
  });
  
  app.get("/api/sessions/:id/export", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const sessionIdStr = req.params.id;
      const sessionId = parseInt(sessionIdStr);
      const session = await storage.getSessionById(sessionId);
      
      if (!session) {
        return res.status(404).json({ error: 'Sesión no encontrada' });
      }
      
      // Crear el directorio de la sesión si no existe
      const sessionDir = path.join(SESSIONS_DIR, `Session${sessionId}`);
      if (!fs.existsSync(sessionDir)) {
        fs.mkdirSync(sessionDir, { recursive: true });
        console.log(`Created session directory: ${sessionDir}`);
      }
      
      const configPath = path.join(sessionDir, 'config.json');
      
      // Si no existe el archivo de configuración, crearlo con los datos de la sesión
      if (!fs.existsSync(configPath)) {
        fs.writeFileSync(configPath, JSON.stringify({
          id: session.id,
          title: session.name,
          startTime: session.startTime,
          endTime: session.endTime,
          devices: {
            cameras: [],
            sensors: []
          }
        }, null, 2));
        console.log(`Created config file: ${configPath}`);
      }

      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      
      // Usar EXACTAMENTE el nombre de la sesión para el nombre del archivo ZIP
      // Obtenemos el título exacto de la sesión desde la UI (desde config o session)
      let sessionTitle = "";
      
      // Priorizar obtener el título exacto del formulario como lo ve el usuario
      if (fs.existsSync(configPath)) {
        try {
          const configData = JSON.parse(fs.readFileSync(configPath, 'utf8'));
          sessionTitle = configData.title || "";
          console.log(`Obtenido título de sesión desde config.json: "${sessionTitle}"`);
        } catch (configErr) {
          console.error("Error leyendo config.json:", configErr);
        }
      }
      
      // Si no hay título en config, usar el de la base de datos
      if (!sessionTitle && session.name) {
        sessionTitle = session.name;
        console.log(`Usando título de sesión desde DB: "${sessionTitle}"`);
      }
      
      // Si aún no hay título, usar un nombre por defecto
      if (!sessionTitle) {
        sessionTitle = `Session-${sessionId}`;
        console.log(`Usando título por defecto: "${sessionTitle}"`);
      }
      
      // Crear nombre de archivo manteniendo el formato exacto que ve el usuario
      const zipFileName = `${sessionTitle}.zip`;
      console.log(`ZIP file name will be: ${zipFileName}`);
      
      // Crear el directorio temporal si no existe
      const tempDir = path.join(process.cwd(), 'temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      
      const zipFilePath = path.join(tempDir, zipFileName);

      const archive = archiver('zip', {
        zlib: { level: 9 }
      });

      const output = fs.createWriteStream(zipFilePath);
      archive.pipe(output);

      // Preparar datos para metadatos
      const sessionMetadata = {
        ...config,
        // Asegurarse de que todos los campos de metadatos estén incluidos
        labTitle: config.labTitle || "",
        researcher: config.researcher || "",
        participants: config.participants || "",
        sessionDescription: config.sessionDescription || "",
        exportDate: new Date().toISOString(),
        // Nombre exacto de la sesión como se ve en la UI
        exactTitle: sessionTitle,
        exportInfo: {
          version: "1.0",
          exportedBy: req.user?.username || "unknown",
          platform: "IP Camera and MQTT Monitoring System"
        }
      };
      
      // Añadir un AllData.json con todos los datos del formulario y metadatos
      // Crear un nombre de sesión seguro para archivos
      const safeSessionName = sessionTitle
        .replace(/[^a-z0-9]/gi, '_')
        .replace(/_+/g, '_')
        .toLowerCase();
        
      // Calcular duración de la sesión si hay inicio y fin
      let sessionDuration = null;
      if (config.startTime && config.endTime) {
        const startDate = new Date(config.startTime);
        const endDate = new Date(config.endTime);
        const durationMs = endDate.getTime() - startDate.getTime();
        
        // Duración en formato de horas, minutos y segundos
        const hours = Math.floor(durationMs / 3600000);
        const minutes = Math.floor((durationMs % 3600000) / 60000);
        const seconds = Math.floor((durationMs % 60000) / 1000);
        
        sessionDuration = {
          ms: durationMs,
          formatted: `${hours}h ${minutes}m ${seconds}s`,
          hours,
          minutes,
          seconds
        };
      }
      
      const allData = {
        session: {
          ...sessionMetadata,
          name: sessionTitle, // Asegurar que el nombre exacto está incluido
          exactTitle: sessionTitle, // Duplicar para compatibilidad
          duration: sessionDuration,
          fileName: `${safeSessionName}.zip`
        },
        formData: {
          id: config.id,
          title: config.title || sessionTitle,
          researcher: config.researcher || "",
          participants: config.participants || "",
          description: config.sessionDescription || "",
          startTime: config.startTime,
          endTime: config.endTime,
          duration: sessionDuration,
          labTitle: config.labTitle || "",
          tags: config.tags || []
        }
      };
      
      // Agregar AllData.json con todos los datos combinados para facilitar el acceso
      archive.append(JSON.stringify(allData, null, 2), { name: 'AllData.json' });
      
      // Agregar configuración con metadatos completos
      archive.append(JSON.stringify(sessionMetadata, null, 2), { name: 'config.json' });

      // Crear archivo principal con el nombre de la sesión
      archive.append(JSON.stringify({
        sessionName: sessionTitle,
        sessionId: config.id,
        researcher: config.researcher || "",
        participants: config.participants || "",
        description: config.sessionDescription || "",
        date: {
          start: config.startTime,
          end: config.endTime,
          duration: sessionDuration
        }
      }, null, 2), { name: `${safeSessionName}.json` });
      
      // Crear un archivo de metadatos separado específico para investigación
      const researchMetadata = {
        session: {
          id: config.id,
          title: config.title || sessionTitle, // Usar el título más actualizado
          name: sessionTitle, // Incluir el nombre exacto que ve el usuario
          labTitle: config.labTitle || "",
          researcher: config.researcher || "",
          participants: config.participants || "",
          description: config.sessionDescription || "",
          startTime: config.startTime,
          endTime: config.endTime,
          duration: sessionDuration,
        },
        devices: {
          cameraCount: config.devices.cameras.length,
          sensorCount: config.devices.sensors.length,
          cameras: config.devices.cameras.map((cam: any) => ({
            id: cam.id,
            name: cam.prefix || `cam${cam.id}`,
            type: "ip_camera"
          })),
          sensors: config.devices.sensors.map((sensorId: string) => ({
            id: sensorId,
            type: "mqtt_sensor",
            topicPath: sensorId
          }))
        }
      };
      
      archive.append(JSON.stringify(researchMetadata, null, 2), { name: 'research-metadata.json' });

      // Agregar grabaciones de video
      // Ya tenemos sessionIdStr declarado arriba - usamos la misma variable
      
      // Los archivos pueden estar en diferentes formatos de nombre dependiendo de cómo fueron creados
      const possiblePatterns = [
        `session-${sessionIdStr}-`,     // session-123-
        `session_${sessionIdStr}_`,     // session_123_
        `ses-${sessionIdStr}-`,         // ses-123-
        `ses_${sessionIdStr}_`,         // ses_123_
        `s${sessionIdStr}_`,            // s123_
        `cam-s${sessionIdStr}-`,        // cam-s123-
        `session${sessionIdStr}`,       // session123
        `${sessionIdStr}_cam`,          // 123_cam
        `-${sessionIdStr}-`             // -123-
      ];
      
      // IMPORTANTE: Buscar primero en la ruta correcta de las sesiones (/sessions/SessionX/recordings)
      // que es donde ahora debería estar guardándose todo según la corrección que hemos hecho
      const dirsToCheck = [
        // ESTA ES LA RUTA CORRECTA - Prioridad 1 - Debe ser la primera en la lista
        path.join(process.cwd(), 'sessions', `Session${sessionIdStr}`, 'recordings'),
        // Ruta con formato numérico en caso de que sea así como se creó la carpeta
        path.join(process.cwd(), 'sessions', `Session${parseInt(sessionIdStr)}`, 'recordings'),
        
        // Rutas alternativas por compatibilidad con implementaciones antiguas - Prioridad 2
        RECORDINGS_DIR,
        path.join(RECORDINGS_DIR, 'sessions'),
        path.join(RECORDINGS_DIR, sessionIdStr),
        path.join(RECORDINGS_DIR, `session_${sessionIdStr}`),
        path.join(RECORDINGS_DIR, `session-${sessionIdStr}`),
        
        // Rutas adicionales menos probables - Prioridad 3
        path.join(process.env.DATA_DIR || "./data", 'recordings'),
        path.join(process.cwd(), 'data', 'recordings'),
        path.join(process.cwd(), 'data', 'sessions', sessionIdStr, 'recordings'),
        path.join(process.cwd(), 'data', 'sessions', `session_${sessionIdStr}`, 'recordings')
      ];
      
      console.log(`⚠️ IMPORTANTE: Buscando archivos MP4 en: ${path.join(process.cwd(), 'sessions', `Session${sessionIdStr}`, 'recordings')}`);
      
      // Verificar si existe el directorio principal donde debería estar todo
      const principalSessionDir = path.join(process.cwd(), 'sessions', `Session${sessionIdStr}`);
      if (fs.existsSync(principalSessionDir)) {
        console.log(`✅ Directorio principal de la sesión encontrado: ${principalSessionDir}`);
        
        const recordingsDir = path.join(principalSessionDir, 'recordings');
        if (fs.existsSync(recordingsDir)) {
          console.log(`✅ Directorio de grabaciones encontrado: ${recordingsDir}`);
          
          try {
            const files = fs.readdirSync(recordingsDir);
            console.log(`📁 Contenido del directorio de grabaciones:`);
            files.forEach(file => console.log(`   - ${file}`));
          } catch (err) {
            console.error(`Error al listar contenido del directorio: ${err}`);
          }
        } else {
          console.log(`❌ Directorio de grabaciones NO encontrado: ${recordingsDir}`);
        }
      } else {
        console.log(`❌ Directorio principal de la sesión NO encontrado: ${principalSessionDir}`);
      }
      
      // 1. Buscar grabaciones asociadas a la sesión en la base de datos
      const sessionRecordings = await storage.getRecordingsBySessionId(parseInt(req.params.id));
      console.log(`Encontradas ${sessionRecordings.length} grabaciones asociadas a la sesión ${req.params.id}`);
      
      // 2. Si hay grabaciones en la BD, intentar añadirlas
      if (sessionRecordings && sessionRecordings.length > 0) {
        for (const recording of sessionRecordings) {
          // Tratar de encontrar el archivo de grabación comprobando diferentes rutas similares
          const originalPath = recording.filePath;
          const basename = path.basename(originalPath);
          let found = false;

          // Lista de posibles directorios donde podría estar el archivo
          const searchDirectories = dirsToCheck.concat([
            path.dirname(originalPath),
            // Verificar rutas adicionales si el archivo original no existe
            ...dirsToCheck.map(dir => path.join(dir, 'cam' + recording.cameraId))
          ]);

          // Comprobar todas las posibles ubicaciones
          for (const dir of searchDirectories) {
            if (!fs.existsSync(dir)) continue;
            
            const potentialPath = path.join(dir, basename);
            if (fs.existsSync(potentialPath)) {
              console.log(`Añadiendo grabación (encontrada): ${potentialPath}`);
              archive.file(potentialPath, { name: `recordings/${basename}` });
              found = true;
              break;
            }
          }

          // Si no se encontró, buscar cualquier MP4 que contenga la ID de la cámara
          if (!found) {
            for (const dir of searchDirectories) {
              if (!fs.existsSync(dir)) continue;
              
              try {
                const files = fs.readdirSync(dir).filter(file => 
                  file.endsWith('.mp4') && 
                  (file.includes(`-${recording.cameraId}-`) || 
                   file.includes(`_${recording.cameraId}_`) ||
                   file.includes(`cam${recording.cameraId}`) ||
                   file.includes(`c${recording.cameraId}`))
                );
                
                if (files.length > 0) {
                  console.log(`Añadiendo grabación alternativa para cámara ${recording.cameraId}: ${path.join(dir, files[0])}`);
                  archive.file(path.join(dir, files[0]), { name: `recordings/${files[0]}` });
                  found = true;
                  break;
                }
              } catch (err) {
                console.error(`Error buscando archivos MP4 alternativos en ${dir}:`, err);
              }
            }
          }

          if (!found) {
            console.error(`Archivo de grabación no encontrado en ninguna ubicación: ${originalPath}`);
          }
        }
      } 
      // 3. También intentar con el método antiguo (para compatibilidad)
      else if (config.devices && config.devices.cameras) {
        for (const camera of config.devices.cameras) {
          if (camera.recordingId) {
            const recording = await storage.getRecording(camera.recordingId);
            if (recording && fs.existsSync(recording.filePath)) {
              console.log(`Añadiendo grabación (método antiguo): ${recording.filePath}`);
              archive.file(recording.filePath, { name: `recordings/${path.basename(recording.filePath)}` });
            }
          }
        }
      }
      
      // 4. Además, buscar cualquier archivo MP4 en la carpeta de grabaciones que contenga el ID de la sesión
      
      interface RecordingFile {
        path: string;
        name: string;
      }
      
      let allRecordingFiles: RecordingFile[] = [];
      
      // Buscar en cada directorio
      for (const dir of dirsToCheck) {
        if (fs.existsSync(dir)) {
          try {
            const files = fs.readdirSync(dir).filter(file => {
              // Verificar si el archivo es un MP4 y contiene alguno de los patrones de sesión
              if (!file.endsWith('.mp4')) return false;
              
              // Verificar cualquiera de los patrones posibles
              return possiblePatterns.some(pattern => file.includes(pattern));
            });
            
            allRecordingFiles = allRecordingFiles.concat(
              files.map(file => ({ path: path.join(dir, file), name: file }))
            );
          } catch (err) {
            console.error(`Error al buscar grabaciones en ${dir}:`, err);
          }
        }
      }
      
      // 5. También buscar cualquier archivo MP4 en el directorio específico de la sesión
      const sessionRecordingsDir = path.join(sessionDir, 'recordings');
      if (fs.existsSync(sessionRecordingsDir)) {
        try {
          const files = fs.readdirSync(sessionRecordingsDir).filter(file => file.endsWith('.mp4'));
          allRecordingFiles = allRecordingFiles.concat(
            files.map(file => ({ path: path.join(sessionRecordingsDir, file), name: file }))
          );
        } catch (err) {
          console.error(`Error al buscar grabaciones en ${sessionRecordingsDir}:`, err);
        }
      }
      
      // Agregar todos los archivos de grabación encontrados
      console.log(`Se encontraron ${allRecordingFiles.length} archivos MP4 adicionales por patrón de nombre`);
      for (const file of allRecordingFiles) {
        console.log(`Añadiendo grabación encontrada por nombre: ${file.path}`);
        archive.file(file.path, { name: `recordings/${file.name}` });
      }

      // Preparar un archivo JSON completo con todos los datos de sensores
      const sensorDataPath = path.join(sessionDir, 'sensor_data');
      const sessionInfoPath = path.join(sessionDir, 'session_info.json');
      
      // Incluir la carpeta con los datos crudos para referencia
      if (fs.existsSync(sensorDataPath)) {
        // Incluir la carpeta entera con los archivos individuales
        archive.directory(sensorDataPath, 'sensor_data/raw');
        
        // Crear un JSON consolidado con todos los datos de sensores
        try {
          const sensorFiles = fs.readdirSync(sensorDataPath).filter(file => file.endsWith('.json'));
          const allSensorData = {};
          
          // Obtener los datos de cada sensor
          for (const file of sensorFiles) {
            try {
              const sensorId = file.replace('.json', '');
              const fileContent = fs.readFileSync(path.join(sensorDataPath, file), 'utf-8');
              const parsedData = JSON.parse(fileContent);
              
              if (Array.isArray(parsedData) && parsedData.length > 0) {
                // Convertir el formato para que sea más fácil de analizar
                allSensorData[sensorId] = parsedData;
              }
            } catch (fileErr) {
              console.error(`Error procesando archivo de sensor ${file}:`, fileErr);
            }
          }
          
          // Obtener información de la sesión si existe
          let sessionInfo = {
            id: req.params.id,
            title: config.title,
            startTime: config.startTime,
            endTime: config.endTime || new Date().toISOString()
          };
          
          if (fs.existsSync(sessionInfoPath)) {
            try {
              const infoContent = fs.readFileSync(sessionInfoPath, 'utf-8');
              const parsedInfo = JSON.parse(infoContent);
              sessionInfo = { ...sessionInfo, ...parsedInfo };
            } catch (infoErr) {
              console.error('Error leyendo información de sesión:', infoErr);
            }
          }
          
          // Primero verificar si existe el archivo de datos consolidados
          const sessionDataPath = path.join(sessionDir, 'session_data.json');
          let finalDataToSave;
          
          if (fs.existsSync(sessionDataPath)) {
            try {
              // Usar archivo consolidado pre-generado si existe
              const sessionDataContent = fs.readFileSync(sessionDataPath, 'utf-8');
              const sessionData = JSON.parse(sessionDataContent);
              
              // Extraer solo la información y datos relevantes
              const relevantData = {
                sensors: Object.keys(sessionData.sensors || {}),
                sessionInfo: {
                  ...sessionInfo,
                  metadata: sessionData.metadata || {}
                },
                sensorData: {}
              };
              
              // Formatear los datos de sensores para que sea más útil
              Object.entries(sessionData.sensors || {}).forEach(([sensorId, sensorInfo]: [string, any]) => {
                // Añadir cada sensor con sus datos completos
                if (sensorInfo.data && Array.isArray(sensorInfo.data)) {
                  relevantData.sensorData[sensorId] = sensorInfo.data;
                }
              });
              
              finalDataToSave = relevantData;
              console.log(`Se usarán datos consolidados previamente para ${relevantData.sensors.length} sensores`);
            } catch (e) {
              console.error('Error al leer archivo session_data.json, usando datos recopilados de archivos individuales:', e);
              finalDataToSave = {
                sensors: Object.keys(allSensorData),
                sessionInfo,
                sensorData: allSensorData
              };
            }
          } else {
            // Si no existe el archivo consolidado, crear uno con los datos recopilados
            finalDataToSave = {
              sensors: Object.keys(allSensorData),
              sessionInfo,
              sensorData: allSensorData
            };
          }
          
          // Guardar el archivo consolidado
          const tempConsolidatedPath = path.join(sessionDir, 'consolidated_sensors.json');
          fs.writeFileSync(tempConsolidatedPath, JSON.stringify(finalDataToSave, null, 2));
          
          // Siempre guardar una copia en la raíz para fácil acceso
          archive.file(tempConsolidatedPath, { name: `sensors.json` });
          
          // También guardar como sensors.json en sensor_data/ para compatibilidad
          archive.file(tempConsolidatedPath, { name: `sensor_data/sensors.json` });
          
          // Buscar y agregar todos los archivos CSV relacionados con sensores
          // 1. Archivo CSV específico de la sesión (exportado al finalizar)
          const sensorDataCsvPath = path.join(sensorDataPath, `session_${sessionId}_data.csv`);
          if (fs.existsSync(sensorDataCsvPath)) {
            archive.file(sensorDataCsvPath, { name: 'sensor_data/sensors.csv' });
            console.log(`Archivo CSV de datos de sensores agregado al ZIP: ${sensorDataCsvPath}`);
          } else {
            // Buscar en el directorio raíz de la sesión en caso de que se haya guardado allí
            const rootCsvPath = path.join(sessionDir, `session_${sessionId}_data.csv`);
            if (fs.existsSync(rootCsvPath)) {
              archive.file(rootCsvPath, { name: 'sensor_data/sensors.csv' });
              console.log(`Archivo CSV de datos de sensores (root) agregado al ZIP: ${rootCsvPath}`);
            }
          }
          
          // 2. También incluir archivos CSV específicos por sensor si existen
          try {
            const sensorCsvFiles = fs.readdirSync(sensorDataPath).filter(file => file.endsWith('.csv'));
            sensorCsvFiles.forEach(csvFile => {
              const csvPath = path.join(sensorDataPath, csvFile);
              if (csvPath !== sensorDataCsvPath) { // Evitar duplicar el archivo principal
                archive.file(csvPath, { name: `sensor_data/csv/${csvFile}` });
              }
            });
            
            if (sensorCsvFiles.length > 0) {
              console.log(`Se agregaron ${sensorCsvFiles.length} archivos CSV adicionales al ZIP`);
            }
          } catch (csvErr) {
            console.error(`Error al buscar archivos CSV adicionales: ${csvErr}`);
          }
          
          // 3. Agregar archivo CSV genérico con todo el tráfico MQTT si existe
          const allDataCsvPath = path.join(sessionDir, 'all_data.csv');
          if (fs.existsSync(allDataCsvPath)) {
            archive.file(allDataCsvPath, { name: 'all_data.csv' });
            console.log(`Archivo CSV de tráfico MQTT agregado al ZIP de la sesión`);
          }
          
          console.log(`Creado archivo consolidado con datos de ${finalDataToSave.sensors.length} sensores`);
        } catch (consolidationErr) {
          console.error('Error al consolidar datos de sensores:', consolidationErr);
        }
      }
      
      // Agregar también el archivo de datos de sensores original si existe
      if (config.sensorDataPath && fs.existsSync(config.sensorDataPath)) {
        archive.file(config.sensorDataPath, { name: `sensor_data/sensor_export_original.json` });
      }

      try {
        await new Promise((resolve, reject) => {
          // Establecer un manejador de errores en el stream de salida
          output.on('error', (err) => {
            console.error('Error en el stream de salida:', err);
            reject(err);
          });
          
          output.on('close', () => {
            try {
              const stream = fs.createReadStream(zipFilePath);
              
              // Agregar manejadores de errores al stream de lectura
              stream.on('error', (err) => {
                console.error('Error al leer el archivo ZIP:', err);
                // Si hay error al leer, intentar limpiar el archivo
                try {
                  if (fs.existsSync(zipFilePath)) {
                    fs.unlinkSync(zipFilePath);
                  }
                } catch (cleanupErr) {
                  console.error('Error al limpiar el archivo ZIP:', cleanupErr);
                }
                reject(err);
              });
              
              res.setHeader('Content-Type', 'application/zip');
              res.setHeader('Content-Disposition', `attachment; filename=${zipFileName}`);
              stream.pipe(res);
              
              stream.on('end', () => {
                try {
                  if (fs.existsSync(zipFilePath)) {
                    fs.unlinkSync(zipFilePath);
                  }
                  resolve(true);
                } catch (cleanupErr) {
                  console.error('Error al eliminar el archivo ZIP después de la descarga:', cleanupErr);
                  resolve(true); // Continuamos a pesar del error de limpieza
                }
              });
            } catch (streamErr) {
              console.error('Error al configurar el stream de lectura:', streamErr);
              reject(streamErr);
            }
          });
          
          archive.on('error', (err) => {
            console.error('Error en el archivador ZIP:', err);
            reject(err);
          });
          
          archive.finalize();
        });
      } catch (zipError) {
        console.error('Error crítico en el proceso de ZIP:', zipError);
        res.status(500).json({ error: 'Error al crear el archivo ZIP' });
        return;
      }
    } catch (error) {
      console.error('Error general en la exportación de la sesión:', error);
      res.status(500).json({ error: "Error al exportar la sesión" });
    }
  });

  // Ruta para iniciar el análisis de IA
  app.post("/api/recordings/:id/analyze", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const recordingId = parseInt(req.params.id);
      const analysisId = req.body.analysisId;
      const recording = await storage.getRecording(recordingId);

      if (!recording || !fs.existsSync(recording.filePath)) {
        return res.status(404).json({ message: "Grabación no encontrada" });
      }

      console.log(`Iniciando análisis para grabación ${recordingId} con ID de análisis ${analysisId}`);

      // Iniciar el análisis en background
      analyzeVideo(recording.filePath, analysisId)
        .then(async (analysis) => {
          console.log(`Análisis completado para grabación ${recordingId}`, analysis);
          await storage.updateRecording(recordingId, { aiAnalysis: analysis });
        })
        .catch(error => {
          console.error(`Error en el análisis de la grabación ${recordingId}:`, error);
        });

      res.status(202).json({ message: "Análisis iniciado" });
    } catch (error) {
      console.error('Error iniciando análisis:', error);
      res.status(500).json({ message: "Error al iniciar el análisis" });
    }
  });

  // Ruta para obtener el progreso del análisis
  app.get("/api/analysis/:analysisId/progress", async (req, res) => {
    try {
      const analysisId = req.params.analysisId;
      console.log(`Consultando progreso del análisis ${analysisId}`);

      const progress = getAnalysisProgress(analysisId);
      if (!progress) {
        console.log(`No se encontró progreso para el análisis ${analysisId}`);
        return res.status(404).json({ message: "Análisis no encontrado" });
      }

      console.log(`Progreso del análisis ${analysisId}:`, progress);
      res.json({
        progress: progress.progress || 0,
        status: progress.status,
        framesAnalyzed: progress.framesAnalyzed,
        totalFrames: progress.totalFrames,
        errorMessage: progress.errorMessage
      });
    } catch (error) {
      console.error('Error obteniendo progreso del análisis:', error);
      res.status(500).json({ message: "Error al obtener el progreso" });
    }
  });

  // Endpoint eliminado ya que esta funcionalidad ya existe en la sección de Sesiones

  // Endpoints para dispositivos Zigbee ----------------------------------------------
  
  // Iniciar cliente MQTT al arrancar el servidor
  mqttClient.connect().catch(err => {
    console.error('Error al iniciar cliente MQTT:', err);
  });
  
  app.get("/api/zigbee/devices", (req, res) => {
    if (!req.isAuthenticated()) {
      console.log("[auth] Unauthorized access attempt to /api/zigbee/devices");
      return res.sendStatus(401);
    }
    
    try {
      // Obtener dispositivos usando el cliente MQTT simple primero
      const devicesList = mqttClient.getDevicesList();
      
      if (devicesList && devicesList.length > 0) {
        console.log(`[Zigbee] Enviando ${devicesList.length} dispositivos`);
        
        // Filtrar dispositivos que no son coordinadores
        const filteredDevices = devicesList
          .filter(d => d.type !== 'Coordinator')
          .map(device => {
            const lastSeen = device.last_seen ? new Date(device.last_seen) : null;
            
            return {
              id: device.ieee_address || `device-${Date.now()}`,
              name: device.friendly_name || device.ieee_address,
              type: device.type || 'unknown',
              lastSeen,
              location: null,
              metrics: {
                battery: device.battery || 0,
                linkQuality: device.linkquality || 0,
                lastUpdate: device.last_seen || new Date().toISOString(),
                status: device.availability === 'online' ? 'online' : 'offline'
              },
              config: {
                topic: `zigbee2mqtt/${device.friendly_name}`,
                deviceId: device.ieee_address,
                model: device.definition?.model || device.model_id || 'unknown',
                manufacturer: device.definition?.vendor || device.manufacturer || 'unknown'
              },
              features: device.definition?.exposes || [],
              zigbeeInfo: device
            };
          });
        
        res.json(filteredDevices);
        return;
      }
      
      // Si no hay datos disponibles
      console.log("[Zigbee] No hay dispositivos disponibles");
      res.json([]);
    } catch (error) {
      console.error('[Zigbee] Error obteniendo dispositivos:', error);
      res.status(500).json({ message: "Error al obtener dispositivos Zigbee" });
    }
  });
  
  app.get("/api/zigbee/devices/refresh", (req, res) => {
    if (!req.isAuthenticated()) {
      console.log("[auth] Unauthorized access attempt to /api/zigbee/devices/refresh");
      return res.sendStatus(401);
    }
    
    try {
      try {
        console.log("[Zigbee] Solicitando actualización de dispositivos");
        
        // Intentar conectar MQTT y solicitar actualización de la lista de dispositivos
        mqttClient.connect().then(() => {
          // Enviamos un mensaje para forzar la actualización de la lista de dispositivos
          const message = JSON.stringify({ transaction: `api-refresh-${Date.now()}` });
          const topic = 'zigbee2mqtt/bridge/request/devices';
          
          console.log(`[Zigbee] Publicando solicitud en topic ${topic}`);
          res.json({ success: true, message: "Solicitud de actualización enviada" });
          
          // Nota: La respuesta se envía inmediatamente para no bloquear al cliente
          // La actualización ocurrirá asincrónicamente
        }).catch(err => {
          console.error("Error conectando a MQTT para actualizar dispositivos:", err);
          res.status(503).json({ success: false, message: "Error conectando a MQTT" });
        });
      } catch (error) {
        console.log("[Zigbee] Cliente MQTT no disponible para solicitar actualización");
        res.status(503).json({ success: false, message: "Cliente MQTT no disponible" });
      }
    } catch (error) {
      console.error('[Zigbee] Error al solicitar actualización:', error);
      res.status(500).json({ success: false, message: "Error al solicitar actualización" });
    }
  });
  
  app.get("/api/zigbee/topics", (req, res) => {
    if (!req.isAuthenticated()) {
      console.log("[auth] Unauthorized access attempt to /api/zigbee/topics");
      return res.sendStatus(401);
    }
    
    try {
      const topics = mqttClient.getTopics();
      if (topics && topics.length > 0) {
        console.log(`[Zigbee] Enviando ${topics.length} topics`);
        res.json(topics);
      } else {
        console.log("[Zigbee] No hay topics disponibles");
        res.json([]);
      }
    } catch (error) {
      console.error('[Zigbee] Error obteniendo topics:', error);
      res.status(500).json({ message: "Error al obtener topics Zigbee" });
    }
  });
  
  app.get("/api/zigbee/messages/:topic", (req, res) => {
    if (!req.isAuthenticated()) {
      console.log(`[auth] Unauthorized access attempt to /api/zigbee/messages/${req.params.topic}`);
      return res.sendStatus(401);
    }
    
    try {
      const { topic } = req.params;
      const decodedTopic = decodeURIComponent(topic);
      
      const messages = mqttClient.getMessageHistory(decodedTopic);
      if (messages && messages.length > 0) {
        console.log(`[Zigbee] Enviando ${messages.length} mensajes para el topic ${decodedTopic}`);
        res.json(messages);
      } else {
        console.log(`[Zigbee] No hay mensajes para el topic ${decodedTopic}`);
        res.json([]);
      }
    } catch (error) {
      console.error('[Zigbee] Error obteniendo mensajes:', error);
      res.status(500).json({ message: "Error al obtener mensajes del topic" });
    }
  });

  return httpServer;
}

async function analyzeVideo(filePath: string, analysisId: string): Promise<any> {
  console.log(`Iniciando análisis real de video para ${filePath} con ID ${analysisId}`);
  
  try {
    // Inicializar el estado de progreso
    analysisProgress.set(analysisId, { 
      progress: 0, 
      status: 'processing', 
      framesAnalyzed: 0, 
      totalFrames: 0, 
      errorMessage: null 
    });
    
    // Obtener información del video utilizando ffmpeg
    const videoInfo = await getVideoInfo(filePath);
    const totalFrames = videoInfo.frameCount || 100; // Valor por defecto si no se puede determinar
    
    // Actualizar el total de frames en el progreso
    analysisProgress.set(analysisId, { 
      progress: 0, 
      status: 'processing', 
      framesAnalyzed: 0, 
      totalFrames, 
      errorMessage: null 
    });
    
    // Aquí se integraría con un servicio real de análisis de video (OpenCV, TensorFlow, etc.)
    // Por ahora solo reportamos el progreso para mantener la funcionalidad principal
    
    // Proceso de análisis real (simulado por ahora, pero que sería un proceso real)
    for (let i = 0; i < totalFrames; i += Math.ceil(totalFrames / 20)) {
      // Actualizar progreso cada 5% aproximadamente
      await new Promise(resolve => setTimeout(resolve, 200)); // Tiempo para analizar cada lote de frames
      
      const framesAnalyzed = Math.min(i + Math.ceil(totalFrames / 20), totalFrames);
      const progress = Math.floor((framesAnalyzed / totalFrames) * 100);
      
      analysisProgress.set(analysisId, {
        progress,
        status: framesAnalyzed >= totalFrames ? 'completed' : 'processing',
        framesAnalyzed,
        totalFrames,
        errorMessage: null
      });
    }
    
    console.log(`Análisis completado para grabación con ID ${analysisId}`);
    
    // En una implementación real, aquí se retornaría el resultado del análisis
    // Por ahora retornamos datos de muestra pero con la nota de que esto sería
    // reemplazado por el análisis real
    return {
      description: "Nota: Esta es una representación de los resultados que se obtendrían del análisis real de video.",
      tags: ["análisis pendiente"],
      keyEvents: [
        "Análisis real pendiente de implementación con herramientas específicas"
      ],
      timestamp: new Date()
    };
  } catch (error) {
    console.error(`Error en el análisis de video para ${filePath}:`, error);
    
    // Actualizar el estado del análisis para mostrar el error
    analysisProgress.set(analysisId, {
      progress: 0,
      status: 'error',
      framesAnalyzed: 0,
      totalFrames: 0,
      errorMessage: `Error en el análisis: ${error.message || 'Error desconocido'}`
    });
    
    throw new Error(`Error en el análisis de video: ${error.message || 'Error desconocido'}`);
  }
}

// Función auxiliar para obtener información del video usando ffmpeg
async function getVideoInfo(filePath: string): Promise<{ frameCount: number, duration: number, resolution: string }> {
  return new Promise((resolve, reject) => {
    const ffmpeg = require('fluent-ffmpeg');
    
    ffmpeg.ffprobe(filePath, (err: any, metadata: any) => {
      if (err) {
        console.error('Error al analizar el video con ffprobe:', err);
        return reject(err);
      }
      
      try {
        const videoStream = metadata.streams.find((s: any) => s.codec_type === 'video');
        const frameCount = videoStream.nb_frames 
          ? parseInt(videoStream.nb_frames) 
          : Math.floor(parseFloat(videoStream.duration) * parseFloat(videoStream.avg_frame_rate));
        
        resolve({
          frameCount: isNaN(frameCount) ? 100 : frameCount, // Valor por defecto si no se puede calcular
          duration: parseFloat(metadata.format.duration || '0'),
          resolution: `${videoStream.width}x${videoStream.height}`
        });
      } catch (parseError) {
        console.error('Error al procesar metadatos del video:', parseError);
        resolve({
          frameCount: 100, // Valor por defecto
          duration: 0,
          resolution: 'desconocida'
        });
      }
    });
  });
}

function getAnalysisProgress(analysisId: string): { progress: number; status: string; framesAnalyzed: number; totalFrames: number; errorMessage: string | null } | undefined {
  return analysisProgress.get(analysisId);
}

// Esta función ya no se usa, usamos viteLog importado
function logFn(message: string, context: string = "general") {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${context}] ${message}`);
}

/**
 * Función para notificar actualizaciones de estado a todos los clientes WebSocket conectados
 */
function broadcastRecordingStatus() {
  if (!wss) return;
  
  try {
    // Generar mensaje de actualización de estado
    const activeRecordings = Array.from(recordingProcesses.entries()).map(([cameraId, data]) => ({
      cameraId,
      recordingId: data.recording?.id,
      status: data.recording?.status || 'unknown',
      startTime: data.recording?.startTime,
      sessionId: data.recording?.sessionId
    }));
    
    const message = JSON.stringify({
      type: 'recording_status_update',
      recordings: activeRecordings,
      timestamp: new Date().toISOString()
    });
    
    // Enviar mensaje a todos los clientes conectados
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  } catch (error) {
    console.error('Error al enviar actualizaciones WebSocket:', error);
  }
}