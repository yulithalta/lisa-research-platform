import React, { useState } from "react";
import { Wifi, WifiOff, AlertCircle, Server, RefreshCw } from "lucide-react";

/**
 * Component to display MQTT connection status with detailed information
 */
const ConnectionStatus = ({ 
  isConnected, 
  connectionError,
  isUsingLoadedData = false,
  broker = "192.168.0.20:9001",
  retryConnection = null,
  toggleOfflineMode = null
}) => {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div className="relative">
      <div 
        className={`flex items-center cursor-pointer ${
          isConnected 
            ? "bg-green-50 text-green-700" 
            : "bg-red-50 text-red-700"
        } ${isUsingLoadedData ? "bg-blue-50 text-blue-700" : ""} px-3 py-1 rounded-md text-xs transition-colors`}
        onClick={() => setShowDetails(!showDetails)}
        role="button"
        tabIndex={0}
        aria-label="Estado de conexión"
      >
        {isConnected ? (
          <>
            <Wifi className="h-3.5 w-3.5 mr-1.5" />
            <span>Conectado</span>
          </>
        ) : isUsingLoadedData ? (
          <>
            <Server className="h-3.5 w-3.5 mr-1.5" />
            <span>Modo Offline</span>
          </>
        ) : (
          <>
            <WifiOff className="h-3.5 w-3.5 mr-1.5" />
            <span>Desconectado</span>
          </>
        )}
      </div>

      {showDetails && (
        <div className="absolute z-10 mt-2 right-0 w-64 bg-white border rounded-md shadow-lg p-3 text-gray-800">
          <h3 className="font-medium mb-2 flex items-center">
            <AlertCircle className="h-4 w-4 mr-1" />
            Detalles de conexión
          </h3>
          <dl className="grid grid-cols-2 gap-x-1 gap-y-2 text-xs">
            <dt className="text-gray-500">Estado:</dt>
            <dd className={
              isConnected 
                ? "text-green-600" 
                : isUsingLoadedData 
                  ? "text-blue-600" 
                  : "text-red-600"
            }>
              {isConnected 
                ? "Conectado" 
                : isUsingLoadedData 
                  ? "Modo offline" 
                  : "Desconectado"}
            </dd>
            
            <dt className="text-gray-500">Broker MQTT:</dt>
            <dd>{broker}</dd>
            
            {connectionError && !isUsingLoadedData && (
              <>
                <dt className="text-gray-500">Error:</dt>
                <dd className="text-red-600 col-span-2">{connectionError}</dd>
              </>
            )}
            
            {isUsingLoadedData && (
              <>
                <dt className="text-gray-500">Información:</dt>
                <dd className="text-blue-600 col-span-2">
                  Usando datos almacenados localmente. Los datos pueden no estar actualizados.
                </dd>
              </>
            )}
          </dl>
          <div className="mt-3 flex justify-end space-x-2">
            {!isConnected && retryConnection && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  retryConnection();
                  setShowDetails(false);
                }}
                className="bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded text-xs flex items-center"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Reconectar
              </button>
            )}
            
            {toggleOfflineMode && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleOfflineMode();
                  setShowDetails(false);
                }}
                className={`${
                  isUsingLoadedData 
                    ? "bg-green-500 hover:bg-green-600" 
                    : "bg-blue-500 hover:bg-blue-600"
                } text-white px-2 py-1 rounded text-xs flex items-center`}
              >
                {isUsingLoadedData ? (
                  <>
                    <Wifi className="h-3 w-3 mr-1" />
                    Modo online
                  </>
                ) : (
                  <>
                    <Server className="h-3 w-3 mr-1" />
                    Modo offline
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ConnectionStatus;