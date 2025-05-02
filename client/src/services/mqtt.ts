import mqtt from 'mqtt';

class MqttService {
  client: mqtt.MqttClient | null;
  listeners: ((data: any) => void)[];
  connected: boolean;
  config: {
    host: string;
    port: string;
    username: string;
    password: string;
    baseTopic: string;
  };

  constructor() {
    this.client = null;
    this.listeners = [];
    this.connected = false;
    
    // Determinar el hostname
    const hostname = window.location.hostname === 'localhost' ? 'localhost' : window.location.hostname;
    
    this.config = {
      host: import.meta.env.VITE_MQTT_HOST || hostname,
      port: import.meta.env.VITE_MQTT_PORT || '9001',
      username: import.meta.env.VITE_MQTT_USERNAME || '',
      password: import.meta.env.VITE_MQTT_PASSWORD || '',
      baseTopic: import.meta.env.VITE_MQTT_BASE_TOPIC || 'zigbee2mqtt',
    };    
  }

  connect(newConfig: Partial<typeof this.config> | null = null) {
    // Si ya hay una conexión, desconectarla primero
    if (this.client) {
      this.disconnect();
    }

    // Actualizar configuración si se proporciona
    if (newConfig) {
      this.config = { ...this.config, ...newConfig };
      
      // Guardar en localStorage
      localStorage.setItem('mqtt_host', this.config.host);
      localStorage.setItem('mqtt_port', this.config.port);
      localStorage.setItem('mqtt_username', this.config.username);
      localStorage.setItem('mqtt_password', this.config.password);
      localStorage.setItem('mqtt_baseTopic', this.config.baseTopic);
    }
    
    // Construir URL de conexión
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const url = `${protocol}://${this.config.host}:${this.config.port}`;
    
    // Opciones de conexión
    const options: mqtt.IClientOptions = {
      clientId: `livinglab_dashboard_${Math.random().toString(16).substr(2, 8)}`,
      clean: true,
      reconnectPeriod: 5000
    };
    
    // Añadir credenciales si se proporcionan
    if (this.config.username) {
      options.username = this.config.username;
      options.password = this.config.password;
    }

    return new Promise<void>((resolve, reject) => {
      try {
        console.log('Conectando a MQTT:', url);
        
        // Crear cliente MQTT
        this.client = mqtt.connect(url, options);
        
        // Configurar manejadores de eventos
        this.client.on('connect', () => {
          console.log('MQTT conectado a:', url);
          this.connected = true;
          
          // Suscribirse a temas
          this.subscribeToTopics();
          
          // Notificar a los oyentes
          this.notifyListeners({
            type: 'connection',
            status: 'connected'
          });
          
          // Solicitar lista de dispositivos al conectar
          this.refreshSensors();
          
          resolve();
        });
        
        this.client.on('error', (err) => {
          console.error('Error MQTT:', err);
          this.notifyListeners({
            type: 'error',
            error: `Error en la conexión MQTT: ${err.message}`
          });
          reject(err);
        });
        
        this.client.on('offline', () => {
          console.log('MQTT desconectado');
          this.connected = false;
          this.notifyListeners({
            type: 'connection',
            status: 'disconnected'
          });
        });
        
        this.client.on('reconnect', () => {
          console.log('MQTT intentando reconectar...');
          this.notifyListeners({
            type: 'connection',
            status: 'reconnecting'
          });
        });
        
        this.client.on('message', (topic, message) => {
          try {
            // Convertir mensaje a JSON
            const payload = JSON.parse(message.toString());
            console.log('Mensaje MQTT recibido:', topic, payload);
            
            // Si es un mensaje de dispositivos específico, formatearlo para la aplicación
            if (topic === `${this.config.baseTopic}/bridge/devices`) {
              // Adaptar el formato de zigbee2mqtt al formato esperado por la aplicación
              this.processDevicesList(payload);
            } 
            // Procesar respuesta de renombrado
            else if (topic === `${this.config.baseTopic}/bridge/response/device/rename`) {
              console.log('Respuesta de renombrado recibida:', payload);
              
              // Si hay éxito, notificar y refrescar la lista
              if (payload.success) {
                this.notifyListeners({
                  type: 'rename_success',
                  payload: payload
                });
                
                // Refrescar la lista para confirmar el cambio
                setTimeout(() => {
                  this.refreshSensors();
                }, 500);
              } else {
                console.error('Error en renombrado:', payload.error || 'Desconocido');
                this.notifyListeners({
                  type: 'error',
                  error: `Error al renombrar: ${payload.error || 'Desconocido'}`
                });
              }
            }
            else {
              // Log más detallado para entender el mensaje
              console.log(`Procesando mensaje genérico para topic: ${topic}`);
              console.log('Estructura del payload:', Object.keys(payload));
              
              // Verificar si el mensaje tiene información de estado
              if (payload.contact !== undefined || payload.battery !== undefined || 
                  (payload.state && (payload.state.contact !== undefined || payload.state.battery !== undefined))) {
                console.log('Mensaje contiene información de estado');
              }
              
              // Pasar otros mensajes directamente con información adicional
              this.notifyListeners({
                type: 'message',
                topic,
                payload,
                timestamp: Date.now()
              });
            }
          } catch (err) {
            console.error('Error al procesar mensaje MQTT:', err);
            console.error('Mensaje original:', message.toString());
          }
        });
        
      } catch (err) {
        console.error('Error al crear cliente MQTT:', err);
        reject(err);
      }
    });
  }

  // Procesar lista de dispositivos de zigbee2mqtt y convertir al formato esperado
  processDevicesList(devices: any[]) {
    if (!Array.isArray(devices)) {
      console.error('Lista de dispositivos no es un array:', devices);
      return;
    }
    
    console.log('Procesando lista de dispositivos:', devices);
    
    // Filtrar solo los sensores (excluyendo coordinadores, routers, etc.)
    const sensors = devices.filter(device => 
      // Filtramos por tipo o modelo específico de los sensores Sonoff
      device.definition?.model?.includes('SNZB-04') || 
      device.modelID === 'DS01' || 
      (device.type && device.type.toLowerCase().includes('sensor'))
    );
    
    // Transformar al formato esperado por la aplicación
    const formattedSensors = sensors.map(device => ({
      ieeeAddr: device.ieee_address,
      friendlyName: device.friendly_name || device.ieee_address,
      model: device.definition?.model || device.modelID || 'Sonoff',
      modelID: device.modelID || 'SNZB-04',
      manufacturerName: device.manufacturer || device.manufacturerName || 'eWeLink',
      lastUpdate: device.last_seen ? new Date(device.last_seen).getTime() : Date.now(),
      firstSeen: device.date_code ? new Date(device.date_code).getTime() : Date.now() - (30 * 24 * 60 * 60 * 1000),
      hasExternalConverter: !!device.definition,
      location: device.location || '',
      description: device.description || '',
      state: {
        contact: device.state?.contact,
        battery: device.state?.battery,
        voltage: device.state?.voltage,
        linkquality: device.state?.linkquality
      }
    }));
    
    // Enviar la lista formateada
    this.notifyListeners({
      type: 'message',
      topic: `${this.config.baseTopic}/sensors`,
      payload: {
        sensors: formattedSensors
      }
    });
  }

  disconnect() {
    if (this.client) {
      this.client.end();
      this.client = null;
      this.connected = false;
      console.log('MQTT desconectado manualmente');
      
      this.notifyListeners({
        type: 'connection',
        status: 'disconnected'
      });
    }
  }

  subscribeToTopics() {
    if (!this.client || !this.connected) return;
    
    const topics = [
      // Suscripciones existentes
      `${this.config.baseTopic}/bridge/devices`,
      `${this.config.baseTopic}/+`,
      `${this.config.baseTopic}/bridge/state`,
      `${this.config.baseTopic}/bridge/log`,
      `${this.config.baseTopic}/bridge/response/#`,
      `${this.config.baseTopic}/bridge/event/#`,
      
      // Específicos para dispositivos Zigbee
      `${this.config.baseTopic}/device/#`,
      `zigbee2mqtt/#`,
      
      // Nuevas suscripciones para cubrir más casos
      `${this.config.baseTopic}/+/+`, // Para captar zigbee2mqtt/device_id/data
      `${this.config.baseTopic}/#`    // Para captar cualquier estructura
    ];
    
    topics.forEach(topic => {
      if (this.client) {
        this.client.subscribe(topic, (err) => {
          if (err) {
            console.error(`Error al suscribirse a ${topic}:`, err);
          } else {
            console.log(`Suscrito a ${topic}`);
          }
        });
      }
    });
  }

  // Enviar comando para refrescar la lista de sensores
  refreshSensors() {
    if (!this.client || !this.connected) {
      this.connect().then(() => {
        this.requestDeviceList();
      }).catch(err => {
        console.error('Error al conectar para refrescar sensores:', err);
      });
      return;
    }
    
    this.requestDeviceList();
    return Promise.resolve();
  }

  // Solicitar lista de dispositivos a zigbee2mqtt
  requestDeviceList() {
    if (!this.client) return;
    
    this.client.publish(
      `${this.config.baseTopic}/bridge/request/devices`, 
      JSON.stringify({ transaction: `get-devices-${Date.now()}` }),
      { qos: 1 }
    );
    console.log('Solicitando lista de dispositivos');
  }

  // Enviar comando para renombrar un sensor
  renameSensor(ieeeAddr: string, newName: string) {
    console.log(`Enviando solicitud para renombrar sensor: ${ieeeAddr} -> ${newName}`);
    
    // Asegurarnos de que estamos conectados
    if (!this.client || !this.connected) {
      console.error('No hay conexión MQTT activa al intentar renombrar');
      return Promise.reject(new Error('No hay conexión MQTT activa'));
    }
    
    return new Promise<void>((resolve, reject) => {
      // Primero, enviar comando set para cambiar directamente el nombre
      this.client!.publish(
        `${this.config.baseTopic}/${ieeeAddr}/set`, 
        JSON.stringify({
          friendly_name: newName
        }),
        { qos: 1 },
        (err) => {
          if (err) {
            console.error(`Error al enviar comando set para renombrar: ${err}`);
            reject(err);
          } else {
            console.log(`Comando set enviado para renombrar a ${newName}`);
            
            // También enviar el comando de rename (como respaldo)
            const transactionId = `rename-${Date.now()}`;
            this.client!.publish(
              `${this.config.baseTopic}/bridge/request/device/rename`, 
              JSON.stringify({
                from: ieeeAddr,
                to: newName,
                transaction: transactionId
              }),
              { qos: 1 }
            );
            
            // Esperar un poco y luego refrescar la lista para confirmar el cambio
            setTimeout(() => {
              this.refreshSensors();
              resolve();
            }, 1000);
          }
        }
      );
    });
  }

  // Registrar un oyente para recibir notificaciones
  addListener(callback: (data: any) => void) {
    this.listeners.push(callback);
  }

  // Eliminar un oyente
  removeListener(callback: (data: any) => void) {
    const index = this.listeners.indexOf(callback);
    if (index !== -1) {
      this.listeners.splice(index, 1);
    }
  }

  // Notificar a todos los oyentes
  notifyListeners(data: any) {
    this.listeners.forEach(listener => {
      try {
        listener(data);
      } catch (error) {
        console.error('Error en oyente MQTT:', error);
      }
    });
  }
}

// Singleton para compartir globalmente
const mqttService = new MqttService();
export default mqttService;