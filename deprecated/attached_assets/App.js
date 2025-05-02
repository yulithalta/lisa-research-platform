import React, { useState, useEffect } from "react";
import SensorGrid from "./components/SensorGrid";
import { AlertCircle } from "lucide-react";

function App() {
  const [isLoading, setIsLoading] = useState(true);

  // Simular tiempo de carga para mejorar la experiencia
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Conectando con el broker MQTT...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <header className="mb-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-blue-600">Monitor Zigbee2MQTT</h1>
          <div className="flex items-center text-sm bg-blue-50 text-blue-700 px-3 py-1 rounded-full">
            <AlertCircle className="h-4 w-4 mr-1" />
            <span>v1.0.1</span>
          </div>
        </div>
        <p className="text-gray-600 mt-1">Sistema de monitorización en tiempo real para sensores Zigbee</p>
      </header>
      
      <SensorGrid />
      
      <footer className="mt-8 text-center text-sm text-gray-500">
        <p>Living Lab Monitor &copy; {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
}

export default App;