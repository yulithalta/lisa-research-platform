import { useState, useEffect, useRef } from "react";
import { useLocalStorage } from "./useLocalStorage";
import mqtt from "mqtt";

/**
 * Hook mejorado para gestionar conexión MQTT con modo offline y mejor manejo de errores
 */
const useImprovedMqtt = (config = {}) => {
  // Configuración (con valores por defecto seguros)
  const brokerUrls = config?.brokerUrls || ["ws://192.168.0.20:9001", "ws://localhost:9001"];
  const topics = config?.topics || ["zigbee2mqtt/#"];
  
  // Estados
  const [sensorMessages, setSensorMessages] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const [isOfflineMode, setIsOfflineMode] = useLocalStorage("mqtt_offline_mode", false);
  const [currentBroker, setCurrentBroker] = useState(null);

  // Datos almacenados para modo offline
  const [storedMessages, setStoredMessages] = useLocalStorage("mqtt_stored_messages", []);
  
  // Referencias
  const clientRef = useRef(null);
  const brokerIndexRef = useRef(0);
  const isSubscribingRef = useRef(false);
  const reconnectTimeoutRef = useRef(null);

  // Limpiar recursos
  const cleanupClient = () => {
    if (clientRef.current) {
      try {
        // Eliminar todos los event listeners antes de cerrar
        clientRef.current.removeAllListeners();
        clientRef.current.end(true);
        console.log("🛑 Cliente MQTT desconectado y limpiado");
      } catch (e) {
        console.error("Error al limpiar cliente MQTT:", e);
      }
      clientRef.current = null;
    }
    
    // Limpiar el timeout de reconexión si existe
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  };

  // Conectar al broker MQTT
  useEffect(() => {
    // Si estamos en modo offline, usar datos almacenados
    if (isOfflineMode) {
      console.log("📁 Modo offline activado, usando datos almacenados");
      setSensorMessages(storedMessages);
      setIsConnected(false);
      cleanupClient();
      return () => {};
    }

    // Función para conectar a un broker específico
    const connectToBroker = (brokerIndex) => {
      // Limpiar cliente anterior si existe
      cleanupClient();
      
      // Actualizar índice del broker actual
      brokerIndexRef.current = brokerIndex;
      
      // Si hemos intentado todos los brokers, mostrar error
      if (brokerIndex >= brokerUrls.length) {
        console.error("❌ No se pudo conectar a ningún broker MQTT disponible");
        setConnectionError("No se pudo conectar a ningún broker MQTT");
        setIsConnected(false);
        
        // Reintentar en 10 segundos
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log("🔄 Reintentando conexión desde el primer broker...");
          connectToBroker(0);
        }, 10000);
        
        return;
      }

      // Obtener URL del broker actual
      const brokerUrl = brokerUrls[brokerIndex];
      
      // Configuración del cliente
      const options = {
        keepalive: 30,
        clientId: `zigbee_monitor_${Math.random().toString(16).substr(2, 8)}`,
        clean: true,
        reconnectPeriod: 3000,
        connectTimeout: 5000,
        rejectUnauthorized: false
      };

      try {
        console.log(`📡 Conectando a broker MQTT: ${brokerUrl}`);
        
        // Crear cliente MQTT
        const client = mqtt.connect(brokerUrl, options);
        clientRef.current = client;
        
        // Manejar evento de conexión
        client.on("connect", () => {
          console.log(`✅ Conectado a broker MQTT: ${brokerUrl}`);
          setIsConnected(true);
          setConnectionError(null);
          setCurrentBroker(brokerUrl);
          
          // Evitar múltiples intentos de suscripción simultáneos
          if (isSubscribingRef.current) return;
          isSubscribingRef.current = true;
          
          // Suscribirse a tópicos con reintento
          const subscribeToTopics = () => {
            try {
              topics.forEach(topic => {
                client.subscribe(topic, { qos: 0 }, (err) => {
                  if (err) {
                    console.error(`❌ Error al suscribirse a ${topic}:`, err);
                    // No establecer error de conexión aquí, solo log
                  } else {
                    console.log(`✅ Suscrito a tópico: ${topic}`);
                  }
                });
              });
            } catch (error) {
              console.error("Error en suscripción:", error);
            } finally {
              isSubscribingRef.current = false;
            }
          };
          
          // Pequeño retraso antes de suscribirse
          setTimeout(subscribeToTopics, 1000);
        });
        
        // Manejar mensajes recibidos
        client.on("message", (topic, message) => {
          try {
            // Intentar parsear el mensaje como JSON
            let payload;
            try {
              payload = JSON.parse(message.toString());
            } catch (e) {
              console.log(`⚠️ Mensaje no-JSON en ${topic}: ${message.toString()}`);
              return;
            }
            
            // Normalizar valor de contacto (0=cerrado, 1=abierto)
            let contact = null;
            
            // Asignar valores basándose en el payload recibido
            if (payload.hasOwnProperty('contact')) {
              if (typeof payload.contact === 'boolean') {
                contact = payload.contact ? 1 : 0;
              } else if (payload.contact === 'true' || payload.contact === 'open' || payload.contact === 'on') {
                contact = 1;
              } else if (payload.contact === 'false' || payload.contact === 'closed' || payload.contact === 'off') {
                contact = 0;
              } else if (typeof payload.contact === 'number') {
                contact = payload.contact > 0 ? 1 : 0;
              }
            }
            
            // Si no hay un valor de contacto claro, intentar inferirlo
            if (contact === null) {
              // Algunos sensores pueden usar campos diferentes
              if (payload.state === 'ON' || payload.state === 'OPEN') {
                contact = 1;
              } else if (payload.state === 'OFF' || payload.state === 'CLOSED') {
                contact = 0;
              } else {
                // Valor por defecto
                contact = 0;
              }
            }
            
            // Añadir mensaje a la lista
            setSensorMessages(prev => {
              const newMsg = { 
                topic, 
                payload: {
                  ...payload,
                  contact,
                  battery: parseInt(payload.battery) || 0,
                  linkquality: parseInt(payload.linkquality) || 0
                }, 
                timestamp: new Date() 
              };
              
              const newMessages = [...prev, newMsg];
              
              // Limitar a 100 mensajes totales
              const messages = newMessages.length > 100 ? newMessages.slice(-100) : newMessages;
              
              // Guardar periódicamente
              if (newMessages.length % 10 === 0) {
                setStoredMessages([...messages]);
              }
              
              return messages;
            });
          } catch (error) {
            console.error(`Error procesando mensaje de ${topic}:`, error);
          }
        });
        
        // Manejar errores
        client.on("error", (err) => {
          console.error(`❌ Error de conexión MQTT (${brokerUrl}):`, err);
          setConnectionError(`Error de conexión: ${err.message}`);
          
          // Intentar siguiente broker
          if (clientRef.current === client) {
            const nextBrokerIndex = brokerIndex + 1;
            console.log(`⚠️ Intentando con broker alternativo (${nextBrokerIndex + 1}/${brokerUrls.length})...`);
            
            reconnectTimeoutRef.current = setTimeout(() => {
              connectToBroker(nextBrokerIndex);
            }, 2000);
          }
        });
        
        // Manejar desconexiones
        client.on("offline", () => {
          console.warn("⚠️ Cliente MQTT desconectado");
          
          if (clientRef.current === client) {
            setIsConnected(false);
          }
        });
        
        // Reintentos automáticos
        client.on("reconnect", () => {
          console.log(`🔄 Reintentando conexión a ${brokerUrl}...`);
        });
        
        // Evento de cierre
        client.on("close", () => {
          console.log("🚪 Conexión MQTT cerrada");
          
          if (clientRef.current === client) {
            setIsConnected(false);
          }
        });
        
        // Evento de fin
        client.on("end", () => {
          console.log("🏁 Cliente MQTT finalizado");
          
          if (clientRef.current === client) {
            setIsConnected(false);
            clientRef.current = null;
          }
        });
      } catch (error) {
        console.error(`❌ Error al inicializar cliente MQTT (${brokerUrl}):`, error);
        setConnectionError(`Error al iniciar conexión: ${error.message}`);
        
        // Intentar siguiente broker
        reconnectTimeoutRef.current = setTimeout(() => {
          connectToBroker(brokerIndex + 1);
        }, 2000);
      }
    };

    // Iniciar conexión si no hay cliente activo
    if (!clientRef.current && !isOfflineMode) {
      connectToBroker(0);
    }

    // Limpiar al desmontar
    return () => {
      cleanupClient();
    };
  }, [brokerUrls, topics, isOfflineMode, storedMessages]);

  // Reconectar manualmente
  const reconnect = () => {
    console.log("🔄 Reconexión manual iniciada");
    cleanupClient();
    setIsOfflineMode(false);
    setSensorMessages([]);
    
    // Reiniciar con el primer broker
    setTimeout(() => {
      brokerIndexRef.current = 0;
      // La reconexión se iniciará en el próximo ciclo del useEffect
    }, 500);
  };

  // Cambiar entre modo online/offline
  const toggleOfflineMode = () => {
    setIsOfflineMode(prev => {
      const newMode = !prev;
      console.log(`🔄 Cambiando a modo ${newMode ? 'offline' : 'online'}`);
      
      // Si activamos modo offline, guardar mensajes actuales
      if (newMode) {
        setStoredMessages(sensorMessages);
      } else {
        // Si desactivamos modo offline, limpiar cliente para forzar reconexión
        cleanupClient();
      }
      
      return newMode;
    });
  };

  // Guardar datos manualmente
  const saveDataToStorage = () => {
    try {
      console.log("💾 Guardando datos manualmente", sensorMessages.length, "mensajes");
      setStoredMessages([...sensorMessages]);
      return true;
    } catch (error) {
      console.error("Error al guardar datos:", error);
      return false;
    }
  };

  return {
    sensorMessages,
    isConnected,
    connectionError,
    isOfflineMode,
    currentBroker,
    reconnect,
    toggleOfflineMode,
    saveDataToStorage
  };
};

export default useImprovedMqtt;