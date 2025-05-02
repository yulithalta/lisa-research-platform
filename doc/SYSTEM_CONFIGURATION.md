# Gestión de Configuración del Sistema en LISA 3.0.0

## Estado Actual del Sistema

Este documento detalla el estado actual de la gestión de configuración en LISA (Living-lab Integrated Sensing Architecture) 3.0.0, así como las características planificadas para futuras versiones.

## Implementación Actual

### 1. Sistema de Autenticación Básico

LISA 3.0.0 implementa un sistema de autenticación básico basado en sesiones con Express y Passport:

```typescript
// Configuración de autenticación en server/auth.ts
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";

const scryptAsync = promisify(scrypt);

// Funciones para manejo seguro de contraseñas
async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  console.log("[auth] Setting up session configuration");
  
  // Configuración de sesión
  const sessionSettings = {
    secret: process.env.SESSION_SECRET || "default-session-secret",
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      maxAge: 24 * 60 * 60 * 1000, // 24 horas
    }
  };

  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  // Configuración de estrategia local
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      console.log(`[auth] Attempting login for user: ${username}`);
      const user = await storage.getUserByUsername(username);
      
      if (!user || !(await comparePasswords(password, user.password))) {
        return done(null, false);
      } else {
        return done(null, user);
      }
    })
  );

  // Serialización/deserialización de usuario
  passport.serializeUser((user, done) => {
    console.log(`[auth] Serializing user: ${user.username}`);
    done(null, user.id);
  });

  passport.deserializeUser(async (id, done) => {
    console.log(`[auth] Deserializing user ID: ${id}`);
    const user = await storage.getUser(id);
    done(null, user);
  });

  console.log("[auth] Session configuration complete");
}
```

### 2. Rutas de Autenticación

LISA 3.0.0 proporciona las siguientes rutas de autenticación:

```typescript
// Rutas de autenticación en server/routes.ts
app.post("/api/register", async (req, res) => {
  try {
    const { username, password, email } = req.body;
    
    // Verificar si el usuario ya existe
    const existingUser = await storage.getUserByUsername(username);
    if (existingUser) {
      return res.status(400).json({ error: "El nombre de usuario ya está en uso" });
    }
    
    // Crear el usuario con contraseña hasheada
    const hashedPassword = await hashPassword(password);
    const user = await storage.createUser({
      username,
      password: hashedPassword,
      email,
      role: "user", // Rol básico
    });
    
    // Iniciar sesión automáticamente
    req.login(user, (err) => {
      if (err) return res.status(500).json({ error: "Error al iniciar sesión" });
      return res.status(201).json(user);
    });
  } catch (error) {
    console.error("Error de registro:", error);
    res.status(500).json({ error: "Error al registrar usuario" });
  }
});

app.post("/api/login", passport.authenticate("local"), (req, res) => {
  console.log(`[auth] Login successful for user: ${req.user.username}`);
  res.json(req.user);
});

app.post("/api/logout", (req, res) => {
  req.logout((err) => {
    if (err) return res.status(500).json({ error: "Error al cerrar sesión" });
    res.json({ success: true });
  });
});

app.get("/api/user", (req, res) => {
  if (!req.isAuthenticated()) {
    console.log("[auth] Unauthorized access attempt to /api/user");
    return res.status(401).json({ error: "No autorizado" });
  }
  res.json(req.user);
});
```

### 3. Middleware de Autenticación

Un middleware simple para proteger rutas que requieren autenticación:

```typescript
// Middleware en server/middlewares.ts
export function authenticatedOnly(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  console.log(`[auth] Unauthorized access attempt to ${req.path}`);
  res.status(401).json({ error: "No autorizado" });
}

// Uso del middleware
app.get("/api/cameras", authenticatedOnly, async (req, res) => {
  const userId = req.user.id;
  const cameras = await storage.getCameras(userId);
  res.json(cameras);
});
```

### 4. Modelo de Usuario Actual

El modelo de usuario actual es simple y no incluye roles ni permisos avanzados:

```typescript
// Definición de usuario en el almacenamiento
interface User {
  id: number;
  username: string;
  password: string; // Contraseña hasheada
  email: string;
  role: string; // Actualmente solo "admin" o "user"
  createdAt: Date;
  updatedAt: Date;
}
```

### 5. Sistema de Logs Básico

LISA 3.0.0 incluye un sistema básico de logging para acciones importantes:

```typescript
// Logger en server/utils/logger.ts
import fs from "fs";
import path from "path";

export class Logger {
  private logDir: string;
  
  constructor() {
    this.logDir = path.join(process.cwd(), "logs");
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }
  
  public log(level: string, message: string, data?: any): void {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      data
    };
    
    console.log(`[${timestamp}] [${level}] ${message}`);
    
    // Guardar en archivo
    const logFile = path.join(this.logDir, `${new Date().toISOString().split('T')[0]}.log`);
    fs.appendFileSync(logFile, JSON.stringify(logEntry) + "\n");
  }
  
  public info(message: string, data?: any): void {
    this.log("INFO", message, data);
  }
  
  public warn(message: string, data?: any): void {
    this.log("WARN", message, data);
  }
  
  public error(message: string, data?: any): void {
    this.log("ERROR", message, data);
  }
  
  public activity(type: string, data?: any): void {
    this.log("ACTIVITY", type, data);
    console.log(`[${new Date().toISOString()}] [INFO] Activity logged: ${type}`);
  }
}

export const logger = new Logger();
```

### 6. Archivo de Configuración del Sistema

La configuración del sistema se realiza actualmente a través de variables de entorno y un archivo `.env`:

```
# .env
PORT=5000
SESSION_SECRET=my-session-secret
MQTT_BROKER=mqtt://192.168.0.20:1883
MQTT_USERNAME=
MQTT_PASSWORD=
STORAGE_TYPE=memory
```

## Características Planificadas para Futuras Versiones

Las siguientes características están planificadas para implementación en versiones futuras de LISA:

### 1. Control de Acceso Basado en Roles (RBAC)

- **Modelo de Roles y Permisos**: Implementación de un sistema flexible que permitirá definir roles predefinidos (admin, researcher, viewer) y personalizados con permisos granulares.
- **Middleware de Verificación de Permisos**: Middleware avanzado para verificar permisos específicos en cada endpoint de la API.
- **Almacenamiento de Roles y Permisos**: Esquemas de base de datos para almacenar roles, permisos y sus relaciones.

### 2. Seguridad Avanzada

- **Autenticación con JWT**: Migración del sistema de sesiones a JWT para mejorar la escalabilidad y seguridad.
- **Implementación de 2FA**: Autenticación de dos factores para cuentas de administración y acceso a datos sensibles.
- **Control de Estado de Usuario**: Capacidad para activar/desactivar usuarios con administración centralizada.

### 3. Configuración Modular del Sistema

- **Sistema de Configuración Dinámica**: Implementación de un servicio de configuración que permitirá modificar parámetros del sistema en tiempo real.
- **Historial de Cambios**: Registro detallado de todos los cambios de configuración con capacidad de rollback.
- **Almacenamiento en Base de Datos**: Migración de configuraciones desde archivos .env a la base de datos para mayor flexibilidad y seguridad.

### 4. Auditoría Completa

- **Registro Detallado de Acciones**: Sistema de auditoría que registrará todas las acciones importantes de los usuarios.
- **Historial de Acceso a Datos**: Registro de quién accedió a qué datos y cuándo, para cumplir con requisitos de GDPR.
- **Interfaz de Administración**: Panel visual para revisar logs de auditoría y gestionar la seguridad.

### 5. Interfaz de Usuario para Gestión

- **Panel de Administración de Usuarios**: Interfaz para gestionar usuarios, roles y permisos.
- **Gestión de Configuración Visual**: Herramientas visuales para administrar la configuración del sistema sin necesidad de editar archivos.
- **Visualización de Logs y Auditoría**: Interfaces para revisar y filtrar registros de actividad y auditoría.

## Conclusiones

LISA 3.0.0 implementa actualmente un sistema básico de autenticación y gestión de usuarios que proporciona las funcionalidades esenciales para la plataforma. Las características más avanzadas de gestión de configuración, control de acceso basado en roles, seguridad mejorada y auditoría detallada están planificadas para versiones futuras.

Esta estructura modular permite que LISA pueda evolucionar progresivamente, añadiendo capas de seguridad y flexibilidad sin comprometer la estabilidad del sistema actual.