import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  ArrowUpDown, 
  Battery, 
  Search, 
  Signal, 
  Wifi, 
  RefreshCw, 
  WifiOff, 
  AlertTriangle 
} from 'lucide-react';
import useSimpleMqtt from '@/hooks/useSimpleMqtt';
import { useToast } from '@/hooks/use-toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface SensorData {
  ieeeAddr: string;
  friendlyName: string;
  model: string;
  modelID: string;
  manufacturerName: string;
  lastUpdate: number;
  firstSeen: number;
  hasExternalConverter: boolean;
  location?: string;
  description?: string;
  state?: {
    contact?: boolean | number;
    battery?: number;
    voltage?: number;
    linkquality?: number;
  }
}

export default function SensorGrid() {
  const [sensors, setSensors] = useState<SensorData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<keyof SensorData>('friendlyName');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [editSensor, setEditSensor] = useState<SensorData | null>(null);
  const [newName, setNewName] = useState('');
  const { toast } = useToast();

  // Conectar a MQTT
  const mqtt = useSimpleMqtt();

  // Cargar sensores desde la API primero
  useEffect(() => {
    const fetchSensors = async () => {
      try {
        const response = await fetch('/api/zigbee/devices');
        if (response.ok) {
          const data = await response.json();
          setSensors(data);
        }
      } catch (error) {
        console.error('Error al cargar sensores desde API:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSensors();
  }, []);

  // Escuchar mensajes MQTT para actualizar sensores
  useEffect(() => {
    const handleMqttMessage = (message: any) => {
      if (message.type === 'message' && message.topic.includes('/sensors')) {
        if (message.payload && message.payload.sensors) {
          // Actualizar la lista completa de sensores
          setSensors(message.payload.sensors);
          setLoading(false);
        }
      }
    };

    // Registrar listener para MQTT
    const fetchInterval = setInterval(() => {
      if (mqtt.isConnected) {
        // Solicitar lista actualizada de sensores cada 60 segundos
        const sensorData = mqtt.getSensorData(['zigbee2mqtt/livinglab/sensors']);
        if (sensorData && sensorData['zigbee2mqtt/livinglab/sensors']) {
          const data = sensorData['zigbee2mqtt/livinglab/sensors'];
          // Si hay datos nuevos, actualizar la lista
          if (data && data.length > 0) {
            const lastMessage = data[data.length - 1];
            if (lastMessage && lastMessage.raw && lastMessage.raw.sensors) {
              setSensors(lastMessage.raw.sensors);
            }
          }
        }
      }
    }, 60000);

    return () => {
      clearInterval(fetchInterval);
    };
  }, [mqtt]);

  // Función para ordenar sensores
  const sortedSensors = React.useMemo(() => {
    if (!sensors) return [];
    
    return [...sensors]
      .filter(sensor => 
        sensor.friendlyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sensor.ieeeAddr.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (sensor.location && sensor.location.toLowerCase().includes(searchTerm.toLowerCase()))
      )
      .sort((a, b) => {
        const fieldA = a[sortField] || '';
        const fieldB = b[sortField] || '';
        
        if (typeof fieldA === 'string' && typeof fieldB === 'string') {
          return sortDirection === 'asc' 
            ? fieldA.localeCompare(fieldB)
            : fieldB.localeCompare(fieldA);
        } 
        
        // Para campos numéricos
        const numA = fieldA as number;
        const numB = fieldB as number;
        
        return sortDirection === 'asc' 
          ? numA - numB
          : numB - numA;
      });
  }, [sensors, searchTerm, sortField, sortDirection]);

  // Función para cambiar el ordenamiento
  const changeSort = (field: keyof SensorData) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Función para renombrar sensor
  const handleRenameSensor = async () => {
    if (!editSensor || !newName) return;
    
    try {
      const response = await fetch(`/api/zigbee/device/${editSensor.ieeeAddr}/rename`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ newName }),
      });
      
      if (response.ok) {
        toast({
          title: "Sensor renamed",
          description: `Sensor has been renamed to ${newName}`,
        });
        
        // Actualizar localmente el sensor renombrado
        setSensors(currentSensors => 
          currentSensors.map(s => 
            s.ieeeAddr === editSensor.ieeeAddr 
              ? { ...s, friendlyName: newName } 
              : s
          )
        );
        
        setEditSensor(null);
        setNewName('');
      } else {
        const error = await response.text();
        throw new Error(error);
      }
    } catch (error) {
      console.error('Error renaming sensor:', error);
      toast({
        variant: "destructive",
        title: "Error renaming sensor",
        description: `${error}`,
      });
    }
  };

  // Calcular tiempo desde última actualización
  const getLastSeen = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)} min ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} hours ago`;
    
    return new Date(timestamp).toLocaleDateString();
  };

  // Verificar estado de batería
  const getBatteryStatus = (battery?: number) => {
    if (battery === undefined || battery === null) return null;
    
    if (battery > 80) return { color: 'bg-green-500', text: 'Good' };
    if (battery > 40) return { color: 'bg-yellow-500', text: 'Medium' };
    return { color: 'bg-red-500', text: 'Low' };
  };

  // Verificar señal
  const getSignalStatus = (linkquality?: number) => {
    if (linkquality === undefined || linkquality === null) return null;
    
    if (linkquality > 80) return { color: 'bg-green-500', text: 'Strong' };
    if (linkquality > 40) return { color: 'bg-yellow-500', text: 'Medium' };
    return { color: 'bg-red-500', text: 'Weak' };
  };

  // Verificar estado de contacto
  const getContactStatus = (contact?: boolean | number) => {
    // Si es un sensor de contacto con propiedad declarada
    if (contact !== undefined && contact !== null) {
      // Analizar según tipo
      if (typeof contact === 'boolean') {
        return contact ? 'Opened' : 'Closed';
      } else if (typeof contact === 'number') {
        return contact === 0 ? 'Opened' : 'Closed';
      }
    }
    
    return 'Unknown';
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold">Zigbee Sensors</h2>
          
          {/* Indicador de estado MQTT */}
          <div className="flex items-center gap-2 p-1.5 rounded-md border">
            {mqtt.isConnected ? (
              <div className="flex items-center gap-1.5 text-green-600">
                <Wifi className="h-4 w-4" />
                <span className="text-xs font-medium">MQTT Connected</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-red-600">
                <WifiOff className="h-4 w-4" />
                <span className="text-xs font-medium">MQTT Disconnected</span>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6 px-2 py-0 text-xs ml-1" 
                  onClick={mqtt.reconnect}
                >
                  Reconnect
                </Button>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex space-x-2 items-center">
          <div className="relative w-64">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search sensors..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => {
              setLoading(true);
              fetch('/api/zigbee/devices/refresh')
                .then(() => {
                  toast({
                    title: "Refreshing sensors",
                    description: "Requested sensor list refresh from Zigbee network",
                  });
                  
                  // Esperar 5 segundos para dar tiempo a que se actualice
                  setTimeout(() => setLoading(false), 5000);
                })
                .catch(error => {
                  console.error('Error refreshing sensors:', error);
                  setLoading(false);
                  toast({
                    variant: "destructive",
                    title: "Error refreshing sensors",
                    description: "Could not refresh sensor list. Please try again.",
                  });
                });
            }}
          >
            Refresh
          </Button>
        </div>
      </div>
      
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full"></div>
          <span className="ml-2">Loading sensors...</span>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortedSensors.length > 0 ? (
              sortedSensors.map((sensor) => (
                <Card key={sensor.ieeeAddr} className="overflow-hidden">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{sensor.friendlyName}</CardTitle>
                        <CardDescription>
                          {sensor.model || sensor.modelID}
                        </CardDescription>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditSensor(sensor);
                          setNewName(sensor.friendlyName);
                        }}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="text-muted-foreground"
                        >
                          <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                          <path d="m15 5 4 4" />
                        </svg>
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {/* Estado del sensor */}
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Status:</span>
                      <Badge variant={getContactStatus(sensor.state?.contact) === 'Opened' ? 'destructive' : 'default'}>
                        {getContactStatus(sensor.state?.contact)}
                      </Badge>
                    </div>
                    
                    {/* Batería */}
                    {sensor.state?.battery !== undefined && (
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground flex items-center">
                          <Battery className="h-4 w-4 mr-1" />
                          Battery:
                        </span>
                        <div className="flex items-center">
                          <div className={`w-2 h-2 rounded-full mr-1 ${getBatteryStatus(sensor.state.battery)?.color}`}></div>
                          <span>{sensor.state.battery}%</span>
                        </div>
                      </div>
                    )}
                    
                    {/* Calidad de señal */}
                    {sensor.state?.linkquality !== undefined && (
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground flex items-center">
                          <Signal className="h-4 w-4 mr-1" />
                          Signal:
                        </span>
                        <div className="flex items-center">
                          <div className={`w-2 h-2 rounded-full mr-1 ${getSignalStatus(sensor.state.linkquality)?.color}`}></div>
                          <span>{sensor.state.linkquality}</span>
                        </div>
                      </div>
                    )}
                    
                    {/* Última actualización */}
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Last seen:</span>
                      <span>{getLastSeen(sensor.lastUpdate)}</span>
                    </div>
                    
                    {/* ID del dispositivo */}
                    <div className="pt-2 text-xs text-muted-foreground border-t">
                      <code>{sensor.ieeeAddr}</code>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="col-span-full flex flex-col items-center justify-center h-64 text-center">
                <Wifi className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold">No sensors found</h3>
                <p className="text-muted-foreground max-w-md mt-1">
                  No Zigbee sensors were found. Make sure your Zigbee bridge is connected and sensors are properly paired.
                </p>
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => {
                    window.open('/device-management', '_self');
                  }}
                >
                  Go to Device Management
                </Button>
              </div>
            )}
          </div>
        </>
      )}
      
      {/* Rename Dialog */}
      <Dialog open={!!editSensor} onOpenChange={(open) => !open && setEditSensor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Sensor</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="sensorName">New name</Label>
            <Input
              id="sensorName"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Enter new sensor name"
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditSensor(null)}>
              Cancel
            </Button>
            <Button onClick={handleRenameSensor}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}