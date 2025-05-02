import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Download, Eye, FileJson, Loader2, BarChart4, Table, NetworkTree, Clock } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface SensorDataProps {
  session: any;
}

/**
 * Versión mejorada del visualizador de datos de sensores con múltiples tipos de visualización
 * Incluye visualizaciones similares a las proporcionadas en los componentes de referencia
 */
const EnhancedSensorDataViewer: React.FC<SensorDataProps> = ({ session }) => {
  const [activeTab, setActiveTab] = useState('chart');
  const { toast } = useToast();
  
  // Obtener datos de sensores usando React Query
  const {
    data: sensorData,
    isLoading,
    isError,
    error,
    refetch
  } = useQuery({
    queryKey: [`/api/sessions/${session.id}/sensor-data`],
    enabled: !!session?.id && session.status === 'completed',
    staleTime: 300000, // 5 minutos de caché
    retry: 1,
    onError: (error: Error) => {
      console.error('Error fetching sensor data:', error);
    }
  });
  
  // Verificar si tenemos datos de sensores
  const hasSensorData = sensorData && Array.isArray(sensorData) && sensorData.length > 0;
  
  // Preparar datos para los diferentes tipos de visualización
  const preparedData = useMemo(() => {
    if (!hasSensorData) return { chartData: [], sensorsMap: {}, uniqueSensors: [] };
    
    try {
      const chartData = sensorData || [];
      
      // Organizar datos por sensor para vistas jerárquicas y de tabla
      const sensorsMap: Record<string, any[]> = {};
      
      chartData.forEach(item => {
        let sensorId = '';
        
        // Identificar sensor por diferentes claves posibles
        if (item.sensor && typeof item.sensor === 'string') {
          sensorId = item.sensor;
        } else if (item.device && typeof item.device === 'string') {
          sensorId = item.device;
        } else if (item.topic && typeof item.topic === 'string') {
          sensorId = item.topic.split('/').pop() || item.topic;
        } else if (item.id) {
          sensorId = item.id.toString();
        } else {
          return; // Skip this item if no identifier found
        }
        
        // Inicializar array para este sensor si no existe
        if (!sensorsMap[sensorId]) {
          sensorsMap[sensorId] = [];
        }
        
        // Formato común para todos los items
        sensorsMap[sensorId].push({
          x: item.timestamp || new Date(item.timestamp).toISOString(),
          y: getValue(item),
          battery: item.battery || (item.data && item.data.battery) || 0,
          linkquality: item.linkquality || (item.data && item.data.linkquality) || 0,
          payload: item,
          timestamp: item.timestamp
        });
      });
      
      // Ordenar datos por timestamp para cada sensor
      Object.keys(sensorsMap).forEach(sensorId => {
        sensorsMap[sensorId].sort((a, b) => {
          return new Date(a.x).getTime() - new Date(b.x).getTime();
        });
      });
      
      // Extraer sensores únicos
      const uniqueSensors = Object.keys(sensorsMap).map(sensorId => ({
        id: sensorId,
        name: getSensorFriendlyName(sensorId),
        data: sensorsMap[sensorId]
      }));
      
      return { chartData, sensorsMap, uniqueSensors };
    } catch (e) {
      console.error('Error preparing chart data:', e);
      return { chartData: [], sensorsMap: {}, uniqueSensors: [] };
    }
  }, [sensorData, hasSensorData]);
  
  // Función auxiliar para obtener valor numérico de un dato de sensor
  function getValue(item: any): number {
    if (item.value !== undefined) return Number(item.value);
    if (item.data && item.data.value !== undefined) return Number(item.data.value);
    if (item.temperature !== undefined) return Number(item.temperature);
    if (item.humidity !== undefined) return Number(item.humidity);
    if (item.pressure !== undefined) return Number(item.pressure);
    if (item.contact !== undefined) return item.contact ? 1 : 0;
    if (item.occupancy !== undefined) return item.occupancy ? 1 : 0;
    if (item.presence !== undefined) return item.presence ? 1 : 0;
    if (item.battery !== undefined) return Number(item.battery);
    
    // Buscar primera propiedad numérica
    for (const key in item) {
      if (typeof item[key] === 'number') {
        return item[key];
      }
    }
    
    return 0;
  }
  
  // Función para obtener nombre amigable
  function getSensorFriendlyName(sensorId: string): string {
    // Extraer parte final del tópico como nombre
    if (sensorId.includes('/')) {
      const parts = sensorId.split('/');
      return parts[parts.length - 1];
    }
    return sensorId;
  }
  
  // Generar colores para cada sensor
  const getColorForSensor = (index: number) => {
    const colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088FE', '#00C49F', '#FFBB28', '#FF8042'];
    return colors[index % colors.length];
  };
  
  // Formatear fecha para el eje X
  const formatXAxis = (timestamp: any) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return `${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}`;
  };
  
  // Manejar descarga de datos
  const handleDownloadData = () => {
    try {
      const dataStr = JSON.stringify(preparedData.chartData, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      
      const exportFileDefaultName = `${session.name || 'session'}_sensor_data.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
      
      toast({
        title: "Datos descargados",
        description: `Datos de sensores guardados como ${exportFileDefaultName}`,
      });
    } catch (error) {
      console.error('Error downloading data:', error);
      toast({
        variant: "destructive",
        title: "Error de descarga",
        description: "No se pudieron descargar los datos. Intente nuevamente.",
      });
    }
  };
  
  // Renderizar vista de gráfico de múltiples sensores
  const renderMultiSensorChart = () => {
    const { uniqueSensors } = preparedData;
    
    if (uniqueSensors.length === 0) {
      return (
        <div className="text-center p-6 text-muted-foreground">
          <p>No hay datos disponibles para graficar</p>
        </div>
      );
    }
    
    return (
      <div className="h-[400px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            margin={{
              top: 5,
              right: 30,
              left: 20,
              bottom: 5,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="timestamp" 
              tickFormatter={formatXAxis} 
              label={{ value: 'Tiempo', position: 'insideBottomRight', offset: -10 }} 
            />
            <YAxis label={{ value: 'Valor', angle: -90, position: 'insideLeft' }} />
            <Tooltip />
            <Legend />
            
            {uniqueSensors.map((sensor, index) => (
              <Line
                key={sensor.id}
                data={sensor.data}
                type="monotone"
                dataKey="y"
                name={sensor.name}
                stroke={getColorForSensor(index)}
                dot={false}
                activeDot={{ r: 6 }}
                connectNulls={true}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  };
  
  // Renderizar vista tabular de sensores
  const renderTabularView = () => {
    const { uniqueSensors } = preparedData;
    
    if (uniqueSensors.length === 0) {
      return (
        <div className="text-center p-6 text-muted-foreground">
          <p>No hay datos disponibles para mostrar en formato tabular</p>
        </div>
      );
    }
    
    return (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Sensor
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Último valor
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Batería
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Calidad de señal
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Última actualización
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {uniqueSensors.map((sensor) => {
              const lastDataPoint = sensor.data.length > 0 ? sensor.data[sensor.data.length - 1] : null;
              
              if (!lastDataPoint) return null;
              
              return (
                <tr key={sensor.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {sensor.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {lastDataPoint.y}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex items-center">
                      <div className={`w-2 h-2 rounded-full mr-2 ${lastDataPoint.battery < 20 ? 'bg-red-500' : 'bg-green-500'}`}></div>
                      {lastDataPoint.battery}%
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex items-center">
                      <div className={`w-2 h-2 rounded-full mr-2 ${lastDataPoint.linkquality < 30 ? 'bg-red-500' : 'bg-green-500'}`}></div>
                      {lastDataPoint.linkquality}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {lastDataPoint.x ? new Date(lastDataPoint.x).toLocaleString() : 'N/A'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };
  
  // Renderizar vista jerárquica
  const renderHierarchicalView = () => {
    const { sensorsMap } = preparedData;
    const sensorIds = Object.keys(sensorsMap);
    
    if (sensorIds.length === 0) {
      return (
        <div className="text-center p-6 text-muted-foreground">
          <p>No hay datos disponibles para mostrar en vista jerárquica</p>
        </div>
      );
    }
    
    // Agrupar sensores por categoría
    const categories: Record<string, any[]> = {};
    
    sensorIds.forEach(sensorId => {
      let category = 'Otros';
      
      // Intentar determinar categoría basada en el ID
      if (sensorId.includes('temperature') || sensorId.includes('temp')) {
        category = 'Temperatura';
      } else if (sensorId.includes('humidity') || sensorId.includes('hum')) {
        category = 'Humedad';
      } else if (sensorId.includes('contact') || sensorId.includes('door') || sensorId.includes('window')) {
        category = 'Contactos';
      } else if (sensorId.includes('motion') || sensorId.includes('presence') || sensorId.includes('occupancy')) {
        category = 'Movimiento';
      } else if (sensorId.includes('light') || sensorId.includes('illuminance')) {
        category = 'Iluminación';
      } else if (sensorId.includes('device')) {
        category = 'Dispositivos';
      }
      
      if (!categories[category]) {
        categories[category] = [];
      }
      
      categories[category].push({
        id: sensorId,
        name: getSensorFriendlyName(sensorId),
        data: sensorsMap[sensorId]
      });
    });
    
    return (
      <div className="space-y-4">
        {Object.keys(categories).map(category => (
          <div key={category} className="border rounded-lg overflow-hidden">
            <div className="bg-gray-50 px-4 py-2 font-medium">{category}</div>
            <div className="divide-y">
              {categories[category].map(sensor => {
                const lastDataPoint = sensor.data.length > 0 ? sensor.data[sensor.data.length - 1] : null;
                if (!lastDataPoint) return null;
                
                return (
                  <div key={sensor.id} className="px-4 py-3 flex justify-between items-center">
                    <div>
                      <div className="font-medium">{sensor.name}</div>
                      <div className="text-xs text-gray-500">{sensor.id}</div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <div className="text-sm">{lastDataPoint.y}</div>
                        <div className="text-xs text-gray-500">
                          {new Date(lastDataPoint.x).toLocaleTimeString()}
                        </div>
                      </div>
                      <div className={`w-3 h-3 rounded-full ${lastDataPoint.battery < 20 ? 'bg-red-500' : 'bg-green-500'}`}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    );
  };
  
  // Renderizar vista de línea de tiempo
  const renderTimelineView = () => {
    const { sensorsMap } = preparedData;
    const sensorIds = Object.keys(sensorsMap);
    
    if (sensorIds.length === 0) {
      return (
        <div className="text-center p-6 text-muted-foreground">
          <p>No hay datos disponibles para mostrar en línea de tiempo</p>
        </div>
      );
    }
    
    // Obtener rangos de tiempo de la sesión
    const startTime = session.startTime ? new Date(session.startTime) : new Date();
    const endTime = session.endTime ? new Date(session.endTime) : new Date();
    const sessionDuration = endTime.getTime() - startTime.getTime();
    
    return (
      <div className="space-y-4">
        <div className="flex justify-between text-xs text-gray-500 px-2">
          <div>{startTime.toLocaleTimeString()}</div>
          <div>{endTime.toLocaleTimeString()}</div>
        </div>
        
        {sensorIds.map(sensorId => {
          const sensor = {
            id: sensorId,
            name: getSensorFriendlyName(sensorId),
            data: sensorsMap[sensorId]
          };
          
          // Crear bloques de estado para la línea de tiempo
          const timeBlocks = [];
          let lastState: number | null = null;
          let lastTime = startTime;
          
          // Ordenar datos por tiempo
          const sortedData = [...sensor.data].sort((a, b) => 
            new Date(a.x).getTime() - new Date(b.x).getTime()
          );
          
          // Generar bloques de estado
          sortedData.forEach((dataPoint, index) => {
            const pointTime = new Date(dataPoint.x);
            const state = dataPoint.y;
            
            // Si es el primer punto o hubo cambio de estado
            if (index === 0 || lastState !== state) {
              // Si no es el primer punto, cerrar bloque anterior
              if (index > 0) {
                timeBlocks.push({
                  start: lastTime,
                  end: pointTime,
                  state: lastState
                });
              }
              
              lastState = state;
              lastTime = pointTime;
            }
          });
          
          // Añadir último bloque hasta el final
          if (lastState !== null) {
            timeBlocks.push({
              start: lastTime,
              end: endTime,
              state: lastState
            });
          }
          
          return (
            <div key={sensorId} className="mb-2">
              <div className="flex items-center mb-1">
                <div className="text-sm font-medium w-1/3 truncate">{sensor.name}</div>
                <div className="flex-1 relative h-6 bg-gray-100 rounded">
                  {timeBlocks.map((block, index) => {
                    const startPercent = ((block.start.getTime() - startTime.getTime()) / sessionDuration) * 100;
                    const widthPercent = ((block.end.getTime() - block.start.getTime()) / sessionDuration) * 100;
                    
                    return (
                      <div 
                        key={index}
                        className={`absolute h-full rounded ${block.state ? 'bg-green-500' : 'bg-red-500'}`}
                        style={{ 
                          left: `${startPercent}%`, 
                          width: `${widthPercent}%`,
                          minWidth: '2px'
                        }}
                        title={`${block.start.toLocaleTimeString()} - ${block.end.toLocaleTimeString()}: ${block.state ? 'Activo' : 'Inactivo'}`}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };
  
  // Mostrar datos en formato JSON
  const renderJsonView = () => {
    try {
      return (
        <pre className="bg-slate-50 p-4 rounded-md overflow-auto max-h-[500px] text-xs">
          {JSON.stringify(preparedData.chartData, null, 2)}
        </pre>
      );
    } catch (e) {
      return <p className="text-red-500">Error al mostrar datos JSON</p>;
    }
  };
  
  return (
    <Card className="mt-4">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-base">Datos de Sensores - {session.name}</CardTitle>
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => refetch()}
              disabled={isLoading}
            >
              <Loader2 className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Actualizar
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleDownloadData}
              disabled={!hasSensorData || preparedData.chartData.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              Descargar
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center p-6">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Cargando datos de sensores...</p>
          </div>
        ) : isError ? (
          <div className="text-center p-6 text-amber-600">
            <p>Error al cargar datos de sensores</p>
            <p className="text-sm mt-2 text-muted-foreground">{(error as Error)?.message || "Intente nuevamente más tarde"}</p>
          </div>
        ) : hasSensorData && preparedData.chartData.length > 0 ? (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="chart">
                <BarChart4 className="h-4 w-4 mr-2" />
                Gráfico
              </TabsTrigger>
              <TabsTrigger value="table">
                <Table className="h-4 w-4 mr-2" />
                Tabla
              </TabsTrigger>
              <TabsTrigger value="hierarchical">
                <NetworkTree className="h-4 w-4 mr-2" />
                Jerárquica
              </TabsTrigger>
              <TabsTrigger value="timeline">
                <Clock className="h-4 w-4 mr-2" />
                Línea de Tiempo
              </TabsTrigger>
              <TabsTrigger value="json">
                <FileJson className="h-4 w-4 mr-2" />
                Datos Crudos
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="chart" className="pt-2">
              {renderMultiSensorChart()}
            </TabsContent>
            
            <TabsContent value="table" className="pt-2">
              {renderTabularView()}
            </TabsContent>
            
            <TabsContent value="hierarchical" className="pt-2">
              {renderHierarchicalView()}
            </TabsContent>
            
            <TabsContent value="timeline" className="pt-2">
              {renderTimelineView()}
            </TabsContent>
            
            <TabsContent value="json" className="pt-2">
              {renderJsonView()}
            </TabsContent>
          </Tabs>
        ) : (
          <div className="text-center p-6 text-muted-foreground">
            <p>No hay datos de sensores disponibles para esta sesión</p>
            <p className="text-sm mt-2">Los datos de sensores solo se capturan durante sesiones de grabación activas</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default EnhancedSensorDataViewer;