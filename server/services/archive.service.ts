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
      // Usar el nombre de la sesión para el archivo, si no hay nombre usar sessionId
      const sessionName = session.name ? 
        session.name.replace(/[\\/:*?"<>|]/g, '_') : // Reemplazar caracteres inválidos para nombre de archivo
        `Session_${sessionId}`;
        
      const zipFileName = `${sessionName}_${sessionId}_${Date.now()}.zip`;
      const zipPath = path.join(this.tempDir, zipFileName);
      
      console.log(`Creando ZIP para la sesión "${sessionName}" (ID: ${sessionId})`);
      
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
    
    // Contadores para verificar contenido real
    let recordingsCount = 0;
    let dataFilesCount = 0;
    let sensorDataCount = 0;
    
    console.log(`\n→ Iniciando generación de ZIP para sesión ${sessionId} (${session.name || 'Sin nombre'})`);
    
    // Crear estructura de carpetas en el ZIP
    zip.addFile('recordings/', Buffer.from(''));
    zip.addFile('data/', Buffer.from(''));
    zip.addFile('data/sensor_data/', Buffer.from(''));
    
    // Añadir archivo README.txt detallado
    this.addReadmeFile(zip, session);
    
    try {
      // Añadir archivos de datos globales
      const dataDir = this.dataDir;
      console.log(`\n→ Buscando datos globales en: ${dataDir}`);
      
      // 1. Verificar y añadir zigbee-data.json (datos unificados JSON)
      const zigbeeDataPath = path.join(dataDir, 'zigbee-data.json');
      if (fs.existsSync(zigbeeDataPath)) {
        zip.addLocalFile(zigbeeDataPath, 'data');
        console.log('✅ Añadido zigbee-data.json al ZIP');
        dataFilesCount++;
      } else {
        console.log('⚠️ Archivo zigbee-data.json no encontrado');
        // Crear un archivo JSON vacío para evitar errores
        zip.addFile('data/zigbee-data.json', Buffer.from(JSON.stringify({
          note: "No se encontraron datos de sensores en formato JSON para esta sesión",
          sessionId: sessionId,
          exportDate: new Date().toISOString()
        }, null, 2)));
        console.log('ℹ️ Creado zigbee-data.json vacío como placeholder');
        dataFilesCount++;
      }
      
      // 2. Verificar y añadir zigbee-sensors.csv (datos unificados CSV)
      const zigbeeSensorsPath = path.join(dataDir, 'zigbee-sensors.csv');
      if (fs.existsSync(zigbeeSensorsPath)) {
        zip.addLocalFile(zigbeeSensorsPath, 'data');
        console.log('✅ Añadido zigbee-sensors.csv al ZIP');
        dataFilesCount++;
      } else {
        console.log('⚠️ Archivo zigbee-sensors.csv no encontrado');
        // Crear un archivo CSV vacío para evitar errores
        zip.addFile('data/zigbee-sensors.csv', Buffer.from(
          "timestamp,topic,value,unit,device\n" +
          `${new Date().toISOString()},info,No hay datos de sensores disponibles,N/A,system\n`
        ));
        console.log('ℹ️ Creado zigbee-sensors.csv vacío como placeholder');
        dataFilesCount++;
      }
      
      // 3. Verificar y añadir devices.json (lista de dispositivos)
      const devicesPath = path.join(dataDir, 'devices.json');
      if (fs.existsSync(devicesPath)) {
        zip.addLocalFile(devicesPath, 'data');
        console.log('✅ Añadido devices.json al ZIP');
        dataFilesCount++;
      }

      // Buscar grabaciones en el directorio principal con varios patrones de sesión
      console.log(`\n→ Buscando grabaciones en directorio principal: ${this.recordingsDir}`);
      
      const recordingsDir = this.recordingsDir;
      if (fs.existsSync(recordingsDir)) {
        const files = fs.readdirSync(recordingsDir);
        const mp4Files = files.filter(file => {
          return file.endsWith('.mp4') && (
            file.includes(`session${sessionId}`) || 
            file.includes(`s${sessionId}_`) ||
            file.includes(`-session${sessionId}-`) ||
            file.includes(`_${sessionId}_`) ||
            file.includes(`-${sessionId}-`)
          );
        });
        
        console.log(`Encontrados ${mp4Files.length} archivos MP4 para la sesión ${sessionId}`);
        
        for (const file of mp4Files) {
          const filePath = path.join(recordingsDir, file);
          if (fs.existsSync(filePath) && fs.statSync(filePath).size > 0) {
            zip.addLocalFile(filePath, 'recordings');
            console.log(`✅ Añadido archivo ${file} al ZIP`);
            recordingsCount++;
          } else {
            console.log(`⚠️ Archivo ${file} no existe o está vacío, saltando...`);
          }
        }
      } else {
        console.log(`⚠️ Directorio de grabaciones no encontrado: ${recordingsDir}`);
      }
      
      // Buscar en directorio de sesiones si existe
      const sessionDir = path.join(this.sessionsDir, `Session${sessionId}`);
      console.log(`\n→ Buscando datos específicos de la sesión en: ${sessionDir}`);
      
      if (fs.existsSync(sessionDir)) {
        // Añadir session_data.json
        const sessionDataPath = path.join(sessionDir, 'session_data.json');
        if (fs.existsSync(sessionDataPath)) {
          zip.addLocalFile(sessionDataPath, 'data');
          console.log('✅ Añadido session_data.json al ZIP');
          dataFilesCount++;
        } else {
          console.log('⚠️ Archivo session_data.json no encontrado');
        }
        
        // Añadir datos de sensores si existen
        const sensorDataDir = path.join(sessionDir, 'sensor_data');
        console.log(`→ Buscando datos de sensores en: ${sensorDataDir}`);
        
        if (fs.existsSync(sensorDataDir)) {
          const sensorFiles = fs.readdirSync(sensorDataDir);
          console.log(`Encontrados ${sensorFiles.length} archivos de sensores`);
          
          for (const file of sensorFiles) {
            const filePath = path.join(sensorDataDir, file);
            if (fs.existsSync(filePath) && fs.statSync(filePath).size > 0) {
              zip.addLocalFile(filePath, 'data/sensor_data');
              console.log(`✅ Añadido ${file} al ZIP`);
              sensorDataCount++;
            }
          }
        } else {
          console.log('⚠️ Directorio de datos de sensores no encontrado');
        }
        
        // Añadir grabaciones del directorio específico de sesiones
        const sessionRecordingsDir = path.join(sessionDir, 'recordings');
        console.log(`→ Buscando grabaciones en directorio de sesión: ${sessionRecordingsDir}`);
        
        if (fs.existsSync(sessionRecordingsDir)) {
          const recFiles = fs.readdirSync(sessionRecordingsDir);
          const mp4Files = recFiles.filter(f => f.endsWith('.mp4'));
          
          console.log(`Encontrados ${mp4Files.length} archivos MP4 en directorio específico`);
          
          for (const file of mp4Files) {
            const filePath = path.join(sessionRecordingsDir, file);
            if (fs.existsSync(filePath) && fs.statSync(filePath).size > 0) {
              zip.addLocalFile(filePath, 'recordings');
              console.log(`✅ Añadido archivo ${file} al ZIP (desde directorio de sesión)`);
              recordingsCount++;
            } else {
              console.log(`⚠️ Archivo ${file} no existe o está vacío, saltando...`);
            }
          }
        } else {
          console.log('⚠️ Directorio de grabaciones específicas no encontrado');
        }
      } else {
        console.log(`⚠️ Directorio de sesión no encontrado: ${sessionDir}`);
      }
      
      // Añadir metadatos detallados
      const metadataContent = JSON.stringify({
        id: sessionId,
        name: session.name || `Sesión ${sessionId}`,
        description: session.description || '',
        startTime: session.startTime ? new Date(session.startTime).toISOString() : null,
        endTime: session.endTime ? new Date(session.endTime).toISOString() : null,
        status: session.status || 'unknown',
        recordings: recordingsCount,
        dataFiles: dataFilesCount,
        sensorData: sensorDataCount,
        searchPaths: {
          recordings: this.recordingsDir,
          sessionSpecific: path.join(this.sessionsDir, `Session${sessionId}`),
          data: this.dataDir
        },
        exportDate: new Date().toISOString(),
        exportTimestamp: Date.now()
      }, null, 2);
      
      zip.addFile('data/session_metadata.json', Buffer.from(metadataContent));
      dataFilesCount++;
      
      // Añadir archivo de resumen estadístico
      const statsContent = JSON.stringify({
        sessionId: sessionId,
        totalFiles: recordingsCount + dataFilesCount + sensorDataCount + 1, // +1 por README
        recordings: recordingsCount,
        dataFiles: dataFilesCount,
        sensorData: sensorDataCount,
        exportDate: new Date().toISOString()
      }, null, 2);
      
      zip.addFile('export_summary.json', Buffer.from(statsContent));
      
      // Verificar si hay contenido real
      if (recordingsCount === 0) {
        console.log('\n⚠️ ADVERTENCIA: No se encontraron grabaciones para esta sesión');
        // Añadir un archivo placeholder para que no esté vacía la carpeta
        zip.addFile('recordings/NO_RECORDINGS_FOUND.txt', Buffer.from(
          `No se encontraron grabaciones para la sesión ${sessionId}\n` +
          `Verifique que los archivos de grabación incluyan "session${sessionId}" en su nombre\n` +
          `o estén ubicados en la carpeta ${path.join(this.sessionsDir, `Session${sessionId}`, 'recordings')}\n\n` +
          `Exportado el ${new Date().toLocaleString()}`
        ));
      }
      
      // Guardar el ZIP
      zip.writeZip(zipPath);
      console.log(`\n✅ ZIP guardado exitosamente en: ${zipPath}`);
      console.log(`→ Resumen de contenido: ${recordingsCount} grabaciones, ${dataFilesCount} archivos de datos, ${sensorDataCount} archivos de sensores\n`);
      
    } catch (error: any) {
      console.error('\n❌ Error durante la creación del ZIP:', error);
      throw error;
    }
  }

  /**
   * Añade un archivo README.txt
   */
  private addReadmeFile(zip: AdmZip, session: Session): void {
    const sessionName = session.name || 'Sin título';
    const sessionId = session.id || 'desconocido';
    
    // Información más detallada sobre la sesión
    // Usamos startTime como fecha de creación ya que createdAt no está disponible
    const createDate = session.startTime ? new Date(session.startTime).toLocaleString() : 'Desconocida';
    const startTime = session.startTime ? new Date(session.startTime).toLocaleString() : 'No iniciada';
    const endTime = session.endTime ? new Date(session.endTime).toLocaleString() : 'En curso';
    const status = session.status || 'Desconocido';
    
    const readme = 
      `# Datos exportados de sesión: ${sessionName}\n\n` +
      `## Información de la sesión\n` +
      `- ID: ${sessionId}\n` +
      `- Nombre: ${sessionName}\n` +
      `- Descripción: ${session.description || 'Sin descripción'}\n` +
      `- Fecha de creación: ${createDate}\n` +
      `- Hora de inicio: ${startTime}\n` +
      `- Hora de finalización: ${endTime}\n` +
      `- Estado: ${status}\n\n` +
      `## Contenido\n` +
      `- /recordings: Grabaciones de vídeo vinculadas a esta sesión\n` +
      `- /data: Datos de sensores y metadatos\n` +
      `  - zigbee-data.json: Datos completos en formato JSON\n` +
      `  - zigbee-sensors.csv: Datos en formato CSV para análisis\n` +
      `  - session_metadata.json: Metadatos de la sesión\n\n` +
      `## Notas importantes\n` +
      `- Las grabaciones se vinculan a la sesión cuando incluyen el ID ${sessionId} en su nombre\n` +
      `- Los archivos sin conexión directa a esta sesión no se incluyen en esta exportación\n` +
      `- Para cambiar el formato de nombres de archivos, modifique la configuración de prefijos de cámara\n\n` +
      `Exportación generada el ${new Date().toLocaleString()}\n` +
      `Sistema: SensorSessionTracker v2.1\n`;
    
    console.log('Añadiendo README.txt con información detallada de la sesión');
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
