import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { config } from "dotenv";

// Cargar variables de entorno al inicio
config();

// Verificar variables de entorno críticas
if (!process.env.SESSION_SECRET) {
  throw new Error("SESSION_SECRET environment variable is required");
}

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Middleware de logging
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Iniciar cliente MQTT - Manejamos todos los errores para que no interrumpan la aplicación
  try {
    // Importar el cliente MQTT con ES modules para compatibilidad con tsx
    import('./mqtt-client-simple').then(async (module) => {
      try {
        const mqttClient = module.mqttClient;
        
        // Conectar al broker MQTT - Configuramos para que capture el error internamente
        const brokerUrl = process.env.MQTT_BROKER_URL || 'mqtt://mqtt:1883';
        
        log(`Intentando conectar a MQTT broker en ${brokerUrl}`);
        try {
          process.on('uncaughtException', (err) => {
            if (err.message.includes('ECONNREFUSED') && err.message.includes('1883')) {
              log(`Error de conexión con broker MQTT: ${err.message}`, 'warn');
              // No relanzamos el error para que la aplicación continúe
              return;
            }
            // Para otros errores no controlados, mostramos pero no interrumpimos
            log(`Error no controlado: ${err.message}`, 'error');
          });
          
          const connected = await mqttClient.connect();
          log(`Conexión MQTT: ${connected ? 'Exitosa' : 'Fallida'}`);
          
          if (connected) {
            // Programar solicitud periódica de dispositivos solo si conectamos exitosamente
            setInterval(() => {
              if (mqttClient.connected) {
                mqttClient.requestDevicesList();
              }
            }, 60000); // Cada minuto
          } else {
            log('La aplicación continuará sin funcionalidad de sensores MQTT', 'warn');
          }
        } catch (connectError: any) {
          log(`Error conectando a MQTT broker: ${connectError.message}`, 'warn');
          log('La aplicación continuará sin funcionalidad de sensores MQTT', 'warn');
        }
      } catch (moduleError: any) {
        log(`Error inicializando cliente MQTT: ${moduleError.message}`, 'warn');
        log('La aplicación continuará sin funcionalidad de sensores MQTT', 'warn');
      }
    }).catch((importError: any) => {
      log(`Error importando cliente MQTT: ${importError.message}`, 'warn');
      log('La aplicación continuará sin funcionalidad de sensores MQTT', 'warn');
    });
  } catch (error: any) {
    log(`Error general iniciando cliente MQTT: ${error.message}`, 'warn');
    log('La aplicación continuará sin funcionalidad de sensores MQTT', 'warn');
  }

  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    log(`Error handling request: ${err.message}`);
    res.status(status).json({ message });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client
  const PORT = 5000;
  server.listen(PORT, "0.0.0.0", () => {
    log(`Server running on port ${PORT}`);
    log(`Environment: ${app.get("env")}`);
    log(`Session secret configured: ${!!process.env.SESSION_SECRET}`);
  });
})();