/**
 * Script de prueba para verificar la asociación de grabaciones con sesiones
 * Este script simula la creación de grabaciones asociadas a una sesión específica
 * para comprobar que el sistema las identifica y exporta correctamente.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Para obtener __dirname en ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('Iniciando prueba de asociación sesión-grabación...');
console.log(`Directorio actual: ${process.cwd()}`);

// Crear directorios necesarios
const RECORDINGS_DIR = path.join(process.cwd(), 'recordings');
const SESSIONS_DIR = path.join(process.cwd(), 'sessions');
const DATA_DIR = path.join(process.cwd(), 'data');

// Asegurar que existan los directorios
[RECORDINGS_DIR, SESSIONS_DIR, DATA_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`Directorio creado: ${dir}`);
  }
});

// Configuración de prueba
const TEST_SESSION_ID = 42;
const SESSION_DIR = path.join(SESSIONS_DIR, `Session${TEST_SESSION_ID}`);
const SESSION_RECORDINGS_DIR = path.join(SESSION_DIR, 'recordings');
const SESSION_DATA_DIR = path.join(SESSION_DIR, 'sensor_data');

// Crear estructura de directorios para la sesión
[SESSION_DIR, SESSION_RECORDINGS_DIR, SESSION_DATA_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`Directorio creado: ${dir}`);
  }
});

// Crear archivos de grabación de prueba con patrones diversos
const createTestRecordings = () => {
  const recordingPatterns = [
    // Grabaciones en el directorio principal
    {
      path: path.join(RECORDINGS_DIR, `cam1_session${TEST_SESSION_ID}_20250502.mp4`),
      content: 'Simulación de grabación de cámara 1 asociada a la sesión por patrón en nombre'
    },
    {
      path: path.join(RECORDINGS_DIR, `cam2-session${TEST_SESSION_ID}-20250502.mp4`),
      content: 'Simulación de grabación de cámara 2 asociada a la sesión por patrón en nombre'
    },
    {
      path: path.join(RECORDINGS_DIR, `c32_livinglab_s${TEST_SESSION_ID}_video.mp4`),
      content: 'Simulación de grabación con prefijo c32_livinglab y patrón s{id}'
    },
    {
      path: path.join(RECORDINGS_DIR, `recording_without_session.mp4`),
      content: 'Esta grabación no está asociada a ninguna sesión y no debiera incluirse'
    },
    
    // Grabaciones en el directorio específico de la sesión
    {
      path: path.join(SESSION_RECORDINGS_DIR, `cam3_direct_recording.mp4`),
      content: 'Grabación directamente en la carpeta de la sesión, debe ser incluida por ubicación'
    },
    {
      path: path.join(SESSION_RECORDINGS_DIR, `cam4_${TEST_SESSION_ID}.mp4`),
      content: 'Grabación con ID de sesión en nombre y ubicada en carpeta específica'
    }
  ];
  
  // Crear archivos de grabación
  recordingPatterns.forEach(recording => {
    fs.writeFileSync(recording.path, recording.content);
    console.log(`Grabación creada: ${recording.path}`);
  });
  
  console.log(`✅ ${recordingPatterns.length} grabaciones de prueba creadas`);
  
  return recordingPatterns.map(rec => rec.path);
};

// Crear archivo de metadatos de sesión
const createSessionMetadata = () => {
  const sessionData = {
    id: TEST_SESSION_ID,
    name: 'Sesión de prueba para asociación de grabaciones',
    description: 'Esta sesión se utiliza para probar la correcta asociación de grabaciones en la exportación ZIP',
    startTime: new Date(Date.now() - 3600000).toISOString(), // 1 hora atrás
    endTime: new Date().toISOString(),
    status: 'completed',
    selectedDevices: {
      cameras: [
        { id: 1, name: 'Camera 1', recordingPrefix: 'cam1' },
        { id: 2, name: 'Camera 2', recordingPrefix: 'cam2' },
        { id: 3, name: 'Camera 3', recordingPrefix: 'cam3' },
        { id: 32, name: 'LivingLab Primary', recordingPrefix: 'c32_livinglab' }
      ],
      sensors: [
        { id: 'sensor1', name: 'Sensor 1' },
        { id: 'sensor2', name: 'Sensor 2' }
      ]
    }
  };
  
  const sessionDataPath = path.join(SESSION_DIR, 'session_data.json');
  fs.writeFileSync(sessionDataPath, JSON.stringify(sessionData, null, 2));
  console.log(`✅ Metadatos de sesión creados: ${sessionDataPath}`);
  
  // También registrar en estructura global
  const sessionsDBPath = path.join(DATA_DIR, 'sessions.json');
  let sessionsData = [];
  
  if (fs.existsSync(sessionsDBPath)) {
    try {
      sessionsData = JSON.parse(fs.readFileSync(sessionsDBPath, 'utf8'));
    } catch (error) {
      console.log('Error al leer base de datos de sesiones, creando nueva');
    }
  }
  
  // Añadir o actualizar sesión
  const existingIndex = sessionsData.findIndex(s => s.id === TEST_SESSION_ID);
  if (existingIndex >= 0) {
    sessionsData[existingIndex] = sessionData;
  } else {
    sessionsData.push(sessionData);
  }
  
  fs.writeFileSync(sessionsDBPath, JSON.stringify(sessionsData, null, 2));
  console.log(`✅ Sesión registrada en base de datos global: ${sessionsDBPath}`);
  
  return sessionData;
};

// Crear datos de sensores de ejemplo
const createSensorData = () => {
  // Datos JSON
  const sensorJsonPath = path.join(SESSION_DATA_DIR, 'sensor_readings.json');
  const sensorData = {
    sessionId: TEST_SESSION_ID,
    readings: [
      {
        timestamp: new Date(Date.now() - 3000000).toISOString(),
        sensorId: 'sensor1',
        temperature: 23.5,
        humidity: 65
      },
      {
        timestamp: new Date(Date.now() - 2000000).toISOString(),
        sensorId: 'sensor2',
        temperature: 24.1,
        humidity: 62
      },
      {
        timestamp: new Date(Date.now() - 1000000).toISOString(),
        sensorId: 'sensor1',
        temperature: 23.8,
        humidity: 64
      }
    ]
  };
  
  fs.writeFileSync(sensorJsonPath, JSON.stringify(sensorData, null, 2));
  console.log(`✅ Datos de sensores creados: ${sensorJsonPath}`);
  
  // Datos CSV
  const sensorCsvPath = path.join(SESSION_DATA_DIR, 'sensor_readings.csv');
  const csvHeader = 'timestamp,sensorId,temperature,humidity\n';
  const csvRows = sensorData.readings.map(reading => {
    return `${reading.timestamp},${reading.sensorId},${reading.temperature},${reading.humidity}`;
  }).join('\n');
  
  fs.writeFileSync(sensorCsvPath, csvHeader + csvRows);
  console.log(`✅ Datos CSV de sensores creados: ${sensorCsvPath}`);
  
  return { jsonPath: sensorJsonPath, csvPath: sensorCsvPath };
};

// Ejecutar las pruebas
try {
  // 1. Crear archivos de grabación
  const recordingFiles = createTestRecordings();
  
  // 2. Crear metadatos de sesión
  const sessionData = createSessionMetadata();
  
  // 3. Crear datos de sensores
  const sensorFiles = createSensorData();
  
  console.log('\n✅ Prueba completada exitosamente');
  console.log(`\nResumen de prueba:`);
  console.log(`- ID de sesión de prueba: ${TEST_SESSION_ID}`);
  console.log(`- Grabaciones creadas: ${recordingFiles.length}`);
  console.log(`- Directorio de la sesión: ${SESSION_DIR}`);
  console.log(`\nPara verificar la exportación:`);
  console.log(`1. Ve a la interfaz web de la aplicación`);
  console.log(`2. Navega a la sección de sesión con ID ${TEST_SESSION_ID}`);
  console.log(`3. Intenta descargar la sesión y verifica el contenido del ZIP`);
  console.log(`\nAlternativamente, puedes ejecutar:`);
  console.log(`- node test-zip-creation.js`);
  console.log(`\nEs posible que necesites reiniciar el servidor para que reconozca los nuevos archivos`); 
} catch (error) {
  console.error('\n❌ Error en la prueba:', error);
}
