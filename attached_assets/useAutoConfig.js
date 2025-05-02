// hooks/useAutoConfig.js
import { useState, useEffect, useCallback } from 'react';
import { useLocalStorage } from './useLocalStorage';
import axios from 'axios';

/**
 * Hook que gestiona la auto-configuración de topics MQTT
 * Detecta nuevos sensores y actualiza la configuración
 */
const useAutoConfig = (sensorData = {}, mqttConnected = false) => {
  // Cargar configuración inicial
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Almacenar configuración en localStorage
  const [storedConfig, setStoredConfig] = useLocalStorage('zigbee_auto_config', null);
  
  // Cargar configuración inicial desde archivo o localStorage
  useEffect(() => {
    const loadConfig = async () => {
      try {
        setLoading(true);
        
        // Intentar cargar desde localStorage primero
        if (storedConfig) {
          setConfig(storedConfig);
          setLoading(false);
          return;
        }
        
        // Si no está en localStorage, cargar desde archivo
        const response = await axios.get('/topicsConfig.json');
        if (response.data) {
          setConfig(response.data);
          // Guardar en localStorage
          setStoredConfig(response.data);
        }
      } catch (err) {
        console.error('Error cargando configuración:', err);
        setError('No se pudo cargar la configuración inicial');
        
        // Crear configuración por defecto
        const defaultConfig = {
          topics: [],
          settings: {
            dataStorageEnabled: true,
            dataStoragePath: "./data",
            dataRetentionDays: 7,
            refreshIntervalMs: 500,
            maxDataPointsPerSensor: 100,
            defaultGridLayout: 3
          }
        };
        setConfig(defaultConfig);
        setStoredConfig(defaultConfig);
      } finally {
        setLoading(false);
      }
    };
    
    loadConfig();
  }, [storedConfig, setStoredConfig]);
  
  // Detectar y configurar nuevos sensores
  useEffect(() => {
    if (!config || !mqttConnected || Object.keys(sensorData).length === 0) return;
    
    let hasChanges = false;
    const existingIds = new Set(config.topics.map(t => t.id));
    const updatedTopics = [...config.topics];
    
    // Analizar datos de sensores para detectar nuevos
    Object.keys(sensorData).forEach(topic => {
      // Ignorar topics del sistema
      if (topic.includes('bridge/') || topic.endsWith('/bridge') || topic.includes('$SYS/')) {
        return;
      }
      
      // Extraer ID único del topic
      const topicParts = topic.split('/');
      const lastPart = topicParts[topicParts.length - 1];
      const id = `sensor${updatedTopics.length + 1}`;
      
      // Verificar si ya existe este sensor
      if (!existingIds.has(id) && !config.topics.some(t => t.topic === topic)) {
        // Determinar tipo de sensor basado en datos
        const sensorEntries = sensorData[topic] || [];
        let type = 'contact'; // Tipo por defecto
        
        // Generar color aleatorio para el sensor
        const colors = ['#4682B4', '#20B2AA', '#6A5ACD', '#FF7F50', '#32CD32', '#DA70D6', '#CD5C5C', '#4169E1'];
        const color = colors[Math.floor(Math.random() * colors.length)];
        
        // Analizar datos para determinar mejor nombre para el sensor
        let friendlyName = lastPart;
        if (lastPart.length > 16) {
          // Si el ID es largo (IEEE), generar nombre más amigable
          friendlyName = `Sensor${updatedTopics.length + 1}`;
        }
        
        // Añadir el nuevo sensor a la configuración
        updatedTopics.push({
          id,
          topic,
          name: friendlyName,
          type,
          icon: "/images/door-sensor.png",
          color
        });
        
        hasChanges = true;
        console.log(`✅ Sensor detectado automáticamente: ${friendlyName} (${topic})`);
      }
    });
    
    // Actualizar configuración si se detectaron cambios
    if (hasChanges) {
      const updatedConfig = {
        ...config,
        topics: updatedTopics
      };
      setConfig(updatedConfig);
      setStoredConfig(updatedConfig);
      
      // Intentar guardar la configuración en el servidor
      saveConfigToServer(updatedConfig);
    }
  }, [sensorData, config, mqttConnected, setStoredConfig]);
  
  // Función para guardar configuración en el servidor
  const saveConfigToServer = async (configData) => {
    try {
      // Para implementar: guardar la configuración en el servidor 
      // mediante una API REST o WebSocket
      console.log('Guardando configuración en el servidor...', configData);
      
      // Ejemplo (comentado): 
      // await axios.post('/api/config/update', configData);
      
      // En este momento solo se guarda en localStorage
    } catch (error) {
      console.error('Error al guardar configuración en el servidor:', error);
    }
  };
  
  // Guardar configuración manualmente
  const saveConfig = useCallback((newConfig) => {
    setConfig(newConfig);
    setStoredConfig(newConfig);
    saveConfigToServer(newConfig);
    return true;
  }, [setStoredConfig]);
  
  return {
    config,
    loading,
    error,
    saveConfig
  };
};

export default useAutoConfig;