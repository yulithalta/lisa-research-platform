import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Recording } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Play, AlertCircle, CheckCircle2, Download, Trash2, Tag, Search, Brain, Activity, FileVideo, Database, FolderArchive } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerClose,
} from "@/components/ui/drawer";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";


export default function RecordingsPage() {
  const { data: recordings, isLoading } = useQuery<Recording[]>({
    queryKey: ["/api/recordings"],
    refetchInterval: 5000,
  });
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedRecording, setSelectedRecording] = useState<Recording | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCamera, setSelectedCamera] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoError, setVideoError] = useState(false);
  const [analysisInProgress, setAnalysisInProgress] = useState<Record<number, boolean>>({});
  const [analysisProgress, setAnalysisProgress] = useState<Record<number, number>>({});
  const [selectedRecordings, setSelectedRecordings] = useState<Recording[]>([]);
  const [isComparing, setIsComparing] = useState(false);

  // Función auxiliar para obtener un resumen del análisis
  const getAnalysisSummary = (analysis: any) => {
    if (!analysis) return null;
    return {
      mainEvent: analysis.keyEvents?.[0] || "Sin eventos detectados",
      tagCount: analysis.tags?.length || 0,
      eventCount: analysis.keyEvents?.length || 0
    };
  };

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackSpeed;
    }
  }, [playbackSpeed]);

  const uniqueCameras = recordings
    ? [...new Set(recordings.map(r => r.cameraId))]
    : [];

  const filteredRecordings = recordings?.filter(recording => {
    const matchesSearch = recording.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         recording.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         `Cámara ${recording.cameraId}`.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCamera = selectedCamera === "all" || recording.cameraId.toString() === selectedCamera;

    let matchesDate = true;
    const recordingDate = new Date(recording.startTime);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    switch(dateFilter) {
      case "today":
        matchesDate = recordingDate.toDateString() === today.toDateString();
        break;
      case "yesterday":
        matchesDate = recordingDate.toDateString() === yesterday.toDateString();
        break;
      case "week":
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        matchesDate = recordingDate >= weekAgo;
        break;
      default:
        matchesDate = true;
    }

    return matchesSearch && matchesCamera && matchesDate;
  });

  const handleDeleteRecording = async (id: number) => {
    try {
      await apiRequest("DELETE", `/api/recordings/${id}`);
      queryClient.invalidateQueries({ queryKey: ["/api/recordings"] });
      toast({
        title: "Grabación eliminada",
        description: "La grabación se ha eliminado correctamente",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo eliminar la grabación",
        variant: "destructive",
      });
    }
  };

  const [exportOptionsOpen, setExportOptionsOpen] = useState<{[key: number]: boolean}>({});
  
  const handleExportRecording = async (recording: Recording, exportFormat: 'mp4' | 'zip' | 'json' = 'mp4') => {
    try {
      const link = document.createElement('a');
      const dateStr = format(new Date(recording.startTime), "yyyyMMdd_HHmmss");
      
      switch (exportFormat) {
        case 'zip':
          link.href = `/api/recordings/${recording.id}/export?format=zip`;
          link.download = `cam${recording.cameraId}_${dateStr}_completo.zip`;
          toast({
            title: "Descarga iniciada",
            description: "El paquete completo se está descargando (vídeo + datos sensores)",
          });
          break;
        
        case 'json':
          link.href = `/api/recordings/${recording.id}/sensors`;
          link.download = `cam${recording.cameraId}_${dateStr}_sensores.json`;
          toast({
            title: "Descarga iniciada",
            description: "Los datos de sensores se están descargando",
          });
          break;
        
        default: // mp4
          link.href = `/api/recordings/${recording.id}/export`;
          link.download = `cam${recording.cameraId}_${dateStr}.mp4`;
          toast({
            title: "Descarga iniciada",
            description: "El vídeo se está descargando",
          });
          break;
      }
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Cerrar el menú de opciones
      setExportOptionsOpen(prev => ({...prev, [recording.id]: false}));
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo exportar la grabación",
        variant: "destructive",
      });
    }
  };
  
  const toggleExportOptions = (recordingId: number) => {
    setExportOptionsOpen(prev => ({
      ...prev, 
      [recordingId]: !prev[recordingId]
    }));
  };

  const handleAnalyzeRecording = async (recording: Recording) => {
    try {
      setAnalysisInProgress(prev => ({ ...prev, [recording.id]: true }));
      setAnalysisProgress(prev => ({ ...prev, [recording.id]: 0 }));

      const analysisId = `recording_${recording.id}_${Date.now()}`;

      await apiRequest("POST", `/api/recordings/${recording.id}/analyze`, { analysisId });

      const pollInterval = setInterval(async () => {
        try {
          const response = await fetch(`/api/analysis/${analysisId}/progress`);
          const progress = await response.json();

          setAnalysisProgress(prev => ({ ...prev, [recording.id]: progress.progress }));

          if (progress.status === 'completed' || progress.status === 'error') {
            clearInterval(pollInterval);
            setAnalysisInProgress(prev => ({ ...prev, [recording.id]: false }));
            queryClient.invalidateQueries({ queryKey: ["/api/recordings"] });

            if (progress.status === 'completed') {
              toast({
                title: "Análisis completado",
                description: "El análisis de IA ha finalizado con éxito",
              });
            } else {
              toast({
                title: "Error en el análisis",
                description: "No se pudo completar el análisis de IA",
                variant: "destructive",
              });
            }
          }
        } catch (error) {
          console.error('Error polling analysis progress:', error);
        }
      }, 2000);
    } catch (error) {
      setAnalysisInProgress(prev => ({ ...prev, [recording.id]: false }));
      toast({
        title: "Error",
        description: "No se pudo iniciar el análisis",
        variant: "destructive",
      });
    }
  };

  // Nueva función para manejar la comparación
  const handleCompareToggle = (recording: Recording) => {
    setSelectedRecordings(prev => {
      if (prev.find(r => r.id === recording.id)) {
        return prev.filter(r => r.id !== recording.id);
      }
      if (prev.length < 4) { // Máximo 4 videos para comparar
        return [...prev, recording];
      }
      return prev;
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-[1600px]">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Grabaciones Disponibles</h1>
        {selectedRecordings.length > 0 && (
          <Button
            variant="outline"
            onClick={() => setIsComparing(true)}
            className="flex items-center gap-2"
          >
            Comparar ({selectedRecordings.length})
          </Button>
        )}
      </div>

      <div className="space-y-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar grabaciones..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="flex flex-wrap gap-2 sm:flex-nowrap">
            <Select value={selectedCamera} onValueChange={setSelectedCamera}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filtrar por cámara" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las cámaras</SelectItem>
                {uniqueCameras.map(camId => (
                  <SelectItem key={camId} value={camId.toString()}>
                    Cámara {camId}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filtrar por fecha" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las fechas</SelectItem>
                <SelectItem value="today">Hoy</SelectItem>
                <SelectItem value="yesterday">Ayer</SelectItem>
                <SelectItem value="week">Última semana</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {!filteredRecordings || filteredRecordings.length === 0 ? (
        <div className="text-center py-12 bg-muted rounded-lg">
          <p className="text-xl font-semibold text-muted-foreground">
            No hay grabaciones disponibles
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            {searchQuery || selectedCamera !== "all" || dateFilter !== "all"
              ? "No se encontraron grabaciones con los filtros seleccionados"
              : "Las grabaciones aparecerán aquí cuando se generen"}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6">
          {filteredRecordings.map((recording) => (
            <Card
              key={recording.id}
              className={`border ${recording.status === 'error' && !recording.endTime ? 'border-red-200' : ''} 
                         ${selectedRecordings.find(r => r.id === recording.id) ? 'ring-2 ring-primary' : ''}`}
            >
              <CardContent className="p-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium truncate min-w-0 flex-1">
                      {recording.title || `Cámara ${recording.cameraId}`}
                    </p>
                    <div className="flex-shrink-0">
                      {recording.status === 'completed' && (
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      )}
                      {recording.status === 'error' && !recording.endTime && (
                        <AlertCircle className="h-4 w-4 text-red-600" />
                      )}
                      {recording.status === 'recording' && (
                        <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
                      )}
                    </div>
                  </div>

                  {recording.aiAnalysis && (
                    <div className="mt-2 space-y-1">
                      <div className="flex items-center gap-2 text-sm">
                        <Brain className="h-4 w-4" />
                        <span className="font-medium">Análisis IA</span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {getAnalysisSummary(recording.aiAnalysis)?.mainEvent}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{getAnalysisSummary(recording.aiAnalysis)?.eventCount} eventos</span>
                        <span>•</span>
                        <span>{getAnalysisSummary(recording.aiAnalysis)?.tagCount} etiquetas</span>
                      </div>
                    </div>
                  )}

                  <div className="aspect-video bg-black rounded-lg relative overflow-hidden">
                    <img
                      className="w-full h-full rounded-lg object-cover"
                      src={`/api/recordings/${recording.id}/thumbnail`}
                      alt={`Grabación ${recording.id}`}
                      onError={(e) => {
                        const img = e.target as HTMLImageElement;
                        img.style.display = 'none';
                      }}
                    />
                    <Button
                      size="icon"
                      className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 rounded-full opacity-80 hover:opacity-100"
                      onClick={() => setSelectedRecording(recording)}
                    >
                      <Play className="h-4 w-4" />
                    </Button>
                  </div>

                  {recording.tags && recording.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {recording.tags.map((tag, index) => (
                        <Badge key={index} variant="secondary" className="text-xs truncate max-w-full">
                          <Tag className="h-3 w-3 mr-1 flex-shrink-0" />
                          <span className="truncate">{tag}</span>
                        </Badge>
                      ))}
                    </div>
                  )}

                  <div className="space-y-1 text-xs">
                    <p className="text-muted-foreground">
                      {format(new Date(recording.startTime), 'dd/MM/yyyy HH:mm')}
                    </p>
                    {recording.description && (
                      <p className="text-muted-foreground line-clamp-2">
                        {recording.description}
                      </p>
                    )}
                    <div className="flex justify-end gap-1 flex-wrap">
                      <div className="relative">
                        <Button
                          size="icon"
                          variant={exportOptionsOpen[recording.id] ? "default" : "ghost"}
                          onClick={() => toggleExportOptions(recording.id)}
                          title="Opciones de exportación"
                          className="flex-shrink-0"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        
                        {exportOptionsOpen[recording.id] && (
                          <div className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-popover shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                            <div className="py-1 divide-y divide-border">
                              <button
                                className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-muted"
                                onClick={() => handleExportRecording(recording, 'mp4')}
                              >
                                <FileVideo className="h-4 w-4" />
                                <span>Descargar vídeo</span>
                              </button>
                              <button
                                className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-muted"
                                onClick={() => handleExportRecording(recording, 'json')}
                              >
                                <Database className="h-4 w-4" />
                                <span>Descargar datos sensores</span>
                              </button>
                              <button
                                className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-muted"
                                onClick={() => handleExportRecording(recording, 'zip')}
                              >
                                <FolderArchive className="h-4 w-4" />
                                <span>Descargar todo (ZIP)</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                      
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleAnalyzeRecording(recording)}
                        title="Analizar con IA"
                        disabled={!!recording.aiAnalysis || analysisInProgress[recording.id]}
                        className="flex-shrink-0"
                      >
                        <Brain className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDeleteRecording(recording.id)}
                        className="text-red-500 hover:text-red-600 flex-shrink-0"
                        title="Eliminar"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant={selectedRecordings.find(r => r.id === recording.id) ? "default" : "ghost"}
                        onClick={() => handleCompareToggle(recording)}
                        className="flex-shrink-0"
                        title="Seleccionar para comparar"
                      >
                        <Search className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Drawer open={!!selectedRecording} onOpenChange={(open) => !open && setSelectedRecording(null)}>
        <DrawerContent className="h-[80vh] max-w-4xl mx-auto">
          {selectedRecording && (
            <>
              <DrawerHeader>
                <DrawerTitle>
                  {selectedRecording.title || `Cámara ${selectedRecording.cameraId}`}
                </DrawerTitle>
                <DrawerDescription>
                  {selectedRecording.startTime && format(new Date(selectedRecording.startTime), 'dd/MM/yyyy HH:mm')}
                </DrawerDescription>
                <DrawerClose onClick={() => setSelectedRecording(null)} />
              </DrawerHeader>
              <div className="p-4 space-y-4">
                <div className="aspect-video bg-black rounded-lg overflow-hidden relative">
                  <video
                    ref={videoRef}
                    controls
                    autoPlay
                    playsInline
                    className="w-full h-full"
                    key={selectedRecording.id}
                    onError={(e) => {
                      console.error("Error loading video:", e);
                      setVideoError(true);
                    }}
                  >
                    <source src={`/api/recordings/${selectedRecording.id}/stream`} type="video/mp4" />
                  </video>
                  {videoError && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white">
                      <div className="text-center">
                        <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                        <p>Error al reproducir el video</p>
                        <div className="flex gap-2 justify-center mt-2">
                          <Button
                            variant="secondary"
                            onClick={() => handleExportRecording(selectedRecording, 'mp4')}
                          >
                            <FileVideo className="h-4 w-4 mr-2" />
                            Descargar vídeo
                          </Button>
                          <Button
                            variant="secondary"
                            onClick={() => handleExportRecording(selectedRecording, 'zip')}
                          >
                            <FolderArchive className="h-4 w-4 mr-2" />
                            Paquete completo
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-4 flex items-center gap-4">
                  <span className="text-sm font-medium">Velocidad:</span>
                  <Select 
                    value={playbackSpeed.toString()} 
                    onValueChange={(value) => {
                      const speed = parseFloat(value);
                      setPlaybackSpeed(speed);
                      if (videoRef.current) {
                        videoRef.current.playbackRate = speed;
                      }
                    }}
                  >
                    <SelectTrigger className="w-[120px]">
                      <SelectValue placeholder="Velocidad" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0.5">0.5x</SelectItem>
                      <SelectItem value="1">1x</SelectItem>
                      <SelectItem value="1.5">1.5x</SelectItem>
                      <SelectItem value="2">2x</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {selectedRecording.aiAnalysis && (
                  <div className="bg-muted rounded-lg p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold flex items-center gap-2">
                        <Brain className="h-5 w-5" />
                        Análisis de IA
                      </h3>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <h4 className="font-medium mb-2">Descripción</h4>
                        <p className="text-sm text-muted-foreground">
                          {selectedRecording.aiAnalysis.description}
                        </p>
                      </div>

                      {selectedRecording.aiAnalysis?.keyEvents?.length > 0 && (
                        <div>
                          <h4 className="font-medium mb-2">Eventos Detectados</h4>
                          <ul className="space-y-2">
                            {selectedRecording.aiAnalysis.keyEvents.map((event, index) => (
                              <li key={index} className="flex items-center gap-2 text-sm">
                                <Activity className="h-4 w-4 text-muted-foreground" />
                                <span>{event}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {selectedRecording.aiAnalysis?.tags?.length > 0 && (
                        <div>
                          <h4 className="font-medium mb-2">Etiquetas</h4>
                          <div className="flex flex-wrap gap-2">
                            {selectedRecording.aiAnalysis.tags.map((tag, index) => (
                              <Badge key={index} variant="secondary">
                                <Tag className="h-3 w-3 mr-2" />
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {!selectedRecording.aiAnalysis && (
                  <Button
                    onClick={() => handleAnalyzeRecording(selectedRecording)}
                    className="w-full"
                    disabled={analysisInProgress[selectedRecording.id]}
                  >
                    {analysisInProgress[selectedRecording.id] ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Analizando... {analysisProgress[selectedRecording.id]}%
                      </>
                    ) : (
                      <>
                        <Brain className="h-4 w-4 mr-2" />
                        Analizar con IA
                      </>
                    )}
                  </Button>
                )}
              </div>
            </>
          )}
        </DrawerContent>
      </Drawer>

      <Dialog open={isComparing} onOpenChange={setIsComparing}>
        <DialogContent className="max-w-7xl w-full">
          <DialogHeader>
            <DialogTitle>Comparación de Grabaciones</DialogTitle>
            <DialogDescription>
              Compare los análisis de las grabaciones seleccionadas
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 mt-4">
            {selectedRecordings.map((recording) => (
              <div key={recording.id} className="space-y-2">
                <div className="aspect-video bg-black rounded-lg overflow-hidden">
                  <video
                    controls
                    className="w-full h-full"
                    src={`/api/recordings/${recording.id}/stream`}
                  />
                </div>
                {recording.aiAnalysis && (
                  <div className="bg-muted p-3 rounded-lg text-sm">
                    <h4 className="font-medium mb-1">Análisis</h4>
                    <p className="text-muted-foreground text-xs">
                      {recording.aiAnalysis.description}
                    </p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {recording.aiAnalysis.tags?.map((tag, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}