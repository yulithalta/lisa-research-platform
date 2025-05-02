import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Camera, UserRole } from "@shared/schema";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Settings, RefreshCw, User, Shield, Bell, Loader2 } from "lucide-react";
import { logger } from "@/lib/services/logger";
import { useAuth } from "@/hooks/use-auth";
import { Form, FormField, FormItem, FormLabel, FormControl, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useState } from "react";

type UserPreferences = {
  notifications: boolean;
  darkMode: boolean;
  language: string;
};

export default function SettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: cameras } = useQuery<Camera[]>({
    queryKey: ["/api/cameras"],
  });

  const form = useForm({
    defaultValues: {
      fullName: user?.fullName || "",
      email: user?.email || "",
      preferences: user?.preferences as UserPreferences || {
        notifications: true,
        darkMode: false,
        language: "es"
      }
    }
  });

  const updateUserMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("PATCH", "/api/user/preferences", data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Configuración actualizada",
        description: "Los cambios se han guardado correctamente"
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudieron guardar los cambios",
        variant: "destructive"
      });
    }
  });

  const [refreshingCameras, setRefreshingCameras] = useState(false);
  const [verificationProgress, setVerificationProgress] = useState(0);
  const [verificationResults, setVerificationResults] = useState<{
    total: number;
    checked: number;
    connected: number;
    disconnected: number;
  }>({ total: 0, checked: 0, connected: 0, disconnected: 0 });
  const queryClient = useQueryClient();

  // Función para verificar el estado de todas las cámaras mediante conexión TCP
  const handleRefreshCameras = async () => {
    if (!cameras || cameras.length === 0) {
      toast({
        title: "No hay cámaras",
        description: "No hay cámaras configuradas para verificar",
      });
      return;
    }

    setRefreshingCameras(true);
    setVerificationProgress(0);
    
    // Inicializar resultados
    const results = {
      total: cameras.length,
      checked: 0,
      connected: 0,
      disconnected: 0
    };
    setVerificationResults(results);
    
    logger.info("Verificando conexión de cámaras mediante TCP...");
    
    toast({
      title: "Iniciando verificación",
      description: `Comprobando conectividad de ${cameras.length} cámaras...`,
    });

    try {
      // Verificar cámaras en serie para mostrar progreso y evitar saturación
      for (const camera of cameras) {
        try {
          // Actualizar estado de la cámara a "verifying" para mostrar indicador visual
          queryClient.setQueryData(["/api/cameras"], (oldData: Camera[] | undefined) => {
            if (!oldData) return oldData;
            return oldData.map(c => c.id === camera.id ? { ...c, status: 'verifying' } : c);
          });
          
          // Esperar un momento para que se vea la actualización en la interfaz
          await new Promise(resolve => setTimeout(resolve, 300));
          
          // Realizar la verificación
          const response = await apiRequest("GET", `/api/cameras/${camera.id}/ping`);
          const result = await response.json();
          
          // Actualizar contadores
          results.checked++;
          if (result.status === 'connected') {
            results.connected++;
          } else {
            results.disconnected++;
          }
          
          // Actualizar progreso
          const newProgress = Math.round((results.checked / results.total) * 100);
          setVerificationProgress(newProgress);
          setVerificationResults({...results});
          
          // Mostrar resultados parciales cada 3 cámaras verificadas o al final
          if (results.checked % 3 === 0 || results.checked === results.total) {
            logger.info(`Progreso de verificación: ${results.checked}/${results.total}`);
          }
        } catch (error) {
          console.error(`Error verificando cámara ${camera.id}:`, error);
          results.checked++;
          results.disconnected++;
          setVerificationResults({...results});
          
          // Actualizar progreso incluso en caso de error
          const newProgress = Math.round((results.checked / results.total) * 100);
          setVerificationProgress(newProgress);
        }
      }
      
      // Invalidar la cache para actualizar la UI con los nuevos estados
      queryClient.invalidateQueries({ queryKey: ["/api/cameras"] });
      
      // Mostrar resultados finales
      toast({
        title: "Verificación completada",
        description: `${results.connected} conectadas, ${results.disconnected} desconectadas`,
        variant: results.connected > 0 ? "default" : "destructive",
      });
    } catch (error) {
      console.error("Error al verificar cámaras:", error);
      toast({
        title: "Error",
        description: "No se pudo completar la verificación de cámaras",
        variant: "destructive",
      });
    } finally {
      setRefreshingCameras(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid gap-6">
        {/* Perfil de Usuario */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Perfil de Usuario
            </CardTitle>
            <CardDescription>
              Gestiona tu información personal y preferencias
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(data => updateUserMutation.mutate(data))} className="space-y-4">
                <FormField
                  control={form.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre completo</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Correo electrónico</FormLabel>
                      <FormControl>
                        <Input type="email" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <div className="border rounded-lg p-4 space-y-4">
                  <h3 className="font-medium flex items-center gap-2">
                    <Bell className="h-4 w-4" />
                    Preferencias
                  </h3>

                  <FormField
                    control={form.control}
                    name="preferences.notifications"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between">
                        <div>
                          <FormLabel>Notificaciones</FormLabel>
                          <FormDescription>
                            Recibir alertas del sistema
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="preferences.darkMode"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between">
                        <div>
                          <FormLabel>Modo oscuro</FormLabel>
                          <FormDescription>
                            Cambiar apariencia de la interfaz
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                <Button type="submit" className="w-full">
                  Guardar cambios
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Permisos y Rol */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Permisos y Rol
            </CardTitle>
            <CardDescription>
              Nivel de acceso: {user?.role}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-sm">
                {user?.role === UserRole.ADMIN && "Acceso completo al sistema"}
                {user?.role === UserRole.OPERATOR && "Gestión de cámaras y grabaciones"}
                {user?.role === UserRole.VIEWER && "Visualización de contenido"}
              </p>
              {user?.role === UserRole.ADMIN && (
                <Button variant="outline" className="w-full">
                  Gestionar roles de usuarios
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Configuración del Sistema */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Configuración del Sistema
            </CardTitle>
            <CardDescription>
              Ajustes generales del sistema de cámaras
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">Estado de las Cámaras</h3>
                    <p className="text-sm text-muted-foreground">
                      {cameras?.length || 0} cámaras configuradas
                    </p>
                  </div>
                  <Button 
                    onClick={handleRefreshCameras} 
                    variant="outline" 
                    className="gap-2"
                    disabled={refreshingCameras}
                  >
                    {refreshingCameras ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                    {refreshingCameras ? 'Verificando...' : 'Verificar Conexión'}
                  </Button>
                </div>
                
                {refreshingCameras && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Progreso: {verificationProgress}%</span>
                      <span>
                        {verificationResults.checked}/{verificationResults.total} cámaras verificadas
                      </span>
                    </div>
                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-500 transition-all duration-300 ease-in-out" 
                        style={{ width: `${verificationProgress}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1 text-green-600">
                        <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
                        Conectadas: {verificationResults.connected}
                      </span>
                      <span className="flex items-center gap-1 text-red-600">
                        <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
                        Desconectadas: {verificationResults.disconnected}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Directorio de Grabaciones</h3>
                  <p className="text-sm text-muted-foreground">
                    /recordings
                  </p>
                </div>
                <Button variant="outline" className="gap-2">
                  <Settings className="h-4 w-4" />
                  Configurar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}