import AdmZip from 'adm-zip';
import fs from 'fs';
import path from 'path';
import { promises as fsPromises } from 'fs';
import { Session } from '@shared/schema';
import { v4 as uuidv4 } from 'uuid';

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

      // Buscar grabaciones en el directorio principal, priorizando los prefijos de cámaras
      console.log(`\n→ Buscando grabaciones en directorio principal: ${this.recordingsDir}`);
      
      // Obtener prefijos de cámara de los metadatos de la sesión si existen
      let cameraRecordingPrefixes: string[] = [];
      
      try {
        // Intentar cargar cámaras con sus prefijos de grabación desde la base de datos
        // Esta información no viene en el objeto Session, así que tenemos que buscarla aparte
        if (session.metadata && typeof session.metadata === 'object') {
          const metadata = session.metadata as any;
          
          // Extraer prefijos de la metadata de la sesión
          if (metadata.selectedDevices && Array.isArray(metadata.selectedDevices.cameras)) {
            metadata.selectedDevices.cameras.forEach((camera: any) => {
              if (camera.recordingPrefix && typeof camera.recordingPrefix === 'string') {
                cameraRecordingPrefixes.push(camera.recordingPrefix);
                console.log(`ℹ️ Prefijo de grabación encontrado: ${camera.recordingPrefix}`);
              }
            });
          }
        }
        
        // Si no hay prefijos en metadata, intento cargar las cámaras directamente
        if (cameraRecordingPrefixes.length === 0) {
          try {
            // Cargar cámaras desde archivo ya que no tenemos acceso directo al storage
            const sessionDataPath = path.join(this.sessionsDir, `Session${sessionId}`, 'session_data.json');
            if (fs.existsSync(sessionDataPath)) {
              const sessionData = JSON.parse(fs.readFileSync(sessionDataPath, 'utf8'));
              if (sessionData.cameras && Array.isArray(sessionData.cameras)) {
                sessionData.cameras.forEach((camera: any) => {
                  if (camera.recordingPrefix) {
                    cameraRecordingPrefixes.push(camera.recordingPrefix);
                    console.log(`ℹ️ Prefijo de cámara encontrado: ${camera.recordingPrefix}`);
                  }
                });
              }
            }
          } catch (err) {
            console.log('Error cargando prefijos desde session_data.json:', err);
          }
        }
      } catch (error) {
        console.error('Error obteniendo prefijos de cámara:', error);
      }
      
      // Asegurarse que tenemos prefijos mínimos para buscar
      if (cameraRecordingPrefixes.length === 0) {
        console.log('⚠️ No se encontraron prefijos de cámara, usando patrones genéricos');
        // Añadir algunos patrones predeterminados basados en cámaras comunes
        cameraRecordingPrefixes = [
          'c32_livinglab', // Prefijo visto en la imagen compartida
          'camera-patio', // Posible prefijo basado en la imagen
          'cam',
          'camera',
          'c_',
          'ip_camera'
        ];
      }
      
      const recordingsDir = this.recordingsDir;
      if (fs.existsSync(recordingsDir)) {
        const files = fs.readdirSync(recordingsDir);
        // Patrones de búsqueda para asociar archivos con la sesión
        const sessionPatterns = [
          `session${sessionId}`,
          `s${sessionId}_`,
          `-session${sessionId}-`,
          `_${sessionId}_`,
          `-${sessionId}-`,
          `_${sessionId}.`,
          `-${sessionId}.`,
          `session_${sessionId}`,
          `sesion${sessionId}`,
          `sesion_${sessionId}`,
          `_${sessionId}` // Patrón más simple, pero efectivo
        ];
        
        // Extensiones de video soportadas
        const videoExtensions = ['.mp4', '.mkv', '.avi', '.mov', '.webm', '.flv'];
        
        console.log(`Buscando con ${cameraRecordingPrefixes.length} prefijos de cámara y ${sessionPatterns.length} patrones de sesión`);       
        
        // Buscar archivos de video que coincidan con los criterios
        const videoFiles = files.filter(file => {
          // Verificar si el archivo tiene una extensión de video
          const hasVideoExtension = videoExtensions.some(ext => 
            file.toLowerCase().endsWith(ext)
          );
          
          if (!hasVideoExtension) return false;
          
          // Primera prioridad: Verificar si el archivo incluye tanto un prefijo de cámara como el ID de sesión
          const matchesPrefixAndSession = cameraRecordingPrefixes.some(prefix => 
            prefix && file.includes(prefix) && file.includes(`${sessionId}`)
          );
          
          if (matchesPrefixAndSession) return true;
          
          // Segunda prioridad: Verificar si coincide con algún patrón de sesión estándar
          const matchesSessionPattern = sessionPatterns.some(pattern => 
            file.includes(pattern)
          );
          
          return matchesSessionPattern;
        });
        
        console.log(`Encontrados ${videoFiles.length} archivos de vídeo para la sesión ${sessionId}`);
        
        for (const file of videoFiles) {
          const filePath = path.join(recordingsDir, file);
          if (fs.existsSync(filePath) && fs.statSync(filePath).size > 0) {
            zip.addLocalFile(filePath, 'recordings');
            console.log(`✅ Añadido archivo ${file} al ZIP`);
            recordingsCount++;
          } else {
            console.log(`⚠️ Archivo ${file} no existe o está vacío, saltando...`);
          }
        }
        
        // Buscar también subdirectorios que pudieran contener grabaciones de esta sesión
        const subDirs = files.filter(item => {
          const itemPath = path.join(recordingsDir, item);
          return fs.existsSync(itemPath) && fs.statSync(itemPath).isDirectory() && [
            `session${sessionId}`, `s${sessionId}`, `${sessionId}`
          ].some(pattern => item.includes(pattern));
        });
        
        if (subDirs.length > 0) {
          console.log(`Encontrados ${subDirs.length} subdirectorios potencialmente relacionados con la sesión ${sessionId}`);
          
          for (const subDir of subDirs) {
            const subDirPath = path.join(recordingsDir, subDir);
            const subDirFiles = fs.readdirSync(subDirPath);
            const subDirVideos = subDirFiles.filter(file => 
              videoExtensions.some(ext => file.toLowerCase().endsWith(ext))
            );
            
            console.log(`Encontrados ${subDirVideos.length} archivos de vídeo en subdirectorio ${subDir}`);
            
            for (const file of subDirVideos) {
              const filePath = path.join(subDirPath, file);
              if (fs.existsSync(filePath) && fs.statSync(filePath).size > 0) {
                zip.addLocalFile(filePath, 'recordings');
                console.log(`✅ Añadido archivo ${file} al ZIP (desde subdirectorio ${subDir})`);
                recordingsCount++;
              }
            }
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
          // Buscar todos los tipos de archivos de vídeo
          const videoFiles = recFiles.filter(f => [
            '.mp4', '.mkv', '.avi', '.mov', '.webm', '.flv'
          ].some(ext => f.toLowerCase().endsWith(ext)));
          
          console.log(`Encontrados ${videoFiles.length} archivos de vídeo en directorio específico`);
          
          for (const file of videoFiles) {
            const filePath = path.join(sessionRecordingsDir, file);
            if (fs.existsSync(filePath) && fs.statSync(filePath).size > 0) {
              zip.addLocalFile(filePath, 'recordings');
              console.log(`✅ Añadido archivo ${file} al ZIP (desde directorio de sesión)`);
              recordingsCount++;
            } else {
              console.log(`⚠️ Archivo ${file} no existe o está vacío, saltando...`);
            }
          }
          
          // Buscar también archivos de imágenes (thumbnails)
          const imageFiles = recFiles.filter(f => [
            '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'
          ].some(ext => f.toLowerCase().endsWith(ext)));
          
          if (imageFiles.length > 0) {
            console.log(`Encontrados ${imageFiles.length} archivos de imagen/thumbnails en directorio específico`);
            
            // Crear subdirectorio para thumbnails si hay imágenes
            zip.addFile('recordings/thumbnails/', Buffer.from(''));
            
            for (const file of imageFiles) {
              const filePath = path.join(sessionRecordingsDir, file);
              if (fs.existsSync(filePath) && fs.statSync(filePath).size > 0) {
                zip.addLocalFile(filePath, 'recordings/thumbnails');
                console.log(`✅ Añadido thumbnail ${file} al ZIP`);
              }
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
    
    // Obtener información adicional sobre etiquetas si existen
    const tags = session.tags && Array.isArray(session.tags) && session.tags.length > 0 ?
      session.tags.join(', ') : 'Sin etiquetas';
    
    // Obtener notas si existen
    const notes = session.notes ? session.notes : 'Sin notas adicionales';
    
    // Construir rutas de búsqueda para que el usuario pueda entender dónde se buscan los archivos
    const searchPaths = [
      `- ${this.recordingsDir} (directorio principal de grabaciones)`,
      `- ${path.join(this.sessionsDir, `Session${sessionId}`)} (directorio específico de la sesión)`,
      `- ${path.join(this.sessionsDir, `Session${sessionId}`, 'recordings')} (grabaciones específicas de la sesión)`,
      `- ${this.dataDir} (directorio de datos globales)`
    ].join('\n      ');
    
    // Extraer prefijos de grabación configurados por el usuario
    let cameraRecordingPrefixes: string[] = [];
    
    try {
      // Intentar obtener prefijos de grabación de la metadata de la sesión
      if (session.metadata && typeof session.metadata === 'object') {
        const metadata = session.metadata as any;
        
        if (metadata.selectedDevices && Array.isArray(metadata.selectedDevices.cameras)) {
          metadata.selectedDevices.cameras.forEach((camera: any) => {
            if (camera.recordingPrefix && typeof camera.recordingPrefix === 'string') {
              cameraRecordingPrefixes.push(camera.recordingPrefix);
            }
          });
        }
      }
      
      // Si no hay prefijos en metadata, intentar cargar desde session_data.json
      if (cameraRecordingPrefixes.length === 0) {
        const sessionDataPath = path.join(this.sessionsDir, `Session${sessionId}`, 'session_data.json');
        if (fs.existsSync(sessionDataPath)) {
          try {
            const sessionData = JSON.parse(fs.readFileSync(sessionDataPath, 'utf8'));
            if (sessionData.cameras && Array.isArray(sessionData.cameras)) {
              sessionData.cameras.forEach((camera: any) => {
                if (camera.recordingPrefix) {
                  cameraRecordingPrefixes.push(camera.recordingPrefix);
                }
              });
            }
          } catch (err) {
            console.error('Error cargando prefijos desde session_data.json:', err);
          }
        }
      }
    } catch (error) {
      console.error('Error obteniendo prefijos de cámara para README:', error);
    }
    
    // Si no se encontraron prefijos, usar algunos valores predeterminados
    if (cameraRecordingPrefixes.length === 0) {
      cameraRecordingPrefixes = ['c32_livinglab', 'camera-patio', 'cam', 'c'];
    }
    
    // Información de prefijos para el README
    const prefixInfo = cameraRecordingPrefixes.length > 0 ? 
      `Los siguientes prefijos de cámara se utilizan para identificar grabaciones:\n      - ${cameraRecordingPrefixes.join('\n      - ')}` :
      'No se encontraron prefijos de cámara personalizados.';
    
    // Patrones de búsqueda para asociar archivos con esta sesión
    const patternExamples = [
      `session${sessionId}`,
      `s${sessionId}_`,
      `session_${sessionId}`,
      `_${sessionId}_`,
      `_${sessionId}.`,
      `cam*_${sessionId}.mp4`
    ].join('\n      - ');
    
    const readme = 
      `# Datos exportados de sesión: ${sessionName}\n\n` +
      `## Información de la sesión\n` +
      `- ID: ${sessionId}\n` +
      `- Nombre: ${sessionName}\n` +
      `- Descripción: ${session.description || 'Sin descripción'}\n` +
      `- Fecha de creación: ${createDate}\n` +
      `- Hora de inicio: ${startTime}\n` +
      `- Hora de finalización: ${endTime}\n` +
      `- Estado: ${status}\n` +
      `- Etiquetas: ${tags}\n` +
      `- Notas: ${notes}\n\n` +
      `## Contenido\n` +
      `- /recordings/: Grabaciones de vídeo vinculadas a esta sesión\n` +
      `  - Incluye grabaciones MP4, MKV, AVI y otros formatos soportados\n` +
      `  - Subdirectorio /thumbnails/ contiene imágenes y miniaturas si están disponibles\n` +
      `- /data/: Datos de sensores y metadatos\n` +
      `  - zigbee-data.json: Datos completos en formato JSON\n` +
      `  - zigbee-sensors.csv: Datos en formato CSV para análisis\n` +
      `  - session_metadata.json: Metadatos detallados de la sesión\n` +
      `  - /sensor_data/: Datos específicos de sensores para esta sesión\n` +
      `- export_summary.json: Resumen estadístico de los archivos exportados\n\n` +
      `## Directorio de búsqueda\n` +
      `Los archivos de esta sesión se han buscado en las siguientes ubicaciones:\n` +
      `      ${searchPaths}\n\n` +
      `## Prefijos de cámara configurados\n` +
      `${prefixInfo}\n\n` +
      `## Patrones de identificación de archivos\n` +
      `Las grabaciones se vinculan a esta sesión cuando sus nombres contienen:\n` +
      `   1. Un prefijo de cámara (ver sección anterior) Y el ID de sesión ${sessionId}\n` +
      `   2. O alguno de estos patrones estándar:\n` +
      `      - ${patternExamples}\n\n` +
      `## Notas importantes\n` +
      `- El ID de sesión ${sessionId} es clave para identificar archivos asociados\n` +
      `- Para cambiar el formato de nombres de archivos, modifique la configuración de prefijos\n` +
      `  en: Device Management > Cameras > Recording Prefix\n` +
      `- El sistema busca primero archivos que tengan tanto el prefijo de cámara como el ID ${sessionId}\n` +
      `- Las grabaciones se guardan en ./recordings/ con el prefijo configurado por el usuario\n\n` +
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
