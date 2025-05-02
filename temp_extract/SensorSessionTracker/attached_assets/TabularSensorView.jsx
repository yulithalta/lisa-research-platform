import React, { useState, useMemo } from 'react';
import { ChevronUp, ChevronDown, Battery, Wifi, ArrowLeft, ArrowRight } from 'lucide-react';

/**
 * Tabular visualization of sensors with sorting and pagination
 * Ideal for visualizing and searching through large numbers of sensors
 */
const TabularSensorView = ({
  sensorData = {},
  friendlyNames = {},
  isConnected = true,
  filteredSensors = [],
  currentPage,
  pageSize
}) => {
  // States to control the table
  const [sortBy, setSortBy] = useState('name');
  const [sortDirection, setSortDirection] = useState('asc');
  
  // Prepare sensor data in flat format
  const sensors = useMemo(() => {
    return filteredSensors
      .filter(id => sensorData[id])
      .map(id => {
        const entries = sensorData[id] || [];
        const lastEntry = entries.length > 0 ? entries[entries.length - 1] : null;
        
        return {
          id,
          name: friendlyNames[id] || id,
          state: lastEntry ? (lastEntry.y === 1 ? 'Open' : 'Closed') : 'Unknown',
          battery: lastEntry ? lastEntry.battery || 0 : 0,
          signal: lastEntry ? lastEntry.linkquality || 0 : 0,
          lastUpdate: lastEntry ? new Date(lastEntry.x).toLocaleString() : 'N/A',
          isOpen: lastEntry ? lastEntry.y === 1 : false,
          isCritical: lastEntry ? (lastEntry.battery < 20 || lastEntry.linkquality < 30) : false
        };
      });
  }, [sensorData, friendlyNames, filteredSensors]);
  
  // Sort sensors
  const sortedSensors = useMemo(() => {
    // Sort
    return [...sensors].sort((a, b) => {
      let valueA, valueB;
      
      // Determine values to compare based on sort column
      switch (sortBy) {
        case 'name':
          valueA = a.name.toLowerCase();
          valueB = b.name.toLowerCase();
          break;
        case 'state':
          valueA = a.isOpen ? 1 : 0;
          valueB = b.isOpen ? 1 : 0;
          break;
        case 'battery':
          valueA = a.battery;
          valueB = b.battery;
          break;
        case 'signal':
          valueA = a.signal;
          valueB = b.signal;
          break;
        case 'lastUpdate':
          valueA = new Date(a.lastUpdate).getTime();
          valueB = new Date(b.lastUpdate).getTime();
          break;
        default:
          valueA = a.name.toLowerCase();
          valueB = b.name.toLowerCase();
      }
      
      // Sort ascending or descending
      const direction = sortDirection === 'asc' ? 1 : -1;
      
      if (valueA < valueB) return -1 * direction;
      if (valueA > valueB) return 1 * direction;
      return 0;
    });
  }, [sensors, sortBy, sortDirection]);
  
  // Get sensors for display
  const displaySensors = useMemo(() => {
    return sortedSensors;
  }, [sortedSensors]);
  
  // Handle sort change
  const handleSort = (column) => {
    if (sortBy === column) {
      // If already sorting by this column, change direction
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // New column, sort ascending
      setSortBy(column);
      setSortDirection('asc');
    }
  };
  
  // Render sort arrows
  const renderSortArrow = (column) => {
    if (sortBy !== column) return null;
    
    return sortDirection === 'asc' ? (
      <ChevronUp className="h-4 w-4" />
    ) : (
      <ChevronDown className="h-4 w-4" />
    );
  };
  
  return (
    <div className="overflow-x-auto max-h-[calc(100vh-300px)]">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50 sticky top-0">
          <tr>
            <th 
              scope="col" 
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
              onClick={() => handleSort('name')}
            >
              <div className="flex items-center">
                <span>Name</span>
                {renderSortArrow('name')}
              </div>
            </th>
            <th 
              scope="col" 
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
              onClick={() => handleSort('state')}
            >
              <div className="flex items-center">
                <span>Status</span>
                {renderSortArrow('state')}
              </div>
            </th>
            <th 
              scope="col" 
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
              onClick={() => handleSort('battery')}
            >
              <div className="flex items-center">
                <span>Battery</span>
                {renderSortArrow('battery')}
              </div>
            </th>
            <th 
              scope="col" 
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
              onClick={() => handleSort('signal')}
            >
              <div className="flex items-center">
                <span>Signal</span>
                {renderSortArrow('signal')}
              </div>
            </th>
            <th 
              scope="col" 
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
              onClick={() => handleSort('lastUpdate')}
            >
              <div className="flex items-center">
                <span>Last Update</span>
                {renderSortArrow('lastUpdate')}
              </div>
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {displaySensors.map(sensor => (
            <tr key={sensor.id} className={sensor.isCritical ? "bg-red-50" : ""}>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-gray-900 truncate max-w-xs">
                  {sensor.name}
                </div>
                <div className="text-xs text-gray-500">
                  {sensor.id.slice(-6)}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                  sensor.isOpen ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {sensor.state}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className={`flex items-center ${sensor.battery < 20 ? 'text-red-600 font-medium' : 'text-gray-700'}`}>
                  <Battery className="h-4 w-4 mr-1" />
                  <span>{sensor.battery}%</span>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className={`flex items-center ${sensor.signal < 30 ? 'text-red-600 font-medium' : 'text-gray-700'}`}>
                  <Wifi className="h-4 w-4 mr-1" />
                  <span>{sensor.signal} LQI</span>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {sensor.lastUpdate}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default TabularSensorView;