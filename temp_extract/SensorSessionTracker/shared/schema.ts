import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Define available roles
export const UserRole = {
  ADMIN: 'admin',
  OPERATOR: 'operator',
  VIEWER: 'viewer'
} as const;

export type UserRole = typeof UserRole[keyof typeof UserRole];

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default(UserRole.VIEWER),
  fullName: text("full_name"),
  email: text("email"),
  lastLogin: timestamp("last_login"),
  preferences: jsonb("preferences").default({}),
});

// Definir el tipo de métricas
export type CameraMetrics = {
  fps: number;
  bitrate: number;
  resolution: string;
  uptime: number;
  connectionErrors: number;
  lastErrorTime: string | null;
  lastErrorMessage: string | null;
};

export const cameras = pgTable("cameras", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  ipAddress: text("ip_address").notNull(),
  username: text("username").notNull().default("admin"),
  password: text("password").notNull().default("admin123"),
  streamPath: text("stream_path").notNull().default("h264Preview_01_main"),
  port: text("port").notNull().default("554"),
  isRecording: boolean("is_recording").notNull().default(false),
  userId: integer("user_id").notNull(),
  recordingPrefix: text("recording_prefix"),
  lastSeen: timestamp("last_seen"),
  status: text("status").default("disconnected"), // connected, disconnected, error
  metrics: jsonb("metrics").default({
    fps: 0,
    bitrate: 0,
    resolution: "",
    uptime: 0,
    connectionErrors: 0,
    lastErrorTime: null,
    lastErrorMessage: null
  }) as unknown as CameraMetrics,
});

// Tipo para el análisis de IA
export type VideoAnalysis = {
  description: string;
  tags: string[];
  keyEvents: string[];
  timestamp: Date;
};

export const recordings = pgTable("recordings", {
  id: serial("id").primaryKey(),
  cameraId: integer("camera_id").notNull(),
  filePath: text("file_path").notNull(),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time"),
  status: text("status").notNull().default("recording"), // recording, completed, error
  title: text("title"),
  description: text("description"),
  tags: text("tags").array(),
  aiAnalysis: jsonb("ai_analysis").$type<VideoAnalysis>(), // Campo para el análisis de IA
  sensorDataPath: text("sensor_data_path"), // Nueva ruta al archivo de datos de sensores
  sessionId: integer("session_id"), // Referencia a la sesión (puede ser nulo)
  thumbnailUrl: text("thumbnail_url"), // URL relativa a la miniatura del video
});

// Definición de la tabla de sesiones
export const sessions = pgTable("sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time"),
  status: text("status").notNull().default("active"), // active, completed, error
  notes: text("notes"),
  tags: text("tags").array(),
  metadata: jsonb("metadata"), // Metadatos adicionales de la sesión
  influxDb: jsonb("influx_db").$type<{
    bucket: string;
    org: string;
    retention: number;
  }>(), // Configuración específica para InfluxDB
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  role: true,
  fullName: true,
  email: true,
});

export const insertCameraSchema = createInsertSchema(cameras).pick({
  name: true,
  ipAddress: true,
  username: true,
  password: true,
  streamPath: true,
  port: true,
  recordingPrefix: true,
});

export const insertRecordingSchema = createInsertSchema(recordings).pick({
  cameraId: true,
  filePath: true,
  startTime: true,
  title: true,
  description: true,
  tags: true,
  sensorDataPath: true, // Añadir campo para datos de sensores
  sessionId: true, // ID de la sesión (opcional)
  thumbnailUrl: true, // URL de la miniatura del video
}).extend({
  tags: z.array(z.string()).optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  sensorDataPath: z.string().optional(), // Campo opcional
  sessionId: z.number().optional(), // ID de sesión opcional
  thumbnailUrl: z.string().optional(), // URL opcional de la miniatura
});

// Esquema para insertar sesiones
export const insertSessionSchema = createInsertSchema(sessions).pick({
  userId: true,
  name: true,
  description: true,
  startTime: true,
  endTime: true,
  status: true,
  notes: true,
  tags: true,
  metadata: true,
  influxDb: true,
}).extend({
  description: z.string().optional(),
  endTime: z.date().optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
  metadata: z.any().optional(),
  influxDb: z.object({
    bucket: z.string(),
    org: z.string(),
    retention: z.number()
  }).optional(),
});

// Definir tipos para sensores
export type SensorMetrics = {
  battery: number;
  linkQuality: number;
  lastUpdate: string;
  status: 'online' | 'offline' | 'error';
};

export type SensorConfig = {
  topic: string;
  deviceId: string;
  model: string;
  manufacturer: string;
};

export const sensors = pgTable("sensors", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(), // temperature, humidity, motion, etc.
  location: text("location"),
  userId: integer("user_id").notNull(),
  isEnabled: boolean("is_enabled").notNull().default(true),
  lastSeen: timestamp("last_seen"),
  config: jsonb("config").$type<SensorConfig>().notNull(),
  metrics: jsonb("metrics").$type<SensorMetrics>().default({
    battery: 100,
    linkQuality: 0,
    lastUpdate: new Date().toISOString(),
    status: 'offline'
  }),
});

export const sensorEvents = pgTable("sensor_events", {
  id: serial("id").primaryKey(),
  sensorId: integer("sensor_id").notNull(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  eventType: text("event_type").notNull(), // reading, alert, status_change
  data: jsonb("data").notNull(),
});

// Definición de tablas para cumplimiento RGPD

// Tabla para almacenar los consentimientos
export const consents = pgTable("consents", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(), // Título descriptivo del consentimiento
  description: text("description").notNull(), // Descripción detallada 
  version: text("version").notNull(), // Versión del documento de consentimiento
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  isActive: boolean("is_active").notNull().default(true), // Si este consentimiento está activo
  legalBasis: text("legal_basis").notNull(), // Base legal: consentimiento, interés legítimo, etc.
  dataRetentionPeriod: integer("data_retention_period"), // Período de retención en días
  purpose: text("purpose").notNull(), // Propósito del procesamiento de datos
  dataCategories: text("data_categories").array(), // Categorías de datos afectados
  documentUrl: text("document_url"), // URL opcional al documento completo
});

// Tabla para almacenar el estado de consentimiento de cada usuario
export const userConsents = pgTable("user_consents", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  consentId: integer("consent_id").notNull(),
  accepted: boolean("accepted").notNull(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  ipAddress: text("ip_address"), // Dirección IP desde donde se dio el consentimiento
  userAgent: text("user_agent"), // User agent del navegador
  expiresAt: timestamp("expires_at"), // Fecha de expiración del consentimiento
  additionalData: jsonb("additional_data"), // Datos adicionales específicos
  withdrawnAt: timestamp("withdrawn_at"), // Marca de tiempo si el consentimiento fue retirado
});

// Tabla para registrar todas las operaciones de auditoría RGPD
export const accessLogs = pgTable("access_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  action: text("action").notNull(), // view, create, update, delete, export, etc.
  resourceType: text("resource_type").notNull(), // camera, sensor, recording, user, etc.
  resourceId: text("resource_id").notNull(), // ID del recurso accedido
  ipAddress: text("ip_address"), // Dirección IP desde donde se realizó la acción
  userAgent: text("user_agent"), // User agent del navegador
  success: boolean("success").notNull().default(true), // Si la acción fue exitosa
  details: jsonb("details"), // Detalles adicionales sobre la acción
});

export const insertSensorSchema = createInsertSchema(sensors).pick({
  name: true,
  type: true,
  location: true,
  userId: true,
  config: true,
}).extend({
  config: z.object({
    topic: z.string(),
    deviceId: z.string(),
    model: z.string(),
    manufacturer: z.string(),
  })
});

export const insertSensorEventSchema = createInsertSchema(sensorEvents).pick({
  sensorId: true,
  eventType: true,
  data: true,
});

// Esquemas de inserción para las nuevas tablas RGPD
export const insertConsentSchema = createInsertSchema(consents).pick({
  title: true,
  description: true,
  version: true,
  legalBasis: true,
  dataRetentionPeriod: true,
  purpose: true,
  dataCategories: true,
  documentUrl: true,
}).extend({
  dataCategories: z.array(z.string()).optional(),
  dataRetentionPeriod: z.number().optional(),
  documentUrl: z.string().optional(),
});

export const insertUserConsentSchema = createInsertSchema(userConsents).pick({
  userId: true,
  consentId: true,
  accepted: true,
  ipAddress: true,
  userAgent: true, 
  expiresAt: true,
  additionalData: true,
}).extend({
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
  expiresAt: z.date().optional(),
  additionalData: z.any().optional(),
});

export const insertAccessLogSchema = createInsertSchema(accessLogs).pick({
  userId: true,
  action: true,
  resourceType: true,
  resourceId: true,
  ipAddress: true,
  userAgent: true,
  success: true,
  details: true,
}).extend({
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
  details: z.any().optional(),
});

// Types for the new schemas
export type InsertSensor = z.infer<typeof insertSensorSchema>;
export type Sensor = typeof sensors.$inferSelect;
export type SensorEvent = typeof sensorEvents.$inferSelect;
export type InsertSensorEvent = z.infer<typeof insertSensorEventSchema>;

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertCamera = z.infer<typeof insertCameraSchema>;
export type Camera = typeof cameras.$inferSelect;
export type Recording = typeof recordings.$inferSelect;
export type InsertRecording = z.infer<typeof insertRecordingSchema>;
export type Session = typeof sessions.$inferSelect;
export type InsertSession = z.infer<typeof insertSessionSchema>;

// Types para RGPD
export type Consent = typeof consents.$inferSelect;
export type InsertConsent = z.infer<typeof insertConsentSchema>;
export type UserConsent = typeof userConsents.$inferSelect; 
export type InsertUserConsent = z.infer<typeof insertUserConsentSchema>;
export type AccessLog = typeof accessLogs.$inferSelect;
export type InsertAccessLog = z.infer<typeof insertAccessLogSchema>;

export function buildRtspUrl(camera: Camera): string {
  const streamPath = camera.streamPath || 'h264Preview_01_main';
  return `rtsp://${camera.username}:${camera.password}@${camera.ipAddress}:${camera.port}/${streamPath}`;
}