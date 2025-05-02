import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent, 
  CardFooter 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  Play, 
  Download, 
  AlertCircle, 
  Video, 
  VideoOff,
  FileVideo
} from 'lucide-react';
import { format } from 'date-fns';
import { enUS } from 'date-fns/locale';

interface Recording {
  id: number;
  status: string;
  cameraId: number;
  filePath: string;
  startTime: string;
  endTime: string | null;
  title: string | null;
  description: string | null;
  sessionId: number | null;
}

interface SessionRecordingsPlayerProps {
  sessionId: number;
}

export default function SessionRecordingsPlayer({ sessionId }: SessionRecordingsPlayerProps) {
  const { toast } = useToast();
  const [selectedRecording, setSelectedRecording] = useState<Recording | null>(null);
  const [isVideoLoading, setIsVideoLoading] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);
  
  // Consultar grabaciones por sessionId
  const { data: recordings = [], isLoading, error } = useQuery<Recording[]>({
    queryKey: [`/api/sessions/${sessionId}/recordings`]
  });

  // Función para iniciar reproducción de un vídeo
  const playRecording = (recording: Recording) => {
    setIsVideoLoading(true);
    setVideoError(null);
    setSelectedRecording(recording);
    
    // Comprobar si el archivo existe haciendo una solicitud HEAD
    fetch(`/api/recordings/${recording.id}/stream`, { method: 'HEAD' })
      .then(response => {
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error("Video file not found. It may have been moved or deleted.");
          }
          throw new Error(`Error loading video: ${response.statusText}`);
        }
        setIsVideoLoading(false);
      })
      .catch(err => {
        console.error("Error checking video:", err);
        setVideoError(err.message || "Failed to load the video");
        setIsVideoLoading(false);
      });
  };

  // Función para descargar un vídeo
  const downloadRecording = async (recording: Recording) => {
    try {
      // Obtenemos solo el nombre del archivo de la ruta completa
      const fileName = recording.filePath.split('/').pop() || `recording-${recording.id}.mp4`;
      
      toast({
        title: "Starting download",
        description: "Preparing the recording file for download",
      });
      
      // Realizamos la solicitud para descargar el archivo
      const response = await fetch(`/api/recordings/${recording.id}/download`);
      
      if (!response.ok) {
        throw new Error('Failed to download recording');
      }
      
      // Obtenemos el blob
      const blob = await response.blob();
      
      // Creamos un objeto URL para el blob
      const url = window.URL.createObjectURL(blob);
      
      // Creamos un elemento de anclaje
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      
      // Simulamos el clic en el enlace para iniciar la descarga
      document.body.appendChild(a);
      a.click();
      
      // Limpiamos
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Download started",
        description: "Your recording is being downloaded",
      });
    } catch (error) {
      console.error('Error downloading recording:', error);
      toast({
        title: "Download failed",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    }
  };
  
  if (isLoading) {
    return (
      <div className="p-4 text-center">
        <p className="text-sm text-muted-foreground">Loading recordings...</p>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="p-4 text-center border border-red-200 rounded-md bg-red-50">
        <AlertCircle className="h-6 w-6 text-red-500 mx-auto mb-2" />
        <p className="text-sm text-red-600">Failed to load recordings</p>
      </div>
    );
  }
  
  if (!recordings || recordings.length === 0) {
    return (
      <div className="p-4 text-center border rounded-md">
        <VideoOff className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">No recordings found for this session</p>
      </div>
    );
  }
  
  // Consulta adicional para obtener los detalles de la cámara
  const { data: cameras = [] } = useQuery<any[]>({
    queryKey: ['/api/cameras']
  });

  const getCameraName = (cameraId: number) => {
    if (!cameras || !Array.isArray(cameras)) return `Camera ${cameraId}`;
    const camera = cameras.find((cam: any) => cam.id === cameraId);
    return camera ? camera.name : `Camera ${cameraId}`;
  };

  return (
    <div className="space-y-4">
      {/* Lista de grabaciones */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {recordings.map((recording: Recording) => (
          <Card key={recording.id} className="overflow-hidden">
            <CardHeader className="p-3 pb-0">
              <div className="flex justify-between items-start">
                <CardTitle className="text-sm">
                  {recording.title || getCameraName(recording.cameraId)}
                </CardTitle>
                <Badge variant={recording.status === 'completed' || recording.endTime ? 'success' : 'destructive'}>
                  {recording.endTime ? 'completed' : recording.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-3">
              <div className="flex flex-col space-y-2 text-xs">
                <div>
                  <span className="text-muted-foreground">Started:</span>{' '}
                  {format(new Date(recording.startTime), "MMM d, yyyy h:mm a", { locale: enUS })}
                </div>
                {recording.endTime && (
                  <div>
                    <span className="text-muted-foreground">Ended:</span>{' '}
                    {format(new Date(recording.endTime), "MMM d, yyyy h:mm a", { locale: enUS })}
                  </div>
                )}
              </div>
            </CardContent>
            <CardFooter className="p-3 pt-0 flex justify-between gap-2">
              <Button 
                size="sm"
                variant="outline"
                onClick={() => playRecording(recording)}
                className="flex-1"
              >
                <Play className="h-3.5 w-3.5 mr-1" />
                Play
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => downloadRecording(recording)}
                className="flex-1"
              >
                <Download className="h-3.5 w-3.5 mr-1" />
                Download
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
      
      {/* Reproductor de vídeo */}
      {selectedRecording && (
        <div className="mt-4 border rounded-md p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">
              <FileVideo className="h-4 w-4 inline-block mr-1" />
              {selectedRecording.title || `Recording from ${getCameraName(selectedRecording.cameraId)}`}
            </h4>
            <Button 
              size="sm" 
              variant="ghost"
              onClick={() => {
                setSelectedRecording(null);
                setVideoError(null);
                setIsVideoLoading(false);
              }}
            >
              Close
            </Button>
          </div>
          
          <div className="aspect-video bg-black rounded-md overflow-hidden relative">
            {isVideoLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-70 z-10">
                <div className="text-white flex flex-col items-center">
                  <div className="animate-spin h-8 w-8 border-4 border-t-blue-500 border-white border-opacity-30 rounded-full mb-2"></div>
                  <p>Loading video...</p>
                </div>
              </div>
            )}
            
            {videoError && (
              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-70 z-10">
                <div className="text-white flex flex-col items-center text-center px-4">
                  <AlertCircle className="h-10 w-10 text-red-500 mb-2" />
                  <p className="text-sm">{videoError}</p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-3 text-white border-white hover:bg-white hover:text-black"
                    onClick={() => playRecording(selectedRecording)}
                  >
                    Try Again
                  </Button>
                </div>
              </div>
            )}
            
            {!videoError && (
              <video 
                key={selectedRecording.id} // Añadir key para forzar remontaje del componente cuando cambia la grabación
                src={`/api/recordings/${selectedRecording.id}/stream`}
                className="w-full h-full"
                controls
                autoPlay
                playsInline
                onError={() => {
                  setVideoError("There was an error playing this video. The file might be missing or corrupted.");
                  setIsVideoLoading(false);
                }}
                onCanPlay={() => setIsVideoLoading(false)}
              >
                Your browser does not support the video tag.
              </video>
            )}
          </div>
          
          <div className="text-xs text-muted-foreground">
            {selectedRecording.description || 'No description provided for this recording'}
            <div className="mt-1 text-xs">
              <span className="opacity-70">File path: </span>
              <code className="bg-gray-100 px-1 py-0.5 rounded">{selectedRecording.filePath}</code>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}