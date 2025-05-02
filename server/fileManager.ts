import fs from 'fs';
import path from 'path';
import { promises as fsPromises } from 'fs';
import AdmZip from 'adm-zip';
import { type Session, type File } from '@shared/schema';

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
   */
  async getFilePath(fileName: string): Promise<string | null> {
    const filePath = path.join(this.uploadsDir, fileName);
    
    try {
      await fsPromises.access(filePath);
      return filePath;
    } catch (error) {
      console.error(`File not found: ${filePath}`);
      return null;
    }
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
    
    // Añadir un archivo README.txt con información sobre la sesión
    const readme = `SensorSessionTracker - Session Export
===================================

Session ID: ${sessionId || 'N/A'}
Export Date: ${new Date().toISOString()}

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
