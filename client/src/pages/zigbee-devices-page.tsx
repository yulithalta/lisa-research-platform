import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ZigbeeDevice {
  id: string;
  name: string;
  type: string;
  status: string;
  lastSeen: string;
  data: any;
}

export default function ZigbeeDevicesPage() {
  const { toast } = useToast();
  const [refreshKey, setRefreshKey] = useState(0);

  // Consultar los dispositivos Zigbee
  const { data: zigbeeData, isLoading, error } = useQuery({
    queryKey: ['/api/discover/zigbee-devices', refreshKey],
    queryFn: async () => {
      const response = await fetch('/api/discover/zigbee-devices');
      if (!response.ok) {
        throw new Error('Error al obtener dispositivos Zigbee');
      }
      return response.json();
    },
    staleTime: 60000, // 1 minuto
  });

  useEffect(() => {
    if (error) {
      toast({
        title: 'Error al obtener dispositivos',
        description: error instanceof Error ? error.message : 'Error desconocido',
        variant: 'destructive',
      });
    }
  }, [error, toast]);

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  // Formatear la fecha para mostrar en formato legible
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }).format(date);
    } catch {
      return 'Fecha desconocida';
    }
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Dispositivos Zigbee Detectados</h1>
        <Button 
          variant="outline" 
          onClick={handleRefresh} 
          disabled={isLoading}
          className="flex items-center gap-2"
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Actualizar
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2">Cargando dispositivos...</span>
        </div>
      ) : zigbeeData && zigbeeData.devices && zigbeeData.devices.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {zigbeeData.devices.map((device: ZigbeeDevice) => (
            <Card key={device.id} className="overflow-hidden">
              <CardHeader className="bg-muted/50">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg font-semibold truncate">{device.name || device.id}</CardTitle>
                    <CardDescription className="text-xs truncate">
                      ID: {device.id}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">
                      {device.type}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium">Última actualización:</span>{' '}
                    {formatDate(device.lastSeen)}
                  </div>
                  {device.data && typeof device.data === 'object' && (
                    <div>
                      <span className="font-medium">Datos:</span>
                      <pre className="mt-2 p-2 bg-muted rounded-md overflow-auto text-xs max-h-32">
                        {JSON.stringify(device.data, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="bg-muted p-8 rounded-lg text-center">
          <h2 className="text-xl font-semibold mb-2">No se han detectado dispositivos Zigbee</h2>
          <p className="mb-4 text-muted-foreground">
            Asegúrate de que los dispositivos Zigbee estén conectados y publicando en el broker MQTT
          </p>
          <Button onClick={handleRefresh} variant="outline">Intentar nuevamente</Button>
        </div>
      )}

      {zigbeeData && (
        <div className="mt-6 text-sm text-muted-foreground">
          <p>Total dispositivos detectados: {zigbeeData.foundCount || 0}</p>
          <p>Última actualización: {zigbeeData.lastUpdateTime ? formatDate(zigbeeData.lastUpdateTime) : 'Desconocida'}</p>
          <p className="mt-2 text-xs">
            Nota: Los dispositivos se detectan automáticamente cuando publican mensajes en el broker MQTT.
            Si no ves un dispositivo, asegúrate de que esté emitiendo mensajes al broker.
          </p>
        </div>
      )}
    </div>
  );
}