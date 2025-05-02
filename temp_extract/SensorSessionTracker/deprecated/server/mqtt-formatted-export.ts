import * as fs from 'fs';
import * as path from 'path';
import { logger } from '../client/src/lib/services/logger';

// Directorio para las sesiones
const SESSIONS_DIR = path.join(process.cwd(), 'sessions');

// Interfaz para datos de sensores formateados
interface FormattedSensorData {
  sensor: string;
  friendly_name: string;
  timestamp: string;
  estado: string;
  bateria: number;
  senal: number;
}

/**
 * Clase que gestiona la exportación de datos MQTT a formato CSV
 * con una estructura específica para análisis clínico
 */
export class MqttFormattedExport {
  /**
   * Formatea y guarda los datos de sensores en un CSV estructurado
   */
  public saveSensorDataToFormattedCSV(
    sessionId: string, 
    topic: string, 
    payload: any, 
    friendlyName: string
  ): void {
    try {
      if (!sessionId) return;
      
      // Normalizar sessionId para rutas de archivo
      const safeSessionId = sessionId.replace(/[^a-z0-9_-]/gi, '_');
      const sessionDir = path.join(SESSIONS_DIR, `Session${safeSessionId}`);
      
      // Asegurar que existe el directorio
      if (!fs.existsSync(sessionDir)) {
        fs.mkdirSync(sessionDir, { recursive: true });
      }
      
      // Ruta al archivo CSV estructurado
      const csvFilePath = path.join(sessionDir, 'sensor_data.csv');
      
      // Crear el encabezado si el archivo no existe
      if (!fs.existsSync(csvFilePath)) {
        fs.writeFileSync(
          csvFilePath, 
          'sensor,nombre_amigable,timestamp,estado,bateria,senal\n', 
          { encoding: 'utf8', flag: 'a' }
        );
        logger.info(`CSV estructurado creado para sesión ${sessionId}`);
      }
      
      // Extraer datos relevantes del payload
      const formattedData = this.extractSensorData(topic, payload, friendlyName);
      
      if (formattedData) {
        // Crear línea CSV
        const csvLine = `${formattedData.sensor},${formattedData.friendly_name},${formattedData.timestamp},${formattedData.estado},${formattedData.bateria},${formattedData.senal}\n`;
        
        // Añadir línea al archivo CSV
        fs.appendFileSync(csvFilePath, csvLine, { encoding: 'utf8' });
      }
      
    } catch (err) {
      logger.error(`Error guardando datos formateados de sensor para sesión ${sessionId}:`, { errorDetails: err });
    }
  }
  
  /**
   * Extrae datos relevantes del payload en formato estructurado
   */
  private extractSensorData(topic: string, payload: any, friendlyName: string): FormattedSensorData | null {
    try {
      // Timestamp actual o del mensaje si está disponible
      const timestamp = payload.last_seen || payload.time || new Date().toISOString();
      
      // Valores por defecto
      let estado = 'Desconocido';
      let bateria = 0;
      let senal = 0;
      
      // Extraer estado
      if (payload.contact !== undefined) {
        estado = payload.contact ? 'Cerrado' : 'Abierto';
      } else if (payload.occupancy !== undefined) {
        estado = payload.occupancy ? 'Ocupado' : 'Libre';
      } else if (payload.presence !== undefined) {
        estado = payload.presence ? 'Detectado' : 'No detectado';
      } else if (payload.state !== undefined) {
        estado = payload.state;
      } else if (payload.status !== undefined) {
        estado = payload.status;
      }
      
      // Extraer batería
      if (payload.battery !== undefined) {
        bateria = payload.battery;
      } else if (payload.batteryLevel !== undefined) {
        bateria = payload.batteryLevel;
      } else if (payload.battery_level !== undefined) {
        bateria = payload.battery_level;
      } else {
        bateria = 100; // Valor por defecto
      }
      
      // Extraer señal (linkquality)
      if (payload.linkquality !== undefined) {
        senal = payload.linkquality;
      } else if (payload.link_quality !== undefined) {
        senal = payload.link_quality;
      } else if (payload.rssi !== undefined) {
        senal = Math.abs(payload.rssi);
      } else {
        senal = 100; // Valor por defecto
      }
      
      // Crear objeto con datos formateados
      return {
        sensor: topic,
        friendly_name: friendlyName || 'Sin nombre',
        timestamp,
        estado,
        bateria,
        senal
      };
    } catch (error) {
      logger.error('Error extrayendo datos del sensor:', error);
      return null;
    }
  }
}

// Exportar instancia única
export const mqttFormattedExport = new MqttFormattedExport();