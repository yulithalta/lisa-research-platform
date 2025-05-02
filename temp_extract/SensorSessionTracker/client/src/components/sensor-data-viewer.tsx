import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Download, Eye, FileJson, Loader2 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';

interface SensorDataProps {
  session: any;
}

const SensorDataViewer: React.FC<SensorDataProps> = ({ session }) => {
  const [activeTab, setActiveTab] = useState('chart');
  const { toast } = useToast();
  
  // Obtener datos de sensores usando React Query
  const {
    data: sensorData,
    isLoading,
    isError,
    error
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
  
  // Preparar datos para el gráfico
  const prepareChartData = () => {
    if (!hasSensorData) return [];
    
    try {
      return sensorData || [];
    } catch (e) {
      console.error('Error preparing chart data:', e);
      return [];
    }
  };
  
  // Extraer sensores únicos de los datos y sus valores
  const getUniqueSensors = (data: any[]) => {
    if (!Array.isArray(data) || data.length === 0) return [];
    
    const sensors = new Map<string, {
      id: string;
      valueKey: string;
      unit?: string;
    }>();
    
    data.forEach(item => {
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
      
      // Determine value key - search for common value keys
      let valueKey = 'value';
      let unit = '';
      
      if (item.value !== undefined) {
        valueKey = 'value';
      } else if (item.data && typeof item.data === 'object' && item.data.value !== undefined) {
        valueKey = 'data.value';
        // Check if we have a unit
        if (item.data.unit) {
          unit = item.data.unit;
        }
      } else if (item.temperature !== undefined) {
        valueKey = 'temperature';
        unit = '°C';
      } else if (item.humidity !== undefined) {
        valueKey = 'humidity';
        unit = '%';
      } else if (item.pressure !== undefined) {
        valueKey = 'pressure';
        unit = 'hPa';
      } else if (item.battery !== undefined) {
        valueKey = 'battery';
        unit = '%';
      } else {
        // Look for first numeric property
        for (const key in item) {
          if (typeof item[key] === 'number') {
            valueKey = key;
            break;
          }
        }
      }
      
      // Add to map only if not already present
      if (!sensors.has(sensorId)) {
        sensors.set(sensorId, { id: sensorId, valueKey, unit });
      }
    });
    
    return Array.from(sensors.values());
  };
  
  const chartData = prepareChartData();
  const uniqueSensors = getUniqueSensors(chartData);
  
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
      const dataStr = JSON.stringify(chartData, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      
      const exportFileDefaultName = `${session.name || 'session'}_sensor_data.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
      
      toast({
        title: "Data downloaded",
        description: `Sensor data saved as ${exportFileDefaultName}`,
      });
    } catch (error) {
      console.error('Error downloading data:', error);
      toast({
        variant: "destructive",
        title: "Download error",
        description: "Could not download sensor data. Please try again.",
      });
    }
  };
  
  // Mostrar datos en formato JSON
  const renderJsonView = () => {
    try {
      return (
        <pre className="bg-slate-50 p-4 rounded-md overflow-auto max-h-[500px] text-xs">
          {JSON.stringify(chartData, null, 2)}
        </pre>
      );
    } catch (e) {
      return <p className="text-red-500">Error displaying JSON data</p>;
    }
  };
  
  return (
    <Card className="mt-4">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-base">Sensor Data</CardTitle>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleDownloadData}
            disabled={!hasSensorData || chartData.length === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center p-6">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Loading sensor data...</p>
          </div>
        ) : isError ? (
          <div className="text-center p-6 text-amber-600">
            <p>Error loading sensor data</p>
            <p className="text-sm mt-2 text-muted-foreground">{error?.message || "Please try again later"}</p>
          </div>
        ) : hasSensorData && chartData.length > 0 ? (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="chart">
                <Eye className="h-4 w-4 mr-2" />
                Chart View
              </TabsTrigger>
              <TabsTrigger value="json">
                <FileJson className="h-4 w-4 mr-2" />
                Raw Data
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="chart" className="pt-2">
              <div className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={chartData}
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
                      label={{ value: 'Time', position: 'insideBottomRight', offset: -10 }} 
                    />
                    <YAxis label={{ value: 'Value', angle: -90, position: 'insideLeft' }} />
                    <Tooltip />
                    <Legend />
                    {uniqueSensors.map((sensor, index) => (
                      <Line
                        key={sensor.id}
                        type="monotone"
                        dataKey={(entry) => {
                          try {
                            // Handle nested keys like "data.value"
                            if (sensor.valueKey.includes('.')) {
                              const parts = sensor.valueKey.split('.');
                              let value = entry;
                              for (const part of parts) {
                                if (value && typeof value === 'object') {
                                  value = value[part];
                                } else {
                                  return null;
                                }
                              }
                              return typeof value === 'number' ? value : parseFloat(value) || null;
                            }
                            
                            // Handle direct keys
                            const value = entry[sensor.valueKey];
                            return typeof value === 'number' ? value : parseFloat(value) || null;
                          } catch (error) {
                            console.error('Error getting data for', sensor.id, error);
                            return null;
                          }
                        }}
                        name={`${sensor.id}${sensor.unit ? ` (${sensor.unit})` : ''}`}
                        stroke={getColorForSensor(index)}
                        dot={false}
                        activeDot={{ r: 6 }}
                        connectNulls={true}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </TabsContent>
            
            <TabsContent value="json" className="pt-2">
              {renderJsonView()}
            </TabsContent>
          </Tabs>
        ) : (
          <div className="text-center p-6 text-muted-foreground">
            <p>No sensor data available for this session</p>
            <p className="text-sm mt-2">Sensors are captured only during active recording sessions</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SensorDataViewer;