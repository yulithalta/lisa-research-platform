import React, { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle 
} from '@/components/ui/card';
import { 
  Tabs, TabsContent, TabsList, TabsTrigger 
} from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from '@/hooks/use-toast';
import { useDeveloperMode } from '@/hooks/use-developer-mode';
import { Session, InsertSession } from '@shared/schema';
import { apiRequest } from '@/lib/queryClient';
import useSimpleMqtt from '@/hooks/useSimpleMqtt';
import MqttStatusIndicator from '@/components/mqtt-status-indicator';
import { 
  Clock, CheckCircle, Download, Database, Plus, X, 
  Timer, Play, FileText, Trash2, Square, ExternalLink,
  Tag, Users, Calendar, Search, Info as InfoIcon,
  AlertCircle, Wifi, WifiOff, Signal
} from 'lucide-react';
import { format } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { SessionViewDialog } from './session-view-dialog';

// Definición de la interfaz de metadatos para sesiones
// Esta interfaz organiza toda la información adicional asociada con una sesión,
// permitiendo un acceso tipado y estructurado a los datos de sesión
interface SessionMetadata {
  // Información del investigador a cargo de la sesión
  researcher?: string;
  
  // Información de participantes (dos formatos soportados)
  participant?: string;        // Soporte para formato antiguo (un solo participante)
  participants?: string[];     // Formato nuevo (múltiples participantes como array)
  
  // Información adicional
  lab?: string;                // Laboratorio donde se realiza la sesión
  notes?: string;              // Notas adicionales sobre la sesión
  
  // Dispositivos asociados a la sesión (cámaras y sensores)
  devices?: {
    cameras?: any[];           // Lista de cámaras seleccionadas
    sensors?: any[];           // Lista de sensores seleccionados
  };
}

// Crear un tipo extendido para Session con tipado de metadata
type SessionWithMetadata = Session & {
  metadata?: SessionMetadata;
};

// Función auxiliar para acceder de forma segura a los campos de metadata
function getMetadata(session: SessionWithMetadata, field: keyof SessionMetadata, defaultValue: any = undefined) {
  if (!session.metadata) return defaultValue;
  return (session.metadata as any)[field] !== undefined ? (session.metadata as any)[field] : defaultValue;
}

// Función de comprobación para verificar si un objeto tiene una estructura de metadata
function hasMetadata(obj: any): obj is SessionWithMetadata {
  return obj && typeof obj === 'object' && typeof obj.metadata === 'object';
}

// Device interface for the device selector
interface Device {
  id: number;
  name: string;
  type: 'camera' | 'sensor';
}

interface DeviceSelectorProps {
  sensors: any[];
  cameras: any[];
  value: Device[];
  onChange: (devices: Device[]) => void;
}

function DeviceSelector({ sensors, cameras, value, onChange }: DeviceSelectorProps) {
  const [selectedDevices, setSelectedDevices] = useState<Device[]>(value || []);
  const [page, setPage] = useState({ cameras: 1, sensors: 1 });
  const itemsPerPage = 4;
  
  // Estado de conexión MQTT para monitorizar sensores
  const { 
    isConnected: mqttConnected, 
    connectionError: mqttError,
    currentBroker: mqttBroker,
    reconnect: reconnectMqtt
  } = useSimpleMqtt();

  // Create typed arrays to avoid errors
  const typedSensors = Array.isArray(sensors) ? sensors : [];
  const typedCameras = Array.isArray(cameras) ? cameras : [];

  // Calculate pagination
  const camerasStartIndex = (page.cameras - 1) * itemsPerPage;
  const camerasEndIndex = camerasStartIndex + itemsPerPage;
  const camerasCurrentPage = typedCameras.slice(camerasStartIndex, camerasEndIndex);
  const cameraTotalPages = Math.ceil(typedCameras.length / itemsPerPage);

  const sensorsStartIndex = (page.sensors - 1) * itemsPerPage;
  const sensorsEndIndex = sensorsStartIndex + itemsPerPage;
  const sensorsCurrentPage = typedSensors.slice(sensorsStartIndex, sensorsEndIndex);
  const sensorTotalPages = Math.ceil(typedSensors.length / itemsPerPage);

  // Verificación de cámaras y estados
  const [camerasStatus, setCameraStatus] = useState<{[key: number]: boolean | null}>({});
  const [verifyingCamera, setVerifyingCamera] = useState<number | null>(null);

  // Obtener la sesión activa si existe
  const { data: sessions = [] } = useQuery<SessionWithMetadata[]>({
    queryKey: ['/api/sessions'],
  });
  const activeSession = sessions.find(s => s.status === 'active');
  const activeSessionId = activeSession?.id;
  
  // Obtener el queryClient para invalidar la caché
  const queryClient = useQueryClient();
  
  // Función para verificar si una cámara está online - Mejorada para sincronizar con camera-card.tsx
  const verifyCameraStatus = async (cameraId: number) => {
    setVerifyingCamera(cameraId);
    try {
      const response = await fetch(`/api/cameras/${cameraId}/ping`);
      const result = await response.json();
      
      // Actualizar el estado de la cámara, sincronizando la misma lógica que en camera-card.tsx
      // "connected" es el estado que usa el componente camera-card.tsx
      const isConnected = result.status === 'connected';
      
      setCameraStatus(prev => ({
        ...prev,
        [cameraId]: isConnected
      }));
      
      // Forzar una actualización de la caché global para mantener todos los componentes sincronizados
      if (queryClient) {
        queryClient.invalidateQueries({ queryKey: ["/api/cameras"] });
      }
      
      return isConnected;
    } catch (error) {
      console.error(`Error verificando cámara ${cameraId}:`, error);
      setCameraStatus(prev => ({
        ...prev,
        [cameraId]: false
      }));
      return false;
    } finally {
      setVerifyingCamera(null);
    }
  };

  const toggleDevice = async (device: Device, status?: 'online' | 'offline' | boolean) => {
    // Si es una cámara y no tenemos su estado, verificarlo primero
    if (device.type === 'camera' && camerasStatus[device.id] === undefined) {
      const isOnline = await verifyCameraStatus(device.id);
      
      // Si está offline, no permitir seleccionar
      if (!isOnline) {
        return;
      }
    } else if (device.type === 'camera' && status === false) {
      // No permitir seleccionar cámaras que estén offline
      return;
    }
    
    const isSelected = selectedDevices.some(d => d.id === device.id && d.type === device.type);
    
    let newSelection;
    if (isSelected) {
      // Simplemente eliminar el dispositivo de la selección
      newSelection = selectedDevices.filter(d => !(d.id === device.id && d.type === device.type));
    } else {
      // Simplemente añadir el dispositivo a la selección
      newSelection = [...selectedDevices, device];
    }
    
    setSelectedDevices(newSelection);
    onChange(newSelection);
  };

  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* Cameras table */}
      <div className="border rounded-lg p-4">
        <h4 className="text-sm font-medium mb-4">Cameras</h4>
        <div className="space-y-2">
          {camerasCurrentPage.map(camera => (
            <div
              key={`camera-${camera.id}`}
              className={`border rounded-md p-3 cursor-pointer ${
                selectedDevices.some(d => d.id === camera.id && d.type === 'camera')
                  ? 'bg-primary/10 border-primary'
                  : 'bg-card hover:bg-muted/50'
              }`}
              onClick={() => toggleDevice(
                { id: camera.id, name: camera.name, type: 'camera' },
                camera.status === 'online' || camera.status === true
              )}
            >
              <div className="flex items-center">
                <div className={`h-3 w-3 rounded-full mr-2 ${
                  selectedDevices.some(d => d.id === camera.id && d.type === 'camera')
                    ? 'bg-green-500' // Verde si está seleccionada
                    : verifyingCamera === camera.id
                      ? 'animate-pulse bg-yellow-400' // Amarillo parpadeante durante verificación
                      : camerasStatus[camera.id] === false
                        ? 'bg-red-500' // Rojo si verificada y offline
                        : camerasStatus[camera.id] === true
                          ? 'bg-green-500' // Verde si verificada y online
                          : 'bg-gray-400' // Gris por defecto (no verificada)
                }`}></div>
                <span className="text-sm font-medium">{camera.name}</span>
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {camera.ipAddress} 
                {verifyingCamera === camera.id && <span className="text-yellow-600 ml-1">(Verificando...)</span>}
                {camerasStatus[camera.id] === false && <span className="text-red-500 ml-1">(No responde)</span>}
              </div>
            </div>
          ))}
          {typedCameras.length === 0 && (
            <div className="text-center py-4 text-sm text-muted-foreground">
              No cameras available
            </div>
          )}
        </div>
        
        {cameraTotalPages > 1 && (
          <div className="flex justify-between items-center mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(prev => ({ ...prev, cameras: Math.max(1, prev.cameras - 1) }))}
              disabled={page.cameras === 1}
            >
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              {page.cameras} / {cameraTotalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(prev => ({ ...prev, cameras: Math.min(cameraTotalPages, prev.cameras + 1) }))}
              disabled={page.cameras === cameraTotalPages}
            >
              Next
            </Button>
          </div>
        )}
      </div>
      
      {/* Sensors table with MQTT status indicator */}
      <div className="border rounded-lg p-4">
        <div className="flex justify-between items-center mb-4">
          <h4 className="text-sm font-medium">Sensors</h4>
          
          {/* MQTT Connection Status Indicator using the component */}
          <MqttStatusIndicator />
        </div>

        <div className="space-y-2">
          {sensorsCurrentPage.map(sensor => (
            <div
              key={`sensor-${sensor.id}`}
              className={`border rounded-md p-3 cursor-pointer ${
                selectedDevices.some(d => d.id === sensor.id && d.type === 'sensor')
                  ? 'bg-primary/10 border-primary'
                  : 'bg-card hover:bg-muted/50'
              }`}
              onClick={() => toggleDevice({ id: sensor.id, name: sensor.name, type: 'sensor' })}
            >
              <div className="flex justify-between items-start">
                <div className="flex items-center">
                  <div className={`h-3 w-3 rounded-full mr-2 ${
                    selectedDevices.some(d => d.id === sensor.id && d.type === 'sensor')
                      ? 'bg-green-500' // Verde si está seleccionado
                      : 'bg-gray-400' // Gris por defecto
                  }`}></div>
                  <span className="text-sm font-medium">{sensor.name}</span>
                </div>
                <Badge variant="outline" className="text-xs">
                  {selectedDevices.some(d => d.id === sensor.id && d.type === 'sensor') ? 
                    'Selected' : 'Available'}
                </Badge>
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {sensor.type} {sensor.location ? `- ${sensor.location}` : ''}
              </div>
              <div className="text-xs text-blue-500 mt-1">
                Topic: {sensor.topic || `zigbee2mqtt/${sensor.name}`}
              </div>
            </div>
          ))}
          {typedSensors.length === 0 && (
            <div className="text-center py-4 text-sm text-muted-foreground">
              No sensors available
            </div>
          )}
        </div>
        
        {sensorTotalPages > 1 && (
          <div className="flex justify-between items-center mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(prev => ({ ...prev, sensors: Math.max(1, prev.sensors - 1) }))}
              disabled={page.sensors === 1}
            >
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              {page.sensors} / {sensorTotalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(prev => ({ ...prev, sensors: Math.min(sensorTotalPages, prev.sensors + 1) }))}
              disabled={page.sensors === sensorTotalPages}
            >
              Next
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

// Component for filtering sessions
interface SessionFilters {
  search: string;
  searchTags: string[];
  status: string[];
  dateRange: { from: Date | undefined; to: Date | undefined };
  timeRange: { from: string | undefined; to: string | undefined };
  tags: string[];
}

interface SessionFiltersComponentProps {
  onFilterChange: (filters: SessionFilters) => void;
}

function SessionFiltersComponent({ onFilterChange }: SessionFiltersComponentProps) {
  const [search, setSearch] = useState('');
  const [searchTags, setSearchTags] = useState<string[]>([]);
  const [newSearchTag, setNewSearchTag] = useState('');
  
  const [status, setStatus] = useState<string[]>([]);
  
  // Date filtering
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({ from: undefined, to: undefined });
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  
  // Time filtering
  const [timeRange, setTimeRange] = useState<{ from: string | undefined; to: string | undefined }>({ from: undefined, to: undefined });
  const [startTime, setStartTime] = useState<string>('');
  const [endTime, setEndTime] = useState<string>('');
  
  const [tags, setTags] = useState<string[]>([]);

  // Combined update for date and time ranges
  const updateDateTimeRanges = () => {
    // Update date range
    const newDateRange = { 
      from: startDate ? new Date(startDate) : undefined, 
      to: endDate ? new Date(endDate) : undefined 
    };
    
    if (newDateRange.from && newDateRange.to && newDateRange.from > newDateRange.to) {
      // If from date is after to date, swap them
      const temp = newDateRange.from;
      newDateRange.from = newDateRange.to;
      newDateRange.to = temp;
      
      // Update the input fields to match
      setStartDate(endDate);
      setEndDate(startDate);
    }
    
    setDateRange(newDateRange);
    
    // Update time range
    setTimeRange({
      from: startTime || undefined,
      to: endTime || undefined
    });
  };
  
  // Function to handle adding search tags (keywords)
  const handleAddSearchTag = () => {
    if (newSearchTag && !searchTags.includes(newSearchTag)) {
      setSearchTags([...searchTags, newSearchTag]);
      setNewSearchTag('');
    }
  };
  
  // Function to remove a search tag
  const handleRemoveSearchTag = (tag: string) => {
    setSearchTags(searchTags.filter(t => t !== tag));
  };

  // Update filters when values change
  React.useEffect(() => {
    onFilterChange({
      search,
      searchTags,
      status,
      dateRange,
      timeRange,
      tags
    });
  }, [search, searchTags, status, dateRange, timeRange, tags, onFilterChange]);

  return (
    <div className="bg-slate-50 p-4 rounded-md mb-6">
      <div className="space-y-4">
        {/* Advanced search */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Label htmlFor="filter-search" className="text-sm font-medium">Search</Label>
          </div>
          <div className="relative">
            <Input
              id="filter-search"
              placeholder="Enter keywords separated by space or comma..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                // Auto-generate search tags from space or comma-separated words
                if (e.target.value.trim()) {
                  const tags = e.target.value.trim().split(/\s+|,\s*/);
                  // Always set the tags, even if just one word
                  setSearchTags(tags.filter(tag => tag.length > 0));
                } else {
                  setSearchTags([]);
                }
              }}
              className=""
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-muted-foreground">
              <Search className="h-4 w-4" />
            </div>
          </div>
          
          {searchTags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {searchTags.map((tag, index) => (
                <Badge key={index} variant="secondary" className="px-2 py-1 flex items-center gap-1">
                  {tag}
                  <X 
                    className="h-3 w-3 cursor-pointer ml-1" 
                    onClick={() => handleRemoveSearchTag(tag)}
                  />
                </Badge>
              ))}
            </div>
          )}
        </div>
        
        {/* Date and Time Range */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="md:col-span-12">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Label className="text-sm font-medium">Date & Time Range</Label>
            </div>
            <div className="grid grid-cols-4 gap-2">
              <div className="col-span-2 md:col-span-1">
                <Input 
                  type="date" 
                  placeholder="From date" 
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    updateDateTimeRanges();
                  }}
                />
              </div>
              <div className="col-span-2 md:col-span-1">
                <Input 
                  type="time" 
                  placeholder="From time" 
                  value={startTime}
                  onChange={(e) => {
                    setStartTime(e.target.value);
                    updateDateTimeRanges();
                  }}
                />
              </div>
              <div className="col-span-2 md:col-span-1">
                <Input 
                  type="date" 
                  placeholder="To date" 
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    updateDateTimeRanges();
                  }}
                />
              </div>
              <div className="col-span-2 md:col-span-1">
                <Input 
                  type="time" 
                  placeholder="To time" 
                  value={endTime}
                  onChange={(e) => {
                    setEndTime(e.target.value);
                    updateDateTimeRanges();
                  }}
                />
              </div>
            </div>
          </div>
        </div>
        
        {/* Status */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
            <Label className="text-sm font-medium">Status</Label>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge
              variant={status.includes('completed') ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => {
                if (status.includes('completed')) {
                  setStatus(status.filter(s => s !== 'completed'));
                } else {
                  setStatus([...status, 'completed']);
                }
              }}
            >
              Completed
            </Badge>
            <Badge
              variant={status.includes('error') ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => {
                if (status.includes('error')) {
                  setStatus(status.filter(s => s !== 'error'));
                } else {
                  setStatus([...status, 'error']);
                }
              }}
            >
              Error
            </Badge>
          </div>
        </div>
        
        {/* Clear button */}
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSearch('');
              setSearchTags([]);
              setNewSearchTag('');
              setStatus([]);
              setStartDate('');
              setEndDate('');
              setStartTime('');
              setEndTime('');
              setDateRange({ from: undefined, to: undefined });
              setTimeRange({ from: undefined, to: undefined });
              setTags([]);
            }}
          >
            Clear All Filters
          </Button>
        </div>
      </div>
    </div>
  );
}

// InfluxDB Configuration Dialog Component
function InfluxDBConfigDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="text-sm">
          <ExternalLink className="h-4 w-4 mr-2" />
          InfluxDB Configuration
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>InfluxDB Configuration</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label className="text-sm font-medium">Server URL</Label>
            <div className="flex gap-2">
              <Input 
                value="http://influxdb:8086"
                disabled
                className="bg-slate-50"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              The URL is configured in the server environment variables
            </p>
          </div>
          
          <div className="grid gap-2">
            <Label className="text-sm font-medium">Organization</Label>
            <div className="flex gap-2">
              <Input 
                value="lisa"
                disabled
                className="bg-slate-50"
              />
            </div>
          </div>
          
          <div className="grid gap-2">
            <Label className="text-sm font-medium">Default Bucket</Label>
            <div className="flex gap-2">
              <Input 
                value="mqtt_data"
                disabled
                className="bg-slate-50"
              />
            </div>
          </div>
          
          <div className="grid gap-2">
            <Label className="text-sm font-medium">Retention Policy</Label>
            <div className="flex gap-2">
              <Input 
                value="90 days"
                disabled
                className="bg-slate-50"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Data is retained for 90 days before being automatically deleted
            </p>
          </div>
        </div>
        <div className="flex justify-end">
          <Button variant="outline">
            Verify Connection
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Participant Tag component
interface ParticipantTagProps {
  participant: string;
  onRemove: () => void;
}

function ParticipantTag({ participant, onRemove }: ParticipantTagProps) {
  return (
    <Badge variant="secondary" className="p-1.5 flex items-center gap-1">
      <Users className="h-3 w-3 mr-1" />
      {participant}
      <X 
        className="h-3 w-3 cursor-pointer" 
        onClick={onRemove}
      />
    </Badge>
  );
}

// Componente de temporizador para sesiones activas
interface ActiveSessionTimerProps {
  startTime: Date | string;
}

function ActiveSessionTimer({ startTime }: ActiveSessionTimerProps) {
  const [elapsedTime, setElapsedTime] = useState<string>("00:00:00");
  
  useEffect(() => {
    const startTimeDate = typeof startTime === 'string' ? new Date(startTime) : startTime;
    
    // Función para actualizar el tiempo transcurrido
    const updateElapsedTime = () => {
      const now = new Date();
      const diffInSeconds = Math.floor((now.getTime() - startTimeDate.getTime()) / 1000);
      
      const hours = Math.floor(diffInSeconds / 3600);
      const minutes = Math.floor((diffInSeconds % 3600) / 60);
      const seconds = diffInSeconds % 60;
      
      setElapsedTime(
        `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      );
    };
    
    // Actualizar inmediatamente y luego cada segundo
    updateElapsedTime();
    const intervalId = setInterval(updateElapsedTime, 1000);
    
    // Limpiar el intervalo cuando el componente se desmonte
    return () => clearInterval(intervalId);
  }, [startTime]);
  
  return (
    <div className="bg-white border border-blue-300 rounded-md px-3 py-1 flex items-center space-x-2">
      <Clock className="h-4 w-4 text-blue-500" />
      <span className="font-mono text-sm text-blue-700 font-medium">{elapsedTime}</span>
    </div>
  );
}

// Main session management component
export function NewSessionContent() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDeveloperMode] = useDeveloperMode();
  
  // Estado de conexión MQTT para monitorizar sensores
  const { 
    isConnected: mqttConnected, 
    connectionError: mqttError,
    currentBroker: mqttBroker,
    reconnect: reconnectMqtt
  } = useSimpleMqtt();

  // State for session tags
  const [sessionTags, setSessionTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  
  // State for selected devices
  const [selectedDevices, setSelectedDevices] = useState<Device[]>([]);
  
  // State for researcher and participants
  const [researcher, setResearcher] = useState('');
  const [participants, setParticipants] = useState<string[]>([]);
  const [newParticipant, setNewParticipant] = useState('');
  
  // State for description with character limit
  const [description, setDescription] = useState('');
  const MAX_DESCRIPTION_LENGTH = 300;
  
  // State for start time
  const [startTime, setStartTime] = useState<Date | null>(null);
  
  // Query active sessions
  const { data: sessions = [] } = useQuery<SessionWithMetadata[]>({
    queryKey: ['/api/sessions'],
  });
  
  // Query cameras
  const { data: cameras = [] } = useQuery({
    queryKey: ['/api/cameras'],
  });
  
  // Query sensors
  const { data: sensors = [] } = useQuery({
    queryKey: ['/api/zigbee/devices'],
  });
  
  // Get active session if it exists
  const activeSession = sessions.find(s => s.status === 'active');
  
  // Mutation to create a new session
  const createSessionMutation = useMutation({
    mutationFn: async (sessionData: InsertSession) => {
      const res = await apiRequest("POST", "/api/sessions", sessionData);
      if (!res.ok) {
        const errorData = await res.json();
        // Si es un error de nombre duplicado
        if (errorData.error === 'Nombre duplicado') {
          throw new Error(errorData.message);
        }
        throw new Error("Error creating session");
      }
      return await res.json();
    },
    onSuccess: async (newSession) => {
      queryClient.invalidateQueries({ queryKey: ['/api/sessions'] });
      
      // Iniciar grabación para todas las cámaras seleccionadas
      const camerasToRecord = selectedDevices.filter(dev => dev.type === 'camera');
      if (camerasToRecord.length > 0) {
        try {
          toast({
            title: "Starting cameras",
            description: `Starting recording for ${camerasToRecord.length} camera(s)`,
          });
          
          // Iniciar grabación para cada cámara seleccionada
          for (const cameraDevice of camerasToRecord) {
            try {
              const response = await fetch(`/api/cameras/${cameraDevice.id}/record`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  sessionId: newSession.id
                })
              });
              
              if (!response.ok) {
                console.error(`Error starting recording for camera ${cameraDevice.id}`);
                toast({
                  title: "Recording error",
                  description: `Could not start recording for camera ${cameraDevice.name}`,
                  variant: "destructive",
                });
              } else {
                console.log(`Recording started for camera ${cameraDevice.id}`);
              }
            } catch (error) {
              console.error(`Error starting recording:`, error);
            }
          }
        } catch (error) {
          console.error('Error starting recordings:', error);
        }
      }
      
      toast({
        title: "Session created",
        description: "The session has been created successfully. Recordings started.",
      });
      
      resetForm();
    },
    onError: (error: Error) => {
      // Mostrar el mensaje específico del servidor
      toast({
        title: "Error creating session",
        description: error.message,
        variant: "destructive",
      });
      
      // Si es un error de nombre duplicado, marcar el campo como inválido
      if (error.message.includes("Ya existe una sesión con el nombre")) {
        const nameInput = document.getElementById('session-name') as HTMLInputElement;
        if (nameInput) {
          nameInput.classList.add('border-red-500');
          nameInput.focus();
        }
      }
    }
  });
  
  // Mutation to update session status
  const updateSessionStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number, status: string }) => {
      const res = await apiRequest("PATCH", `/api/sessions/${id}`, { status });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/sessions'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating session",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Function to toggle session status
  // Manejar estado del botón 'Stop Session' para evitar múltiples clics
  const [stoppingSession, setStoppingSession] = useState<boolean>(false);

  const toggleSessionStatus = async (session: SessionWithMetadata) => {
    // Evitar múltiples clics
    if (stoppingSession) return;
    
    // Marcar la operación como en progreso
    setStoppingSession(true);
    
    // No usaremos el toast para feedback progresivo, sino para notificar estados clave
    // Mostramos un toast inicial
    toast({
      title: "Stopping session",
      description: "Please wait while all recordings are being stopped...",
      duration: 10000, // Aumenta la duración para evitar que desaparezca antes de completar
    });
    
    // Detener grabación de todas las cámaras asociadas a la sesión
    try {
      // Primero detener la sesión usando la API para que el servidor comience el proceso
      // Esto es importante para asegurar que el servidor maneje el proceso completo
      try {
        const stopSessionResponse = await fetch(`/api/sessions/${session.id}/finalize`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
        
        // Verificar si la solicitud principal de detención fue exitosa
        if (stopSessionResponse.ok) {
          console.log(`Session ${session.id} finalized successfully via server`);
        } else {
          console.warn(`Server responded with ${stopSessionResponse.status} when finalizing session`);
        }
      } catch (serverError) {
        console.error('Error sending stop request to server:', serverError);
      }
      
      // También intentamos detener cada cámara individualmente como respaldo
      const sessionMetadata = session.metadata || {};
      const sessionDevices = sessionMetadata.devices || { cameras: [], sensors: [] };
      const sessionCameras = Array.isArray(sessionDevices) 
        ? sessionDevices.filter((d: any) => d.type === 'camera')
        : sessionDevices.cameras || [];
      
      // Variables para seguimiento de progresos
      let completedCameras = 0;
      const totalCameras = sessionCameras.length;
      
      if (sessionCameras && sessionCameras.length > 0) {
        console.log(`Stopping recording for ${sessionCameras.length} camera(s)`);
        
        // Promises para detener todas las cámaras en paralelo
        const stopPromises = sessionCameras.map(async (cameraDevice) => {
          try {
            const response = await fetch(`/api/cameras/${cameraDevice.id}/stop-recording`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
            });
            
            completedCameras++;
            // Mostrar progreso en consola pero no actualizamos toast para evitar problemas
            console.log(`Stopped recording for ${completedCameras}/${totalCameras} cameras...`);
            
            return { cameraId: cameraDevice.id, success: response.ok };
          } catch (error) {
            console.error(`Error stopping recording for camera ${cameraDevice.id}:`, error);
            return { cameraId: cameraDevice.id, success: false, error };
          }
        });
        
        // Esperar a que todas las detenciones terminen (exitosas o no)
        const results = await Promise.allSettled(stopPromises);
        const failedCameras = results
          .filter(result => result.status === 'fulfilled' && !(result.value as any).success)
          .map(result => (result.status === 'fulfilled' ? (result.value as any).cameraId : null))
          .filter(Boolean);
        
        if (failedCameras.length > 0) {
          console.warn(`Failed to stop recording for ${failedCameras.length} cameras:`, failedCameras);
        }
      }
      
      // Actualizar el estado de la sesión a 'completed'
      updateSessionStatusMutation.mutate({ id: session.id, status: 'completed' }, {
        onSuccess: (data) => {
          // Desmarcar la operación como en progreso
          setStoppingSession(false);
          
          // Actualizar el cache para reflejar los cambios inmediatamente
          queryClient.invalidateQueries({ queryKey: ['/api/sessions'] });
          
          // Mostrar notificación verde cuando se completa una sesión
          toast({
            title: "Session Completed",
            description: 
              `Session "${session.name}" has been completed successfully. 
               The recorded data is now available in the Historical Sessions tab.`,
            className: "bg-green-50 text-green-800 border-green-300",
          });
        },
        onError: (error) => {
          // Desmarcar la operación como en progreso incluso en caso de error
          setStoppingSession(false);
          console.error('Error updating session status:', error);
        }
      });
    } catch (error) {
      // Desmarcar la operación como en progreso en caso de error
      setStoppingSession(false);
      console.error('Error stopping session recordings:', error);
      toast({
        title: "Error",
        description: "Failed to stop recordings. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  // Function to export sensor data
  const handleExportSensorData = async (sessionId: number, format: 'json' | 'csv') => {
    try {
      const res = await apiRequest("GET", `/api/sessions/${sessionId}/export/sensors?format=${format}`);
      const blob = await res.blob();
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `session-${sessionId}-sensors.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      
      toast({
        title: "Export completed",
        description: `Sensor data exported in ${format.toUpperCase()} format`,
      });
    } catch (error) {
      toast({
        title: "Export error",
        description: "Failed to export sensor data",
        variant: "destructive",
      });
    }
  };
  
  // Function to export all data
  const handleExportAllData = async (sessionId: number) => {
    try {
      const res = await apiRequest("GET", `/api/sessions/${sessionId}/export/all`);
      const blob = await res.blob();
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `session-${sessionId}-all.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      
      toast({
        title: "Export completed",
        description: "All data exported successfully",
      });
    } catch (error) {
      toast({
        title: "Export error",
        description: "Failed to export data",
        variant: "destructive",
      });
    }
  };
  
  // Function to add a tag
  const handleAddTag = () => {
    if (newTag && !sessionTags.includes(newTag)) {
      setSessionTags([...sessionTags, newTag]);
      setNewTag('');
    }
  };
  
  // Function to remove a tag
  const handleRemoveTag = (tag: string) => {
    setSessionTags(sessionTags.filter(t => t !== tag));
  };
  
  // Function to add a participant
  const handleAddParticipant = () => {
    if (newParticipant && !participants.includes(newParticipant)) {
      setParticipants([...participants, newParticipant]);
      setNewParticipant('');
    }
  };
  
  // Function to remove a participant
  const handleRemoveParticipant = (participant: string) => {
    setParticipants(participants.filter(p => p !== participant));
  };
  
  // Function to create a new session
  const handleCreateSession = () => {
    const sessionName = document.getElementById('session-name') ? (document.getElementById('session-name') as HTMLInputElement).value : '';
    
    // Validations
    if (!sessionName) {
      toast({
        title: "Error",
        description: "Session name is required",
        variant: "destructive",
      });
      return;
    }
    
    if (!researcher) {
      toast({
        title: "Error",
        description: "Researcher name is required",
        variant: "destructive",
      });
      return;
    }
    
    if (participants.length === 0) {
      toast({
        title: "Error",
        description: "At least one participant name is required",
        variant: "destructive",
      });
      return;
    }
    
    if (selectedDevices.length === 0) {
      toast({
        title: "Error",
        description: "You must select at least one camera or sensor",
        variant: "destructive",
      });
      return;
    }
    
    // Check if there's already an active session
    if (activeSession) {
      toast({
        title: "Error",
        description: "There is already an active session. Please end it before starting a new one.",
        variant: "destructive",
      });
      return;
    }
    
    const sessionData: InsertSession = {
      name: sessionName,
      description: description,
      status: 'active',
      startTime: startTime || new Date(),
      metadata: { 
        devices: selectedDevices,
        researcher: researcher,
        participants: participants
      },
      tags: sessionTags,
      userId: 1, // Default user
      influxDb: {
        bucket: 'lisa_session_' + Date.now(),
        org: 'lisa',
        retention: 90
      }
    };

    createSessionMutation.mutate(sessionData);
  };
  
  // Function to reset the form
  const resetForm = () => {
    const nameInput = document.getElementById('session-name') as HTMLInputElement;
    
    if (nameInput) nameInput.value = '';
    
    setDescription('');
    setSessionTags([]);
    setNewTag('');
    setSelectedDevices([]);
    setStartTime(null);
    setResearcher('');
    setParticipants([]);
    setNewParticipant('');
  };

  return (
    <div className="space-y-6">
      {/* Form to create a new session */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Create New Session</CardTitle>
          <CardDescription>
            Configure a new session to record data from cameras and sensors
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Basic info */}
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="session-name">Session name</Label>
                <Input 
                  id="session-name" 
                  placeholder="Enter a descriptive name"
                  className="mt-1"
                />
              </div>
              
              <div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="session-tags">Tags</Label>
                  <Tag className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex gap-2 mt-1">
                  <Input
                    id="session-tags"
                    placeholder="Add tag..."
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddTag();
                      }
                    }}
                  />
                  <Button type="button" variant="secondary" onClick={handleAddTag}>
                    Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {sessionTags.map((tag, index) => (
                    <Badge key={index} variant="secondary" className="p-1.5 flex items-center gap-1">
                      <Tag className="h-3 w-3 mr-1" />
                      {tag}
                      <X 
                        className="h-3 w-3 cursor-pointer" 
                        onClick={() => handleRemoveTag(tag)}
                      />
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Researcher and Participant */}
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="researcher-name">Researcher name</Label>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </div>
                <Input 
                  id="researcher-name" 
                  placeholder="Enter researcher name"
                  className="mt-1"
                  value={researcher}
                  onChange={(e) => setResearcher(e.target.value)}
                />
              </div>
              
              <div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="participant-name">Lab participants</Label>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex gap-2 mt-1">
                  <Input 
                    id="participant-name" 
                    placeholder="Add participant..."
                    value={newParticipant}
                    onChange={(e) => setNewParticipant(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddParticipant();
                      }
                    }}
                  />
                  <Button type="button" variant="secondary" onClick={handleAddParticipant}>
                    Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {participants.map((participant, index) => (
                    <ParticipantTag 
                      key={index} 
                      participant={participant} 
                      onRemove={() => handleRemoveParticipant(participant)} 
                    />
                  ))}
                </div>
              </div>
            </div>
            
            {/* Description */}
            <div className="grid gap-2">
              <Label htmlFor="session-description">Description</Label>
              <Textarea 
                id="session-description" 
                placeholder="Describe the purpose of this session..." 
                className="h-20"
                value={description}
                onChange={(e) => {
                  if (e.target.value.length <= MAX_DESCRIPTION_LENGTH) {
                    setDescription(e.target.value);
                  }
                }}
                maxLength={MAX_DESCRIPTION_LENGTH}
              />
              <div className="text-xs text-right text-muted-foreground">
                {description.length}/{MAX_DESCRIPTION_LENGTH} characters
              </div>
            </div>
            
            {/* Devices */}
            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label>Select Devices</Label>
                <div className="text-sm text-muted-foreground">
                  {selectedDevices.length} selected
                </div>
              </div>
              <DeviceSelector 
                sensors={Array.isArray(sensors) ? sensors : []}
                cameras={Array.isArray(cameras) ? cameras : []}
                onChange={setSelectedDevices}
                value={selectedDevices}
              />
              <Collapsible>
                <CollapsibleTrigger asChild>
                  <Button variant="outline" size="sm" className="mt-2 text-amber-600 border-amber-300 hover:bg-amber-50">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    <span>Info</span>
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="absolute z-10 mt-2 bg-white border border-amber-200 rounded-md shadow-lg p-4 max-w-lg">
                  <div className="bg-amber-50 text-amber-800 rounded-md text-sm border border-amber-200 p-4">
                    <div className="flex items-start">
                      <AlertCircle className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0 text-amber-600" />
                      <div>
                        <p className="font-medium">Recording and Data Capture</p>
                        <p className="mt-1">The selected devices will be recorded throughout the entire session.</p>
                        <ul className="mt-2 space-y-1 list-disc list-inside ml-2">
                          <li>Cameras will record synchronously in high-quality format</li>
                          <li>Sensors will capture data from all configured MQTT topics</li>
                          <li>Sensor data is stored with friendly names to facilitate identification</li>
                          <li>All sensor data is captured in both raw format and structured CSV format</li>
                          <li>All material will be downloadable as a single ZIP file that includes videos and data</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>
            
            {/* InfluxDB - Solo visible en modo desarrollador */}
            {isDeveloperMode && (
              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <Label>InfluxDB Configuration</Label>
                  <InfluxDBConfigDialog />
                </div>
                <div className="bg-slate-50 p-3 rounded-md">
                  <div className="flex items-center mb-2">
                    <Timer className="h-4 w-4 mr-2 text-gray-500" />
                    <span className="text-sm font-medium">Data retention: 90 days</span>
                  </div>
                  <div className="flex items-center">
                    <Database className="h-4 w-4 mr-2 text-gray-500" />
                    <span className="text-sm font-medium">
                      Bucket: lisa_session_{Date.now()}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Data from this session will be stored in a dedicated bucket with a 90-day retention policy
                  </p>
                </div>
              </div>
            )}
            
            {/* Indicación de almacenamiento de datos (visible para todos) */}
            {!isDeveloperMode && (
              <div className="grid gap-2">
                <div className="flex items-center">
                  <Label>Data Storage</Label>
                </div>
                <div className="bg-slate-50 p-3 rounded-md">
                  <div className="flex items-center mb-2">
                    <Timer className="h-4 w-4 mr-2 text-gray-500" />
                    <span className="text-sm font-medium">Data retention: 90 days</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    All sensor data and recordings will be stored securely for 90 days
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex justify-center border-t pt-4">
          <Button 
            variant="outline" 
            className="w-full md:w-auto bg-white hover:bg-slate-50"
            onClick={handleCreateSession}
            disabled={createSessionMutation.isPending || activeSession !== undefined}
          >
            {createSessionMutation.isPending ? (
              <>
                <div className="animate-spin h-4 w-4 mr-2 border-t-2 border-b-2 border-blue-500 rounded-full"></div>
                Creating...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2 text-blue-500" />
                Start New Session
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
      
      {/* Active session (if exists) */}
      {activeSession && (
        <Card className="border-blue-300 bg-blue-50 shadow-md relative">
          <CardHeader className="pb-3 border-b border-blue-200">
            <div className="flex justify-between items-center">
              <div>
                <Badge variant="default" className="bg-green-500 mb-2">Active Session</Badge>
                <CardTitle className="text-xl">{activeSession.name}</CardTitle>
                {activeSession.description && (
                  <CardDescription>{activeSession.description}</CardDescription>
                )}
              </div>
              <div className="flex gap-2 items-center">
                <ActiveSessionTimer startTime={activeSession.startTime} />
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => toggleSessionStatus(activeSession)}
                  className="bg-white border-red-300 hover:bg-red-50 text-red-600"
                  disabled={stoppingSession}
                >
                  {stoppingSession ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Stopping...
                    </>
                  ) : (
                    <>
                      <Square className="h-4 w-4 mr-2" />
                      End Session
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <div>
                <h4 className="text-sm font-medium text-gray-600 mb-1">Start date</h4>
                <p className="text-sm">
                  {format(new Date(activeSession.startTime), "dd/MM/yyyy HH:mm", { locale: enUS })}
                </p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-600 mb-1">Researcher</h4>
                <p className="text-sm">
                  {activeSession.metadata?.researcher || "Not specified"}
                </p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-600 mb-1">Participants</h4>
                <div className="flex flex-wrap gap-1">
                  {activeSession.metadata?.participants && Array.isArray(activeSession.metadata.participants) && activeSession.metadata.participants.length > 0 ? (
                    activeSession.metadata.participants.map((participant: string, index: number) => (
                      <Badge key={index} variant="outline" className="text-xs bg-white">
                        <Users className="h-3 w-3 mr-1" />
                        {participant}
                      </Badge>
                    ))
                  ) : (
                    activeSession.metadata?.participant ? (
                      <Badge variant="outline" className="text-xs bg-white">
                        <Users className="h-3 w-3 mr-1" />
                        {activeSession.metadata.participant}
                      </Badge>
                    ) : (
                      <span className="text-xs text-gray-500">No participants</span>
                    )
                  )}
                </div>
              </div>
              {/* InfluxDB info - only visible in developer mode */}
              {isDeveloperMode && (
                <div>
                  <h4 className="text-sm font-medium text-gray-600 mb-1">
                    <Database className="h-3 w-3 inline mr-1" />
                    InfluxDB Bucket
                  </h4>
                  <p className="text-sm">
                    {activeSession.influxDb ? (
                      <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-300">
                        {activeSession.influxDb.bucket}
                      </Badge>
                    ) : "Not configured"}
                  </p>
                </div>
              )}
            </div>
            
            <div className="mt-4">
              <h4 className="text-sm font-medium text-gray-600 mb-1">Tags</h4>
              <div className="flex flex-wrap gap-1">
                {activeSession.tags && activeSession.tags.length > 0 ? (
                  activeSession.tags.map((tag: string, index: number) => (
                    <Badge key={index} variant="outline" className="text-xs bg-white">
                      <Tag className="h-3 w-3 mr-1" />
                      {tag}
                    </Badge>
                  ))
                ) : (
                  <span className="text-xs text-gray-500">No tags</span>
                )}
              </div>
            </div>
            
            <div className="flex justify-end gap-2 border-t border-blue-200 pt-4 mt-4">
              <div className="w-full text-sm text-blue-600 italic">
                <InfoIcon className="h-4 w-4 inline mr-1" />
                Después de finalizar esta sesión, podrá descargar todos los datos desde la pestaña "Historical Sessions"
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export function HistoricalSessionsContent() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDeveloperMode] = useDeveloperMode();
  
  // State for filtering sessions
  const [filters, setFilters] = useState<SessionFilters>({
    search: '',
    searchTags: [],
    status: [],
    dateRange: { from: undefined, to: undefined },
    timeRange: { from: undefined, to: undefined },
    tags: []
  });
  
  // Query sessions
  const { data: sessions = [] } = useQuery<SessionWithMetadata[]>({
    queryKey: ['/api/sessions'],
  });
  
  // Mutation to update session status
  const updateSessionStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number, status: string }) => {
      const res = await apiRequest("PATCH", `/api/sessions/${id}`, { status });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/sessions'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating session",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Mutation to delete a session
  const deleteSessionMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/sessions/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/sessions'] });
      toast({
        title: "Session deleted",
        description: "The session has been deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error deleting session",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Function to export all data
  const handleExportAllData = async (sessionId: number) => {
    try {
      const res = await apiRequest("GET", `/api/sessions/${sessionId}/export/all`);
      const blob = await res.blob();
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `session-${sessionId}-all.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      
      toast({
        title: "Export completed",
        description: "All data exported successfully",
      });
    } catch (error) {
      toast({
        title: "Export error",
        description: "Failed to export data",
        variant: "destructive",
      });
    }
  };
  
  // Helper function to check if a time string matches a time range
  const timeInRange = (timeStr: string, range: { from?: string, to?: string }): boolean => {
    if (!range.from && !range.to) return true;
    
    const time = timeStr.split('T')[1]?.substring(0, 5) || ''; // Extract HH:MM from ISO string
    
    if (range.from && range.to) {
      return time >= range.from && time <= range.to;
    } else if (range.from) {
      return time >= range.from;
    } else if (range.to) {
      return time <= range.to!;
    }
    
    return true;
  };
  
  // Helper function to check if session metadata or details contain a search term
  const searchInMetadata = (session: SessionWithMetadata, searchTerm: string): boolean => {
    const term = searchTerm.toLowerCase();
    
    // Check name and description (already done in the main filter)
    if (
      session.name.toLowerCase().includes(term) || 
      (session.description && session.description.toLowerCase().includes(term))
    ) {
      return true;
    }
    
    // Check researcher name
    if (session.metadata?.researcher && session.metadata.researcher.toLowerCase().includes(term)) {
      return true;
    }
    
    // Check participants
    if (session.metadata?.participant && session.metadata.participant.toLowerCase().includes(term)) {
      return true;
    }
    
    if (session.metadata?.participants && Array.isArray(session.metadata.participants)) {
      if (session.metadata.participants.some(p => p.toLowerCase().includes(term))) {
        return true;
      }
    }
    
    // Check tags
    if (session.tags && Array.isArray(session.tags)) {
      if (session.tags.some(tag => tag.toLowerCase().includes(term))) {
        return true;
      }
    }
    
    // Check device names
    if (session.metadata?.devices && Array.isArray(session.metadata.devices)) {
      if (session.metadata.devices.some(device => device.name.toLowerCase().includes(term))) {
        return true;
      }
    }
    
    return false;
  };
  
  // Filter sessions based on selected criteria
  const filteredSessions = sessions.filter(session => {
    // Text search filter - check in name, description, and metadata
    let matchesSearch = !filters.search;
    
    if (filters.search) {
      matchesSearch = searchInMetadata(session, filters.search);
    }
    
    // Search tags filter - all tags must match something in the session
    let matchesSearchTags = filters.searchTags.length === 0;
    
    if (filters.searchTags.length > 0) {
      matchesSearchTags = filters.searchTags.every(tag => searchInMetadata(session, tag));
    }
    
    // Status filter
    const matchesStatus = filters.status.length === 0 || filters.status.includes(session.status);
    
    // Date filter - mostrar todas las sesiones si no hay fecha seleccionada
    // IMPORTANT: Default behavior is now to show ALL historical sessions without date limitation
    let matchesDate = true;
    if (filters.dateRange.from) {
      const sessionDate = typeof session.startTime === 'string' 
        ? new Date(session.startTime) 
        : session.startTime;
      
      if (filters.dateRange.to) {
        // Full range only applied when user explicitly selects both dates
        matchesDate = (
          sessionDate >= filters.dateRange.from
        ) && (
          sessionDate <= filters.dateRange.to
        );
      } else {
        // If only start date is provided, show sessions from that date forward
        matchesDate = sessionDate >= filters.dateRange.from;
      }
    }
    
    // Time filter
    let matchesTime = true;
    if (filters.timeRange.from || filters.timeRange.to) {
      const sessionTimeStr = typeof session.startTime === 'string' 
        ? session.startTime
        : session.startTime.toISOString();
      
      // Implementación de timeInRange
      const timeInRange = (dateTimeStr: string, range: { from?: string; to?: string }) => {
        try {
          const sessionDate = new Date(dateTimeStr);
          
          // Extract time from the date
          const sessionHours = sessionDate.getHours();
          const sessionMinutes = sessionDate.getMinutes();
          const sessionTimeInMinutes = sessionHours * 60 + sessionMinutes;
          
          // Process from time if provided
          if (range.from) {
            const [fromHours, fromMinutes] = range.from.split(':').map(Number);
            const fromTimeInMinutes = fromHours * 60 + fromMinutes;
            
            if (sessionTimeInMinutes < fromTimeInMinutes) {
              return false;
            }
          }
          
          // Process to time if provided
          if (range.to) {
            const [toHours, toMinutes] = range.to.split(':').map(Number);
            const toTimeInMinutes = toHours * 60 + toMinutes;
            
            if (sessionTimeInMinutes > toTimeInMinutes) {
              return false;
            }
          }
          
          return true;
        } catch (error) {
          console.error('Error parsing time:', error);
          return true; // Default to showing the session if there's an error
        }
      };
      
      matchesTime = timeInRange(sessionTimeStr, filters.timeRange);
    }
    
    // Tags filter
    const matchesTags = filters.tags.length === 0 || 
      (session.tags && Array.isArray(session.tags) && filters.tags.every(tag => session.tags!.includes(tag)));
    
    return matchesSearch && matchesSearchTags && matchesStatus && matchesDate && matchesTime && matchesTags;
  })
  // Mostrar todas las sesiones excepto las activas
  .filter(s => s.status !== 'active')
  // Ordenar por fecha de inicio (más recientes primero)
  .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());

  return (
    <div className="space-y-6">
      {/* Filters for historical sessions */}
      <div className="mb-4">
        <h3 className="text-lg font-semibold mb-4">Session History</h3>
        <SessionFiltersComponent onFilterChange={setFilters} />
      </div>
      
      {/* Table of historical sessions (excluding active ones) */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Sessions ({filteredSessions.length})</CardTitle>
          <CardDescription>
            List of all completed recording and monitoring sessions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Start date</TableHead>
                <TableHead>People</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Tags</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSessions.length > 0 ? (
                filteredSessions.map((session) => (
                  <TableRow key={session.id}>
                    <TableCell className="font-medium">
                      <div>
                        {session.name}
                        {session.description && (
                          <p className="text-xs text-gray-500 truncate max-w-[15rem]">
                            {session.description.length > 60 ? 
                              `${session.description.substring(0, 60)}...` : 
                              session.description
                            }
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {format(new Date(session.startTime), "dd/MM/yyyy HH:mm", { locale: enUS })}
                      {session.endTime && (
                        <div className="text-xs text-gray-500">
                          End: {format(new Date(session.endTime), "dd/MM/yyyy HH:mm", { locale: enUS })}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="text-xs">
                          <span className="font-medium">Researcher:</span> {session.metadata?.researcher || "Not specified"}
                        </div>
                        <div className="text-xs">
                          <span className="font-medium">
                            {session.metadata?.participants && Array.isArray(session.metadata.participants) && session.metadata.participants.length > 1 ? 
                              'Participants:' : 'Participant:'}
                          </span> 
                          {session.metadata?.participants && Array.isArray(session.metadata.participants) && session.metadata.participants.length > 0 ? (
                            <span className="ml-1">
                              {session.metadata.participants.length > 2 ? 
                                `${session.metadata.participants.length} people` : 
                                session.metadata.participants.join(", ")
                              }
                            </span>
                          ) : (
                            session.metadata?.participant || "Not specified"
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {session.status === 'completed' ? (
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">Completed</Badge>
                      ) : (
                        <Badge variant="destructive">Error</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {session.tags && session.tags.length > 0 ? (
                          session.tags.map((tag: string, index: number) => (
                            <Badge key={index} variant="outline" className="text-xs flex items-center">
                              <Tag className="h-3 w-3 mr-1" />
                              {tag}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-xs text-gray-500">No tags</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        <SessionViewDialog session={session} />
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => window.open(`/api/sessions/${session.id}/download`, '_blank')}
                          title="Export all data (sensors and recordings)"
                          className="flex items-center gap-1 text-xs"
                        >
                          <Download className="h-3 w-3" />
                          Export
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="border-red-300 hover:bg-red-50 text-red-600"
                          onClick={() => {
                            if (window.confirm("Are you sure you want to delete this session? This action cannot be undone.")) {
                              deleteSessionMutation.mutate(session.id);
                            }
                          }}
                          title="Delete session"
                        >
                          <Trash2 className="h-3 w-3" />
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    No completed sessions matching the filters
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// Main component that organizes both tabs
export function SessionManagement() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<string>('new_session');
  const queryClient = useQueryClient();
  const [websocket, setWebsocket] = useState<WebSocket | null>(null);
  
  // Estado de conexión MQTT para monitorizar sensores
  const { 
    isConnected: mqttConnected, 
    connectionError: mqttError,
    currentBroker: mqttBroker,
    reconnect: reconnectMqtt
  } = useSimpleMqtt();
  const [isDeveloperMode] = useDeveloperMode();
  
  // Query InfluxDB status
  const { data: influxStatus } = useQuery<{ connected: boolean }>({
    queryKey: ['/api/influxdb/status'],
  });
  
  // Connect to WebSocket for real-time updates
  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    console.log(`Connecting to WebSocket at ${wsUrl}`);
    const ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
      console.log('Connected to WebSocket server');
      setWebsocket(ws);
    };
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('Received WebSocket message:', data);
        
        if (data.type === "session_deleted") {
          // Invalidar la caché cuando se elimina una sesión
          queryClient.invalidateQueries({ queryKey: ["/api/sessions"] });
          queryClient.invalidateQueries({ queryKey: ["/api/cameras"] });
          
          toast({
            title: "Session deleted",
            description: "The session has been deleted by the server",
          });
        } else if (data.type === "camera_updated") {
          // Update camera status
          queryClient.invalidateQueries({ queryKey: ["/api/cameras"] });
        } else if (data.type === "session_updated") {
          // Update sessions
          queryClient.invalidateQueries({ queryKey: ["/api/sessions"] });
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
    
    ws.onclose = () => {
      console.log('WebSocket connection closed');
      setWebsocket(null);
    };
    
    return () => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [queryClient, toast]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-lg border overflow-hidden">
        <div className="p-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold">Session Management</h2>
              <p className="text-muted-foreground">
                Manage and export session data with {isDeveloperMode ? 'InfluxDB integration' : 'advanced storage'}
              </p>
            </div>
            {isDeveloperMode && (
              influxStatus?.connected ? (
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300 flex items-center gap-1">
                  <Database className="h-3 w-3" />
                  InfluxDB Connected
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 flex items-center gap-1">
                  <Database className="h-3 w-3" />
                  InfluxDB Disconnected
                </Badge>
              )
            )}
          </div>
        </div>
      </div>
      
      {/* Tabs styled consistently with Live Monitoring */}
      <Tabs defaultValue="new_session" className="w-full">
        <TabsList className="grid w-full grid-cols-2 h-14 mb-6">
          <TabsTrigger 
            value="new_session"
            className="flex items-center gap-2 border border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-white data-[state=active]:shadow-sm py-3 text-base"
          >
            <Plus className="h-5 w-5 text-green-500" />
            New Session
          </TabsTrigger>
          <TabsTrigger 
            value="historical"
            className="flex items-center gap-2 border border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-white data-[state=active]:shadow-sm py-3 text-base"
          >
            <Clock className="h-5 w-5 text-blue-500" />
            Historical Sessions
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="new_session" className="mt-0 border-0 p-0">
          <NewSessionContent />
        </TabsContent>
        
        <TabsContent value="historical" className="mt-0 border-0 p-0">
          <HistoricalSessionsContent />
        </TabsContent>
      </Tabs>
    </div>
  );
}