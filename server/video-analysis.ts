import OpenAI from 'openai';
import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs';
import { promisify } from 'util';

if (!process.env.OPENAI_API_KEY) {
  console.error('Error: OPENAI_API_KEY no está configurada en el archivo .env');
  process.exit(1);
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const mkdir = promisify(fs.mkdir);
const FRAMES_DIR = path.join(process.cwd(), "frames");
const ANALYSIS_RESULTS_DIR = path.join(process.cwd(), "analysis_results");

// Asegurar que existen los directorios necesarios
[FRAMES_DIR, ANALYSIS_RESULTS_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    console.log(`Creando directorio: ${dir}`);
    fs.mkdirSync(dir, { recursive: true });
  }
});

export interface VideoAnalysis {
  description: string;
  tags: string[];
  keyEvents: string[];
  timestamp: Date;
  progress?: number;
  status: 'processing' | 'completed' | 'error';
  framesAnalyzed?: number;
  totalFrames?: number;
  errorMessage?: string;
}

const analysisProgress = new Map<string, VideoAnalysis>();

export function getAnalysisProgress(analysisId: string): VideoAnalysis | undefined {
  return analysisProgress.get(analysisId);
}

export async function analyzeVideo(videoPath: string, analysisId: string): Promise<VideoAnalysis> {
  console.log(`Iniciando análisis de video: ${videoPath} con ID: ${analysisId}`);

  try {
    if (!fs.existsSync(videoPath)) {
      throw new Error(`El archivo de video no existe: ${videoPath}`);
    }

    // Inicializar el progreso
    const initialProgress: VideoAnalysis = {
      description: '',
      tags: [],
      keyEvents: [],
      timestamp: new Date(),
      progress: 0,
      status: 'processing',
      framesAnalyzed: 0,
      totalFrames: 0
    };
    analysisProgress.set(analysisId, initialProgress);

    // Crear un directorio temporal para este análisis
    const framesDir = path.join(FRAMES_DIR, analysisId);
    console.log(`Creando directorio temporal: ${framesDir}`);
    await mkdir(framesDir, { recursive: true });

    // Extraer frames del video (1 frame cada 2 segundos)
    console.log('Extrayendo frames del video...');
    await new Promise((resolve, reject) => {
      ffmpeg(videoPath)
        .fps(0.5)
        .on('start', (command) => {
          console.log('Comando ffmpeg:', command);
        })
        .on('progress', (progress) => {
          console.log('Progreso ffmpeg:', progress);
        })
        .on('end', () => {
          console.log('Extracción de frames completada');
          resolve(null);
        })
        .on('error', (err) => {
          console.error('Error en ffmpeg:', err);
          reject(err);
        })
        .screenshots({
          filename: 'frame-%d.jpg',
          folder: framesDir,
          size: '320x240'
        });
    });

    // Leer los frames extraídos
    console.log('Leyendo frames extraídos...');
    const frames = fs.readdirSync(framesDir)
      .filter(file => file.endsWith('.jpg'))
      .map(file => path.join(framesDir, file));

    console.log(`Número de frames extraídos: ${frames.length}`);
    if (frames.length === 0) {
      throw new Error('No se pudieron extraer frames del video');
    }

    // Actualizar el total de frames
    const progress = analysisProgress.get(analysisId)!;
    progress.totalFrames = frames.length;
    analysisProgress.set(analysisId, progress);

    // Analizar cada frame con Vision
    console.log('Iniciando análisis de frames con OpenAI Vision...');
    const frameAnalyses = await Promise.all(frames.map(async (framePath, index) => {
      try {
        console.log(`Analizando frame ${index + 1}/${frames.length}: ${framePath}`);
        const image = await fs.promises.readFile(framePath);
        const response = await openai.chat.completions.create({
          model: "gpt-4-vision-preview",
          messages: [
            {
              role: "user",
              content: [
                { 
                  type: "text", 
                  text: "Analiza esta imagen de una cámara de seguridad y describe:\n" +
                        "1. Las personas y sus acciones\n" +
                        "2. Objetos importantes o sospechosos\n" +
                        "3. Eventos o situaciones notables\n" +
                        "4. Cualquier comportamiento inusual o de riesgo" 
                },
                {
                  type: "image_url",
                  image_url: {
                    url: `data:image/jpeg;base64,${image.toString('base64')}`,
                  }
                }
              ],
            },
          ],
          max_tokens: 500,
        });

        // Actualizar el progreso
        const currentProgress = analysisProgress.get(analysisId)!;
        currentProgress.framesAnalyzed = index + 1;
        currentProgress.progress = Math.round(((index + 1) / frames.length) * 100);
        analysisProgress.set(analysisId, currentProgress);

        console.log(`Frame ${index + 1} analizado. Progreso: ${currentProgress.progress}%`);
        return response.choices[0].message.content || '';
      } catch (error) {
        console.error(`Error analizando frame ${index + 1}:`, error);
        throw error;
      }
    }));

    // Generar un resumen completo usando GPT-4
    console.log('Generando resumen final...');
    const summaryResponse = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "Eres un analista experto en seguridad que analiza grabaciones de videovigilancia. " +
                   "Genera un análisis detallado que incluya:\n" +
                   "1. Descripción general de la actividad\n" +
                   "2. Lista de eventos importantes\n" +
                   "3. Etiquetas relevantes para clasificación\n" +
                   "4. Alertas o situaciones que requieren atención"
        },
        {
          role: "user",
          content: "Analiza estas descripciones de frames y genera un reporte estructurado:\n" +
                   frameAnalyses.join("\n\n")
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 1000,
    });

    const analysis = JSON.parse(summaryResponse.choices[0].message.content || '{}');

    // Guardar los resultados
    const results: VideoAnalysis = {
      description: analysis.description || '',
      tags: analysis.tags || [],
      keyEvents: analysis.keyEvents || [],
      timestamp: new Date(),
      progress: 100,
      status: 'completed',
      framesAnalyzed: frames.length,
      totalFrames: frames.length
    };

    // Guardar los resultados en un archivo
    const resultsPath = path.join(ANALYSIS_RESULTS_DIR, `${analysisId}.json`);
    await fs.promises.writeFile(resultsPath, JSON.stringify(results, null, 2));

    // Actualizar el progreso final
    analysisProgress.set(analysisId, results);

    // Limpiar los frames temporales
    console.log('Limpiando archivos temporales...');
    frames.forEach(frame => fs.unlinkSync(frame));
    fs.rmdirSync(framesDir);

    console.log('Análisis completado con éxito');
    return results;
  } catch (error: any) {
    console.error('Error analizando video:', error);
    const errorResult: VideoAnalysis = {
      description: 'Error en el análisis',
      tags: [],
      keyEvents: [],
      timestamp: new Date(),
      progress: 0,
      status: 'error',
      errorMessage: error.message
    };
    analysisProgress.set(analysisId, errorResult);
    throw error;
  }
}