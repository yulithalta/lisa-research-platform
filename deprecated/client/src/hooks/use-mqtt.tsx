import { useState, useEffect } from 'react';
import mqtt from 'mqtt';

interface MqttConfig {
  host: string;
  port: string;
}

interface Sensor {
  ieee_addr: string;
  friendly_name?: string;
  status: 'online' | 'offline';
}

export default function useMqtt(config?: MqttConfig) {
  const host = config?.host || import.meta.env.VITE_HOST_IP || '192.168.0.20';
  const port = config?.port || import.meta.env.VITE_MQTT_PORT || '1883';
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [client, setClient] = useState<mqtt.MqttClient | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mqttClient: mqtt.MqttClient | null = null;

    try {
      const brokerUrl = `mqtt://${host}:${port}`;
      console.log(`Attempting to connect to MQTT broker at ${brokerUrl}`);

      mqttClient = mqtt.connect(brokerUrl, {
        keepalive: 60,
        reconnectPeriod: 5000,
        clean: true,
        clientId: `webclient_${Math.random().toString(16).substring(2, 10)}`,
        rejectUnauthorized: false
      });

      mqttClient.on('connect', () => {
        console.log('Connected to MQTT broker');
        mqttClient?.subscribe('zigbee2mqtt/bridge/devices', { qos: 1 });
        mqttClient?.publish('zigbee2mqtt/bridge/request/devices', '');
      });

      mqttClient.on('message', (topic, message) => {
        try {
          if (topic === 'zigbee2mqtt/bridge/devices') {
            const data = JSON.parse(message.toString());
            const sensorList = data
              .filter((device: any) => device.type !== 'Coordinator')
              .map((device: any) => ({
                ieee_addr: device.ieee_address,
                friendly_name: device.friendly_name,
                status: device.status || 'offline'
              }));

            console.log('Sensors detected:', sensorList);
            setSensors(sensorList);
          }
        } catch (err) {
          console.error('Error processing MQTT message:', err);
          setError(err as Error);
        }
      });

      mqttClient.on('error', (err) => {
        console.error('MQTT Error:', err);
        setError(err);
      });

      mqttClient.on('offline', () => {
        console.log('MQTT client is offline');
      });

      mqttClient.on('reconnect', () => {
        console.log('MQTT client is trying to reconnect');
      });

      setClient(mqttClient);
    } catch (err) {
      console.error('Error setting up MQTT:', err);
      setError(err as Error);
    }

    return () => {
      if (mqttClient) {
        console.log('Cleaning up MQTT connection');
        mqttClient.end();
      }
    };
  }, [host, port]);

  return { 
    sensors, 
    error,
    sensorCount: sensors.length
  };
}