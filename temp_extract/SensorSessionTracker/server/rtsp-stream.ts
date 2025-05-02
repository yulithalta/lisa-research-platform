import { WebSocketServer } from 'ws';
import { spawn } from 'child_process';
import { logger } from '../client/src/lib/services/logger';

export function setupRTSPStream(server: any) {
  const wss = new WebSocketServer({ server, path: '/rtsp-stream' });

  wss.on('connection', (ws) => {
    logger.info('New WebSocket connection for RTSP stream');

    let ffmpeg: any = null;

    ws.on('message', (message: string) => {
      const data = JSON.parse(message);
      
      if (data.type === 'start' && data.url) {
        if (ffmpeg) {
          ffmpeg.kill();
        }

        // Iniciar ffmpeg para transmitir el stream RTSP
        ffmpeg = spawn('ffmpeg', [
          '-i', data.url,
          '-f', 'mpegts',
          '-codec:v', 'mpeg1video',
          '-s', '800x600',
          '-b:v', '1000k',
          '-r', '30',
          '-bf', '0',
          'pipe:1'
        ]);

        ffmpeg.stdout.on('data', (data: Buffer) => {
          if (ws.readyState === ws.OPEN) {
            ws.send(data);
          }
        });

        ffmpeg.stderr.on('data', (data: Buffer) => {
          logger.debug('FFmpeg stderr:', data.toString());
        });

        ffmpeg.on('close', (code: number) => {
          logger.info('FFmpeg process closed with code:', code);
        });
      }
    });

    ws.on('close', () => {
      logger.info('WebSocket connection closed');
      if (ffmpeg) {
        ffmpeg.kill();
      }
    });
  });
}
