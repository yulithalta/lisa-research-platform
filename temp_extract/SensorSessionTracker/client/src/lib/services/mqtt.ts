import { logger } from './logger';

class MQTTService {
  private static instance: MQTTService;
  private client: any = null;
  private subscribers: Map<string, Function[]> = new Map();

  private constructor() {}

  static getInstance(): MQTTService {
    if (!MQTTService.instance) {
      MQTTService.instance = new MQTTService();
    }
    return MQTTService.instance;
  }

  async connect() {
    try {
      // Importar el módulo MQTT del cliente web
      const { default: mqtt } = await import('mqtt');

      // Conectar al broker MQTT local en el puerto estándar WebSocket (9001)
      const brokerUrl = 'ws://localhost:9001';
      logger.info('Connecting to MQTT broker', { url: brokerUrl });

      this.client = mqtt.connect(brokerUrl);

      this.client.on('connect', () => {
        logger.info('Connected to MQTT broker');
        this.client.subscribe('zigbee2mqtt/#', (err: any) => {
          if (err) {
            logger.error('Error subscribing to topic', { error: err.message });
            return;
          }
          logger.info('Subscribed to zigbee2mqtt/#');
        });
      });

      this.client.on('message', (topic: string, message: Buffer) => {
        try {
          const payload = JSON.parse(message.toString());
          logger.info('Received MQTT message', { topic, payload });
          const subscribers = this.subscribers.get(topic) || [];
          subscribers.forEach(callback => callback(payload));
        } catch (error) {
          logger.error('Error processing MQTT message', { 
            error: error instanceof Error ? error.message : 'Unknown error',
            topic,
            message: message.toString()
          });
        }
      });

      this.client.on('error', (error: Error) => {
        logger.error('MQTT connection error', { 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
        this.client = null;
      });

      this.client.on('close', () => {
        logger.info('MQTT connection closed');
        this.client = null;
      });

    } catch (error) {
      logger.error('Error creating MQTT connection', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      this.client = null;
      throw error;
    }
  }

  subscribe(topic: string, callback: Function) {
    if (!this.client) {
      throw new Error('MQTT client not connected');
    }

    const subscribers = this.subscribers.get(topic) || [];
    subscribers.push(callback);
    this.subscribers.set(topic, subscribers);

    return () => {
      const subscribers = this.subscribers.get(topic) || [];
      const index = subscribers.indexOf(callback);
      if (index > -1) {
        subscribers.splice(index, 1);
        this.subscribers.set(topic, subscribers);
      }
    };
  }

  publish(topic: string, message: any) {
    if (!this.client?.connected) {
      throw new Error('MQTT client not connected');
    }
    this.client.publish(topic, JSON.stringify(message), { qos: 1 });
  }

  disconnect() {
    if (this.client) {
      this.client.end();
      this.client = null;
    }
  }
}

export const mqttService = MQTTService.getInstance();