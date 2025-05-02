import { useState, useEffect, useCallback, useRef } from 'react';
import mqtt from 'mqtt';
import { logger } from '@/lib/services/logger';

interface MqttConfig {
  host?: string;
  port?: string;
}

interface Sensor {
  ieee_addr: string;
  friendly_name?: string;
  status: 'online' | 'offline';
  lastSeen?: string;
  type?: string;
  model?: string;
  data?: any;
}

// Los sensores se obtienen únicamente de fuentes reales, no hay simulación
// Como solicita el usuario, la aplicación no realiza verificaciones automáticas
// ni simulaciones de ningún tipo
const SIMULATED_SENSORS: Sensor[] = []; // Array vacío, sin simulación

// Hook mejorado utilizando las técnicas del otro proyecto
export default function useMqtt(config?: MqttConfig) {
  // Usar variables de entorno con fallback a parámetros de configuración
  const host = config?.host || import.meta.env.VITE_MQTT_HOST || '192.168.0.20';
  // Puerto por defecto para MQTT desde variables de entorno - directamente para WebSocket
  const port = config?.port || import.meta.env.VITE_MQTT_PORT || '9001';
  
  // Estados
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [sensorData, setSensorData] = useState<{[key: string]: any}>({});
  const [friendlyNames, setFriendlyNames] = useState<{[key: string]: string}>({});
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  
  // Referencias
  const clientRef = useRef<mqtt.MqttClient | null>(null);
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);
  const sensorMessagesRef = useRef<any[]>([]);
  
  // MQTT broker URL directo (usando WebSocket en puerto 9001)
  // Puerto ya debe ser el correcto para WebSocket (9001), no calculamos
  const brokerUrl = `ws://${host}:${port}`;
  
  // Obtener el nombre amigable de un sensor
  const getFriendlyName = useCallback((topic: string, payload: any) => {
    // Si ya tenemos un nombre amigable para este topic, usarlo
    if (friendlyNames[topic]) {
      return friendlyNames[topic];
    }
    
    // Intentar extraer friendly_name del payload si existe
    if (payload && typeof payload === 'object') {
      if (payload.friendly_name) {
        return payload.friendly_name;
      }
      if (payload.device && payload.device.friendly_name) {
        return payload.device.friendly_name;
      }
      if (payload.name) {
        return payload.name;
      }
    }
    
    // Para tópicos de zigbee2mqtt, extraer la parte relevante
    if (topic.startsWith('zigbee2mqtt/')) {
      const devicePart = topic.replace('zigbee2mqtt/', '');
      
      // Obtener la parte final del path (después del último /)
      const pathParts = devicePart.split('/');
      const lastPart = pathParts[pathParts.length - 1];
      
      // Si es un topic de livinglab, construir un nombre amigable completo
      if (devicePart.includes('livinglab/device/')) {
        const match = devicePart.match(/livinglab\/device\/(\d+)\/([0-9A-Fa-f]+)/);
        if (match) {
          return `Sensor-${match[1]}-Sonoff-SNZB-04`;
        }
      }
      
      // Si parece ser un sensor numerado (sensor-1, sensor-2, etc.)
      if (/^sensor-\d+$/.test(lastPart) || /^sensor\d+$/.test(lastPart)) {
        const sensorNum = lastPart.replace(/^sensor-?/, '');
        return `Sensor-${sensorNum}-Sonoff-SNZB-04`;
      }
      
      // Intentar extraer un nombre más legible
      return lastPart;
    }
    
    // Devolver el topic como último recurso
    return topic.split('/').pop() || topic;
  }, [friendlyNames]);

  // Función para suscribirse a topics
  const subscribeToTopics = useCallback((mqttClient: mqtt.MqttClient) => {
    logger.info('Subscribing to MQTT topics...');
    
    // Array con todos los topics a los que suscribirse
    // Suscribirnos a todos los topics MQTT posibles, con múltiples variantes
    // para garantizar captura completa como solicitó el usuario
    const topics = [
      '#',                                           // Todo el tráfico MQTT
      'zigbee2mqtt/#',                               // Todos los dispositivos y mensajes zigbee2mqtt
      'zigbee2mqtt/+',                               // Dispositivos directos
      'zigbee2mqtt/+/+',                             // Estructura doble nivel
      'zigbee2mqtt/+/+/+',                           // Estructura triple nivel
      'zigbee2mqtt/+/+/+/+',                         // Estructura multinivel 
      'zigbee2mqtt/bridge/+',                        // Mensajes del puente
      'zigbee2mqtt/bridge/devices',                  // Lista de dispositivos específica
      'zigbee2mqtt/bridge/state',                    // Estado del puente
      'zigbee2mqtt/bridge/info',                     // Información del puente
      'zigbee2mqtt/bridge/logging',                  // Logs del puente
      'zigbee2mqtt/bridge/config',                   // Configuración del puente
      'zigbee2mqtt/bridge/response/+',               // Respuestas del puente
      'zigbee2mqtt/bridge/request/+',                // Solicitudes al puente
      'zigbee2mqtt/bridge/event/+',                  // Eventos del puente
      'zigbee2mqtt/livinglab/#',                     // Namespace livinglab específico
      'livinglab/#',                                 // Namespace livinglab específico
      'livinglab/device/#',                          // Dispositivos de livinglab
    ];
    
    // Suscribirse a cada topic
    topics.forEach(topic => {
      mqttClient.subscribe(topic, (err) => {
        if (err) {
          logger.error(`Error al suscribirse a ${topic}:`, err);
        } else {
          logger.info(`Suscrito a ${topic}`);
        }
      });
    });
    
    // Solicitar explícitamente la lista de dispositivos
    mqttClient.publish('zigbee2mqtt/bridge/request/devices', '');
  }, []);

  // Procesar mensajes MQTT recibidos
  const processMessages = useCallback(() => {
    if (sensorMessagesRef.current.length === 0) return;
    
    try {
      const processedData: {[key: string]: any} = {};
      const newFriendlyNames = {...friendlyNames};
      const detectedSensors: Sensor[] = [];
      
      // Iterar por todos los mensajes recibidos
      sensorMessagesRef.current.forEach((msg) => {
        try {
          const topicKey = msg.topic;
          
          // Filtrar mensajes de sistema/bridge o vacíos
          if (!topicKey || 
              topicKey.includes('bridge/') || 
              topicKey.endsWith('/bridge') || 
              topicKey.includes('$SYS/')) return;
          
          // Determinar el nombre amigable
          let friendlyName = getFriendlyName(topicKey, msg.payload);
          
          // Actualizar mapa de nombres amigables si es válido
          if (friendlyName && friendlyName !== topicKey) {
            newFriendlyNames[topicKey] = friendlyName;
          }
          
          // Inicializar datos para este sensor
          if (!processedData[topicKey]) {
            processedData[topicKey] = [];
          }
          
          // Determinar el estado del contacto
          let contactValue = null;
          
          // Varios formatos de contact
          if (typeof msg.payload.contact === 'boolean') {
            contactValue = msg.payload.contact ? 0 : 1;
          } else if (['true', 'open', 'OPEN', 0].includes(msg.payload.contact)) {
            contactValue = 0;
          } else if (['false', 'closed', 'CLOSED', 1].includes(msg.payload.contact)) {
            contactValue = 1;
          } else if (msg.payload.state === 'ON' || msg.payload.state === true) {
            contactValue = 1;
          } else if (msg.payload.state === 'OFF' || msg.payload.state === false) {
            contactValue = 0;
          }
          
          // Almacenar esta entrada de datos
          processedData[topicKey].push({
            x: msg.timestamp || new Date(),
            y: contactValue !== null ? contactValue : 0,
            battery: typeof msg.payload.battery === 'number' ? msg.payload.battery : 
                     (msg.payload.battery_level ? msg.payload.battery_level : 0),
            linkquality: typeof msg.payload.linkquality === 'number' ? msg.payload.linkquality : 
                        (msg.payload.link_quality ? msg.payload.link_quality : 0),
            friendlyName,
            payload: msg.payload
          });
          
          // Limitar cantidad de puntos por sensor
          if (processedData[topicKey].length > 100) {
            processedData[topicKey] = processedData[topicKey].slice(-100);
          }
          
          // Si este topic parece ser un sensor, agregarlo a la lista
          if (topicKey.includes('zigbee2mqtt/') && 
              !topicKey.includes('bridge/') && 
              !['group', 'coordinator'].includes(msg.payload.type)) {
            
            // Buscar si ya existe
            const existingSensor = detectedSensors.find(s => s.ieee_addr === topicKey);
            
            if (!existingSensor) {
              detectedSensors.push({
                ieee_addr: topicKey,
                friendly_name: friendlyName,
                status: 'online',
                lastSeen: new Date().toISOString(),
                type: msg.payload.type || 'unknown',
                model: msg.payload.model || 'unknown',
                data: msg.payload
              });
            }
          }
        } catch (error) {
          logger.error(`Error procesando mensaje para sensor:`, error);
        }
      });
      
      // Actualizar friendly names si hay cambios
      if (Object.keys(newFriendlyNames).length !== Object.keys(friendlyNames).length) {
        setFriendlyNames(newFriendlyNames);
      }
      
      // Si detectamos sensores, actualizar la lista
      if (detectedSensors.length > 0) {
        setSensors(prev => {
          // Combinar sensores previos con nuevos, evitando duplicados
          const combinedSensors = [...prev];
          
          detectedSensors.forEach(newSensor => {
            const index = combinedSensors.findIndex(s => s.ieee_addr === newSensor.ieee_addr);
            if (index >= 0) {
              combinedSensors[index] = { ...combinedSensors[index], ...newSensor };
            } else {
              combinedSensors.push(newSensor);
            }
          });
          
          return combinedSensors;
        });
      }
      
      // Actualizar datos procesados
      setSensorData(processedData);
      setLastUpdate(new Date());
    } catch (error) {
      logger.error("Error en procesamiento de datos:", error);
    }
  }, [friendlyNames, getFriendlyName]);

  // Conectar al broker MQTT y manejar mensajes
  useEffect(() => {
    // Función para limpiar conexión MQTT
    const cleanupClient = () => {
      if (clientRef.current) {
        try {
          clientRef.current.end(true);
          logger.info('Cliente MQTT desconectado y limpiado');
        } catch (e) {
          logger.error("Error al limpiar cliente MQTT:", e);
        }
        clientRef.current = null;
      }
      
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    };
    
    // Función para intentar conexión
    const attemptConnection = () => {
      try {
        // Incrementar contador de intentos
        setConnectionAttempts(prev => prev + 1);
        
        logger.info(`Intento ${connectionAttempts + 1}: Conectando a MQTT broker en ${brokerUrl}`);

        const client = mqtt.connect(brokerUrl, {
          clientId: `mqttjs_monitor_${Math.random().toString(16).substring(2, 8)}`,
          clean: true,
          reconnectPeriod: 5000,
          connectTimeout: 10 * 1000,
          rejectUnauthorized: false
        });
        
        clientRef.current = client;

        client.on('connect', () => {
          logger.info(`🟢 Conectado a broker MQTT: ${brokerUrl}`);
          setIsConnected(true);
          setConnectionError(null);
          setConnectionAttempts(0);
          
          // Suscribirse a todos los topics necesarios
          subscribeToTopics(client);
          
          // Solicitar lista de dispositivos conocidos
          setTimeout(() => {
            client.publish('zigbee2mqtt/bridge/request/devices', '');
          }, 1000);
        });

        client.on('message', (topic, message) => {
          try {
            // Convertir mensaje a string
            const messageStr = message.toString();
            let payload: any = messageStr;
            
            // Intentar parsear como JSON
            try {
              payload = JSON.parse(messageStr);
            } catch (e) {
              // No es JSON, mantener como string
              return; // Ignorar mensajes que no son JSON
            }
            
            // Procesamiento especial para lista de dispositivos
            if (topic === 'zigbee2mqtt/bridge/devices') {
              logger.info('Recibida lista de dispositivos zigbee2mqtt');
              
              if (Array.isArray(payload)) {
                // Filtrar coordinador y extraer solo sensores 
                const sensorList = payload
                  .filter((device: any) => device.type !== 'Coordinator' && device.type !== 'Router')
                  .map((device: any) => ({
                    ieee_addr: device.ieee_address || device.friendly_name,
                    friendly_name: device.friendly_name || device.ieee_address,
                    status: device.status || 'online',
                    lastSeen: device.last_seen || new Date().toISOString(),
                    type: device.type || 'unknown',
                    model: device.model || 'unknown',
                    data: device
                  }));
                
                if (sensorList.length > 0) {
                  logger.info(`Recibidos ${sensorList.length} sensores de Zigbee2MQTT`);
                  setSensors(sensorList);
                }
              }
              
              return; // No procesar más este mensaje específico
            }
            
            // Guardar mensaje con timestamp
            sensorMessagesRef.current.push({
              topic,
              payload,
              timestamp: new Date()
            });
            
            // Limitar a los últimos 1000 mensajes para rendimiento
            if (sensorMessagesRef.current.length > 1000) {
              sensorMessagesRef.current = sensorMessagesRef.current.slice(-1000);
            }
            
            // Procesar lote de mensajes cada 100 recibidos o después de 2 segundos
            // para no sobrecargar la UI
            if (sensorMessagesRef.current.length % 10 === 0) {
              processMessages();
            }
          } catch (error) {
            logger.error('Error procesando mensaje MQTT:', error);
          }
        });

        client.on('error', (err) => {
          logger.error('🔴 MQTT Error:', err);
          setConnectionError(`Error de conexión: ${err.message}`);
        });

        client.on('offline', () => {
          logger.warn('🟠 Cliente MQTT desconectado');
          setIsConnected(false);
        });

        client.on('reconnect', () => {
          logger.info('🔄 Reintentando conexión MQTT...');
        });
        
        // Si después de 5 segundos no hay conexión, considerar fallido
        const connectionTimeout = setTimeout(() => {
          if (!isConnected && connectionAttempts <= 5) {
            logger.warn(`Conexión MQTT fallida después de 5 segundos. Reintentando...`);
            
            cleanupClient();
            
            // Reintento con backoff
            const delay = Math.min(30000, 1000 * Math.pow(2, connectionAttempts));
            logger.info(`Reintentando en ${delay/1000} segundos...`);
            
            reconnectTimerRef.current = setTimeout(attemptConnection, delay);
          } else if (connectionAttempts > 5) {
            logger.warn('Demasiados intentos fallidos. Máximo 5 intentos alcanzado según requerimiento del usuario.');
            setConnectionError("Máximo de intentos alcanzado. Por favor, verifica la configuración MQTT.");
          }
        }, 5000);

        return () => {
          clearTimeout(connectionTimeout);
        };
      } catch (err: any) {
        logger.error('Error al configurar MQTT:', err);
        setConnectionError(`Error de conexión: ${err.message}`);
      }
    };

    // Iniciar primer intento de conexión
    attemptConnection();
    
    // Configurar un temporizador para procesar mensajes periódicamente
    const processingInterval = setInterval(() => {
      if (sensorMessagesRef.current.length > 0) {
        processMessages();
      }
    }, 2000);

    // Limpieza al desmontar
    return () => {
      clearInterval(processingInterval);
      cleanupClient();
    };
  }, [brokerUrl, connectionAttempts, subscribeToTopics, processMessages]);

  // Función para reconexión manual
  const reconnect = () => {
    logger.info('Reconexión manual iniciada');
    
    // Limpiar cliente actual
    if (clientRef.current) {
      clientRef.current.end(true);
      clientRef.current = null;
    }
    
    // Resetear estados
    setConnectionAttempts(0);
    setSensors([]);
    setSensorData({});
    sensorMessagesRef.current = [];
    
    // La reconexión se iniciará automáticamente en el próximo ciclo
  };

  // Exportar datos como CSV
  const exportData = useCallback(() => {
    try {
      // Convertir datos de sensores a formato CSV/JSON para descarga
      const jsonData = {
        sensors: sensors,
        sensorData: sensorData,
        exportTime: new Date().toISOString()
      };
      
      // Crear un Blob con los datos
      const blob = new Blob([JSON.stringify(jsonData, null, 2)], {
        type: 'application/json'
      });
      
      // Crear URL para descarga
      const url = URL.createObjectURL(blob);
      
      // Crear enlace de descarga
      const a = document.createElement('a');
      a.href = url;
      a.download = `sensor-data-${new Date().toISOString().slice(0,19).replace(/[:-]/g, '')}.json`;
      document.body.appendChild(a);
      a.click();
      
      // Limpiar
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);
      
      return true;
    } catch (error) {
      logger.error('Error exportando datos:', error);
      return false;
    }
  }, [sensors, sensorData]);

  // Sensores en formato prioritario para livinglab
  const priorityDevices = useCallback(() => {
    const priorityData: {[key: string]: any} = {};
    
    Object.keys(sensorData).forEach(topic => {
      // Verificar si el topic es prioritario (livinglab)
      const isPriority = topic.includes('livinglab/device/') || 
                         topic.includes('zigbee2mqtt/livinglab');
      
      if (isPriority) {
        priorityData[topic] = sensorData[topic];
      }
    });
    
    return priorityData;
  }, [sensorData]);

  return {
    sensors,
    sensorData,
    priorityDevices,
    isConnected,
    connectionError,
    reconnect,
    exportData,
    lastUpdate,
    friendlyNames,
    sensorCount: sensors.length
  };
}