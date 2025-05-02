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
   * Simplificado para buscar solo en ubicaciones esenciales
   */
  async getFilePath(fileName: string): Promise<string | null> {
    // Simplificamos las ubicaciones de búsqueda según los requerimientos
    const searchDirs = [
      // Directorio principal de grabaciones donde siempre se guardan los MP4
      path.join(process.cwd(), 'recordings'),
      
      // Directorio de datos donde se guardan los JSON y CSV de MQTT
      path.join(process.cwd(), 'data'),
      
      // Directorio de uploads como fallback
      this.uploadsDir,
      
      // Raíz del proyecto
      process.cwd(),
      
      // Carpeta de sesiones (solo para compatibilidad)
      path.join(process.cwd(), 'sessions')
    ];
    
    // Buscar directamente en archivos de grabación para MP4
    if (fileName.endsWith('.mp4')) {
      const recordingsPath = path.join(process.cwd(), 'recordings', fileName);
      try {
        await fsPromises.access(recordingsPath);
        console.log(`Encontrado video en: ${recordingsPath}`);
        return recordingsPath;
      } catch (error) {
        // Continuar con la búsqueda general si no se encuentra
      }
    }
    
    // Buscar el archivo en cada uno de los directorios simplificados
    for (const dir of searchDirs) {
      try {
        const filePath = path.join(dir, fileName);
        await fsPromises.access(filePath);
        console.log(`Encontrado archivo en: ${filePath}`);
        return filePath;
      } catch (error) {
        // Continuar con el siguiente directorio
      }
    }
    
    console.error(`No se encontró el archivo en ninguna ubicación: ${fileName}`);
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
   * Versión simplificada que busca archivos en las ubicaciones correctas
   */
  async createSessionZip(session: Session, files: File[]): Promise<Buffer> {
    const zip = new AdmZip();
    
    // Determinar si los archivos en el zip pertenecen a una sesión específica
    const sessionId = session?.id;
    console.log(`Creando ZIP para sesión ${sessionId || 'desconocida'}`);
    
    // Crear carpetas dentro del zip para organizar archivos (estructura simple)
    zip.addFile('recordings/', Buffer.from(''));
    zip.addFile('data/', Buffer.from(''));
    
    // Verificar primero si hay archivos para esta sesión
    console.log(`Verificando ${files.length} archivos para incluir en el ZIP`);
    
    // Lista de archivos que se van a incluir en el ZIP
    const filesAdded: string[] = [];
    
    // 1. Primero buscar las grabaciones MP4 (siempre en /recordings)
    console.log('Buscando archivos MP4 en /recordings...');
    try {
      const recordingsDir = path.join(process.cwd(), 'recordings');
      if (fs.existsSync(recordingsDir)) {
        // Si tenemos un ID de sesión, filtrar por archivos que coincidan con esa sesión
        const recordings = fs.readdirSync(recordingsDir)
          .filter(file => file.endsWith('.mp4') && (!sessionId || file.includes(`session${sessionId}`)));
        
        for (const recording of recordings) {
          try {
            console.log(`Añadiendo grabación: ${recording}`);
            const filePath = path.join(recordingsDir, recording);
            const fileContent = await fsPromises.readFile(filePath);
            zip.addFile(`recordings/${recording}`, fileContent);
            filesAdded.push(recording);
          } catch (err) {
            console.error(`Error al añadir grabación ${recording}:`, err);
          }
        }
      }
    } catch (err) {
      console.error('Error al buscar grabaciones:', err);
    }
    
    // 2. Buscar archivos de datos (en /data)
    console.log('Buscando archivos de datos en /data...');
    try {
      const dataDir = path.join(process.cwd(), 'data');
      if (fs.existsSync(dataDir)) {
        const dataFiles = fs.readdirSync(dataDir)
          .filter(file => file.endsWith('.json') || file.endsWith('.csv'));
        
        for (const dataFile of dataFiles) {
          try {
            console.log(`Añadiendo archivo de datos: ${dataFile}`);
            const filePath = path.join(dataDir, dataFile);
            const fileContent = await fsPromises.readFile(filePath);
            zip.addFile(`data/${dataFile}`, fileContent);
            filesAdded.push(dataFile);
          } catch (err) {
            console.error(`Error al añadir archivo de datos ${dataFile}:`, err);
          }
        }
      }
    } catch (err) {
      console.error('Error al buscar archivos de datos:', err);
    }
    
    // 3. Buscar archivos específicos en cualquier ubicación
    console.log('Buscando archivos específicos requeridos...');
    for (const file of files) {
      // Evitar duplicados
      if (filesAdded.includes(file.fileName)) {
        console.log(`Archivo ${file.fileName} ya añadido, saltando...`);
        continue;
      }
      
      // Buscar el archivo directamente
      const filePath = await this.getFilePath(file.fileName);
      
      if (filePath) {
        try {
          // Leer contenido del archivo
          const fileContent = await fsPromises.readFile(filePath);
          
          // Determinar la carpeta adecuada en el ZIP
          let zipPath;
          if (file.fileName.endsWith('.mp4')) {
            zipPath = `recordings/${file.fileName}`;
          } else if (file.fileName.endsWith('.csv') || file.fileName.endsWith('.json')) {
            zipPath = `data/${file.fileName}`;
          } else {
            zipPath = file.fileName; // Para otros tipos de archivos, mantener en la raíz
          }
          
          // Añadir archivo al ZIP
          zip.addFile(zipPath, fileContent);
          filesAdded.push(file.fileName);
          console.log(`Añadido ${zipPath} al ZIP (ruta: ${filePath})`);
        } catch (error) {
          console.error(`Error al añadir archivo al ZIP: ${file.fileName}`, error);
        }
      } else {
        console.warn(`No se encontró el archivo: ${file.fileName}`);
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
