import { useState, useEffect, useRef } from "react";
import mqtt from "mqtt";
import { useLocalStorage } from "./use-local-storage";

// Obtener configuración de variables de entorno
const getBrokerUrls = () => {
    const envHost = import.meta.env.VITE_MQTT_HOST || '192.168.0.20'; // Default a 192.168.0.20
    const envPort = import.meta.env.VITE_MQTT_PORT || '9001';
    
    // Lista priorizada de brokers, empezando con el broker específico del usuario
    return [
        // Broker principal (especificado por el usuario)
        `ws://192.168.0.20:9001`,    // Prioritario: este es el puerto que funciona según los logs
        
        // WebSocket brokers alternativos - usando host actual como fallback
        `ws://${window.location.hostname}:9001`,
        `ws://${envHost}:${envPort}`,
        
        // Solo otros fallbacks si es absolutamente necesario
        `ws://mqtt:9001`,
        
        // Removido 'lisa.local' que causa problemas
        // Removidos brokers externos porque no queremos datos simulados
    ];
};

const getTopics = () => {
    const envTopics = import.meta.env.VITE_MQTT_TOPICS;
    return envTopics ? envTopics.split(",") : [
        "zigbee2mqtt/#",          // Tópico base de zigbee2mqtt
        "zigbee2mqtt/+",          // Dispositivos directamente bajo zigbee2mqtt
        "zigbee2mqtt/bridge/#",   // Mensajes del bridge
        "zigbee2mqtt/+/set",      // Comandos set para cualquier dispositivo
        "zigbee2mqtt/+/get",      // Comandos get para cualquier dispositivo
        "zigbee2mqtt/livinglab/#" // Namespace livinglab específico
    ];
};

// Variables globales para persistencia entre renderizados
let mqttClient: mqtt.MqttClient | null = null;
let isConnecting = false;
let topicRegistry = new Set<string>();
let messagesByTopic: Record<string, any[]> = {};

/**
 * Hook simplificado de MQTT que conecta una vez y actualiza solo cuando hay nuevos datos
 */
const useSimpleMqtt = (options: {
    brokerUrl?: string | string[];
    topics?: string[];
} = {}) => {
    // Configuración
    const brokerUrls = options.brokerUrl || getBrokerUrls();
    const topics = options.topics || getTopics();

    // Estado
    const [isConnected, setIsConnected] = useState(false);
    const [isOfflineMode, setIsOfflineMode] = useLocalStorage("mqtt_offline_mode", false);
    const [connectionError, setConnectionError] = useState<string | null>(null);
    const [availableTopics, setAvailableTopics] = useState<string[]>([]);
    const [forceUpdate, setForceUpdate] = useState(0);
    const [currentBroker, setCurrentBroker] = useState("");

    // Datos almacenados para modo offline
    const [storedData, setStoredData] = useLocalStorage<Record<string, any[]>>("mqtt_stored_data", {});

    // Referencia al ciclo de vida del componente
    const isMounted = useRef(true);

    // Conectar al broker MQTT - una sola vez
    useEffect(() => {
        isMounted.current = true;

        // Si estamos en modo offline, usar datos almacenados
        if (isOfflineMode) {
            if (Object.keys(storedData).length > 0) {
                messagesByTopic = { ...storedData };
                topicRegistry = new Set(Object.keys(storedData));
                setAvailableTopics(Array.from(topicRegistry));

                // Forzar actualización
                setForceUpdate(prev => prev + 1);
            }
            return;
        }

        // Función para conectar a un broker
        const connectToBroker = async (index = 0) => {
            if (index >= (Array.isArray(brokerUrls) ? brokerUrls.length : 1)) {
                isConnecting = false;
                if (isMounted.current) {
                    setConnectionError("No se pudo conectar a ningún broker MQTT");
                }
                return;
            }

            const brokerUrl = Array.isArray(brokerUrls) ? brokerUrls[index] : brokerUrls;

            try {
                console.log(`🔄 Conectando a broker MQTT: ${brokerUrl}`);

                // Crear cliente con opciones específicas para mejor confiabilidad
                const client = mqtt.connect(brokerUrl, {
                    keepalive: 60,
                    clientId: `lisa_mqtt_client_${Math.floor(Math.random() * 10000)}`,
                    clean: true,
                    reconnectPeriod: 5000, 
                    connectTimeout: 30000,
                    queueQoSZero: true, // Encolar mensajes incluso con QoS 0
                    protocolVersion: 4 // Usar MQTT v3.1.1 para mayor compatibilidad
                });

                // Conexión exitosa
                client.on("connect", () => {
                    console.log(`✅ Conectado a broker MQTT: ${brokerUrl}`);
                    mqttClient = client;
                    isConnecting = false;

                    if (isMounted.current) {
                        setIsConnected(true);
                        setConnectionError(null);
                        setCurrentBroker(brokerUrl);
                    }

                    // Suscribirse a cada tópico
                    topics.forEach(topic => {
                        client.subscribe(topic, (err) => {
                            if (err) {
                                console.error(`Error al suscribirse a ${topic}:`, err);
                            } else {
                                console.log(`✅ Suscrito a tópico: ${topic}`);
                            }
                        });
                    });
                });

                // Manejar mensajes entrantes
                client.on("message", (topic, payload) => {
                    try {
                        // Registrar tópico
                        topicRegistry.add(topic);

                        let message;
                        try {
                            // Intentar analizar como JSON
                            message = JSON.parse(payload.toString());
                        } catch (e) {
                            // Si no es JSON, usar el payload directamente
                            message = payload.toString();
                        }

                        // Procesar valor de contacto si existe
                        let contactValue = null;
                        if (typeof message === 'object' && message !== null) {
                            if (typeof message.contact === 'boolean') {
                                contactValue = message.contact ? 0 : 1;
                            } else if (['true', 'open', 'on', 0].includes(message.contact)) {
                                contactValue = 0;
                            } else if (['false', 'closed', 'off', 1].includes(message.contact)) {
                                contactValue = 1;
                            }
                        }

                        // Normalizar mensaje
                        const normalizedMessage = typeof message === 'object' ? {
                            x: new Date(),
                            y: contactValue !== null ? contactValue : (message.contact || 0),
                            battery: message.battery || 0,
                            linkquality: message.linkquality || 0,
                            raw: message
                        } : {
                            x: new Date(),
                            y: 0,
                            raw: message
                        };

                        // Almacenar mensaje por tópico
                        if (!messagesByTopic[topic]) {
                            messagesByTopic[topic] = [];
                        }

                        // Añadir nuevo mensaje y limitar a 20 entradas
                        messagesByTopic[topic].push(normalizedMessage);
                        if (messagesByTopic[topic].length > 20) {
                            messagesByTopic[topic] = messagesByTopic[topic].slice(-20);
                        }

                        // Actualizar estado si el componente sigue montado
                        if (isMounted.current) {
                            setAvailableTopics(Array.from(topicRegistry));

                            // Disparar un único re-renderizado
                            setForceUpdate(prev => prev + 1);

                            // Almacenar datos cada 30 segundos
                            if (Date.now() % 30000 < 1000) {
                                setStoredData({ ...messagesByTopic });
                            }
                        }
                    } catch (error) {
                        console.warn(`Error al procesar mensaje de ${topic}:`, error);
                    }
                });

                // Manejar errores
                client.on("error", (err) => {
                    console.error("Error de conexión MQTT:", err);

                    // Intentar con el siguiente broker
                    connectToBroker(index + 1);

                    if (isMounted.current) {
                        setConnectionError(err.message);
                    }
                });

                // Manejar desconexión
                client.on("offline", () => {
                    console.log("Cliente MQTT desconectado");
                    if (isMounted.current) {
                        setIsConnected(false);
                    }
                });

                // Manejar reconexión
                client.on("reconnect", () => {
                    console.log("Intentando reconectar al broker MQTT");
                });
            } catch (error: any) {
                console.error("Error al inicializar cliente MQTT:", error);
                isConnecting = false;

                // Intentar con el siguiente broker
                connectToBroker(index + 1);

                if (isMounted.current) {
                    setConnectionError(error.message);
                }
            }
        };

        // Conectar solo si no hay conexión activa y no estamos conectando ya
        if (!mqttClient && !isConnecting) {
            isConnecting = true;
            connectToBroker(0);
        } else if (mqttClient && mqttClient.connected && isMounted.current) {
            // Ya conectado, actualizar estado
            setIsConnected(true);
            setConnectionError(null);
            setAvailableTopics(Array.from(topicRegistry));
        }

        // Limpiar
        return () => {
            isMounted.current = false;
            // No desconectamos el cliente al desmontar ya que se comparte globalmente
        };
    }, [brokerUrls, topics, isOfflineMode, storedData]);

    // Función manual de reconexión
    const reconnect = () => {
        if (mqttClient) {
            try {
                // Finalizar conexión existente
                mqttClient.end(true);
            } catch (error) {
                console.error("Error al finalizar conexión MQTT:", error);
            }
            mqttClient = null;
        }

        isConnecting = false;
        setIsOfflineMode(false);

        // Forzar re-renderizado que disparará useEffect y reconectará
        setForceUpdate(prev => prev + 1);
    };

    // Activar/desactivar modo offline
    const toggleOfflineMode = () => {
        setIsOfflineMode(prev => {
            // Si activamos modo offline, guardar datos actuales
            if (!prev) {
                setStoredData({ ...messagesByTopic });
            }
            return !prev;
        });
    };

    // Obtener datos de sensores para tópicos seleccionados
    const getSensorData = (selectedTopics: string[] | null = null) => {
        // Si no hay tópicos seleccionados, devolver todos los datos
        if (!selectedTopics) return messagesByTopic;

        // Filtrar por tópicos seleccionados
        const filteredData: Record<string, any[]> = {};
        selectedTopics.forEach(topic => {
            if (messagesByTopic[topic]) {
                filteredData[topic] = messagesByTopic[topic];
            }
        });

        return filteredData;
    };

    // Guardar datos manualmente
    const saveData = () => {
        setStoredData({ ...messagesByTopic });
        return true;
    };

    // Devolver la API del hook
    return {
        isConnected,
        isOfflineMode,
        connectionError,
        availableTopics,
        currentBroker,
        reconnect,
        toggleOfflineMode,
        getSensorData,
        saveData,
        // Incluir forceUpdate como dependencia para componentes
        _forceUpdate: forceUpdate
    };
};

export default useSimpleMqtt;