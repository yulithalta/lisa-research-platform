import React, { useState, useMemo, useCallback } from "react";
import OptimizedSensorCard from "./OptimizedSensorCard";
import ConnectionStatus from "./ConnectionStatus";
import { Download, WifiOff, ChevronDown, ChevronUp, Grid3X3 } from "lucide-react";
import { useLocalStorage } from "../hooks/useLocalStorage";
import Papa from "papaparse";
import ConfirmationModal from "./ConfirmationModal";
import TopicFilter from "./TopicFilter";

/**
 * Enhanced sensor grid with responsive layout and performance optimizations
 */
const ImprovedSensorGrid = ({ 
  sensorData = {}, 
  isConnected = false, 
  connectionError = null,
  reconnect = null 
}) => {
  // States
  const [gridLayout, setGridLayout] = useLocalStorage("sensorGridLayout", 3);
  const [sensorImages, setSensorImages] = useLocalStorage("sensorImages", {});
  const [expanded, setExpanded] = useLocalStorage("sensorGridExpanded", true);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmationMessage, setConfirmationMessage] = useState("");
  const [confirmationAction, setConfirmationAction] = useState(() => () => {});
  const [filteredTopics, setFilteredTopics] = useState([]);

  // Filter sensors to show only relevant devices
  const filteredSensors = useMemo(() => {
    const allSensors = Object.keys(sensorData).filter(
      name => !name.startsWith('bridge/') && !name.includes('bridge')
    );

    // If we have filtered topics, use them
    if (filteredTopics.length > 0) {
      return allSensors.filter(sensorName => 
        filteredTopics.includes(sensorName)
      );
    }

    return allSensors;
  }, [sensorData, filteredTopics]);

  // Update sensor image
  const updateSensorImage = useCallback((sensorName, imageUrl) => {
    setSensorImages(prev => ({
      ...prev,
      [sensorName]: imageUrl
    }));
  }, [setSensorImages]);

  // Handle topic filter changes
  const handleTopicFilterChange = useCallback((selectedTopics) => {
    setFilteredTopics(selectedTopics);
  }, []);

  // Export data to CSV for analysis
  const exportToCsv = useCallback(() => {
    if (Object.keys(sensorData).length === 0) {
      setConfirmationMessage("No hay datos disponibles para exportar");
      setShowConfirmation(true);
      return;
    }
    
    try {
      const csvRows = [];
      
      // Header
      csvRows.push("sensor,timestamp,estado,bateria,senal");
      
      // Data for each sensor
      Object.keys(sensorData).forEach(sensorName => {
        if (sensorData[sensorName]) {
          sensorData[sensorName].forEach(point => {
            if (point.x && !isNaN(new Date(point.x).getTime())) {
              csvRows.push(
                `${sensorName},${new Date(point.x).toISOString()},${point.y === 1 ? 'Abierto' : 'Cerrado'},${point.battery || 0},${point.linkquality || 0}`
              );
            }
          });
        }
      });
      
      if (csvRows.length <= 1) {
        setConfirmationMessage("No hay datos válidos para exportar");
        setShowConfirmation(true);
        return;
      }
      
      // Create and download CSV file
      const csvContent = csvRows.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      
      // Filename with timestamp
      const timestamp = new Date().toISOString().replace(/:/g, '-').substring(0, 19);
      link.setAttribute('href', url);
      link.setAttribute('download', `monitorizacion-sensores-${timestamp}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      setConfirmationMessage(`Exportados ${csvRows.length - 1} registros a CSV correctamente`);
      setShowConfirmation(true);
    } catch (error) {
      console.error("Error exportando datos a CSV:", error);
      setConfirmationMessage(`Error al exportar datos: ${error.message}`);
      setShowConfirmation(true);
    }
  }, [sensorData]);

  // Get CSS class for grid layout
  const gridClass = useMemo(() => {
    const classes = {
      2: 'grid-cols-1 sm:grid-cols-2',
      3: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3',
      4: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
    };
    return classes[gridLayout] || classes[3];
  }, [gridLayout]);

  // Show no connection error
  if (!isConnected && filteredSensors.length === 0) {
    return (
      <div className="p-4 bg-white shadow-md rounded-lg w-full min-h-[200px] flex items-center justify-center">
        <div className="text-center">
          <WifiOff className="h-8 w-8 mx-auto text-gray-400 mb-2" />
          <h2 className="text-lg font-semibold mb-1">Sin conexión al sistema</h2>
          <p className="text-gray-500 max-w-md text-sm mb-4">
            No se detecta conexión con el sistema de monitorización. Verifique la conexión MQTT
            con el servidor y que los dispositivos estén activos.
          </p>
          {reconnect && (
            <button 
              onClick={reconnect}
              className="px-3 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 text-sm"
            >
              Reconectar
            </button>
          )}
        </div>
      </div>
    );
  }
  
  return (
    <div className="p-4 bg-white shadow-md rounded-lg w-full">
      {/* Header with controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
        <button 
          className="flex items-center text-gray-700 hover:text-blue-600 font-medium transition-colors"
          onClick={() => setExpanded(!expanded)}
        >
          <h2 className="text-lg font-bold">
            Estado de Sensores
          </h2>
          {expanded ? 
            <ChevronUp className="ml-2 h-5 w-5" /> : 
            <ChevronDown className="ml-2 h-5 w-5" />
          }
        </button>
        
        <div className="flex items-center flex-wrap gap-2">
          <ConnectionStatus 
            isConnected={isConnected} 
            connectionError={connectionError}
            retryConnection={reconnect}
            broker="MQTT Broker"
          />
          
          {expanded && (
            <>
              <div className="flex border rounded-md overflow-hidden">
                {[4, 3, 2].map(cols => (
                  <button
                    key={cols}
                    className={`px-2 py-1 flex items-center text-xs ${gridLayout === cols ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}
                    onClick={() => setGridLayout(cols)}
                    title={`${cols} columnas`}
                  >
                    <Grid3X3 className="h-3 w-3 mr-1" />
                    <span>{cols}</span>
                  </button>
                ))}
              </div>
              
              <TopicFilter 
                availableTopics={Object.keys(sensorData).filter(
                  name => !name.startsWith('bridge/') && !name.includes('bridge')
                )}
                onFilterChange={handleTopicFilterChange}
              />
              
              <button
                onClick={exportToCsv}
                className="px-2 py-1 bg-green-500 text-white rounded-md hover:bg-green-600 flex items-center text-xs"
                title="Exportar datos a CSV para análisis"
              >
                <Download className="h-3 w-3 mr-1" />
                <span>Exportar CSV</span>
              </button>
            </>
          )}
        </div>
      </div>
      
      {/* Sensor count - always visible */}
      <div className="text-xs text-gray-500 mb-2">
        {filteredSensors.length} {filteredSensors.length === 1 ? 'sensor' : 'sensores'} activos
      </div>

      {/* Sensor grid - only visible when expanded */}
      {expanded && (
        <div className={`grid ${gridClass} gap-4 mx-auto max-w-6xl`}>
          {filteredSensors.length > 0 ? (
            filteredSensors.map((sensorName) => (
              <OptimizedSensorCard
                key={sensorName}
                sensorName={sensorName}
                sensorData={sensorData[sensorName] || []}
                imageUrl={sensorImages[sensorName] || "/images/door-sensor.png"}
                onImageChange={(url) => updateSensorImage(sensorName, url)}
              />
            ))
          ) : (
            <div className="col-span-full p-6 text-center text-gray-500">
              No se detectaron sensores activos. El sistema está conectado pero no se reciben datos de sensores.
              Verifique que los dispositivos estén dados de alta correctamente.
            </div>
          )}
        </div>
      )}

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={showConfirmation}
        onClose={() => setShowConfirmation(false)}
        onConfirm={() => {
          confirmationAction();
          setShowConfirmation(false);
        }}
        title="Información"
        message={confirmationMessage}
        confirmText="Aceptar"
        cancelText="Cerrar"
      />
    </div>
  );
};

export default ImprovedSensorGrid;