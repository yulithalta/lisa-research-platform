import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Timer, Database } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useWebSocket } from "@/hooks/use-websocket";

interface MetricData {
  fps: number;
  bitrate: number;
  recordingTime: string;
  lastSave: string;
}

export default function MetricsPage() {
  useWebSocket();

  const { data: metrics } = useQuery<MetricData>({
    queryKey: ['metrics'],
    initialData: {
      fps: 0,
      bitrate: 0,
      recordingTime: "00:00:00",
      lastSave: "-"
    }
  });

  return (
    <div className="space-y-8 p-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Métricas en Tiempo Real</h2>
        <p className="text-muted-foreground">
          Monitoreo del rendimiento del sistema de grabación
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">FPS</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.fps.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Cuadros por segundo
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bitrate</CardTitle>
            <Timer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.bitrate.toFixed(1)} kbits/s</div>
            <p className="text-xs text-muted-foreground">
              Tasa de bits actual
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tiempo de Grabación</CardTitle>
            <Timer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.recordingTime}</div>
            <p className="text-xs text-muted-foreground">
              Duración de la grabación actual
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Último Guardado</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold truncate" title={metrics?.lastSave}>
              {metrics?.lastSave}
            </div>
            <p className="text-xs text-muted-foreground">
              Estado del almacenamiento
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}