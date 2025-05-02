import React, { useEffect, useState, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Maximize2, Minimize2 } from "lucide-react";

export default function SensorsPage() {
  const { user } = useAuth();
  const iframeContainerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Manejar cambio de estado fullscreen
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement !== null);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Función para alternar pantalla completa
  const toggleFullscreen = async () => {
    if (!iframeContainerRef.current) return;

    try {
      if (!isFullscreen) {
        await iframeContainerRef.current.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (error) {
      console.error('Error al cambiar modo pantalla completa:', error);
    }
  };

  return (
    <div className="flex flex-col">
      <div className="flex justify-end mb-4">
        <Button
          variant="outline"
          size="icon"
          onClick={toggleFullscreen}
        >
          {isFullscreen ? (
            <Minimize2 className="h-4 w-4" />
          ) : (
            <Maximize2 className="h-4 w-4" />
          )}
        </Button>
      </div>

      <div className="h-[calc(100vh-200px)] relative border rounded-lg">
        <div 
          ref={iframeContainerRef}
          className="absolute inset-0 flex items-center justify-center overflow-hidden"
        >
          <iframe 
            src="http://localhost:3002/"
            style={{
              width: '100%',
              height: '100%',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              backgroundColor: 'white'
            }}
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals"
          />
        </div>
      </div>
    </div>
  );
}