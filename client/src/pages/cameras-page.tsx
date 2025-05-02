import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, RefreshCw, WifiOff } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Camera } from "@shared/schema";
import { useState } from "react";
import CameraGrid from "@/components/camera-grid";
import AddCameraDialog from "@/components/add-camera-dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function CamerasPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [addCameraOpen, setAddCameraOpen] = useState(false);
  const [cameraToClone, setCameraToClone] = useState<Camera | undefined>();

  const { data: cameras, isLoading } = useQuery<Camera[]>({
    queryKey: ["/api/cameras"],
  });

  // Mutation para verificar todas las cámaras a la vez
  const checkAllMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/cameras/check-all");
      if (!res.ok) {
        throw new Error("Error al verificar las cámaras");
      }
      return await res.json();
    },
    onSuccess: (data) => {
      // Invalidar cache para refrescar las cámaras
      queryClient.invalidateQueries({ queryKey: ["/api/cameras"] });
      
      // Notificar al usuario
      toast({
        title: "Verificación completada",
        description: `Se verificaron ${data.count} cámaras. ${data.results.filter((r: any) => r.status === 'connected').length} disponibles, ${data.results.filter((r: any) => r.status === 'disconnected' || r.status === 'error').length} sin conexión.`,
        variant: "default",
      });
    },
    onError: (error) => {
      toast({
        title: "Error de verificación",
        description: "No se pudieron verificar todas las cámaras. Intente nuevamente.",
        variant: "destructive",
      });
    }
  });

  const handleClone = (camera: Camera) => {
    setCameraToClone(camera);
    setAddCameraOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap justify-between items-center mb-6 gap-3">
        <div>
          <h2 className="text-xl font-bold">Cámaras IP</h2>
          <p className="text-sm text-muted-foreground">
            {cameras?.length || 0} cámaras registradas
          </p>
        </div>
        
        <div className="flex gap-3">
          {/* Botón para comprobar todas las IPs */}
          <Button
            variant="outline"
            className="flex items-center gap-2 bg-blue-50 hover:bg-blue-100 border-blue-200"
            onClick={() => checkAllMutation.mutate()}
            disabled={checkAllMutation.isPending || (cameras?.length || 0) === 0}
          >
            {checkAllMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Verificando...</span>
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4" />
                <span>Comprobar IPs</span>
              </>
            )}
          </Button>
          
          {/* Botón para agregar cámara */}
          <Button
            variant="outline"
            className="flex items-center gap-2"
            onClick={() => {
              setCameraToClone(undefined);
              setAddCameraOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            <span>Agregar Cámara</span>
          </Button>
        </div>
      </div>

      {/* Estado de la verificación */}
      {checkAllMutation.isPending && (
        <div className="mb-6 p-4 border rounded-md bg-blue-50 text-blue-700">
          <div className="flex items-center gap-2 mb-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="font-medium">Verificando estado de conexión de cámaras...</span>
          </div>
          <p className="text-sm">
            Comprobando si las IPs de las cámaras responden. Esto puede tomar unos momentos.
          </p>
        </div>
      )}

      <CameraGrid 
        cameras={cameras || []} 
        onClone={handleClone}
        isCheckingAll={checkAllMutation.isPending}
      />

      <AddCameraDialog
        open={addCameraOpen}
        onOpenChange={setAddCameraOpen}
        cloneFrom={cameraToClone}
      />
    </div>
  );
}