import { InfluxDB, QueryApi } from '@influxdata/influxdb-client';
import fs from 'fs';
import path from 'path';
import { Parser } from 'json2csv';

// Configuración de InfluxDB desde variables de entorno
const token = process.env.INFLUXDB_TOKEN || 'mi-token-secreto';
const url = process.env.INFLUXDB_URL || 'http://influxdb:8086';
const org = process.env.INFLUXDB_ORG || 'miorganizacion';
const bucket = process.env.INFLUXDB_BUCKET || 'mqtt_data';

// Crear cliente de InfluxDB
const influxClient = new InfluxDB({ url, token });
const queryApi = influxClient.getQueryApi(org);

interface SensorDataExportOptions {
  sessionId: string;
  startTime: Date;
  endTime: Date;
  sensorIds?: string[];
  format?: 'json' | 'csv';
}

/**
 * Exporta datos de sensores de InfluxDB para una sesión específica
 */
export async function exportSensorData({
  sessionId,
  startTime,
  endTime,
  sensorIds = [],
  format = 'csv'
}: SensorDataExportOptions): Promise<string> {
  try {
    console.log(`Exportando datos de sensores para sesión ${sessionId}`);
    
    // Carpeta temporal para almacenar datos
    const tempDir = path.join(process.cwd(), 'temp', sessionId);
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    // Construir consulta Flux para InfluxDB
    const timeFilter = `|> range(start: ${startTime.toISOString()}, stop: ${endTime.toISOString()})`;
    
    // Filtro de sensores si se especifican
    let sensorFilter = '';
    if (sensorIds && sensorIds.length > 0) {
      const sensorList = sensorIds.map(id => `"${id}"`).join(', ');
      sensorFilter = `|> filter(fn: (r) => contains(value: r.sensor_id, set: [${sensorList}]))`;
    }
    
    // Consulta completa
    const query = `
      from(bucket: "${bucket}")
        ${timeFilter}
        ${sensorFilter}
        |> filter(fn: (r) => r._measurement == "zigbee_sensor_state" or r._measurement == "mqtt_consumer")
        |> pivot(rowKey:["_time"], columnKey: ["_field"], valueColumn: "_value")
    `;
    
    console.log(`Ejecutando consulta: ${query}`);
    
    // Ejecutar consulta
    const result = await queryApi.collectRows(query);
    console.log(`Obtenidos ${result.length} registros de InfluxDB`);
    
    // Obtener información de la sesión para el nombre del archivo
    let sessionName = 'unknown';
    try {
      // Importamos storage de manera dinámica para evitar dependencias circulares
      const { storage } = require('./storage');
      const session = await storage.getSessionById(Number(sessionId));
      if (session && session.name) {
        // Sanitizar el nombre para usarlo en nombre de archivo
        sessionName = session.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      }
    } catch (error) {
      console.error('Error obteniendo nombre de sesión:', error);
    }
    
    // Nombre de archivo basado en formato solicitado y nombre de sesión
    const fileName = `sensor_data_${sessionName}_${sessionId}.${format}`;
    const filePath = path.join(tempDir, fileName);
    
    // Guardar resultado en archivo del formato solicitado
    if (format === 'json') {
      // Guardar como JSON
      fs.writeFileSync(filePath, JSON.stringify(result, null, 2));
    } else {
      // Convertir a CSV si hay datos
      if (result && Array.isArray(result) && result.length > 0) {
        try {
          const firstItem = result[0] as Record<string, any>;
          const fields = Object.keys(firstItem);
          const parser = new Parser({ fields });
          const csv = parser.parse(result as any[]);
          fs.writeFileSync(filePath, csv);
        } catch (csvError) {
          console.error('Error convirtiendo a CSV:', csvError);
          // Guardar como JSON como fallback
          fs.writeFileSync(filePath.replace('.csv', '.json'), JSON.stringify(result, null, 2));
          return filePath.replace('.csv', '.json');
        }
      } else {
        // Crear un CSV vacío con encabezados predeterminados si no hay datos
        fs.writeFileSync(filePath, 'timestamp,topic,sensor_id,value,type\n');
      }
    }
    
    console.log(`Archivo generado en: ${filePath}`);
    return filePath;
  } catch (error) {
    console.error('Error exportando datos de sensores:', error);
    throw error;
  }
}

/**
 * Obtiene los últimos datos de los sensores para mostrar en tiempo real
 */
export async function getLatestSensorData(sensorIds?: string[]): Promise<Record<string, any>> {
  try {
    let sensorFilter = '';
    if (sensorIds && sensorIds.length > 0) {
      const sensorList = sensorIds.map(id => `"${id}"`).join(', ');
      sensorFilter = `|> filter(fn: (r) => contains(value: r.sensor_id, set: [${sensorList}]))`;
    }
    
    const query = `
      from(bucket: "${bucket}")
        |> range(start: -5m)
        ${sensorFilter}
        |> filter(fn: (r) => r._measurement == "zigbee_sensor_state" or r._measurement == "mqtt_consumer")
        |> last()
        |> pivot(rowKey:["sensor_id"], columnKey: ["_field"], valueColumn: "_value")
    `;
    
    const result = await queryApi.collectRows(query);
    
    // Transformar resultados en un objeto más sencillo de usar
    if (result && Array.isArray(result) && result.length > 0) {
      return result.reduce((acc: Record<string, any>, item: any) => {
        if (item && item.sensor_id) {
          acc[item.sensor_id] = item;
        }
        return acc;
      }, {});
    }
    
    return {};
  } catch (error) {
    console.error('Error obteniendo datos recientes de sensores:', error);
    return {};
  }
}

// Verificar la conexión con InfluxDB
export async function testInfluxDBConnection(): Promise<boolean> {
  try {
    const query = `from(bucket: "${bucket}") |> range(start: -10s) |> limit(n: 1)`;
    await queryApi.collectRows(query);
    return true;
  } catch (error) {
    console.error('Error conectando con InfluxDB:', error);
    return false;
  }
}