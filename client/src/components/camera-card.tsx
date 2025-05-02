import { Camera, Recording } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Copy, Info, Loader2, Trash, Edit, Check, X, Wifi, WifiOff, RefreshCw, AlertTriangle } from "lucide-react";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";

interface CameraCardProps {
  camera: Camera;
  onClone: (camera: Camera) => void;
  isCheckingAll?: boolean;
}

export default function CameraCard({ camera, onClone, isCheckingAll = false }: CameraCardProps) {
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showPrefixInput, setShowPrefixInput] = useState(false);
  const [prefix, setPrefix] = useState(camera.recordingPrefix || '');
  const [isVerifying, setIsVerifying] = useState(false);

  const { data: recordings } = useQuery<Recording[]>({
    queryKey: [`/api/cameras/${camera.id}/recordings`],
  });

  // Mutation para verificar el estado de la cámara
  const verifyMutation = useMutation({
    mutationFn: async () => {
      setIsVerifying(true);
      const res = await apiRequest("GET", `/api/cameras/${camera.id}/ping`);
      if (!res.ok) {
        throw new Error("Error en la verificación de la cámara");
      }
      return await res.json();
    },
    onSuccess: (data) => {
      console.log("Camera ping result:", data);
      
      // Actualizar la caché con el nuevo estado
      queryClient.setQueryData(["/api/cameras"], (oldData: Camera[] | undefined) => {
        if (!oldData) return oldData;
        return oldData.map(c => c.id === camera.id ? { ...c, status: data.status } : c);
      });
      
      // Forzar una invalidación de la caché para garantizar la actualización
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["/api/cameras"] });
      }, 100);
      
      // Mostrar notificación del resultado según el estado
      if (data.status === 'connected') {
        toast({
          title: "Verificación exitosa",
          description: `Cámara ${camera.name} está conectada y respondiendo correctamente`,
          variant: "default",
        });
      } else {
        toast({
          title: "Cámara desconectada",
          description: `No se puede conectar a la cámara ${camera.name}. Verifique que la dirección IP sea correcta y que el dispositivo esté encendido.`,
          variant: "destructive",
        });
      }
    },
    onError: (error) => {
      // Actualizar estado a error en la caché
      queryClient.setQueryData(["/api/cameras"], (oldData: Camera[] | undefined) => {
        if (!oldData) return oldData;
        return oldData.map(c => c.id === camera.id ? { ...c, status: 'error' } : c);
      });
      
      toast({
        title: "Error de verificación",
        description: "No se pudo verificar el estado de la cámara. Compruebe la conexión de red.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsVerifying(false);
    }
  });

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await apiRequest("DELETE", `/api/cameras/${camera.id}`);
      queryClient.invalidateQueries({ queryKey: ["/api/cameras"] });
      toast({
        title: "Cámara eliminada",
        description: "La cámara ha sido eliminada del dashboard",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo eliminar la cámara",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const handleUpdatePrefix = async () => {
    try {
      await apiRequest("PATCH", `/api/cameras/${camera.id}`, {
        recordingPrefix: prefix,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/cameras"] });
      setShowPrefixInput(false);
      toast({
        title: "Prefijo actualizado",
        description: "El prefijo de grabación se ha actualizado correctamente",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo actualizar el prefijo de grabación",
        variant: "destructive",
      });
    }
  };

  const getSecureRtspUrl = (url: string) => {
    try {
      const urlObj = new URL(url);
      if (urlObj.username || urlObj.password) {
        urlObj.username = '****';
        urlObj.password = '****';
      }
      return urlObj.toString();
    } catch (e) {
      return url;
    }
  };

  const getLatestRecording = () => {
    if (!recordings || recordings.length === 0) return null;
    return recordings[0];
  };

  const latestRecording = getLatestRecording();

  // Get status indicator with improved visual feedback using color-coding:
  // gris = no verificada, verde = respondiendo, rojo = no responde
  const getStatusIndicator = () => {
    const status = camera.status || 'unknown';
    
    // Si está verificando localmente o globalmente, mostrar estado de "verificando"
    if (isVerifying || (isCheckingAll && (status === 'checking' || status === 'verifying'))) {
      return {
        color: 'bg-blue-500',
        text: 'Verificando',
        icon: <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />
      };
    }
    
    switch (status) {
      case 'connected':
        return {
          color: 'bg-green-500',
          text: 'Responde',
          icon: <Wifi className="h-4 w-4 text-green-500" />
        };
      case 'error':
        return {
          color: 'bg-red-500',
          text: 'Error de conexión',
          icon: <AlertTriangle className="h-4 w-4 text-red-500" />
        };
      case 'connecting':
        return {
          color: 'bg-yellow-500',
          text: 'Conectando',
          icon: <RefreshCw className="h-4 w-4 animate-spin text-yellow-500" />
        };
      case 'checking': 
      case 'verifying': 
        return {
          color: 'bg-blue-500',
          text: 'Verificando',
          icon: <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />
        };
      case 'disconnected':
        return {
          color: 'bg-red-500',
          text: 'No responde',
          icon: <WifiOff className="h-4 w-4 text-red-500" />
        };
      case 'unknown':
      default:
        return {
          color: 'bg-gray-300',
          text: 'No verificada',
          icon: <RefreshCw className="h-4 w-4 text-gray-500" />
        };
    }
  };

  const statusIndicator = getStatusIndicator();

  return (
    <>
      <Card className={`
        ${isVerifying || (isCheckingAll && (camera.status === 'checking' || camera.status === 'verifying')) ? 'border-blue-400 shadow-blue-100' : ''} 
        ${camera.status === 'connected' ? 'border-green-200 shadow-green-50' : ''} 
        ${camera.status === 'disconnected' || camera.status === 'error' ? 'border-red-200 shadow-red-50' : ''} 
        ${camera.status === 'unknown' || !camera.status ? 'border-gray-200' : ''}
        ${isCheckingAll ? 'transition-all duration-300' : ''}
      `}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xl">{camera.name}</CardTitle>
          <div className="flex gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-1 bg-blue-50 hover:bg-blue-100"
                    onClick={() => verifyMutation.mutate()}
                    disabled={isVerifying || verifyMutation.isPending}
                  >
                    {isVerifying || verifyMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4 text-blue-500" />
                        <span className="text-xs hidden sm:inline">Check</span>
                      </>
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Check camera status</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-1 bg-emerald-50 hover:bg-emerald-100"
                    onClick={() => onClone(camera)}
                  >
                    <Copy className="h-4 w-4 text-emerald-500" />
                    <span className="text-xs hidden sm:inline">Clone</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Clone this camera</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-1 bg-red-50 hover:bg-red-100"
                    onClick={() => setShowDeleteDialog(true)}
                    disabled={isDeleting}
                  >
                    {isDeleting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Trash className="h-4 w-4 text-red-500" />
                        <span className="text-xs hidden sm:inline">Delete</span>
                      </>
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Delete this camera</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Status Indicator with Progress bar when verifying */}
            {(isVerifying || (isCheckingAll && (camera.status === 'checking' || camera.status === 'verifying'))) && (
              <div className="w-full mb-2">
                <Progress value={33} className="h-1.5 w-full bg-blue-100" />
              </div>
            )}
            
            <div className="flex items-center gap-2">
              <span className={`inline-block w-2 h-2 rounded-full ${statusIndicator.color}`} />
              <span className="text-sm font-medium flex items-center gap-1">
                {statusIndicator.icon} {statusIndicator.text}
              </span>
              {camera.isRecording && (
                <span className="ml-2 text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full">
                  Recording
                </span>
              )}
            </div>

            {/* Camera Info */}
            <div className="text-sm space-y-1">
              <p className="text-muted-foreground">
                IP: {camera.ipAddress}
              </p>
              <p className="text-muted-foreground">
                Status: {camera.isRecording ? "Recording" : "Inactive"}
              </p>
              {camera.metrics && (
                <>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <p className="text-muted-foreground cursor-help flex items-center">
                          FPS: {camera.metrics.fps}
                          <Info className="h-3 w-3 ml-1 text-blue-500" />
                        </p>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-[250px] text-xs">
                        <p>Data provided directly by the camera through real-time RTSP stream analysis</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <p className="text-muted-foreground cursor-help flex items-center">
                          Bitrate: {camera.metrics.bitrate} kbps
                          <Info className="h-3 w-3 ml-1 text-blue-500" />
                        </p>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-[250px] text-xs">
                        <p>Metric calculated from RTSP data stream using FFmpeg during camera verification</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </>
              )}
            </div>

            {/* Recording Prefix */}
            <div className="flex items-center justify-between">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full flex items-center justify-between"
                      onClick={() => setShowPrefixInput(true)}
                    >
                      <span className="flex items-center gap-2">
                        <span>Recording Prefix</span>
                        <Edit className="h-4 w-4" />
                      </span>
                      <span className="text-muted-foreground">
                        {camera.recordingPrefix || "No prefix"}
                      </span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>The prefix is used to name recording files</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            {showPrefixInput && (
              <div className="flex items-center gap-2 mt-2">
                <Input
                  value={prefix}
                  onChange={(e) => setPrefix(e.target.value)}
                  className="flex-1"
                  placeholder="Enter recording prefix..."
                />
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="default" size="icon" onClick={handleUpdatePrefix}>
                        <Check className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Save prefix</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" onClick={() => setShowPrefixInput(false)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Cancel</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            )}

            {/* RTSP URL */}
            <p className="text-sm text-muted-foreground font-mono break-all">
              RTSP: {getSecureRtspUrl(camera.rtspUrl)}
            </p>

            {/* Latest Recording Info */}
            {latestRecording && (
              <p className="text-sm text-muted-foreground">
                Last Recording: {new Date(latestRecording.startTime).toLocaleString()}
                {latestRecording.status === "recording" && " (In progress)"}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Camera</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {camera.name}? This action cannot be
              undone and will delete all recordings.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}