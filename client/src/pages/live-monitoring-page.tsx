import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Thermometer, Video } from "lucide-react";
import PlayerPage from "./player-page";
import SensorsPage from "./sensors-page";

export default function LiveMonitoringPage() {
  const [activeTab, setActiveTab] = useState<string>("cameras");

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-2">Live Monitoring</h1>
      <p className="text-muted-foreground mb-6">
        Real-time camera streams and sensor data monitoring
      </p>
      
      <Tabs 
        value={activeTab} 
        onValueChange={setActiveTab} 
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-2 mb-8 p-1 bg-slate-100 rounded-lg shadow-sm">
          <TabsTrigger 
            value="sensors" 
            className="flex items-center gap-2 border border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-white data-[state=active]:shadow-sm"
          >
            <Thermometer className="h-4 w-4 text-green-600 mr-2" />
            Sensor Monitoring
          </TabsTrigger>
          <TabsTrigger 
            value="cameras" 
            className="flex items-center gap-2 border border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-white data-[state=active]:shadow-sm"
          >
            <Video className="h-4 w-4 text-blue-600 mr-2" />
            Camera Monitoring
          </TabsTrigger>
        </TabsList>
        
        {/* Camera Monitoring tab content */}
        <TabsContent value="cameras" className="border-none p-0">
          <PlayerPage />
        </TabsContent>
        
        {/* Sensor Monitoring tab content */}
        <TabsContent value="sensors" className="border-none p-0">
          <SensorsPage />
        </TabsContent>
      </Tabs>
    </div>
  );
}