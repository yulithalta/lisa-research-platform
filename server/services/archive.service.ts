import fs from 'fs';
import path from 'path';
import { promises as fsPromises } from 'fs';
import AdmZip from 'adm-zip';
import { Session } from '@shared/schema';

/**
 * Interfaz que define la estructura de un archivo a incluir en el ZIP
 */
interface SessionFile {
  fileName: string;
  folder?: string; // Carpeta opcional dentro del ZIP
}

/**
 * Servicio encargado de la gestión de archivos comprimidos (ZIP)
 * Implementa patrones de diseño y principios SOLID
 */
class ArchiveService {
  private recordingsDir: string;
  private sessionsDir: string;
  private uploadsDir: string;

  constructor() {
    // Directorios base para búsqueda de archivos
    this.recordingsDir = path.join(process.cwd(), 'recordings');
    this.sessionsDir = path.join(process.cwd(), 'sessions');
    this.uploadsDir = path.join(process.cwd(), 'uploads');
    
    // Asegurar que existan los directorios
    this.ensureDirectories();
  }

  /**
   * Asegura que existan los directorios necesarios
   */
  private async ensureDirectories(): Promise<void> {
    const directories = [this.recordingsDir, this.sessionsDir, this.uploadsDir];
    
    for (const dir of directories) {
      try {
        await fsPromises.access(dir);
      } catch (error) {
        await fsPromises.mkdir(dir, { recursive: true });
        console.log(`Directorio creado: ${dir}`);
      }
    }
  }

  /**
   * Crea un archivo ZIP con todos los archivos de una sesión
   * @param session Datos de la sesión
   * @param files Lista de archivos a incluir
   * @returns Buffer con el contenido del archivo ZIP
   */
  async createSessionZip(session: Session, files: SessionFile[]): Promise<Buffer> {
    const zip = new AdmZip();
    
    // Crear estructura de carpetas en el ZIP
    this.createZipFolderStructure(zip, session.id);
    
    // Contador para verificación
    let addedFiles = 0;
    
    // Añadir cada archivo al ZIP
    for (const file of files) {
      try {
        // Buscar el archivo en varias ubicaciones posibles
        const filePath = await this.findFilePath(file.fileName, session.id);
        
        if (filePath) {
          // Leer el contenido del archivo
          const fileContent = await fsPromises.readFile(filePath);
          
          // Determinar la ruta dentro del ZIP basada en el tipo de archivo
          const zipPath = this.determineZipPath(file.fileName, session.id);
          
          // Añadir el archivo al ZIP
          zip.addFile(zipPath, fileContent);
          console.log(`Añadido al ZIP: ${zipPath}`);
          addedFiles++;
        } else {
          console.warn(`Archivo no encontrado: ${file.fileName}`);
        }
      } catch (error) {
        console.error(`Error al añadir archivo ${file.fileName} al ZIP:`, error);
      }
    }
    
    // Añadir README con información de la sesión
    this.addReadmeFile(zip, session);
    
    console.log(`ZIP creado con ${addedFiles} archivos de ${files.length} solicitados`); 
    
    // Generar y devolver el buffer del ZIP
    return zip.toBuffer();
  }

  /**
   * Crea la estructura de carpetas dentro del ZIP
   */
  private createZipFolderStructure(zip: AdmZip, sessionId?: number): void {
    // Carpetas principales
    zip.addFile('recordings/', Buffer.from(''));
    zip.addFile('sensors/', Buffer.from(''));
    
    // Si tenemos ID de sesión, añadir carpetas específicas
    if (sessionId) {
      zip.addFile(`session_${sessionId}/`, Buffer.from(''));
      zip.addFile(`session_${sessionId}/recordings/`, Buffer.from(''));
      zip.addFile(`session_${sessionId}/sensors/`, Buffer.from(''));
    }
  }

  /**
   * Determina la ruta adecuada dentro del ZIP basada en el tipo de archivo
   */
  private determineZipPath(fileName: string, sessionId?: number): string {
    let zipPath: string;
    
    if (fileName.endsWith('.mp4')) {
      zipPath = sessionId ? 
        `session_${sessionId}/recordings/${fileName}` : 
        `recordings/${fileName}`;
    } else if (fileName.endsWith('.csv') || fileName.endsWith('.json')) {
      zipPath = sessionId ? 
        `session_${sessionId}/sensors/${fileName}` : 
        `sensors/${fileName}`;
    } else {
      // Para otros tipos de archivos, mantener en la raíz
      zipPath = fileName;
    }
    
    return zipPath;
  }

  /**
   * Busca un archivo en diferentes ubicaciones posibles
   * @returns Ruta completa del archivo si se encuentra, null en caso contrario
   */
  private async findFilePath(fileName: string, sessionId?: number): Promise<string | null> {
    // Lista de ubicaciones posibles para buscar el archivo
    const possibleLocations = [
      path.join(this.uploadsDir, fileName),
      path.join(this.recordingsDir, fileName)
    ];
    
    // Añadir ubicaciones específicas de sesión si tenemos ID
    if (sessionId) {
      possibleLocations.push(
        path.join(this.sessionsDir, `Session${sessionId}`, 'recordings', fileName),
        path.join(this.sessionsDir, `Session${sessionId}`, 'sensor_data', fileName)
      );
    }
    
    // Buscar en todas las ubicaciones posibles
    for (const location of possibleLocations) {
      try {
        await fsPromises.access(location);
        return location;
      } catch {
        // Archivo no encontrado en esta ubicación, continuar con la siguiente
      }
    }
    
    return null;
  }

  /**
   * Añade un archivo README.txt con información sobre la sesión
   */
  private addReadmeFile(zip: AdmZip, session: Session): void {
    const readme = `SensorSessionTracker - Exportación de Sesión
===================================

ID de Sesión: ${session.id || 'N/A'}
Nombre: ${session.name || 'Sin nombre'}
Fecha de Exportación: ${new Date().toISOString()}

Contenido:
- /recordings: Contiene grabaciones de vídeo (.mp4)
- /sensors: Contiene archivos de datos de sensores (.csv, .json)

Este archivo ZIP fue generado automáticamente por SensorSessionTracker.
`;
    
    zip.addFile('README.txt', Buffer.from(readme));
  }
}

export const archiveService = new ArchiveService();
