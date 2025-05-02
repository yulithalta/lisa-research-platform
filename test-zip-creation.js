/**
 * Script de prueba para verificar la creación de archivos ZIP
 * 
 * Este script crea un archivo ZIP con los datos consolidados y las grabaciones
 * siguiendo la misma estructura que utiliza la aplicación.
 * 
 * Para ejecutar: node test-zip-creation.js
 */

import AdmZip from 'adm-zip';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Para obtener __dirname en ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Mensaje de inicio
console.log('Iniciando prueba de creación de ZIP...');
console.log(`Directorio actual: ${process.cwd()}`);

// Función para crear directorios si no existen
function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    console.log(`Creando directorio: ${dir}`);
    fs.mkdirSync(dir, { recursive: true });
  }
}

// Asegurar que existan los directorios principales
ensureDir('data');
ensureDir('recordings');
ensureDir('temp');

// Crear archivos de ejemplo si no existen
if (!fs.existsSync('data/zigbee-data.json')) {
  console.log('Creando archivo zigbee-data.json de ejemplo...');
  fs.writeFileSync('data/zigbee-data.json', JSON.stringify({
    messages: {
      "zigbee2mqtt/livinglab/sensor1": [
        {
          timestamp: new Date().toISOString(),
          payload: {
            temperature: 22.5,
            humidity: 65,
            battery: 87,
            linkquality: 95
          }
        }
      ]
    },
    topics: ["zigbee2mqtt/livinglab/sensor1"],
    lastUpdated: new Date().toISOString(),
    deviceCount: 1
  }, null, 2));
}

if (!fs.existsSync('data/zigbee-sensors.csv')) {
  console.log('Creando archivo zigbee-sensors.csv de ejemplo...');
  fs.writeFileSync('data/zigbee-sensors.csv',
    'timestamp,topic,device_id,temperature,humidity,motion,battery,linkquality,payload\n' +
    `"${new Date().toISOString()}","zigbee2mqtt/livinglab/sensor1","sensor1","22.5","65","","87","95","{\"temperature\":22.5,\"humidity\":65,\"battery\":87,\"linkquality\":95}"`
  );
}

if (!fs.existsSync('data/devices.json')) {
  console.log('Creando archivo devices.json de ejemplo...');
  fs.writeFileSync('data/devices.json', JSON.stringify([
    {
      id: "0x00158d00063a31a1",
      name: "sensor1",
      type: "EndDevice",
      model: "WSDCGQ11LM",
      manufacturer: "Xiaomi",
      lastSeen: new Date().toISOString(),
      battery: 87,
      linkquality: 96
    }
  ], null, 2));
}

if (!fs.existsSync('data/bridge.json')) {
  console.log('Creando archivo bridge.json de ejemplo...');
  fs.writeFileSync('data/bridge.json', JSON.stringify({
    state: "online",
    updated: new Date().toISOString()
  }, null, 2));
}

if (!fs.existsSync('recordings/example_recording.txt')) {
  console.log('Creando archivo de grabación de ejemplo...');
  fs.writeFileSync('recordings/example_recording.txt',
    `Este archivo simula una grabación MP4 para pruebas.\n` +
    `Contendrá datos de vídeo almacenados en formato MP4.\n` +
    `En un sistema real, este sería un archivo binary MP4 grabado por las cámaras.\n\n` +
    `Fecha: ${new Date().toLocaleDateString()}\n` +
    `Duración: 00:02:30\n` +
    `Resolución: 1280x720\n` +
    `FPS: 25\n` +
    `Cámara: #1 (192.168.0.20)`
  );
}

console.log('\nCreando archivo ZIP...');

// Crear un ZIP de prueba
try {
  const zip = new AdmZip();

  // Crear la estructura de carpetas
  zip.addFile('recordings/', Buffer.from(''));
  zip.addFile('data/', Buffer.from(''));
  zip.addFile('data/sensor_data/', Buffer.from(''));

  // Añadir archivos del directorio data
  const dataDir = path.join(process.cwd(), 'data');
  if (fs.existsSync(dataDir)) {
    console.log('Directorio de datos encontrado:', dataDir);
    const dataFiles = fs.readdirSync(dataDir);
    console.log(`Encontrados ${dataFiles.length} archivos en data`);
    
    for (const file of dataFiles) {
      if (fs.statSync(path.join(dataDir, file)).isFile()) {
        const filePath = path.join(dataDir, file);
        zip.addLocalFile(filePath, 'data');
        console.log(`Añadido al ZIP: data/${file}`);
      }
    }
  }

  // Añadir archivos del directorio recordings
  const recordingsDir = path.join(process.cwd(), 'recordings');
  if (fs.existsSync(recordingsDir)) {
    console.log('Directorio de grabaciones encontrado:', recordingsDir);
    const recordingFiles = fs.readdirSync(recordingsDir);
    console.log(`Encontrados ${recordingFiles.length} archivos en recordings`);
    
    for (const file of recordingFiles) {
      if (fs.statSync(path.join(recordingsDir, file)).isFile()) {
        const filePath = path.join(recordingsDir, file);
        zip.addLocalFile(filePath, 'recordings');
        console.log(`Añadido al ZIP: recordings/${file}`);
      }
    }
  }

  // Añadir archivo session_metadata.json
  const metadataContent = JSON.stringify({
    id: 1,
    name: "Sesión de prueba",
    description: "Esta es una sesión de prueba generada por el script test-zip-creation.js",
    startTime: new Date(Date.now() - 3600000).toISOString(), // 1 hora antes
    endTime: new Date().toISOString(),
    status: "completed",
    exportDate: new Date().toISOString(),
    exportVersion: "2.0.0"
  }, null, 2);
  zip.addFile('data/session_metadata.json', Buffer.from(metadataContent));
  console.log('Añadido al ZIP: data/session_metadata.json');

  // Añadir README
  const readme = 'SensorSessionTracker - Test ZIP\n' +
              '=========================\n\n' +
              'Este es un archivo ZIP de prueba para verificar la funcionalidad de creación de archivos ZIP.\n' +
              'Contiene datos de sensores consolidados y archivos de grabación.\n\n' +
              'Estructura:\n' +
              '- /recordings: Grabaciones de vídeo\n' +
              '- /data: Datos de sensores y dispositivos\n' +
              '  - zigbee-data.json: Datos completos de sensores en formato JSON\n' +
              '  - zigbee-sensors.csv: Datos de sensores en formato CSV para análisis\n' +
              '  - devices.json: Lista de todos los dispositivos\n' +
              '  - session_metadata.json: Metadatos técnicos de la sesión\n';
  zip.addFile('README.txt', Buffer.from(readme));
  console.log('Añadido al ZIP: README.txt');

  // Guardar el ZIP
  const zipPath = path.join(process.cwd(), 'temp', 'test-session.zip');
  zip.writeZip(zipPath);
  console.log('\nZIP creado exitosamente en:', zipPath);

  // Listar contenido del ZIP
  console.log('\nContenido del ZIP:');
  const entries = zip.getEntries();
  entries.forEach(entry => {
    console.log(entry.entryName);
  });

  console.log('\n✅ Prueba completada exitosamente');
  console.log(`Puedes encontrar el archivo ZIP en: ${zipPath}`);
  console.log('Inspecciona el contenido del ZIP para verificar que incluya todos los archivos necesarios.');
} catch (error) {
  console.error('\n❌ Error al crear el ZIP:', error);
}