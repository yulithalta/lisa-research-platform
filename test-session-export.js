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

    // Buscar grabaciones en el directorio principal
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
    
    // Añadir README
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
