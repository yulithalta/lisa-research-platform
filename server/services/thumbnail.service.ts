import fs from 'fs';
import path from 'path';
import ffmpeg from 'fluent-ffmpeg';
import { storage } from '../storage';

/**
 * Servicio encargado de la generación de miniaturas para los archivos de vídeo
 * Aplica principios SOLID y manejo adecuado de errores
 */
class ThumbnailService {
  private thumbnailsDir: string;

  constructor() {
    this.thumbnailsDir = path.join(process.cwd(), "public", "thumbnails");
    this.ensureThumbnailsDir();
  }

  /**
   * Asegura que el directorio de miniaturas exista
   */
  private ensureThumbnailsDir(): void {
    if (!fs.existsSync(this.thumbnailsDir)) {
      fs.mkdirSync(this.thumbnailsDir, { recursive: true });
      console.log(`Directorio de miniaturas creado: ${this.thumbnailsDir}`);
    }
  }

  /**
   * Genera una miniatura para un archivo de vídeo
   * @param videoPath Ruta completa al archivo de vídeo
   * @param recordingId ID de la grabación (opcional)
   * @returns Promesa que se resuelve con la URL de la miniatura
   */
  async generateThumbnail(videoPath: string, recordingId?: number): Promise<string | null> {
    try {
      // Asegurar que el archivo de video existe
      if (!fs.existsSync(videoPath)) {
        throw new Error(`El archivo de vídeo no existe: ${videoPath}`);
      }

      // Crear nombre para la miniatura
      const thumbnailFileName = path.basename(videoPath, '.mp4') + '.jpg';
      const thumbnailPath = path.join(this.thumbnailsDir, thumbnailFileName);
      
      console.log(`Generando miniatura en: ${thumbnailPath}`);
      
      // Generar la miniatura con ffmpeg
      await this.createThumbnailWithFfmpeg(videoPath, thumbnailFileName);
      
      // Verificar que se ha creado la miniatura
      if (!fs.existsSync(thumbnailPath)) {
        throw new Error(`No se pudo crear la miniatura en: ${thumbnailPath}`);
      }
      
      // URL relativa para acceso web
      const thumbnailUrl = `/thumbnails/${thumbnailFileName}`;
      
      // Si tenemos ID de grabación, actualizar en la base de datos
      if (recordingId) {
        await this.updateRecordingWithThumbnail(recordingId, thumbnailUrl);
      }
      
      return thumbnailUrl;
    } catch (error) {
      console.error(`Error al generar miniatura: ${error instanceof Error ? error.message : error}`);
      return null;
    }
  }

  /**
   * Crea una captura de pantalla del vídeo usando ffmpeg
   */
  private createThumbnailWithFfmpeg(videoPath: string, thumbnailFileName: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      ffmpeg(videoPath)
        .on('error', (err: any) => {
          console.error(`Error generando miniatura para ${videoPath}:`, err);
          reject(err);
        })
        .on('end', () => {
          console.log(`✅ Miniatura generada exitosamente: ${thumbnailFileName}`);
          resolve();
        })
        .screenshots({
          count: 1,
          folder: this.thumbnailsDir,
          filename: thumbnailFileName,
          size: '320x240'
        });
    });
  }

  /**
   * Actualiza el registro de la grabación con la URL de la miniatura
   */
  private async updateRecordingWithThumbnail(recordingId: number, thumbnailUrl: string): Promise<void> {
    try {
      await storage.updateRecording(recordingId, { thumbnailUrl });
    } catch (error) {
      console.error(`Error al actualizar grabación con miniatura: ${error instanceof Error ? error.message : error}`);
      // No lanzamos la excepción para que la miniatura siga disponible incluso si la actualización falla
    }
  }
}

export const thumbnailService = new ThumbnailService();
