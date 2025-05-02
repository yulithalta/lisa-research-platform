import React, { useState, lazy, Suspense } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter,
  DialogTrigger 
} from '@/components/ui/dialog';

// Importamos el componente de visualización de datos de sensores con lazy loading
const SensorDataViewer = lazy(() => import('./sensor-data-viewer'));
const EnhancedSensorDataViewer = lazy(() => import('./enhanced-sensor-data-viewer'));
const SessionRecordingsPlayer = lazy(() => import('./session-recordings-player'));
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useDeveloperMode } from '@/hooks/use-developer-mode';
import { Session } from '@shared/schema';
import { apiRequest } from '@/lib/queryClient';
import { 
  Eye, 
  Save, 
  Calendar, 
  Clock, 
  Tag,
  Users,
  Database,
  Download
} from 'lucide-react';
import { format } from 'date-fns';
import { enUS } from 'date-fns/locale';

interface SessionViewDialogProps {
  session: Session;
}

export function SessionViewDialog({ session }: SessionViewDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDeveloperMode] = useDeveloperMode();
  const [description, setDescription] = useState(session.description || '');
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  
  // Mutation to update session description
  const updateSessionMutation = useMutation({
    mutationFn: async (updatedDescription: string) => {
      const res = await apiRequest("PATCH", `/api/sessions/${session.id}`, { 
        description: updatedDescription 
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/sessions'] });
      
      toast({
        title: "Session updated",
        description: "The session description has been updated successfully",
      });
      
      setIsEditingDescription(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating session",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  const handleSaveDescription = () => {
    updateSessionMutation.mutate(description);
  };
  
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button 
          size="sm" 
          variant="outline"
          className="flex items-center gap-1 text-xs"
        >
          <Eye className="h-3 w-3" />
          View
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            Session Details: {session.name}
          </DialogTitle>
        </DialogHeader>
        
        <div className="mt-4 space-y-6">
          {/* Description */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium">Description</h3>
              {!isEditingDescription ? (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setIsEditingDescription(true)}
                >
                  Edit
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setDescription(session.description || '');
                      setIsEditingDescription(false);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleSaveDescription}
                    disabled={updateSessionMutation.isPending}
                  >
                    <Save className="h-3.5 w-3.5 mr-1" />
                    Save
                  </Button>
                </div>
              )}
            </div>
            
            {isEditingDescription ? (
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add a description..."
                className="min-h-[100px] resize-none"
                maxLength={300}
              />
            ) : (
              <div className="border rounded-md p-3 bg-card text-sm">
                {session.description || "No description provided"}
              </div>
            )}
            
            {isEditingDescription && (
              <div className="text-xs text-right mt-1 text-muted-foreground">
                {description.length}/300 characters
              </div>
            )}
          </div>
          
          {/* Metadata */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <h3 className="text-sm font-medium">Timing Information</h3>
              <div className="border rounded-md p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <h4 className="text-xs font-medium text-muted-foreground">Start Date</h4>
                    <p className="text-sm">{format(new Date(session.startTime), "EEEE, MMMM d, yyyy", { locale: enUS })}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <h4 className="text-xs font-medium text-muted-foreground">Start Time</h4>
                    <p className="text-sm">{format(new Date(session.startTime), "h:mm a", { locale: enUS })}</p>
                  </div>
                </div>
                
                {session.endTime && (
                  <>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <h4 className="text-xs font-medium text-muted-foreground">End Date</h4>
                        <p className="text-sm">{format(new Date(session.endTime), "EEEE, MMMM d, yyyy", { locale: enUS })}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <h4 className="text-xs font-medium text-muted-foreground">End Time</h4>
                        <p className="text-sm">{format(new Date(session.endTime), "h:mm a", { locale: enUS })}</p>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
            
            <div className="space-y-3">
              <h3 className="text-sm font-medium">People</h3>
              <div className="border rounded-md p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <h4 className="text-xs font-medium text-muted-foreground">Researcher</h4>
                    <p className="text-sm">{session.metadata?.researcher || "Not specified"}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <h4 className="text-xs font-medium text-muted-foreground">Participants</h4>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {session.metadata?.participant ? (
                        <Badge variant="outline" className="text-xs">
                          {session.metadata.participant}
                        </Badge>
                      ) : (
                        <p className="text-sm">No participants specified</p>
                      )}

                      {session.metadata?.participants && Array.isArray(session.metadata.participants) && 
                        session.metadata.participants.map((participant: string, index: number) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {participant}
                          </Badge>
                        ))
                      }
                    </div>
                  </div>
                </div>
              </div>
              
              <h3 className="text-sm font-medium">Tags</h3>
              <div className="border rounded-md p-4">
                <div className="flex items-center gap-2">
                  <Tag className="h-4 w-4 text-muted-foreground" />
                  <div className="w-full">
                    <h4 className="text-xs font-medium text-muted-foreground">Session Tags</h4>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {session.tags && session.tags.length > 0 ? (
                        session.tags.map((tag: string, index: number) => (
                          <Badge key={index} variant="secondary" className="text-xs">{tag}</Badge>
                        ))
                      ) : (
                        <p className="text-sm">No tags added</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Devices */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium">Devices</h3>
            <div className="border rounded-md p-4">
              {session.metadata?.devices && Array.isArray(session.metadata.devices) && session.metadata.devices.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-xs font-medium text-muted-foreground mb-2">Cameras</h4>
                    <div className="space-y-2">
                      {session.metadata.devices
                        .filter((device: any) => device.type === 'camera')
                        .map((camera: any, index: number) => (
                          <div key={index} className="border p-2 rounded text-sm">
                            {camera.name}
                          </div>
                        ))
                      }
                      {session.metadata.devices.filter((device: any) => device.type === 'camera').length === 0 && (
                        <p className="text-sm text-muted-foreground">No cameras selected</p>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-xs font-medium text-muted-foreground mb-2">Sensors</h4>
                    <div className="space-y-2">
                      {session.metadata.devices
                        .filter((device: any) => device.type === 'sensor')
                        .map((sensor: any, index: number) => (
                          <div key={index} className="border p-2 rounded text-sm">
                            {sensor.name}
                          </div>
                        ))
                      }
                      {session.metadata.devices.filter((device: any) => device.type === 'sensor').length === 0 && (
                        <p className="text-sm text-muted-foreground">No sensors selected</p>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No devices selected for this session</p>
              )}
            </div>
          </div>
          
          {/* Grabaciones de vídeo */}
          {session.status === 'completed' && (
            <div className="space-y-3 border-t pt-4">
              <h3 className="text-sm font-medium">Video Recordings</h3>
              <Suspense fallback={<div className="p-4 text-center">Loading recordings...</div>}>
                <SessionRecordingsPlayer sessionId={session.id} />
              </Suspense>
            </div>
          )}
          
          {/* Sensor Data Visualization */}
          {session.status === 'completed' && (
            <div className="space-y-3 border-t pt-4">
              <h3 className="text-sm font-medium">Sensor Data</h3>
              <Suspense fallback={<div className="p-4 text-center">Loading sensor data visualization...</div>}>
                <SensorDataViewer session={session} />
              </Suspense>
            </div>
          )}
          
          {/* InfluxDB Information - Solo visible en modo desarrollador */}
          {isDeveloperMode && session.influxDb && (
            <div className="space-y-3 border-t pt-4">
              <h3 className="text-sm font-medium">
                <Database className="h-4 w-4 inline mr-1 text-indigo-500" />
                InfluxDB Configuration
              </h3>
              <div className="border rounded-md p-4 bg-indigo-50 border-indigo-200">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-xs font-medium text-muted-foreground mb-2">Bucket</h4>
                    <div className="border bg-white p-2 rounded text-sm">
                      {session.influxDb.bucket}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-xs font-medium text-muted-foreground mb-2">Organization</h4>
                    <div className="border bg-white p-2 rounded text-sm">
                      {session.influxDb.org}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-xs font-medium text-muted-foreground mb-2">Data Retention</h4>
                    <div className="border bg-white p-2 rounded text-sm">
                      {session.influxDb.retention} days
                    </div>
                  </div>
                  <div>
                    <h4 className="text-xs font-medium text-muted-foreground mb-2">Server</h4>
                    <div className="border bg-white p-2 rounded text-sm">
                      http://influxdb:8086
                    </div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-4">
                  Sensor data for this session is stored in InfluxDB with the configuration above
                </p>
              </div>
            </div>
          )}
          
          {/* Sensor Data */}
          <div className="space-y-3 border-t pt-4">
            <h3 className="text-sm font-medium">Datos de Sensores</h3>
            <div className="border rounded-md p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium">Información de Sensores</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Durante la sesión se capturan datos de sensores MQTT automáticamente.
                    Los datos se incluyen en el archivo ZIP al descargar la sesión.
                  </p>
                </div>
                {/* Removed the internal download button as requested */}
              </div>
            </div>
          </div>
        </div>
        
        <DialogFooter className="mt-6">
          <Button variant="outline" type="button">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}