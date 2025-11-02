import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from '@/components/ui/select';
import { Link } from 'wouter';
import { 
  CalendarDays, Camera, MonitorCheck, Thermometer, 
  ExternalLink, BarChart, Activity
} from 'lucide-react';
import { 
  Line
} from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import useSimpleMqtt from '@/hooks/useSimpleMqtt';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// Types for system statistics
interface SystemStat {
  date: string;
  hours: number;
}

interface SystemStats {
  systemUsage: SystemStat[];
  cameraUsage: SystemStat[];
  sensorUsage: SystemStat[];
}

export default function HomePage() {
  const [dateRange, setDateRange] = useState(7);
  const [services, setServices] = useState<Record<string, boolean>>({});
  
  // Connect to MQTT broker
  const mqtt = useSimpleMqtt();
  
  // Fetch cameras
  const { data: cameras } = useQuery({
    queryKey: ['/api/cameras'],
  });

  // Fetch sessions
  const { data: sessions } = useQuery({
    queryKey: ['/api/sessions'],
  });

  // Fetch recordings
  const { data: recordings } = useQuery({
    queryKey: ['/api/recordings'],
  });
  
  // Fetch system stats
  const { data: systemStats } = useQuery<SystemStats>({
    queryKey: ['/api/system/stats'],
    refetchInterval: 60000 // Refetch every minute
  });

  // Get today's sessions
  const todaySessions = React.useMemo(() => {
    if (!sessions) return [];
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return sessions.filter((session: any) => {
      const sessionDate = new Date(session.startTime);
      sessionDate.setHours(0, 0, 0, 0);
      return sessionDate.getTime() === today.getTime();
    });
  }, [sessions]);

  // Get sensor count
  const { data: sensors } = useQuery({
    queryKey: ['/api/zigbee/devices'],
  });
  
  const sensorCount = sensors?.length || 0;
  
  // Configure system usage chart data
  const filteredSystemUsage = {
    labels: systemStats?.systemUsage
      ? systemStats.systemUsage
          .slice(-dateRange)
          .map((stat: SystemStat) => new Date(stat.date).toLocaleDateString()) 
      : [],
    datasets: [
      {
        label: 'System Engagement Time',
        data: systemStats?.systemUsage
          ? systemStats.systemUsage
              .slice(-dateRange)
              .map((stat: SystemStat) => Math.min(stat.hours, 24))
          : [], // Limit to 24h
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.5)',
        tension: 0.4, // Increase tension to smooth the line
        fill: false
      },
      {
        label: 'Camera Usage Time',
        data: systemStats?.cameraUsage
          ? systemStats.cameraUsage
              .slice(-dateRange)
              .map((stat: SystemStat) => Math.min(stat.hours, 24))
          : [], // Limit to 24h
        borderColor: 'rgb(255, 99, 132)',
        backgroundColor: 'rgba(255, 99, 132, 0.5)',
        tension: 0.4,
        fill: false
      },
      {
        label: 'Sensor Usage Time',
        data: systemStats?.sensorUsage
          ? systemStats.sensorUsage
              .slice(-dateRange)
              .map((stat: SystemStat) => Math.min(stat.hours, 24))
          : [], // Limit to 24h
        borderColor: 'rgb(54, 162, 235)',
        backgroundColor: 'rgba(54, 162, 235, 0.5)',
        tension: 0.4,
        fill: false
      }
    ]
  };

  // Check services status
  useEffect(() => {
    const loadServices = async () => {
      try {
        const serviceUrls = {
          'API Server': window.location.origin,
          'MQTT Broker': `http://${import.meta.env.VITE_HOST_IP || '127.0.0.1'}:1884`,
          'InfluxDB': `http://${import.meta.env.VITE_HOST_IP || '127.0.0.1'}:8086`,
          'Grafana': `http://${import.meta.env.VITE_HOST_IP || '127.0.0.1'}:3000`,
        };
        
        const statuses: Record<string, boolean> = {};
        
        for (const [name, url] of Object.entries(serviceUrls)) {
          const status = await checkServiceStatus(url);
          console.log(`Service ${name} (${url}): ${status ? 'UP' : 'DOWN'}`);
          statuses[name] = status;
        }

        setServices(statuses);
      } catch (error) {
        console.error('Error loading services:', error);
      }
    };

    loadServices();
    const interval = setInterval(loadServices, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold">Dashboard</h1>
              <p className="text-sm text-muted-foreground">
                LISA - Living-lab Integrated Sensing Architecture
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-8">
        {/* Main Metrics */}
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
          <Link href="/device-management">
            <Card className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Cameras</CardTitle>
                <Camera className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{cameras?.length || 0}</div>
                <p className="text-xs text-muted-foreground">
                  Registered cameras
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/device-management">
            <Card className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Sensors</CardTitle>
                <Thermometer className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{sensorCount || 0}</div>
                <p className="text-xs text-muted-foreground">
                  Connected sensors
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/sessions/new">
            <Card className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Sessions</CardTitle>
                <Camera className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{recordings?.length || 0}</div>
                <p className="text-xs text-muted-foreground">
                  Total recorded sessions
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/sessions/new">
            <Card className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Today's Sessions</CardTitle>
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{todaySessions.length || 0}</div>
                <p className="text-xs text-muted-foreground">
                  Sessions today
                </p>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Latest Sessions Table */}
        <Card>
          <CardHeader>
            <CardTitle>Latest Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Session ID</th>
                    <th className="text-left p-2">Session Name</th>
                    <th className="text-left p-2">Duration</th>
                    <th className="text-left p-2">Date</th>
                    <th className="text-left p-2">Link</th>
                  </tr>
                </thead>
                <tbody>
                  {(sessions || [])
                    .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
                    .slice(0, 3)
                    .map((session) => (
                    <tr key={session.id} className="border-b">
                      <td className="p-2">{session.id}</td>
                      <td className="p-2">{session.name || 'Untitled'}</td>
                      <td className="p-2">
                        {session.status === 'completed' && session.endTime 
                          ? Math.round((new Date(session.endTime).getTime() - new Date(session.startTime).getTime()) / (1000 * 60)) + ' min'
                          : session.status === 'completed' ? 'Completed' : 'In progress'}
                      </td>
                      <td className="p-2">
                        {new Date(session.startTime).toLocaleString()}
                      </td>
                      <td className="p-2">
                        <Link href={`/sessions?sessionId=${session.id}`}>
                          <Button variant="link" size="sm">View Details</Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* System Usage Card */}
        <Card>
          <CardHeader>
            <CardTitle>Engagement Time</CardTitle>
            <CardDescription>Session monitoring statistics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <Line 
                data={filteredSystemUsage}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'top',
                    },
                    title: {
                      display: false,
                    },
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      max: 24,
                      title: {
                        display: true,
                        text: 'Hours',
                      },
                    },
                    x: {
                      title: {
                        display: true,
                        text: 'Date',
                      },
                    },
                  },
                }}
              />
            </div>
          </CardContent>
        </Card>


        {/* System Monitor and Service Status */}
        <div className="grid gap-8 grid-cols-1 lg:grid-cols-2">
          {/* System Monitor */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>System Monitor</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(`http://${import.meta.env.VITE_HOST_IP || '127.0.0.1'}:4000`, '_blank')}
              >
                <MonitorCheck className="h-4 w-4 mr-2" />
                Open
              </Button>
            </CardHeader>
            <CardContent className="p-0 relative aspect-video">
              <iframe 
                src={`http://${import.meta.env.VITE_HOST_IP || '127.0.0.1'}:4000`}
                className="w-full h-full absolute inset-0 border-0"
                title="System Monitor"
              />
            </CardContent>
          </Card>

          {/* Services Status */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Services Status</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(`http://${import.meta.env.VITE_HOST_IP || '127.0.0.1'}:9090`, '_blank')}
              >
                <MonitorCheck className="h-4 w-4 mr-2" />
                Open
              </Button>
            </CardHeader>
            <CardContent className="p-0 relative aspect-video">
              <iframe 
                src={`http://${import.meta.env.VITE_HOST_IP || '127.0.0.1'}:9090`}
                className="w-full h-full absolute inset-0 border-0"
                title="System Monitor"
              />
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

// Utility function to check service status
async function checkServiceStatus(url: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    return response.ok;
  } catch (error) {
    console.error(`Error checking service ${url}:`, error);
    return false;
  }
}