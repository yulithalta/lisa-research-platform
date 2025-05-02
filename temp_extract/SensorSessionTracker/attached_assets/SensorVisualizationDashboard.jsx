import React, { useState, useEffect, useMemo } from "react";
import MultiSensorChart from "./MultiSensorChart";
import VisualizationSettings from "./VisualizationSettings";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { Download, Settings, Info, AlertCircle, RefreshCw } from "lucide-react";
import ConnectionStatus from "../common/ConnectionStatus";

/**
 * Panel de visualización de sensores
 * Proporciona una visualización completa de datos de sensores con configuración
 */
const SensorVisualizationDashboard = ({ 
  sensorData = {}, 
  isConnected = false,
  connectionError = null,
  isOfflineMode = false,
  reconnect = () => {},
  currentBroker = "MQTT"
}) => {
  // Estado para configuración
  const [showSettings, setShowSettings] = useState(false);
  const [maxDataPoints, setMaxDataPoints] = useLocalStorage("zigbee_max_data_points", 1000);
  const [bufferSize, setBufferSize] = useLocalStorage("zigbee_buffer_size", 300);
  const [autoExport, setAutoExport] = useLocalStorage("zigbee_auto_export", false);
  const [exportInterval, setExportInterval] = useLocalStorage("zigbee_export_interval", 300000); // 5 min default
  const [currentDataSize, setCurrentDataSize] = useState(0);
  const [lastExportTime, setLastExportTime] = useState(null);
  
  // Referencias para exportación automática
  const autoExportTimerRef = React.useRef(null);
  
  // Calcular tamaño total de datos
  useEffect(() => {
    let totalDataPoints = 0;
    Object.keys(sensorData).forEach(sensorName => {
      if (Array.isArray(sensorData[sensorName])) {
        totalDataPoints += sensorData[sensorName].length;
      }
    });
    setCurrentDataSize(totalDataPoints);
  }, [sensorData]);
  
  // Configurar exportación automática
  useEffect(() => {
    if (autoExport) {
      // Limpiar timer existente
      if (autoExportTimerRef.current) {
        clearInterval(autoExportTimerRef.current);
      }
      
      // Configurar nuevo timer
      autoExportTimerRef.current = setInterval(() => {
        handleExportData();
      }, exportInterval);
      
      return () => {
        if (autoExportTimerRef.current) {
          clearInterval(autoExportTimerRef.current);
        }
      };
    } else if (autoExportTimerRef.current) {
      clearInterval(autoExportTimerRef.current);
    }
  }, [autoExport, exportInterval]);
  
  // Limpiar timers al desmontar
  useEffect(() => {
    return () => {
      if (autoExportTimerRef.current) {
        clearInterval(autoExportTimerRef.current);
      }
    };
  }, []);
  
  // Exportar datos a JSON
  const handleExportData = (chartData) => {
    try {
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
      const exportFilename = `zigbee-dashboard-${timestamp}.json`;
      
      const exportData = {
        metadata: {
          exportTime: new Date().toISOString(),
          totalSensors: Object.keys(sensorData).length,
          totalDataPoints: currentDataSize,
          isConnected,
          isOfflineMode,
          broker: currentBroker
        },
        chartData: chartData || {},
        // Incluir solo los últimos N puntos para cada sensor para evitar archivos demasiado grandes
        sensorData: Object.keys(sensorData).reduce((acc, sensorName) => {
          const data = sensorData[sensorName];
          if (Array.isArray(data)) {
            // Tomar los últimos puntos según configuración de buffer
            acc[sensorName] = data.slice(-bufferSize);
          }
          return acc;
        }, {})
      };
      
      // Crear y descargar archivo JSON
      const jsonString = JSON.stringify(exportData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = exportFilename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      // Actualizar referencia de última exportación
      setLastExportTime(new Date());
      
      return true;
    } catch (error) {
      console.error("Error al exportar datos:", error);
      return false;
    }
  };
  
  // Manejar cambios en la configuración
  const handleSettingsChanged = (settings) => {
    if (settings.maxPoints) setMaxDataPoints(settings.maxPoints);
    if (settings.bufferSize) setBufferSize(settings.bufferSize);
    if (settings.autoExport !== undefined) setAutoExport(settings.autoExport);
    if (settings.exportInterval) setExportInterval(settings.exportInterval);
  };
  
  // Filtrar sensores para mostrar solo los que tienen datos
  const filteredSensorData = useMemo(() => {
    const filtered = {};
    Object.keys(sensorData).forEach(sensorName => {
      // Filtrar sensores sin datos o relacionados con bridge/system
      if (
        Array.isArray(sensorData[sensorName]) && 
        sensorData[sensorName].length > 0 &&
        !sensorName.startsWith('bridge/') && 
        !sensorName.includes('bridge')
      ) {
        // Filtrar y limitar datos si es necesario
        const dataPoints = sensorData[sensorName];
        if (dataPoints.length > maxDataPoints) {
          filtered[sensorName] = dataPoints.slice(-maxDataPoints);
        } else {
          filtered[sensorName] = dataPoints;
        }
      }
    });
    return filtered;
  }, [sensorData, maxDataPoints]);
  
  // Formatear tiempo transcurrido desde la última exportación
  const getTimeSinceLastExport = () => {
    if (!lastExportTime) return "Nunca";
    
    const now = new Date();
    const diff = now - lastExportTime;
    const seconds = Math.floor(diff / 1000);
    
    if (seconds < 60) return `${seconds} segundos`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutos`;
    return `${Math.floor(seconds / 3600)} horas`;
  };
  
  return (
    <div className="bg-white shadow-md rounded-lg overflow-hidden">
      {/* Cabecera con información de estado */}
      <div className="bg-gray-50 px-4 py-3 border-b flex justify-between items-center flex-wrap gap-2">
        <div className="flex items-center">
          <h2 className="text-lg font-semibold text-gray-800 mr-3">
            Visualización de Sensores
          </h2>
          <ConnectionStatus 
            isConnected={isConnected}
            connectionError={connectionError}
            isUsingLoadedData={isOfflineMode}
            retryConnection={reconnect}
            broker={currentBroker || "MQTT"}
          />
        </div>
        
        <div className="flex items-center space-x-2 text-sm">
          <div className="text-gray-500 flex items-center px-2 py-1 bg-gray-100 rounded">
            <Info size={14} className="mr-1" />
            <span>{Object.keys(filteredSensorData).length} sensores</span>
            <span className="mx-1">|</span>
            <span>{currentDataSize} puntos</span>
          </div>
          
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="px-2 py-1 bg-blue-50 text-blue-600 rounded flex items-center"
            title="Configuración"
          >
            <Settings size={14} className="mr-1" />
            <span>Configuración</span>
          </button>
          
          <button
            onClick={() => handleExportData()}
            className="px-2 py-1 bg-green-50 text-green-600 rounded flex items-center"
            title="Exportar todos los datos"
          >
            <Download size={14} className="mr-1" />
            <span>Exportar</span>
          </button>
          
          <button
            onClick={reconnect}
            className="px-2 py-1 bg-gray-100 text-gray-600 rounded flex items-center"
            title="Reconectar al broker MQTT"
            disabled={isOfflineMode}
          >
            <RefreshCw size={14} className="mr-1" />
            <span>Reconectar</span>
          </button>
        </div>
      </div>
      
      {/* Panel de configuración modal */}
      <VisualizationSettings
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        onSettingsChanged={handleSettingsChanged}
        onExportData={handleExportData}
        currentSettings={{
          maxPoints: maxDataPoints,
          bufferSize: bufferSize,
          autoExport: autoExport,
          exportInterval: exportInterval,
          lastExportTime: lastExportTime
        }}
      />
      
      {/* Contenido principal - Visualización de sensores */}
      <div className="p-4">
        {Object.keys(filteredSensorData).length === 0 ? (
          <div className="bg-gray-50 rounded-lg p-6 text-center">
            <AlertCircle className="h-10 w-10 mx-auto text-gray-400 mb-3" />
            <h3 className="text-lg font-medium text-gray-800 mb-1">No hay datos de sensores</h3>
            <p className="text-gray-500">
              Conecte al broker MQTT o seleccione algunos sensores para visualizar
            </p>
          </div>
        ) : (
          <MultiSensorChart 
            sensorsData={filteredSensorData}
            onExportData={handleExportData}
            isConnected={isConnected}
          />
        )}
      </div>
      
      {/* Información de exportación automática */}
      {autoExport && (
        <div className="px-4 py-2 bg-blue-50 text-blue-600 text-xs border-t">
          <div className="flex items-center">
            <Info size={12} className="mr-1" />
            <span>Exportación automática habilitada (cada {exportInterval/60000} minutos). Última exportación: {getTimeSinceLastExport()}.</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default SensorVisualizationDashboard;