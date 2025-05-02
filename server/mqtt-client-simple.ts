/**
 * Cliente MQTT simplificado que captura datos de forma más confiable
 * Se especializa en capturar todos los metadatos de sensores, incluyendo batería, calidad de enlace, etc.
 */

import mqtt from 'mqtt';
import fs from 'fs';
import path from 'path';

// Configuración
const MQTT_TOPICS = [
  'zigbee2mqtt/#',                 // Todos los tópicos de zigbee2mqtt
  'zigbee2mqtt/livinglab/#',       // Tópicos específicos del LivingLab
  'zigbee2mqtt/+/get',             // Solicitudes de obtención de estado 
  'zigbee2mqtt/bridge/devices',    // Lista de dispositivos del puente
  'zigbee2mqtt/bridge/state',      // Estado del puente
  'livinglab/#',                   // Tópicos personalizados del LivingLab
  'sensors/#'                      // Otros sensores genéricos
];

// URLs del broker MQTT - se intentará conectar en orden
const MQTT_BROKER_URLS = [
  'ws://192.168.0.20:9001',
  'ws://a5a8d67d-3abb-427f-8689-59b608778fc7-00-5iifxwlowm0j.riker.replit.dev:9001',
  'ws://mqtt:9001'  // URL relativo para Docker/entornos contenedorizados
];

// Directorio para almacenar datos
const DATA_DIR = path.join(process.cwd(), 'data');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');

// Asegurar que los directorios existan
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

class MqttClient {
  public client: mqtt.MqttClient | null = null;
  private connected = false;
  private reconnecting = false;
  private devicesList: any[] = [];
  private messageCache: Map<string, any[]> = new Map();
  private topics: Set<string> = new Set();
  private lastSave = Date.now();
  private saveInterval: NodeJS.Timeout | null = null;
  private backupInterval: NodeJS.Timeout | null = null;
  private messageCounter = 0;
  private connectionAttempt = 0;
  private activeSessions: Map<number, { path: string, sensors: string[] }> = new Map();
  
  /**
   * Conecta al broker MQTT
   */
  async connect() {
    try {
      if (this.client) {
        console.log('Cliente MQTT ya está conectado o intentando conectar');
        return;
      }
      
      // Resetear contador de intentos si es una nueva conexión
      if (!this.reconnecting) {
        this.connectionAttempt = 0;
      }
      
      // Elegir broker URL basado en el intento actual (rotación)
      const brokerUrl = MQTT_BROKER_URLS[this.connectionAttempt % MQTT_BROKER_URLS.length];
      this.connectionAttempt++;
      
      console.log(`🔄 Conectando a broker MQTT: ${brokerUrl}`);
      
      // Opciones de conexión
      const options: mqtt.IClientOptions = {
        clientId: `lisa-mqtt-client-${Date.now()}`,
        clean: true,
        reconnectPeriod: 5000, // 5 segundos entre reconexiones automáticas
        connectTimeout: 10000, // 10 segundos de timeout
        keepalive: 60,
        rejectUnauthorized: false
      };
      
      // Crear cliente y conectar
      this.client = mqtt.connect(brokerUrl, options);
      
      // Configurar manejadores de eventos
      this.client.on('connect', () => {
        console.log(`✅ Conectado a broker MQTT: ${brokerUrl}`);
        this.connected = true;
        this.reconnecting = false;
        
        // Suscribirse a los tópicos
        this.subscribeToTopics();
        
        // Configurar intervalo para guardar datos
        this.setupIntervals();
        
        // Solicitar lista de dispositivos
        this.requestDevicesList();
      });
      
      this.client.on('message', (topic, message) => {
        this.handleMessage(topic, message);
      });
      
      this.client.on('error', (err) => {
        console.error(`❌ Error en cliente MQTT: ${err.message}`);
        
        // Si hay error de conexión, intentar siguiente broker
        if (!this.connected && !this.reconnecting) {
          console.log('Intentando con siguiente broker MQTT...');
          this.reconnecting = true;
          
          if (this.client) {
            this.client.end(true);
            this.client = null;
          }
          
          // Backoff exponencial entre intentos
          const delay = Math.min(30000, 1000 * Math.pow(2, Math.min(this.connectionAttempt, 5)));
          setTimeout(() => {
            this.connect();
          }, delay);
        }
      });
      
      this.client.on('close', () => {
        this.connected = false;
        console.log('Conexión MQTT cerrada');
        
        // Limpiar intervalos cuando se cierra la conexión
        if (this.saveInterval) {
          clearInterval(this.saveInterval);
        }
        
        if (this.backupInterval) {
          clearInterval(this.backupInterval);
        }
      });
      
      this.client.on('reconnect', () => {
        console.log('Intentando reconectar a MQTT...');
      });
      
      // Cargar datos iniciales si existen
      this.loadCachedData();
      
    } catch (error) {
      console.error('Error al inicializar cliente MQTT:', error);
      throw error;
    }
  }
  
  /**
   * Suscribe a todos los tópicos definidos
   */
  private subscribeToTopics() {
    if (!this.client || !this.connected) {
      console.log('No se puede suscribir, cliente no conectado');
      return;
    }
    
    MQTT_TOPICS.forEach(topic => {
      this.client?.subscribe(topic, (err) => {
        if (err) {
          console.error(`Error al suscribirse al tópico ${topic}:`, err);
        } else {
          console.log(`Suscrito a tópico: ${topic}`);
        }
      });
    });
  }
  
  /**
   * Solicita lista de dispositivos al broker Zigbee2MQTT
   */
  private requestDevicesList() {
    if (!this.client || !this.connected) {
      console.log('No se puede solicitar dispositivos, cliente no conectado');
      return;
    }
    
    // Solicitar dispositivos publicando en el tópico de solicitud
    this.client.publish('zigbee2mqtt/bridge/request/devices', 
      JSON.stringify({ transaction: `request-devices-${Date.now()}` }));
    
    console.log('Solicitando lista de dispositivos Zigbee');
  }
  
  /**
   * Configura los intervalos para guardar y hacer backup de datos
   */
  private setupIntervals() {
    // Guardar datos cada 5 minutos
    this.saveInterval = setInterval(() => {
      this.saveData();
    }, 5 * 60 * 1000);
    
    // Backup automático cada 30 minutos
    this.backupInterval = setInterval(() => {
      this.createBackup();
    }, 30 * 60 * 1000);
  }
  
  /**
   * Maneja los mensajes recibidos
   */
  private handleMessage(topic: string, message: Buffer) {
    try {
      // Agregar tópico a la lista de tópicos conocidos
      this.topics.add(topic);
      
      // Intentar parsear el mensaje como JSON
      let parsedMessage: any;
      const messageStr = message.toString();
      
      try {
        parsedMessage = JSON.parse(messageStr);
      } catch (e) {
        // Si no es JSON, usar el string como está
        parsedMessage = messageStr;
      }
      
      // Agregar timestamp al mensaje
      const messageWithTimestamp = {
        topic,
        payload: parsedMessage,
        timestamp: new Date().toISOString()
      };
      
      // Guardar en caché de mensajes por tópico
      if (!this.messageCache.has(topic)) {
        this.messageCache.set(topic, []);
      }
      
      const messages = this.messageCache.get(topic);
      if (messages) {
        // Limitar a 100 mensajes por tópico para evitar memory leaks
        if (messages.length >= 100) {
          messages.shift(); // Eliminar el mensaje más antiguo
        }
        messages.push(messageWithTimestamp);
      }
      
      // Si hay sesiones activas, guardar mensajes para cada sesión (VERSIÓN MEJORADA Y OPTIMIZADA)
      if (this.activeSessions.size > 0) {
        // Procesar mensaje para cada sesión activa
        this.activeSessions.forEach((sessionInfo, sessionId) => {
          try {
            // Si no hay sensores específicos o el tópico coincide con alguno
            const shouldSave = 
              sessionInfo.sensors.length === 0 || 
              sessionInfo.sensors.some(sensorId => topic.includes(sensorId));
            
            if (shouldSave) {
              const sessionDir = path.dirname(sessionInfo.path);
              const sensorDataDir = path.join(sessionDir, 'sensor_data');
              const mqttDataDir = path.join(sessionDir, 'mqtt_data');
              
              // Identificar el sensor a partir del tópico
              let sensorId = '';
              const topicParts = topic.split('/');
              if (topicParts.length >= 2) {
                sensorId = topicParts[topicParts.length - 2] || topicParts[topicParts.length - 1];
              } else {
                sensorId = topic.replace(/[^a-zA-Z0-9-_]/g, '_');
              }
              
              // Extraer metadatos de interés si es un objeto
              let battery = '';
              let linkquality = '';
              let temperature = null;
              let humidity = null;
              let motion = null;
              let presence = null;
              let contact = null;
              
              if (typeof parsedMessage === 'object') {
                battery = parsedMessage.battery !== undefined ? parsedMessage.battery : '';
                linkquality = parsedMessage.linkquality !== undefined ? parsedMessage.linkquality : '';
                temperature = parsedMessage.temperature !== undefined ? parsedMessage.temperature : null;
                humidity = parsedMessage.humidity !== undefined ? parsedMessage.humidity : null;
                motion = parsedMessage.motion !== undefined ? parsedMessage.motion : 
                         parsedMessage.occupancy !== undefined ? parsedMessage.occupancy : null;
                presence = parsedMessage.presence !== undefined ? parsedMessage.presence : null;
                contact = parsedMessage.contact !== undefined ? parsedMessage.contact : null;
              }
              
              // Preparar payload para CSV
              let csvPayload = '';
              if (typeof parsedMessage === 'object') {
                csvPayload = JSON.stringify(parsedMessage).replace(/"/g, '""');
              } else {
                csvPayload = String(parsedMessage).replace(/"/g, '""');
              }
              
              // 1. ACTUALIZAR ARCHIVO CSV PRINCIPAL PARA TODO EL TRÁFICO MQTT
              try {
                if (sessionInfo.csvPath && fs.existsSync(mqttDataDir)) {
                  const mqttCsvPath = sessionInfo.csvPath || path.join(mqttDataDir, `session_${sessionId}_mqtt_traffic.csv`);
                  // Escribir línea CSV: timestamp,topic,payload,sensor_id,battery,linkquality
                  const csvLine = `"${messageWithTimestamp.timestamp}","${topic}","${csvPayload}","${sensorId}","${battery}","${linkquality}"\n`;
                  fs.appendFileSync(mqttCsvPath, csvLine);
                }
              } catch (mqttCsvError) {
                console.error(`Error escribiendo CSV MQTT para sesión ${sessionId}:`, mqttCsvError);
              }
              
              // 2. ACTUALIZAR CSV ESPECÍFICOS POR TIPO DE SENSOR
              try {
                if (fs.existsSync(sensorDataDir)) {
                  // Si hay datos de temperatura
                  if (temperature !== null) {
                    const tempCsvPath = path.join(sensorDataDir, 'temperature_sensors.csv');
                    if (fs.existsSync(tempCsvPath)) {
                      // timestamp,sensor_id,temperature,battery,linkquality
                      const tempLine = `"${messageWithTimestamp.timestamp}","${sensorId}","${temperature}","${battery}","${linkquality}"\n`;
                      fs.appendFileSync(tempCsvPath, tempLine);
                    }
                  }
                  
                  // Si hay datos de humedad
                  if (humidity !== null) {
                    const humCsvPath = path.join(sensorDataDir, 'humidity_sensors.csv');
                    if (fs.existsSync(humCsvPath)) {
                      // timestamp,sensor_id,humidity,battery,linkquality
                      const humLine = `"${messageWithTimestamp.timestamp}","${sensorId}","${humidity}","${battery}","${linkquality}"\n`;
                      fs.appendFileSync(humCsvPath, humLine);
                    }
                  }
                  
                  // Si hay datos de movimiento o presencia
                  if (motion !== null || presence !== null) {
                    const motionCsvPath = path.join(sensorDataDir, 'motion_sensors.csv');
                    if (fs.existsSync(motionCsvPath)) {
                      // timestamp,sensor_id,motion,battery,linkquality
                      const motionVal = motion !== null ? motion : (presence !== null ? presence : false);
                      const motionLine = `"${messageWithTimestamp.timestamp}","${sensorId}","${motionVal}","${battery}","${linkquality}"\n`;
                      fs.appendFileSync(motionCsvPath, motionLine);
                    }
                  }
                }
              } catch (sensorCsvError) {
                console.warn(`Error escribiendo CSV por tipo de sensor: ${sensorCsvError.message}`);
              }
              
              // 3. ACTUALIZAR ARCHIVO JSON ESPECÍFICO POR SENSOR
              try {
                // Verificar si existe el directorio para datos de sensores
                if (fs.existsSync(sensorDataDir)) {
                  // Ruta para archivo específico de este sensor
                  const sensorFile = path.join(sensorDataDir, `${sensorId}.json`);
                  
                  // Datos del mensaje formateados para este sensor - Capturamos todo el payload
                  const sensorData = {
                    timestamp: messageWithTimestamp.timestamp,
                    topic,
                    value: parsedMessage,
                    // Guardar payload completo para tener todos los datos sin excepción
                    payload: parsedMessage
                  };
                  
                  // Extraer metadatos específicos si están disponibles para facilitar análisis
                  if (typeof parsedMessage === 'object') {
                    // Añadir toda la información disponible para dispositivos típicos
                    // Extracción explícita para facilitar análisis posterior
                    const metadataKeys = [
                      'battery', 'voltage', 'linkquality', 'last_seen', 
                      'temperature', 'humidity', 'pressure', 'occupancy', 
                      'presence', 'contact', 'state', 'motion', 'illuminance_lux',
                      'illuminance', 'power', 'energy', 'current', 'device_temperature',
                      'update', 'update_available', 'water_leak', 'tamper', 'smoke',
                      'rssi', 'position', 'battery_low', 'action', 'brightness'
                    ];
                    
                    // Añadir cada metadato si existe
                    for (const key of metadataKeys) {
                      if (parsedMessage[key] !== undefined) {
                        sensorData[key] = parsedMessage[key];
                      }
                    }
                  }
                  
                  // Si existe el archivo, actualizarlo; si no, crearlo
                  if (fs.existsSync(sensorFile)) {
                    // Leer datos existentes
                    try {
                      const existingData = JSON.parse(fs.readFileSync(sensorFile, 'utf8'));
                      
                      // Añadir nuevo dato
                      if (!existingData.data) {
                        existingData.data = [];
                      }
                      existingData.data.push(sensorData);
                      
                      // Guardar actualizado
                      fs.writeFileSync(sensorFile, JSON.stringify(existingData, null, 2));
                    } catch (readError) {
                      console.error(`Error leyendo archivo de sensor ${sensorId}:`, readError);
                    }
                  } else {
                    // Crear nuevo archivo
                    const newSensorData = {
                      sensorId,
                      sessionId,
                      startTime: new Date().toISOString(),
                      data: [sensorData]
                    };
                    fs.writeFileSync(sensorFile, JSON.stringify(newSensorData, null, 2));
                  }
                  
                  // También actualizar CSV específico por sensor si existe
                  const sensorCsvFile = path.join(sensorDataDir, `${sensorId}.csv`);
                  if (fs.existsSync(sensorCsvFile)) {
                    let csvValue = '';
                    if (typeof parsedMessage === 'object') {
                      // Intentar extraer el valor principal o usar el objeto completo
                      const mainValue = 
                        parsedMessage.temperature !== undefined ? parsedMessage.temperature :
                        parsedMessage.humidity !== undefined ? parsedMessage.humidity :
                        parsedMessage.occupancy !== undefined ? parsedMessage.occupancy :
                        parsedMessage.presence !== undefined ? parsedMessage.presence : 
                        parsedMessage.contact !== undefined ? parsedMessage.contact :
                        parsedMessage.state !== undefined ? parsedMessage.state :
                        JSON.stringify(parsedMessage);
                      
                      csvValue = String(mainValue).replace(/"/g, '""');
                    } else {
                      csvValue = String(parsedMessage).replace(/"/g, '""');
                    }
                    
                    // Escribir línea CSV: timestamp,topic,value,battery,linkquality
                    const csvLine = `"${messageWithTimestamp.timestamp}","${topic}","${csvValue}","${battery}","${linkquality}"\n`;
                    fs.appendFileSync(sensorCsvFile, csvLine);
                  }
                }
              } catch (sensorError) {
                console.warn(`Error procesando datos específicos para sensor en tópico ${topic}:`, sensorError);
              }
              
              // 4. ACTUALIZAR ARCHIVO JSON PRINCIPAL DE TRÁFICO MQTT
              try {
                if (sessionInfo.jsonPath && fs.existsSync(mqttDataDir)) {
                  const mqttJsonPath = sessionInfo.jsonPath;
                  
                  // Leer datos actuales si el archivo existe
                  if (fs.existsSync(mqttJsonPath)) {
                    // Actualizar solo cada 20 mensajes para evitar sobrecarga
                    if ((this.messageCounter % 20) === 0) {
                      try {
                        const mqttData = JSON.parse(fs.readFileSync(mqttJsonPath, 'utf8'));
                        
                        // Añadir mensaje
                        if (!mqttData.messages) {
                          mqttData.messages = [];
                        }
                        
                        mqttData.messages.push(messageWithTimestamp);
                        
                        // Limitar tamaño para evitar archivos enormes
                        if (mqttData.messages.length > 1000) {
                          mqttData.messages = mqttData.messages.slice(-1000);
                        }
                        
                        // Actualizar estadísticas
                        mqttData.lastUpdateTime = new Date().toISOString();
                        mqttData.messagesCount = (mqttData.messagesCount || 0) + 1;
                        
                        // Escribir a un archivo temporal y renombrar para evitar corrupción
                        const tempPath = `${mqttJsonPath}.tmp`;
                        fs.writeFileSync(tempPath, JSON.stringify(mqttData, null, 2));
                        try {
                          fs.renameSync(tempPath, mqttJsonPath);
                        } catch (renameError) {
                          // Intentar copiar si falla el renombrado
                          fs.copyFileSync(tempPath, mqttJsonPath);
                          try { fs.unlinkSync(tempPath); } catch (e) {}
                        }
                      } catch (jsonReadError) {
                        console.error(`Error leyendo archivo JSON MQTT: ${jsonReadError.message}`);
                      }
                    }
                  }
                }
              } catch (mqttJsonError) {
                console.error(`Error actualizando archivo JSON MQTT para sesión ${sessionId}:`, mqttJsonError);
              }
              
              // 5. ACTUALIZAR LOG DE MQTT PARA DEBUGGING
              try {
                if (sessionInfo.logPath && fs.existsSync(mqttDataDir)) {
                  // Actualizar solo cada 100 mensajes para no saturar el log
                  if ((this.messageCounter % 100) === 0) {
                    const logMessage = `[${new Date().toISOString()}] Tópico: ${topic}, Sensor: ${sensorId}\n`;
                    fs.appendFileSync(sessionInfo.logPath, logMessage);
                  }
                }
              } catch (logError) {
                // Error silencioso para el log
              }
              
              // 6. ACTUALIZAR ARCHIVO JSON PRINCIPAL (PARA COMPATIBILIDAD)
              if (fs.existsSync(sessionInfo.path)) {
                try {
                  // Leer datos actuales
                  const data = JSON.parse(fs.readFileSync(sessionInfo.path, 'utf8'));
                  
                  // Añadir mensaje
                  if (!data.messages) {
                    data.messages = [];
                  }
                  
                  data.messages.push(messageWithTimestamp);
                  
                  // Limitar tamaño del array para evitar archivos enormes
                  if (data.messages.length > 500) {
                    data.messages = data.messages.slice(-500);
                  }
                  
                  // Para evitar escribir en cada mensaje, guardar solo periódicamente
                  const now = Date.now();
                  if (now - this.lastSave > 10000) { // Cada 10 segundos
                    fs.writeFileSync(sessionInfo.path, JSON.stringify(data, null, 2));
                    this.lastSave = now;
                  }
                } catch (dataError) {
                  console.error(`Error actualizando archivo principal para sesión ${sessionId}:`, dataError);
                }
              }
            }
          } catch (sessionError) {
            console.error(`Error general procesando mensaje para sesión ${sessionId}:`, sessionError);
          }
        });
      }
      
      // Procesamiento especial para mensajes específicos
      if (topic === 'zigbee2mqtt/bridge/devices') {
        this.devicesList = parsedMessage;
        console.log(`Recibida lista de ${this.devicesList.length} dispositivos`);
        
        // Guardar lista de dispositivos inmediatamente
        this.saveDevicesList();
      }
      
      // Actualizar contador de mensajes
      this.messageCounter++;
      
      // Guardar datos después de cada 3 mensajes o si han pasado más de 30 segundos
      const now = Date.now();
      if (this.messageCounter >= 3 || (now - this.lastSave > 30000)) {
        this.saveData();
        this.messageCounter = 0;
        this.lastSave = now;
      }
      
    } catch (error) {
      console.error(`Error al procesar mensaje MQTT en tópico ${topic}:`, error);
    }
  }
  
  /**
   * Guarda datos en archivos
   */
  private saveData() {
    try {
      // Guardar caché de mensajes
      const messagesData = JSON.stringify(Object.fromEntries(this.messageCache));
      const tempMessagesPath = path.join(DATA_DIR, 'mqtt-messages.tmp.json');
      const messagesPath = path.join(DATA_DIR, 'mqtt-messages.json');
      
      // Escribir a archivo temporal primero (operación atómica)
      fs.writeFileSync(tempMessagesPath, messagesData);
      fs.renameSync(tempMessagesPath, messagesPath);
      
      // Guardar lista de tópicos
      const topicsData = JSON.stringify(Array.from(this.topics));
      const tempTopicsPath = path.join(DATA_DIR, 'mqtt-topics.tmp.json');
      const topicsPath = path.join(DATA_DIR, 'mqtt-topics.json');
      
      fs.writeFileSync(tempTopicsPath, topicsData);
      fs.renameSync(tempTopicsPath, topicsPath);
      
      console.log(`Datos MQTT guardados: ${this.messageCache.size} tópicos, ${this.topics.size} tópicos únicos`);
    } catch (error) {
      console.error('Error al guardar datos MQTT:', error);
    }
  }
  
  /**
   * Guarda la lista de dispositivos
   */
  private saveDevicesList() {
    try {
      const devicesData = JSON.stringify(this.devicesList);
      const tempPath = path.join(DATA_DIR, 'zigbee-devices.tmp.json');
      const finalPath = path.join(DATA_DIR, 'zigbee-devices.json');
      
      fs.writeFileSync(tempPath, devicesData);
      fs.renameSync(tempPath, finalPath);
      
      console.log(`Lista de dispositivos guardada: ${this.devicesList.length} dispositivos`);
    } catch (error) {
      console.error('Error al guardar lista de dispositivos:', error);
    }
  }
  
  /**
   * Crea una copia de seguridad de los datos
   */
  private createBackup() {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      
      // Backup de mensajes
      const messagesPath = path.join(DATA_DIR, 'mqtt-messages.json');
      const messagesBackupPath = path.join(BACKUP_DIR, `mqtt-messages-${timestamp}.json`);
      
      if (fs.existsSync(messagesPath)) {
        fs.copyFileSync(messagesPath, messagesBackupPath);
      }
      
      // Backup de dispositivos
      const devicesPath = path.join(DATA_DIR, 'zigbee-devices.json');
      const devicesBackupPath = path.join(BACKUP_DIR, `zigbee-devices-${timestamp}.json`);
      
      if (fs.existsSync(devicesPath)) {
        fs.copyFileSync(devicesPath, devicesBackupPath);
      }
      
      // Limitar número de backups (mantener solo los 10 más recientes)
      this.cleanupOldBackups();
      
      console.log(`Backup creado: ${timestamp}`);
    } catch (error) {
      console.error('Error al crear backup:', error);
    }
  }
  
  /**
   * Limpia backups antiguos
   */
  private cleanupOldBackups() {
    try {
      const MAX_BACKUPS = 10;
      
      // Listar archivos de backup y ordenar por fecha
      const backupFiles = fs.readdirSync(BACKUP_DIR)
        .filter(file => file.startsWith('mqtt-messages-') || file.startsWith('zigbee-devices-'))
        .sort((a, b) => {
          // Ordenar de más reciente a más antiguo
          return fs.statSync(path.join(BACKUP_DIR, b)).mtime.getTime() - 
                 fs.statSync(path.join(BACKUP_DIR, a)).mtime.getTime();
        });
      
      // Eliminar backups antiguos
      if (backupFiles.length > MAX_BACKUPS) {
        const filesToRemove = backupFiles.slice(MAX_BACKUPS);
        
        filesToRemove.forEach(file => {
          fs.unlinkSync(path.join(BACKUP_DIR, file));
          console.log(`Eliminado backup antiguo: ${file}`);
        });
      }
    } catch (error) {
      console.error('Error al limpiar backups antiguos:', error);
    }
  }
  
  /**
   * Carga datos de caché desde archivos si existen
   */
  private loadCachedData() {
    try {
      // Cargar mensajes
      const messagesPath = path.join(DATA_DIR, 'mqtt-messages.json');
      if (fs.existsSync(messagesPath)) {
        const messagesData = fs.readFileSync(messagesPath, 'utf8');
        const messages = JSON.parse(messagesData);
        
        this.messageCache = new Map(Object.entries(messages));
        console.log(`Cargados ${this.messageCache.size} tópicos desde caché`);
      }
      
      // Cargar tópicos
      const topicsPath = path.join(DATA_DIR, 'mqtt-topics.json');
      if (fs.existsSync(topicsPath)) {
        const topicsData = fs.readFileSync(topicsPath, 'utf8');
        const topics = JSON.parse(topicsData);
        
        this.topics = new Set(topics);
        console.log(`Cargados ${this.topics.size} tópicos únicos desde caché`);
      }
      
      // Cargar dispositivos
      const devicesPath = path.join(DATA_DIR, 'zigbee-devices.json');
      if (fs.existsSync(devicesPath)) {
        const devicesData = fs.readFileSync(devicesPath, 'utf8');
        this.devicesList = JSON.parse(devicesData);
        console.log(`Cargados ${this.devicesList.length} dispositivos desde caché`);
      }
    } catch (error) {
      console.error('Error al cargar datos desde caché:', error);
    }
  }
  
  /**
   * Obtiene la lista de dispositivos Zigbee
   */
  getDevicesList(): any[] {
    return this.devicesList;
  }
  
  /**
   * Obtiene la lista de tópicos disponibles
   */
  getTopics(): string[] {
    return Array.from(this.topics);
  }
  
  /**
   * Obtiene el historial de mensajes para un tópico específico
   */
  getMessageHistory(topic: string): any[] {
    return this.messageCache.get(topic) || [];
  }
  
  /**
   * Registra una sesión para captura de datos de sensores de manera simple y directa
   * @param sessionId ID de la sesión
   * @param dataPath Ruta donde se guardarán los datos
   * @param selectedSensors Lista de sensores seleccionados (opcional)
   */
  registerSession(sessionId: number, dataPath: string, selectedSensors: string[] = []) {
    console.log(`\n\n⚡ Registrando sesión ${sessionId} para captura de datos MQTT`);
    console.log(`Ruta de almacenamiento: ${dataPath}`);
    console.log(`Sensores seleccionados: ${selectedSensors.length ? selectedSensors.join(', ') : 'todos'}`);
    
    try {
      // Crear la carpeta de la sesión si no existe
      const sessionDir = path.dirname(dataPath);
      if (!fs.existsSync(sessionDir)) {
        fs.mkdirSync(sessionDir, { recursive: true });
        console.log(`Creado directorio para la sesión: ${sessionDir}`);
      }
      
      // Crear carpeta específica para datos de sensores
      const sensorDataDir = path.join(sessionDir, 'sensor_data');
      if (!fs.existsSync(sensorDataDir)) {
        fs.mkdirSync(sensorDataDir, { recursive: true });
        console.log(`Creado directorio para datos de sensores: ${sensorDataDir}`);
      }
      
      // Crear carpeta específica para datos MQTT
      const mqttDataDir = path.join(sessionDir, 'mqtt_data');
      if (!fs.existsSync(mqttDataDir)) {
        fs.mkdirSync(mqttDataDir, { recursive: true });
        console.log(`Creado directorio para datos MQTT: ${mqttDataDir}`);
      }
      
      // 1. Crear archivo JSON completo para todo el tráfico MQTT
      const mqttJsonPath = path.join(mqttDataDir, `session_${sessionId}_mqtt_traffic.json`);
      fs.writeFileSync(mqttJsonPath, JSON.stringify({
        sessionId,
        startTime: new Date().toISOString(),
        endTime: null,
        messages: []
      }, null, 2));
      console.log(`✅ Creado archivo JSON para todo el tráfico MQTT: ${mqttJsonPath}`);
      
      // 2. Crear archivo CSV para todo el tráfico MQTT (fácil análisis Excel)
      const mqttCsvPath = path.join(mqttDataDir, `session_${sessionId}_mqtt_traffic.csv`);
      // Encabezado con campos relevantes para análisis
      fs.writeFileSync(mqttCsvPath, 'timestamp,topic,payload,sensor_id,battery,linkquality\n');
      console.log(`✅ Creado archivo CSV para tráfico MQTT: ${mqttCsvPath}`);
      
      // 3. Crear CSV por tipo de sensor (temperatura, humedad, etc) para gráficas
      // Temperatura
      fs.writeFileSync(
        path.join(sensorDataDir, `temperature_sensors.csv`),
        'timestamp,sensor_id,temperature,battery,linkquality\n'
      );
      // Humedad
      fs.writeFileSync(
        path.join(sensorDataDir, `humidity_sensors.csv`),
        'timestamp,sensor_id,humidity,battery,linkquality\n'
      );
      // Movimiento/Presencia
      fs.writeFileSync(
        path.join(sensorDataDir, `motion_sensors.csv`),
        'timestamp,sensor_id,motion,battery,linkquality\n'
      );
      console.log(`✅ Creados archivos CSV para tipos específicos de sensores`);
      
      // 4. Crear archivo de registro de datos MQTT
      const mqttLogPath = path.join(mqttDataDir, `session_${sessionId}_mqtt.log`);
      fs.writeFileSync(mqttLogPath, `[${new Date().toISOString()}] Iniciando captura de datos MQTT para sesión ${sessionId}\n`);
      fs.appendFileSync(mqttLogPath, `[${new Date().toISOString()}] Sensores seleccionados: ${selectedSensors.length ? selectedSensors.join(', ') : 'todos'}\n`);
      
      // Registrar sesión activa con rutas actualizadas
      this.activeSessions.set(sessionId, {
        path: dataPath,
        jsonPath: mqttJsonPath,
        csvPath: mqttCsvPath,
        logPath: mqttLogPath,
        sensors: selectedSensors,
        startTime: new Date().toISOString()
      });
      
      console.log(`✅ Sesión ${sessionId} registrada exitosamente para captura de datos MQTT`);
      
      // Crear archivo inicial de datos JSON (para compatibilidad)
      if (!fs.existsSync(dataPath)) {
        fs.writeFileSync(dataPath, JSON.stringify({
          sessionId,
          startTime: new Date().toISOString(),
          selectedSensors,
          messages: [],
          status: 'active'
        }, null, 2));
        console.log(`Archivo JSON de datos inicializado: ${dataPath}`);
      }
      
      // También crear un directorio de archivos individuales por sensor
      for (const sensorId of selectedSensors) {
        // Crear un archivo para cada sensor seleccionado
        const sensorFile = path.join(sensorDataDir, `${sensorId}.json`);
        fs.writeFileSync(sensorFile, JSON.stringify({
          sensorId,
          sessionId,
          startTime: new Date().toISOString(),
          data: []
        }, null, 2));
        console.log(`Inicializado archivo para sensor ${sensorId}: ${sensorFile}`);
        
        // También crear un CSV por sensor
        const sensorCsvFile = path.join(sensorDataDir, `${sensorId}.csv`);
        fs.writeFileSync(sensorCsvFile, 'timestamp,topic,value,battery,linkquality\n');
      }
      
      // Solicitar estado actual de todos los dispositivos si estamos conectados
      if (this.client && this.connected) {
        // Publicar mensaje para solicitar actualización de todos los dispositivos
        this.client.publish('zigbee2mqtt/bridge/request/devices/get', '');
        console.log('Solicitada actualización de estado de dispositivos para la sesión');
      } else {
        console.log('Cliente MQTT no conectado, no se pudo solicitar actualización de dispositivos');
      }
    } catch (error) {
      console.error(`Error al registrar sesión ${sessionId}:`, error);
    }
  }
  
  /**
   * Finaliza la captura de datos para una sesión
   * @param sessionId ID de la sesión
   */
  endSession(sessionId: number) {
    console.log(`Finalizando captura de datos MQTT para sesión ${sessionId}`);
    
    if (this.activeSessions.has(sessionId)) {
      const sessionInfo = this.activeSessions.get(sessionId);
      
      if (sessionInfo && fs.existsSync(sessionInfo.path)) {
        try {
          // Leer datos actuales
          const data = JSON.parse(fs.readFileSync(sessionInfo.path, 'utf8'));
          
          // Actualizar estado y agregar timestamp de finalización
          data.status = 'completed';
          data.endTime = new Date().toISOString();
          
          // Crear archivo AllData.json con todos los datos completos de sensores
          try {
            const sessionDir = path.dirname(sessionInfo.path);
            const sensorDataDir = path.join(sessionDir, 'sensor_data');
            const allDataFile = path.join(sessionDir, 'AllData.json');
            
            // Recopilar todos los datos de sensores si existe la carpeta
            if (fs.existsSync(sensorDataDir)) {
              console.log(`Creando AllData.json con datos completos de sensores para sesión ${sessionId}`);
              
              const sensorFiles = fs.readdirSync(sensorDataDir)
                .filter(file => file.endsWith('.json'));
              
              // Cargar datos de todos los sensores
              const allSensorData = {};
              for (const file of sensorFiles) {
                try {
                  const sensorId = path.basename(file, '.json');
                  const sensorData = JSON.parse(fs.readFileSync(path.join(sensorDataDir, file), 'utf8'));
                  allSensorData[sensorId] = sensorData;
                } catch (e) {
                  console.error(`Error leyendo datos del sensor ${file}:`, e);
                }
              }
              
              // Crear objeto combinado con metadatos y datos de sensores
              const completeData = {
                ...data,
                sensors: allSensorData,
                topicsDiscovered: Array.from(this.topics),
                statistics: {
                  totalMessages: data.messages ? data.messages.length : 0,
                  sensorsCount: Object.keys(allSensorData).length,
                  captureFinished: new Date().toISOString(),
                  captureStatus: 'completed'
                }
              };
              
              // Guardar el archivo AllData.json
              fs.writeFileSync(allDataFile, JSON.stringify(completeData, null, 2));
              console.log(`Archivo AllData.json creado con éxito en ${allDataFile} con ${Object.keys(allSensorData).length} sensores`);
            }
          } catch (allDataError) {
            console.error(`Error creando AllData.json para sesión ${sessionId}:`, allDataError);
          }
          
          // Guardar datos actualizados
          fs.writeFileSync(sessionInfo.path, JSON.stringify(data, null, 2));
          console.log(`Datos de sesión ${sessionId} actualizados y marcados como completados`);
        } catch (error) {
          console.error(`Error al finalizar datos de sesión ${sessionId}:`, error);
        }
      }
      
      // Eliminar de sesiones activas
      this.activeSessions.delete(sessionId);
    } else {
      console.log(`No se encontró la sesión ${sessionId} en sesiones activas`);
    }
  }
  
  /**
   * Desconecta el cliente MQTT
   */
  disconnect() {
    if (this.client && this.connected) {
      // Guardar datos antes de desconectar
      this.saveData();
      this.client.end();
      this.client = null;
      this.connected = false;
      
      if (this.saveInterval) {
        clearInterval(this.saveInterval);
        this.saveInterval = null;
      }
      
      if (this.backupInterval) {
        clearInterval(this.backupInterval);
        this.backupInterval = null;
      }
      
      console.log('Cliente MQTT desconectado');
    }
  }
}

// Exportar una única instancia para usar en toda la aplicación
export const mqttClient = new MqttClient();