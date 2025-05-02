import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User schema (keeping the original)
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Sensor schema
export const sensors = pgTable("sensors", {
  id: serial("id").primaryKey(),
  sensorId: text("sensor_id").notNull().unique(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  status: text("status").notNull().default("offline"),
  batteryLevel: integer("battery_level").notNull().default(100),
  lastActivity: timestamp("last_activity").notNull().default(new Date()),
});

export const insertSensorSchema = createInsertSchema(sensors).omit({
  id: true,
});

export type InsertSensor = z.infer<typeof insertSensorSchema>;
export type Sensor = typeof sensors.$inferSelect;

// Session schema
export const sessions = pgTable("sessions", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull().unique(),
  name: text("name").notNull(),
  startDate: timestamp("start_date").notNull().default(new Date()),
  endDate: timestamp("end_date"),
  status: text("status").notNull().default("in_progress"),
  sensorIds: text("sensor_ids").array().notNull(),
});

export const insertSessionSchema = createInsertSchema(sessions).omit({
  id: true,
  endDate: true,
});

export type InsertSession = z.infer<typeof insertSessionSchema>;
export type Session = typeof sessions.$inferSelect;

// File schema
export const files = pgTable("files", {
  id: serial("id").primaryKey(),
  fileName: text("file_name").notNull(),
  filePath: text("file_path").notNull(),
  fileType: text("file_type").notNull(),
  fileSize: integer("file_size").notNull(),
  sensorId: text("sensor_id").notNull(),
  sessionId: text("session_id").notNull(),
  createdAt: timestamp("created_at").notNull().default(new Date()),
});

export const insertFileSchema = createInsertSchema(files).omit({
  id: true,
});

export type InsertFile = z.infer<typeof insertFileSchema>;
export type File = typeof files.$inferSelect;

// SessionFile schema for storing session file relationships
export const sessionFiles = pgTable("session_files", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  fileId: integer("file_id").notNull(),
});

export const insertSessionFileSchema = createInsertSchema(sessionFiles).omit({
  id: true,
});

export type InsertSessionFile = z.infer<typeof insertSessionFileSchema>;
export type SessionFile = typeof sessionFiles.$inferSelect;
