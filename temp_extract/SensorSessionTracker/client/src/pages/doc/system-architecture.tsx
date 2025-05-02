import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, FileText, ZoomIn, ZoomOut } from "lucide-react";
import { useState, useRef, useEffect } from "react";

export default function SystemArchitecturePage() {
  const [zoom, setZoom] = useState(1);
  const svgRef = useRef<HTMLDivElement>(null);

  // Función para descargar el diagrama SVG
  const downloadSVG = () => {
    const svgElement = svgRef.current?.querySelector("svg");
    if (svgElement) {
      const svgData = new XMLSerializer().serializeToString(svgElement);
      const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
      const svgUrl = URL.createObjectURL(svgBlob);
      
      const downloadLink = document.createElement("a");
      downloadLink.href = svgUrl;
      downloadLink.download = "LISA-system-architecture.svg";
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    }
  };

  // Cargar el SVG desde el archivo
  useEffect(() => {
    fetch('/doc/system-architecture.svg')
      .then(response => response.text())
      .then(svgContent => {
        if (svgRef.current) {
          svgRef.current.innerHTML = svgContent;
        }
      })
      .catch(error => {
        console.error('Error loading SVG diagram:', error);
      });
  }, []);

  return (
    <div className="container mx-auto py-8 max-w-7xl">
      <h1 className="text-3xl font-bold mb-8">Arquitectura del Sistema LISA</h1>
      
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex justify-between items-center">
            <span>Diagrama de Arquitectura</span>
            <div className="flex space-x-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setZoom(prev => Math.max(0.5, prev - 0.1))}
                title="Reducir zoom"
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setZoom(prev => Math.min(2, prev + 0.1))}
                title="Aumentar zoom"
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={downloadSVG}
                title="Descargar SVG"
              >
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-auto border rounded-md p-4 bg-white">
            <div 
              ref={svgRef} 
              style={{ 
                transform: `scale(${zoom})`, 
                transformOrigin: 'top left',
                transition: 'transform 0.2s ease-in-out'
              }}
            >
              {/* El SVG se cargará aquí dinámicamente */}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>
            <FileText className="h-5 w-5 inline-block mr-2" />
            Descripción General
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4">
            LISA (Living-lab Integrated Sensing Architecture) está diseñada como una arquitectura modular que integra
            múltiples componentes para capturar, procesar, almacenar y visualizar datos de cámaras IP y sensores MQTT/Zigbee.
            La arquitectura sigue principios de diseño modernos para asegurar escalabilidad, mantenibilidad y robustez.
          </p>

          <h3 className="text-lg font-semibold mb-2">Componentes Principales</h3>
          <ul className="list-disc pl-6 space-y-2 mb-4">
            <li>
              <strong>Frontend (Cliente):</strong> Implementado con React, utiliza TanStack Query para la gestión del estado y
              las consultas de datos, Wouter para el enrutamiento, y Tailwind CSS para los estilos. Proporciona una interfaz
              de usuario moderna y responsiva.
            </li>
            <li>
              <strong>Backend (Servidor):</strong> Basado en Express.js, gestiona la autenticación, las sesiones de grabación,
              el control de cámaras y sensores, y proporciona una API RESTful para el frontend. También implementa un servidor
              WebSocket para actualizaciones en tiempo real.
            </li>
            <li>
              <strong>Capa de Almacenamiento:</strong> Gestiona el almacenamiento de datos tanto en memoria como en el sistema
              de archivos. Organiza los datos de sesiones, usuarios, cámaras y sensores.
            </li>
            <li>
              <strong>Cámaras IP:</strong> Se conectan a través de RTSP para la transmisión de video y HTTP para la verificación
              de disponibilidad. El sistema utiliza FFMPEG para procesar y grabar los flujos de video.
            </li>
            <li>
              <strong>Sensores MQTT/Zigbee:</strong> Los datos de los sensores se recopilan a través de un broker MQTT y Zigbee2MQTT.
              El sistema implementa el patrón Observer para la gestión escalable de sensores.
            </li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Patrones de Diseño Implementados</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">Patrón Observer</h3>
              <p>
                Implementado para la gestión de sensores, permite que el sistema maneje entre 6 y 10,000 sensores
                de manera eficiente. Este patrón desacopla la adquisición de datos de los sensores del procesamiento
                y almacenamiento, permitiendo una mayor escalabilidad.
              </p>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-2">Patrón Publish-Subscribe</h3>
              <p>
                Utilizado junto con MQTT para crear un sistema de comunicación asíncrono y desacoplado entre los
                sensores y el servidor. Los sensores publican datos en temas MQTT y el servidor se suscribe a estos
                temas para procesar los datos.
              </p>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-2">Arquitectura de Microservicios</h3>
              <p>
                Aunque todos los componentes se ejecutan en un mismo proceso, el sistema está diseñado con una
                separación clara de responsabilidades que permitiría, en el futuro, descomponerlo en microservicios
                independientes para una mayor escalabilidad horizontal.
              </p>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-2">Patrón Repositorio</h3>
              <p>
                Implementado en la capa de almacenamiento para abstraer la persistencia de datos, permitiendo
                cambiar fácilmente entre almacenamiento en memoria y otros sistemas de almacenamiento como
                bases de datos relacionales o NoSQL.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}