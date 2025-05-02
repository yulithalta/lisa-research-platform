import { Express } from 'express';
import { sensorDataMapper } from './sensor-data-mapper';
import { logger } from '../client/src/lib/services/logger';
import fs from 'fs';
import path from 'path';

// Archivo para guardar los sensores en forma de backup
const SENSORS_BACKUP_FILE = path.join(process.cwd(), 'data', 'sensors-backup.json');

/**
 * Registra las rutas relacionadas con sensores
 * @param app Express App
 */
export function registerSensorRoutes(app: Express): void {
  // Middleware para verificar autenticación
  const isAuthenticated = (req: any, res: any, next: any) => {
    if (req.isAuthenticated()) {
      return next();
    }
    res.sendStatus(401);
  };

  // Endpoint para obtener todos los sensores
  app.get('/api/sensors', isAuthenticated, (req, res) => {
    try {
      const sensors = sensorDataMapper.getAllSensors();
      res.json(sensors);
    } catch (error) {
      logger.error('Error al obtener sensores:', error instanceof Error ? error.message : String(error));
      res.status(500).json({ 
        error: 'Error al obtener sensores', 
        message: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Endpoint para forzar lectura desde archivo de respaldo
  app.get('/api/sensors/load-backup', isAuthenticated, (req, res) => {
    try {
      if (fs.existsSync(SENSORS_BACKUP_FILE)) {
        const data = fs.readFileSync(SENSORS_BACKUP_FILE, 'utf-8');
        const sensors = JSON.parse(data);
        
        // Verificar que es un array válido
        if (Array.isArray(sensors)) {
          // Añadir cada sensor al sistema
          sensors.forEach(sensor => {
            if (sensor.id && sensor.topic) {
              sensorDataMapper.addOrUpdateSensor(sensor.id, sensor);
            }
          });
          
          res.json({ 
            success: true, 
            message: `Cargados ${sensors.length} sensores desde archivo de respaldo`,
            sensors: sensorDataMapper.getAllSensors()
          });
        } else {
          res.status(400).json({ error: 'El archivo de respaldo no contiene un formato válido' });
        }
      } else {
        res.status(404).json({ error: 'No se encontró archivo de respaldo de sensores' });
      }
    } catch (error) {
      logger.error('Error al cargar sensores desde respaldo:', error instanceof Error ? error.message : String(error));
      res.status(500).json({ 
        error: 'Error al cargar sensores desde respaldo', 
        message: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Endpoint para guardar lista actual de sensores como respaldo
  app.post('/api/sensors/create-backup', isAuthenticated, (req, res) => {
    try {
      const sensors = sensorDataMapper.getAllSensors();
      
      // Asegurar que el directorio existe
      const dir = path.dirname(SENSORS_BACKUP_FILE);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      // Guardar la lista de sensores
      fs.writeFileSync(SENSORS_BACKUP_FILE, JSON.stringify(sensors, null, 2));
      
      res.json({ 
        success: true, 
        message: `Guardados ${sensors.length} sensores en archivo de respaldo`,
        backupFile: SENSORS_BACKUP_FILE
      });
    } catch (error) {
      logger.error('Error al crear respaldo de sensores:', error instanceof Error ? error.message : String(error));
      res.status(500).json({ 
        error: 'Error al crear respaldo de sensores', 
        message: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Endpoint para añadir sensores manualmente (útil cuando no hay conexión MQTT)
  app.post('/api/sensors/add', isAuthenticated, (req, res) => {
    try {
      const { id, topic, type, friendlyName, data } = req.body;
      
      if (!id || typeof id !== 'string') {
        return res.status(400).json({ error: 'Se requiere un ID de sensor válido' });
      }
      
      sensorDataMapper.addOrUpdateSensor(id, {
        topic: topic || `zigbee2mqtt/${id}`,
        type: type || 'manual',
        friendlyName,
        data: data || {}
      });
      
      res.json({ 
        success: true, 
        message: `Sensor ${id} añadido correctamente`,
        sensor: sensorDataMapper.getAllSensors().find(s => s.id === id)
      });
    } catch (error) {
      logger.error('Error al añadir sensor manual:', error instanceof Error ? error.message : String(error));
      res.status(500).json({ 
        error: 'Error al añadir sensor manual', 
        message: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Endpoint para simular la recepción de datos MQTT (útil para pruebas)
  app.post('/api/sensors/simulate-mqtt', isAuthenticated, (req, res) => {
    try {
      const { topic, payload } = req.body;
      
      if (!topic || typeof topic !== 'string') {
        return res.status(400).json({ error: 'Se requiere un topic MQTT válido' });
      }
      
      sensorDataMapper.addSensorFromMqttTopic(topic, payload || {});
      
      res.json({ 
        success: true, 
        message: `Simulado mensaje MQTT para topic ${topic}`,
        sensorsCount: sensorDataMapper.getAllSensors().length
      });
    } catch (error) {
      logger.error('Error al simular mensaje MQTT:', error instanceof Error ? error.message : String(error));
      res.status(500).json({ 
        error: 'Error al simular mensaje MQTT', 
        message: error instanceof Error ? error.message : String(error) 
      });
    }
  });

  logger.info('Rutas de sensores registradas');
}