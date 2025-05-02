import React, { useState, useEffect, useMemo } from 'react';
import { Clock, ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Componente para visualizar los estados de los sensores como una línea de tiempo
 * con bloques de colores para cada cambio de estado
 */
const TimelineStatusView = ({ 
  sensorData = {}, 
  selectedSensors = [],
  timeWindow = 30 // minutos para mostrar en la línea de tiempo
}) => {
  const [now, setNow] = useState(new Date());
  
  // Actualizar tiempo actual cada segundo
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);
  
  // Calcular ventana de tiempo para visualización
  const timeRange = useMemo(() => {
    const endTime = now;
    const startTime = new Date(endTime.getTime() - (timeWindow * 60 * 1000));
    
    return { startTime, endTime };
  }, [now, timeWindow]);
  
  // Preparar datos de estado para la visualización
  const statusData = useMemo(() => {
    const result = {};
    
    selectedSensors.forEach(sensorId => {
      const sensorPoints = sensorData[sensorId] || [];
      
      // Filtrar puntos dentro de la ventana de tiempo
      const relevantPoints = sensorPoints.filter(point => {
        const pointTime = new Date(point.x);
        return pointTime >= timeRange.startTime && pointTime <= timeRange.endTime;
      });
      
      // Si no hay puntos dentro de la ventana, intentar obtener el último punto anterior
      if (relevantPoints.length === 0 && sensorPoints.length > 0) {
        // Buscar el punto más reciente antes de la ventana de tiempo
        let latestPoint = null;
        
        for (const point of sensorPoints) {
          const pointTime = new Date(point.x);
          if (pointTime < timeRange.startTime) {
            if (!latestPoint || pointTime > new Date(latestPoint.x)) {
              latestPoint = point;
            }
          }
        }
        
        if (latestPoint) {
          // Crear un punto artificial al inicio de la ventana con el mismo estado
          relevantPoints.push({
            ...latestPoint,
            x: timeRange.startTime.toISOString()
          });
        }
      }
      
      // Ordenar por tiempo
      relevantPoints.sort((a, b) => new Date(a.x) - new Date(b.x));
      
      result[sensorId] = relevantPoints;
    });
    
    return result;
  }, [selectedSensors, sensorData, timeRange]);
  
  // Función para visualizar un sensor como bloques de estado
  const renderSensorTimeline = (sensorId, points, width = '100%') => {
    const { startTime, endTime } = timeRange;
    const timeRangeMs = endTime.getTime() - startTime.getTime();
    
    // Si no hay puntos, mostrar línea gris
    if (points.length === 0) {
      return (
        <div className="h-8 bg-gray-200 rounded w-full" title="Sin datos"></div>
      );
    }
    
    // Calcular bloques de estado
    const blocks = [];
    let lastState = null;
    let lastTime = startTime;
    
    // Añadir cada punto como un bloque de color
    points.forEach((point, index) => {
      const pointTime = new Date(point.x);
      const isOpen = point.y === 1;
      
      // Si es el primer punto o hubo cambio de estado, crear un nuevo bloque
      if (index === 0 || lastState !== isOpen) {
        // Si no es el primer punto, cerrar el bloque anterior
        if (index > 0) {
          const blockWidth = ((pointTime.getTime() - lastTime.getTime()) / timeRangeMs) * 100;
          
          blocks.push({
            start: lastTime,
            end: pointTime,
            isOpen: lastState,
            widthPercent: blockWidth
          });
        }
        
        // Actualizar estado y tiempo
        lastState = isOpen;
        lastTime = pointTime;
      }
    });
    
    // Añadir el último bloque hasta el final del rango
    if (lastState !== null) {
      const blockWidth = ((endTime.getTime() - lastTime.getTime()) / timeRangeMs) * 100;
      
      blocks.push({
        start: lastTime,
        end: endTime,
        isOpen: lastState,
        widthPercent: blockWidth
      });
    }
    
    // Renderizar bloques
    return (
      <div className="flex h-8 w-full">
        {blocks.map((block, index) => {
          const color = block.isOpen ? 'bg-green-500' : 'bg-red-500';
          const startTime = block.start.toLocaleTimeString();
          const endTime = block.end.toLocaleTimeString();
          const tooltip = `${block.isOpen ? 'Abierto' : 'Cerrado'}: ${startTime} - ${endTime}`;
          
          return (
            <div 
              key={index}
              className={`${color} h-full`}
              style={{ width: `${block.widthPercent}%` }}
              title={tooltip}
            ></div>
          );
        })}
      </div>
    );
  };
  
  // Generar marcas de tiempo para el eje X
  const timeMarkers = useMemo(() => {
    const { startTime, endTime } = timeRange;
    const markers = [];
    const markerCount = 6; // Número de marcadores a mostrar
    
    for (let i = 0; i <= markerCount; i++) {
      const offset = (i / markerCount);
      const markerTime = new Date(startTime.getTime() + (offset * (endTime.getTime() - startTime.getTime())));
      
      markers.push({
        time: markerTime,
        position: `${offset * 100}%`
      });
    }
    
    return markers;
  }, [timeRange]);
  
  return (
    <div className="mt-4">
      <div className="flex justify-between items-center mb-2">
        <h4 className="text-sm font-medium text-gray-700">
          Estado de los últimos {timeWindow} minutos
        </h4>
        <div className="text-xs text-gray-500">
          <Clock size={12} className="inline mr-1" />
          {timeRange.startTime.toLocaleTimeString()} - {timeRange.endTime.toLocaleTimeString()}
        </div>
      </div>
      
      {/* Escala de tiempo */}
      <div className="relative mb-2 border-b border-gray-200 pb-1">
        <div className="flex justify-between text-xs text-gray-500">
          {timeMarkers.map((marker, index) => (
            <div 
              key={index} 
              className="absolute transform -translate-x-1/2"
              style={{ left: marker.position }}
            >
              <div className="h-2 border-l border-gray-300"></div>
              <span className="whitespace-nowrap">
                {marker.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          ))}
        </div>
      </div>
      
      {/* Líneas de tiempo para cada sensor */}
      {selectedSensors.length === 0 ? (
        <div className="text-center py-6 text-gray-500 bg-gray-50 rounded">
          Seleccione sensores para visualizar su actividad
        </div>
      ) : (
        <div className="space-y-4">
          {selectedSensors.map(sensorId => {
            const points = statusData[sensorId] || [];
            const lastPoint = points.length > 0 ? points[points.length - 1] : null;
            const isOpen = lastPoint ? lastPoint.y === 1 : false;
            const stateText = isOpen ? 'Abierto' : 'Cerrado';
            const stateColor = isOpen ? 'bg-green-500' : 'bg-red-500';
            
            return (
              <div key={sensorId} className="flex items-center gap-2">
                <div className="w-1/4 flex items-center">
                  <div className={`w-3 h-3 rounded-full ${stateColor} mr-2`}></div>
                  <span className="font-medium truncate">{sensorId}</span>
                </div>
                <div className="w-3/4 overflow-hidden rounded-lg">
                  {renderSensorTimeline(sensorId, points)}
                </div>
              </div>
            );
          })}
        </div>
      )}
      
      {/* Leyenda */}
      <div className="mt-4 flex justify-end gap-4 text-xs text-gray-600">
        <div className="flex items-center">
          <div className="w-3 h-3 rounded-full bg-green-500 mr-1"></div>
          <span>Abierto</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 rounded-full bg-red-500 mr-1"></div>
          <span>Cerrado</span>
        </div>
      </div>
    </div>
  );
};

export default TimelineStatusView;