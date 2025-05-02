import * as mqtt from 'mqtt';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { logger } from '../client/src/lib/services/logger';

// Obtener la ruta del directorio actual en módulos ES
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Definir la ruta para las sesiones
const SESSIONS_DIR = path.join(__dirname, '../sessions');

class MQTTClient {
  private static instance: MQTTClient;
  private client: mqtt.MqttClient | null = null;
  private activeSessions: Map<string, string[]> = new Map(); // sessionId -> sensorIds
  private detectedDevices: Set<string> = new Set(); // Almacena IDs de dispositivos detectados
  private deviceDetails: Map<string, any> = new Map(); // Almacena detalles completos de dispositivos

  // Variables para retry
  private maxRetryAttempts = 20;
  private retryCount = 0;
  private retryInterval = 5000; // 5 segundos
  private reconnecting = false;

  // Constructor privado (Singleton)
  private constructor() {
    // Asegurar que el directorio de sesiones existe
    if (!fs.existsSync(SESSIONS_DIR)) {
      fs.mkdirSync(SESSIONS_DIR, { recursive: true });
    }
  }

  // Método estático para obtener la instancia
  public static getInstance(): MQTTClient {
    if (!MQTTClient.instance) {
      MQTTClient.instance = new MQTTClient();
    }
    return MQTTClient.instance;
  }

  // Método para capturar todos los mensajes MQTT en un archivo CSV
  private saveAllMqttMessagesToCSV(sessionId: string, topic: string, payload: any): void {
    try {
      if (!sessionId) return;
      
      // Normalizar sessionId para rutas de archivo
      const safeSessionId = sessionId.replace(/[^a-z0-9_-]/gi, '_');
      const sessionDir = path.join(SESSIONS_DIR, `Session${safeSessionId}`);
      
      // Asegurar que existe el directorio
      if (!fs.existsSync(sessionDir)) {
        fs.mkdirSync(sessionDir, { recursive: true });
      }
      
      // Ruta al archivo CSV
      const csvFilePath = path.join(sessionDir, 'all_data.csv');
      
      // Crear una línea para el CSV
      const timestamp = new Date().toISOString();
      const payloadStr = typeof payload === 'object' ? JSON.stringify(payload) : String(payload);
      
      // Escapar comillas en los campos para evitar problemas con el formato CSV
      const escapedTopic = topic.replace(/"/g, '""');
      const escapedPayload = payloadStr.replace(/"/g, '""');
      
      // Crear línea CSV (timestamp, topic, payload)
      const csvLine = `"${timestamp}","${escapedTopic}","${escapedPayload}"\n`;
      
      // Añadir encabezado si el archivo no existe
      if (!fs.existsSync(csvFilePath)) {
        fs.writeFileSync(csvFilePath, '"timestamp","topic","payload"\n', { encoding: 'utf8', flag: 'a' });
        logger.info(`CSV file created for session ${sessionId}`);
      }
      
      // Añadir línea al archivo CSV
      fs.appendFileSync(csvFilePath, csvLine, { encoding: 'utf8' });
      
    } catch (err) {
      logger.error(`Error saving MQTT message to CSV for session ${sessionId}:`, { errorDetails: err });
    }
  }

  // Conectar al broker MQTT
  public async connect(brokerUrl?: string): Promise<boolean> {
    if (this.client) {
      return true; // Ya conectado
    }

    try {
      // Usar valor de entorno si no se pasa un brokerUrl
      const mqttBrokerUrl = brokerUrl || process.env.MQTT_BROKER_URL || 'ws://localhost:1883';
      const mqttUsername = process.env.MQTT_USERNAME;
      const mqttPassword = process.env.MQTT_PASSWORD;
      
      logger.info(`Intento ${this.retryCount+1}: Conectando a MQTT broker en ${mqttBrokerUrl}`);

      const clientOptions: mqtt.IClientOptions = {
        clientId: `mqtt-client-${Math.random().toString(16).substr(2, 8)}`,
        clean: true,
        reconnectPeriod: 5000, // Reconexión automática cada 5 segundos
        connectTimeout: 10000, // 10 segundos timeout
      };

      // Añadir credenciales si están configuradas
      if (mqttUsername && mqttPassword) {
        clientOptions.username = mqttUsername;
        clientOptions.password = mqttPassword;
      }

      this.client = mqtt.connect(mqttBrokerUrl, clientOptions);

      this.client.on('connect', () => {
        logger.info('Connected to MQTT broker');
        this.retryCount = 0; // Resetear contador de intentos
        this.reconnecting = false;
        
        // Suscribirse a todos los tópicos
        this.client?.subscribe(['#'], (err) => {
          if (err) {
            logger.error('Error subscribing to topics:', err);
          } else {
            logger.info('Subscribed to all MQTT topics (#)');
          }
        });
      });

      this.client.on('error', (err) => {
        logger.error('MQTT connection error:', err);
      });

      this.client.on('close', () => {
        logger.info('MQTT client disconnected');
        
        // Si no estamos ya en proceso de reconexión y hemos superado el número de intentos
        if (!this.reconnecting && this.retryCount >= this.maxRetryAttempts) {
          logger.warn(`Demasiados intentos fallidos. Máximo ${this.maxRetryAttempts} intentos alcanzado según reglas de operación, broker no disponible.`);
          return;
        }
        
        // Iniciar proceso de reconexión
        if (!this.reconnecting) {
          this.reconnecting = true;
          this.retryConnection();
        }
      });

      this.client.on('message', async (topic, message) => {
        await this.handleMessage(topic, message);
      });

      // Esperar promesa para determinar si la conexión es exitosa
      return new Promise((resolve) => {
        // Si ya estamos conectados, resolver inmediatamente
        if (this.client?.connected) {
          resolve(true);
          return;
        }

        // Definir timeouts y eventos para manejar éxito/fracaso
        const connectTimeout = setTimeout(() => {
          // Eliminar listeners para evitar memory leaks
          this.client?.removeListener('connect', connectHandler);
          this.client?.removeListener('error', errorHandler);
          
          this.retryCount++;
          
          if (this.retryCount >= this.maxRetryAttempts) {
            logger.warn(`Máximo número de intentos (${this.maxRetryAttempts}) alcanzado`);
            resolve(false);
          } else {
            // Intentar reconectar
            this.reconnecting = true;
            this.retryConnection();
            resolve(false);
          }
        }, 15000); // 15 segundos para conectar

        const connectHandler = () => {
          clearTimeout(connectTimeout);
          this.client?.removeListener('error', errorHandler);
          resolve(true);
        };

        const errorHandler = () => {
          // No resolvemos aquí, dejamos que el timeout maneje el error
        };

        this.client?.once('connect', connectHandler);
        this.client?.once('error', errorHandler);
      });
    } catch (error) {
      logger.error('MQTT connection failed:', error);
      return false;
    }
  }

  // Método para reintentar la conexión
  private retryConnection(): void {
    if (this.retryCount >= this.maxRetryAttempts) {
      logger.warn(`Máximo número de intentos (${this.maxRetryAttempts}) alcanzado según reglas de operación, operando sin broker MQTT.`);
      this.reconnecting = false;
      return;
    }

    // Limpiar cliente anterior si existe
    if (this.client) {
      this.client.end(true);
      this.client = null;
    }

    setTimeout(async () => {
      this.retryCount++;
      await this.connect();
    }, this.retryInterval);
  }

  private async handleMessage(topic: string, message: Buffer): Promise<void> {
    // Ignorar tópicos de sistema no necesarios para el funcionamiento del Observer Pattern
    // pero mantenemos los topics de dispositivos que pueden tener información importante
    if (topic.includes('bridge/') && !topic.includes('bridge/devices')) {
      return;
    }
    
    try {
      // Intentar parsear el mensaje como JSON
      let payload: any;
      try {
        payload = JSON.parse(message.toString());
        
        // Añadir al mapa de sensores para acceso offline
        const { sensorDataMapper } = await import('./sensor-data-mapper');
        sensorDataMapper.addSensorFromMqttTopic(topic, payload);
        
        // Si hay sesiones activas, guardar los datos para cada sensor pertinente
        if (this.activeSessions.size > 0) {
          this.saveSensorData(topic, payload);
          
          // Guardar todos los mensajes MQTT en CSV para cada sesión activa
          for (const sessionId of this.activeSessions.keys()) {
            this.saveAllMqttMessagesToCSV(sessionId, topic, payload);
          }
        }
      } catch (e) {
        // Si no es JSON, usar el mensaje crudo
        payload = message.toString();
        
        // Aún guardar datos no-JSON en sesiones activas como texto
        if (this.activeSessions.size > 0) {
          logger.info(`Mensaje no-JSON recibido en topic: ${topic}`);
          this.saveSensorData(topic, { raw: payload });
          
          // Guardar todos los mensajes MQTT en CSV para cada sesión activa
          for (const sessionId of this.activeSessions.keys()) {
            this.saveAllMqttMessagesToCSV(sessionId, topic, { raw: payload });
          }
        }
      }
      
      // Extraer y registrar dispositivo para su posterior descubrimiento
      // Esto permite que cualquier dispositivo que publique en MQTT sea detectado automáticamente
      const topicParts = topic.split('/');
      if (topicParts.length >= 2 && topicParts[0] === 'zigbee2mqtt') {
        let deviceId = '';
        
        // Formato común zigbee2mqtt/deviceId
        if (topicParts.length === 2) {
          deviceId = topicParts[1];
        } 
        // Formato zigbee2mqtt/location/deviceId
        else if (topicParts.length >= 3) {
          deviceId = topicParts[2];
        }
        
        if (deviceId && deviceId !== 'bridge') {
          // Añadir a dispositivos detectados
          this.detectedDevices.add(deviceId);
          
          // Guardar detalles completos del dispositivo si es JSON
          if (typeof payload === 'object') {
            // Añadir información básica si no existe en el payload
            const details = {
              ...payload,
              id: deviceId,
              topic: topic,
              lastSeen: new Date().toISOString()
            };
            this.deviceDetails.set(deviceId, details);
          }
        }
      }
      
      // Actualizar lista de dispositivos - adicionalmente capturando topics especiales
      // Aquí podemos añadir otros patrones de topic específicos de dispositivos
      // Mantenemos esto genérico para permitir formatos desconocidos de topic
      if ((topic.includes('/device') || topic.includes('/sensor')) && typeof payload === 'object') {
        const possibleIds = [payload.ieee_addr, payload.id, payload.device_id];
        
        for (const id of possibleIds) {
          if (id) {
            this.detectedDevices.add(id);
            const details = {
              ...payload,
              topic: topic,
              lastSeen: new Date().toISOString()
            };
            this.deviceDetails.set(id, details);
            break;
          }
        }
      }
      
    } catch (err) {
      logger.error('Error processing MQTT message:', err);
    }
  }

  private saveSensorData(topic: string, payload: any): void {
    // Para cada sesión activa, verificar si algún sensor está subscrito
    for (const [sessionId, sensorIds] of this.activeSessions.entries()) {
      // Guardar para cada sensor pertinente que esté registrado en la sesión
      const topicParts = topic.split('/');
      if (topicParts.length < 2) continue;
      
      let sensorId = '';
      
      // Extraer ID del sensor del topic
      if (topicParts[0] === 'zigbee2mqtt') {
        if (topicParts.length === 2) {
          sensorId = topicParts[1];
        } else if (topicParts.length >= 3) {
          sensorId = topicParts[2];
        }
      } else {
        // Para otros formatos de topic, intentar extraer el sensorId
        // Asumimos que el último segmento puede ser un ID
        sensorId = topicParts[topicParts.length - 1];
      }
      
      // Verificar si el sensor está en esta sesión
      // También guardar cualquier mensaje para análisis posterior si está en una sesión activa
      if (sensorId && (sensorIds.includes(sensorId) || sensorIds.includes('*'))) {
        this.saveDataToSessionFile(sessionId, sensorId, topic, payload);
        this.updateConsolidatedDataFile(sessionId, sensorId, payload);
      }
    }
  }

  private saveDataToSessionFile(sessionId: string, sensorId: string, topic: string, payload: any): void {
    try {
      // Normalizar sessionId y sensorId para uso en ruta de archivos
      const safeSessionId = sessionId.replace(/[^a-z0-9_-]/gi, '_');
      const safeSensorId = sensorId.replace(/[^a-z0-9_-]/gi, '_');
      
      // Crear directorio de sesión si no existe
      const sessionDir = path.join(SESSIONS_DIR, `Session${safeSessionId}`);
      if (!fs.existsSync(sessionDir)) {
        fs.mkdirSync(sessionDir, { recursive: true });
      }
      
      // Crear directorio de sensores para la sesión
      const sensorsDir = path.join(sessionDir, 'sensors');
      if (!fs.existsSync(sensorsDir)) {
        fs.mkdirSync(sensorsDir);
      }
      
      // Ruta al archivo de datos del sensor
      const dataFilePath = path.join(sensorsDir, `${safeSensorId}.json`);
      
      // Leer datos existentes o crear archivo vacío
      let sensorData: any[] = [];
      if (fs.existsSync(dataFilePath)) {
        const fileContent = fs.readFileSync(dataFilePath, 'utf8');
        try {
          sensorData = JSON.parse(fileContent);
        } catch (e) {
          logger.error(`Error parsing sensor data file ${dataFilePath}:`, e);
          // Continuar con array vacío
        }
      }
      
      // Añadir nueva lectura con timestamp
      const datapoint = {
        timestamp: new Date().toISOString(),
        topic,
        payload
      };
      
      sensorData.push(datapoint);
      
      // Limitar el tamaño del histórico (últimas 500 lecturas)
      const MAX_HISTORY = 500;
      if (sensorData.length > MAX_HISTORY) {
        sensorData = sensorData.slice(-MAX_HISTORY);
      }
      
      // Guardar datos actualizados
      fs.writeFileSync(dataFilePath, JSON.stringify(sensorData, null, 2));
      
    } catch (err) {
      logger.error(`Error guardando datos de sensor ${sensorId} para sesión ${sessionId}:`, err);
    }
  }

  private updateConsolidatedDataFile(sessionId: string, sensorId: string, payload: any): void {
    try {
      // Normalizar sessionId para ruta de archivo
      const safeSessionId = sessionId.replace(/[^a-z0-9_-]/gi, '_');
      const sessionDir = path.join(SESSIONS_DIR, `Session${safeSessionId}`);
      
      // Asegurar que existe el directorio
      if (!fs.existsSync(sessionDir)) {
        fs.mkdirSync(sessionDir, { recursive: true });
      }
      
      // Ruta al archivo de datos consolidados
      const sessionDataPath = path.join(sessionDir, 'session_data.json');
      
      // Leer datos existentes o crear estructura inicial
      let sessionData: any = {
        sessionId,
        startTime: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
        sensors: {}
      };
      
      if (fs.existsSync(sessionDataPath)) {
        const fileContent = fs.readFileSync(sessionDataPath, 'utf8');
        try {
          sessionData = JSON.parse(fileContent);
        } catch (e) {
          logger.error(`Error parsing session data file ${sessionDataPath}:`, e);
          // Continuar con estructura inicial
        }
      }
      
      // Añadir o actualizar datos del sensor
      if (!sessionData.sensors[sensorId]) {
        // Inicializar sensor si no existe
        sessionData.sensors[sensorId] = {
          id: sensorId,
          firstSeen: new Date().toISOString(),
          lastUpdated: new Date().toISOString(),
          data: []
        };
      }
      
      // Añadir nueva lectura
      const datapoint = {
        timestamp: new Date().toISOString(),
        payload
      };
      
      sessionData.sensors[sensorId].data.push(datapoint);
      
      // Limitar número de puntos de datos por sensor
      const MAX_DATA_POINTS = 100;
      if (sessionData.sensors[sensorId].data.length > MAX_DATA_POINTS) {
        sessionData.sensors[sensorId].data = sessionData.sensors[sensorId].data.slice(-MAX_DATA_POINTS);
      }
      
      // Actualizar timestamps
      sessionData.sensors[sensorId].lastUpdated = new Date().toISOString();
      sessionData.lastUpdated = new Date().toISOString();
      
      // Guardar archivo actualizado
      fs.writeFileSync(sessionDataPath, JSON.stringify(sessionData, null, 2));
      
    } catch (err) {
      logger.error(`Error actualizando archivo de datos consolidados para sesión ${sessionId}:`, err);
    }
  }

  // Desconectar el cliente MQTT
  public disconnect(): void {
    if (this.client) {
      this.client.end();
      this.client = null;
    }
  }
  
  // Los métodos de simulación han sido eliminados para garantizar
  // que el sistema solo utilice conexiones reales a dispositivos en entornos clínicos.
  private simulateMQTTClient(): void {
    logger.error('La simulación de MQTT ha sido deshabilitada. El sistema requiere una conexión real a un broker MQTT.');
    throw new Error('MQTT simulation disabled - real broker required');
  }
  
  // Método para simular mensajes periódicos de sensores (sustituido)
  private startSimulatedSensors(): void {
    logger.error('La simulación de sensores ha sido deshabilitada. El sistema requiere sensores reales.');
    throw new Error('Sensor simulation disabled - real sensors required');
  }

  // Obtener lista de dispositivos detectados
  public getDetectedDevices(): string[] {
    return Array.from(this.detectedDevices);
  }

  // Obtener detalles completos de un dispositivo
  public getDeviceDetails(deviceId: string): any {
    return this.deviceDetails.get(deviceId);
  }

  // Obtener detalles de todos los dispositivos
  public getAllDevicesDetails(): any[] {
    const devices: any[] = [];
    this.deviceDetails.forEach((details, id) => {
      devices.push({
        id,
        ...details
      });
    });
    return devices;
  }

  // Iniciar una nueva sesión de grabación que incluya sensores específicos
  public startSession(sessionId: string, sensorIds: string[] = []): boolean {
    try {
      // Normalizar sessionId para uso en ruta de archivos
      const safeSessionId = sessionId.replace(/[^a-z0-9_-]/gi, '_');
      
      // Crear directorio de sesión
      const sessionDir = path.join(SESSIONS_DIR, `Session${safeSessionId}`);
      if (!fs.existsSync(sessionDir)) {
        fs.mkdirSync(sessionDir, { recursive: true });
      }
      
      // Si no se especifican sensores, incluir todos (*) para captura total
      if (!sensorIds || sensorIds.length === 0) {
        sensorIds = ['*']; // * significa todos los sensores
      }
      
      // Registrar sesión activa
      this.activeSessions.set(sessionId, sensorIds);
      
      // Crear archivo de metadatos de la sesión
      const metadataPath = path.join(sessionDir, 'metadata.json');
      const metadata = {
        sessionId,
        startTime: new Date().toISOString(),
        sensorIds,
        status: 'active'
      };
      
      fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
      
      logger.info(`Session ${sessionId} started with sensors: ${sensorIds.join(', ')}`);
      return true;
    } catch (err) {
      logger.error(`Error starting session ${sessionId}:`, err);
      return false;
    }
  }

  // Detener una sesión de grabación activa
  public stopSession(sessionId: string): boolean {
    try {
      if (!this.activeSessions.has(sessionId)) {
        logger.warn(`Session ${sessionId} not found or already stopped`);
        return false;
      }
      
      // Eliminar de sesiones activas
      this.activeSessions.delete(sessionId);
      
      // Actualizar metadatos de la sesión
      const safeSessionId = sessionId.replace(/[^a-z0-9_-]/gi, '_');
      const sessionDir = path.join(SESSIONS_DIR, `Session${safeSessionId}`);
      const metadataPath = path.join(sessionDir, 'metadata.json');
      
      if (fs.existsSync(metadataPath)) {
        const metadataStr = fs.readFileSync(metadataPath, 'utf8');
        const metadata = JSON.parse(metadataStr);
        
        metadata.endTime = new Date().toISOString();
        metadata.status = 'completed';
        
        fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
      }
      
      logger.info(`Session ${sessionId} stopped`);
      return true;
    } catch (err) {
      logger.error(`Error stopping session ${sessionId}:`, err);
      return false;
    }
  }

  // Verificar si una sesión está activa
  public isSessionActive(sessionId: string): boolean {
    return this.activeSessions.has(sessionId);
  }

  // Obtener lista de sesiones activas
  public getActiveSessions(): string[] {
    return Array.from(this.activeSessions.keys());
  }

  // Obtener lista de sensores incluidos en una sesión
  public getSessionSensors(sessionId: string): string[] | null {
    const sensors = this.activeSessions.get(sessionId);
    return sensors ? [...sensors] : null;
  }
}

const mqttClient = MQTTClient.getInstance();
export default mqttClient;