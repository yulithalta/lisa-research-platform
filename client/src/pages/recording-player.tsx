import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Recording } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, ArrowLeft } from "lucide-react";
import { Link, useParams } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";

export default function RecordingPlayer() {
  const { id } = useParams();
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);

  const { data: recording } = useQuery<Recording>({
    queryKey: [`/api/recordings/${id}`],
  });

  const handleExport = async () => {
    if (!recording) return;

    try {
      setIsExporting(true);
      const response = await apiRequest(
        "GET",
        `/api/recordings/${id}/export`
      );

      const blob = new Blob([response], { type: 'video/mp4' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;

      // Usar el prefijo y la fecha para el nombre del archivo
      const dateStr = format(new Date(recording.startTime), "yyyy-MM-dd-HHmmss");
      const fileName = `${recording.prefix || `cam${recording.cameraId}`}_${dateStr}.mp4`;
      a.download = fileName;

      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Grabación exportada",
        description: "El archivo se ha descargado correctamente",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo exportar la grabación",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  if (!recording) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/recordings">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">
            {recording.title || `Cámara ${recording.cameraId}`}
          </h1>
        </div>
        <Button 
          onClick={handleExport} 
          disabled={isExporting}
          className="gap-2"
        >
          <Download className="h-4 w-4" />
          Exportar
        </Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="aspect-video bg-black rounded-lg overflow-hidden">
            <video
              controls
              autoPlay
              className="w-full h-full"
              src={`/api/recordings/${recording.id}/stream`}
            />
          </div>
          <div className="mt-4 space-y-2">
            <p className="text-sm text-muted-foreground">
              Inicio: {format(new Date(recording.startTime), "dd/MM/yyyy HH:mm:ss")}
            </p>
            {recording.endTime && (
              <p className="text-sm text-muted-foreground">
                Fin: {format(new Date(recording.endTime), "dd/MM/yyyy HH:mm:ss")}
              </p>
            )}
            {recording.description && (
              <p className="text-sm text-muted-foreground">
                {recording.description}
              </p>
            )}
            <p className="text-sm font-mono text-xs break-all">
              {recording.filePath}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}