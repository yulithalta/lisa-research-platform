/**
 * Script de prueba para verificar la exportación de una sesión específica
 * Este script crea un ZIP para una sesión específica y verifica su contenido
 */

import AdmZip from 'adm-zip';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
const fsPromises = fs.promises;

// Obtener __dirname en ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Función para cargar datos de la sesión
const loadSessionData = (sessionId) => {
  const sessionDir = path.join(process.cwd(), 'sessions', `Session${sessionId}`);
  const sessionDataPath = path.join(sessionDir, 'session_data.json');
  
  if (!fs.existsSync(sessionDataPath)) {
    throw new Error(`No se encontró el archivo de datos para la sesión ${sessionId} en ${sessionDataPath}`);
  }
  
  try {
    const sessionData = JSON.parse(fs.readFileSync(sessionDataPath, 'utf8'));
    return sessionData;
  } catch (error) {
    throw new Error(`Error al cargar datos de la sesión ${sessionId}: ${error.message}`);
  }
};

// Generar un archivo ZIP con los datos de la sesión
async function createSessionZip(sessionId, session) {
  const recordingsDir = path.join(process.cwd(), 'recordings');
  const sessionsDir = path.join(process.cwd(), 'sessions');
  const dataDir = path.join(process.cwd(), 'data');
  const tempDir = path.join(process.cwd(), 'temp');
  
  // Crear directorio temporal si no existe
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  
  // Nombre del archivo ZIP
  const zipFileName = `test_session_${sessionId}_${Date.now()}.zip`;
  const zipPath = path.join(tempDir, zipFileName);
  
  // Crear instancia de AdmZip
  const zip = new AdmZip();
  
  // Crear estructura de carpetas en el ZIP
  zip.addFile('recordings/', Buffer.from(''));
  zip.addFile('data/', Buffer.from(''));
  zip.addFile('data/sensor_data/', Buffer.from(''));
  
  try {
    // Añadir archivos de datos globales
    const dataDir = path.join(process.cwd(), 'data');
    
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

    // Buscar grabaciones en el directorio principal con patrones mejorados
    if (fs.existsSync(recordingsDir)) {
      const files = fs.readdirSync(recordingsDir);
      
      // Patrones que relacionan archivos con esta sesión
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
        `sesion_${sessionId}`
      ];
      
      // Extensiones de vídeo compatibles
      const videoExtensions = ['.mp4', '.mkv', '.avi', '.mov', '.webm', '.flv'];
      
      // Buscar archivos de vídeo relacionados con la sesión
      const videoFiles = files.filter(file => {
        // Verificar extensión de vídeo
        const hasVideoExt = videoExtensions.some(ext => 
          file.toLowerCase().endsWith(ext)
        );
        
        // Verificar si coincide con patrón de sesión
        const matchesSession = sessionPatterns.some(pattern => 
          file.includes(pattern)
        );
        
        return hasVideoExt && matchesSession;
      });
      
      console.log(`Encontrados ${videoFiles.length} archivos de vídeo para la sesión ${sessionId}`);
      
      for (const file of videoFiles) {
        const filePath = path.join(recordingsDir, file);
        if (fs.existsSync(filePath) && fs.statSync(filePath).size > 0) {
          zip.addLocalFile(filePath, 'recordings');
          console.log(`✅ Añadido archivo ${file} al ZIP`);
        } else {
          console.log(`⚠️ Archivo ${file} no existe o está vacío, saltando...`);
        }
      }
      
      // Buscar subdirectorios relacionados con la sesión
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
          
          for (const file of subDirVideos) {
            const filePath = path.join(subDirPath, file);
            if (fs.existsSync(filePath) && fs.statSync(filePath).size > 0) {
              zip.addLocalFile(filePath, 'recordings');
              console.log(`✅ Añadido archivo ${file} al ZIP (desde subdirectorio ${subDir})`);
            }
          }
        }
      }
    }
    
    // Buscar en directorio de sesiones si existe
    const sessionDir = path.join(sessionsDir, `Session${sessionId}`);
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
      
      // Añadir grabaciones del directorio de sesiones
      const sessionRecordingsDir = path.join(sessionDir, 'recordings');
      if (fs.existsSync(sessionRecordingsDir)) {
        const recFiles = fs.readdirSync(sessionRecordingsDir);
        
        // Buscar todos los formatos de vídeo, no solo MP4
        const videoExtensions = ['.mp4', '.mkv', '.avi', '.mov', '.webm', '.flv'];
        const videoFiles = recFiles.filter(file => 
          videoExtensions.some(ext => file.toLowerCase().endsWith(ext))
        );
        
        console.log(`Encontrados ${videoFiles.length} archivos de vídeo en directorio específico de sesión`);
        
        for (const file of videoFiles) {
          const filePath = path.join(sessionRecordingsDir, file);
          if (fs.existsSync(filePath) && fs.statSync(filePath).size > 0) {
            zip.addLocalFile(filePath, 'recordings');
            console.log(`✅ Añadido archivo ${file} al ZIP (desde directorio de sesión)`);
          } else {
            console.log(`⚠️ Archivo de sesión ${file} no existe o está vacío, saltando...`);
          }
        }
        
        // Buscar imágenes (thumbnails) en directorio de grabaciones de sesión
        const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'];
        const imageFiles = recFiles.filter(file => 
          imageExtensions.some(ext => file.toLowerCase().endsWith(ext))
        );
        
        if (imageFiles.length > 0) {
          console.log(`Encontrados ${imageFiles.length} archivos de imagen/thumbnails en directorio de sesión`);
          
          // Crear directorio para thumbnails
          zip.addFile('recordings/thumbnails/', Buffer.from(''));
          
          for (const file of imageFiles) {
            const filePath = path.join(sessionRecordingsDir, file);
            if (fs.existsSync(filePath) && fs.statSync(filePath).size > 0) {
              zip.addLocalFile(filePath, 'recordings/thumbnails');
              console.log(`✅ Añadido thumbnail ${file} al ZIP`);
            }
          }
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
    
    // Añadir README con formato mejorado
    const sessionName = session.name || 'Sin título';
    
    // Obtener información adicional de la sesión
    const createDate = session.startTime ? new Date(session.startTime).toLocaleString() : 'Desconocida';
    const startTime = session.startTime ? new Date(session.startTime).toLocaleString() : 'No iniciada';
    const endTime = session.endTime ? new Date(session.endTime).toLocaleString() : 'En curso';
    const status = session.status || 'Desconocido';
    const tags = session.tags && Array.isArray(session.tags) && session.tags.length > 0 ?
      session.tags.join(', ') : 'Sin etiquetas';
    const notes = session.notes ? session.notes : 'Sin notas adicionales';
    
    // Directorio de búsqueda para mejor entendimiento
    const searchPaths = [
      `- ${recordingsDir} (directorio principal de grabaciones)`,
      `- ${path.join(sessionsDir, `Session${sessionId}`)} (directorio específico de la sesión)`,
      `- ${path.join(sessionsDir, `Session${sessionId}`, 'recordings')} (grabaciones específicas de la sesión)`,
      `- ${dataDir} (directorio de datos globales)`
    ].join('\n      ');
    
    // Patrones que relacionan archivos con la sesión
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
      `- /data/: Datos de sensores y metadatos\n` +
      `  - zigbee-data.json: Datos completos en formato JSON\n` +
      `  - zigbee-sensors.csv: Datos en formato CSV para análisis\n` +
      `  - session_metadata.json: Metadatos detallados de la sesión\n` +
      `  - /sensor_data/: Datos específicos de sensores para esta sesión\n\n` +
      `## Directorio de búsqueda\n` +
      `Los archivos de esta sesión se han buscado en las siguientes ubicaciones:\n` +
      `      ${searchPaths}\n\n` +
      `## Patrones de identificación de archivos\n` +
      `Las grabaciones se vinculan a esta sesión cuando sus nombres contienen alguno de estos patrones:\n` +
      `      - ${patternExamples}\n\n` +
      `## Notas importantes\n` +
      `- El ID de sesión ${sessionId} es clave para identificar archivos asociados\n` +
      `- Los archivos sin conexión directa a esta sesión no se incluyen en esta exportación\n\n` +
      `Exportación generada el ${new Date().toLocaleString()}\n` +
      `Sistema: SensorSessionTracker v2.1 (Prueba)\n`;
    
    zip.addFile('README.txt', Buffer.from(readme));
    
    // Guardar el ZIP
    zip.writeZip(zipPath);
    console.log(`✅ ZIP guardado exitosamente en: ${zipPath}`);
    
    return zipPath;
  } catch (error) {
    console.error('Error durante la creación del ZIP:', error);
    throw error;
  }
}

// Analizar el contenido del ZIP
const analyzeZipContent = (zipPath) => {
  console.log(`\nAnalizando contenido del ZIP: ${zipPath}`);
  
  try {
    const zip = new AdmZip(zipPath);
    const entries = zip.getEntries();
    
    // Agrupar por tipo de archivo
    const recordingFiles = [];
    const dataFiles = [];
    const otherFiles = [];
    
    entries.forEach(entry => {
      const name = entry.entryName;
      if (name.startsWith('recordings/') && !name.endsWith('/')) {
        recordingFiles.push(name);
      } else if (name.startsWith('data/') && !name.endsWith('/')) {
        dataFiles.push(name);
      } else if (!name.endsWith('/')) {
        otherFiles.push(name);
      }
    });
    
    console.log(`\n✅ Archivos encontrados en el ZIP:`);
    console.log(`- ${recordingFiles.length} archivos de grabación`);
    console.log(`- ${dataFiles.length} archivos de datos`);
    console.log(`- ${otherFiles.length} otros archivos`);
    
    console.log('\nGrabaciones:');
    recordingFiles.forEach(file => console.log(`- ${file}`));
    
    console.log('\nArchivos de datos:');
    dataFiles.forEach(file => console.log(`- ${file}`));
    
    console.log('\nOtros archivos:');
    otherFiles.forEach(file => console.log(`- ${file}`));
    
    // Extraer README para mostrar
    if (otherFiles.includes('README.txt')) {
      const readmeEntry = zip.getEntry('README.txt');
      if (readmeEntry) {
        console.log('\nContenido del archivo README.txt:');
        console.log(readmeEntry.getData().toString('utf8'));
      }
    }
    
    return { recordingFiles, dataFiles, otherFiles };
  } catch (error) {
    console.error(`Error al analizar ZIP: ${error.message}`);
    return null;
  }
};

// Ejecutar la prueba para una sesión específica
async function runTest(sessionId) {
  console.log(`Iniciando prueba de exportación para la sesión ${sessionId}...\n`);
  
  try {
    // 1. Cargar datos de la sesión
    const sessionData = loadSessionData(sessionId);
    console.log(`✅ Datos de sesión cargados: ${sessionData.name || 'Sin nombre'}`);
    
    // 2. Crear el ZIP de la sesión usando nuestra implementación local
    console.log(`\nCreando archivo ZIP para la sesión ${sessionId}...`);
    const zipPath = await createSessionZip(sessionId, sessionData);
    console.log(`✅ ZIP creado exitosamente en: ${zipPath}`);
    
    // 3. Analizar el contenido del ZIP
    const zipContent = analyzeZipContent(zipPath);
    
    if (zipContent) {
      // 4. Verificar si se incluyeron todos los archivos esperados
      const expectedRecordings = [
        // Grabaciones en el directorio principal que deben incluirse
        `recordings/cam1_session${sessionId}_20250502.mp4`,
        `recordings/cam2-session${sessionId}-20250502.mp4`,
        `recordings/c32_livinglab_s${sessionId}_video.mp4`,
        
        // Grabaciones en el directorio específico de la sesión
        `recordings/cam3_direct_recording.mp4`,
        `recordings/cam4_${sessionId}.mp4`
      ];
      
      // Verificar presencia de archivos esperados
      const missingFiles = expectedRecordings.filter(expected => 
        !zipContent.recordingFiles.some(actual => 
          actual.includes(path.basename(expected))
        )
      );
      
      if (missingFiles.length === 0) {
        console.log(`\n✅ VERIFICACIÓN EXITOSA: Todas las grabaciones esperadas están presentes en el ZIP`);
      } else {
        console.log(`\n❌ VERIFICACIÓN FALLIDA: Faltan ${missingFiles.length} archivos esperados:`);
        missingFiles.forEach(file => console.log(`  - ${file}`));
      }
      
      // Verificar que no se incluyera la grabación no relacionada
      const unwantedFile = 'recording_without_session.mp4';
      const hasUnwantedFile = zipContent.recordingFiles.some(file => 
        file.includes(unwantedFile)
      );
      
      if (!hasUnwantedFile) {
        console.log(`✅ VERIFICACIÓN EXITOSA: No se incluyó la grabación no relacionada '${unwantedFile}'`);
      } else {
        console.log(`❌ VERIFICACIÓN FALLIDA: Se incluyó incorrectamente la grabación '${unwantedFile}'`);
      }
    }
    
    console.log('\n✅ Prueba completada');
    return { success: true, zipPath };
    
  } catch (error) {
    console.error(`\n❌ Error durante la prueba: ${error.message}`);
    console.error(error);
    return { success: false, error };
  }
}

// Ejecutar la prueba para la sesión 42 creada anteriormente
runTest(42);
