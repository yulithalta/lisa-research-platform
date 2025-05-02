import { useState, useEffect, useRef } from "react";
import mqtt from "mqtt";
import { logger } from '@/lib/services/logger';

interface Sensor {
  ieee_addr: string;
  friendly_name?: string;
  status: 'online' | 'offline';
  lastSeen?: string;
  type?: string;
  model?: string;
  data?: any;
}

/**
 * Simplified MQTT hook that connects directly to WebSocket broker
 * Based on the functional hook from another project
 */
export default function useSimpleMqtt() {
  // Direct configuration from environment variables
  const host = import.meta.env.VITE_MQTT_HOST || '192.168.0.20';
  const port = import.meta.env.VITE_MQTT_PORT || '9001';
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const brokerUrl = `${protocol}//${host}:${port}`;
  
  // Specific list of topics to subscribe to
  const topics = [
    "zigbee2mqtt/#",                      // General subscription (for compatibility)
    "+/+/+",                              // More generic subscription for all topics
    "0x00124b002a6b62b7/#",               // Direct subscription to specific sensor
    "zigbee2mqtt/livinglab/device",       // Sensor activity
    "zigbee2mqtt/livinglab/event_new",    // New events
    "zigbee2mqtt/livinglab/event",        // Confirmation events
    "zigbee2mqtt/livinglab/sensors_compatible", // Extended sensor information
    "zigbee2mqtt/+/+",                    // Capture specific topics by device
    "zigbee2mqtt/bridge/devices"          // Device list
  ];

  // States
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [availableTopics, setAvailableTopics] = useState<string[]>([]);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // References
  const mqttClientRef = useRef<mqtt.MqttClient | null>(null);
  const isConnectingRef = useRef(false);
  const topicRegistryRef = useRef(new Set<string>());
  const messagesByTopicRef = useRef<{[key: string]: any[]}>({});
  const isMounted = useRef(true);

  // Connect to MQTT broker - just once
  useEffect(() => {
    isMounted.current = true;

    // Function to connect to broker
    const connectToBroker = () => {
      if (isConnectingRef.current) return;
      isConnectingRef.current = true;

      try {
        logger.info(`Conectando a broker MQTT: ${brokerUrl}`);

        // Crear cliente con opciones específicas
        const client = mqtt.connect(brokerUrl, {
          keepalive: 60,
          clientId: `zigbee_monitor_${Math.floor(Math.random() * 10000)}`,
          clean: true,
          reconnectPeriod: 5000,
          connectTimeout: 30000,
          queueQoSZero: false
        });

        mqttClientRef.current = client;

        // Conexión exitosa
        client.on("connect", () => {
          logger.info(`✅ Conectado a broker MQTT: ${brokerUrl}`);
          isConnectingRef.current = false;

          if (isMounted.current) {
            setIsConnected(true);
            setConnectionError(null);
          }

          // Suscribirse a cada tópico
          topics.forEach(topic => {
            client.subscribe(topic, (err) => {
              if (err) {
                logger.error(`Error al suscribirse a ${topic}:`, err);
              } else {
                logger.info(`✅ Suscrito a tópico: ${topic}`);
              }
            });
          });
          
          // Solicitar lista de dispositivos
          setTimeout(() => {
            client.publish('zigbee2mqtt/bridge/request/devices', '');
          }, 1000);
        });

        // Manejar mensajes entrantes
        client.on("message", (topic, payload) => {
          try {
            // Registrar tópico
            topicRegistryRef.current.add(topic);

            // Analizar mensaje
            const messageStr = payload.toString();
            let message;
            
            try {
              message = JSON.parse(messageStr);
            } catch (e) {
              // No es JSON, ignorar
              return;
            }
            
            // Si es la lista de dispositivos
            if (topic === 'zigbee2mqtt/bridge/devices') {
              logger.info('Recibida lista de dispositivos zigbee2mqtt');
              
              if (Array.isArray(message)) {
                const sensorList = message
                  .filter((device) => 
                    device.type !== 'Coordinator' && 
                    device.type !== 'Router'
                  )
                  .map((device) => ({
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
              
              return;
            }

            // Normalizar mensaje con más información
            const normalizedMessage = {
              timestamp: new Date(),
              topicName: topic,
              sensorId: topic.split('/').pop() || '',
              messageType: topic.includes('event') ? 'event' : 
                           topic.includes('device') ? 'device' : 
                           topic.includes('sensors_compatible') ? 'compatibility' : 'data',
              battery: message.battery || 0,
              linkquality: message.linkquality || 0,
              // Intentar extraer friendly_name de varias fuentes posibles
              friendly_name: message.friendly_name || 
                            (message.device && message.device.friendly_name) || 
                            topic.split('/').pop() || '',
              // Si hay algún estado de contacto (sensores de contacto)
              contact: typeof message.contact === 'boolean' ? message.contact : null,
              // Si hay algún valor de movimiento (sensores PIR)
              occupancy: typeof message.occupancy === 'boolean' ? message.occupancy : null,
              // Mantener el payload completo para análisis posterior
              payload: message
            };

            // Logear mensajes importantes para debugging
            if (topic.includes('livinglab/event') || topic.includes('livinglab/device')) {
              logger.info(`Datos de sensor en ${topic}:`, {
                friendly_name: normalizedMessage.friendly_name,
                messageType: normalizedMessage.messageType
              });
            }

            // Almacenar mensaje por tópico (crear array si no existe)
            if (!messagesByTopicRef.current[topic]) {
              messagesByTopicRef.current[topic] = [];
            }

            // Añadir nuevo mensaje - ahora guardamos más (hasta 100) para tener un mejor historial
            messagesByTopicRef.current[topic].push(normalizedMessage);
            if (messagesByTopicRef.current[topic].length > 100) {
              messagesByTopicRef.current[topic] = messagesByTopicRef.current[topic].slice(-100);
            }

            // Detectar si es un dispositivo y agregarlo a la lista de sensores
            // Incluimos cualquier topic o mensaje que contenga el ID del sensor buscado
            const isSpecificSensor = topic.includes('0x00124b002a6b62b7') || 
                                    (message.ieee_address && message.ieee_address === '0x00124b002a6b62b7') ||
                                    (message.ieee_addr && message.ieee_addr === '0x00124b002a6b62b7') ||
                                    JSON.stringify(message).includes('0x00124b002a6b62b7');
            
            if ((topic.includes('zigbee2mqtt/') && 
                !topic.includes('bridge/') && 
                !['group', 'coordinator'].includes(message.type)) || 
                isSpecificSensor) {
              
              // Registramos específicamente los mensajes del sensor que buscamos
              if (isSpecificSensor) {
                logger.info(`⭐ Recibido mensaje para sensor específico 0x00124b002a6b62b7 en tópico: ${topic}`);
                logger.info(`Contenido: ${JSON.stringify(message).substring(0, 200)}...`);
                
                // Añadir a topic específico para garantizar que se guarda
                if (!messagesByTopicRef.current['0x00124b002a6b62b7']) {
                  messagesByTopicRef.current['0x00124b002a6b62b7'] = [];
                }
                messagesByTopicRef.current['0x00124b002a6b62b7'].push({
                  timestamp: new Date(),
                  topicName: topic,
                  payload: message,
                  raw: messageStr
                });
              }
              
              if (isMounted.current) {
                setSensors(prev => {
                  // Determinar si se trata del sensor específico
                  const ieeAddr = isSpecificSensor ? '0x00124b002a6b62b7' : 
                                  message.ieee_address || message.ieee_addr || topic;
                  
                  const existingSensor = prev.find(s => 
                    s.ieee_addr === ieeAddr || 
                    s.ieee_addr === topic ||
                    (s.ieee_addr === '0x00124b002a6b62b7' && isSpecificSensor)
                  );
                  
                  // Extraer mejor friendly_name de diferentes fuentes posibles
                  const extractedFriendlyName = message.friendly_name || 
                                              (message.device && message.device.friendly_name) || 
                                              (topic.split('/').length > 1 ? topic.split('/').slice(-2).join('/') : topic.split('/').pop());
                  
                  // Si el sensor ya existe, actualizarlo
                  if (existingSensor) {
                    return prev.map(s => 
                      (s.ieee_addr === ieeAddr || s.ieee_addr === topic || 
                      (s.ieee_addr === '0x00124b002a6b62b7' && isSpecificSensor))
                        ? { 
                            ...s, 
                            status: 'online', 
                            lastSeen: new Date().toISOString(), 
                            friendly_name: extractedFriendlyName || s.friendly_name, // Conservar o actualizar friendly_name
                            data: message 
                          }
                        : s
                    );
                  } else {
                    // Nuevo sensor detectado - guardar con información completa
                    return [...prev, {
                      ieee_addr: ieeAddr,
                      friendly_name: isSpecificSensor ? 'Sensor 0x00124b002a6b62b7' : extractedFriendlyName,
                      status: 'online',
                      lastSeen: new Date().toISOString(),
                      type: message.type || 'unknown',
                      model: message.model || 'unknown',
                      data: message,
                      // Añadir información adicional para facilitar identificación
                      description: isSpecificSensor ? 'Sensor específico monitoreado' : `Sensor en ${topic}`,
                      roomName: topic.includes('/') ? topic.split('/')[1] : 'unknown'
                    }];
                  }
                });
              }
            }

            // Actualizar estado si el componente sigue montado
            if (isMounted.current) {
              setAvailableTopics(Array.from(topicRegistryRef.current));
              setLastUpdate(new Date());
            }
          } catch (error) {
            logger.warn(`Error processing message from ${topic}:`, error as Record<string, unknown>);
          }
        });

        // Manejar errores
        client.on("error", (err) => {
          logger.error("Error de conexión MQTT:", err);
          isConnectingRef.current = false;

          if (isMounted.current) {
            setConnectionError(err.message);
          }
        });

        // Manejar desconexión
        client.on("offline", () => {
          logger.warn("Cliente MQTT desconectado");
          if (isMounted.current) {
            setIsConnected(false);
          }
        });

        // Manejar reconexión
        client.on("reconnect", () => {
          logger.info("Intentando reconectar al broker MQTT");
        });
      } catch (error: any) {
        logger.error("Error al inicializar cliente MQTT:", error);
        isConnectingRef.current = false;

        if (isMounted.current) {
          setConnectionError(error.message);
        }
      }
    };

    // Conectar si no hay conexión activa
    if (!mqttClientRef.current && !isConnectingRef.current) {
      connectToBroker();
    }

    // Limpiar
    return () => {
      isMounted.current = false;
      
      // No desconectamos el cliente para mantener la conexión global
      // Esto es importante para no tener que reconectar en cada renderizado
    };
  }, [brokerUrl]);

  // Función manual de reconexión
  const reconnect = () => {
    if (mqttClientRef.current) {
      try {
        mqttClientRef.current.end(true);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error("Error finalizing MQTT connection:", { errorDetails: errorMessage });
      }
      mqttClientRef.current = null;
    }

    isConnectingRef.current = false;
    topicRegistryRef.current = new Set();
    messagesByTopicRef.current = {};
    setSensors([]);
    setAvailableTopics([]);
    
    // La reconexión se iniciará en el próximo ciclo del useEffect
  };

  // Obtener datos de sensores
  const getSensorData = (selectedTopics: string[] | null = null) => {
    // Si no hay tópicos seleccionados, devolver todos los datos
    if (!selectedTopics) return messagesByTopicRef.current;

    // Filtrar por tópicos seleccionados
    const filteredData: {[key: string]: any[]} = {};
    selectedTopics.forEach(topic => {
      if (messagesByTopicRef.current[topic]) {
        filteredData[topic] = messagesByTopicRef.current[topic];
      }
    });

    return filteredData;
  };

  // Exportar datos como JSON
  const exportData = () => {
    try {
      // Convertir datos a formato JSON para descarga
      const jsonData = {
        sensors,
        sensorData: messagesByTopicRef.current,
        exportTime: new Date().toISOString()
      };
      
      // Crear blob y descarga
      const blob = new Blob([JSON.stringify(jsonData, null, 2)], { 
        type: 'application/json' 
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `zigbee-data-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      return true;
    } catch (error) {
      // Convert unknown error to string representation to avoid type issues
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Error exporting data:', { errorDetails: errorMessage });
      return false;
    }
  };
  
  // Get all current data (for sessions)
  const getAllData = () => {
    // Check if we have the specific sensor 0x00124b002a6b62b7
    const hasSensor = sensors.some(s => 
      s.ieee_addr === '0x00124b002a6b62b7' || 
      s.friendly_name?.includes('0x00124b002a6b62b7')
    );
    
    // If it's not in sensors but is selected for the session, we add it manually
    if (!hasSensor && messagesByTopicRef.current['0x00124b002a6b62b7']) {
      logger.info("⚠️ Manually including specific sensor 0x00124b002a6b62b7 in session data");
      const sensorData: Sensor = {
        ieee_addr: '0x00124b002a6b62b7',
        friendly_name: 'Sensor 0x00124b002a6b62b7',
        status: 'online',
        lastSeen: new Date().toISOString(),
        type: 'sensor',
        model: 'zigbee',
        data: {}
      };
      
      // Add to the sensor list (only if it doesn't exist yet)
      // We don't use setState to avoid rendering and type issues
      if (!sensors.some(s => s.ieee_addr === '0x00124b002a6b62b7')) {
        sensors.push(sensorData);
      }
    }
    
    // Make sure we have an entry for the specific sensor
    if (!messagesByTopicRef.current['0x00124b002a6b62b7']) {
      messagesByTopicRef.current['0x00124b002a6b62b7'] = [];
    }
    
    return {
      sensors,
      sensorData: messagesByTopicRef.current,
      topicRegistry: Array.from(topicRegistryRef.current),
      timestamp: new Date().toISOString(),
      // Include additional info for the specific sensor to ensure it's processed properly
      specificSensorData: {
        ieee_addr: '0x00124b002a6b62b7',
        data: messagesByTopicRef.current['0x00124b002a6b62b7'] || []
      }
    };
  };

  // Return hook API
  return {
    isConnected,
    connectionError,
    sensors,
    sensorCount: sensors.length,
    availableTopics,
    reconnect,
    getSensorData,
    exportData,
    getAllData,
    lastUpdate
  };
}