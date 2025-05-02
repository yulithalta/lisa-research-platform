import React from 'react';
import { useQuery } from '@tanstack/react-query';

interface Sensor {
  id: number;
  sensorId: string;
  name: string;
  type: string;
  status: string;
  batteryLevel: number;
  lastActivity: string;
}

const SensorsList: React.FC = () => {
  const { data: sensors, isLoading } = useQuery<Sensor[]>({ 
    queryKey: ['/api/sensors'],
  });

  // Default sample sensors for initial render
  const defaultSensors: Sensor[] = [
    {
      id: 1,
      sensorId: 'MOV-123',
      name: 'Sensor de Movimiento',
      type: 'movement',
      status: 'connected',
      batteryLevel: 87,
      lastActivity: '2023-07-12T10:45:15'
    },
    {
      id: 2,
      sensorId: 'TEMP-456',
      name: 'Sensor de Temperatura',
      type: 'temperature',
      status: 'connected',
      batteryLevel: 92,
      lastActivity: '2023-07-12T10:48:30'
    },
    {
      id: 3,
      sensorId: 'HUM-789',
      name: 'Sensor de Humedad',
      type: 'humidity',
      status: 'low_battery',
      batteryLevel: 15,
      lastActivity: '2023-07-12T10:40:00'
    }
  ];

  const displaySensors = sensors || defaultSensors;

  const getStatusIndicator = (status: string, batteryLevel: number) => {
    if (status === 'disconnected') {
      return (
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-error"></span>
          <span className="text-xs text-neutral-300">Desconectado</span>
        </div>
      );
    } else if (batteryLevel < 20) {
      return (
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-warning"></span>
          <span className="text-xs text-neutral-300">Batería baja</span>
        </div>
      );
    } else {
      return (
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-success"></span>
          <span className="text-xs text-neutral-300">Conectado</span>
        </div>
      );
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const past = new Date(dateString);
    const diffMs = now.getTime() - past.getTime();
    const diffMins = Math.round(diffMs / 60000);
    
    if (diffMins < 1) return 'Justo ahora';
    if (diffMins === 1) return 'Hace 1 min';
    if (diffMins < 60) return `Hace ${diffMins} min`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours === 1) return 'Hace 1 hora';
    if (diffHours < 24) return `Hace ${diffHours} horas`;
    
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return 'Hace 1 día';
    return `Hace ${diffDays} días`;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Sensores Activos</h2>
        <a href="#" className="text-primary flex items-center gap-1 text-sm">
          <span>Gestionar sensores</span>
          <span className="material-icons text-sm">arrow_forward</span>
        </a>
      </div>
      
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, index) => (
            <div key={index} className="card h-40 animate-pulse bg-gray-200"></div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displaySensors.map((sensor) => (
            <div key={sensor.id} className="card">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <span className="material-icons">sensors</span>
                  </div>
                  <div>
                    <h3 className="font-medium">{sensor.name}</h3>
                    <p className="text-xs text-neutral-300">ID: {sensor.sensorId}</p>
                  </div>
                </div>
                {getStatusIndicator(sensor.status, sensor.batteryLevel)}
              </div>
              <div className="mt-4 pt-4 border-t">
                <div className="flex items-center justify-between text-sm">
                  <span>Batería:</span>
                  <span className="font-medium">{sensor.batteryLevel}%</span>
                </div>
                <div className="flex items-center justify-between text-sm mt-2">
                  <span>Última actividad:</span>
                  <span className="font-medium">{formatTimeAgo(sensor.lastActivity)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SensorsList;
