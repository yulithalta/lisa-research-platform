import React, { useState, useEffect, useRef } from "react";
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from "chart.js";
import { Line } from "react-chartjs-2";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { Sensor } from "@shared/schema";

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface SensorCardProps {
  sensor: Sensor;
}

// Compatibility wrapper to handle both interfaces
export default function SensorCard({ sensor }: SensorCardProps) {
  // Extract data from sensor object for compatibility
  const sensorName = sensor.name || "";
  const sensorData = sensor.readings || [];
  const imageUrl = sensor.imageUrl || undefined;
  
  return <SensorCardComponent 
    sensorName={sensorName} 
    sensorData={sensorData} 
    imageUrl={imageUrl} 
  />;
}

interface SensorCardComponentProps {
  sensorName: string;
  sensorData: Array<any>;
  imageUrl?: string;
  onImageChange?: (url: string) => void;
}

export function SensorCardComponent({ sensorName, sensorData, imageUrl, onImageChange }: SensorCardComponentProps) {
  const [imageInput, setImageInput] = useState("");
  const [showImageInput, setShowImageInput] = useState(false);
  const [showEvents, setShowEvents] = useState(false);
  const chartRef = useRef(null);
  
  const validData = React.useMemo(() => {
    return (sensorData || [])
      .filter(entry => (
        entry && 
        typeof entry.y !== 'undefined' && 
        entry.x && 
        !isNaN(new Date(entry.x).getTime())
      ))
      .slice(-20);
  }, [sensorData]);
  
  const lastEntry = validData.length > 0 ? validData[validData.length - 1] : {
    y: 0,
    battery: 0, 
    linkquality: 0,
    x: new Date()
  };
  
  const lastEvents = validData.slice(-5).reverse();
  
  const chartData = {
    labels: validData.map(entry => {
      const date = new Date(entry.x);
      return date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'});
    }),
    datasets: [{
      label: `Estado`,
      data: validData.map(entry => entry.y),
      fill: false,
      backgroundColor: 'rgb(75, 192, 192)',
      borderColor: 'rgba(75, 192, 192, 0.8)',
      stepped: false,
      tension: 0.4,
      pointRadius: 2,
    }]
  };
  
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            return context.raw === 1 ? 'Abierto' : 'Cerrado';
          }
        }
      }
    },
    scales: {
      x: {
        display: true,
        ticks: {
          maxRotation: 0,
          autoSkip: true,
          maxTicksLimit: 5,
          font: { size: 9 }
        }
      },
      y: {
        display: true,
        min: 0,
        max: 1,
        ticks: {
          stepSize: 1,
          callback: function(value: number) {
            return value === 1 ? 'Abierto' : 'Cerrado';
          },
          font: { size: 9 }
        }
      }
    }
  };
  
  const handleImageUpdate = () => {
    if (imageInput.trim() && onImageChange) {
      onImageChange(imageInput.trim());
      setImageInput("");
      setShowImageInput(false);
    }
  };
  
  if (!sensorData || validData.length === 0) {
    return (
      <Card className="p-3 flex flex-col h-full">
        <div className="flex items-center mb-2">
          <img
            src={imageUrl || "/sensor-icon.png"}
            alt={`Sensor ${sensorName}`}
            className="w-12 h-12 rounded-lg object-contain border p-1"
            onError={(e) => {
              (e.target as HTMLImageElement).onerror = null;
              (e.target as HTMLImageElement).src = "/sensor-icon.png";
            }}
          />
          <div className="ml-2">
            <h3 className="text-base font-semibold">{sensorName}</h3>
            <p className="text-xs text-muted-foreground">Esperando datos...</p>
          </div>
        </div>
        
        <div className="h-24 flex items-center justify-center bg-accent/10 rounded text-xs">
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
          <p className="text-muted-foreground">No hay datos disponibles</p>
        </div>
      </Card>
    );
  }
  
  return (
    <Card className="p-3 flex flex-col h-full">
      <div className="flex items-start mb-2">
        <div className="relative mr-2 group">
          <img
            src={imageUrl || "/sensor-icon.png"}
            alt={`Sensor ${sensorName}`}
            className="w-12 h-12 rounded-lg object-contain border p-1"
            onError={(e) => {
              (e.target as HTMLImageElement).onerror = null;
              (e.target as HTMLImageElement).src = "/sensor-icon.png";
            }}
          />
          {onImageChange && (
            <button
              className="absolute -top-1 -right-1 bg-accent hover:bg-accent/80 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => setShowImageInput(!showImageInput)}
              type="button"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold truncate">{sensorName}</h3>
          <div className="grid grid-cols-2 gap-x-2 text-xs">
            <div className="flex items-center">                
              <div className={`h-2 w-2 rounded-full mr-1 ${lastEntry.y === 1 ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span>{lastEntry.y === 0 ? 'Cerrado' : 'Abierto'}</span>
            </div>
            <div>🔋 {lastEntry.battery || 0}%</div>
            <div>📶 {lastEntry.linkquality || 0} LQI</div>
            <div className="text-xs text-muted-foreground">
              {lastEntry.x ? new Date(lastEntry.x).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'}) : ''}
            </div>
          </div>
        </div>
      </div>
      
      {showImageInput && (
        <div className="mb-2 flex">
          <input
            type="text"
            className="flex-1 h-8 px-2 text-xs border rounded-l"
            placeholder="URL de imagen"
            value={imageInput}
            onChange={(e) => setImageInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleImageUpdate()}
          />
          <Button
            variant="default"
            size="sm"
            className="rounded-l-none text-xs h-8"
            onClick={handleImageUpdate}
          >
            OK
          </Button>
        </div>
      )}
      
      <div className="chart-container my-1 mx-auto w-full" style={{ height: '120px' }}>
        {validData.length > 0 && (
          <Line
            ref={chartRef}
            data={chartData}
            options={chartOptions}
            key={`chart-${sensorName}-${Date.now()}`}
          />
        )}
      </div>
      
      <div className="mt-auto">
        <Button
          variant="ghost"
          size="sm"
          className="text-xs w-full justify-start hover:bg-accent/5"
          onClick={() => setShowEvents(!showEvents)}
        >
          {showEvents ? 'Ocultar eventos' : 'Ver últimos 5 eventos'}
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className={`h-3 w-3 ml-1 transition-transform ${showEvents ? 'rotate-180' : ''}`} 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </Button>
        
        {showEvents && (
          <div className="mt-1 overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-accent/5">
                  <th className="p-1 border text-left font-medium">Tiempo</th>
                  <th className="p-1 border text-center font-medium">Estado</th>
                  <th className="p-1 border text-center font-medium">Batería</th>
                  <th className="p-1 border text-center font-medium">Señal</th>
                </tr>
              </thead>
              <tbody>
                {lastEvents.map((event, index) => (
                  <tr key={index} className={index % 2 === 0 ? 'bg-accent/5' : ''}>
                    <td className="p-1 border">
                      {event.x ? new Date(event.x).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'}) : 'N/A'}
                    </td>
                    <td className="p-1 border text-center">
                      <span className={`inline-block w-2 h-2 rounded-full ${event.y === 1 ? 'bg-green-500' : 'bg-red-500'}`}></span>
                    </td>
                    <td className="p-1 border text-center">{event.battery || 0}%</td>
                    <td className="p-1 border text-center">{event.linkquality || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Card>
  );
}
