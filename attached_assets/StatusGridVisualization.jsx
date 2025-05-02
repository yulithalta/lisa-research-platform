import React, { useState, useEffect, useMemo } from 'react';
import { Clock, CheckSquare } from 'lucide-react';

/**
 * Component to visualize sensors as color-coded status cards
 * Designed for the hospital monitoring dashboard
 */
const StatusGridVisualization = ({ 
  sensorData = {}, 
  priorityDevices = null,
  isConnected = false,
  showAllDevices = false,
  filteredSensors = []
}) => {
  // States
  const [selectedInterval, setSelectedInterval] = useState(30000); // 30 seconds
  const [lastUpdateTime, setLastUpdateTime] = useState(new Date());
  
  // Determine which data to use (priority or all)
  const dataToUse = useMemo(() => {
    if (showAllDevices) {
      return sensorData; // In dev mode, use all data
    } else if (priorityDevices) {
      return priorityDevices; // For regular users, use priority devices
    } else {
      // Fallback for legacy code
      const filtered = {};
      Object.keys(sensorData).forEach(key => {
        if (key.includes('livinglab/device/') || key.includes('zigbee2mqtt/livinglab/device/')) {
          filtered[key] = sensorData[key];
        }
      });
      return filtered;
    }
  }, [sensorData, priorityDevices, showAllDevices]);
  
  // Extract friendly names from sensors
  const friendlyNames = useMemo(() => {
    const names = {};
    
    Object.keys(dataToUse).forEach(sensorKey => {
      const sensorEntries = dataToUse[sensorKey] || [];
      
      // Look for a friendly name in the data
      for (const entry of sensorEntries) {
        if (entry.friendlyName) {
          names[sensorKey] = entry.friendlyName;
          break;
        }
        
        if (entry.payload && entry.payload.friendly_name) {
          names[sensorKey] = entry.payload.friendly_name;
          break;
        }
      }
      
      // If no friendly name, use a simplified name
      if (!names[sensorKey]) {
        const shortId = sensorKey.includes('-') 
          ? sensorKey 
          : `Sensor-${sensorKey.slice(-5)}`;
          
        names[sensorKey] = shortId;
      }
    });
    
    return names;
  }, [dataToUse]);
  
  // Extract latest sensor states
  const currentStates = useMemo(() => {
    const states = {};
    
    filteredSensors.forEach(sensorKey => {
      if (dataToUse[sensorKey]) {
        const entries = dataToUse[sensorKey] || [];
        if (entries.length > 0) {
          // Get the last data point
          const lastEntry = entries[entries.length - 1];
          states[sensorKey] = {
            isOpen: lastEntry.y === 1,
            timestamp: lastEntry.x,
            battery: lastEntry.battery || 0,
            linkquality: lastEntry.linkquality || 0
          };
        }
      }
    });
    
    return states;
  }, [filteredSensors, dataToUse]);
  
  // Update display periodically
  useEffect(() => {
    const updateTimer = setInterval(() => {
      setLastUpdateTime(new Date());
    }, 1000);
    
    return () => clearInterval(updateTimer);
  }, []);

  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center">
          <h3 className="text-lg font-medium text-gray-800">Current Sensor Status</h3>
          {showAllDevices ? (
            <span className="ml-2 px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full text-xs font-medium">
              All Devices
            </span>
          ) : (
            <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
              LivingLab Sensors
            </span>
          )}
        </div>
      </div>
      
      {/* Status Grid */}
      <div className="mb-4">
        {filteredSensors.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-lg">
            <p className="text-gray-500">No sensors match your search criteria</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredSensors.map(sensorKey => {
              if (!dataToUse[sensorKey]) return null;
              
              const friendlyName = friendlyNames[sensorKey] || sensorKey;
              const state = currentStates[sensorKey];
              
              // If no state, show a loading box
              if (!state) {
                return (
                  <div 
                    key={sensorKey} 
                    className="border rounded-lg p-4 bg-gray-50 flex flex-col h-40"
                  >
                    <h3 className="font-medium mb-2 truncate">{friendlyName}</h3>
                    <div className="flex-1 flex items-center justify-center">
                      <div className="animate-pulse text-gray-400">Loading data...</div>
                    </div>
                  </div>
                );
              }
              
              // Determine color based on state
              const isOpen = state.isOpen;
              const stateColor = isOpen ? 'bg-green-100 border-green-300' : 'bg-red-100 border-red-300';
              const stateTextColor = isOpen ? 'text-green-700' : 'text-red-700';
              const stateText = isOpen ? 'Open' : 'Closed';
              
              return (
                <div 
                  key={sensorKey} 
                  className={`border-2 rounded-lg p-4 ${stateColor} flex flex-col h-40`}
                >
                  <div className="flex justify-between items-start">
                    {/* Show the real friendly name of the device */}
                    <h3 className="font-medium mb-1 truncate text-sm">
                      {friendlyNames[sensorKey] || friendlyName}
                    </h3>
                    
                    {/* IEEE Address in small format for reference */}
                    <span className="text-xs text-gray-500">
                      {sensorKey.includes('0x') ? sensorKey.slice(-4) : sensorKey.slice(-4)}
                    </span>
                  </div>
                  
                  <div className="flex-1 flex flex-col items-center justify-center">
                    <div className={`text-2xl font-bold ${stateTextColor}`}>
                      {stateText}
                    </div>
                    
                    <div className="flex items-center text-xs text-gray-500 mt-1">
                      <CheckSquare className="h-3 w-3 mr-1" />
                      <span>
                        {state.timestamp ? new Date(state.timestamp).toLocaleTimeString() : 'N/A'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-gray-600">
                    <div className="flex items-center">
                      <span className="font-medium">Battery:</span>
                      <span className="ml-1">{state.battery}%</span>
                    </div>
                    <div className="flex items-center">
                      <span className="font-medium">Signal:</span>
                      <span className="ml-1">{state.linkquality} LQI</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      
      {/* Last update time */}
      <div className="mt-2 text-xs text-gray-500 flex justify-end items-center">
        <Clock size={12} className="mr-1" />
        <span>Updated: {lastUpdateTime.toLocaleTimeString()}</span>
      </div>
    </div>
  );
};

export default StatusGridVisualization;