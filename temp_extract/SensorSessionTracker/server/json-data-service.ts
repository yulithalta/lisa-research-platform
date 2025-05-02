import fs from 'fs';
import path from 'path';
import { Parser } from 'json2csv';
import { storage } from './storage';
import { logger } from '@/lib/services/logger';

// Directorio para almacenar datos temporales
const TEMP_DIR = path.join(process.cwd(), 'temp');
// Directorio para datos de sensores
const SENSOR_DATA_DIR = path.join(process.cwd(), 'data', 'sensor_data');

// Asegurar que los directorios existan
[TEMP_DIR, SENSOR_DATA_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true, mode: 0o755 });
  }
});

interface SensorDataExportOptions {
  sessionId: string;
  startTime: Date;
  endTime: Date;
  sensorIds?: string[];
  format?: 'json' | 'csv';
}

/**
 * Obtiene los datos de sensores para una sesión específica desde archivos JSON
 * @param sessionId ID de la sesión
 * @returns Datos de sensores almacenados
 */
export function getSensorDataForSession(sessionId: string): any[] {
  try {
    const sessionDataDir = path.join(SENSOR_DATA_DIR, sessionId);
    if (!fs.existsSync(sessionDataDir)) {
      logger.warn(`No se encontraron datos para la sesión ${sessionId}`);
      return [];
    }

    // Leer todos los archivos JSON en el directorio de la sesión
    const dataFiles = fs.readdirSync(sessionDataDir)
      .filter(file => file.endsWith('.json'));
    
    let allData: any[] = [];
    
    for (const file of dataFiles) {
      try {
        const filePath = path.join(sessionDataDir, file);
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const data = JSON.parse(fileContent);
        
        if (Array.isArray(data)) {
          allData = [...allData, ...data];
        } else {
          allData.push(data);
        }
      } catch (error) {
        logger.error(`Error leyendo archivo ${file}:`, error);
      }
    }
    
    return allData;
  } catch (error) {
    logger.error(`Error obteniendo datos para sesión ${sessionId}:`, error);
    return [];
  }
}

/**
 * Exporta datos de sensores para una sesión específica
 */
export async function exportSensorData({
  sessionId,
  startTime,
  endTime,
  sensorIds = [],
  format = 'csv'
}: SensorDataExportOptions): Promise<string> {
  try {
    logger.info(`Exportando datos de sensores para sesión ${sessionId}`);
    
    // Carpeta temporal para almacenar datos
    const tempDir = path.join(TEMP_DIR, sessionId);
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    // Obtener datos de sensores para la sesión
    const sensorData = getSensorDataForSession(sessionId);
    
    // Filtrar por rango de tiempo
    const filteredData = sensorData.filter(item => {
      if (!item._time && !item.timestamp) return false;
      const timestamp = new Date(item._time || item.timestamp);
      return timestamp >= startTime && timestamp <= endTime;
    });
    
    // Filtrar por sensores específicos si se proporcionan
    const filteredBySensor = sensorIds && sensorIds.length > 0
      ? filteredData.filter(item => sensorIds.includes(item.sensor_id))
      : filteredData;
    
    // Obtener información de la sesión para el nombre del archivo
    let sessionName = 'unknown';
    try {
      const session = await storage.getSessionById(Number(sessionId));
      if (session && session.name) {
        // Sanitizar el nombre para usarlo en nombre de archivo
        sessionName = session.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      }
    } catch (error) {
      logger.error('Error obteniendo nombre de sesión:', error);
    }
    
    // Nombre de archivo basado en formato solicitado y nombre de sesión
    const fileName = `sensor_data_${sessionName}_${sessionId}.${format}`;
    const filePath = path.join(tempDir, fileName);
    
    // Guardar resultado en archivo del formato solicitado
    if (format === 'json') {
      // Guardar como JSON
      fs.writeFileSync(filePath, JSON.stringify(filteredBySensor, null, 2));
    } else {
      // Convertir a CSV si hay datos
      if (filteredBySensor && Array.isArray(filteredBySensor) && filteredBySensor.length > 0) {
        try {
          const firstItem = filteredBySensor[0] as Record<string, any>;
          const fields = Object.keys(firstItem);
          const parser = new Parser({ fields });
          const csv = parser.parse(filteredBySensor as any[]);
          fs.writeFileSync(filePath, csv);
        } catch (csvError) {
          logger.error('Error convirtiendo a CSV:', csvError);
          // Guardar como JSON como fallback
          fs.writeFileSync(filePath.replace('.csv', '.json'), JSON.stringify(filteredBySensor, null, 2));
          return filePath.replace('.csv', '.json');
        }
      } else {
        // Crear un CSV vacío con encabezados predeterminados si no hay datos
        fs.writeFileSync(filePath, 'timestamp,topic,sensor_id,value,type\n');
      }
    }
    
    logger.info(`Archivo generado en: ${filePath}`);
    return filePath;
  } catch (error) {
    logger.error('Error exportando datos de sensores:', error);
    throw error;
  }
}

/**
 * Obtiene los últimos datos de los sensores para mostrar en tiempo real
 */
export async function getLatestSensorData(sensorIds?: string[]): Promise<Record<string, any>> {
  try {
    const result: Record<string, any> = {};
    
    // Buscar en todos los directorios de sesiones activas
    const sessions = await storage.getSessions(1); // Usuario 1 por defecto
    const activeSessions = sessions.filter(s => !s.endTime);
    
    for (const session of activeSessions) {
      const sessionData = getSensorDataForSession(String(session.id));
      
      // Agrupar por sensor_id y quedarse con el último registro de cada sensor
      const sensorMap: Record<string, any> = {};
      
      for (const item of sessionData) {
        if (item.sensor_id) {
          // Si hay filtro de sensores, omitir los que no están en la lista
          if (sensorIds && sensorIds.length > 0 && !sensorIds.includes(item.sensor_id)) {
            continue;
          }
          
          // Ordenar por timestamp para quedarse con el último
          if (!sensorMap[item.sensor_id] || 
              new Date(item._time || item.timestamp) > new Date(sensorMap[item.sensor_id]._time || sensorMap[item.sensor_id].timestamp)) {
            sensorMap[item.sensor_id] = item;
          }
        }
      }
      
      // Añadir al resultado
      Object.assign(result, sensorMap);
    }
    
    return result;
  } catch (error) {
    logger.error('Error obteniendo datos recientes de sensores:', error);
    return {};
  }
}

// Verificar si hay datos de sensores disponibles
export async function testSensorDataConnection(): Promise<boolean> {
  try {
    return fs.existsSync(SENSOR_DATA_DIR);
  } catch (error) {
    logger.error('Error verificando datos de sensores:', error);
    return false;
  }
}

/**
 * Guarda datos de sensores MQTT en archivos JSON
 * @param sessionId ID de la sesión
 * @param data Datos del sensor a guardar
 */
export function saveMqttData(sessionId: string, data: any): void {
  try {
    const sessionDataDir = path.join(SENSOR_DATA_DIR, sessionId);
    if (!fs.existsSync(sessionDataDir)) {
      fs.mkdirSync(sessionDataDir, { recursive: true });
    }
    
    // Crear un nombre de archivo único para este dato
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `mqtt_data_${timestamp}.json`;
    const filePath = path.join(sessionDataDir, fileName);
    
    // Añadir timestamp si no existe
    if (!data.timestamp) {
      data.timestamp = new Date().toISOString();
    }
    
    // Guardar en archivo JSON
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    
    // También actualizar un archivo AllData.json con todos los datos
    const allDataPath = path.join(sessionDataDir, 'AllData.json');
    let allData: any[] = [];
    
    if (fs.existsSync(allDataPath)) {
      try {
        const allDataContent = fs.readFileSync(allDataPath, 'utf8');
        allData = JSON.parse(allDataContent);
      } catch (error) {
        logger.error(`Error leyendo AllData.json:`, error);
      }
    }
    
    allData.push(data);
    fs.writeFileSync(allDataPath, JSON.stringify(allData, null, 2));
    
    // Verificar si es un dato del livinglab y guardar adicionalmente en sensors.json y sensors.csv
    processMqttDataForSensors(sessionId, data);
    
  } catch (error) {
    logger.error(`Error guardando datos MQTT para sesión ${sessionId}:`, error);
  }
}

/**
 * Procesa y guarda datos específicamente para sensores
 * Maneja la conversión del formato livinglab.json a sensors.json y sensors.csv
 * @param sessionId ID de la sesión
 * @param data Datos del sensor a procesar
 */
function processMqttDataForSensors(sessionId: string, data: any): void {
  try {
    // Solo procesar datos de livinglab o sensores específicos
    const isLivingLabData = 
      (data.topic && (
        data.topic.includes('livinglab') || 
        data.topic.includes('zigbee2mqtt/Sensor') || 
        data.topic.includes('zigbee2mqtt/sensor')
      )) || 
      (data.source === 'livinglab');
    
    if (!isLivingLabData) {
      return; // No es un dato de tipo livinglab, ignorar
    }
    
    const sessionDataDir = path.join(SENSOR_DATA_DIR, sessionId);
    const sensorsJsonPath = path.join(sessionDataDir, 'sensors.json');
    const sensorsCsvPath = path.join(sessionDataDir, 'sensors.csv');
    
    // Transformar datos para formato unificado de sensores
    const sensorData = {
      id: data.id || data.ieee_addr || data.friendly_name || `sensor-${Date.now()}`,
      topic: data.topic || '',
      timestamp: data.timestamp || new Date().toISOString(),
      payload: data.payload || data,
      value: data.value || (typeof data.payload === 'object' ? JSON.stringify(data.payload) : data.payload) || '',
      type: data.type || 'sensor',
      battery: data.battery || data.payload?.battery || 0,
      linkquality: data.linkquality || data.payload?.linkquality || 0,
      source: 'livinglab'
    };
    
    // Procesar JSON
    let sensorsData: any[] = [];
    if (fs.existsSync(sensorsJsonPath)) {
      try {
        const content = fs.readFileSync(sensorsJsonPath, 'utf8');
        sensorsData = JSON.parse(content);
      } catch (error) {
        logger.error(`Error leyendo sensors.json:`, error);
      }
    }
    
    sensorsData.push(sensorData);
    fs.writeFileSync(sensorsJsonPath, JSON.stringify(sensorsData, null, 2));
    
    // Procesar CSV
    let csvContent = '';
    if (!fs.existsSync(sensorsCsvPath)) {
      // Crear encabezado si es un archivo nuevo
      csvContent = 'id,topic,timestamp,value,type,battery,linkquality,source\n';
    }
    
    // Escapar comillas y crear línea CSV
    const valueStr = typeof sensorData.value === 'string' ? 
      sensorData.value.replace(/"/g, '""') : 
      JSON.stringify(sensorData.value).replace(/"/g, '""');
    
    // Añadir línea al CSV
    csvContent += `"${sensorData.id}","${sensorData.topic}","${sensorData.timestamp}","${valueStr}","${sensorData.type}",${sensorData.battery},${sensorData.linkquality},"${sensorData.source}"\n`;
    
    fs.appendFileSync(sensorsCsvPath, csvContent);
    
    logger.info(`Datos de sensor de LivingLab guardados en formato estándar: ${sensorData.id}`);
    
  } catch (error) {
    logger.error(`Error procesando datos de sensores para sesión ${sessionId}:`, error);
  }
}