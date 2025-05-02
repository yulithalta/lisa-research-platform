import mqtt from "mqtt";
import fs from "fs";
import path from "path";
import { EventEmitter } from "events";

// Variable global para almacenar los dispositivos zigbee detectados
declare global {
  namespace NodeJS {
    interface Global {
      mqttClient: mqtt.MqttClient | null;
      zigbeeDevices: any[];
      zigbeeTopics: Set<string>;
      messagesCache: Map<string, any[]>;
    }
  }
}

// Cliente MQTT para el servidor
class MqttServerClient extends EventEmitter {
  client: mqtt.MqttClient | null = null;
  connected: boolean = false;
  config: {
    brokerUrl: string;
    baseTopic: string;
    clientId: string;
  };
  messageHistory: Map<string, any[]> = new Map();
  devicesList: any[] = [];
  topicsSet: Set<string> = new Set();
  messagesCache: Map<string, any[]> = new Map();
  activeSessions: Map<number, {
    sessionId: number,
    startTime: Date,
    dataFilePath: string,
    devices: any[]
  }> = new Map();
  
  private reconnectCount: number = 0;
  private maxReconnectAttempts: number = 5; // Limitar los intentos de reconexión
  private reconnectTimer: NodeJS.Timeout | null = null;
  
  // Lista de brokers para intentar conexión en orden de prioridad
  brokerUrls: string[] = [
    'ws://192.168.0.20:9001',         // Prioritario - IP específica con WebSocket
    'mqtt://192.168.0.20:1883',       // IP específica con MQTT nativo
    'ws://localhost:9001',            // Fallback local WebSocket
    'mqtt://localhost:1883'           // Fallback local MQTT nativo
  ];
  currentBrokerIndex: number = 0;     // Índice del broker actual
  
  constructor() {
    super();
    
    // Configuración
    this.config = {
      // Usar el broker configurado en env o el primero de la lista
      brokerUrl: process.env.MQTT_BROKER_URL || this.brokerUrls[0],
      baseTopic: process.env.MQTT_BASE_TOPIC || 'zigbee2mqtt',
      clientId: `lisa_server_${Math.floor(Math.random() * 10000)}`
    };
    
    // Exponer el cliente y datos globalmente
    global.mqttClient = null;
    global.zigbeeDevices = [];
    global.zigbeeTopics = new Set();
    global.messagesCache = new Map();
  }
  
  /**
   * Intenta conectarse al broker MQTT, probando varios brokers en secuencia
   * si la conexión principal falla
   */
  async connect() {
    if (this.client) {
      this.disconnect();
    }
    
    // Resetear estado
    this.reconnectCount = 0;
    this.connected = false;
    
    // Si hay una URL en las variables de entorno, usarla como primera opción
    if (process.env.MQTT_BROKER_URL) {
      this.brokerUrls.unshift(process.env.MQTT_BROKER_URL);
      // Eliminar duplicados si la URL ya estaba en la lista
      this.brokerUrls = [...new Set(this.brokerUrls)];
    }
    
    // Iniciar con el primer broker de la lista
    this.currentBrokerIndex = 0;
    return this.connectToBroker();
  }
  
  /**
   * Función interna para conectar al broker actual e intentar con el siguiente
   * si falla
   */
  private async connectToBroker() {
    if (this.currentBrokerIndex >= this.brokerUrls.length) {
      console.warn('[MQTT] Se han agotado todos los brokers disponibles. No hay conexión MQTT.');
      return true; // Retornamos true para no interrumpir la aplicación
    }
    
    // Actualizar URL del broker actual
    this.config.brokerUrl = this.brokerUrls[this.currentBrokerIndex];
    console.log(`[MQTT] Intentando broker ${this.currentBrokerIndex + 1}/${this.brokerUrls.length}: ${this.config.brokerUrl}`);
    
    try {
      // Conectar al broker MQTT con timeout para detectar fallos rápidamente
      this.client = mqtt.connect(this.config.brokerUrl, {
        clientId: `${this.config.clientId}_${Date.now()}`, // Asegurar ID único para cada intento
        clean: true,
        connectTimeout: 5000, // 5 segundos para timeout de conexión
        username: process.env.MQTT_USERNAME || undefined,
        password: process.env.MQTT_PASSWORD || undefined,
        reconnectPeriod: 0, // Desactivar reconexión automática para manejarla nosotros
        rejectUnauthorized: false // Permitir conexiones sin verificación SSL en desarrollo
      });
      
      // Manejar eventos de conexión
      this.client.on('connect', () => {
        console.log(`[MQTT] Conectado a ${this.config.brokerUrl}`);
        this.connected = true;
        global.mqttClient = this.client;
        
        // Suscribirse a los tópicos
        this.subscribeToTopics();
        
        // Solicitar la lista de dispositivos
        setTimeout(() => {
          this.requestDevicesList();
        }, 1000);
        
        this.emit('connect');
      });
      
      // Manejar errores
      this.client.on('error', (err) => {
        console.error(`[MQTT] Error: ${err.message}`);
        // Solo emitimos el evento pero no dejamos que la excepción sin manejar rompa la aplicación
        // La aplicación seguirá funcionando pero sin datos de sensores
        this.connected = false;
        global.mqttClient = null;
        this.client = null;
        console.warn('[MQTT] Desconectado debido a error. La aplicación continuará sin datos de sensores.');
        this.emit('error', err);
      });
      
      // Manejar reconexión con backoff exponencial y límite de intentos
      this.client.on('reconnect', () => {
        this.reconnectCount++;
        
        // Si superamos el límite de intentos, detener completamente las reconexiones
        if (this.reconnectCount > this.maxReconnectAttempts) {
          console.warn(`[MQTT] Número máximo de intentos (${this.maxReconnectAttempts}) alcanzado. Deteniendo reconexiones.`);
          if (this.client) {
            this.client.end(true); // Terminar completamente la conexión
            this.client = null;
          }
          console.warn('[MQTT] Reconexión MQTT desactivada. La aplicación continuará funcionando sin datos de sensores.');
          return;
        }
        
        const backoffTime = Math.round(5000 * Math.pow(1.5, this.reconnectCount - 1));
        console.log(`[MQTT] Intentando reconectar (intento ${this.reconnectCount}/${this.maxReconnectAttempts}, próximo intento en ${backoffTime/1000}s)...`);
        this.emit('reconnect');
      });
      
      // Manejar desconexión
      this.client.on('offline', () => {
        console.log('[MQTT] Desconectado');
        this.connected = false;
        this.emit('disconnect');
      });
      
      // Manejar cierre
      this.client.on('close', () => {
        console.log('[MQTT] Conexión cerrada');
        this.connected = false;
        this.emit('close');
      });
      
      // Manejar mensajes
      this.client.on('message', (topic, message) => {
        this.handleMessage(topic, message);
      });
      
      return true;
    } catch (error) {
      console.error(`[MQTT] Error al conectar: ${error.message}`);
      
      // Incluso en entorno de desarrollo, ya no usamos modo simulado
      // Informamos del error pero continuamos la ejecución
      console.log('[MQTT] Error de conexión con el broker MQTT. El sistema funcionará sin datos de sensores.');
      // Configuramos para que no se interrumpa la aplicación, solo se desactivan los sensores
      this.connected = false;
      global.mqttClient = null;
      global.zigbeeDevices = [];
      global.zigbeeTopics = new Set();
      
      // Mostramos advertencia pero retornamos true para que la aplicación no se interrumpa
      console.warn('[MQTT] La aplicación continuará funcionando sin datos de sensores MQTT.');
      return true;
    }
  }
  
  // Se eliminaron todas las funciones de simulación
  
  subscribeToTopics() {
    if (!this.client || !this.connected) return;
    
    const topics = [
      // Tópicos principales
      `${this.config.baseTopic}/#`,
      `${this.config.baseTopic}/+`,
      
      // Respuestas del bridge
      `${this.config.baseTopic}/bridge/devices`,
      `${this.config.baseTopic}/bridge/state`,
      `${this.config.baseTopic}/bridge/response/#`,
      
      // Dispositivos específicos
      `${this.config.baseTopic}/bridge/devices`,
      
      // Para compatibilidad con versiones anteriores
      `${this.config.baseTopic}/livinglab/#`
    ];
    
    topics.forEach(topic => {
      if (this.client) {
        this.client.subscribe(topic, (err) => {
          if (err) {
            console.error(`[MQTT] Error al suscribirse a ${topic}: ${err.message}`);
          } else {
            console.log(`[MQTT] Suscrito a ${topic}`);
          }
        });
      }
    });
  }
  
  disconnect() {
    if (this.client) {
      this.client.end(true);
      this.client = null;
      this.connected = false;
      global.mqttClient = null;
      console.log('[MQTT] Desconectado manualmente');
      this.emit('disconnect');
    }
  }
  
  handleMessage(topic: string, message: Buffer) {
    try {
      // Registrar el tópico
      this.topicsSet.add(topic);
      global.zigbeeTopics = this.topicsSet;
      
      // Añadir mensaje al historial
      let payload: any;
      try {
        payload = JSON.parse(message.toString());
      } catch (e) {
        payload = message.toString();
      }
      
      // Guardar mensaje en caché
      if (!this.messagesCache.has(topic)) {
        this.messagesCache.set(topic, []);
      }
      let messages = this.messagesCache.get(topic) || [];
      messages.push({
        timestamp: Date.now(),
        payload
      });
      
      // Limitar a 20 mensajes por tópico
      if (messages.length > 20) {
        messages = messages.slice(-20);
      }
      this.messagesCache.set(topic, messages);
      global.messagesCache = this.messagesCache;
      
      // Manejar diferentes tipos de mensajes
      if (topic === `${this.config.baseTopic}/bridge/devices`) {
        this.handleDevicesList(payload);
      }
      
      // Si hay sesiones activas, guardar mensaje en los archivos de sesión
      if (this.activeSessions.size > 0) {
        this.addMessageToSessions(topic, payload);
      }
      
      // Emitir mensaje para que otros componentes lo procesen
      this.emit('message', {
        topic,
        payload
      });
    } catch (error) {
      console.error(`[MQTT] Error al procesar mensaje: ${error.message}`);
    }
  }
  
  handleDevicesList(payload: any) {
    if (Array.isArray(payload)) {
      this.devicesList = payload;
      global.zigbeeDevices = payload;
      
      // Guardar lista en disco para análisis
      try {
        const dataDir = path.join(process.cwd(), 'data');
        if (!fs.existsSync(dataDir)) {
          fs.mkdirSync(dataDir, { recursive: true });
        }
        
        fs.writeFileSync(
          path.join(dataDir, 'zigbee_devices.json'),
          JSON.stringify(payload, null, 2)
        );
        
        console.log(`[MQTT] Lista de dispositivos actualizada: ${payload.length} dispositivos`);
        console.log(`[MQTT] Datos guardados en ${path.join(dataDir, 'zigbee_devices.json')}`);
      } catch (error) {
        console.error(`[MQTT] Error al guardar lista de dispositivos: ${error.message}`);
      }
    }
  }
  
  requestDevicesList() {
    if (!this.client || !this.connected) return;
    
    console.log('[MQTT] Solicitando lista de dispositivos');
    this.client.publish(
      `${this.config.baseTopic}/bridge/request/devices`,
      JSON.stringify({ transaction: `server-request-${Date.now()}` })
    );
  }
  
  publishMessage(topic: string, message: any) {
    if (!this.client || !this.connected) return false;
    
    try {
      const payload = typeof message === 'string' ? message : JSON.stringify(message);
      this.client.publish(topic, payload);
      return true;
    } catch (error) {
      console.error(`[MQTT] Error al publicar mensaje: ${error.message}`);
      return false;
    }
  }
  
  getDevicesList() {
    return this.devicesList;
  }
  
  getTopics() {
    return Array.from(this.topicsSet);
  }
  
  getMessageHistory(topic: string) {
    return this.messagesCache.get(topic) || [];
  }
  
  /**
   * Registra una nueva sesión para capturar datos de sensores
   * Implementa un sistema más robusto de manejo de archivos y directorios
   */
  registerSession(sessionId: number, dataFilePath: string, devices: any[] = []) {
    console.log(`[MQTT] Registrando sesión ${sessionId} para captura de datos de sensores`);
    
    // Si no hay dispositivos específicos, considerar todos los sensores zigbee conocidos
    let sensorDevices = devices;
    
    // Si no hay dispositivos proporcionados o están vacíos, usar todos los sensores zigbee conocidos
    if (!devices || devices.length === 0) {
      // Obtener todos los dispositivos zigbee y filtrar solo los sensores
      if (this.devicesList && this.devicesList.length > 0) {
        sensorDevices = this.devicesList.map(device => ({
          id: device.friendly_name || device.ieee_address,
          type: 'sensor',
          name: device.friendly_name || device.ieee_address,
          topic: `${this.config.baseTopic}/${device.friendly_name || device.ieee_address}`
        }));
        console.log(`[MQTT] Usando ${sensorDevices.length} sensores disponibles en Zigbee`);
      } else {
        // Si no hay dispositivos conocidos, suscribirse a todos los tópicos del broker
        sensorDevices = [{ 
          id: 'all_sensors', 
          type: 'sensor', 
          name: 'all_zigbee_sensors',
          topic: `${this.config.baseTopic}/#` 
        }];
        console.log('[MQTT] No hay lista de dispositivos, capturando todos los mensajes MQTT');
      }
    }
    
    // ---- SISTEMA ROBUSTO DE MANEJO DE DIRECTORIOS ----
    
    // 1. Crear una estructura completa de directorios para la sesión
    const sessionDir = path.dirname(dataFilePath);
    const backupDir = path.join(sessionDir, 'backup');
    const sensorDataDir = path.join(sessionDir, 'sensor_data');
    const logsDir = path.join(sessionDir, 'logs');
    
    try {
      // Crear todos los directorios necesarios
      [sessionDir, backupDir, sensorDataDir, logsDir].forEach(dir => {
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
          console.log(`[MQTT] Creado directorio: ${dir}`);
        }
      });
    } catch (dirError) {
      console.error(`[MQTT] Error crítico al crear estructura de directorios: ${dirError}`);
      
      // Intentar crear al menos el directorio principal
      try {
        if (!fs.existsSync(sessionDir)) {
          fs.mkdirSync(sessionDir, { recursive: true });
        }
      } catch (fallbackError) {
        console.error(`[MQTT] Error fatal, no se pudo crear ni siquiera el directorio principal: ${fallbackError}`);
        return false;
      }
    }
    
    // 2. Registrar la sesión con más información
    const sessionInfo = {
      sessionId,
      startTime: new Date(),
      dataFilePath,
      devices: sensorDevices,
      backupPath: path.join(backupDir, `session_${sessionId}_data.json`),
      sensorDataDir: sensorDataDir,
      consolidatedDataPath: path.join(sensorDataDir, 'sensor_data.json'),
      messageCount: 0,
      lastSaveTime: Date.now()
    };
    
    this.activeSessions.set(sessionId, sessionInfo);
    console.log(`[MQTT] Sesión ${sessionId} registrada con ${sensorDevices.length} sensores/tópicos`);
    
    // 3. Implementar sistema de guardado múltiple y verificación
    try {
      // Datos iniciales
      const initialData = {
        sessionId,
        startTime: new Date().toISOString(),
        devices: sensorDevices,
        messages: {},
        deviceData: {},
        captureConfig: {
          brokerUrl: this.config.brokerUrl,
          baseTopic: this.config.baseTopic,
          captureAllTopics: sensorDevices.some(d => d.id === 'all_sensors')
        },
        stats: {
          messageCount: 0,
          lastSaveTime: Date.now(),
          saveCount: 0
        }
      };
      
      // Guardado múltiple para evitar pérdida de datos
      const dataJson = JSON.stringify(initialData, null, 2);
      
      // Archivo principal
      fs.writeFileSync(dataFilePath, dataJson);
      
      // Copia de seguridad inicial
      fs.writeFileSync(sessionInfo.backupPath, dataJson);
      
      // Crear archivo consolidado
      fs.writeFileSync(sessionInfo.consolidatedDataPath, JSON.stringify([], null, 2));
      
      // Crear archivo de registro para la sesión
      fs.writeFileSync(
        path.join(logsDir, `session_${sessionId}_log.txt`),
        `[${new Date().toISOString()}] Sesión ${sessionId} iniciada\n` +
        `[${new Date().toISOString()}] Configuración: ${JSON.stringify(initialData.captureConfig)}\n` +
        `[${new Date().toISOString()}] Dispositivos registrados: ${sensorDevices.length}\n`
      );
      
      console.log(`[MQTT] Archivos de datos inicializados para sesión ${sessionId}`);
      console.log(`[MQTT] Archivo principal: ${dataFilePath}`);
      console.log(`[MQTT] Backup: ${sessionInfo.backupPath}`);
      console.log(`[MQTT] Datos consolidados: ${sessionInfo.consolidatedDataPath}`);
      
      // Programar guardado periódico de respaldo cada 30 segundos
      const backupInterval = setInterval(() => {
        if (this.activeSessions.has(sessionId)) {
          this.createBackup(sessionId);
        } else {
          clearInterval(backupInterval); // Detener el intervalo si la sesión ha terminado
        }
      }, 30000);
      
      return true;
    } catch (error) {
      console.error(`[MQTT] Error al inicializar archivos de datos: ${error}`);
      return false;
    }
  }
  
  /**
   * Crea una copia de seguridad de los datos de una sesión
   */
  private createBackup(sessionId: number) {
    const session = this.activeSessions.get(sessionId);
    if (!session) return false;
    
    try {
      // Leer archivo principal
      if (fs.existsSync(session.dataFilePath)) {
        const data = fs.readFileSync(session.dataFilePath, 'utf8');
        
        // Guardar copia de seguridad con timestamp
        const backupFile = path.join(
          path.dirname(session.backupPath),
          `session_${sessionId}_backup_${Date.now()}.json`
        );
        
        fs.writeFileSync(backupFile, data);
        console.log(`[MQTT] Backup automático creado: ${backupFile}`);
        
        // Mantener solo los últimos 5 backups para no llenar el disco
        try {
          const backupDir = path.dirname(session.backupPath);
          const files = fs.readdirSync(backupDir)
            .filter(f => f.startsWith(`session_${sessionId}_backup_`) && f.endsWith('.json'))
            .sort()
            .reverse();
          
          // Eliminar backups antiguos (mantener los 5 más recientes)
          if (files.length > 5) {
            files.slice(5).forEach(file => {
              try {
                fs.unlinkSync(path.join(backupDir, file));
              } catch (e) {
                // Ignorar errores al eliminar
              }
            });
          }
        } catch (cleanupError) {
          // Solo registrar, no interrumpir el proceso
          console.warn(`[MQTT] Error al limpiar backups antiguos: ${cleanupError}`);
        }
        
        return true;
      }
    } catch (error) {
      console.error(`[MQTT] Error al crear backup para sesión ${sessionId}: ${error}`);
    }
    
    return false;
  }
  
  /**
   * Finaliza la captura de datos para una sesión
   * Versión mejorada con verificación, archivos de respaldo y consolidación
   */
  endSession(sessionId: number) {
    console.log(`[MQTT] Finalizando captura de datos para sesión ${sessionId}`);
    
    if (!this.activeSessions.has(sessionId)) {
      console.log(`[MQTT] Sesión ${sessionId} no encontrada`);
      return false;
    }
    
    const session = this.activeSessions.get(sessionId);
    if (!session) return false;
    
    const endTime = new Date().toISOString();
    const duration = new Date().getTime() - new Date(session.startTime).getTime();
    
    try {
      // 1. CREAR ARCHIVO FINAL DE RESPALDO ANTES DE CUALQUIER MODIFICACIÓN
      const finalBackupDir = path.join(path.dirname(session.dataFilePath), 'backup');
      const finalBackupPath = path.join(finalBackupDir, `session_${sessionId}_final_${Date.now()}.json`);
      
      // Asegurar directorio de backup
      if (!fs.existsSync(finalBackupDir)) {
        fs.mkdirSync(finalBackupDir, { recursive: true });
      }
      
      // Crear copia de seguridad final (del archivo sin modificar)
      if (fs.existsSync(session.dataFilePath)) {
        fs.copyFileSync(session.dataFilePath, finalBackupPath);
        console.log(`[MQTT] Backup final creado: ${finalBackupPath}`);
      }
      
      // 2. ACTUALIZAR ARCHIVO PRINCIPAL
      try {
        // Leer el archivo actual
        let sessionData = JSON.parse(fs.readFileSync(session.dataFilePath, 'utf8'));
        
        // Actualizar con la hora de finalización
        sessionData.endTime = endTime;
        sessionData.duration = duration;
        sessionData.status = 'completed';
        
        // Añadir estadísticas de finalización
        if (!sessionData.stats) {
          sessionData.stats = {};
        }
        
        sessionData.stats.endTime = endTime;
        sessionData.stats.duration = duration;
        sessionData.stats.sensorCount = Object.keys(sessionData.deviceData || {}).length;
        sessionData.stats.topicCount = Object.keys(sessionData.messages || {}).length;
        
        try {
          const sensorDataDir = path.join(path.dirname(session.dataFilePath), 'sensor_data');
          
          // Contar archivos individuales de sensores
          if (fs.existsSync(sensorDataDir)) {
            const sensorFiles = fs.readdirSync(sensorDataDir)
              .filter(f => f.endsWith('.json') && !f.startsWith('sensor_data'));
            
            sessionData.stats.sensorFilesCount = sensorFiles.length;
          }
        } catch (e) {
          console.warn(`[MQTT] No se pudieron contar archivos de sensores: ${e}`);
        }
        
        // Guardar el archivo actualizado usando método de escritura segura
        const tempFilePath = `${session.dataFilePath}.tmp`;
        fs.writeFileSync(tempFilePath, JSON.stringify(sessionData, null, 2));
        fs.renameSync(tempFilePath, session.dataFilePath);
        
        // Añadir registro en el log
        const logsDir = path.join(path.dirname(session.dataFilePath), 'logs');
        if (fs.existsSync(logsDir)) {
          const logPath = path.join(logsDir, `session_${sessionId}_log.txt`);
          try {
            fs.appendFileSync(logPath, 
              `[${new Date().toISOString()}] Sesión ${sessionId} finalizada\n` +
              `[${new Date().toISOString()}] Duración: ${Math.round(duration / 1000)} segundos\n` +
              `[${new Date().toISOString()}] Datos guardados en: ${session.dataFilePath}\n`
            );
          } catch (logError) {
            console.warn(`[MQTT] No se pudo escribir en el log: ${logError}`);
          }
        }
        
        console.log(`[MQTT] Datos principales finalizados exitosamente para sesión ${sessionId}`);
      } catch (mainFileError) {
        console.error(`[MQTT] Error al actualizar archivo principal: ${mainFileError}`);
      }
      
      // 3. CREAR ARCHIVO ZIP PARA EXPORTACIÓN (opcional, si se necesita)
      try {
        const exportDir = path.join(path.dirname(session.dataFilePath), 'export');
        if (!fs.existsSync(exportDir)) {
          fs.mkdirSync(exportDir, { recursive: true });
        }
        
        // Archivo JSON simplificado y optimizado para exportación
        const exportData = {
          sessionId,
          startTime: session.startTime,
          endTime,
          duration,
          sensorCount: session.devices ? session.devices.length : 0,
          exportTime: new Date().toISOString()
        };
        
        const exportPath = path.join(exportDir, `session_${sessionId}_export.json`);
        fs.writeFileSync(exportPath, JSON.stringify(exportData, null, 2));
        
        console.log(`[MQTT] Archivo de exportación creado: ${exportPath}`);
      } catch (exportError) {
        console.warn(`[MQTT] Error al crear archivo de exportación: ${exportError}`);
      }
      
      // Eliminar la sesión activa
      this.activeSessions.delete(sessionId);
      
      console.log(`[MQTT] Captura de datos finalizada para sesión ${sessionId} con éxito`);
      return true;
    } catch (error) {
      console.error(`[MQTT] Error crítico al finalizar captura de datos: ${error}`);
      
      // Intentar una solución de emergencia usando los metadatos conocidos
      try {
        const emergencyPath = path.join(path.dirname(session.dataFilePath), `session_${sessionId}_emergency_end.json`);
        fs.writeFileSync(emergencyPath, JSON.stringify({
          sessionId,
          startTime: session.startTime,
          endTime,
          duration,
          error: "Finalización de emergencia debido a error",
          timestamp: new Date().toISOString()
        }, null, 2));
        
        console.warn(`[MQTT] Se creó un archivo de emergencia: ${emergencyPath}`);
      } catch (e) {
        // Si ni siquiera esto funciona, simplemente eliminamos la sesión activa
        console.error(`[MQTT] No se pudo crear ni siquiera archivo de emergencia: ${e}`);
      }
      
      // De todas formas eliminamos la sesión para no causar problemas
      this.activeSessions.delete(sessionId);
      
      return false;
    }
  }
  
  /**
   * Agrega un mensaje a los datos de las sesiones activas
   * Versión reforzada para garantizar la captura confiable de datos
   */
  addMessageToSessions(topic: string, message: any) {
    if (this.activeSessions.size === 0) return; // No hay sesiones activas
    
    // El tópico base de Zigbee
    const zigbeeBaseTopic = this.config.baseTopic;
    
    // Marcar inicio de procesamiento
    const processingStart = Date.now();
    
    // Para cada sesión activa, verificar si el tópico corresponde a algún dispositivo
    this.activeSessions.forEach((session, sessionId) => {
      try {
        let shouldCaptureMessage = false;
        let deviceIdentifier = '';
        
        // Detectar el identificador del dispositivo desde el tópico
        // Primero intentar extraer del formato zigbee2mqtt/DEVICE_ID
        if (topic.startsWith(zigbeeBaseTopic + '/')) {
          const topicParts = topic.substring((zigbeeBaseTopic + '/').length).split('/');
          if (topicParts.length > 0) {
            deviceIdentifier = topicParts[0];
          }
        }
        
        // Extraer identificador alternativo si no se pudo del tópico
        if (!deviceIdentifier && topic.includes('/')) {
          deviceIdentifier = topic.split('/').pop() || 'unknown';
        }
        
        // Si aún no hay identificador, usar el tópico completo
        if (!deviceIdentifier) {
          deviceIdentifier = topic.replace(/[\/\\\:\*\?\"\<\>\|]/g, '_');
        }
        
        // 1. Comprobar si alguna sesión está configurada para capturar todos los tópicos
        const captureAllDevices = session.devices && session.devices.some((device: any) => 
          device.id === 'all_sensors' || 
          (device.topic && device.topic === `${zigbeeBaseTopic}/#`) ||
          (device.topic && device.topic === '#'));
        
        if (captureAllDevices) {
          // Con 'all_sensors', capturamos todos los mensajes MQTT
          shouldCaptureMessage = true;
        } else if (session.devices) {
          // 2. Verificar si este tópico corresponde a algún sensor de esta sesión específica
          const matchedSensor = session.devices.find((device: any) => {
            // Coincidencia exacta de tópico
            if (device.topic && topic === device.topic) return true;
            
            // Coincidencia por tópico wildcard
            if (device.topic && device.topic.endsWith('/#') && 
                topic.startsWith(device.topic.replace('/#', ''))) 
              return true;
            
            // Coincidencia por nombre del dispositivo en el tópico
            if (device.name && topic.includes(device.name)) return true;
            
            // Coincidencia por ID del dispositivo en el tópico
            if (device.id && topic.includes(device.id)) return true;
            
            return false;
          });
          
          if (matchedSensor) {
            shouldCaptureMessage = true;
            deviceIdentifier = matchedSensor.id || matchedSensor.name || deviceIdentifier;
          }
        }
        
        // Si debemos capturar el mensaje para esta sesión
        if (shouldCaptureMessage) {
          // IMPLEMENTACIÓN ROBUSTA DE GUARDADO DE DATOS
          
          // 1. Preparar datos del mensaje en un formato consistente
          const messageData = {
            timestamp: new Date().toISOString(),
            topic,
            device: deviceIdentifier,
            payload: message
          };
          
          // 2. Guardar el mensaje de manera redundante en múltiples ubicaciones
          this.saveMessageToSession(sessionId, topic, deviceIdentifier, messageData);
          
          // 3. Si el mensaje contiene datos críticos (ej. temperatura), forzar backup
          const hasCriticalData = message && 
            (typeof message === 'object') && 
            (message.temperature !== undefined || 
             message.humidity !== undefined || 
             message.occupancy !== undefined ||
             message.presence !== undefined ||
             message.illuminance !== undefined ||
             message.contact !== undefined ||
             message.battery !== undefined);
             
          if (hasCriticalData) {
            this.createBackup(sessionId);
          }
        }
      } catch (error) {
        console.error(`[MQTT] Error al procesar mensaje para sesión ${sessionId}: ${error}`);
        
        // Intentar guardar el mensaje de forma básica para no perder datos
        try {
          const session = this.activeSessions.get(sessionId);
          if (session && session.sensorDataDir) {
            const emergencyPath = path.join(session.sensorDataDir, `emergency_messages_${Date.now()}.json`);
            fs.writeFileSync(emergencyPath, JSON.stringify({
              timestamp: new Date().toISOString(),
              topic,
              message,
              error: "Guardado de emergencia debido a error"
            }, null, 2));
          }
        } catch (emergencyError) {
          console.error(`[MQTT] Error en guardado de emergencia: ${emergencyError}`);
        }
      }
    });
    
    // Medir tiempo de procesamiento total
    const processingTime = Date.now() - processingStart;
    if (processingTime > 200) {
      console.warn(`[MQTT] Advertencia: procesamiento de mensaje MQTT tardó ${processingTime}ms, podría afectar rendimiento`);
    }
  }
  
  /**
   * Guarda un mensaje en el archivo de datos de la sesión
   * Método separado para mejorar la modularidad y facilitar pruebas
   * Implementa redundancia y verificación de integridad
   */
  private saveMessageToSession(sessionId: number, topic: string, deviceIdentifier: string, messageData: any) {
    const session = this.activeSessions.get(sessionId);
    if (!session) return false;
    
    // Recuperar los paths de archivos para esta sesión
    const { 
      dataFilePath, 
      sensorDataDir = path.join(path.dirname(dataFilePath), 'sensor_data'),
      consolidatedDataPath = path.join(sensorDataDir, 'sensor_data.json')
    } = session;
    
    // Asegurar que existe el directorio de datos de sensores
    try {
      if (!fs.existsSync(sensorDataDir)) {
        fs.mkdirSync(sensorDataDir, { recursive: true });
      }
    } catch (mkdirErr) {
      console.error(`[MQTT] No se pudo crear directorio para datos de sensores: ${mkdirErr}`);
    }
    
    // Actualizar contador de mensajes para decidir cuándo guardar
    let messageCount = (session.messageCount || 0) + 1;
    session.messageCount = messageCount;
    
    // ESTRATEGIA 1: ACTUALIZAR ARCHIVO PRINCIPAL (Solo cada X mensajes)
    if (messageCount % 3 === 0 || Date.now() - (session.lastSaveTime || 0) > 5000) {
      try {
        // Intentar leer el archivo existente
        let sessionData;
        try {
          sessionData = JSON.parse(fs.readFileSync(dataFilePath, 'utf8'));
        } catch (readError) {
          // Si falla la lectura, intentar restaurar desde el backup
          console.error(`[MQTT] Error al leer archivo principal, intentando restaurar: ${readError}`);
          const backupPath = path.join(path.dirname(dataFilePath), 'backup', `session_${sessionId}_data.json`);
          
          if (fs.existsSync(backupPath)) {
            sessionData = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
            console.log(`[MQTT] Archivo restaurado exitosamente desde backup`);
          } else {
            // Si no hay backup, crear estructura inicial
            sessionData = {
              sessionId,
              startTime: new Date().toISOString(),
              devices: session.devices || [],
              messages: {},
              deviceData: {},
              captureConfig: {
                brokerUrl: this.config.brokerUrl,
                baseTopic: this.config.baseTopic
              },
              stats: {
                messageCount: 0,
                lastSaveTime: Date.now(),
                saveCount: 0
              }
            };
            console.warn(`[MQTT] Creada nueva estructura de datos, posible pérdida de datos anterior`);
          }
        }
        
        // Inicializar el arreglo de mensajes para este tópico si no existe
        if (!sessionData.messages[topic]) {
          sessionData.messages[topic] = [];
        }
        
        // Agregar el mensaje al arreglo por tópico
        sessionData.messages[topic].push(messageData);
        
        // Inicializar el índice por dispositivo si no existe
        if (!sessionData.deviceData) {
          sessionData.deviceData = {};
        }
        
        if (!sessionData.deviceData[deviceIdentifier]) {
          sessionData.deviceData[deviceIdentifier] = [];
        }
        
        // Añadir al índice por dispositivo
        sessionData.deviceData[deviceIdentifier].push({
          timestamp: messageData.timestamp,
          topic,
          payload: messageData.payload
        });
        
        // Limitar el tamaño de datos por dispositivo
        if (sessionData.deviceData[deviceIdentifier].length > 5000) {
          sessionData.deviceData[deviceIdentifier] = 
            sessionData.deviceData[deviceIdentifier].slice(-5000);
        }
        
        // Actualizar estadísticas
        if (!sessionData.stats) {
          sessionData.stats = { messageCount: 0, lastSaveTime: Date.now(), saveCount: 0 };
        }
        
        sessionData.stats.messageCount = (sessionData.stats.messageCount || 0) + 1;
        sessionData.stats.lastSaveTime = Date.now();
        sessionData.stats.saveCount = (sessionData.stats.saveCount || 0) + 1;
        
        // Guardar con el sistema atómico (primero temporal, luego renombrar)
        const tempFilePath = `${dataFilePath}.tmp`;
        fs.writeFileSync(tempFilePath, JSON.stringify(sessionData, null, 2));
        fs.renameSync(tempFilePath, dataFilePath);
        
        // Actualizar timestamp del último guardado
        session.lastSaveTime = Date.now();
        
        console.log(`[MQTT] Datos principales actualizados para sesión ${sessionId}, mensajes totales: ${sessionData.stats.messageCount}`);
      } catch (mainFileError) {
        console.error(`[MQTT] Error crítico al guardar archivo principal: ${mainFileError}`);
      }
    }
    
    // ESTRATEGIA 2: GUARDAR EN ARCHIVO INDIVIDUAL POR SENSOR (Guarda todos los mensajes)
    try {
      // Usar deviceIdentifier como nombre de archivo
      const safeDeviceId = deviceIdentifier.replace(/[\/\\\:\*\?\"\<\>\|]/g, '_');
      const sensorFilePath = path.join(sensorDataDir, `${safeDeviceId}.json`);
      
      // Si existe el archivo, añadir al existente. Si no, crear nuevo.
      let sensorData = [];
      let shouldCreateFile = true;
      
      try {
        if (fs.existsSync(sensorFilePath)) {
          sensorData = JSON.parse(fs.readFileSync(sensorFilePath, 'utf8'));
          shouldCreateFile = false;
        }
      } catch (sensorReadError) {
        console.warn(`[MQTT] Error al leer datos del sensor, creando nuevo archivo: ${sensorReadError}`);
      }
      
      // Añadir el mensaje más reciente
      sensorData.push({
        timestamp: messageData.timestamp,
        topic,
        sensor: deviceIdentifier,
        data: messageData.payload
      });
      
      // Limitar tamaño para evitar archivos enormes
      if (sensorData.length > 10000) {
        sensorData = sensorData.slice(-10000);
      }
      
      // Guardar el archivo del sensor
      const sensorTempPath = `${sensorFilePath}.tmp`;
      fs.writeFileSync(sensorTempPath, JSON.stringify(sensorData, null, 2));
      
      if (shouldCreateFile) {
        fs.renameSync(sensorTempPath, sensorFilePath);
      } else {
        // Si el archivo ya existía, verificar que se pueda renombrar sin error
        try {
          fs.renameSync(sensorTempPath, sensorFilePath);
        } catch (renameError) {
          // Si falla el renombrado, intentar una copia directa
          fs.copyFileSync(sensorTempPath, sensorFilePath);
          try { fs.unlinkSync(sensorTempPath); } catch (e) { /* ignorar */ }
        }
      }
    } catch (sensorError) {
      console.error(`[MQTT] Error al guardar datos individuales del sensor ${deviceIdentifier}: ${sensorError}`);
    }
    
    // ESTRATEGIA 3: ACTUALIZAR ARCHIVO CONSOLIDADO para visualización (append-only)
    try {
      let allSensorsData = [];
      let shouldCreateFile = true;
      
      try {
        if (fs.existsSync(consolidatedDataPath)) {
          allSensorsData = JSON.parse(fs.readFileSync(consolidatedDataPath, 'utf8'));
          shouldCreateFile = false;
        }
      } catch (consolidatedReadError) {
        console.warn(`[MQTT] Error al leer archivo consolidado, creando nuevo: ${consolidatedReadError}`);
      }
      
      // Añadir el mensaje al archivo consolidado
      allSensorsData.push({
        timestamp: messageData.timestamp,
        sensor: deviceIdentifier,
        topic,
        ...(typeof messageData.payload === 'object' ? messageData.payload : { value: messageData.payload })
      });
      
      // Limitar el tamaño
      if (allSensorsData.length > 20000) {
        allSensorsData = allSensorsData.slice(-20000);
      }
      
      // Guardar con sistema seguro
      const tempConsolidatedPath = `${consolidatedDataPath}.tmp`;
      fs.writeFileSync(tempConsolidatedPath, JSON.stringify(allSensorsData, null, 2));
      
      if (shouldCreateFile) {
        fs.renameSync(tempConsolidatedPath, consolidatedDataPath);
      } else {
        try {
          fs.renameSync(tempConsolidatedPath, consolidatedDataPath);
        } catch (renameError) {
          fs.copyFileSync(tempConsolidatedPath, consolidatedDataPath);
          try { fs.unlinkSync(tempConsolidatedPath); } catch (e) { /* ignorar */ }
        }
      }
    } catch (consolidateError) {
      console.error(`[MQTT] Error al actualizar archivo consolidado: ${consolidateError}`);
    }
    
    return true;
  }
}

// Instancia para uso en toda la aplicación
const mqttClient = new MqttServerClient();

// Exportar para compatibilidad con ESM
export default mqttClient;
export { mqttClient };