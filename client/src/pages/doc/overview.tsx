import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Server, Network, Database, Code } from "lucide-react";

export default function OverviewPage() {
  return (
    <div className="container mx-auto py-8 max-w-7xl">
      <h1 className="text-3xl font-bold mb-2">LISA System Overview</h1>
      <p className="text-muted-foreground mb-8">Living-lab Integrated Sensing Architecture</p>
      
      <Card className="mb-8 border-border/60 shadow-md">
        <CardHeader>
          <CardTitle>About LISA</CardTitle>
          <CardDescription>
            A comprehensive system for monitoring IP cameras and MQTT/Zigbee sensors
          </CardDescription>
        </CardHeader>
        <CardContent className="prose max-w-none">
          <p>
            LISA (Living-lab Integrated Sensing Architecture) provides a unified platform for managing, recording, and analyzing data from various sources in research and clinical environments. The system is designed to be highly scalable, supporting between 6 and 10,000 sensors, while maintaining precise synchronization between video recordings and sensor data.
          </p>
          
          <h3>Key Features</h3>
          <ul>
            <li><strong>Session Management</strong> - Create, manage, and organize recording sessions with comprehensive metadata</li>
            <li><strong>Camera Integration</strong> - Connect to IP cameras using RTSP and HTTP protocols</li>
            <li><strong>Sensor Integration</strong> - Capture data from MQTT and Zigbee sensors</li>
            <li><strong>Real-time Monitoring</strong> - View camera feeds and sensor data in real-time</li>
            <li><strong>Data Export</strong> - Download session data in ZIP format with synchronized video and sensor information</li>
            <li><strong>Interactive Onboarding</strong> - Guided tours to help users learn the system</li>
          </ul>
        </CardContent>
      </Card>

      <h2 className="text-2xl font-bold mb-6">System Architecture Components</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Card className="border-border/60 shadow-md">
          <CardHeader className="flex flex-row items-start gap-4 pb-2">
            <Server className="mt-1 h-6 w-6 text-primary" />
            <div>
              <CardTitle>Backend Architecture</CardTitle>
              <CardDescription>Server-side components</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              <li className="flex items-start gap-2">
                <div className="rounded-full bg-primary/10 text-primary h-5 w-5 flex items-center justify-center shrink-0 mt-0.5">•</div>
                <span><strong>Express.js Server</strong> - Handles HTTP requests and serves the frontend</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="rounded-full bg-primary/10 text-primary h-5 w-5 flex items-center justify-center shrink-0 mt-0.5">•</div>
                <span><strong>WebSocket Server</strong> - Manages real-time communication</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="rounded-full bg-primary/10 text-primary h-5 w-5 flex items-center justify-center shrink-0 mt-0.5">•</div>
                <span><strong>FFMPEG Integration</strong> - Processes video streams</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="rounded-full bg-primary/10 text-primary h-5 w-5 flex items-center justify-center shrink-0 mt-0.5">•</div>
                <span><strong>MQTT Client</strong> - Connects to MQTT brokers</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="rounded-full bg-primary/10 text-primary h-5 w-5 flex items-center justify-center shrink-0 mt-0.5">•</div>
                <span><strong>Authentication System</strong> - Manages user access</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-md">
          <CardHeader className="flex flex-row items-start gap-4 pb-2">
            <FileText className="mt-1 h-6 w-6 text-primary" />
            <div>
              <CardTitle>Frontend Architecture</CardTitle>
              <CardDescription>Client-side components</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              <li className="flex items-start gap-2">
                <div className="rounded-full bg-primary/10 text-primary h-5 w-5 flex items-center justify-center shrink-0 mt-0.5">•</div>
                <span><strong>React Components</strong> - UI building blocks</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="rounded-full bg-primary/10 text-primary h-5 w-5 flex items-center justify-center shrink-0 mt-0.5">•</div>
                <span><strong>TanStack Query</strong> - Data fetching and state management</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="rounded-full bg-primary/10 text-primary h-5 w-5 flex items-center justify-center shrink-0 mt-0.5">•</div>
                <span><strong>Wouter Router</strong> - Page navigation</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="rounded-full bg-primary/10 text-primary h-5 w-5 flex items-center justify-center shrink-0 mt-0.5">•</div>
                <span><strong>WebSocket Client</strong> - Real-time updates</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="rounded-full bg-primary/10 text-primary h-5 w-5 flex items-center justify-center shrink-0 mt-0.5">•</div>
                <span><strong>Chart.js Integration</strong> - Data visualization</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="border-border/60 shadow-md">
          <CardHeader className="flex flex-row items-start gap-4 pb-2">
            <Database className="mt-1 h-6 w-6 text-primary" />
            <div>
              <CardTitle>Data Storage</CardTitle>
              <CardDescription>Persisting system data</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              <li className="flex items-start gap-2">
                <div className="rounded-full bg-primary/10 text-primary h-5 w-5 flex items-center justify-center shrink-0 mt-0.5">•</div>
                <span><strong>File-based Storage</strong> - For recordings and sensor data</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="rounded-full bg-primary/10 text-primary h-5 w-5 flex items-center justify-center shrink-0 mt-0.5">•</div>
                <span><strong>JSON Format</strong> - For metadata and sensor readings</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="rounded-full bg-primary/10 text-primary h-5 w-5 flex items-center justify-center shrink-0 mt-0.5">•</div>
                <span><strong>CSV Export</strong> - For data analysis</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-md">
          <CardHeader className="flex flex-row items-start gap-4 pb-2">
            <Network className="mt-1 h-6 w-6 text-primary" />
            <div>
              <CardTitle>Communication</CardTitle>
              <CardDescription>System connectivity</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              <li className="flex items-start gap-2">
                <div className="rounded-full bg-primary/10 text-primary h-5 w-5 flex items-center justify-center shrink-0 mt-0.5">•</div>
                <span><strong>RESTful API</strong> - HTTP endpoints</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="rounded-full bg-primary/10 text-primary h-5 w-5 flex items-center justify-center shrink-0 mt-0.5">•</div>
                <span><strong>WebSockets</strong> - Real-time communication</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="rounded-full bg-primary/10 text-primary h-5 w-5 flex items-center justify-center shrink-0 mt-0.5">•</div>
                <span><strong>MQTT</strong> - Sensor data integration</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-md">
          <CardHeader className="flex flex-row items-start gap-4 pb-2">
            <Code className="mt-1 h-6 w-6 text-primary" />
            <div>
              <CardTitle>Design Patterns</CardTitle>
              <CardDescription>Architecture patterns</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              <li className="flex items-start gap-2">
                <div className="rounded-full bg-primary/10 text-primary h-5 w-5 flex items-center justify-center shrink-0 mt-0.5">•</div>
                <span><strong>Observer Pattern</strong> - For sensor management</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="rounded-full bg-primary/10 text-primary h-5 w-5 flex items-center justify-center shrink-0 mt-0.5">•</div>
                <span><strong>Publish-Subscribe</strong> - For event handling</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="rounded-full bg-primary/10 text-primary h-5 w-5 flex items-center justify-center shrink-0 mt-0.5">•</div>
                <span><strong>Repository Pattern</strong> - For data access</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/60 shadow-md">
        <CardHeader>
          <CardTitle>Technical Specifications</CardTitle>
          <CardDescription>System requirements and limitations</CardDescription>
        </CardHeader>
        <CardContent className="prose max-w-none">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2">Component</th>
                <th className="text-left p-2">Specification</th>
                <th className="text-left p-2">Details</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="p-2 font-medium">Camera Support</td>
                <td className="p-2">IP Cameras with RTSP/HTTP</td>
                <td className="p-2">H.264, H.265 codecs at various resolutions</td>
              </tr>
              <tr className="border-b">
                <td className="p-2 font-medium">Sensor Support</td>
                <td className="p-2">MQTT, Zigbee2MQTT</td>
                <td className="p-2">6 to 10,000 sensors with Observer pattern optimization</td>
              </tr>
              <tr className="border-b">
                <td className="p-2 font-medium">Web Interface</td>
                <td className="p-2">Modern browsers</td>
                <td className="p-2">Chrome, Firefox, Safari, Edge</td>
              </tr>
              <tr className="border-b">
                <td className="p-2 font-medium">Connectivity</td>
                <td className="p-2">Network requirements</td>
                <td className="p-2">Direct network connectivity to cameras and MQTT broker</td>
              </tr>
              <tr className="border-b">
                <td className="p-2 font-medium">Storage</td>
                <td className="p-2">Disk space</td>
                <td className="p-2">Dependent on recording quality and duration</td>
              </tr>
              <tr className="border-b">
                <td className="p-2 font-medium">Session Format</td>
                <td className="p-2">ZIP archive</td>
                <td className="p-2">MP4 videos, JSON and CSV data files</td>
              </tr>
              <tr>
                <td className="p-2 font-medium">Authentication</td>
                <td className="p-2">Session-based auth</td>
                <td className="p-2">Username/password with session persistence</td>
              </tr>
            </tbody>
          </table>
          
          <div className="mt-8">
            <h3>Documentation Resources</h3>
            <p>
              For more detailed information, please refer to the following documentation sections:
            </p>
            <ul>
              <li><a href="/doc/system-architecture" className="text-primary">System Architecture Diagram</a> - Visual representation of the system</li>
              <li><a href="/docs" className="text-primary">Technical Documentation</a> - Full technical reference</li>
              <li><a href="/help" className="text-primary">Help Center</a> - User guides and tutorials</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}