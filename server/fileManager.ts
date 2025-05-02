import fs from 'fs';
import path from 'path';
import { promises as fsPromises } from 'fs';
import AdmZip from 'adm-zip';
import { type Session } from '@shared/schema';

// Definición local de la interfaz File para uso en el FileManager
interface File {
  fileName: string;
}

class FileManager {
  private uploadsDir: string;

  constructor() {
    this.uploadsDir = path.join(process.cwd(), 'uploads');
    this.ensureUploadsDir();
  }

  private async ensureUploadsDir() {
    try {
      await fsPromises.access(this.uploadsDir);
    } catch (error) {
      // Directory doesn't exist, create it
      await fsPromises.mkdir(this.uploadsDir, { recursive: true });
    }
  }

  /**
   * Get the absolute file path for a given file name
   * Busca el archivo en múltiples ubicaciones prioritarias
   */
  async getFilePath(fileName: string): Promise<string | null> {
    // Lista de directorios donde buscar, en orden de prioridad
    const searchDirs = [
      // Primero, en uploads (ubicación principal)
      this.uploadsDir,
      
      // Directorio de datos
      path.join(process.cwd(), 'data'),
      
      // Directorios de sesiones
      path.join(process.cwd(), 'sessions'),
      
      // Buscar en sensor_data dentro de las carpetas de sesión
      ...this.findSessionSensorDirs(),
      
      // Buscar en mqtt_data dentro de las carpetas de sesión
      ...this.findSessionMqttDirs(),
      
      // Buscar en recordings
      path.join(process.cwd(), 'recordings')
    ];
    
    // Buscar el archivo en cada uno de los directorios
    for (const dir of searchDirs) {
      try {
        const filePath = path.join(dir, fileName);
        await fsPromises.access(filePath);
        return filePath;
      } catch (error) {
        // Archivo no encontrado en este directorio, continuar con el siguiente
      }
    }
    
    console.error(`File not found in any location: ${fileName}`);
    return null;
  }
  
  /**
   * Encuentra todos los directorios de sensor_data en las carpetas de sesión
   */
  private findSessionSensorDirs(): string[] {
    const sessionsDir = path.join(process.cwd(), 'sessions');
    const sensorDirs: string[] = [];
    
    try {
      if (fs.existsSync(sessionsDir)) {
        // Buscar carpetas de sesión (Session1, Session2, etc.)
        const sessionFolders = fs.readdirSync(sessionsDir);
        
        for (const folder of sessionFolders) {
          const sensorDataDir = path.join(sessionsDir, folder, 'sensor_data');
          if (fs.existsSync(sensorDataDir)) {
            sensorDirs.push(sensorDataDir);
          }
        }
      }
    } catch (error) {
      console.error('Error buscando directorios de sensor_data:', error);
    }
    
    return sensorDirs;
  }
  
  /**
   * Encuentra todos los directorios de mqtt_data en las carpetas de sesión
   */
  private findSessionMqttDirs(): string[] {
    const sessionsDir = path.join(process.cwd(), 'sessions');
    const mqttDirs: string[] = [];
    
    try {
      if (fs.existsSync(sessionsDir)) {
        // Buscar carpetas de sesión (Session1, Session2, etc.)
        const sessionFolders = fs.readdirSync(sessionsDir);
        
        for (const folder of sessionFolders) {
          const mqttDataDir = path.join(sessionsDir, folder, 'mqtt_data');
          if (fs.existsSync(mqttDataDir)) {
            mqttDirs.push(mqttDataDir);
          }
        }
      }
    } catch (error) {
      console.error('Error buscando directorios de mqtt_data:', error);
    }
    
    return mqttDirs;
  }

  /**
   * Create a ZIP file containing all session files
   * This is the fixed version that correctly handles MP4 files and maintains folder structure
   */
  async createSessionZip(session: Session, files: File[]): Promise<Buffer> {
    const zip = new AdmZip();
    
    // Determinar si los archivos en el zip pertenecen a una sesión específica
    const sessionId = session?.id;
    console.log(`Creating ZIP for session ${sessionId || 'unknown'}`);
    
    // Crear carpetas dentro del zip para organizar archivos
    zip.addFile('recordings/', Buffer.from(''));
    zip.addFile('sensors/', Buffer.from(''));
    
    // Si es para una sesión, añadir subcarpeta específica de la sesión
    if (sessionId) {
      zip.addFile(`session_${sessionId}/`, Buffer.from(''));
      zip.addFile(`session_${sessionId}/recordings/`, Buffer.from(''));
      zip.addFile(`session_${sessionId}/sensors/`, Buffer.from(''));
    }
    
    for (const file of files) {
      // Get the actual file path on disk
      const filePath = await this.getFilePath(file.fileName);
      
      if (!filePath) {
        // También buscar en otras ubicaciones comunes
        const alternativePaths = [
          path.join(process.cwd(), 'recordings', file.fileName),
          path.join(process.cwd(), 'sessions', `Session${sessionId}`, 'recordings', file.fileName),
          path.join(process.cwd(), 'sessions', `Session${sessionId}`, 'sensor_data', file.fileName),
          path.join(process.cwd(), 'sessions', `Session${sessionId}`, file.fileName),
          path.join(process.cwd(), 'sessions', `Session${sessionId}`, 'sensors', file.fileName),
          path.join(process.cwd(), 'data', 'sensor_data', file.fileName),
          path.join(process.cwd(), file.fileName)
        ];
        
        let found = false;
        for (const altPath of alternativePaths) {
          try {
            await fsPromises.access(altPath);
            console.log(`Encontrado en ubicación alternativa: ${altPath}`);
            found = true;
            const fileContent = await fsPromises.readFile(altPath);
            
            // Determinar la carpeta basada en el tipo de archivo
            let zipPath;
            if (file.fileName.endsWith('.mp4')) {
              zipPath = sessionId ? `session_${sessionId}/recordings/${file.fileName}` : `recordings/${file.fileName}`;
            } else if (file.fileName.endsWith('.csv') || file.fileName.endsWith('.json')) {
              zipPath = sessionId ? `session_${sessionId}/sensors/${file.fileName}` : `sensors/${file.fileName}`;
            } else {
              zipPath = file.fileName; // Para otros tipos de archivos, mantener en la raíz
            }
            
            // Añadir archivo al ZIP con la estructura de carpetas
            zip.addFile(zipPath, fileContent);
            console.log(`Added ${zipPath} to ZIP (alternative path)`);
            break;
          } catch (e) {
            // Continuar con la siguiente alternativa
          }
        }
        
        if (!found) {
          console.warn(`File not found in any location: ${file.fileName}`);
          continue;
        }
      } else {
        try {
          // Read the file content
          const fileContent = await fsPromises.readFile(filePath);
          
          // Determinar la carpeta basada en el tipo de archivo
          let zipPath;
          if (file.fileName.endsWith('.mp4')) {
            zipPath = sessionId ? `session_${sessionId}/recordings/${file.fileName}` : `recordings/${file.fileName}`;
          } else if (file.fileName.endsWith('.csv') || file.fileName.endsWith('.json')) {
            zipPath = sessionId ? `session_${sessionId}/sensors/${file.fileName}` : `sensors/${file.fileName}`;
          } else {
            zipPath = file.fileName; // Para otros tipos de archivos, mantener en la raíz
          }
          
          // Añadir archivo al ZIP con la estructura de carpetas
          zip.addFile(zipPath, fileContent);
          
          console.log(`Added ${zipPath} to ZIP`);
        } catch (error) {
          console.error(`Error adding file to ZIP: ${file.fileName}`, error);
        }
      }
    }
    
    // Obtener información de sesión para README más detallado
    let sessionInfo = '';
    try {
      // Intentar leer el archivo session_form_data.json si existe
      const sessionFormPath = path.join(process.cwd(), 'sessions', `Session${sessionId}`, 'session_form_data.json');
      if (fs.existsSync(sessionFormPath)) {
        const formData = JSON.parse(fs.readFileSync(sessionFormPath, 'utf-8'));
        // Crear una sección con todos los detalles del formulario
        sessionInfo = `\nSession Details:
- Session Name: ${formData.name || 'N/A'}
- Description: ${formData.description || 'N/A'}
- Researcher: ${formData.researcher || 'N/A'}
- Participants: ${Array.isArray(formData.participants) ? formData.participants.join(', ') : 'N/A'}
- Tags: ${Array.isArray(formData.tags) ? formData.tags.join(', ') : 'N/A'}
- Notes: ${formData.notes || 'N/A'}\n`;
      }
    } catch (error) {
      console.warn('Error al leer datos del formulario para README:', error);
    }

    // Añadir un archivo README.txt con información sobre la sesión
    const readme = `SensorSessionTracker - Session Export
===================================

Session ID: ${sessionId || 'N/A'}
Export Date: ${new Date().toISOString()}
${sessionInfo}
Contents:
- /recordings: Contains video recordings (.mp4)
- /sensors: Contains sensor data files (.csv, .json)

This ZIP file was automatically generated by SensorSessionTracker.
`;
    zip.addFile('README.txt', Buffer.from(readme));
    
    // Generate zip file buffer
    return zip.toBuffer();
  }

  /**
   * Delete a file from the filesystem
   */
  async deleteFile(fileName: string): Promise<boolean> {
    const filePath = await this.getFilePath(fileName);
    
    if (!filePath) {
      return false;
    }
    
    try {
      await fsPromises.unlink(filePath);
      return true;
    } catch (error) {
      console.error(`Error deleting file: ${fileName}`, error);
      return false;
    }
  }

  /**
   * Save a file to the uploads directory
   */
  async saveFile(fileName: string, fileContent: Buffer): Promise<string> {
    await this.ensureUploadsDir();
    
    const filePath = path.join(this.uploadsDir, fileName);
    
    await fsPromises.writeFile(filePath, fileContent);
    
    return filePath;
  }

  /**
   * Create sample files for testing if they don't exist
   */
  async createSampleFiles() {
    const sampleFiles = [
      { name: 'mov_recording_01.mp4', content: Buffer.from('Sample MP4 content for mov_recording_01') },
      { name: 'temp_data_01.csv', content: Buffer.from('time,temperature\n1,25.5\n2,26.1\n3,25.8') },
      { name: 'prox_recording_01.mp4', content: Buffer.from('Sample MP4 content for prox_recording_01') },
      { name: 'pres_data_01.csv', content: Buffer.from('time,pressure\n1,101.3\n2,101.2\n3,101.4') },
      { name: 'mov_recording_02.mp4', content: Buffer.from('Sample MP4 content for mov_recording_02') },
      { name: 'prox_data_02.csv', content: Buffer.from('time,proximity\n1,5\n2,3\n3,7') }
    ];
    
    for (const file of sampleFiles) {
      const filePath = path.join(this.uploadsDir, file.name);
      
      try {
        await fsPromises.access(filePath);
        // File exists, skip
      } catch (error) {
        // File doesn't exist, create it
        await fsPromises.writeFile(filePath, file.content);
        console.log(`Created sample file: ${file.name}`);
      }
    }
  }
}

export const fileManager = new FileManager();

// Initialize sample files when the server starts
fileManager.createSampleFiles().catch(error => {
  console.error('Error creating sample files:', error);
});
