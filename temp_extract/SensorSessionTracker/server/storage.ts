import { 
  User, InsertUser, 
  Camera, InsertCamera, 
  Recording, InsertRecording, 
  Sensor, InsertSensor, 
  SensorEvent, InsertSensorEvent,
  // Tipos para sesiones (integración InfluxDB)
  Session, InsertSession,
  // Nuevos tipos para RGPD
  Consent, InsertConsent,
  UserConsent, InsertUserConsent,
  AccessLog, InsertAccessLog
} from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";
import fs from "fs";
import path from "path";
import { logger } from "@/lib/services/logger";

const MemoryStore = createMemoryStore(session);

// Funciones de ayuda para manejo de tipos
function nullToUndefined<T>(value: T | null): T | undefined {
  return value === null ? undefined : value;
}

function undefinedToNull<T>(value: T | undefined): T | null {
  return value === undefined ? null : value;
}

// Asegurar que existen los directorios necesarios
const RECORDINGS_DIR = path.join(process.cwd(), "recordings");
const DATA_DIR = path.join(process.cwd(), "data");
const LOGS_DIR = path.join(process.cwd(), "logs");

// Crear directorios con permisos explícitos
[RECORDINGS_DIR, DATA_DIR, LOGS_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true, mode: 0o755 });
  }
});

// Función helper para obtener el directorio de datos de un usuario
function getUserDataDir(userId: number): string {
  const userDir = path.join(DATA_DIR, `user_${userId}`);
  if (!fs.existsSync(userDir)) {
    fs.mkdirSync(userDir, { recursive: true, mode: 0o755 });
  }
  return userDir;
}



// Función helper para guardar datos en archivo JSON
function saveToJSON(file: string, data: any) {
  try {
    fs.writeFileSync(file, JSON.stringify(data, null, 2), { mode: 0o644 });
    logger.info(`Datos guardados en ${file}`);
  } catch (error) {
    logger.error(`Error guardando en ${file}:`, error);
  }
}

// Función helper para cargar datos desde archivo JSON
function loadFromJSON(file: string): any {
  try {
    if (fs.existsSync(file)) {
      const data = fs.readFileSync(file, 'utf8');
      const parsedData = JSON.parse(data);
      logger.info(`Datos cargados desde ${file}`);
      return parsedData;
    }
  } catch (error) {
    logger.error(`Error cargando ${file}:`, error);
  }
  return {};
}

// Función para registrar actividad
function logActivity(userId: number, activityType: string, details: any) {
  const now = new Date();
  const logFile = path.join(LOGS_DIR, `activity_${now.getFullYear()}_${now.getMonth() + 1}.json`);

  const logEntry = {
    timestamp: now.toISOString(),
    userId,
    activityType,
    details,
    duration: 1 // Duración en horas por defecto para actividades
  };

  let logs = [];
  if (fs.existsSync(logFile)) {
    try {
      logs = JSON.parse(fs.readFileSync(logFile, 'utf8'));
    } catch (error) {
      logger.error(`Error reading log file ${logFile}:`, error);
    }
  }

  logs.push(logEntry);
  try {
    fs.writeFileSync(logFile, JSON.stringify(logs, null, 2));
    logger.info(`Activity logged: ${activityType}`);
  } catch (error) {
    logger.error(`Error writing to log file ${logFile}:`, error);
  }
}

// Resto del código de storage.ts
export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, update: Partial<User>): Promise<User>;

  getCameras(userId: number): Promise<Camera[]>;
  getAllCameras(): Promise<Camera[]>;
  getCamera(id: number): Promise<Camera | undefined>;
  createCamera(camera: InsertCamera & { userId: number }): Promise<Camera>;
  updateCamera(id: number, camera: Partial<Camera>): Promise<Camera>;
  deleteCamera(id: number): Promise<boolean>;

  // GDPR/RGPD: Métodos para gestión de consentimientos
  getConsents(): Promise<Consent[]>;
  getConsent(id: number): Promise<Consent | undefined>;
  createConsent(consent: InsertConsent): Promise<Consent>;
  updateConsent(id: number, consent: Partial<Consent>): Promise<Consent>;
  deleteConsent(id: number): Promise<boolean>;

  // GDPR/RGPD: Métodos para gestión de consentimientos de usuario
  getUserConsents(userId: number): Promise<UserConsent[]>;
  getUserConsentById(id: number): Promise<UserConsent | undefined>;
  getUserConsentByUserAndConsentId(userId: number, consentId: number): Promise<UserConsent | undefined>;
  createUserConsent(userConsent: InsertUserConsent): Promise<UserConsent>;
  updateUserConsent(id: number, userConsent: Partial<UserConsent>): Promise<UserConsent>;
  withdrawUserConsent(id: number): Promise<UserConsent>;

  // GDPR/RGPD: Métodos para auditoría de acceso
  logAccess(accessLog: InsertAccessLog): Promise<AccessLog>;
  getAccessLogs(params?: {
    userId?: number;
    resourceType?: string;
    resourceId?: string;
    fromDate?: Date;
    toDate?: Date;
    limit?: number;
    offset?: number;
  }): Promise<AccessLog[]>;

  // GDPR/RGPD: Métodos para exportación y eliminación de datos
  exportUserData(userId: number): Promise<any>;
  deleteUserData(userId: number, options?: { softDelete?: boolean }): Promise<void>;

  getRecordings(cameraId: number): Promise<Recording[]>;
  createRecording(recording: InsertRecording): Promise<Recording>;
  updateRecording(id: number, update: Partial<Recording>): Promise<Recording>;
  getRecording(id: number): Promise<Recording | undefined>;
  deleteRecording(id: number): Promise<void>;
  
  // Métodos para gestión de sesiones (integración InfluxDB)
  getSessions(userId: number): Promise<Session[]>;
  getSessionById(id: number): Promise<Session | undefined>;
  createSession(session: InsertSession): Promise<Session>;
  updateSession(id: number, update: Partial<Session>): Promise<Session>;
  deleteSession(id: number): Promise<void>;
  getSessionRecordings(sessionId: number): Promise<Recording[]>;

  sessionStore: session.Store;
  getMetrics(): Promise<{
    timestamp: string;
    fps: number;
    bitrate: number;
    connectionErrors: number;
  }[]>;

  // Nuevos métodos para sensores
  getSensors(userId: number): Promise<Sensor[]>;
  getSensor(id: number): Promise<Sensor | undefined>;
  createSensor(sensor: InsertSensor & { userId: number }): Promise<Sensor>;
  updateSensor(id: number, sensor: Partial<Sensor>): Promise<Sensor>;
  deleteSensor(id: number): Promise<void>;

  // Métodos para eventos de sensores
  getSensorEvents(sensorId: number): Promise<SensorEvent[]>;
  createSensorEvent(event: InsertSensorEvent): Promise<SensorEvent>;
  getSensorEvent(id: number): Promise<SensorEvent | undefined>;

  // Método para obtener grabaciones por ID de sesión
  getRecordingsBySessionId(sessionId: number): Promise<Recording[]>;

  getSystemUsageStats(userId: number): Promise<{
    systemUsage: Array<{ date: string; hours: number }>;
    cameraUsage: Array<{ date: string; hours: number }>;
    sensorUsage: Array<{ date: string; hours: number }>;
  }>;
  getDiskUsage(userId: number): Promise<{
    used: number;
    available: number;
  }>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private cameras: Map<number, Camera>;
  private recordings: Map<number, Recording>;
  private sensors: Map<number, Sensor>;
  private sensorEvents: Map<number, SensorEvent>;
  private sessions: Map<number, Session>; // Mapa para sesiones
  // Mapas para RGPD
  private consents: Map<number, Consent>;
  private userConsents: Map<number, UserConsent>;
  private accessLogs: Map<number, AccessLog>;
  // IDs para las entidades
  private currentUserId: number;
  private currentCameraId: number;
  private currentRecordingId: number;
  private currentSensorId: number;
  private currentSensorEventId: number;
  private currentSessionId: number; // ID para sesiones
  // IDs para RGPD
  private currentConsentId: number;
  private currentUserConsentId: number;
  private currentAccessLogId: number;
  // Session store
  sessionStore: session.Store;

  constructor() {
    logger.info('Inicializando MemStorage...');

    // Cargar datos del sistema
    // Cargar usuarios, o crear usuario por defecto si no hay datos
    const usersData = loadFromJSON(path.join(DATA_DIR, 'users.json'));
    this.users = new Map(Object.entries(usersData).map(([id, user]) => [Number(id), user as User]));
    
    // Si no hay usuarios, crear un usuario por defecto
    if (this.users.size === 0) {
      const defaultUser: User = {
        id: 1,
        username: 'user',
        password: '4b4d82dace4746a36ec1f023d09463ae242acaf0fd7f287c1e188c9dbed27e47.e6d99862e776d9d1',
        role: 'admin',
        fullName: 'Usuario Predeterminado',
        email: null,
        lastLogin: new Date(),
        preferences: {}
      };
      this.users.set(1, defaultUser);
      logger.info('Creado usuario predeterminado: user');
    }

    // Inicializar Maps
    this.cameras = new Map();
    this.recordings = new Map();
    this.sensors = new Map();
    this.sensorEvents = new Map();
    this.sessions = new Map();
    
    // Inicializar mapas para RGPD
    this.consents = new Map();
    this.userConsents = new Map();
    this.accessLogs = new Map();

    // Cargar datos RGPD
    const gdprDir = path.join(DATA_DIR, 'gdpr');
    if (fs.existsSync(gdprDir)) {
      // Cargar consentimientos
      const consentsFile = path.join(gdprDir, 'consents.json');
      const consentsData = loadFromJSON(consentsFile);
      Object.entries(consentsData).forEach(([id, consent]) => {
        this.consents.set(Number(id), consent as Consent);
      });
      
      // Cargar consentimientos de usuario
      const userConsentsFile = path.join(gdprDir, 'user_consents.json');
      const userConsentsData = loadFromJSON(userConsentsFile);
      Object.entries(userConsentsData).forEach(([id, userConsent]) => {
        this.userConsents.set(Number(id), userConsent as UserConsent);
      });
      
      // Cargar registros de acceso del mes actual
      const now = new Date();
      const accessLogsFile = path.join(gdprDir, `access_logs_${now.getFullYear()}_${now.getMonth() + 1}.json`);
      if (fs.existsSync(accessLogsFile)) {
        try {
          const logsData = JSON.parse(fs.readFileSync(accessLogsFile, 'utf8'));
          logsData.forEach((log: AccessLog) => {
            this.accessLogs.set(log.id, log);
          });
        } catch (error) {
          logger.error(`Error loading access logs from ${accessLogsFile}:`, error);
        }
      }
    }

    // Cargar datos por usuario
    for (const [userId] of this.users) {
      const userDir = getUserDataDir(Number(userId));

      // Cargar cámaras del usuario
      const camerasFile = path.join(userDir, 'cameras.json');
      const camerasData = loadFromJSON(camerasFile);
      Object.entries(camerasData).forEach(([id, camera]) => {
        this.cameras.set(Number(id), camera as Camera);
      });

      // Cargar sensores del usuario
      const sensorsFile = path.join(userDir, 'sensors.json');
      const sensorsData = loadFromJSON(sensorsFile);
      Object.entries(sensorsData).forEach(([id, sensor]) => {
        this.sensors.set(Number(id), sensor as Sensor);
      });

      // Cargar eventos de sensores
      const eventsFile = path.join(userDir, 'sensor_events.json');
      const eventsData = loadFromJSON(eventsFile);
      Object.entries(eventsData).forEach(([id, event]) => {
        this.sensorEvents.set(Number(id), event as SensorEvent);
      });

      // Cargar grabaciones
      const recordingsFile = path.join(userDir, 'recordings.json');
      const recordingsData = loadFromJSON(recordingsFile);
      Object.entries(recordingsData).forEach(([id, recording]) => {
        this.recordings.set(Number(id), recording as Recording);
      });
      
      // Cargar sesiones del usuario
      const sessionsFile = path.join(userDir, 'sessions.json');
      const sessionsData = loadFromJSON(sessionsFile);
      Object.entries(sessionsData).forEach(([id, session]) => {
        this.sessions.set(Number(id), session as Session);
      });
    }

    // Establecer IDs iniciales
    this.currentUserId = Math.max(0, ...Array.from(this.users.keys())) + 1;
    this.currentCameraId = Math.max(0, ...Array.from(this.cameras.keys())) + 1;
    this.currentRecordingId = Math.max(0, ...Array.from(this.recordings.keys())) + 1;
    this.currentSensorId = Math.max(0, ...Array.from(this.sensors.keys())) + 1;
    this.currentSensorEventId = Math.max(0, ...Array.from(this.sensorEvents.keys())) + 1;
    this.currentSessionId = Math.max(0, ...Array.from(this.sessions.keys())) + 1;
    
    // IDs iniciales para RGPD
    this.currentConsentId = Math.max(0, ...Array.from(this.consents.keys())) + 1;
    this.currentUserConsentId = Math.max(0, ...Array.from(this.userConsents.keys())) + 1;
    this.currentAccessLogId = Math.max(0, ...Array.from(this.accessLogs.keys())) + 1;

    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000,
    });

    this.saveState();
  }

  private saveState() {
    logger.info('Guardando estado...');

    // Guardar usuarios globalmente
    saveToJSON(path.join(DATA_DIR, 'users.json'), Object.fromEntries(this.users));

    // Guardar datos por usuario
    for (const [userId] of this.users) {
      const userDir = getUserDataDir(Number(userId));

      // Filtrar datos del usuario
      const userCameras = Array.from(this.cameras.entries())
        .filter(([_, camera]) => camera.userId === Number(userId));
      const userSensors = Array.from(this.sensors.entries())
        .filter(([_, sensor]) => sensor.userId === Number(userId));
      const userRecordings = Array.from(this.recordings.entries())
        .filter(([_, recording]) => {
          const camera = this.cameras.get(recording.cameraId);
          return camera && camera.userId === Number(userId);
        });
      const userEvents = Array.from(this.sensorEvents.entries())
        .filter(([_, event]) => {
          const sensor = this.sensors.get(event.sensorId);
          return sensor && sensor.userId === Number(userId);
        });
      const userSessions = Array.from(this.sessions.entries())
        .filter(([_, session]) => session.userId === Number(userId));

      // Guardar datos del usuario
      saveToJSON(path.join(userDir, 'cameras.json'), Object.fromEntries(userCameras));
      saveToJSON(path.join(userDir, 'sensors.json'), Object.fromEntries(userSensors));
      saveToJSON(path.join(userDir, 'recordings.json'), Object.fromEntries(userRecordings));
      saveToJSON(path.join(userDir, 'sensor_events.json'), Object.fromEntries(userEvents));
      saveToJSON(path.join(userDir, 'sessions.json'), Object.fromEntries(userSessions));
    }
    
    // Guardar datos RGPD
    const gdprDir = path.join(DATA_DIR, 'gdpr');
    if (!fs.existsSync(gdprDir)) {
      fs.mkdirSync(gdprDir, { recursive: true });
    }
    
    // Guardar consentimientos
    saveToJSON(path.join(gdprDir, 'consents.json'), Object.fromEntries(this.consents));
    saveToJSON(path.join(gdprDir, 'user_consents.json'), Object.fromEntries(this.userConsents));
    
    // Los logs de acceso se guardan a medida que se crean en archivos mensuales
    // por lo que no es necesario guardarlos aquí
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { 
      ...insertUser, 
      id, 
      lastLogin: new Date(),
      preferences: {}  
    };
    this.users.set(id, user);
    this.saveState();
    logActivity(id, "userCreated", {user});
    return user;
  }

  async updateUser(id: number, update: Partial<User>): Promise<User> {
    const user = this.users.get(id);
    if (!user) {
      throw new Error("User not found");
    }
    const updatedUser = { ...user, ...update };
    this.users.set(id, updatedUser);
    this.saveState();
    logActivity(id, "userUpdated", {user: updatedUser});
    return updatedUser;
  }

  async getCameras(userId: number): Promise<Camera[]> {
    return Array.from(this.cameras.values()).filter(
      (camera) => camera.userId === userId
    );
  }
  
  async getAllCameras(): Promise<Camera[]> {
    return Array.from(this.cameras.values());
  }

  async getCamera(id: number): Promise<Camera | undefined> {
    return this.cameras.get(id);
  }

  async createCamera(camera: InsertCamera & { userId: number }): Promise<Camera> {
    // Verificar si ya existe una cámara con la misma dirección IP para este usuario
    const existingCamera = Array.from(this.cameras.values()).find(
      cam => cam.userId === camera.userId && cam.ipAddress === camera.ipAddress
    );
    
    if (existingCamera) {
      throw new Error(`Ya existe una cámara con la dirección IP ${camera.ipAddress}`);
    }
    
    // También verificar si existe una cámara con el mismo nombre para este usuario
    const existingCameraName = Array.from(this.cameras.values()).find(
      cam => cam.userId === camera.userId && cam.name === camera.name
    );
    
    if (existingCameraName) {
      throw new Error(`Ya existe una cámara con el nombre ${camera.name}`);
    }
    
    const id = this.currentCameraId++;
    const newCamera: Camera = {
      ...camera,
      id,
      isRecording: false,
      status: 'disconnected',
      lastSeen: null,
      metrics: {
        fps: 0,
        bitrate: 0,
        resolution: '',
        uptime: 0,
        connectionErrors: 0,
        lastErrorTime: null,
        lastErrorMessage: null
      }
    };
    this.cameras.set(id, newCamera);
    this.saveState();
    logActivity(camera.userId, "cameraCreated", {camera: newCamera});
    return newCamera;
  }

  // Función simplificada para actualizar solo el estado de la cámara basado en ping
  async updateCameraStatus(id: number, status: string): Promise<Camera> {
    const camera = this.cameras.get(id);
    if (!camera) {
      throw new Error("Camera not found");
    }
    
    return this.updateCamera(id, { status });
  }
  
  async updateCamera(id: number, update: Partial<Camera>): Promise<Camera> {
    const camera = this.cameras.get(id);
    if (!camera) {
      throw new Error("Camera not found");
    }

    let updatedCamera: Camera;
    const now = new Date();

    // Si estamos actualizando el estado
    if (update.status) {
      if (update.status === 'connected') {
        // Cámara conectada
        updatedCamera = {
          ...camera,
          ...update,
          lastSeen: now,
          metrics: {
            fps: 30,
            bitrate: 2000,
            resolution: '1920x1080',
            uptime: (camera.metrics?.uptime || 0) + 1,
            connectionErrors: camera.metrics?.connectionErrors || 0,
            lastErrorTime: null,
            lastErrorMessage: null
          }
        };
      } else {
        // Cámara desconectada o con error
        updatedCamera = {
          ...camera,
          ...update,
          isRecording: false,
          lastSeen: now,
          metrics: {
            fps: 0,
            bitrate: 0,
            resolution: '',
            uptime: 0,
            connectionErrors: (camera.metrics?.connectionErrors || 0) + 1,
            lastErrorTime: now.toISOString(),
            lastErrorMessage: update.status === 'error' ? 'Error de conexión' : 'Cámara desconectada'
          }
        };
      }
    } else {
      // Otras actualizaciones mantienen el estado actual
      updatedCamera = {
        ...camera,
        ...update,
        lastSeen: now
      };
    }

    this.cameras.set(id, updatedCamera);
    this.saveState();
    logActivity(camera.userId, "cameraUpdated", {camera: updatedCamera});
    return updatedCamera;
  }

  async deleteCamera(id: number): Promise<void> {
    // Eliminar todas las grabaciones asociadas
    const recordings = Array.from(this.recordings.values())
      .filter(recording => recording.cameraId === id);

    for (const recording of recordings) {
      try {
        if (fs.existsSync(recording.filePath)) {
          fs.unlinkSync(recording.filePath);
        }
        this.recordings.delete(recording.id);
      } catch (error) {
        logger.error(`Error deleting recording ${recording.id}:`, error);
      }
    }

    const camera = this.cameras.get(id);
    if (camera) {
        logActivity(camera.userId, "cameraDeleted", {cameraId: id});
    }

    this.cameras.delete(id);
    this.saveState();
  }

  async getRecordings(cameraId: number): Promise<Recording[]> {
    return Array.from(this.recordings.values())
      .filter(recording => recording.cameraId === cameraId)
      .map(recording => ({
        ...recording,
        startTime: new Date(recording.startTime),
        endTime: recording.endTime ? new Date(recording.endTime) : null
      }))
      .sort((a, b) => b.startTime.getTime() - a.startTime.getTime());
  }

  async createRecording(recording: InsertRecording): Promise<Recording> {
    const camera = await this.getCamera(recording.cameraId);
    if (!camera) {
      throw new Error("Camera not found");
    }

    const id = this.currentRecordingId++;
    const now = new Date();
    const newRecording: Recording = {
      ...recording,
      id,
      status: "recording",
      endTime: null,
      title: recording.title || null,
      description: recording.description || null,
      tags: recording.tags || [],
      aiAnalysis: null
    };

    // Actualizar estado de la cámara
    await this.updateCamera(recording.cameraId, {
      isRecording: true,
      lastSeen: now
    });

    this.recordings.set(id, newRecording);
    this.saveState();
    logActivity(camera.userId, "recordingCreated", {recording: newRecording});
    return newRecording;
  }

  async updateRecording(id: number, update: Partial<Recording>): Promise<Recording> {
    const recording = this.recordings.get(id);
    if (!recording) {
      throw new Error("Recording not found");
    }
    const updatedRecording = { ...recording, ...update };
    this.recordings.set(id, updatedRecording);
    this.saveState();
    logActivity(recording.userId, "recordingUpdated", {recording: updatedRecording});
    return updatedRecording;
  }

  async getRecording(id: number): Promise<Recording | undefined> {
    return this.recordings.get(id);
  }

  async deleteRecording(id: number): Promise<void> {
    const recording = await this.getRecording(id);
    if (!recording) {
      throw new Error("Recording not found");
    }

    try {
      if (fs.existsSync(recording.filePath)) {
        fs.unlinkSync(recording.filePath);

        // Eliminar la miniatura si existe
        const thumbnailPath = path.join(
          process.cwd(),
          "recordings",
          "thumbnails",
          `${path.basename(recording.filePath)}.thumb.jpg`
        );
        if (fs.existsSync(thumbnailPath)) {
          fs.unlinkSync(thumbnailPath);
        }
      }
      this.recordings.delete(id);
      this.saveState();
      logActivity(recording.userId, "recordingDeleted", {recordingId: id});
    } catch (error) {
      logger.error(`Error deleting recording ${id}:`, error);
      throw error;
    }
  }

  async getMetrics(): Promise<{
    timestamp: string;
    fps: number;
    bitrate: number;
    connectionErrors: number;
  }[]> {
    // Generar datos de métricas de todas las cámaras
    const cameras = Array.from(this.cameras.values());

    // Crear un array de las últimas 24 horas con intervalos de 1 hora
    const metrics = Array.from({ length: 24 }, (_, i) => {
      const date = new Date();
      date.setHours(date.getHours() - i);

      // Calcular promedios de todas las cámaras
      const avgFps = cameras.reduce((sum, cam) => sum + ((cam.metrics && typeof cam.metrics === 'object' && 'fps' in cam.metrics) ? cam.metrics.fps : 0), 0) / Math.max(cameras.length, 1);
      const avgBitrate = cameras.reduce((sum, cam) => sum + ((cam.metrics && typeof cam.metrics === 'object' && 'bitrate' in cam.metrics) ? cam.metrics.bitrate : 0), 0) / Math.max(cameras.length, 1);
      const totalErrors = cameras.reduce((sum, cam) => sum + ((cam.metrics && typeof cam.metrics === 'object' && 'connectionErrors' in cam.metrics) ? cam.metrics.connectionErrors : 0), 0);

      // Asegurarnos de que los valores son números y añadir algo de variación para simular datos reales
      return {
        timestamp: date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
        fps: Number((30 + Math.random() * 5).toFixed(2)), // Simular FPS entre 30-35
        bitrate: Number((2000 + Math.random() * 1000).toFixed(2)), // Simular bitrate entre 2000-3000 kbps
        connectionErrors: Math.round(totalErrors + (Math.random() > 0.8 ? 1 : 0)) // Ocasionalmente añadir errores
      };
    }).reverse(); // Revertir para mostrar en orden cronológico

    return metrics;
  }

  // Implementación de métodos para sensores
  async getSensors(userId: number): Promise<Sensor[]> {
    return Array.from(this.sensors.values()).filter(
      (sensor) => sensor.userId === userId
    );
  }

  async getSensor(id: number): Promise<Sensor | undefined> {
    return this.sensors.get(id);
  }

  async createSensor(sensor: InsertSensor & { userId: number }): Promise<Sensor> {
    const id = this.currentSensorId++;
    const now = new Date();
    const newSensor: Sensor = {
      ...sensor,
      id,
      isEnabled: true,
      lastSeen: null,
      metrics: {
        battery: 100,
        linkQuality: 0,
        lastUpdate: now.toISOString(),
        status: 'offline'
      }
    };
    this.sensors.set(id, newSensor);
    this.saveState();
    logActivity(sensor.userId, "sensorCreated", {sensor: newSensor});
    return newSensor;
  }

  async updateSensor(id: number, update: Partial<Sensor>): Promise<Sensor> {
    const sensor = this.sensors.get(id);
    if (!sensor) {
      throw new Error("Sensor not found");
    }
    const updatedSensor = { ...sensor, ...update };
    this.sensors.set(id, updatedSensor);
    this.saveState();
    logActivity(sensor.userId, "sensorUpdated", {sensor: updatedSensor});
    return updatedSensor;
  }

  async deleteSensor(id: number): Promise<void> {
    // Eliminar todos los eventos asociados
    const events = Array.from(this.sensorEvents.values())
      .filter(event => event.sensorId === id);

    for (const event of events) {
      this.sensorEvents.delete(event.id);
    }

    const sensor = this.sensors.get(id);
    if (sensor) {
        logActivity(sensor.userId, "sensorDeleted", {sensorId: id});
    }
    this.sensors.delete(id);
    this.saveState();
  }

  // Implementación de métodos para eventos de sensores
  async getSensorEvents(sensorId: number): Promise<SensorEvent[]> {
    return Array.from(this.sensorEvents.values())
      .filter(event => event.sensorId === sensorId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  async createSensorEvent(event: InsertSensorEvent): Promise<SensorEvent> {
    const id = this.currentSensorEventId++;
    const newEvent: SensorEvent = {
      ...event,
      id,
      timestamp: new Date().toISOString()
    };
    this.sensorEvents.set(id, newEvent);
    this.saveState();
    logActivity(event.userId, "sensorEventCreated", {sensorEvent: newEvent});
    return newEvent;
  }

  async getSensorEvent(id: number): Promise<SensorEvent | undefined> {
    return this.sensorEvents.get(id);
  }

  async getSystemUsageStats(userId: number): Promise<{
    systemUsage: Array<{ date: string; hours: number }>;
    cameraUsage: Array<{ date: string; hours: number }>;
    sensorUsage: Array<{ date: string; hours: number }>;
  }> {
    const now = new Date();
    const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
    const stats = {
      systemUsage: [],
      cameraUsage: [],
      sensorUsage: []
    };

    // Crear array de fechas para los últimos 3 meses
    const dates = [];
    for (let d = new Date(threeMonthsAgo); d <= now; d.setDate(d.getDate() + 1)) {
      dates.push(new Date(d));
    }

    // Procesar cada fecha
    for (const date of dates) {
      const logFile = path.join(LOGS_DIR, `activity_${date.getFullYear()}_${date.getMonth() + 1}.json`);
      const dateStr = date.toISOString().split('T')[0];

      if (fs.existsSync(logFile)) {
        try {
          const logs = JSON.parse(fs.readFileSync(logFile, 'utf8'));
          const dayLogs = logs.filter((log: any) => {
            const logDate = new Date(log.timestamp);
            return log.userId === userId && 
                   logDate.toDateString() === date.toDateString();
          });

          // Calcular horas de uso para cada tipo
          const systemHours = dayLogs.length > 0 ? Math.min(24, dayLogs.length) : 0;
          const cameraHours = dayLogs.filter((log: any) =>
            log.activityType.includes('camera')
          ).length;
          const sensorHours = dayLogs.filter((log: any) =>
            log.activityType.includes('sensor')
          ).length;

          stats.systemUsage.push({ date: dateStr, hours: systemHours });
          stats.cameraUsage.push({ date: dateStr, hours: cameraHours });
          stats.sensorUsage.push({ date: dateStr, hours: sensorHours });
        } catch (error) {
          logger.error(`Error processing log file ${logFile}:`, error);
          // En caso de error, agregar 0 horas para este día
          stats.systemUsage.push({ date: dateStr, hours: 0 });
          stats.cameraUsage.push({ date: dateStr, hours: 0 });
          stats.sensorUsage.push({ date: dateStr, hours: 0 });
        }
      } else {
        // Si no hay archivo de log para esta fecha, agregar 0 horas
        stats.systemUsage.push({ date: dateStr, hours: 0 });
        stats.cameraUsage.push({ date: dateStr, hours: 0 });
        stats.sensorUsage.push({ date: dateStr, hours: 0 });
      }
    }

    return stats;
  }

  async getDiskUsage(userId: number): Promise<{
    used: number;
    available: number;
  }> {
    try {
      const userDir = getUserDataDir(userId);
      let totalSize = 0;

      // Calcular tamaño de todos los archivos del usuario
      const calculateDirSize = (dir: string): number => {
        let size = 0;
        const files = fs.readdirSync(dir);

        for (const file of files) {
          const filePath = path.join(dir, file);
          const stats = fs.statSync(filePath);

          if (stats.isDirectory()) {
            size += calculateDirSize(filePath);
          } else {
            size += stats.size;
          }
        }

        return size;
      };

      // Calcular tamaño de directorio de usuario y grabaciones
      totalSize = calculateDirSize(userDir);
      const recordingsDir = path.join(RECORDINGS_DIR, `user_${userId}`);
      if (fs.existsSync(recordingsDir)) {
        totalSize += calculateDirSize(recordingsDir);
      }

      const usedGB = totalSize / (1024 * 1024 * 1024); // Convertir a GB
      const totalGB = 100; // Límite de 100GB por usuario

      logger.info(`Disk usage for user ${userId}: ${usedGB.toFixed(2)}GB used of ${totalGB}GB`);

      return {
        used: Number(usedGB.toFixed(2)),
        available: Number((totalGB - usedGB).toFixed(2))
      };
    } catch (error) {
      logger.error(`Error calculating disk usage for user ${userId}:`, error);
      return {
        used: 0,
        available: 100
      };
    }
  }

  // ======================================
  // Implementación de métodos para RGPD
  // ======================================

  // --- Métodos para consentimientos ---
  
  async getConsents(): Promise<Consent[]> {
    return Array.from(this.consents.values());
  }

  async getConsent(id: number): Promise<Consent | undefined> {
    return this.consents.get(id);
  }

  async createConsent(consent: InsertConsent): Promise<Consent> {
    const id = this.currentConsentId++;
    const now = new Date();
    const newConsent: Consent = {
      ...consent,
      id,
      createdAt: now,
      updatedAt: now,
      isActive: true
    };
    this.consents.set(id, newConsent);
    
    // Guarda los consentimientos en un archivo específico
    const consentsDir = path.join(DATA_DIR, 'gdpr');
    if (!fs.existsSync(consentsDir)) {
      fs.mkdirSync(consentsDir, { recursive: true });
    }
    saveToJSON(path.join(consentsDir, 'consents.json'), Object.fromEntries(this.consents));
    
    logger.info(`Consent created: ${newConsent.title}`);
    return newConsent;
  }

  async updateConsent(id: number, update: Partial<Consent>): Promise<Consent> {
    const consent = this.consents.get(id);
    if (!consent) {
      throw new Error("Consent not found");
    }
    
    const now = new Date();
    const updatedConsent: Consent = {
      ...consent,
      ...update,
      updatedAt: now
    };
    
    this.consents.set(id, updatedConsent);
    
    // Guarda los consentimientos actualizados
    const consentsDir = path.join(DATA_DIR, 'gdpr');
    saveToJSON(path.join(consentsDir, 'consents.json'), Object.fromEntries(this.consents));
    
    logger.info(`Consent updated: ${updatedConsent.title}`);
    return updatedConsent;
  }

  async deleteConsent(id: number): Promise<boolean> {
    // En RGPD, mejor desactivar que eliminar
    const consent = this.consents.get(id);
    if (!consent) {
      return false;
    }
    
    const updatedConsent: Consent = {
      ...consent,
      isActive: false,
      updatedAt: new Date()
    };
    
    this.consents.set(id, updatedConsent);
    
    // Guarda los consentimientos actualizados
    const consentsDir = path.join(DATA_DIR, 'gdpr');
    saveToJSON(path.join(consentsDir, 'consents.json'), Object.fromEntries(this.consents));
    
    logger.info(`Consent deactivated: ${updatedConsent.title}`);
    return true;
  }

  // --- Métodos para consentimientos de usuario ---
  
  async getUserConsents(userId: number): Promise<UserConsent[]> {
    return Array.from(this.userConsents.values()).filter(
      userConsent => userConsent.userId === userId
    );
  }

  async getUserConsentById(id: number): Promise<UserConsent | undefined> {
    return this.userConsents.get(id);
  }

  async getUserConsentByUserAndConsentId(userId: number, consentId: number): Promise<UserConsent | undefined> {
    return Array.from(this.userConsents.values()).find(
      userConsent => userConsent.userId === userId && userConsent.consentId === consentId
    );
  }

  async createUserConsent(userConsent: InsertUserConsent): Promise<UserConsent> {
    const id = this.currentUserConsentId++;
    const now = new Date();
    const newUserConsent: UserConsent = {
      ...userConsent,
      id,
      timestamp: now,
      withdrawnAt: null
    };
    
    this.userConsents.set(id, newUserConsent);
    
    // Guardar los consentimientos de usuario
    const consentsDir = path.join(DATA_DIR, 'gdpr');
    saveToJSON(path.join(consentsDir, 'user_consents.json'), Object.fromEntries(this.userConsents));
    
    // Registrar la actividad
    const user = await this.getUser(userConsent.userId);
    if (user) {
      const consent = await this.getConsent(userConsent.consentId);
      logActivity(userConsent.userId, "consentProvided", {
        consentId: userConsent.consentId,
        consentTitle: consent?.title,
        accepted: userConsent.accepted
      });
    }
    
    logger.info(`User consent created for user ${userConsent.userId}, consent ${userConsent.consentId}, accepted: ${userConsent.accepted}`);
    return newUserConsent;
  }

  async updateUserConsent(id: number, update: Partial<UserConsent>): Promise<UserConsent> {
    const userConsent = this.userConsents.get(id);
    if (!userConsent) {
      throw new Error("User consent not found");
    }
    
    const updatedUserConsent: UserConsent = {
      ...userConsent,
      ...update
    };
    
    this.userConsents.set(id, updatedUserConsent);
    
    // Guardar los consentimientos de usuario
    const consentsDir = path.join(DATA_DIR, 'gdpr');
    saveToJSON(path.join(consentsDir, 'user_consents.json'), Object.fromEntries(this.userConsents));
    
    // Registrar la actividad
    logActivity(updatedUserConsent.userId, "consentUpdated", {
      consentId: updatedUserConsent.consentId,
      accepted: updatedUserConsent.accepted
    });
    
    logger.info(`User consent updated for user ${updatedUserConsent.userId}, consent ${updatedUserConsent.consentId}, accepted: ${updatedUserConsent.accepted}`);
    return updatedUserConsent;
  }

  async withdrawUserConsent(id: number): Promise<UserConsent> {
    const userConsent = this.userConsents.get(id);
    if (!userConsent) {
      throw new Error("User consent not found");
    }
    
    const updatedUserConsent: UserConsent = {
      ...userConsent,
      withdrawnAt: new Date()
    };
    
    this.userConsents.set(id, updatedUserConsent);
    
    // Guardar los consentimientos de usuario
    const consentsDir = path.join(DATA_DIR, 'gdpr');
    saveToJSON(path.join(consentsDir, 'user_consents.json'), Object.fromEntries(this.userConsents));
    
    // Registrar la actividad
    logActivity(updatedUserConsent.userId, "consentWithdrawn", {
      consentId: updatedUserConsent.consentId
    });
    
    logger.info(`User consent withdrawn for user ${updatedUserConsent.userId}, consent ${updatedUserConsent.consentId}`);
    return updatedUserConsent;
  }

  // --- Métodos para auditoría de acceso ---
  
  async logAccess(accessLog: InsertAccessLog): Promise<AccessLog> {
    const id = this.currentAccessLogId++;
    const now = new Date();
    const newAccessLog: AccessLog = {
      ...accessLog,
      id,
      timestamp: now,
      success: accessLog.success ?? true
    };
    
    this.accessLogs.set(id, newAccessLog);
    
    // Guardar los logs de acceso
    const consentsDir = path.join(DATA_DIR, 'gdpr');
    const logsFile = path.join(consentsDir, `access_logs_${now.getFullYear()}_${now.getMonth() + 1}.json`);
    
    // Cargar logs existentes o crear un array vacío
    let logs: AccessLog[] = [];
    if (fs.existsSync(logsFile)) {
      try {
        logs = JSON.parse(fs.readFileSync(logsFile, 'utf8'));
      } catch (error) {
        logger.error(`Error reading access logs file ${logsFile}:`, error);
      }
    }
    
    // Añadir el nuevo log y guardar
    logs.push(newAccessLog);
    
    if (!fs.existsSync(consentsDir)) {
      fs.mkdirSync(consentsDir, { recursive: true });
    }
    
    try {
      fs.writeFileSync(logsFile, JSON.stringify(logs, null, 2));
      logger.info(`Access logged: ${newAccessLog.action} on ${newAccessLog.resourceType}:${newAccessLog.resourceId}`);
    } catch (error) {
      logger.error(`Error writing to access logs file ${logsFile}:`, error);
    }
    
    return newAccessLog;
  }
  
  // Alias de logAccess para mantener compatibilidad
  async createAccessLog(accessLog: InsertAccessLog): Promise<AccessLog> {
    return this.logAccess(accessLog);
  }

  async getAccessLogs(params?: {
    userId?: number;
    resourceType?: string;
    resourceId?: string;
    fromDate?: Date;
    toDate?: Date;
    limit?: number;
    offset?: number;
  }): Promise<AccessLog[]> {
    // Obtener todos los logs de acceso
    let logs = Array.from(this.accessLogs.values());
    
    // Aplicar filtros si existen
    if (params) {
      if (params.userId !== undefined) {
        logs = logs.filter(log => log.userId === params.userId);
      }
      
      if (params.resourceType) {
        logs = logs.filter(log => log.resourceType === params.resourceType);
      }
      
      if (params.resourceId) {
        logs = logs.filter(log => log.resourceId === params.resourceId);
      }
      
      if (params.fromDate) {
        logs = logs.filter(log => new Date(log.timestamp) >= params.fromDate!);
      }
      
      if (params.toDate) {
        logs = logs.filter(log => new Date(log.timestamp) <= params.toDate!);
      }
      
      // Ordenar por fecha descendente
      logs = logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      
      // Aplicar paginación
      if (params.offset && params.limit) {
        logs = logs.slice(params.offset, params.offset + params.limit);
      } else if (params.limit) {
        logs = logs.slice(0, params.limit);
      }
    }
    
    return logs;
  }

  // --- Métodos de gestión de sesiones para integración con InfluxDB ---
  
  async getSessions(userId: number): Promise<Session[]> {
    return Array.from(this.sessions.values())
      .filter(session => session.userId === userId)
      .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
  }

  async getSessionById(id: number): Promise<Session | undefined> {
    return this.sessions.get(id);
  }

  async createSession(session: InsertSession & { userId: number }): Promise<Session> {
    // Verificar si ya existe una sesión con el mismo nombre para este usuario
    const existingSessions = Array.from(this.sessions.values())
      .filter(s => s.userId === session.userId && s.name === session.name);
    
    if (existingSessions.length > 0) {
      throw new Error(`Ya existe una sesión con el nombre "${session.name}". Por favor utilice un nombre único.`);
    }
    
    const id = this.currentSessionId++;
    
    // Convertir campos undefined a null para compatibilidad con el tipo Session
    const newSession: Session = {
      id,
      userId: session.userId,
      name: session.name,
      description: undefinedToNull(session.description),
      startTime: session.startTime || new Date(),
      endTime: undefinedToNull(session.endTime),
      status: session.status || 'active',
      notes: undefinedToNull(session.notes),
      tags: undefinedToNull(session.tags) || [],
      metadata: session.metadata || {},
      influxDb: session.influxDb || {
        bucket: `session_${id}`,
        org: 'lisa',
        retention: 90 // 90 días de retención por defecto
      }
    };

    this.sessions.set(id, newSession);
    this.saveState();
    logActivity(session.userId, "sessionCreated", {session: newSession});
    return newSession;
  }

  async updateSession(id: number, update: Partial<Session>): Promise<Session> {
    const session = this.sessions.get(id);
    if (!session) {
      throw new Error("Session not found");
    }
    
    // Verificar si se está actualizando el nombre
    if (update.name && update.name !== session.name) {
      // Verificar si ya existe otra sesión con el mismo nombre para este usuario
      const existingSessions = Array.from(this.sessions.values())
        .filter(s => s.userId === session.userId && s.name === update.name && s.id !== id);
        
      if (existingSessions.length > 0) {
        throw new Error(`Ya existe una sesión con el nombre "${update.name}". Por favor utilice un nombre único.`);
      }
    }

    const updatedSession = { ...session, ...update };
    this.sessions.set(id, updatedSession);
    this.saveState();
    logActivity(session.userId, "sessionUpdated", {session: updatedSession});
    return updatedSession;
  }

  async deleteSession(id: number): Promise<void> {
    const session = this.sessions.get(id);
    if (!session) {
      throw new Error("Session not found");
    }

    // Eliminar la asociación de grabaciones con esta sesión
    const relatedRecordings = Array.from(this.recordings.values())
      .filter(recording => recording.sessionId === id);
    
    for (const recording of relatedRecordings) {
      await this.updateRecording(recording.id, { sessionId: null });
    }

    this.sessions.delete(id);
    this.saveState();
    logActivity(session.userId, "sessionDeleted", {sessionId: id});
  }

  async getSessionRecordings(sessionId: number): Promise<Recording[]> {
    return Array.from(this.recordings.values())
      .filter(recording => recording.sessionId === sessionId)
      .map(recording => ({
        ...recording,
        startTime: new Date(recording.startTime),
        endTime: recording.endTime ? new Date(recording.endTime) : null
      }))
      .sort((a, b) => b.startTime.getTime() - a.startTime.getTime());
  }
  
  // Alias para getSessionRecordings para mantener compatibilidad con el código existente
  async getRecordingsBySessionId(sessionId: number): Promise<Recording[]> {
    logger.info(`Obteniendo grabaciones para la sesión ${sessionId} usando getRecordingsBySessionId`);
    return this.getSessionRecordings(sessionId);
  }

  // --- Métodos para exportación y eliminación de datos ---
  
  async exportUserData(userId: number): Promise<any> {
    const user = await this.getUser(userId);
    if (!user) {
      throw new Error("User not found");
    }
    
    // Registrar la actividad de exportación
    await this.logAccess({
      userId,
      action: "export",
      resourceType: "user_data",
      resourceId: userId.toString(),
      ipAddress: null,
      userAgent: null,
      success: true,
      details: { exportTime: new Date().toISOString() }
    });
    
    // Recopilar todos los datos del usuario
    const userData = {
      profile: user,
      cameras: await this.getCameras(userId),
      sensors: await this.getSensors(userId),
      sessions: await this.getSessions(userId),
      consents: await this.getUserConsents(userId)
    };
    
    // Guardar los datos exportados
    const exportDir = path.join(DATA_DIR, 'gdpr', 'exports');
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }
    
    const filename = `user_${userId}_export_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    saveToJSON(path.join(exportDir, filename), userData);
    
    logger.info(`User data exported for user ${userId}`);
    return userData;
  }

  async deleteUserData(userId: number, options?: { softDelete?: boolean }): Promise<void> {
    const user = await this.getUser(userId);
    if (!user) {
      throw new Error("User not found");
    }
    
    const softDelete = options?.softDelete ?? true;
    
    // Registrar la actividad de eliminación
    await this.logAccess({
      userId,
      action: "delete",
      resourceType: "user_data",
      resourceId: userId.toString(),
      ipAddress: null,
      userAgent: null,
      success: true,
      details: { 
        deleteTime: new Date().toISOString(),
        softDelete
      }
    });
    
    if (softDelete) {
      // En softDelete, anonimizamos los datos pero no los eliminamos
      const anonymizedUser: User = {
        ...user,
        username: `anonymous_${userId}`,
        password: "deleted",
        fullName: null,
        email: null,
        lastLogin: null
      };
      
      this.users.set(userId, anonymizedUser);
      
      // Anonimizar también los consentimientos
      const userConsents = await this.getUserConsents(userId);
      for (const consent of userConsents) {
        await this.withdrawUserConsent(consent.id);
      }
      
    } else {
      // Hard delete: eliminar todos los datos del usuario
      this.users.delete(userId);
      
      // Eliminar cámaras asociadas
      const cameras = await this.getCameras(userId);
      for (const camera of cameras) {
        await this.deleteCamera(camera.id);
      }
      
      // Eliminar sensores asociados
      const sensors = await this.getSensors(userId);
      for (const sensor of sensors) {
        await this.deleteSensor(sensor.id);
      }
      
      // Eliminar sesiones asociadas
      const sessions = await this.getSessions(userId);
      for (const session of sessions) {
        await this.deleteSession(session.id);
      }
      
      // Eliminar consentimientos
      const userConsents = await this.getUserConsents(userId);
      for (const consent of userConsents) {
        this.userConsents.delete(consent.id);
      }
    }
    
    // Guardar cambios
    this.saveState();
    
    logger.info(`User data ${softDelete ? 'anonymized' : 'deleted'} for user ${userId}`);
  }
}

export const storage = new MemStorage();