import React, { useState, useMemo } from 'react';
import { CheckSquare, Square, Search, X, Tag } from 'lucide-react';

/**
 * Enhanced sensor selector component with support for friendly names
 * Includes advanced search and filtering by multiple terms
 */
const SensorSelector = ({ 
  availableSensors = [], 
  selectedSensors = [], 
  onChange,
  colorMap = {},
  friendlyNames = {} // Friendly names as prop
}) => {
  // Search states
  const [searchInput, setSearchInput] = useState("");
  const [searchTerms, setSearchTerms] = useState([]);
  
  // Apply search terms to available sensors
  const filteredSensors = useMemo(() => {
    if (searchTerms.length === 0 && !searchInput.trim()) {
      return availableSensors;
    }
    
    // Terms to search (confirmed terms plus current input if exists)
    const allTerms = [...searchTerms];
    if (searchInput.trim()) {
      allTerms.push(searchInput.trim().toLowerCase());
    }
    
    // Filter sensors that match AT LEAST ONE term (OR)
    // Include search in friendly names
    return availableSensors.filter(sensor => {
      const sensorLower = sensor.toLowerCase();
      const friendlyName = (friendlyNames[sensor] || '').toLowerCase();
      
      return allTerms.some(term => 
        sensorLower.includes(term) || friendlyName.includes(term)
      );
    });
  }, [availableSensors, searchTerms, searchInput, friendlyNames]);
  
  // Add search term
  const addSearchTerm = () => {
    if (searchInput.trim() && !searchTerms.includes(searchInput.trim().toLowerCase())) {
      setSearchTerms([...searchTerms, searchInput.trim().toLowerCase()]);
      setSearchInput("");
    }
  };
  
  // Remove search term
  const removeSearchTerm = (termToRemove) => {
    setSearchTerms(searchTerms.filter(term => term !== termToRemove));
  };
  
  // Handle input change
  const handleInputChange = (e) => {
    setSearchInput(e.target.value);
  };
  
  // Handle Enter key to add term
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && searchInput.trim()) {
      addSearchTerm();
    }
  };
  
  // Toggle a sensor selection
  const toggleSensor = (sensorName) => {
    if (!onChange) return;
    
    if (selectedSensors.includes(sensorName)) {
      onChange(selectedSensors.filter(s => s !== sensorName));
    } else {
      onChange([...selectedSensors, sensorName]);
    }
  };

  // Select all filtered sensors
  const selectAllFiltered = () => {
    if (!onChange) return;
    
    // Add filtered sensors that aren't already selected
    const newSelected = [...selectedSensors];
    filteredSensors.forEach(sensor => {
      if (!newSelected.includes(sensor)) {
        newSelected.push(sensor);
      }
    });
    
    onChange(newSelected);
  };

  // Deselect all filtered sensors
  const deselectAllFiltered = () => {
    if (!onChange) return;
    
    // Keep only sensors that aren't in the filtered list
    const newSelected = selectedSensors.filter(
      sensor => !filteredSensors.includes(sensor)
    );
    
    onChange(newSelected);
  };

  return (
    <div className="bg-gray-50 p-3 rounded-lg border">
      {/* Featured search - always visible */}
      <div className="mb-3 relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center">
          <Search className="h-4 w-4 text-gray-400" />
        </div>
        <input
          type="text"
          className="w-full pl-10 pr-10 py-2 border rounded-md text-sm"
          placeholder="Buscar sensores por nombre o ubicación..."
          value={searchInput}
          onChange={handleInputChange}
          onKeyPress={handleKeyPress}
        />
        {searchInput && (
          <button
            className="absolute inset-y-0 right-0 pr-3 flex items-center"
            onClick={() => searchInput ? addSearchTerm() : setSearchInput("")}
            type="button"
          >
            {searchInput ? (
              <span className="text-xs font-medium text-blue-500 hover:text-blue-700">Añadir</span>
            ) : (
              <X className="h-4 w-4 text-gray-400" />
            )}
          </button>
        )}
      </div>
      
      <div className="flex justify-between mb-2">
        <h4 className="text-sm font-medium">Sensores disponibles</h4>
        <div className="space-x-2">
          <button 
            className="text-xs px-2 py-0.5 bg-blue-50 text-blue-600 rounded hover:bg-blue-100"
            onClick={selectAllFiltered}
            type="button"
          >
            Todos
          </button>
          <button 
            className="text-xs px-2 py-0.5 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
            onClick={deselectAllFiltered}
            type="button"
          >
            Ninguno
          </button>
        </div>
      </div>
      
      {/* Show current search terms */}
      {searchTerms.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {searchTerms.map(term => (
            <div 
              key={term} 
              className="flex items-center bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full text-xs"
            >
              <Tag className="h-3 w-3 mr-1" />
              <span>{term}</span>
              <button 
                onClick={() => removeSearchTerm(term)}
                className="ml-1 hover:text-blue-900"
                type="button"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
          <button 
            onClick={() => setSearchTerms([])}
            className="text-xs text-gray-500 hover:text-gray-700"
            type="button"
          >
            Limpiar
          </button>
        </div>
      )}

      <div className="max-h-40 overflow-y-auto">
        {filteredSensors.length === 0 ? (
          <div className="text-center py-2 text-sm text-gray-500">
            {searchTerms.length > 0 || searchInput
              ? "No se encontraron sensores que coincidan con la búsqueda" 
              : "No hay sensores disponibles"}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
            {filteredSensors.map(sensor => {
              // Get friendly name to display
              const displayName = friendlyNames[sensor] || sensor;
              
              return (
                <div 
                  key={sensor}
                  className="flex items-center py-1 px-2 hover:bg-gray-100 rounded cursor-pointer"
                  onClick={() => toggleSensor(sensor)}
                >
                  <div className="mr-2 flex-shrink-0">
                    {selectedSensors.includes(sensor) ? (
                      <CheckSquare size={16} className="text-blue-500" />
                    ) : (
                      <Square size={16} className="text-gray-400" />
                    )}
                  </div>
                  <span className="text-sm truncate max-w-full">
                    {displayName}
                    
                    {/* If friendly name is different from ID, show ID as smaller text */}
                    {displayName !== sensor && (
                      <span className="text-xs text-gray-500 ml-1">
                        ({sensor.slice(-4)})
                      </span>
                    )}
                  </span>
                  {selectedSensors.includes(sensor) && colorMap[sensor] && (
                    <div 
                      className="ml-auto w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: colorMap[sensor] }}
                    ></div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
      
      <div className="mt-2 text-xs text-gray-500">
        {selectedSensors.length} / {availableSensors.length} sensores seleccionados
      </div>
    </div>
  );
};

export default SensorSelector;