import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import useMqtt from '@/hooks/use-mqtt';
import { useQuery } from '@tanstack/react-query';

interface Device {
  id: string;
  name: string;
  type: 'sensor' | 'camera';
}

export function SessionConfigDialog({
  open,
  onOpenChange
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { sensorCount, sensors } = useMqtt();
  const [selectedDevices, setSelectedDevices] = useState<string[]>([]);

  // Obtener cámaras del backend
  const { data: cameras = [] } = useQuery({
    queryKey: ['/api/cameras'],
  });

  const handleDeviceToggle = (deviceId: string) => {
    setSelectedDevices(prev => 
      prev.includes(deviceId)
        ? prev.filter(id => id !== deviceId)
        : [...prev, deviceId]
    );
  };

  const handleSave = () => {
    // TO-DO: Guardar configuración de sesión
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Configuración de Sesión</DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-[300px] pr-4">
          <div className="space-y-4">
            <div>
              <h4 className="mb-2 font-medium">Sensores ({sensorCount})</h4>
              {sensorCount > 0 ? (
                <div className="space-y-2">
                  {sensors?.map((sensor: any) => (
                    <div key={sensor.ieee_addr} className="flex items-center space-x-2">
                      <Checkbox
                        id={sensor.ieee_addr}
                        checked={selectedDevices.includes(sensor.ieee_addr)}
                        onCheckedChange={() => handleDeviceToggle(sensor.ieee_addr)}
                      />
                      <label 
                        htmlFor={sensor.ieee_addr}
                        className="text-sm cursor-pointer"
                      >
                        {sensor.friendly_name}
                      </label>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground mb-4">
                  Esperando conexión con Zigbee2MQTT...
                </p>
              )}
            </div>
            <div>
              <h4 className="mb-2 font-medium">Cámaras</h4>
              {cameras.map((camera: any) => (
                <div key={camera.id} className="flex items-center space-x-2 mb-2">
                  <Checkbox
                    id={camera.id}
                    checked={selectedDevices.includes(camera.id)}
                    onCheckedChange={() => handleDeviceToggle(camera.id)}
                  />
                  <label htmlFor={camera.id} className="text-sm cursor-pointer">
                    {camera.name}
                  </label>
                </div>
              ))}
            </div>
          </div>
        </ScrollArea>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave}>
            Guardar Configuración
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}