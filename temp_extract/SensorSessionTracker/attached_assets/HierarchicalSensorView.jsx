import React, { useState, useMemo, useCallback } from 'react';
import { ChevronRight, ChevronDown, AlertCircle } from 'lucide-react';

/**
 * Component to visualize sensors hierarchically by location
 * Efficiently scales for large numbers of sensors
 */
const HierarchicalSensorView = ({ 
  sensorData = {},
  friendlyNames = {},
  isConnected = true,
  filteredSensors = []
}) => {
  const [expandedGroups, setExpandedGroups] = useState({});
  const [criticalOnly, setCriticalOnly] = useState(false);
  
  // Parse names to extract locations and create hierarchical structure
  const sensorGroups = useMemo(() => {
    const groups = {};
    
    // Process all sensors
    filteredSensors.forEach(sensorId => {
      if (!sensorData[sensorId]) return;
      
      const name = friendlyNames[sensorId] || sensorId;
      const lastEntry = sensorData[sensorId]?.slice(-1)[0];
      
      // Determine group based on name (extract location)
      // Examples: "Window Room 12" -> "Room 12"
      //           "Medicine drawer 005" -> "Pharmacy"
      //           "Door Floor 2" -> "Floor 2"
      let location = "Unclassified";
      
      if (name.includes("Room") || name.includes("Bedroom")) {
        const match = name.match(/(?:Room|Bedroom)\s+(\d+)/i);
        location = match ? `Room ${match[1]}` : "Rooms";
      } else if (name.includes("Floor") || name.includes("Level")) {
        const match = name.match(/(Floor|Level)\s+(\d+)/i);
        location = match ? `${match[1]} ${match[2]}` : "Floors";
      } else if (name.includes("Medicine") || name.includes("Drug") || name.includes("Pharmacy")) {
        location = "Pharmacy";
      } else if (name.includes("Office")) {
        const match = name.match(/Office\s+(\d+)/i);
        location = match ? `Office ${match[1]}` : "Offices";
      } else if (name.includes("Kitchen") || name.includes("Pantry")) {
        location = "Kitchen";
      } else if (name.includes("Lab") || name.includes("Laboratory")) {
        location = "Laboratory";
      } else if (name.includes("Emergency") || name.includes("ER")) {
        location = "Emergency";
      } else if (name.includes("sensor-")) {
        location = "Sensors";
      } else if (sensorId.startsWith("zigbee2mqtt/")) {
        location = "Zigbee";
      } else {
        // Try to extract a location from the path if possible
        const pathParts = sensorId.split('/');
        if (pathParts.length > 2) {
          location = pathParts[1].charAt(0).toUpperCase() + pathParts[1].slice(1);
        }
      }
      
      // Create group if it doesn't exist
      if (!groups[location]) {
        groups[location] = [];
      }
      
      // Add sensor to group with relevant data
      if (lastEntry) {
        groups[location].push({
          id: sensorId,
          name: name,
          isOpen: lastEntry.y === 1,
          battery: lastEntry.battery || 0,
          linkquality: lastEntry.linkquality || 0,
          timestamp: lastEntry.x || new Date(),
          isCritical: (lastEntry.battery < 20 || lastEntry.linkquality < 30)
        });
      } else {
        // Add even without data - important for dev mode to show all topics
        groups[location].push({
          id: sensorId,
          name: name,
          isOpen: false,
          battery: 0,
          linkquality: 0,
          timestamp: new Date(),
          isCritical: false
        });
      }
    });
    
    return groups;
  }, [sensorData, friendlyNames, filteredSensors]);
  
  // Filter by critical status
  const filteredGroups = useMemo(() => {
    if (!criticalOnly) return sensorGroups;
    
    const filtered = {};
    
    Object.keys(sensorGroups).forEach(location => {
      // Filter sensors in this group
      const filteredSensors = sensorGroups[location].filter(sensor => sensor.isCritical);
      
      // Only include group if it has sensors that meet the filter
      if (filteredSensors.length > 0) {
        filtered[location] = filteredSensors;
      }
    });
    
    return filtered;
  }, [sensorGroups, criticalOnly]);
  
  // Expand/collapse a group
  const toggleGroup = useCallback((location) => {
    setExpandedGroups(prev => ({
      ...prev,
      [location]: !prev[location]
    }));
  }, []);
  
  // Expand all groups
  const expandAll = useCallback(() => {
    const allExpanded = {};
    Object.keys(filteredGroups).forEach(location => {
      allExpanded[location] = true;
    });
    setExpandedGroups(allExpanded);
  }, [filteredGroups]);
  
  // Collapse all groups
  const collapseAll = useCallback(() => {
    setExpandedGroups({});
  }, []);
  
  // Count total sensors and groups
  const totalSensors = useMemo(() => {
    return Object.values(filteredGroups).reduce((sum, sensors) => sum + sensors.length, 0);
  }, [filteredGroups]);
  
  const totalGroups = useMemo(() => {
    return Object.keys(filteredGroups).length;
  }, [filteredGroups]);
  
  // Render individual sensor
  const renderSensor = (sensor) => {
    const stateColor = sensor.isOpen ? 'bg-green-500' : 'bg-red-500';
    const stateText = sensor.isOpen ? 'Open' : 'Closed';
    const batteryWarning = sensor.battery < 20;
    const signalWarning = sensor.linkquality < 30;
    
    return (
      <div 
        key={sensor.id}
        className="flex items-center p-2 border-t border-gray-100 hover:bg-gray-50"
      >
        <div className={`w-3 h-3 rounded-full ${stateColor} mr-2`}></div>
        <span className="flex-1 truncate">{sensor.name}</span>
        <span className="text-xs">{stateText}</span>
        
        {/* Battery and signal status indicators */}
        <div className="flex items-center ml-4 space-x-2">
          <div className={`text-xs ${batteryWarning ? 'text-red-500 font-medium' : 'text-gray-500'}`}>
            {sensor.battery}%
          </div>
          <div className={`text-xs ${signalWarning ? 'text-red-500 font-medium' : 'text-gray-500'}`}>
            {sensor.linkquality} LQI
          </div>
          {(batteryWarning || signalWarning) && (
            <AlertCircle className="h-3 w-3 text-red-500" />
          )}
        </div>
      </div>
    );
  };
  
  return (
    <div className="border rounded-lg shadow-md bg-white">
      <div className="p-4 border-b">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-lg font-semibold">Sensors by location</h2>
          <div className="flex space-x-2">
            <button 
              className="text-xs px-2 py-1 border rounded"
              onClick={expandAll}
            >
              Expand
            </button>
            <button 
              className="text-xs px-2 py-1 border rounded"
              onClick={collapseAll}
            >
              Collapse
            </button>
          </div>
        </div>
        
        {/* Filters */}
        <div className="flex items-center">
          <label className="flex items-center text-sm">
            <input
              type="checkbox"
              className="mr-2"
              checked={criticalOnly}
              onChange={(e) => setCriticalOnly(e.target.checked)}
            />
            Critical only
          </label>
        </div>
        
        <div className="mt-2 text-xs text-gray-500">
          {totalSensors} sensors in {totalGroups} locations
        </div>
      </div>
      
      {/* List of groups and sensors */}
      <div className="max-h-[calc(100vh-250px)] overflow-y-auto">
        {Object.keys(filteredGroups).length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            No sensors match your criteria
          </div>
        ) : (
          Object.keys(filteredGroups).sort().map(location => {
            const sensors = filteredGroups[location];
            const isExpanded = !!expandedGroups[location];
            
            // Calculate group statistics
            const openCount = sensors.filter(s => s.isOpen).length;
            const criticalCount = sensors.filter(s => s.isCritical).length;
            
            return (
              <div key={location} className="border-b last:border-b-0">
                {/* Group header */}
                <div 
                  className="flex items-center p-3 cursor-pointer hover:bg-gray-50"
                  onClick={() => toggleGroup(location)}
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-gray-400 mr-2" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-gray-400 mr-2" />
                  )}
                  
                  <span className="font-medium">{location}</span>
                  
                  <div className="ml-auto flex items-center space-x-4">
                    <span className="text-xs">
                      {sensors.length} {sensors.length === 1 ? 'sensor' : 'sensors'}
                    </span>
                    
                    {openCount > 0 && (
                      <span className="text-xs px-2 py-0.5 bg-green-100 text-green-800 rounded-full">
                        {openCount} open
                      </span>
                    )}
                    
                    {criticalCount > 0 && (
                      <span className="text-xs px-2 py-0.5 bg-red-100 text-red-800 rounded-full">
                        {criticalCount} critical
                      </span>
                    )}
                  </div>
                </div>
                
                {/* Group sensors (expandable) */}
                {isExpanded && (
                  <div className="pl-8 pr-3 pb-3 border-t border-gray-100">
                    {sensors.map(renderSensor)}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default HierarchicalSensorView;