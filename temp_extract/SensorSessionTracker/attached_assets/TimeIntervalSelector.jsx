import React from 'react';
import { Clock } from 'lucide-react';

/**
 * Component for selecting time interval for data updates
 */
const TimeIntervalSelector = ({ value, onChange }) => {
  // Available intervals
  const INTERVALS = [
    { label: '1s', value: 1000 },
    { label: '5s', value: 5000 },
    { label: '15s', value: 15000 },
    { label: '30s', value: 30000 },
    { label: '1m', value: 60000 },
    { label: '5m', value: 300000 },
    { label: '10m', value: 600000 },
    { label: '30m', value: 1800000 }
  ];
  
  // Default to 30s if no value provided
  const currentValue = typeof value !== 'undefined' ? value : 30000;
  
  // Handle interval change
  const handleChange = (newValue) => {
    if (onChange && typeof onChange === 'function') {
      onChange(newValue);
    }
  };
  
  return (
    <div className="flex items-center">
      <div className="text-sm text-gray-600 mr-2 flex items-center">
        <Clock className="h-3.5 w-3.5 mr-1" />
        <span>Intervalo:</span>
      </div>
      <div className="border rounded-md overflow-hidden flex">
        {INTERVALS.map((interval) => (
          <button
            key={interval.value}
            className={`px-2 py-1 text-xs ${
              currentValue === interval.value 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            onClick={() => handleChange(interval.value)}
            type="button"
          >
            {interval.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default TimeIntervalSelector;