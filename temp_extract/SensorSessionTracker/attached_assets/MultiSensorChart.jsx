import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { Download, Clock, AlertCircle } from 'lucide-react';
import TimeIntervalSelector from './TimeIntervalSelector';
import SensorSelector from './SensorSelector';

// Colores distintivos para los sensores
const SENSOR_COLORS = [
  '#2196F3', // Azul
  '#FF5722', // Naranja
  '#4CAF50', // Verde
  '#9C27B0', // Púrpura
  '#F44336', // Rojo
  '#FFEB3B', // Amarillo
  '#03A9F4', // Azul claro
  '#E91E63', // Rosa
  '#009688', // Verde azulado
  '#673AB7'  // Púrpura oscuro
];

// Intervalo predeterminado para la monitorización (30s)
const DEFAULT_INTERVAL = 30000;

const MultiSensorChart = ({ 
  sensorData = {},
  priorityDevices = null, // Nuevo prop para datos prioritarios
  isConnected = false,
  showAllDevices = false // Flag para mostrar todos los dispositivos o solo los prioritarios
}) => {
  // Estados del componente
  const [selectedInterval, setSelectedInterval] = useState(DEFAULT_INTERVAL);
  const [selectedSensors, setSelectedSensors] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [lastUpdateTime, setLastUpdateTime] = useState(new Date());
  const [friendlyNames, setFriendlyNames] = useState({});
  const [devMode, setDevMode] = useState(false); // Modo desarrollador
  
  // Determinar qué datos usar según el modo y props disponibles
  const dataToUse = useMemo(() => {
    if (devMode || showAllDevices) {
      return sensorData; // Usar todos los datos en modo desarrollador
    } else if (priorityDevices) {
      return priorityDevices; // Usar solo dispositivos prioritarios
    } else {
      // Si no hay prioridades explícitas, filtrar sensores de livinglab
      const filtered = {};
      Object.keys(sensorData).forEach(key => {
        if (key.includes('livinglab/device/') || key.includes('zigbee2mqtt/livinglab/device/')) {
          filtered[key] = sensorData[key];
        }
      });
      return filtered;
    }
  }, [sensorData, priorityDevices, devMode, showAllDevices]);
  
  // Obtener lista de sensores disponibles y sus nombres amigables
  const availableSensors = useMemo(() => {
    // Filtrar sensores del sistema y extraer sus nombres
    return Object.keys(dataToUse).filter(
      name => !name.startsWith('bridge/') && !name.includes('bridge')
    );
  }, [dataToUse]);
  
  // Generar y actualizar nombres amigables para los sensores
  useEffect(() => {
    // Mapa para almacenar los nombres amigables
    const names = {};
    
    // Procesar todos los sensores disponibles
    availableSensors.forEach(sensorKey => {
      // Intentar extraer un nombre amigable de los datos del sensor
      const sensorEntries = sensorData[sensorKey] || [];
      
      // Buscar un nombre amigable en los datos del sensor
      for (const entry of sensorEntries) {
        if (entry.friendlyName) {
          names[sensorKey] = entry.friendlyName;
          break;
        }
        
        // Intentar extraer del payload si está disponible
        if (entry.payload && entry.payload.friendly_name) {
          names[sensorKey] = entry.payload.friendly_name;
          break;
        }
      }
      
      // Si no se encuentra un nombre amigable, generar uno basado en la ubicación
      if (!names[sensorKey]) {
        // Extraer solo el identificador único del sensor (últimos 5 caracteres)
        const shortId = sensorKey.includes('-') 
          ? sensorKey 
          : `Sensor-${sensorKey.slice(-5)}`;
          
        names[sensorKey] = shortId;
      }
    });
    
    setFriendlyNames(names);
  }, [availableSensors, sensorData]);
  
  // Seleccionar sensores automáticamente si no hay ninguno seleccionado
  useEffect(() => {
    if (availableSensors.length > 0 && selectedSensors.length === 0) {
      // Priorizar los sensores que tienen datos recientes
      const sensorsWithData = availableSensors.filter(sensor => 
        sensorData[sensor] && sensorData[sensor].length > 0
      );
      
      if (sensorsWithData.length > 0) {
        // Seleccionar hasta 4 sensores con datos
        setSelectedSensors(sensorsWithData.slice(0, Math.min(4, sensorsWithData.length)));
      } else {
        // Si no hay sensores con datos, seleccionar hasta 2 de la lista general
        setSelectedSensors(availableSensors.slice(0, Math.min(2, availableSensors.length)));
      }
    }
  }, [availableSensors, selectedSensors.length, sensorData]);
  
  // Función para actualizar los datos de la gráfica
  const updateChart = useCallback(() => {
    if (selectedSensors.length === 0) {
      setChartData([]);
      return;
    }
    
    try {
      const now = new Date();
      const timeWindow = selectedInterval * 20; // 20 puntos en la ventana de tiempo
      const startTime = new Date(now.getTime() - timeWindow);
      
      // Crear puntos de tiempo equidistantes para la gráfica
      const timePoints = [];
      for (let i = 0; i <= 20; i++) {
        timePoints.push(new Date(startTime.getTime() + (i * selectedInterval)));
      }
      
      // Crear datos combinados para la gráfica
      const combinedData = timePoints.map(timePoint => {
        const formattedTime = timePoint.toLocaleTimeString([], { 
          hour: '2-digit', minute: '2-digit', second: '2-digit' 
        });
        
        const point = { timestamp: timePoint, formattedTime };
        
        // Para cada sensor seleccionado, encontrar el valor más cercano al punto de tiempo
        selectedSensors.forEach(sensorName => {
          if (!sensorData[sensorName] || sensorData[sensorName].length === 0) {
            point[sensorName] = null;
            return;
          }
          
          // Encontrar el punto de datos más cercano al tiempo actual
          const sensorPoints = sensorData[sensorName];
          let closestPoint = null;
          let minTimeDiff = Infinity;
          
          for (const dataPoint of sensorPoints) {
            if (!dataPoint.x) continue;
            
            const pointTime = new Date(dataPoint.x);
            const timeDiff = Math.abs(pointTime.getTime() - timePoint.getTime());
            
            // Si está dentro del intervalo y es más cercano que el anterior
            if (timeDiff < minTimeDiff && timeDiff <= selectedInterval * 2) {
              minTimeDiff = timeDiff;
              closestPoint = dataPoint;
            }
          }
          
          // Usar el punto más cercano si existe
          point[sensorName] = closestPoint ? closestPoint.y : null;
        });
        
        return point;
      });
      
      setChartData(combinedData);
      setLastUpdateTime(now);
    } catch (error) {
      console.error("Error actualizando gráfica:", error);
    }
  }, [selectedInterval, selectedSensors, sensorData]);
  
  // Actualizar gráfica cuando cambian parámetros relevantes
  useEffect(() => {
    updateChart();
    
    // Configurar actualización periódica
    const updateFrequency = Math.min(1000, selectedInterval / 4);
    const timer = setInterval(updateChart, updateFrequency);
    
    return () => clearInterval(timer);
  }, [updateChart]);
  
  // Cambiar entre modo normal y desarrollador
  const toggleDevMode = () => {
    setDevMode(!devMode);
    // Limpiar selección al cambiar de modo
    setSelectedSensors([]);
  };
  
  // Manejar selección de sensores
  const handleSensorSelection = (selected) => {
    setSelectedSensors(selected);
  };
  
  // Exportar datos a CSV
  const handleExportData = () => {
    if (!selectedSensors.length) {
      alert('Seleccione al menos un sensor para exportar datos');
      return;
    }
    
    try {
      const csvRows = [];
      
      // Cabecera
      csvRows.push("sensor,nombre_amigable,timestamp,estado,bateria,senal");
      
      // Datos de cada sensor seleccionado
      selectedSensors.forEach(sensorName => {
        if (sensorData[sensorName]) {
          const friendlyName = friendlyNames[sensorName] || sensorName;
          
          sensorData[sensorName].forEach(point => {
            if (point.x && !isNaN(new Date(point.x).getTime())) {
              csvRows.push(
                `${sensorName},${friendlyName},${new Date(point.x).toISOString()},${point.y === 1 ? 'Abierto' : 'Cerrado'},${point.battery || 0},${point.linkquality || 0}`
              );
            }
          });
        }
      });
      
      if (csvRows.length <= 1) {
        alert('No hay datos disponibles para exportar');
        return;
      }
      
      // Crear y descargar el archivo CSV
      const csvContent = csvRows.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      
      // Crear nombre de archivo con timestamp
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
      link.setAttribute('href', url);
      link.setAttribute('download', `sensor-data-${timestamp}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error exportando datos:", error);
      alert(`Error al exportar: ${error.message}`);
    }
  };
  
  // Mapa de colores para sensores
  const sensorColorMap = useMemo(() => {
    return selectedSensors.reduce((map, sensor, index) => {
      map[sensor] = SENSOR_COLORS[index % SENSOR_COLORS.length];
      return map;
    }, {});
  }, [selectedSensors]);
  
  // Renderizar tooltip personalizado con nombres amigables
  const renderTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border rounded shadow-md text-xs">
          <p className="font-medium mb-1">{label}</p>
          <div className="mt-1">
            {payload.map((entry, index) => {
              // Obtener el nombre amigable para el sensor
              const sensorKey = entry.name;
              const friendlyName = friendlyNames[sensorKey] || sensorKey;
              
              return (
                <div key={`tooltip-${index}`} className="flex items-center mb-1">
                  <div 
                    className="w-3 h-3 rounded-full mr-2"
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="font-medium">{friendlyName}:</span>
                  <span className="ml-2 font-medium">
                    {entry.value !== null ? 
                      (entry.value === 1 ? 'Abierto' : 'Cerrado') : 
                      'Sin datos'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      );
    }
    return null;
  };
  
  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
        <div className="flex items-center">
          <h3 className="text-lg font-medium text-gray-800">Monitorización en Tiempo Real</h3>
          {devMode && (
            <span className="ml-2 px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full text-xs font-medium">
              Modo Desarrollador
            </span>
          )}
          {!devMode && (
            <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
              Sensores LivingLab
            </span>
          )}
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          {/* Selector de intervalo */}
          <TimeIntervalSelector 
            value={selectedInterval}
            onChange={setSelectedInterval}
          />
          
          {/* Botón para exportar datos */}
          <button
            onClick={handleExportData}
            className="px-3 py-1 border rounded text-sm bg-green-50 text-green-600 flex items-center"
            disabled={selectedSensors.length === 0 || !isConnected}
          >
            <Download size={16} className="mr-1" />
            <span>Exportar</span>
          </button>
          
          {/* Botón para cambiar modo (solo visible para desarrolladores) */}
          <button
            onClick={toggleDevMode}
            className={`px-3 py-1 border rounded text-sm ${
              devMode ? 'bg-blue-50 text-blue-600' : 'bg-gray-50 text-gray-600'
            } flex items-center text-xs`}
            title={devMode ? "Ver solo dispositivos del cliente" : "Ver todos los dispositivos (desarrollo)"}
          >
            {devMode ? "Modo Cliente" : "Modo Dev"}
          </button>
        </div>
      </div>
      
      {/* Selector de sensores */}
      <div className="mb-4">
        <SensorSelector 
          availableSensors={availableSensors}
          selectedSensors={selectedSensors}
          onChange={handleSensorSelection}
          colorMap={sensorColorMap}
          // Pasar los nombres amigables para mostrarlos en el selector
          friendlyNames={friendlyNames}
        />
      </div>
      
      {/* Leyenda de sensores seleccionados con nombres amigables */}
      <div className="flex flex-wrap gap-2 mb-3">
        {selectedSensors.map(sensor => {
          const friendlyName = friendlyNames[sensor] || sensor;
          
          return (
            <div 
              key={sensor}
              className="flex items-center px-3 py-1 bg-gray-50 rounded-full text-xs shadow-sm"
              style={{borderLeft: `4px solid ${sensorColorMap[sensor]}`}}
            >
              <div 
                className="w-3 h-3 rounded-full mr-2"
                style={{backgroundColor: sensorColorMap[sensor]}}
              />
              <span className="font-medium">{friendlyName}</span>
            </div>
          );
        })}
        
        {selectedSensors.length === 0 && (
          <div className="text-sm text-gray-500 italic">
            No hay sensores seleccionados
          </div>
        )}
      </div>
      
      {/* Gráfica principal con líneas escalonadas */}
      <div className="h-64">
        {!isConnected && Object.keys(sensorData).length === 0 && (
          <div className="h-full flex items-center justify-center bg-gray-50 rounded-lg">
            <div className="text-center text-gray-500">
              <AlertCircle size={24} className="mx-auto mb-2" />
              <p>Sin conexión con los sensores</p>
              <p className="text-xs mt-1">Verifique la conexión con el sistema</p>
            </div>
          </div>
        )}
        {isConnected && selectedSensors.length === 0 && (
          <div className="h-full flex items-center justify-center bg-gray-50 rounded-lg">
            <div className="text-center text-gray-500">
              <p>Seleccione al menos un sensor para visualizar datos</p>
            </div>
          </div>
        )}
        {selectedSensors.length > 0 && (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="formattedTime" 
                tick={{ fontSize: 10 }}
                interval="preserveEnd"
                stroke="#999"
              />
              <YAxis
                domain={[0, 1]}
                ticks={[0, 1]}
                tickFormatter={(value) => value === 0 ? 'Cerrado' : 'Abierto'}
                tick={{ fontSize: 10 }}
                stroke="#999"
              />
              <Tooltip content={renderTooltip} />
              <Legend 
                formatter={(value) => {
                  // Mostrar nombres amigables en la leyenda
                  return friendlyNames[value] || value;
                }}
              />
              
              {selectedSensors.map((sensor) => (
                <Line
                  key={sensor}
                  type="stepAfter"  // Líneas escalonadas para representar cambios de estado
                  dataKey={sensor}
                  name={sensor}
                  stroke={sensorColorMap[sensor]}
                  strokeWidth={2.5}  // Línea más gruesa para mejor visibilidad
                  dot={false}  // Sin puntos para una línea continua
                  activeDot={{ r: 5, strokeWidth: 1 }} // Punto más grande en interacción
                  isAnimationActive={false} // Desactivar animación para mejor rendimiento
                  connectNulls={true} // Conectar puntos con valores nulos
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
      
      {/* Tiempo última actualización */}
      <div className="mt-2 text-xs text-gray-500 flex justify-end items-center">
        <Clock size={12} className="mr-1" />
        <span>Actualizado: {lastUpdateTime.toLocaleTimeString()}</span>
      </div>
    </div>
  );
};

export default MultiSensorChart;