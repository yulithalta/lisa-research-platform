// Niveles de log disponibles para controlar la salida
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4
}

// Tipo para los metadatos de cada evento de log
export interface LogMetadata {
  timestamp: string;
  level: string;
  message: string;
  context?: any;
  source?: string;
  // Para errores
  errorName?: string;
  errorMessage?: string;
  stackTrace?: string;
}

// Interfaz para un destino de logs (Console, File, etc.)
export interface LogDestination {
  log(metadata: LogMetadata): void;
}

// Destino para console
export class ConsoleDestination implements LogDestination {
  log(metadata: LogMetadata): void {
    const formattedMessage = `[${metadata.timestamp}] [${metadata.level}] ${metadata.message}`;
    
    switch (metadata.level) {
      case 'DEBUG':
        console.debug(formattedMessage, metadata.context || '');
        break;
      case 'INFO':
        console.info(formattedMessage, metadata.context || '');
        break;
      case 'WARN':
        console.warn(formattedMessage, metadata.context || '');
        break;
      case 'ERROR':
        console.error(formattedMessage, metadata.context || '');
        break;
      default:
        console.log(formattedMessage, metadata.context || '');
    }
  }
}

// Interface segregation principle - separate interfaces for different logging concerns
export interface ILogger {
  info(message: string, context?: any): void;
  error(message: string, errorOrContext?: any, context?: Record<string, unknown>): void;
  warn(message: string, context?: any): void;
  debug(message: string, context?: any): void;
  // Métodos adicionales para mayor flexibilidad
  setLevel(level: LogLevel): void;
  setSource(source: string): ILogger;
  getSource(): string | undefined;
  withSource(source: string): ILogger;
}

// Implementación extendida del logger
export class EnhancedLogger implements ILogger {
  private level: LogLevel = LogLevel.INFO;
  private source?: string;
  private destinations: LogDestination[] = [];
  
  constructor(destinations: LogDestination[] = [new ConsoleDestination()]) {
    this.destinations = destinations;
  }
  
  // Método para crear metadata completa
  private createMetadata(level: string, message: string, contextOrError?: any, additionalContext?: Record<string, unknown>): LogMetadata {
    const metadata: LogMetadata = {
      timestamp: new Date().toISOString(),
      level,
      message,
      source: this.source
    };
    
    // Manejo especial para errores
    if (contextOrError instanceof Error) {
      metadata.errorName = contextOrError.name;
      metadata.errorMessage = contextOrError.message;
      metadata.stackTrace = contextOrError.stack;
      metadata.context = additionalContext;
    } else {
      metadata.context = contextOrError;
    }
    
    return metadata;
  }
  
  // Método para enviar a todos los destinos
  private logToAllDestinations(metadata: LogMetadata): void {
    this.destinations.forEach(destination => destination.log(metadata));
  }
  
  // Establece el nivel mínimo de logs a mostrar
  setLevel(level: LogLevel): void {
    this.level = level;
  }
  
  // Establece el origen (módulo, clase, etc) para todos los logs futuros
  setSource(source: string): ILogger {
    this.source = source;
    return this;
  }
  
  // Obtiene el origen actual
  getSource(): string | undefined {
    return this.source;
  }
  
  // Crea un nuevo logger con el origen especificado (útil para módulos)
  withSource(source: string): ILogger {
    const newLogger = new EnhancedLogger(this.destinations);
    newLogger.setLevel(this.level);
    newLogger.setSource(source);
    return newLogger;
  }
  
  // Implementación de métodos de la interfaz ILogger
  debug(message: string, context?: any): void {
    if (this.level <= LogLevel.DEBUG) {
      const metadata = this.createMetadata('DEBUG', message, context);
      this.logToAllDestinations(metadata);
    }
  }
  
  info(message: string, context?: any): void {
    if (this.level <= LogLevel.INFO) {
      const metadata = this.createMetadata('INFO', message, context);
      this.logToAllDestinations(metadata);
    }
  }
  
  warn(message: string, context?: any): void {
    if (this.level <= LogLevel.WARN) {
      const metadata = this.createMetadata('WARN', message, context);
      this.logToAllDestinations(metadata);
    }
  }
  
  error(message: string, errorOrContext?: any, context?: Record<string, unknown>): void {
    if (this.level <= LogLevel.ERROR) {
      const metadata = this.createMetadata('ERROR', message, errorOrContext, context);
      this.logToAllDestinations(metadata);
    }
  }
}

// Implementación simple para compatibilidad con el código existente
export class ConsoleLogger implements ILogger {
  private formatMessage(level: string, message: string, context?: any) {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] [${level}] ${message}${context ? ` ${JSON.stringify(context)}` : ''}`;
  }

  info(message: string, context?: any): void {
    console.info(this.formatMessage('INFO', message, context));
  }

  error(message: string, errorOrContext?: any, context?: Record<string, unknown>): void {
    // Handle both error objects and context objects
    if (errorOrContext instanceof Error) {
      console.error(this.formatMessage('ERROR', message, { ...context, error: errorOrContext.message }));
    } else {
      console.error(this.formatMessage('ERROR', message, errorOrContext));
    }
  }

  warn(message: string, context?: any): void {
    console.warn(this.formatMessage('WARN', message, context));
  }

  debug(message: string, context?: any): void {
    console.debug(this.formatMessage('DEBUG', message, context));
  }
  
  // Implementación de los nuevos métodos para compatibilidad
  setLevel(level: LogLevel): void {
    // No hace nada en la implementación simple
  }
  
  setSource(source: string): ILogger {
    return this; // Devuelve la misma instancia
  }
  
  getSource(): string | undefined {
    return undefined;
  }
  
  withSource(source: string): ILogger {
    return this; // Devuelve la misma instancia
  }
}

// Singleton instance for global usage - mantiene compatibilidad con código existente
export const logger = new ConsoleLogger();
