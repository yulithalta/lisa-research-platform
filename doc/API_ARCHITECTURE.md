# API Architecture for Data Reception and Storage in LISA 3.0.0

## Executive Summary

This document describes the architecture and design of the Node.js-based API for LISA (Living-lab Integrated Sensing Architecture), a system for synchronized acquisition of IP camera recordings and MQTT/Zigbee sensor data. The API is designed for scalability, fault tolerance, and deployment flexibility.

## High-Level Architecture

The API follows a modular architecture inspired by MVC principles and elements of microservices, with the following key layers:

---

### 1. Interface Layer (Routes)

All routes are implemented in `server/routes.ts`, organized by functional domains:

```typescript
// User management routes
app.get('/api/user', authenticatedOnly, (req, res) => res.json(req.user));
app.post('/api/login', passport.authenticate('local'), (req, res) => res.json(req.user));
app.post('/api/register', async (req, res) => { /* ... */ });
app.post('/api/logout', (req, res) => { /* ... */ });

// Camera management routes
app.get('/api/cameras', authenticatedOnly, async (req, res) => { /* ... */ });
app.post('/api/cameras', authenticatedOnly, async (req, res) => { /* ... */ });
app.put('/api/cameras/:id', authenticatedOnly, async (req, res) => { /* ... */ });
app.delete('/api/cameras/:id', authenticatedOnly, async (req, res) => { /* ... */ });

// Sensor management routes
app.get('/api/sensors', authenticatedOnly, async (req, res) => { /* ... */ });
app.post('/api/sensors', authenticatedOnly, async (req, res) => { /* ... */ });
app.put('/api/sensors/:id', authenticatedOnly, async (req, res) => { /* ... */ });
app.delete('/api/sensors/:id', authenticatedOnly, async (req, res) => { /* ... */ });

// Recording session routes
app.get('/api/sessions', authenticatedOnly, async (req, res) => { /* ... */ });
app.post('/api/sessions', authenticatedOnly, async (req, res) => { /* ... */ });
app.get('/api/sessions/:id', authenticatedOnly, async (req, res) => { /* ... */ });
app.put('/api/sessions/:id', authenticatedOnly, async (req, res) => { /* ... */ });
app.delete('/api/sessions/:id', authenticatedOnly, async (req, res) => { /* ... */ });

// Data export and sensor data retrieval
app.get('/api/sensor-data/:sensorId', authenticatedOnly, async (req, res) => { /* ... */ });
app.get('/api/session-data/:sessionId', authenticatedOnly, async (req, res) => { /* ... */ });
app.get('/api/export/:sessionId', authenticatedOnly, async (req, res) => { /* ... */ });
````

---

### 2. Storage Layer (Strategy Pattern)

The application implements a `Strategy`-based storage layer for interchangeable persistence mechanisms:

```typescript
export interface IStorage {
  // User methods
  getUser(id: number): Promise<any>;
  getUserByUsername(username: string): Promise<any>;
  createUser(user: any): Promise<any>;

  // Camera methods
  getCameras(userId: number): Promise<any[]>;
  getCamera(id: number): Promise<any>;
  createCamera(camera: any): Promise<any>;
  updateCamera(id: number, data: any): Promise<any>;
  deleteCamera(id: number): Promise<void>;

  // Sensor methods
  getSensors(userId: number): Promise<any[]>;
  getSensor(id: number): Promise<any>;
  createSensor(sensor: any): Promise<any>;
  updateSensor(id: number, data: any): Promise<any>;
  deleteSensor(id: number): Promise<void>;

  // Session methods
  getSessions(userId: number): Promise<any[]>;
  getSession(id: number): Promise<any>;
  createSession(session: any): Promise<any>;
  updateSession(id: number, data: any): Promise<any>;
  deleteSession(id: number): Promise<void>;

  // Sensor readings
  saveSensorReading(reading: any): Promise<any>;
  getSensorReadings(sensorId: number, options?: any): Promise<any[]>;

  // Session store
  sessionStore: session.Store;
}
```

Supported implementations:

| Implementation      | Intended Use Case                        |
| ------------------- | ---------------------------------------- |
| **MemStorage**      | Development and lightweight deployments  |
| **DatabaseStorage** | PostgreSQL-based production environments |

Selection based on environment variables:

```typescript
export const storage = process.env.USE_DATABASE === 'true'
  ? new DatabaseStorage()
  : new MemStorage();
```

---

### 3. MQTT Integration for Real-Time Data

```typescript
const mqttClient = mqtt.connect(process.env.MQTT_BROKER, {
  username: process.env.MQTT_USERNAME || undefined,
  password: process.env.MQTT_PASSWORD || undefined
});

mqttClient.on('connect', () => {
  mqttClient.subscribe('#');
  console.log('Connected to MQTT broker, listening to all topics');
});

mqttClient.on('message', async (topic, message) => {
  try {
    const data = JSON.parse(message.toString());
    const sensor = await findSensorByTopic(topic);

    if (sensor) {
      await storage.saveSensorReading({
        sensorId: sensor.id,
        value: data,
        topic,
        timestamp: new Date(),
        sessionId: getActiveSessionId(sensor.id)
      });

      eventEmitter.emit('sensor-data', { sensor, data });
    }
  } catch (error) {
    console.error(`Error processing MQTT message on ${topic}:`, error);
  }
});
```

---

### 4. WebSocket Event-Driven Communication

```typescript
const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

wss.on('connection', (socket) => {
  console.log('WebSocket connection established');

  const sensorDataListener = (data) => {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: 'sensor-data', data }));
    }
  };

  const sessionUpdateListener = (data) => {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: 'session-update', data }));
    }
  };

  eventEmitter.on('sensor-data', sensorDataListener);
  eventEmitter.on('session-update', sessionUpdateListener);

  socket.on('close', () => {
    eventEmitter.off('sensor-data', sensorDataListener);
    eventEmitter.off('session-update', sessionUpdateListener);
  });
});
```

---

## Data Handling and Persistence

### Main entities

* Users
* Cameras
* Sensors
* Sessions
* SensorReadings

### Data Export (ZIP packaging)

```typescript
app.get('/api/export/:sessionId', authenticatedOnly, async (req, res) => {
  const sessionId = parseInt(req.params.sessionId);
  const session = await storage.getSession(sessionId);

  if (!session) return res.status(404).json({ error: 'Session not found' });

  const archive = archiver('zip', { zlib: { level: 9 } });
  const sessionDir = path.join(process.cwd(), 'recordings', `session-${sessionId}`);

  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="session-${sessionId}.zip"`);
  archive.pipe(res);

  if (fs.existsSync(sessionDir)) {
    archive.directory(sessionDir, 'videos');
  }

  for (const sensor of session.sensors) {
    const readings = await storage.getSensorReadings(sensor.id, { sessionId });

    archive.append(JSON.stringify(readings, null, 2), {
      name: `sensor-data/${sensor.name}-data.json`
    });

    archive.append(convertToCSV(readings), {
      name: `sensor-data/${sensor.name}-data.csv`
    });
  }

  archive.append(JSON.stringify(session, null, 2), { name: 'session-metadata.json' });

  await archive.finalize();
});
```

---

## Technical Rationale

### Strategy Pattern for Storage

* Deployment flexibility (JSON FS or PostgreSQL)
* Encapsulation of persistence logic
* Improved testability with mock storage providers
* Enables phased scaling

### Observer + Pub/Sub for Real-Time Data

* Full decoupling between producers and consumers
* Non-blocking processing under high load
* Scalable to thousands of messages per second

### Distributed Microservice-Oriented Design

* Fault isolation between components
* Horizontal scalability for specific subsystems
* Independent deployment strategies (Docker-ready)

---

## Conclusions and Recommendations

### Completed in v3.0.0

* Full REST API for device and session management
* Real-time MQTT ingestion and storage
* WebSocket push channel for live monitoring
* Swappable storage backend for multi-stage deployment

### Recommended for v4.0.0

* Database sharding and high-availability storage
* Real-time analytics and anomaly detection
* Role-based access control (RBAC)
* Optional GraphQL APIs for complex queries

---

This document summarizes the API architecture for data acquisition and storage in LISA 3.0.0. The current design establishes a robust and extensible foundation for future system evolution.
