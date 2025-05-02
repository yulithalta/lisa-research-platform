import fs from 'fs';
import path from 'path';
import { promises as fsPromises } from 'fs';
import { Session } from '@shared/schema';

/**
 * Servicio encargado de la gestión de sesiones
 * Implementa patrones de diseño y principios SOLID
 */
class SessionService {
  private sessionsDir: string;
  private recordingsDir: string;
  private sensorDataDir: string;

  constructor() {
    this.sessionsDir = path.join(process.cwd(), 'sessions');
    this.recordingsDir = path.join(process.cwd(), 'recordings');
    this.sensorDataDir = path.join(process.cwd(), 'data', 'sensor_data');
    
    // Asegurar que existan los directorios
    this.ensureDirectories();
  }

  /**
   * Asegura que existan los directorios necesarios
   */
  private async ensureDirectories(): Promise<void> {
    const directories = [this.sessionsDir, this.recordingsDir, this.sensorDataDir];
    
    for (const dir of directories) {
      try {
        await fsPromises.access(dir);
      } catch (error) {
        await fsPromises.mkdir(dir, { recursive: true });
        console.log(`Directorio creado: ${dir}`);
      }
    }
  }

  /**
   * Obtiene o crea el directorio para una sesión específica
   * @param sessionId ID de la sesión
   * @returns Ruta del directorio de la sesión
   */
  async getSessionDirectory(sessionId: number | string): Promise<string> {
    const sessionDir = path.join(this.sessionsDir, `Session${sessionId}`);
    
    try {
      await fsPromises.access(sessionDir);
    } catch (error) {
      await fsPromises.mkdir(sessionDir, { recursive: true });
      console.log(`Directorio de sesión creado: ${sessionDir}`);
      
      // Crear subdirectorios estándar
      await fsPromises.mkdir(path.join(sessionDir, 'recordings'), { recursive: true });
      await fsPromises.mkdir(path.join(sessionDir, 'sensor_data'), { recursive: true });
    }
    
    return sessionDir;
  }

  /**
   * Registra la ruta de un archivo MP4 para una sesión
   * @param sessionId ID de la sesión
   * @param filePath Ruta del archivo MP4
   * @param cameraId ID de la cámara (opcional)
   */
  async registerRecordingFile(sessionId: number | string, filePath: string, cameraId?: number): Promise<void> {
    const sessionDir = await this.getSessionDirectory(sessionId);
    const sessionLogFile = path.join(sessionDir, 'session_files.json');
    
    let sessionLog: { recordings: {path: string, camera?: number}[] } = { recordings: [] };
    
    // Cargar el log existente si existe
    try {
      const logData = await fsPromises.readFile(sessionLogFile, 'utf-8');
      sessionLog = JSON.parse(logData);
    } catch (error) {
      // Si el archivo no existe, se usará el objeto vacío por defecto
    }
    
    // Añadir el nuevo archivo
    sessionLog.recordings.push({
      path: filePath,
      camera: cameraId
    });
    
    // Guardar el log actualizado
    await fsPromises.writeFile(sessionLogFile, JSON.stringify(sessionLog, null, 2));
    console.log(`Archivo de grabación registrado para sesión ${sessionId}: ${filePath}`);
  }

  /**
   * Registra un archivo de datos de sensores para una sesión
   * @param sessionId ID de la sesión
   * @param filePath Ruta del archivo de datos
   * @param sensorId ID del sensor (opcional)
   */
  async registerSensorDataFile(sessionId: number | string, filePath: string, sensorId?: string): Promise<void> {
    const sessionDir = await this.getSessionDirectory(sessionId);
    const sessionLogFile = path.join(sessionDir, 'session_files.json');
    
    let sessionLog: { recordings: any[], sensorData: {path: string, sensor?: string}[] } = { 
      recordings: [],
      sensorData: [] 
    };
    
    // Cargar el log existente si existe
    try {
      const logData = await fsPromises.readFile(sessionLogFile, 'utf-8');
      sessionLog = JSON.parse(logData);
      if (!sessionLog.sensorData) sessionLog.sensorData = [];
    } catch (error) {
      // Si el archivo no existe, se usará el objeto vacío por defecto
    }
    
    // Añadir el nuevo archivo
    sessionLog.sensorData.push({
      path: filePath,
      sensor: sensorId
    });
    
    // Guardar el log actualizado
    await fsPromises.writeFile(sessionLogFile, JSON.stringify(sessionLog, null, 2));
    console.log(`Archivo de datos de sensor registrado para sesión ${sessionId}: ${filePath}`);
  }

  /**
   * Obtiene una lista de todos los archivos asociados a una sesión
   * @param sessionId ID de la sesión
   * @returns Lista de archivos de la sesión
   */
  async getSessionFiles(sessionId: number | string): Promise<{
    recordings: {path: string, camera?: number}[],
    sensorData: {path: string, sensor?: string}[]
  }> {
    const sessionDir = await this.getSessionDirectory(sessionId);
    const sessionLogFile = path.join(sessionDir, 'session_files.json');
    
    // Estructura por defecto
    let sessionFiles = {
      recordings: [],
      sensorData: []
    };
    
    // Intentar cargar el archivo de log
    try {
      const logData = await fsPromises.readFile(sessionLogFile, 'utf-8');
      sessionFiles = JSON.parse(logData);
      
      // Asegurar que existan las propiedades necesarias
      if (!sessionFiles.recordings) sessionFiles.recordings = [];
      if (!sessionFiles.sensorData) sessionFiles.sensorData = [];
      
      // Verificar que los archivos existan físicamente y registrar la información
      console.log(`✅ LOG DETALLADO - Archivos encontrados para la sesión ${sessionId}:`);
      console.log(`Directorio de sesión: ${sessionDir}`);
      console.log(`Total de grabaciones registradas: ${sessionFiles.recordings.length}`);
      console.log(`Total de archivos de sensores registrados: ${sessionFiles.sensorData.length}`);
      
      // Verificar cada archivo de grabación
      const validRecordings = sessionFiles.recordings.filter((rec: {path: string, camera?: number}) => {
        const exists = fs.existsSync(rec.path);
        console.log(`Grabación ${exists ? '✅' : '❌'}: ${rec.path}`);
        return exists;
      });
      
      // Verificar cada archivo de sensor
      const validSensorData = sessionFiles.sensorData.filter((sensor: {path: string, sensor?: string}) => {
        const exists = fs.existsSync(sensor.path);
        console.log(`Datos sensor ${exists ? '✅' : '❌'}: ${sensor.path}`);
        return exists;
      });
      
      // Actualizar la lista con solo archivos válidos
      sessionFiles.recordings = validRecordings;
      sessionFiles.sensorData = validSensorData;
      
      console.log(`Archivos válidos de grabación: ${validRecordings.length}/${sessionFiles.recordings.length}`);
      console.log(`Archivos válidos de sensores: ${validSensorData.length}/${sessionFiles.sensorData.length}`);
    } catch (error) {
      console.log(`No se encontró archivo de log para la sesión ${sessionId}, se usará lista vacía`);
    }
    
    return sessionFiles;
  }

  /**
   * Finaliza una sesión y consolida todos sus archivos
   * @param sessionId ID de la sesión
   * @param sessionData Datos de la sesión
   */
  async finalizeSession(sessionId: number | string, sessionData: Session): Promise<void> {
    console.log(`\n\n⚡ FINALIZANDO SESIÓN ${sessionId} - GUARDANDO TODOS LOS METADATOS`);
    const sessionDir = await this.getSessionDirectory(sessionId);
    
    // Crear un archivo JSON con los metadatos de la sesión (detallado)
    const metadataFile = path.join(sessionDir, 'session_metadata.json');
    const sessionMetadata = {
      id: sessionId,
      name: sessionData.name || `Session${sessionId}`,
      description: sessionData.description,
      startTime: sessionData.startTime,
      endTime: sessionData.endTime || new Date().toISOString(),
      userId: sessionData.userId,
      status: 'completed',
      exportedAt: null, // Se actualizará cuando se exporte la sesión
      files: await this.getSessionFiles(sessionId),
      // Incluir datos adicionales del formulario
      metadata: sessionData.metadata || {},
      notes: sessionData.notes || '',
      tags: sessionData.tags || [],
      // Información de investigador y participantes
      researcher: (sessionData.metadata as any)?.researcher || '',
      participants: (sessionData.metadata as any)?.participants || [],
      labInfo: (sessionData.metadata as any)?.labInfo || {}
    };
    
    await fsPromises.writeFile(metadataFile, JSON.stringify(sessionMetadata, null, 2));
    console.log(`\u2705 Metadatos de sesión guardados en ${metadataFile}`);
    
    // Guardar un archivo JSON exclusivo para el formulario (fácil de encontrar)
    const formDataFile = path.join(sessionDir, 'session_form_data.json');
    const metadata = sessionData.metadata as any || {};
    const formData = {
      name: sessionData.name || `Session${sessionId}`,
      description: sessionData.description || '',
      researcher: metadata?.researcher || '',
      participants: metadata?.participants || [],
      tags: sessionData.tags || [],
      notes: sessionData.notes || '',
      labInfo: metadata?.labInfo || {},
      devices: metadata?.selectedDevices || {}
    };
    
    await fsPromises.writeFile(formDataFile, JSON.stringify(formData, null, 2));
    console.log(`\u2705 Datos del formulario guardados en ${formDataFile}`);
    
    // Crear resumen en formato CSV para fácil importación a Excel
    try {
      const csvFile = path.join(sessionDir, 'session_summary.csv');
      const csvHeader = 'Session ID,Name,Description,Researcher,Participants,Start Time,End Time,Tags\n';
      const metadataForCsv = sessionData.metadata as any || {};
      const participantsText = Array.isArray(metadataForCsv?.participants) 
        ? metadataForCsv.participants.join('; ')
        : '';
      const tagsText = Array.isArray(sessionData.tags) ? sessionData.tags.join('; ') : '';
      
      const csvLine = [
        sessionId,
        sessionData.name || `Session${sessionId}`,
        (sessionData.description || '').replace(/,/g, ';'),
        (metadataForCsv?.researcher || '').replace(/,/g, ';'),
        participantsText.replace(/,/g, ';'),
        sessionData.startTime ? new Date(sessionData.startTime).toISOString() : '',
        sessionData.endTime ? new Date(sessionData.endTime).toISOString() : new Date().toISOString(),
        tagsText.replace(/,/g, ';')
      ].join(',');
      
      await fsPromises.writeFile(csvFile, csvHeader + csvLine);
      console.log(`\u2705 Resumen CSV guardado en ${csvFile}`);
    } catch (csvError: any) {
      console.error('Error al crear archivo CSV:', csvError);
    }
    
    console.log(`\u2705 Sesión ${sessionId} finalizada exitosamente - Todos los metadatos guardados`);
  }
}

export const sessionService = new SessionService();
