import fs from 'fs';
import path from 'path';
import { promises as fsPromises } from 'fs';
import AdmZip from 'adm-zip';
import { Session } from '@shared/schema';
import { sessionService } from './session.service';

/**
 * Interfaz para monitorizar el progreso de creación de ZIP
 */
export interface ZipProgress {
  total: number;
  processed: number;
  status: 'pending' | 'processing' | 'completed' | 'error';
  message?: string;
  error?: string;
}

/**
 * Servicio encargado de la gestión de archivos comprimidos (ZIP)
 * Implementa patrones de diseño y principios SOLID
 */
class ArchiveService {
  private recordingsDir: string;
  private sessionsDir: string;
  private uploadsDir: string;
  private tempDir: string;
  
  // Mapa para guardar el progreso de creación de cada ZIP
  private zipProgressMap: Map<number | string, ZipProgress> = new Map();

  constructor() {
    // Directorios base para búsqueda de archivos
    this.recordingsDir = path.join(process.cwd(), 'recordings');
    this.sessionsDir = path.join(process.cwd(), 'sessions');
    this.uploadsDir = path.join(process.cwd(), 'uploads');
    this.tempDir = path.join(process.cwd(), 'temp');
    
    // Asegurar que existan los directorios
    this.ensureDirectories();
  }

  /**
   * Asegura que existan los directorios necesarios
   */
  private async ensureDirectories(): Promise<void> {
    const directories = [
      this.recordingsDir, 
      this.sessionsDir, 
      this.uploadsDir,
      this.tempDir
    ];
    
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
   * Inicia el proceso de creación de ZIP para una sesión
   * @param sessionId ID de la sesión
   * @param session Datos de la sesión
   * @returns Ruta del archivo ZIP temporal
   */
  async createSessionZipAsync(sessionId: number | string, session: Session): Promise<string> {
    // Inicializar progreso
    this.zipProgressMap.set(sessionId, {
      total: 0,
      processed: 0,
      status: 'pending',
      message: 'Iniciando creación del ZIP...'
    });
    
    try {
      // Verificar que el directorio de sesión exista
      const sessionDir = await sessionService.getSessionDirectory(sessionId);
      
      // Obtener la lista de archivos de la sesión
      const sessionFiles = await sessionService.getSessionFiles(sessionId);
      
      // Calcular el total de archivos para el progreso
      const totalFiles = sessionFiles.recordings.length + sessionFiles.sensorData.length + 1; // +1 por el README
      
      // Actualizar progreso
      this.zipProgressMap.set(sessionId, {
        total: totalFiles,
        processed: 0,
        status: 'processing',
        message: `Procesando ${totalFiles} archivos...`
      });
      
      // Crear el ZIP
      const zipFilePath = await this.generateSessionZip(sessionId, session, sessionFiles);
      
      // Marcar como completado
      this.zipProgressMap.set(sessionId, {
        total: totalFiles,
        processed: totalFiles,
        status: 'completed',
        message: `ZIP creado exitosamente`
      });
      
      return zipFilePath;
    } catch (error: any) {
      // Registrar error
      this.zipProgressMap.set(sessionId, {
        total: 0,
        processed: 0,
        status: 'error',
        message: 'Error al crear el archivo ZIP',
        error: error && typeof error === 'object' && 'message' in error ? error.message as string : 'Error desconocido'
      });
      
      console.error(`Error al crear ZIP para sesión ${sessionId}:`, error);
      throw error;
    }
  }
  
  /**
   * Obtiene el progreso actual de creación del ZIP
   * @param sessionId ID de la sesión
   */
  getZipProgress(sessionId: number | string): ZipProgress | undefined {
    return this.zipProgressMap.get(sessionId);
  }

  /**
   * Genera el archivo ZIP con todos los archivos de la sesión
   * @param sessionId ID de la sesión
   * @param session Datos de la sesión
   * @param sessionFiles Archivos de la sesión
   * @returns Ruta del archivo ZIP generado
   */
  private async generateSessionZip(
    sessionId: number | string, 
    session: Session, 
    sessionFiles: {
      recordings: {path: string, camera?: number}[],
      sensorData: {path: string, sensor?: string}[]
    }
  ): Promise<string> {
    const zip = new AdmZip();
    
    // Nombre seguro para el archivo basado en el nombre de la sesión
    const safeName = (session.name || `Session${sessionId}`)
      .replace(/[^a-z0-9]/gi, '_')
      .replace(/_+/g, '_')
      .toLowerCase();
    
    // Ruta temporal para el archivo ZIP
    const zipFilePath = path.join(this.tempDir, `${safeName}.zip`);
    
    // Crear la estructura de carpetas
    this.createSessionFolderStructure(zip, session);
    
    // Contador de archivos procesados
    let processedCount = 0;
    const totalFiles = sessionFiles.recordings.length + sessionFiles.sensorData.length;
    
    // Añadir grabaciones de vídeo
    for (const recording of sessionFiles.recordings) {
      try {
        if (fs.existsSync(recording.path)) {
          const fileName = path.basename(recording.path);
          
          // Añadir el archivo al ZIP
          zip.addLocalFile(recording.path, 'recordings');
          
          console.log(`Añadido al ZIP: recordings/${fileName}`);
          
          // Actualizar progreso
          processedCount++;
          this.updateZipProgress(sessionId, processedCount, totalFiles);
        } else {
          console.warn(`Archivo de grabación no encontrado: ${recording.path}`);
        }
      } catch (error: any) {
        console.error(`Error al añadir grabación al ZIP:`, error);
      }
    }
    
    // Añadir datos de sensores
    for (const sensorData of sessionFiles.sensorData) {
      try {
        if (fs.existsSync(sensorData.path)) {
          const fileName = path.basename(sensorData.path);
          
          // Añadir el archivo al ZIP
          zip.addLocalFile(sensorData.path, 'sensors');
          
          console.log(`Añadido al ZIP: sensors/${fileName}`);
          
          // Actualizar progreso
          processedCount++;
          this.updateZipProgress(sessionId, processedCount, totalFiles);
        } else {
          console.warn(`Archivo de datos de sensor no encontrado: ${sensorData.path}`);
        }
      } catch (error: any) {
        console.error(`Error al añadir datos de sensor al ZIP:`, error);
      }
    }
    
    // Añadir archivos adicionales
    await this.addAdditionalSessionFiles(zip, sessionId, session);
    
    // Añadir README con información de la sesión
    this.addSessionReadmeFile(zip, session);
    
    // Guardar el archivo ZIP
    zip.writeZip(zipFilePath);
    
    console.log(`ZIP creado exitosamente en ${zipFilePath}`);
    return zipFilePath;
  }

  /**
   * Actualiza el progreso de creación del ZIP
   */
  private updateZipProgress(sessionId: number | string, processed: number, total: number): void {
    const progress = this.zipProgressMap.get(sessionId);
    if (progress) {
      this.zipProgressMap.set(sessionId, {
        ...progress,
        processed,
        total,
        message: `Procesando archivos (${processed}/${total})...`
      });
    }
  }

  /**
   * Crea la estructura de carpetas en el ZIP
   */
  private createSessionFolderStructure(zip: AdmZip, session: Session): void {
    // Crear carpetas principales
    zip.addFile('recordings/', Buffer.from(''));
    zip.addFile('sensors/', Buffer.from(''));
    
    // Usar el nombre de la sesión para la carpeta principal
    const sessionName = session.name || `Session${session.id}`;
    const safeName = sessionName
      .replace(/[^a-z0-9]/gi, '_')
      .replace(/_+/g, '_')
      .toLowerCase();
    
    // No es necesario crear la carpeta con el nombre de la sesión
    // ya que usaremos la estructura plana recomendada
  }

  /**
   * Añade archivos adicionales de la sesión al ZIP
   */
  private async addAdditionalSessionFiles(zip: AdmZip, sessionId: number | string, session: Session): Promise<void> {
    try {
      console.log(`\n\n⚡ INICIANDO BÚSQUEDA EXHAUSTIVA DE ARCHIVOS PARA LA SESIÓN ${sessionId}`);
      const sessionDir = await sessionService.getSessionDirectory(sessionId);
      console.log(`📁 Directorio de sesión: ${sessionDir}`);
      
      // Buscar archivo AllData.json
      const allDataPath = path.join(sessionDir, 'AllData.json');
      if (fs.existsSync(allDataPath)) {
        zip.addLocalFile(allDataPath, 'sensors');
        console.log('✅ Añadido AllData.json al ZIP');
      }
      
      // Buscar archivo session_data.json
      const sessionDataPath = path.join(sessionDir, 'session_data.json');
      if (fs.existsSync(sessionDataPath)) {
        zip.addLocalFile(sessionDataPath, 'sensors');
        console.log('✅ Añadido session_data.json al ZIP');
      }
      
      // Buscar carpeta sensor_data y añadir todos los archivos JSON
      const sensorDataDir = path.join(sessionDir, 'sensor_data');
      if (fs.existsSync(sensorDataDir)) {
        console.log(`📁 Directorio de datos de sensores encontrado: ${sensorDataDir}`);
        const sensorFiles = fs.readdirSync(sensorDataDir);
        console.log(`🔍 ${sensorFiles.length} archivos encontrados en sensor_data`);
        
        for (const file of sensorFiles) {
          const filePath = path.join(sensorDataDir, file);
          zip.addLocalFile(filePath, 'sensors');
          console.log(`✅ Añadido ${file} al ZIP`);
        }
      } else {
        console.log(`⚠️ No se encontró carpeta sensor_data en ${sessionDir}`);
      }
      
      // Buscar carpeta recordings y añadir todos los archivos MP4
      const recordingsDir = path.join(sessionDir, 'recordings');
      if (fs.existsSync(recordingsDir)) {
        console.log(`📁 Directorio de grabaciones encontrado: ${recordingsDir}`);
        const recordingFiles = fs.readdirSync(recordingsDir);
        console.log(`🔍 ${recordingFiles.length} archivos encontrados en recordings`);
        
        for (const file of recordingFiles) {
          const filePath = path.join(recordingsDir, file);
          zip.addLocalFile(filePath, 'recordings');
          console.log(`✅ Añadido ${file} al ZIP`);
        }
      } else {
        console.log(`⚠️ No se encontró carpeta recordings en ${sessionDir}`);
      }
      
      // Buscar en el directorio de grabaciones generales por archivos de esta sesión
      try {
        const generalRecordingsDir = path.join(process.cwd(), 'recordings');
        if (fs.existsSync(generalRecordingsDir)) {
          console.log(`📁 Buscando en directorio general de grabaciones: ${generalRecordingsDir}`);
          const allRecordingFiles = fs.readdirSync(generalRecordingsDir);
          
          // Filtrar archivos que corresponden a esta sesión por nombrado
          const sessionRecordings = allRecordingFiles.filter(file => {
            return file.includes(`_session${sessionId}`) || file.includes(`-session${sessionId}`);
          });
          
          console.log(`🔍 Encontrados ${sessionRecordings.length} archivos de grabación correspondientes a la sesión ${sessionId}`);
          
          for (const file of sessionRecordings) {
            const filePath = path.join(generalRecordingsDir, file);
            zip.addLocalFile(filePath, 'recordings');
            console.log(`✅ Añadido archivo de grabación general: ${file}`);
          }
        }
      } catch (recordingsError: any) {
        console.error('Error al buscar en directorio general de grabaciones:', recordingsError);
      }
            
      // Buscar archivos .csv que puedan contener datos de sensores
      try {
        const dataDir = path.join(process.cwd(), 'data');
        if (fs.existsSync(dataDir)) {
          console.log(`📁 Buscando en directorio de datos: ${dataDir}`);
          const dataFiles = fs.readdirSync(dataDir);
          
          // Filtrar archivos que corresponden a esta sesión
          const sessionDataFiles = dataFiles.filter(file => {
            return (file.includes(`_session${sessionId}`) || file.includes(`-session${sessionId}`)) && 
                   (file.endsWith('.csv') || file.endsWith('.json'));
          });
          
          console.log(`🔍 Encontrados ${sessionDataFiles.length} archivos de datos correspondientes a la sesión ${sessionId}`);
          
          for (const file of sessionDataFiles) {
            const filePath = path.join(dataDir, file);
            zip.addLocalFile(filePath, 'sensors');
            console.log(`✅ Añadido archivo de datos: ${file}`);
          }
        }
      } catch (dataError: any) {
        console.error('Error al buscar en directorio de datos:', dataError);
      }
      
      console.log(`⚡ BÚSQUEDA EXHAUSTIVA COMPLETADA PARA LA SESIÓN ${sessionId}\n\n`);
    } catch (error: any) {
      console.error('Error al añadir archivos adicionales al ZIP:', error);
    }
  }

  /**
   * Añade un archivo README.txt detallado con información sobre la sesión
   */
  private addSessionReadmeFile(zip: AdmZip, session: Session): void {
    // Preparar datos de la sesión para el README
    const startTime = session.startTime ? new Date(session.startTime).toLocaleString() : 'N/A';
    const endTime = session.endTime ? new Date(session.endTime).toLocaleString() : 'N/A';
    
    // Calcular duración si hay tiempo de inicio y fin
    let duration = 'N/A';
    if (session.startTime && session.endTime) {
      const start = new Date(session.startTime).getTime();
      const end = new Date(session.endTime).getTime();
      const durationMs = end - start;
      
      const hours = Math.floor(durationMs / 3600000);
      const minutes = Math.floor((durationMs % 3600000) / 60000);
      const seconds = Math.floor((durationMs % 60000) / 1000);
      
      duration = `${hours}h ${minutes}m ${seconds}s`;
    }
    
    // Extraer información de investigador y participantes de los metadatos
    const metadata = session.metadata as any || {};
    const researcher = metadata?.researcher || 'Not specified';
    const participants = Array.isArray(metadata?.participants) 
      ? metadata.participants.join(', ')
      : 'None';
    
    // Extraer tags
    const tags = Array.isArray(session.tags) ? session.tags.join(', ') : 'None';
    
    // Dispositivos seleccionados
    const devices = metadata?.selectedDevices || {};
    let devicesText = '';
    
    // Construir texto de dispositivos si están disponibles
    if (devices) {
      // Cámaras
      if (Array.isArray(devices.cameras) && devices.cameras.length > 0) {
        devicesText += '\nSelected Cameras:\n';
        devices.cameras.forEach((cam: any) => {
          devicesText += `- ${cam.name || 'Unnamed camera'} (${cam.ipAddress || 'No IP'})\n`;
        });
      }
      
      // Sensores
      if (Array.isArray(devices.sensors) && devices.sensors.length > 0) {
        devicesText += '\nSelected Sensors:\n';
        devices.sensors.forEach((sensor: any) => {
          devicesText += `- ${sensor.name || 'Unnamed sensor'}${sensor.topic ? ` (Topic: ${sensor.topic})` : ''}\n`;
        });
      }
    }
    
    // Crear contenido del README con toda la información relevante
    const readme = `SensorSessionTracker - Session Export
===================================

Session ID: ${session.id}
Session Name: ${session.name || `Session${session.id}`}
Export Date: ${new Date().toISOString()}

Session Details:
- Researcher: ${researcher}
- Participants: ${participants}
- Tags: ${tags}
- Start Time: ${startTime}
- End Time: ${endTime}
- Duration: ${duration}
- Description: ${session.description || 'No description provided'}
${devicesText}
Notes:
${session.notes || 'No notes provided'}

Contents:
- /recordings: Contains video recordings (.mp4)
- /sensors: Contains sensor data files (.csv, .json)
- session_form_data.json: Complete form data from session creation
- session_metadata.json: All technical metadata for the session
- session_summary.csv: Session summary in CSV format for easy import to Excel

This ZIP file was automatically generated by SensorSessionTracker.
`;
    
    zip.addFile('README.txt', Buffer.from(readme));
  }
  
  /**
   * Limpia los archivos temporales
   * @param filePath Ruta del archivo a eliminar
   */
  async cleanupTempFile(filePath: string): Promise<void> {
    try {
      if (fs.existsSync(filePath)) {
        await fsPromises.unlink(filePath);
        console.log(`Archivo temporal eliminado: ${filePath}`);
      }
    } catch (error: any) {
      console.error(`Error al eliminar archivo temporal ${filePath}:`, error);
    }
  }
}

export const archiveService = new ArchiveService();
