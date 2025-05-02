import AdmZip from 'adm-zip';
import fs from 'fs';
import path from 'path';
import { promises as fsPromises } from 'fs';
import { Session } from '@shared/schema';

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
 */
class ArchiveService {
  private recordingsDir: string;
  private sessionsDir: string;
  private uploadsDir: string;
  private tempDir: string;
  private dataDir: string;
  
  // Mapa para guardar el progreso de creación de cada ZIP
  private zipProgressMap: Map<number | string, ZipProgress> = new Map();

  constructor() {
    // Directorios base para búsqueda de archivos
    this.recordingsDir = path.join(process.cwd(), 'recordings');
    this.sessionsDir = path.join(process.cwd(), 'sessions');
    this.uploadsDir = path.join(process.cwd(), 'uploads');
    this.tempDir = path.join(process.cwd(), 'temp');
    this.dataDir = path.join(process.cwd(), 'data');
    
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
      this.tempDir,
      this.dataDir
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
    // Inicializar el progreso en estado pendiente
    this.zipProgressMap.set(sessionId, {
      total: 0,
      processed: 0,
      status: 'pending',
      message: 'Iniciando creación de ZIP...'
    });
    
    try {
      // Crear directorio temporal si no existe
      if (!fs.existsSync(this.tempDir)) {
        fs.mkdirSync(this.tempDir, { recursive: true });
      }
      
      // Nombre del archivo ZIP basado en la sesión
      const zipFileName = `session_${sessionId}_${Date.now()}.zip`;
      const zipPath = path.join(this.tempDir, zipFileName);
      
      // Generar el ZIP (asincrónico)
      await this.generateSessionZip(zipPath, sessionId, session);
      
      // Actualizar el progreso a completado
      this.zipProgressMap.set(sessionId, {
        total: 100,
        processed: 100,
        status: 'completed',
        message: 'ZIP creado exitosamente'
      });
      
      return zipPath;
    } catch (error: any) {
      // Manejar error y actualizar el progreso
      this.zipProgressMap.set(sessionId, {
        total: 0,
        processed: 0,
        status: 'error',
        message: 'Error al crear ZIP',
        error: error.message || 'Error desconocido'
      });
      console.error(`Error creando ZIP para la sesión ${sessionId}:`, error);
      throw new Error(`Error al crear ZIP: ${error.message || 'Error desconocido'}`);
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
   */
  private async generateSessionZip(
    zipPath: string,
    sessionId: number | string,
    session: Session
  ): Promise<void> {
    // Crear instancia de AdmZip
    const zip = new AdmZip();
    
    // Crear estructura de carpetas en el ZIP
    zip.addFile('recordings/', Buffer.from(''));
    zip.addFile('data/', Buffer.from(''));
    zip.addFile('data/sensor_data/', Buffer.from(''));
    
    // Añadir archivo README.txt detallado
    this.addReadmeFile(zip, session);
    
    try {
      // Añadir archivos de datos globales
      const dataDir = this.dataDir;
      
      // 1. Verificar y añadir zigbee-data.json (datos unificados JSON)
      const zigbeeDataPath = path.join(dataDir, 'zigbee-data.json');
      if (fs.existsSync(zigbeeDataPath)) {
        zip.addLocalFile(zigbeeDataPath, 'data');
        console.log('✅ Añadido zigbee-data.json al ZIP');
      }
      
      // 2. Verificar y añadir zigbee-sensors.csv (datos unificados CSV)
      const zigbeeSensorsPath = path.join(dataDir, 'zigbee-sensors.csv');
      if (fs.existsSync(zigbeeSensorsPath)) {
        zip.addLocalFile(zigbeeSensorsPath, 'data');
        console.log('✅ Añadido zigbee-sensors.csv al ZIP');
      }
      
      // 3. Verificar y añadir devices.json (lista de dispositivos)
      const devicesPath = path.join(dataDir, 'devices.json');
      if (fs.existsSync(devicesPath)) {
        zip.addLocalFile(devicesPath, 'data');
        console.log('✅ Añadido devices.json al ZIP');
      }

      // Buscar grabaciones en el directorio principal con varios patrones de sesión
      const recordingsDir = this.recordingsDir;
      if (fs.existsSync(recordingsDir)) {
        const files = fs.readdirSync(recordingsDir);
        const mp4Files = files.filter(file => {
          return file.endsWith('.mp4') && (
            file.includes(`session${sessionId}`) || 
            file.includes(`s${sessionId}_`) ||
            file.includes(`-session${sessionId}-`)
          );
        });
        
        console.log(`Encontrados ${mp4Files.length} archivos MP4 para la sesión ${sessionId}`);
        
        for (const file of mp4Files) {
          const filePath = path.join(recordingsDir, file);
          zip.addLocalFile(filePath, 'recordings');
          console.log(`✅ Añadido archivo ${file} al ZIP`);
        }
      }
      
      // Buscar en directorio de sesiones si existe
      const sessionDir = path.join(this.sessionsDir, `Session${sessionId}`);
      if (fs.existsSync(sessionDir)) {
        const sessionDataPath = path.join(sessionDir, 'session_data.json');
        if (fs.existsSync(sessionDataPath)) {
          zip.addLocalFile(sessionDataPath, 'data');
          console.log('✅ Añadido session_data.json al ZIP');
        }
        
        // Añadir datos de sensores si existen
        const sensorDataDir = path.join(sessionDir, 'sensor_data');
        if (fs.existsSync(sensorDataDir)) {
          const sensorFiles = fs.readdirSync(sensorDataDir);
          for (const file of sensorFiles) {
            const filePath = path.join(sensorDataDir, file);
            zip.addLocalFile(filePath, 'data/sensor_data');
            console.log(`✅ Añadido ${file} al ZIP`);
          }
        }
        
        // Añadir grabaciones del directorio específico de sesiones
        const sessionRecordingsDir = path.join(sessionDir, 'recordings');
        if (fs.existsSync(sessionRecordingsDir)) {
          const recFiles = fs.readdirSync(sessionRecordingsDir);
          for (const file of recFiles.filter(f => f.endsWith('.mp4'))) {
            const filePath = path.join(sessionRecordingsDir, file);
            zip.addLocalFile(filePath, 'recordings');
            console.log(`✅ Añadido archivo ${file} al ZIP (desde directorio de sesión)`);
          }
        }
      }
      
      // Añadir metadatos
      const metadataContent = JSON.stringify({
        id: sessionId,
        name: session.name || `Sesión ${sessionId}`,
        description: session.description || '',
        exportDate: new Date().toISOString()
      }, null, 2);
      
      zip.addFile('data/session_metadata.json', Buffer.from(metadataContent));
      
      // Guardar el ZIP
      zip.writeZip(zipPath);
      console.log(`✅ ZIP guardado exitosamente en: ${zipPath}`);
      
    } catch (error: any) {
      console.error('Error durante la creación del ZIP:', error);
      throw error;
    }
  }

  /**
   * Añade un archivo README.txt
   */
  private addReadmeFile(zip: AdmZip, session: Session): void {
    const sessionName = session.name || 'Sin título';
    const readme = 
      `# Datos exportados de sesión: ${sessionName}\n\n` +
      `## Información de la sesión\n` +
      `- Nombre: ${sessionName}\n` +
      `- Descripción: ${session.description || 'Sin descripción'}\n\n` +
      `## Contenido\n` +
      `- /recordings: Grabaciones de vídeo\n` +
      `- /data: Datos de sensores y metadatos\n` +
      `  - zigbee-data.json: Datos completos en formato JSON\n` +
      `  - zigbee-sensors.csv: Datos en formato CSV para análisis\n` +
      `  - session_metadata.json: Metadatos de la sesión\n` +
      `\n` +
      `Exportación generada el ${new Date().toLocaleString()}\n`;
    
    zip.addFile('README.txt', Buffer.from(readme));
  }

  /**
   * Limpia los archivos temporales
   */
  async cleanupTempFile(filePath: string): Promise<void> {
    try {
      if (fs.existsSync(filePath)) {
        await fsPromises.unlink(filePath);
        console.log(`Archivo temporal eliminado: ${filePath}`);
      }
    } catch (error) {
      console.error(`Error al eliminar archivo temporal ${filePath}:`, error);
    }
  }
}

// Singleton
export const archiveService = new ArchiveService();
