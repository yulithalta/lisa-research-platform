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
   * This is the fixed version that correctly handles MP4 files
   */
  async createSessionZip(session: Session, files: File[]): Promise<Buffer> {
    const zip = new AdmZip();
    
    for (const file of files) {
      // Get the actual file path on disk
      const filePath = await this.getFilePath(file.fileName);
      
      if (!filePath) {
        console.warn(`File not found: ${file.fileName}`);
        continue;
      }

      try {
        // Read the file content
        const fileContent = await fsPromises.readFile(filePath);
        
        // Use just the filename for the zip entry, not the full path
        // This is the key fix for MP4 files
        const zipEntryName = file.fileName;
        
        // Add the file to the ZIP with the correct name
        zip.addFile(zipEntryName, fileContent);
        
        console.log(`Added ${zipEntryName} to ZIP`);
      } catch (error) {
        console.error(`Error adding file to ZIP: ${file.fileName}`, error);
      }
    }
    
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
