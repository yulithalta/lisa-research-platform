import { users, type User, type InsertUser, 
  sensors, type Sensor, type InsertSensor,
  sessions, type Session, type InsertSession,
  files, type File, type InsertFile } from "@shared/schema";

// Storage interface
export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Sensor operations
  getSensor(id: number): Promise<Sensor | undefined>;
  getSensorById(sensorId: string): Promise<Sensor | undefined>;
  createSensor(sensor: InsertSensor): Promise<Sensor>;
  getAllSensors(): Promise<Sensor[]>;
  
  // Session operations
  getSession(id: number): Promise<Session | undefined>;
  getSessionById(sessionId: string): Promise<Session | undefined>;
  createSession(session: InsertSession): Promise<Session>;
  getAllSessions(): Promise<any[]>; // Returns sessions with additional data
  deleteSession(sessionId: string): Promise<void>;
  
  // File operations
  getFile(id: number): Promise<File | undefined>;
  getFileByName(fileName: string): Promise<File | undefined>;
  createFile(file: InsertFile): Promise<File>;
  getSessionFiles(sessionId: string): Promise<File[]>;
  
  // Stats
  getStats(): Promise<any>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private sensors: Map<number, Sensor>;
  private sessions: Map<number, Session>;
  private files: Map<number, File>;
  private userIdCounter: number;
  private sensorIdCounter: number;
  private sessionIdCounter: number;
  private fileIdCounter: number;

  constructor() {
    this.users = new Map();
    this.sensors = new Map();
    this.sessions = new Map();
    this.files = new Map();
    this.userIdCounter = 1;
    this.sensorIdCounter = 1;
    this.sessionIdCounter = 1;
    this.fileIdCounter = 1;
    
    // Initialize with some sample data
    this.initSampleData();
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }
  
  // Sensor operations
  async getSensor(id: number): Promise<Sensor | undefined> {
    return this.sensors.get(id);
  }
  
  async getSensorById(sensorId: string): Promise<Sensor | undefined> {
    return Array.from(this.sensors.values()).find(
      (sensor) => sensor.sensorId === sensorId,
    );
  }
  
  async createSensor(sensor: InsertSensor): Promise<Sensor> {
    const id = this.sensorIdCounter++;
    const newSensor: Sensor = { 
      ...sensor, 
      id,
      status: sensor.status || 'offline',
      batteryLevel: sensor.batteryLevel || 100,
      lastActivity: sensor.lastActivity || new Date() 
    };
    this.sensors.set(id, newSensor);
    return newSensor;
  }
  
  async getAllSensors(): Promise<Sensor[]> {
    return Array.from(this.sensors.values());
  }
  
  // Session operations
  async getSession(id: number): Promise<Session | undefined> {
    return this.sessions.get(id);
  }
  
  async getSessionById(sessionId: string): Promise<Session | undefined> {
    return Array.from(this.sessions.values()).find(
      (session) => session.sessionId === sessionId,
    );
  }
  
  async createSession(session: InsertSession): Promise<Session> {
    const id = this.sessionIdCounter++;
    const newSession: Session = { 
      ...session, 
      id,
      status: session.status || 'in_progress',
      startDate: session.startDate || new Date(),
      endDate: null
    };
    this.sessions.set(id, newSession);
    return newSession;
  }
  
  async getAllSessions(): Promise<any[]> {
    // Get all sessions and add file count to each
    const sessionsArray = Array.from(this.sessions.values());
    const result = [];
    
    for (const session of sessionsArray) {
      const sessionFiles = await this.getSessionFiles(session.sessionId);
      result.push({
        ...session,
        fileCount: sessionFiles.length
      });
    }
    
    return result;
  }
  
  async deleteSession(sessionId: string): Promise<void> {
    const session = await this.getSessionById(sessionId);
    if (!session) return;
    
    this.sessions.delete(session.id);
    
    // Also delete all files for this session
    const filesToDelete = Array.from(this.files.values())
      .filter(file => file.sessionId === sessionId);
    
    for (const file of filesToDelete) {
      this.files.delete(file.id);
    }
  }
  
  // File operations
  async getFile(id: number): Promise<File | undefined> {
    return this.files.get(id);
  }
  
  async getFileByName(fileName: string): Promise<File | undefined> {
    return Array.from(this.files.values()).find(
      (file) => file.fileName === fileName,
    );
  }
  
  async createFile(file: InsertFile): Promise<File> {
    const id = this.fileIdCounter++;
    const newFile: File = { 
      ...file, 
      id,
      createdAt: file.createdAt || new Date()
    };
    this.files.set(id, newFile);
    return newFile;
  }
  
  async getSessionFiles(sessionId: string): Promise<File[]> {
    return Array.from(this.files.values())
      .filter(file => file.sessionId === sessionId);
  }
  
  // Stats
  async getStats(): Promise<any> {
    const activeSessions = Array.from(this.sessions.values())
      .filter(session => session.status === 'in_progress' || session.status === 'processing').length;
    
    const connectedSensors = Array.from(this.sensors.values())
      .filter(sensor => sensor.status === 'connected').length;
    
    const recordings = Array.from(this.files.values())
      .filter(file => file.fileType.toLowerCase() === 'video').length;
    
    // Calculate total storage size
    let totalSize = 0;
    for (const file of this.files.values()) {
      totalSize += file.fileSize;
    }
    
    // Format storage size
    let storage = '';
    if (totalSize < 1024) {
      storage = `${totalSize} KB`;
    } else if (totalSize < 1024 * 1024) {
      storage = `${(totalSize / 1024).toFixed(1)} MB`;
    } else {
      storage = `${(totalSize / (1024 * 1024)).toFixed(1)} GB`;
    }
    
    return {
      activeSessions,
      connectedSensors,
      recordings,
      storage
    };
  }
  
  // Initialize with sample data
  private initSampleData() {
    // Create sample sensors
    const sampleSensors: InsertSensor[] = [
      {
        sensorId: 'MOV-123',
        name: 'Sensor de Movimiento',
        type: 'movement',
        status: 'connected',
        batteryLevel: 87,
        lastActivity: new Date(Date.now() - 5 * 60 * 1000) // 5 min ago
      },
      {
        sensorId: 'TEMP-456',
        name: 'Sensor de Temperatura',
        type: 'temperature',
        status: 'connected',
        batteryLevel: 92,
        lastActivity: new Date(Date.now() - 2 * 60 * 1000) // 2 min ago
      },
      {
        sensorId: 'PROX-789',
        name: 'Sensor de Proximidad',
        type: 'proximity',
        status: 'connected',
        batteryLevel: 75,
        lastActivity: new Date(Date.now() - 8 * 60 * 1000) // 8 min ago
      },
      {
        sensorId: 'PRES-101',
        name: 'Sensor de Presión',
        type: 'pressure',
        status: 'connected',
        batteryLevel: 82,
        lastActivity: new Date(Date.now() - 12 * 60 * 1000) // 12 min ago
      },
      {
        sensorId: 'HUM-789',
        name: 'Sensor de Humedad',
        type: 'humidity',
        status: 'low_battery',
        batteryLevel: 15,
        lastActivity: new Date(Date.now() - 10 * 60 * 1000) // 10 min ago
      }
    ];
    
    for (const sensor of sampleSensors) {
      this.createSensor(sensor);
    }
    
    // Create sample sessions
    const sampleSessions: InsertSession[] = [
      {
        sessionId: 'SS-001',
        name: 'Sesión Laboratorio A',
        startDate: new Date('2023-07-12T10:30:15'),
        status: 'completed',
        sensorIds: ['MOV-123', 'TEMP-456', 'PROX-789', 'PRES-101']
      },
      {
        sessionId: 'SS-002',
        name: 'Prueba Sensores Movimiento',
        startDate: new Date('2023-07-10T14:20:45'),
        status: 'processing',
        sensorIds: ['MOV-123', 'PROX-789']
      },
      {
        sessionId: 'SS-003',
        name: 'Calibración Sensores Nuevos',
        startDate: new Date('2023-07-05T09:15:30'),
        status: 'completed',
        sensorIds: ['TEMP-456', 'HUM-789', 'PRES-101']
      },
      {
        sessionId: 'SS-004',
        name: 'Monitoreo Continuo',
        startDate: new Date('2023-07-01T08:00:00'),
        status: 'error',
        sensorIds: ['TEMP-456', 'HUM-789', 'PRES-101']
      }
    ];
    
    for (const session of sampleSessions) {
      this.createSession(session);
    }
    
    // Create sample files
    const sampleFiles: InsertFile[] = [
      {
        fileName: 'mov_recording_01.mp4',
        filePath: '/uploads/mov_recording_01.mp4',
        fileType: 'video',
        fileSize: 28500, // KB
        sensorId: 'MOV-123',
        sessionId: 'SS-001',
        createdAt: new Date('2023-07-12T10:35:00')
      },
      {
        fileName: 'temp_data_01.csv',
        filePath: '/uploads/temp_data_01.csv',
        fileType: 'data',
        fileSize: 1200, // KB
        sensorId: 'TEMP-456',
        sessionId: 'SS-001',
        createdAt: new Date('2023-07-12T10:40:00')
      },
      {
        fileName: 'prox_recording_01.mp4',
        filePath: '/uploads/prox_recording_01.mp4',
        fileType: 'video',
        fileSize: 15700, // KB
        sensorId: 'PROX-789',
        sessionId: 'SS-001',
        createdAt: new Date('2023-07-12T10:45:00')
      },
      {
        fileName: 'pres_data_01.csv',
        filePath: '/uploads/pres_data_01.csv',
        fileType: 'data',
        fileSize: 800, // KB
        sensorId: 'PRES-101',
        sessionId: 'SS-001',
        createdAt: new Date('2023-07-12T10:50:00')
      },
      {
        fileName: 'mov_recording_02.mp4',
        filePath: '/uploads/mov_recording_02.mp4',
        fileType: 'video',
        fileSize: 18200, // KB
        sensorId: 'MOV-123',
        sessionId: 'SS-002',
        createdAt: new Date('2023-07-10T14:25:00')
      },
      {
        fileName: 'prox_data_02.csv',
        filePath: '/uploads/prox_data_02.csv',
        fileType: 'data',
        fileSize: 950, // KB
        sensorId: 'PROX-789',
        sessionId: 'SS-002',
        createdAt: new Date('2023-07-10T14:30:00')
      }
    ];
    
    for (const file of sampleFiles) {
      this.createFile(file);
    }
  }
}

export const storage = new MemStorage();
