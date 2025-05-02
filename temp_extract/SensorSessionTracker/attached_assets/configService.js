// services/configService.js
import axios from 'axios';
import fs from 'fs';

/**
 * Servicio para gestionar la configuración de la aplicación
 * Permite cargar y guardar la configuración tanto en el servidor como en local
 */
class ConfigService {
  constructor(configFilePath = '/api/config') {
    this.configFilePath = configFilePath;
    this.configLoaded = false;
    this.config = null;
  }

  /**
   * Carga la configuración desde el servidor o archivo local
   * @returns {Promise<Object>} - La configuración cargada
   */
  async loadConfig() {
    try {
      // Intentar cargar desde API primero
      try {
        const response = await axios.get(this.configFilePath);
        if (response.data) {
          this.config = response.data;
          this.configLoaded = true;
          return this.config;
        }
      } catch (apiError) {
        console.log('API no disponible, cargando desde archivo local');
      }

      // Cargar desde archivo local si está en Node.js
      if (typeof window === 'undefined' && fs) {
        const rawConfig = fs.readFileSync('/app/topicsConfig.json');
        this.config = JSON.parse(rawConfig);
        this.configLoaded = true;
        return this.config;
      }

      // En el navegador, cargar desde archivo público
      const response = await axios.get('/topicsConfig.json');
      this.config = response.data;
      this.configLoaded = true;
      return this.config;
    } catch (error) {
      console.error('Error cargando configuración:', error);
      throw new Error('No se pudo cargar la configuración');
    }
  }

  /**
   * Guarda la configuración en el servidor y localmente
   * @param {Object} config - La configuración a guardar
   * @returns {Promise<boolean>} - True si se guardó correctamente
   */
  async saveConfig(config) {
    try {
      // Guardar en localStorage primero como respaldo
      if (typeof window !== 'undefined') {
        localStorage.setItem('zigbee_auto_config', JSON.stringify(config));
      }

      // Intentar guardar en API
      try {
        await axios.post(this.configFilePath, config);
        this.config = config;
        return true;
      } catch (apiError) {
        console.log('API no disponible para guardar, guardando solo localmente');
      }

      // Si estamos en Node.js, guardar en archivo local
      if (typeof window === 'undefined' && fs) {
        fs.writeFileSync('/app/topicsConfig.json', JSON.stringify(config, null, 2));
        this.config = config;
        return true;
      }

      // Si llegamos aquí, solo se guardó en localStorage
      this.config = config;
      return true;
    } catch (error) {
      console.error('Error guardando configuración:', error);
      return false;
    }
  }

  /**
   * Detecta y añade un nuevo sensor a la configuración
   * @param {string} topic - El topic MQTT del sensor
   * @param {Object} data - Datos del sensor
   * @returns {Promise<boolean>} - True si se añadió correctamente
   */
  async addSensor(topic, data = {}) {
    try {
      if (!this.configLoaded) {
        await this.loadConfig();
      }

      // Verificar si el sensor ya existe
      if (this.config.topics.some(t => t.topic === topic)) {
        return false; // Ya existe
      }

      // Crear ID único para el sensor
      const id = `sensor${this.config.topics.length + 1}`;

      // Determinar nombre amigable
      const topicParts = topic.split('/');
      const lastPart = topicParts[topicParts.length - 1];
      let name = lastPart;

      if (data.friendly_name) {
        name = data.friendly_name;
      } else if (lastPart.length > 16) {
        // Si es un ID largo, usar un nombre más amigable
        name = `Sensor-${id}`;
      }

      // Colores predefinidos
      const colors = ['#4682B4', '#20B2AA', '#6A5ACD', '#FF7F50', '#32CD32'];
      const color = colors[Math.floor(Math.random() * colors.length)];

      // Añadir nuevo sensor
      const newSensor = {
        id,
        topic,
        name,
        type: data.type || 'contact',
        icon: data.icon || "/images/door-sensor.png",
        color
      };

      // Actualizar configuración
      this.config.topics.push(newSensor);
      
      // Guardar configuración actualizada
      await this.saveConfig(this.config);
      
      return true;
    } catch (error) {
      console.error('Error añadiendo sensor:', error);
      return false;
    }
  }
}

// Exportar instancia singleton
export default new ConfigService();