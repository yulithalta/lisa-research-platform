import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser, UserRole } from "@shared/schema";
import { log } from "./vite";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

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
  // Verificar que SESSION_SECRET esté configurado
  const sessionSecret = process.env.SESSION_SECRET;
  if (!sessionSecret) {
    throw new Error("SESSION_SECRET environment variable is required. Check your .env file.");
  }

  log("Setting up session configuration", "auth");
  const sessionSettings: session.SessionOptions = {
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 horas
      sameSite: 'lax'
    },
    name: 'session_id' // Nombre específico para la cookie
  };

  log("Session configuration complete", "auth");

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  // Middleware para logging de autenticación
  app.use((req: Request, res: Response, next: NextFunction) => {
    log(`Request ${req.method} ${req.url} - Auth: ${req.isAuthenticated()}`, "auth");
    next();
  });

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        log(`Attempting login for user: ${username}`, "auth");
        const user = await storage.getUserByUsername(username);
        if (!user) {
          log(`Login failed - user not found: ${username}`, "auth");
          return done(null, false, { message: "Usuario no encontrado" });
        }

        if (!(await comparePasswords(password, user.password))) {
          log(`Login failed - invalid password for user: ${username}`, "auth");
          return done(null, false, { message: "Contraseña incorrecta" });
        }

        await storage.updateUser(user.id, { lastLogin: new Date() });
        log(`Login successful for user: ${username}`, "auth");
        return done(null, user);
      } catch (error) {
        log(`Login error for user ${username}: ${error}`, "auth");
        return done(error);
      }
    }),
  );

  passport.serializeUser((user, done) => {
    log(`Serializing user: ${user.username}`, "auth");
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      log(`Deserializing user ID: ${id}`, "auth");
      const user = await storage.getUser(id);
      if (!user) {
        log(`Deserialization failed - user not found: ${id}`, "auth");
        return done(null, false);
      }
      done(null, user);
    } catch (error) {
      log(`Deserialization error for user ${id}: ${error}`, "auth");
      done(error);
    }
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      log(`Attempting registration for user: ${req.body.username}`, "auth");
      const existingUser = await storage.getUserByUsername(req.body.username);
      if (existingUser) {
        log(`Registration failed - username exists: ${req.body.username}`, "auth");
        return res.status(400).json({ message: "El nombre de usuario ya existe" });
      }

      // Only allow admin users to set roles other than VIEWER
      let role = UserRole.VIEWER;
      if (req.user?.role === UserRole.ADMIN && req.body.role) {
        role = req.body.role;
      }

      const user = await storage.createUser({
        ...req.body,
        role,
        password: await hashPassword(req.body.password),
      });

      req.login(user, (err) => {
        if (err) {
          log(`Login error after registration: ${err}`, "auth");
          return next(err);
        }
        log(`Registration successful for user: ${user.username}`, "auth");
        res.status(201).json(user);
      });
    } catch (error) {
      log(`Registration error: ${error}`, "auth");
      next(error);
    }
  });

  app.post("/api/login", (req, res, next) => {
    log(`Processing login request for user: ${req.body.username}`, "auth");
    passport.authenticate("local", (err, user, info) => {
      if (err) {
        log(`Authentication error: ${err}`, "auth");
        return next(err);
      }
      if (!user) {
        log(`Authentication failed: ${info?.message}`, "auth");
        return res.status(401).json({ message: info?.message || "Error de autenticación" });
      }
      req.login(user, (loginErr) => {
        if (loginErr) {
          log(`Login error: ${loginErr}`, "auth");
          return next(loginErr);
        }
        log(`Login successful for user: ${user.username}`, "auth");
        res.json(user);
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    const username = req.user?.username;
    log(`Processing logout for user: ${username}`, "auth");
    req.logout((err) => {
      if (err) {
        log(`Logout error for user ${username}: ${err}`, "auth");
        return next(err);
      }
      log(`Logout successful for user: ${username}`, "auth");
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) {
      log("Unauthorized access attempt to /api/user", "auth");
      return res.sendStatus(401);
    }
    log(`Sending user data for: ${req.user?.username}`, "auth");
    res.json(req.user);
  });

  app.patch("/api/user/preferences", async (req, res) => {
    if (!req.isAuthenticated()) {
      log("Unauthorized access attempt to update preferences", "auth");
      return res.sendStatus(401);
    }
    try {
      log(`Updating preferences for user: ${req.user?.username}`, "auth");
      const updatedUser = await storage.updateUser(req.user!.id, {
        preferences: req.body
      });
      res.json(updatedUser);
    } catch (error) {
      log(`Error updating preferences: ${error}`, "auth");
      res.status(500).json({ message: "Failed to update preferences" });
    }
  });
}