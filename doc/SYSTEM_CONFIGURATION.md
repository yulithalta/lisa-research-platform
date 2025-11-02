# LISA 3.0.0 - System Configuration Management

## Current System Status

This document describes the current configuration management state in LISA (Living-lab Integrated Sensing Architecture) 3.0.0 and planned features for future versions.

---

## Current Implementation

### 1. Basic Authentication System

LISA 3.0.0 uses a session-based authentication system with Express and Passport:

```typescript
// server/auth.ts (excerpt)
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";

const scryptAsync = promisify(scrypt);

// Password hashing
async function hashPassword(password: string) { ... }
async function comparePasswords(supplied: string, stored: string) { ... }

export function setupAuth(app: Express) { ... }
````

Key points:

* `scrypt` with salt and timing-safe comparison.
* Session management with `express-session`.
* Local strategy via Passport.
* Serialization/deserialization of users.

---

### 2. Authentication Routes

```typescript
app.post("/api/register", async (req, res) => { ... });
app.post("/api/login", passport.authenticate("local"), (req, res) => { ... });
app.post("/api/logout", (req, res) => { ... });
app.get("/api/user", (req, res) => { ... });
```

Features:

* Registration with hashed passwords.
* Automatic login after registration.
* Login, logout, and fetching current user.
* Error handling for unauthorized access.

---

### 3. Authentication Middleware

```typescript
export function authenticatedOnly(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.status(401).json({ error: "Unauthorized" });
}
```

Usage example:

```typescript
app.get("/api/cameras", authenticatedOnly, async (req, res) => {
  const cameras = await storage.getCameras(req.user.id);
  res.json(cameras);
});
```

---

### 4. User Model

```typescript
interface User {
  id: number;
  username: string;
  password: string; // hashed
  email: string;
  role: string; // currently "admin" or "user"
  createdAt: Date;
  updatedAt: Date;
}
```

---

### 5. Basic Logging System

```typescript
import fs from "fs";
import path from "path";

export class Logger { ... }
export const logger = new Logger();
```

Features:

* Console and file logging.
* Log levels: `INFO`, `WARN`, `ERROR`, `ACTIVITY`.
* Activity logging for user actions.

---

### 6. System Configuration

Current configuration is done via environment variables (`.env`):

```
# .env
PORT=5000
SESSION_SECRET=my-session-secret
MQTT_BROKER=mqtt://192.168.0.20:1883
MQTT_USERNAME=
MQTT_PASSWORD=
STORAGE_TYPE=memory
```

---

## Planned Features for Future Versions

### 1. Role-Based Access Control (RBAC)

* Flexible roles and permissions (admin, researcher, viewer, custom).
* Middleware for endpoint permission checks.
* Database schemas to store roles and permissions.

### 2. Advanced Security

* JWT authentication to replace session-based auth.
* Two-factor authentication (2FA) for sensitive accounts.
* User state control (enable/disable).

### 3. Modular System Configuration

* Dynamic configuration service for real-time changes.
* Change history with rollback.
* Migration from `.env` to database storage.

### 4. Full Audit System

* Detailed logging of user actions.
* Access history tracking for GDPR compliance.
* Admin interface to review logs and manage security.

### 5. User Interface for Management

* Admin panel for users, roles, and permissions.
* Visual tools for configuration management.
* Log and audit dashboards.

---

## Conclusion

LISA 3.0.0 currently provides basic authentication, user management, and logging functionalities. Advanced features such as RBAC, enhanced security, dynamic configuration, and full auditing are planned for future releases.

The modular design ensures progressive evolution of LISA, adding security and flexibility layers without compromising system stability. 