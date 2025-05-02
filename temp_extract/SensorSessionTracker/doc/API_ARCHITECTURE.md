# Arquitectura de la API para Recepción y Almacenamiento de Datos en LISA 3.0.0

## Resumen Ejecutivo

Este documento detalla la arquitectura y diseño de la API implementada en Node.js para LISA (Living-lab Integrated Sensing Architecture), un sistema de gestión para la sincronización de grabaciones de cámaras IP y sensores MQTT/Zigbee. La API fue diseñada con un enfoque en escalabilidad, tolerancia a fallos y flexibilidad de implementación.

## Arquitectura General

La API sigue una arquitectura modular basada en el patrón MVC (Modelo-Vista-Controlador) con elementos de microservicios, implementando los siguientes componentes clave:

### 1. Capa de Interfaz (Routes)

Todas las rutas de la API están definidas en `server/routes.ts`, organizadas por funcionalidad:

```typescript
// Rutas para gestión de usuarios
app.get('/api/user', authenticatedOnly, (req, res) => res.json(req.user));
app.post('/api/login', passport.authenticate('local'), (req, res) => res.json(req.user));
app.post('/api/register', async (req, res) => { /* ... */ });
app.post('/api/logout', (req, res) => { /* ... */ });

// Rutas para gestión de cámaras
app.get('/api/cameras', authenticatedOnly, async (req, res) => { /* ... */ });
app.post('/api/cameras', authenticatedOnly, async (req, res) => { /* ... */ });
app.put('/api/cameras/:id', authenticatedOnly, async (req, res) => { /* ... */ });
app.delete('/api/cameras/:id', authenticatedOnly, async (req, res) => { /* ... */ });

// Rutas para gestión de sensores
app.get('/api/sensors', authenticatedOnly, async (req, res) => { /* ... */ });
app.post('/api/sensors', authenticatedOnly, async (req, res) => { /* ... */ });
app.put('/api/sensors/:id', authenticatedOnly, async (req, res) => { /* ... */ });
app.delete('/api/sensors/:id', authenticatedOnly, async (req, res) => { /* ... */ });

// Rutas para sesiones de grabación
app.get('/api/sessions', authenticatedOnly, async (req, res) => { /* ... */ });
app.post('/api/sessions', authenticatedOnly, async (req, res) => { /* ... */ });
app.get('/api/sessions/:id', authenticatedOnly, async (req, res) => { /* ... */ });
app.put('/api/sessions/:id', authenticatedOnly, async (req, res) => { /* ... */ });
app.delete('/api/sessions/:id', authenticatedOnly, async (req, res) => { /* ... */ });

// Rutas para datos de sensores y telemetría
app.get('/api/sensor-data/:sensorId', authenticatedOnly, async (req, res) => { /* ... */ });
app.get('/api/session-data/:sessionId', authenticatedOnly, async (req, res) => { /* ... */ });
app.get('/api/export/:sessionId', authenticatedOnly, async (req, res) => { /* ... */ });
```

### 2. Capa de Almacenamiento (Storage)

La implementación utiliza el patrón Strategy para proporcionar flexibilidad en el mecanismo de almacenamiento:

```typescript
// Interfaz común (IStorage)
export interface IStorage {
  // Métodos para usuarios
  getUser(id: number): Promise<any>;
  getUserByUsername(username: string): Promise<any>;
  createUser(user: any): Promise<any>;
  
  // Métodos para cámaras
  getCameras(userId: number): Promise<any[]>;
  getCamera(id: number): Promise<any>;
  createCamera(camera: any): Promise<any>;
  updateCamera(id: number, data: any): Promise<any>;
  deleteCamera(id: number): Promise<void>;
  
  // Métodos para sensores
  getSensors(userId: number): Promise<any[]>;
  getSensor(id: number): Promise<any>;
  createSensor(sensor: any): Promise<any>;
  updateSensor(id: number, data: any): Promise<any>;
  deleteSensor(id: number): Promise<void>;
  
  // Métodos para sesiones
  getSessions(userId: number): Promise<any[]>;
  getSession(id: number): Promise<any>;
  createSession(session: any): Promise<any>;
  updateSession(id: number, data: any): Promise<any>;
  deleteSession(id: number): Promise<void>;
  
  // Métodos para lecturas de sensores
  saveSensorReading(reading: any): Promise<any>;
  getSensorReadings(sensorId: number, options?: any): Promise<any[]>;
  
  // Store para sesiones
  sessionStore: session.Store;
}
```

#### Implementaciones de Storage

1. **MemStorage**: Implementación basada en memoria con persistencia en archivos JSON, ideal para desarrollo y despliegues pequeños.
2. **DatabaseStorage**: Implementación para PostgreSQL, diseñada para entornos de producción con gran volumen de datos.

La selección de la implementación se realiza mediante variables de entorno:

```typescript
export const storage = process.env.USE_DATABASE === 'true' 
  ? new DatabaseStorage() 
  : new MemStorage();
```

### 3. Integración MQTT para Datos en Tiempo Real

```typescript
// Conexión al broker MQTT configurado mediante variables de entorno
const mqttClient = mqtt.connect(process.env.MQTT_BROKER, {
  username: process.env.MQTT_USERNAME || undefined,
  password: process.env.MQTT_PASSWORD || undefined
});

// Suscripción a múltiples tópicos, incluyendo tópicos de dispositivos Zigbee
mqttClient.on('connect', () => {
  mqttClient.subscribe('#'); // Suscripción a todos los tópicos
  console.log('Conectado a broker MQTT, escuchando todos los tópicos');
});

// Procesamiento y almacenamiento de datos de sensores
mqttClient.on('message', async (topic, message) => {
  try {
    const data = JSON.parse(message.toString());
    
    // Identificar el sensor por el tópico
    const sensor = await findSensorByTopic(topic);
    if (sensor) {
      // Almacenar la lectura asociada al sensor
      await storage.saveSensorReading({
        sensorId: sensor.id,
        value: data,
        topic,
        timestamp: new Date(),
        sessionId: getActiveSessionId(sensor.id)
      });
      
      // Emitir evento para notificar a clientes en tiempo real
      eventEmitter.emit('sensor-data', { sensor, data });
    }
  } catch (error) {
    console.error(`Error procesando mensaje MQTT de ${topic}:`, error);
  }
});
```

### 4. Sistema de Notificación de Eventos en Tiempo Real

```typescript
// Configuración de WebSocket para comunicación en tiempo real
const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

wss.on('connection', (socket) => {
  console.log('Nueva conexión WebSocket establecida');
  
  // Enviar datos de sensores en tiempo real
  const sensorDataListener = (data) => {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: 'sensor-data',
        data
      }));
    }
  };
  
  // Enviar actualizaciones de estado de sesión
  const sessionUpdateListener = (data) => {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: 'session-update',
        data
      }));
    }
  };
  
  // Registrar listeners
  eventEmitter.on('sensor-data', sensorDataListener);
  eventEmitter.on('session-update', sessionUpdateListener);
  
  // Limpiar listeners cuando se cierra la conexión
  socket.on('close', () => {
    eventEmitter.off('sensor-data', sensorDataListener);
    eventEmitter.off('session-update', sessionUpdateListener);
  });
});
```

## Gestión de Datos

### 1. Estructura de Datos

Los datos se organizan en las siguientes entidades principales:

- **Users**: Almacena información de usuarios y credenciales
- **Cameras**: Gestiona dispositivos de captura de video
- **Sensors**: Administra sensores y sus configuraciones
- **Sessions**: Sesiones de grabación que asocian cámaras y sensores
- **SensorReadings**: Almacena las lecturas de sensores

### 2. Exportación de Datos

```typescript
app.get('/api/export/:sessionId', authenticatedOnly, async (req, res) => {
  const sessionId = parseInt(req.params.sessionId);
  const session = await storage.getSession(sessionId);
  
  if (!session) {
    return res.status(404).json({ error: 'Sesión no encontrada' });
  }
  
  // Crear archivo ZIP con grabaciones y datos de sensores
  const archive = archiver('zip', { zlib: { level: 9 } });
  const sessionDir = path.join(process.cwd(), 'recordings', `session-${sessionId}`);
  
  // Preparar respuesta HTTP
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="session-${sessionId}.zip"`);
  archive.pipe(res);
  
  // Añadir archivos de video
  if (fs.existsSync(sessionDir)) {
    archive.directory(sessionDir, 'videos');
  }
  
  // Añadir datos de sensores en formato JSON y CSV
  for (const sensor of session.sensors) {
    const readings = await storage.getSensorReadings(sensor.id, { sessionId });
    
    // Formato JSON
    archive.append(JSON.stringify(readings, null, 2), { name: `sensor-data/${sensor.name}-data.json` });
    
    // Formato CSV
    const csvData = convertToCSV(readings);
    archive.append(csvData, { name: `sensor-data/${sensor.name}-data.csv` });
  }
  
  // Añadir metadatos de la sesión
  archive.append(JSON.stringify(session, null, 2), { name: 'session-metadata.json' });
  
  // Finalizar y enviar
  await archive.finalize();
});
```

## Justificación Técnica

### 1. Patrón Strategy para Almacenamiento

Se implementó el patrón Strategy para la capa de almacenamiento por las siguientes razones:

- **Flexibilidad de Despliegue**: Permite cambiar entre MemStorage y DatabaseStorage sin modificar el código de la aplicación.
- **Aislamiento de Complejidad**: Encapsula la lógica específica de almacenamiento detrás de una interfaz común.
- **Testabilidad**: Facilita las pruebas unitarias mediante implementaciones mock de IStorage.
- **Evolución Gradual**: Permite una transición suave de almacenamiento en memoria a bases de datos relacionales.

### 2. Observador + Publicador/Suscriptor para Datos en Tiempo Real

Se implementó una combinación de Observer y Pub/Sub por las siguientes razones:

- **Desacoplamiento**: Los productores de eventos no necesitan conocer a los consumidores.
- **Escalabilidad**: Permite manejar miles de sensores sin degradar el rendimiento.
- **Rendimiento**: Procesamiento asíncrono de datos sin bloquear el hilo principal.
- **Mantenibilidad**: Facilita agregar nuevos tipos de eventos o suscriptores.

### 3. Arquitectura de Microservicios para Distribución

- **Separación de Responsabilidades**: Cada componente (API, MQTT, WebSocket) tiene una función claramente definida.
- **Tolerancia a Fallos**: Un fallo en un componente no afecta al resto del sistema.
- **Escalabilidad Horizontal**: Permite escalar individualmente los componentes con mayor carga.
- **Distribuible**: Facilita el despliegue en múltiples servidores o en Docker Swarm.

## Conclusiones y Recomendaciones Futuras

1. **Logros de la Versión Actual**:
   - Implementación completa de la API RESTful para gestión de dispositivos
   - Integración con MQTT para captura de datos de sensores en tiempo real
   - Soporte para WebSockets que permite monitorización en tiempo real
   - Sistema flexible de almacenamiento con soporte para memoria y PostgreSQL

2. **Recomendaciones para Versión 4.0**:
   - Implementar sharding de base de datos para mayor escalabilidad
   - Agregar soporte para análisis de datos en tiempo real mediante streaming analytics
   - Implementar un sistema de permisos granular basado en roles
   - Desarrollar APIs GraphQL como alternativa a REST para consultas complejas

Este documento resume la estructura y justificación técnica de la API para recepción y almacenamiento de datos en LISA 3.0.0. La arquitectura implementada proporciona una base sólida y escalable para el crecimiento futuro del sistema.