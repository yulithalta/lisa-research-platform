import fs from 'fs';
import path from 'path';
import { logger } from '../client/src/lib/services/logger';

const CACHE_FILE = path.join(process.cwd(), 'data', 'sensors-cache.json');
const DATA_DIR = path.join(process.cwd(), 'data');

// Asegurar que el directorio data existe
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

interface SensorData {
  id: string;
  friendlyName?: string;
  topic: string;
  type: string;
  lastSeen: string;
  data: any;
}

/**
 * Clase para gestionar la lista de sensores sin depender de conexión MQTT
 * Implementa un patrón Repository para almacenamiento y recuperación de datos
 */
export class SensorDataMapper {
  private static instance: SensorDataMapper;
  private sensors: Map<string, SensorData> = new Map();

  private constructor() {
    this.loadFromCache();
    logger.info('SensorDataMapper initialized');
  }

  /**
   * Obtener instancia única (Singleton)
   */
  public static getInstance(): SensorDataMapper {
    if (!SensorDataMapper.instance) {
      SensorDataMapper.instance = new SensorDataMapper();
    }
    return SensorDataMapper.instance;
  }

  /**
   * Añadir o actualizar datos de un sensor
   * @param sensorId ID del sensor
   * @param data Datos del sensor
   */
  public addOrUpdateSensor(sensorId: string, data: Partial<SensorData>): void {
    if (!sensorId || typeof sensorId !== 'string') {
      logger.warn('Invalid sensor ID provided to addOrUpdateSensor');
      return;
    }

    // Existe ya el sensor?
    const existingSensor = this.sensors.get(sensorId);

    const updatedData: SensorData = {
      id: sensorId,
      friendlyName: data.friendlyName || existingSensor?.friendlyName || sensorId,
      topic: data.topic || existingSensor?.topic || `zigbee2mqtt/${sensorId}`,
      type: data.type || existingSensor?.type || 'unknown',
      lastSeen: data.lastSeen || new Date().toISOString(),
      data: data.data || existingSensor?.data || {}
    };

    this.sensors.set(sensorId, updatedData);
    
    // Solo guardamos en cache cada 10 actualizaciones para evitar IO excesivo
    if (Math.random() < 0.1) {
      this.saveToCache();
    }
  }

  /**
   * Añadir sensores desde un topic MQTT
   * @param topic Topic MQTT
   * @param payload Datos del mensaje
   */
  public addSensorFromMqttTopic(topic: string, payload: any): void {
    if (!topic || typeof topic !== 'string') {
      logger.warn('Invalid topic provided to addSensorFromMqttTopic');
      return;
    }

    // Extraer ID del sensor del topic
    const topicParts = topic.split('/');
    if (topicParts.length < 2 || topicParts[0] !== 'zigbee2mqtt') {
      // No es un topic de zigbee2mqtt
      return;
    }

    let sensorId = '';
    let type = 'unknown';

    // Extraer ID según formato del topic
    if (topicParts.length === 2) {
      // zigbee2mqtt/device_id
      sensorId = topicParts[1];
    } else if (topicParts.length >= 3) {
      // zigbee2mqtt/room/device_id o zigbee2mqtt/bridge/devices
      if (topicParts[1] === 'bridge' && topicParts[2] === 'devices') {
        // Caso especial del listado de dispositivos
        type = 'device-list';
        sensorId = 'bridge-devices';
      } else {
        // Formato anidado normal
        sensorId = topicParts.slice(1).join('/');
      }
    }

    if (!sensorId) {
      return;
    }

    // Procesar nombre amigable desde el payload
    let friendlyName = undefined;
    if (payload && typeof payload === 'object') {
      // Intento 1: payload.friendly_name (formato común en zigbee2mqtt)
      if (payload.friendly_name) {
        friendlyName = payload.friendly_name;
      }
      // Intento 2: payload.friendlyName (formato alternativo)
      else if (payload.friendlyName) {
        friendlyName = payload.friendlyName;
      }
      // Intento 3: buscar recursivamente un friendly_name (para bridge/devices)
      else if (type === 'device-list' && Array.isArray(payload)) {
        // No hacer nada, es un listado
      }
    }

    // Determinar mejor tipo para el sensor
    if (type === 'unknown') {
      if (topic.includes('sensor')) {
        type = 'sensor';
      } else if (topic.includes('switch') || topic.includes('light')) {
        type = 'actuator';
      } else if (topic.includes('bridge')) {
        type = 'bridge';
      }
    }

    // Actualizar o crear el sensor
    this.addOrUpdateSensor(sensorId, {
      topic,
      type,
      friendlyName,
      lastSeen: new Date().toISOString(),
      data: payload
    });
  }

  /**
   * Obtener todos los sensores como array
   */
  public getAllSensors(): SensorData[] {
    return Array.from(this.sensors.values());
  }

  /**
   * Cargar datos de sensors desde archivo de cache
   */
  private loadFromCache(): void {
    try {
      if (fs.existsSync(CACHE_FILE)) {
        const data = fs.readFileSync(CACHE_FILE, 'utf-8');
        const sensors = JSON.parse(data);
        
        if (Array.isArray(sensors)) {
          sensors.forEach(sensor => {
            if (sensor && sensor.id) {
              this.sensors.set(sensor.id, sensor);
            }
          });
          logger.info(`Loaded ${sensors.length} sensors from cache`);
        }
      }
    } catch (error) {
      logger.error('Error loading sensors from cache:', error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * Guardar sensores en archivo de cache
   */
  private saveToCache(): void {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      
      const sensors = Array.from(this.sensors.values());
      fs.writeFileSync(CACHE_FILE, JSON.stringify(sensors, null, 2));
    } catch (error) {
      logger.error('Error saving sensors to cache:', error instanceof Error ? error.message : String(error));
    }
  }
}

export const sensorDataMapper = SensorDataMapper.getInstance();