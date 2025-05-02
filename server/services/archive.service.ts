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
    // Crear carpetas principales con una estructura simple y clara
    zip.addFile('recordings/', Buffer.from(''));
    zip.addFile('data/', Buffer.from(''));
    zip.addFile('data/sensor_data/', Buffer.from(''));
    
    // Nombre seguro para el archivo ZIP
    const sessionName = session.name || `Session${session.id}`;
    const safeName = sessionName
      .replace(/[^a-z0-9]/gi, '_')
      .replace(/_+/g, '_')
      .toLowerCase();
    
    // Crear un archivo de metadatos con información básica de la sesión
    const metadataContent = JSON.stringify({
      id: session.id,
      name: session.name,
      description: session.description,
      startTime: session.startTime,
      endTime: session.endTime,
      status: session.status,
      exportDate: new Date().toISOString(),
      exportVersion: '2.0.0'
    }, null, 2);
    
    // Añadir el archivo de metadatos
    zip.addFile('data/session_metadata.json', Buffer.from(metadataContent));
  }

  /**
   * Añade archivos adicionales de la sesión al ZIP
   */
  private async addAdditionalSessionFiles(zip: AdmZip, sessionId: number | string, session: Session): Promise<void> {
    try {
      console.log(`\n\n⚡ INICIANDO BÚSQUEDA EXHAUSTIVA DE ARCHIVOS PARA LA SESIÓN ${sessionId}`);
      const sessionDir = await sessionService.getSessionDirectory(sessionId);
      console.log(`📁 Directorio de sesión: ${sessionDir}`);
      
      // Buscar los archivos consolidados primero (nuevos archivos unificados)
      const dataDir = path.join(process.cwd(), 'data');
      
      // 1. Verificar y añadir zigbee-data.json (datos unificados JSON)
      const zigbeeDataPath = path.join(dataDir, 'zigbee-data.json');
      if (fs.existsSync(zigbeeDataPath)) {
        zip.addLocalFile(zigbeeDataPath, 'data');
        console.log('✅ Añadido zigbee-data.json (datos consolidados) al ZIP');
      } else {
        console.log('⚠️ No se encontró el archivo zigbee-data.json');
      }
      
      // 2. Verificar y añadir zigbee-sensors.csv (datos unificados CSV)
      const zigbeeSensorsPath = path.join(dataDir, 'zigbee-sensors.csv');
      if (fs.existsSync(zigbeeSensorsPath)) {
        zip.addLocalFile(zigbeeSensorsPath, 'data');
        console.log('✅ Añadido zigbee-sensors.csv (datos consolidados) al ZIP');
      } else {
        console.log('⚠️ No se encontró el archivo zigbee-sensors.csv');
      }
      
      // 3. Verificar y añadir devices.json (lista de dispositivos)
      const devicesPath = path.join(dataDir, 'devices.json');
      if (fs.existsSync(devicesPath)) {
        zip.addLocalFile(devicesPath, 'data');
        console.log('✅ Añadido devices.json (lista de dispositivos) al ZIP');
      } else {
        console.log('⚠️ No se encontró el archivo devices.json');
      }
      
      // 4. Verificar y añadir bridge.json (estado del puente zigbee)
      const bridgePath = path.join(dataDir, 'bridge.json');
      if (fs.existsSync(bridgePath)) {
        zip.addLocalFile(bridgePath, 'data');
        console.log('✅ Añadido bridge.json (estado del puente) al ZIP');
      } else {
        console.log('⚠️ No se encontró el archivo bridge.json');
      }
      
      // Buscar y añadir solo los archivos MP4 relacionados con esta sesión
      const recordingsDir = path.join(process.cwd(), 'recordings');
      if (fs.existsSync(recordingsDir)) {
        console.log(`📁 Buscando grabaciones de la sesión ${sessionId} en: ${recordingsDir}`);
        const recordingFiles = fs.readdirSync(recordingsDir);
        console.log(`🔍 Encontrados ${recordingFiles.length} archivos en el directorio de grabaciones`);
        
        // Implementación mejorada para encontrar grabaciones de la sesión
        // 1. Buscar en la base de datos de grabaciones para esta sesión
        // 2. Buscar por patrones en nombres de archivo
        // 3. Buscar por prefijos de cámara
        // 4. Buscar por fechas coincidentes

        // Obtener datos de selección de cámaras y metadatos
        console.log(`💡 Analizando sesión ${sessionId} para buscar sus grabaciones específicas`);

        // Obtener rango de fechas de la sesión
        const sessionStartTime = session.startTime ? new Date(session.startTime) : null;
        const sessionEndTime = session.endTime ? new Date(session.endTime) : new Date();
        console.log(`📅 Rango de fechas de la sesión: ${sessionStartTime?.toISOString() || 'N/A'} - ${sessionEndTime.toISOString()}`);

        // 1. ESTRATEGIA: Buscar por patrones en nombres de archivo
        const sessionPatterns = [
          `_session${sessionId}_`, 
          `-session${sessionId}-`,
          `_s${sessionId}_`, 
          `-s${sessionId}-`,
          `_sesion${sessionId}_`, 
          `-sesion${sessionId}-`,
          `session${sessionId}.mp4`,
          `s${sessionId}.mp4`,
        ];

        // 2. ESTRATEGIA: Buscar por prefijos de cámara y metadatos de la sesión
        const recordingPrefixes: string[] = [];
        const selectedCameraIds: number[] = [];

        try {
          // Obtener las cámaras seleccionadas en la sesión
          if (session.metadata && typeof session.metadata === 'object') {
            const metadata = session.metadata as any;
            if (metadata.selectedDevices && Array.isArray(metadata.selectedDevices.cameras)) {
              // Agregar IDs de cámaras seleccionadas
              metadata.selectedDevices.cameras.forEach((camera: any) => {
                if (camera.id) {
                  selectedCameraIds.push(Number(camera.id));
                  console.log(`📷 Cámara seleccionada en la sesión: ID ${camera.id}`);
                }
                
                // Agregar prefijos configurados
                if (camera.recordingPrefix && typeof camera.recordingPrefix === 'string') {
                  const prefix = camera.recordingPrefix.trim();
                  if (prefix) {
                    recordingPrefixes.push(prefix);
                    console.log(`🔍 Prefijo de grabación encontrado: ${prefix}`);
                  }
                }
                
                // También usar nombres como posibles prefijos
                if (camera.name && typeof camera.name === 'string') {
                  const normalizedName = camera.name.toLowerCase().replace(/\s+/g, '-').trim();
                  if (normalizedName && !recordingPrefixes.includes(normalizedName)) {
                    recordingPrefixes.push(normalizedName);
                    console.log(`🔍 Nombre de cámara usado como posible prefijo: ${normalizedName}`);
                  }
                }
              });
            }
          }
        } catch (prefixError) {
          console.error('Error al extraer información de cámaras:', prefixError);
        }

        // También buscar cámaras con prefijos estándar si no encontramos configurados
        if (recordingPrefixes.length === 0) {
          // Prefijos estándar para cámaras
          const standardPrefixes = [
            'c32_livinglab', 'c32-livinglab', 'c32', 
            'c31_patio', 'c31-patio', 'c31',
            'camera_salon', 'camera-salon', 'camera'
          ];
          recordingPrefixes.push(...standardPrefixes);
          console.log(`🔍 Añadidos ${standardPrefixes.length} prefijos estándar de cámara para búsqueda`);
        }

        // 3. ESTRATEGIA: Extraer todas las grabaciones y buscarlas con varios criterios
        // Buscar grabaciones en la base de datos que coincidan con esta sesión
        const recordingsFromStorage = [];
        try {
          // Importar bajo demanda para evitar dependencias circulares
          const storage = await import('../storage').then(m => m.default || m);
          if (storage.getRecordingsForSession) {
            const sessionRecordings = await storage.getRecordingsForSession(sessionId);
            if (sessionRecordings && sessionRecordings.length > 0) {
              recordingsFromStorage.push(...sessionRecordings);
              console.log(`💾 Encontradas ${sessionRecordings.length} grabaciones en la base de datos para la sesión ${sessionId}`);
              
              // Agregar los directorios y nombres de archivo explícitos
              sessionRecordings.forEach(rec => {
                if (rec.filePath) {
                  // Extraer el nombre del archivo de la ruta completa
                  const fileName = rec.filePath.split('/').pop() || '';
                  console.log(`✅ Grabación encontrada en BD: ${fileName}`);
                }
              });
            } else {
              console.log(`⚠️ No se encontraron grabaciones en la base de datos para la sesión ${sessionId}`);
            }
          }
        } catch (storageError) {
          console.error('Error al buscar grabaciones en la base de datos:', storageError);
        }

        // 4. ESTRATEGIA: Obtener todos los archivos MP4 y filtrar por varios criterios
        console.log(`🔍 Filtrado avanzado de ${recordingFiles.length} archivos en recordings/`);
        
        // Lista para almacenar los archivos relevantes
        const relevantFiles: string[] = [];
        
        // Primero, añadir los archivos encontrados en la base de datos
        const dbFilePaths = recordingsFromStorage
          .filter(rec => rec.filePath)
          .map(rec => rec.filePath.split('/').pop() || '');
        
        // Añadir archivos que coinciden exactamente con las rutas en la base de datos
        for (const dbFile of dbFilePaths) {
          if (dbFile && recordingFiles.includes(dbFile)) {
            relevantFiles.push(dbFile);
            console.log(`✅ Añadido archivo de la base de datos: ${dbFile}`);
          }
        }
        
        // Filtrar por criterios múltiples
        for (const file of recordingFiles) {
          // Evitar duplicados
          if (relevantFiles.includes(file)) continue;
          
          // Solo procesar archivos MP4
          if (!file.toLowerCase().endsWith('.mp4')) continue;
          
          // Comprobar si ya está incluido por coincidencia exacta con la base de datos
          if (dbFilePaths.includes(file)) {
            relevantFiles.push(file);
            console.log(`✅ Coincidencia exacta con BD: ${file}`);
            continue;
          }
          
          // Comprobar si el nombre del archivo coincide con algún patrón de sesión
          const matchesSessionPattern = sessionPatterns.some(pattern => file.includes(pattern));
          if (matchesSessionPattern) {
            relevantFiles.push(file);
            console.log(`✅ Coincide con patrón de sesión: ${file}`);
            continue;
          }
          
          // Comprobar si el nombre del archivo coincide con algún prefijo de cámara
          let prefixMatch = false;
          for (const prefix of recordingPrefixes) {
            if (
              file.startsWith(prefix) || 
              file.includes(`_${prefix}`) || 
              file.includes(`-${prefix}`)
            ) {
              prefixMatch = true;
              console.log(`✅ Coincide con prefijo de cámara '${prefix}': ${file}`);
              break;
            }
          }
          
          if (prefixMatch) {
            relevantFiles.push(file);
            continue;
          }
          
          // 5. ESTRATEGIA: Para sesiones recientes, usar el último archivo mp4 creado si coincide con la cámara seleccionada
          if (sessionStartTime && (Date.now() - sessionStartTime.getTime() < 3600000)) { // 1 hora
            // Si la sesión es reciente (menos de 1 hora), buscar las últimas grabaciones
            try {
              const filePath = path.join(recordingsDir, file);
              const stats = fs.statSync(filePath);
              
              // Si el archivo fue creado durante o después del inicio de la sesión
              if (stats.ctime >= sessionStartTime && stats.ctime <= new Date()) {
                console.log(`✅ Archivo creado durante el período de la sesión: ${file}`);
                relevantFiles.push(file);
                continue;
              }
            } catch (statError) {
              console.error(`Error al verificar fecha de archivo ${file}:`, statError);
            }
          }
          
          // 6. ESTRATEGIA: Buscar patrones adicionales como IDs de cámara
          for (const cameraId of selectedCameraIds) {
            // Patrones como cam3, camera-3, etc.
            const cameraPatterns = [
              `cam${cameraId}`, `cam-${cameraId}`, `cam_${cameraId}`,
              `camera${cameraId}`, `camera-${cameraId}`, `camera_${cameraId}`,
              `c${cameraId}`, `c-${cameraId}`, `c_${cameraId}`
            ];
            
            const matchesCameraPattern = cameraPatterns.some(pattern => 
              file.includes(pattern));
              
            if (matchesCameraPattern) {
              console.log(`✅ Coincide con patrón de ID de cámara ${cameraId}: ${file}`);
              relevantFiles.push(file);
              break;
            }
          }
        }
        
        console.log(`🔍 Encontrados ${relevantFiles.length} archivos relevantes para la sesión ${sessionId}`);
        
        for (const file of relevantFiles) {
          const filePath = path.join(recordingsDir, file);
          zip.addLocalFile(filePath, 'recordings');
          console.log(`✅ Añadido archivo de vídeo: ${file}`);
        }
        
        // Si no hay archivos relevantes, intentar buscar en más ubicaciones o por otros patrones
        if (relevantFiles.length === 0) {
          // Fallback: buscar cualquier MP4 en caso de que los patrones fallen
          console.log(`⚠️ No se encontraron archivos específicos para la sesión ${sessionId}. Buscando por extensión...`);
          const mp4Files = recordingFiles.filter(file => file.toLowerCase().endsWith('.mp4'));
          
          // Limitar a máximo 5 archivos si no se encuentran coincidencias específicas
          const limitedMp4Files = mp4Files.slice(0, 5);
          console.log(`🔍 Usando ${limitedMp4Files.length} archivos MP4 como alternativa`);
          
          for (const file of limitedMp4Files) {
            const filePath = path.join(recordingsDir, file);
            zip.addLocalFile(filePath, 'recordings');
            console.log(`✅ Añadido archivo de vídeo (alternativa): ${file}`);
          }
        }
      } else {
        console.log(`⚠️ No se encontró directorio de grabaciones: ${recordingsDir}`);
      }
      
      // Buscar archivos de formato antiguo para compatibilidad
      // Buscar archivo AllData.json
      const allDataPath = path.join(sessionDir, 'AllData.json');
      if (fs.existsSync(allDataPath)) {
        zip.addLocalFile(allDataPath, 'data');
        console.log('✅ Añadido AllData.json al ZIP');
      }
      
      // Buscar archivo session_data.json
      const sessionDataPath = path.join(sessionDir, 'session_data.json');
      if (fs.existsSync(sessionDataPath)) {
        zip.addLocalFile(sessionDataPath, 'data');
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
          zip.addLocalFile(filePath, 'data/sensor_data');
          console.log(`✅ Añadido ${file} al ZIP`);
        }
      } else {
        console.log(`⚠️ No se encontró carpeta sensor_data en ${sessionDir}`);
      }
      
      // Buscar carpeta recordings y añadir todos los archivos MP4
      const sessionRecordingsDir = path.join(sessionDir, 'recordings');
      if (fs.existsSync(sessionRecordingsDir)) {
        console.log(`📁 Directorio de grabaciones de la sesión encontrado: ${sessionRecordingsDir}`);
        const recordingFiles = fs.readdirSync(sessionRecordingsDir);
        console.log(`🔍 ${recordingFiles.length} archivos encontrados en recordings de la sesión`);
        
        for (const file of recordingFiles) {
          const filePath = path.join(sessionRecordingsDir, file);
          zip.addLocalFile(filePath, 'recordings');
          console.log(`✅ Añadido ${file} al ZIP`);
        }
      } else {
        console.log(`⚠️ No se encontró carpeta recordings en ${sessionDir}`);
      }
      
      // Buscar en el directorio general de grabaciones por archivos de esta sesión
      try {
        const generalRecordingsDir = path.join(process.cwd(), 'recordings');
        if (fs.existsSync(generalRecordingsDir)) {
          console.log(`📁 Buscando en directorio general de grabaciones: ${generalRecordingsDir}`);
          const allRecordingFiles = fs.readdirSync(generalRecordingsDir);
          
          // Filtrar archivos que corresponden a esta sesión por nombrado
          const sessionRecordings = allRecordingFiles.filter(file => {
            return file.includes(`_session${sessionId}`) || 
                   file.includes(`-session${sessionId}`) || 
                   file.includes(`_s${sessionId}_`) || 
                   file.includes(`-s${sessionId}-`);
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
            return (file.includes(`_session${sessionId}`) || 
                    file.includes(`-session${sessionId}`) ||
                    file.includes(`_s${sessionId}_`) || 
                    file.includes(`-s${sessionId}-`)) && 
                   (file.endsWith('.csv') || file.endsWith('.json'));
          });
          
          console.log(`🔍 Encontrados ${sessionDataFiles.length} archivos de datos correspondientes a la sesión ${sessionId}`);
          
          for (const file of sessionDataFiles) {
            const filePath = path.join(dataDir, file);
            zip.addLocalFile(filePath, 'data');
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
- /data: Contains sensor data files (.csv, .json)
  - zigbee-data.json: Complete sensor data in JSON format
  - zigbee-sensors.csv: Sensor data in CSV format for analysis
  - devices.json: List of all devices
  - session_metadata.json: Technical metadata for the session

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
