import { Camera } from "@shared/schema";
import CameraCard from "./camera-card";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Video, StopCircle, RefreshCw, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useGlobalRecordingTime } from "@/hooks/use-global-recording-time";

interface CameraGridProps {
  cameras: Camera[];
  onClone: (camera: Camera) => void;
  isCheckingAll?: boolean;
}

export default function CameraGrid({ cameras, onClone, isCheckingAll = false }: CameraGridProps) {
  const { toast } = useToast();
  const [isStartingAll, setIsStartingAll] = useState(false);
  const [isStoppingAll, setIsStoppingAll] = useState(false);

  const anyRecording = cameras.some(camera => camera.isRecording);
  const { formattedTime } = useGlobalRecordingTime(anyRecording);

  // Stats para mostrar resumen de estado
  const connectedCount = cameras.filter(c => c.status === 'connected').length;
  const disconnectedCount = cameras.filter(c => c.status === 'disconnected' || c.status === 'error').length;
  const unknownCount = cameras.filter(c => !c.status || c.status === 'unknown' || c.status === 'checking').length;

  const startAllRecordings = async () => {
    setIsStartingAll(true);
    try {
      await apiRequest("POST", "/api/cameras/start-all");
      queryClient.invalidateQueries({ queryKey: ["/api/cameras"] });
      toast({
        title: "Recording started",
        description: "All cameras are now recording",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to start recordings",
        variant: "destructive",
      });
    } finally {
      setIsStartingAll(false);
    }
  };

  const stopAllRecordings = async () => {
    setIsStoppingAll(true);
    try {
      await apiRequest("POST", "/api/cameras/stop-all");
      queryClient.invalidateQueries({ queryKey: ["/api/cameras"] });
      toast({
        title: "Recording stopped",
        description: "All cameras have stopped recording",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to stop recordings",
        variant: "destructive",
      });
    } finally {
      setIsStoppingAll(false);
    }
  };

  return (
    <div className="space-y-6">
      {cameras.length === 0 ? (
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold">No cameras found</h2>
          <p className="text-muted-foreground mt-2">
            Add a camera to start monitoring
          </p>
        </div>
      ) : (
        <>
          {/* Status Summary - Mostrar solo si hay cámaras */}
          {!isCheckingAll && cameras.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="flex items-center gap-3 p-4 border rounded-md bg-emerald-50">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                <div>
                  <div className="text-lg font-semibold text-emerald-700">{connectedCount}</div>
                  <div className="text-sm text-emerald-600">Conectadas</div>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-4 border rounded-md bg-red-50">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                <div>
                  <div className="text-lg font-semibold text-red-700">{disconnectedCount}</div>
                  <div className="text-sm text-red-600">Sin conexión</div>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-4 border rounded-md bg-gray-50">
                <RefreshCw className="h-5 w-5 text-gray-500" />
                <div>
                  <div className="text-lg font-semibold text-gray-700">{unknownCount}</div>
                  <div className="text-sm text-gray-600">No verificadas</div>
                </div>
              </div>
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {cameras.map((camera) => (
              <CameraCard 
                key={camera.id} 
                camera={camera} 
                onClone={onClone} 
                isCheckingAll={isCheckingAll}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}