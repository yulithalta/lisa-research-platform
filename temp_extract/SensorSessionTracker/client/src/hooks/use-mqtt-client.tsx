import { useState, useEffect, useCallback, useRef } from 'react';
import mqtt, { MqttClient, IClientOptions } from 'mqtt';

type MqttMessage = {
  topic: string;
  payload: any;
  timestamp: string;
};

type SensorData = {
  [key: string]: {
    timestamp: string;
    topic: string;
    payload: any;
    contactValue?: number | null;
  }[];
};

/**
 * Hook para manejar conexiones MQTT
 * Optimizado para capturar todos los datos de los sensores
 */
export function useMqttClient() {
  // Estado para el cliente MQTT
  const [client, setClient] = useState<MqttClient | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [availableTopics, setAvailableTopics] = useState<string[]>([]);
  const [lastMessage, setLastMessage] = useState<Date | null>(null);
  
  // Referencia para datos de sensores
  const sensorDataRef = useRef<SensorData>({});
  
  // Hook para forzar actualizaciones cuando llegan datos
  const [_forceUpdate, setForceUpdate] = useState(0);
  
  // Lista de servidores de broker a intentar
  const brokerUrls = [
    'ws://192.168.0.20:9001',
    import.meta.env.VITE_MQTT_URL || `ws://${window.location.hostname}:9001`,
    'ws://mqtt:9001',
  ];
  
  /**
   * Conectarse a uno de los brokers MQTT
   */
  const connect = useCallback(async () => {
    setConnectionError(null);
    
    // Intentar conectar a cada broker en secuencia
    let connected = false;
    let error = null;
    
    for (let i = 0; i < brokerUrls.length && !connected; i++) {
      const brokerUrl = brokerUrls[i];
      console.log(`🔄 Conectando a broker MQTT: ${brokerUrl}`);
      
      try {
        // Opciones de conexión
        const options: IClientOptions = {
          clientId: `lisa_client_${Date.now()}`,
          clean: true,
          reconnectPeriod: 0,  // Deshabilitamos reconexión automática para manejarla manualmente
          connectTimeout: 5000, // 5 segundos de timeout
        };
        
        // Crear cliente MQTT
        const mqttClient = mqtt.connect(brokerUrl, options);
        
        // Intentar conectar con timeout
        const connectionResult = await new Promise<boolean>((resolve) => {
          const timeoutId = setTimeout(() => {
            if (mqttClient) {
              mqttClient.end();
            }
            resolve(false);
          }, 5000);
          
          mqttClient.on('connect', () => {
            clearTimeout(timeoutId);
            resolve(true);
          });
          
          mqttClient.on('error', (err) => {
            clearTimeout(timeoutId);
            error = err.message;
            console.error('Error MQTT:', err);
            resolve(false);
          });
        });
        
        if (connectionResult) {
          console.log(`✅ Conectado a broker MQTT: ${brokerUrl}`);
          
          // Suscribirse a tópicos
          mqttClient.subscribe('zigbee2mqtt/#');
          mqttClient.subscribe('zigbee2mqtt/livinglab/#');
          
          // Configurar listeners
          mqttClient.on('message', (topic, message) => {
            handleMessage(topic, message);
          });
          
          mqttClient.on('close', () => {
            console.log('Conexión MQTT cerrada');
            setIsConnected(false);
          });
          
          // Guardar cliente y estado
          setClient(mqttClient);
          setIsConnected(true);
          connected = true;
          
          // Solicitar lista de dispositivos
          mqttClient.publish(
            'zigbee2mqtt/bridge/request/devices',
            JSON.stringify({ transaction: `client-request-${Date.now()}` })
          );
        }
      } catch (err: any) {
        console.error(`Error al conectar a ${brokerUrl}:`, err.message);
        error = err.message;
      }
    }
    
    if (!connected && error) {
      setConnectionError(`No se pudo conectar a ningún broker MQTT: ${error}`);
      console.error('Error al inicializar cliente MQTT:', error);
    }
  }, [brokerUrls]);
  
  /**
   * Manejar mensaje MQTT
   */
  const handleMessage = useCallback((topic: string, messageBuffer: Buffer) => {
    try {
      // Procesar mensaje
      let payload;
      try {
        payload = JSON.parse(messageBuffer.toString());
      } catch (e) {
        payload = messageBuffer.toString();
      }
      
      // Guardar timestamp
      const timestamp = new Date().toISOString();
      setLastMessage(new Date());
      
      // Actualizar lista de tópicos
      setAvailableTopics(prev => {
        if (!prev.includes(topic)) {
          return [...prev, topic];
        }
        return prev;
      });
      
      // Almacenar datos del sensor
      if (!sensorDataRef.current[topic]) {
        sensorDataRef.current[topic] = [];
      }
      
      // Determinar tipo de sensor y obtener valor contactValue si es un sensor binario
      let contactValue: number | null = null;
      
      if (typeof payload === 'object') {
        if (typeof payload.contact === 'boolean') {
          contactValue = payload.contact ? 1 : 0;
        } else if (payload.contact === 'true' || payload.contact === 'open' || payload.contact === 'on') {
          contactValue = 1;
        } else if (payload.contact === 'false' || payload.contact === 'closed' || payload.contact === 'off') {
          contactValue = 0;
        } else if (payload.state === 'ON' || payload.state === true) {
          contactValue = 1;
        } else if (payload.state === 'OFF' || payload.state === false) {
          contactValue = 0;
        } else if (typeof payload.occupancy === 'boolean') {
          contactValue = payload.occupancy ? 1 : 0;
        }
      }
      
      // Guardar mensaje con datos completos
      sensorDataRef.current[topic].push({
        timestamp,
        topic,
        payload,
        ...(contactValue !== null ? { contactValue } : {})
      });
      
      // Limitar a 50 mensajes por tópico para no sobrecargar la memoria
      if (sensorDataRef.current[topic].length > 50) {
        sensorDataRef.current[topic] = sensorDataRef.current[topic].slice(-50);
      }
      
      // Forzar actualización de UI
      setForceUpdate(prev => prev + 1);
    } catch (error) {
      console.error('Error al procesar mensaje MQTT:', error);
    }
  }, []);
  
  /**
   * Desconectar cliente MQTT
   */
  const disconnect = useCallback(() => {
    if (client) {
      client.end();
      setClient(null);
      setIsConnected(false);
    }
  }, [client]);
  
  /**
   * Reconectar cliente MQTT
   */
  const reconnect = useCallback(() => {
    disconnect();
    connect();
  }, [disconnect, connect]);
  
  /**
   * Obtener datos del sensor por tópico
   */
  const getSensorData = useCallback((topics: string[]) => {
    // Si no se especifican tópicos, devolver todos
    if (!topics || topics.length === 0) {
      return sensorDataRef.current;
    }
    
    // Filtrar por tópicos solicitados
    const filteredData: SensorData = {};
    topics.forEach(topic => {
      if (sensorDataRef.current[topic]) {
        filteredData[topic] = sensorDataRef.current[topic];
      }
    });
    
    return filteredData;
  }, [_forceUpdate]); // Añadir _forceUpdate como dependencia para refrescar cuando haya nuevos datos
  
  /**
   * Exportar datos a CSV
   */
  const exportToCsv = useCallback(async () => {
    try {
      const response = await fetch('/api/mqtt/export/csv', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: sensorDataRef.current,
        }),
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `mqtt_data_${new Date().toISOString().replace(/:/g, '-')}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
        return true;
      } else {
        console.error('Error al exportar datos CSV:', await response.text());
        return false;
      }
    } catch (error) {
      console.error('Error al exportar datos CSV:', error);
      return false;
    }
  }, []);
  
  /**
   * Exportar datos a JSON
   */
  const exportToJson = useCallback(async () => {
    try {
      const blob = new Blob([JSON.stringify(sensorDataRef.current, null, 2)], {
        type: 'application/json',
      });
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mqtt_data_${new Date().toISOString().replace(/:/g, '-')}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      return true;
    } catch (error) {
      console.error('Error al exportar datos JSON:', error);
      return false;
    }
  }, []);
  
  // Conectar al montar el componente
  useEffect(() => {
    connect();
    
    // Limpiar al desmontar
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);
  
  // Devolver valores y funciones
  return {
    isConnected,
    connectionError,
    availableTopics,
    lastMessage,
    reconnect,
    disconnect,
    getSensorData,
    exportToCsv,
    exportToJson,
    _forceUpdate
  };
}