import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertCameraSchema, Camera, buildRtspUrl } from "@shared/schema";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2 } from "lucide-react";
import { useState } from "react";

interface AddCameraDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cloneFrom?: Camera;
}

export default function AddCameraDialog({
  open,
  onOpenChange,
  cloneFrom,
}: AddCameraDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm({
    resolver: zodResolver(insertCameraSchema),
    defaultValues: {
      name: cloneFrom ? `${cloneFrom.name} (Copy)` : "",
      ipAddress: cloneFrom?.ipAddress || "",
      username: cloneFrom?.username || "admin",
      password: cloneFrom?.password || "admin123",
      streamPath: cloneFrom?.streamPath || "h264Preview_01_main",
      port: cloneFrom?.port || "554",
    },
  });

  const onSubmit = async (data: any) => {
    setIsSubmitting(true);
    try {
      // Crear la cámara con verificación en el backend
      const response = await apiRequest("POST", "/api/cameras", {
        ...data,
        status: 'connected'
      });

      queryClient.invalidateQueries({ queryKey: ["/api/cameras"] });
      toast({
        title: "Cámara agregada",
        description: "La cámara ha sido agregada correctamente",
      });
      form.reset();
      onOpenChange(false);
    } catch (error: any) {
      // Mostrar mensaje de error específico si está disponible
      const errorMessage = error.message || "No se pudo agregar la cámara";
      toast({
        title: "Error",
        description: errorMessage.includes("Ya existe una cámara") 
          ? errorMessage 
          : "No se pudo agregar la cámara. Verifique que no exista otra cámara con el mismo nombre o dirección IP.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Construir la URL RTSP para mostrarla como preview
  const previewRtspUrl = () => {
    const values = form.getValues();
    return buildRtspUrl({
      ...values,
      id: 0,
      userId: 0,
      isRecording: false,
      status: 'connected',
      lastSeen: null,
      metrics: {
        fps: 0,
        bitrate: 0,
        resolution: '',
        uptime: 0,
        connectionErrors: 0,
        lastErrorTime: null,
        lastErrorMessage: null
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{cloneFrom ? "Clonar Cámara" : "Agregar Cámara"}</DialogTitle>
          <DialogDescription>
            Configure los parámetros de conexión para la nueva cámara IP
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre de la Cámara</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="ipAddress"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Dirección IP</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="192.168.1.100" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Configuración Avanzada</h4>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Usuario</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contraseña</FormLabel>
                      <FormControl>
                        <Input type="password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="port"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Puerto</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="streamPath"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ruta del Stream</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
            <FormDescription className="text-xs font-mono break-all">
              RTSP URL Preview: {previewRtspUrl()}
            </FormDescription>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {cloneFrom ? "Clonar Cámara" : "Agregar Cámara"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}