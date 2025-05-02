import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Signal, WifiOff } from 'lucide-react';
import useSimpleMqtt from '@/hooks/useSimpleMqtt';

/**
 * Componente que muestra el estado de la conexión MQTT
 * Muestra un badge verde cuando está conectado y rojo cuando está desconectado
 * Permite reconectar haciendo clic en el badge cuando está desconectado
 */
export function MqttStatusIndicator({ className = '' }: { className?: string }) {
  const { 
    isConnected, 
    connectionError,
    currentBroker,
    reconnect
  } = useSimpleMqtt();

  return (
    <>
      {isConnected ? (
        <Badge variant="outline" className={`bg-green-50 text-green-700 border-green-300 flex items-center gap-1.5 ${className}`}>
          <Signal className="h-3 w-3" />
          MQTT Connected
        </Badge>
      ) : (
        <Badge 
          variant="outline" 
          className={`bg-red-50 text-red-700 border-red-300 flex items-center gap-1.5 cursor-pointer ${className}`}
          onClick={reconnect}
        >
          <WifiOff className="h-3 w-3" />
          MQTT Disconnected {connectionError ? "(Click to retry)" : ""}
        </Badge>
      )}
    </>
  );
}

export default MqttStatusIndicator;