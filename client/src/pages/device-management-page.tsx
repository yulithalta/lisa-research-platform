import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Camera, Thermometer } from "lucide-react";
import CamerasPage from "./cameras-page";
import SettingsSensorsPage from "./settings-sensors";

export default function DeviceManagementPage() {
  const [activeTab, setActiveTab] = useState<string>("sensors");

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-2">Device Management</h1>
      <p className="text-muted-foreground mb-6">
        Add, configure and monitor cameras and sensors for data collection
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
            Sensor Management
          </TabsTrigger>
          <TabsTrigger 
            value="cameras" 
            className="flex items-center gap-2 border border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-white data-[state=active]:shadow-sm"
          >
            <Camera className="h-4 w-4 text-blue-600 mr-2" />
            Camera Management
          </TabsTrigger>
        </TabsList>
        
        {/* Sensor Management tab content */}
        <TabsContent value="sensors" className="border-none p-0">
          <SettingsSensorsPage />
        </TabsContent>
        
        {/* Camera Management tab content */}
        <TabsContent value="cameras" className="border-none p-0">
          <CamerasPage />
        </TabsContent>
      </Tabs>
    </div>
  );
}