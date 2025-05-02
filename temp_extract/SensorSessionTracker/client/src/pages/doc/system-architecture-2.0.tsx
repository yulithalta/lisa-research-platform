import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ZoomIn, ZoomOut, RotateCcw, Download, Database, Server } from "lucide-react";

export default function SystemArchitecture20Page() {
  const [scale, setScale] = useState(1);
  const [svgContent, setSvgContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch SVG content
  useEffect(() => {
    fetch('/doc/system-architecture-2.0.svg')
      .then(response => response.text())
      .then(data => {
        setSvgContent(data);
        setLoading(false);
      })
      .catch(error => {
        console.error('Error loading SVG:', error);
        setLoading(false);
      });
  }, []);

  const handleZoomIn = () => {
    setScale(prev => Math.min(prev + 0.2, 2));
  };

  const handleZoomOut = () => {
    setScale(prev => Math.max(prev - 0.2, 0.5));
  };

  const handleReset = () => {
    setScale(1);
  };

  const handleDownload = () => {
    if (!svgContent) return;
    
    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'LISA-System-Architecture-2.0.svg';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="container mx-auto py-8 max-w-screen-2xl">
      <h1 className="text-3xl font-bold mb-2">System Architecture 2.0</h1>
      <p className="text-muted-foreground mb-8">
        Enhanced system architecture with PostgreSQL, Redis, and Docker Swarm integration
      </p>

      <Tabs defaultValue="diagram" className="w-full">
        <TabsList className="mb-4 bg-muted/50 p-1 border border-border/60 shadow-sm">
          <TabsTrigger
            value="diagram"
            className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm"
          >
            <Server className="h-4 w-4" />
            Architecture Diagram
          </TabsTrigger>
          <TabsTrigger
            value="description"
            className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm"
          >
            <Database className="h-4 w-4" />
            Technical Details
          </TabsTrigger>
        </TabsList>

        <TabsContent value="diagram" className="space-y-6">
          <Card className="border-border/60 shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div>
                <CardTitle>LISA System Architecture 2.0</CardTitle>
                <CardDescription>
                  PostgreSQL, Redis, and Docker Swarm Architecture
                </CardDescription>
              </div>
              <div className="flex space-x-2">
                <Button variant="outline" size="sm" onClick={handleZoomIn}>
                  <ZoomIn className="h-4 w-4 mr-1" />
                  Zoom In
                </Button>
                <Button variant="outline" size="sm" onClick={handleZoomOut}>
                  <ZoomOut className="h-4 w-4 mr-1" />
                  Zoom Out
                </Button>
                <Button variant="outline" size="sm" onClick={handleReset}>
                  <RotateCcw className="h-4 w-4 mr-1" />
                  Reset
                </Button>
                <Button variant="outline" size="sm" onClick={handleDownload}>
                  <Download className="h-4 w-4 mr-1" />
                  Download
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="w-full h-[600px] flex items-center justify-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                </div>
              ) : svgContent ? (
                <div 
                  className="w-full overflow-auto border border-border/20 rounded-lg bg-white shadow-inner"
                  style={{ height: '600px' }}
                >
                  <div 
                    style={{ 
                      transform: `scale(${scale})`,
                      transformOrigin: 'top left',
                      width: 'fit-content',
                      transition: 'transform 0.2s ease-in-out'
                    }}
                    dangerouslySetInnerHTML={{ __html: svgContent }} 
                  />
                </div>
              ) : (
                <div className="w-full h-[600px] flex items-center justify-center bg-muted/20 rounded-lg">
                  <div className="text-center p-6">
                    <h3 className="text-lg font-medium mb-2">Error Loading Diagram</h3>
                    <p className="text-muted-foreground">
                      Unable to load the architecture diagram. Please try again later.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          
          <Card className="border-border/60 shadow-md">
            <CardHeader>
              <CardTitle>Legend</CardTitle>
              <CardDescription>
                Components and connections explanation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <h3 className="font-medium mb-2">Infrastructure</h3>
                  <ul className="space-y-1 text-sm">
                    <li className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-blue-100 border border-blue-400 rounded-sm"></div>
                      <span>Docker Services - Containerized components</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-white border border-gray-400 rounded-sm"></div>
                      <span>Application Components - Core functionality</span>
                    </li>
                  </ul>
                </div>
                
                <div>
                  <h3 className="font-medium mb-2">Data Storage</h3>
                  <ul className="space-y-1 text-sm">
                    <li className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-orange-100 border border-orange-400 rounded-sm"></div>
                      <span>PostgreSQL - Persistent database</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-red-100 border border-red-400 rounded-sm"></div>
                      <span>Redis - Session and cache storage</span>
                    </li>
                  </ul>
                </div>
                
                <div>
                  <h3 className="font-medium mb-2">Communication</h3>
                  <ul className="space-y-1 text-sm">
                    <li className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-purple-100 border border-purple-400 rounded-sm"></div>
                      <span>MQTT - IoT communication protocol</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-green-100 border border-green-400 rounded-sm"></div>
                      <span>Client Components - User interface elements</span>
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="description" className="space-y-6">
          <Card className="border-border/60 shadow-md">
            <CardHeader>
              <CardTitle>Architecture Overview</CardTitle>
              <CardDescription>
                Key components and their interactions
              </CardDescription>
            </CardHeader>
            <CardContent className="prose max-w-none">
              <p>
                The LISA System Architecture 2.0 represents a significant enhancement to the original design, 
                incorporating PostgreSQL for persistent data storage, Redis for session management, and Docker 
                Swarm for container orchestration. This modernized architecture provides improved scalability, 
                reliability, and maintainability.
              </p>
              
              <h3>Key Improvements</h3>
              <ul>
                <li>
                  <strong>Persistent Data Storage</strong>: Replaced JSON file-based storage with PostgreSQL 
                  relational database, providing ACID compliance, transaction support, and improved data integrity.
                </li>
                <li>
                  <strong>Efficient Session Management</strong>: Implemented Redis for high-performance session 
                  storage and caching, enhancing system responsiveness and user experience.
                </li>
                <li>
                  <strong>Containerized Deployment</strong>: All system components are containerized using Docker 
                  and orchestrated with Docker Swarm, enabling easier scaling, deployment, and management.
                </li>
                <li>
                  <strong>Automated Backups</strong>: Dedicated backup service ensures regular and reliable 
                  database and configuration backups.
                </li>
                <li>
                  <strong>Enhanced Scalability</strong>: The architecture supports scaling from 6 to 10,000+ 
                  sensors without performance degradation.
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-md">
            <CardHeader>
              <CardTitle>Docker Swarm Services</CardTitle>
              <CardDescription>
                Containerized components and their responsibilities
              </CardDescription>
            </CardHeader>
            <CardContent className="prose max-w-none">
              <h3>LISA Application Service</h3>
              <p>
                The core application service contains the Express.js API server, WebSocket server, and 
                business logic for handling all user requests and system operations.
              </p>
              <ul>
                <li><strong>Express.js API</strong>: Provides RESTful endpoints for frontend communication</li>
                <li><strong>WebSocket Server</strong>: Enables real-time data transmission for live monitoring</li>
                <li><strong>Storage Module</strong>: Implements the DatabaseStorage interface for PostgreSQL operations</li>
                <li><strong>Auth Module</strong>: Handles user authentication and session management with Redis</li>
              </ul>

              <h3>Database Services</h3>
              <p>
                The database layer consists of PostgreSQL for persistent storage and Redis for session management 
                and caching.
              </p>
              <ul>
                <li>
                  <strong>PostgreSQL</strong>: Stores all system data including users, cameras, sensors, sessions, 
                  and sensor readings in a relational schema with proper constraints and relationships
                </li>
                <li>
                  <strong>Redis</strong>: Manages user sessions and provides high-speed caching for frequently 
                  accessed data
                </li>
              </ul>

              <h3>Support Services</h3>
              <p>
                Additional services provide critical infrastructure capabilities:
              </p>
              <ul>
                <li>
                  <strong>MQTT Broker (Mosquitto)</strong>: Handles sensor communication via the MQTT protocol, 
                  supporting both direct MQTT devices and Zigbee sensors (via Zigbee2MQTT)
                </li>
                <li>
                  <strong>Backup Service</strong>: Performs scheduled backups of the database and configuration 
                  files, ensuring data safety and recovery capabilities
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-md">
            <CardHeader>
              <CardTitle>Data Flow</CardTitle>
              <CardDescription>
                How data moves through the system
              </CardDescription>
            </CardHeader>
            <CardContent className="prose max-w-none">
              <h3>Camera Data Flow</h3>
              <ol>
                <li>IP cameras stream video via RTSP/HTTP protocols</li>
                <li>The LISA application captures these streams during recording sessions</li>
                <li>Video data is processed and stored in the file system</li>
                <li>Metadata about recordings is stored in PostgreSQL</li>
              </ol>

              <h3>Sensor Data Flow</h3>
              <ol>
                <li>Sensors publish data to the MQTT broker (either directly or via Zigbee2MQTT)</li>
                <li>The LISA application subscribes to relevant MQTT topics</li>
                <li>Received sensor data is stored in PostgreSQL</li>
                <li>During active sessions, sensor data is associated with the session via foreign keys</li>
                <li>Real-time sensor updates are sent to clients via WebSockets</li>
              </ol>

              <h3>User Interaction Flow</h3>
              <ol>
                <li>Users interact with the React frontend application</li>
                <li>API requests are sent to the Express.js server</li>
                <li>Authentication is verified using the session data in Redis</li>
                <li>Database operations are performed against PostgreSQL</li>
                <li>Responses are returned to the frontend</li>
                <li>Real-time updates are pushed via WebSockets</li>
              </ol>
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-md">
            <CardHeader>
              <CardTitle>System Requirements</CardTitle>
              <CardDescription>
                Hardware and software requirements
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-medium mb-2">Hardware Requirements</h3>
                  <ul className="space-y-1 text-sm">
                    <li><strong>CPU</strong>: Minimum 4 cores (8+ recommended for large setups)</li>
                    <li><strong>RAM</strong>: Minimum 8GB (16GB+ recommended for multiple cameras)</li>
                    <li><strong>Storage</strong>: SSD for database (min. 100GB), additional storage for recordings</li>
                    <li><strong>Network</strong>: Gigabit Ethernet connection</li>
                  </ul>
                </div>
                
                <div>
                  <h3 className="font-medium mb-2">Software Requirements</h3>
                  <ul className="space-y-1 text-sm">
                    <li><strong>Docker Engine</strong>: Version 20.10.x or later</li>
                    <li><strong>Docker Swarm</strong>: Initialized cluster</li>
                    <li><strong>Node.js</strong>: Version 18.x or later (for development)</li>
                    <li><strong>Web Browser</strong>: Chrome, Firefox, Edge, or Safari (latest versions)</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}