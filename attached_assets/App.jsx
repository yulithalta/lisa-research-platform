import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { 
  AlertCircle, 
  Gauge, 
  RefreshCw, 
  Download, 
  Grid, 
  List, 
  LayoutGrid, 
  LineChart, 
  Search, 
  Tag, 
  X, 
  Check, 
  Square,
  ChevronDown,
  Bell,
  Moon,
  Sun,
  Info,
  AlertTriangle,
  CheckCircle,
  ArrowLeft,
  ArrowRight
} from "lucide-react";

// Components
import StatusGridVisualization from "./components/visualization/StatusGridVisualization";
import HierarchicalSensorView from "./components/visualization/HierarchicalSensorView";
import TabularSensorView from "./components/visualization/TabularSensorView";
import MultiSensorChart from "./components/visualization/MultiSensorChart";
import ImprovedSensorGrid from "./components/ImprovedSensorGrid";
import ConfirmationModal from "./components/ConfirmationModal";

// Hooks
import { useMqtt } from "./hooks/useMqtt";
import { useLocalStorage } from "./hooks/useLocalStorage";

// Notification component
const Notification = ({ id, type, message, onClose, timeout = 5000 }) => {
  useEffect(() => {
    if (timeout > 0) {
      const timer = setTimeout(() => {
        onClose(id);
      }, timeout);
      return () => clearTimeout(timer);
    }
  }, [id, onClose, timeout]);

  const icons = {
    success: <CheckCircle className="h-5 w-5 text-green-500" />,
    error: <AlertCircle className="h-5 w-5 text-red-500" />,
    warning: <AlertTriangle className="h-5 w-5 text-yellow-500" />,
    info: <Info className="h-5 w-5 text-blue-500" />
  };

  const bgColors = {
    success: "bg-green-50 border-green-200",
    error: "bg-red-50 border-red-200",
    warning: "bg-yellow-50 border-yellow-200",
    info: "bg-blue-50 border-blue-200"
  };

  return (
    <div className={`flex items-center p-3 mb-2 rounded-md border ${bgColors[type]} shadow-sm`}>
      <div className="mr-3">
        {icons[type]}
      </div>
      <div className="flex-1">
        <p className="text-sm">{message}</p>
      </div>
      <button 
        onClick={() => onClose(id)}
        className="ml-2 text-gray-400 hover:text-gray-600"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};

// NotificationsContainer component
const NotificationsContainer = ({ notifications, removeNotification }) => {
  if (notifications.length === 0) return null;
  
  return (
    <div className="fixed bottom-4 right-4 w-80 z-50">
      {notifications.map(notification => (
        <Notification
          key={notification.id}
          id={notification.id}
          type={notification.type}
          message={notification.message}
          timeout={notification.timeout}
          onClose={removeNotification}
        />
      ))}
    </div>
  );
};

// Notifications panel component
const NotificationsPanel = ({ notifications, removeNotification, onClose }) => {
  return (
    <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg p-3 z-50 max-h-80 overflow-y-auto border border-gray-200">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-medium">Notifications</h3>
        <button 
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600"
        >
          <X size={16} />
        </button>
      </div>
      
      {notifications.length === 0 ? (
        <div className="text-sm text-gray-500 py-2">No notifications</div>
      ) : (
        <div>
          {notifications.map(notification => (
            <div 
              key={notification.id}
              className={`p-2 mb-2 rounded text-sm ${
                notification.type === 'success' ? 'bg-green-50 text-green-700' :
                notification.type === 'error' ? 'bg-red-50 text-red-700' :
                notification.type === 'warning' ? 'bg-yellow-50 text-yellow-700' :
                'bg-blue-50 text-blue-700'
              }`}
            >
              <div className="flex justify-between">
                <p>{notification.message}</p>
                <button
                  onClick={() => removeNotification(notification.id)}
                  className="ml-2 text-gray-400 hover:text-gray-600"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          ))}
          
          <button
            onClick={() => notifications.forEach(n => removeNotification(n.id))}
            className="w-full mt-2 text-xs text-center text-gray-500 hover:text-gray-700"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
};

// Loading screen component
const LoadingScreen = () => (
  <div className="flex items-center justify-center min-h-screen bg-gray-50">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
      <p className="mt-4 text-gray-600">Connecting to monitoring system...</p>
    </div>
  </div>
);

// Header component with theme selector and notifications
const Header = ({ 
  isConnected, 
  showDevInfo, 
  connectionError, 
  lastUpdate, 
  reconnect, 
  exportData,
  theme,
  toggleTheme,
  notifications,
  showNotifications,
  setShowNotifications,
  removeNotification
}) => (
  <header className="mb-6">
    <div className="flex justify-between items-center">
      <h1 className="text-3xl font-bold text-blue-600">
        Zigbee Monitor
        {showDevInfo && (
          <span className="ml-3 text-sm bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
            Dev Mode
          </span>
        )}
      </h1>
      <div className="flex items-center space-x-2">
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="p-1 rounded-full hover:bg-gray-100"
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? (
            <Sun className="h-4 w-4 text-gray-600" />
          ) : (
            <Moon className="h-4 w-4 text-gray-600" />
          )}
        </button>
        
        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-1 rounded-full hover:bg-gray-100 relative"
            title="Notifications"
          >
            <Bell className="h-4 w-4 text-gray-600" />
            {notifications.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                {notifications.length}
              </span>
            )}
          </button>
          
          {showNotifications && (
            <NotificationsPanel 
              notifications={notifications}
              removeNotification={removeNotification}
              onClose={() => setShowNotifications(false)}
            />
          )}
        </div>
        
        <div className={`text-sm px-3 py-1 rounded-full flex items-center ${
          isConnected ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
        }`}>
          <div className={`w-2 h-2 rounded-full mr-2 ${
            isConnected ? 'bg-green-500' : 'bg-red-500'
          }`}></div>
          <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
        </div>
        <button 
          onClick={reconnect}
          className="p-1 rounded-full hover:bg-gray-100"
          title="Reconnect to system"
          disabled={isConnected}
        >
          <RefreshCw className="h-4 w-4 text-gray-600" />
        </button>
        
        {/* Export button only in dev mode */}
        {showDevInfo && (
          <button 
            onClick={exportData}
            className="px-3 py-1 border rounded-md text-sm bg-green-50 text-green-600 flex items-center"
            title="Export data for audit (JSON)"
          >
            <Download className="h-4 w-4 mr-1" />
            <span>Export</span>
          </button>
        )}
        
        <div className="text-sm bg-blue-50 text-blue-700 px-3 py-1 rounded-full flex items-center">
          <AlertCircle className="h-4 w-4 mr-1" />
          <span>v2.6.0</span>
        </div>
      </div>
    </div>
    <p className="text-gray-600 mt-1">
      Real-time monitoring system for Zigbee LivingLab sensors
    </p>
    {connectionError && (
      <div className="mt-2 bg-red-50 text-red-700 px-3 py-2 rounded-md text-sm">
        <strong>Error:</strong> {connectionError}
      </div>
    )}
    <div className="mt-2 text-xs text-gray-500">
      <span>Last update: {lastUpdate ? lastUpdate.toLocaleTimeString() : 'N/A'}</span>
    </div>
  </header>
);

// Search bar component
const SearchBar = ({ 
  searchTerm, 
  setSearchTerm, 
  addSearchTerm, 
  handleKeyPress 
}) => (
  <div className="relative flex-grow">
    <div className="absolute inset-y-0 left-0 pl-3 flex items-center">
      <Search className="h-4 w-4 text-gray-400" />
    </div>
    <input
      type="text"
      className="w-full pl-10 pr-10 py-2 border rounded-md text-sm"
      placeholder="Search sensors by name or location..."
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
      onKeyPress={handleKeyPress}
    />
    {searchTerm && (
      <button
        className="absolute inset-y-0 right-0 pr-3 flex items-center"
        onClick={() => searchTerm ? addSearchTerm() : setSearchTerm("")}
        type="button"
      >
        {searchTerm ? (
          <span className="text-xs font-medium text-blue-500 hover:text-blue-700">Add</span>
        ) : (
          <span className="h-4 w-4 text-gray-400">✕</span>
        )}
      </button>
    )}
  </div>
);

// Search tags component
const SearchTags = ({ searchTerms, removeSearchTerm, setSearchTerms }) => (
  searchTerms.length > 0 ? (
    <div className="flex flex-wrap gap-1 mt-2">
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
        Clear
      </button>
    </div>
  ) : null
);

// Sensor dropdown component
const SensorDropdown = ({ 
  showSelectorDropdown, 
  setShowSelectorDropdown, 
  selectedSensors, 
  availableSensors, 
  setSelectedSensors,
  friendlyNames 
}) => (
  <div className="relative ml-2">
    <button
      onClick={() => setShowSelectorDropdown(!showSelectorDropdown)}
      className="px-3 py-2 border rounded-md text-sm bg-blue-50 text-blue-600 flex items-center"
    >
      <span className="mr-1">Sensors</span>
      <span className="bg-blue-100 text-blue-800 rounded-full px-2 py-0.5 text-xs">
        {selectedSensors.length}
      </span>
    </button>
    
    {showSelectorDropdown && (
      <div className="absolute right-0 mt-1 w-64 bg-white rounded-lg shadow-lg z-50 border border-gray-200">
        <div className="p-3">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-medium">Select Sensors</h3>
            <button 
              onClick={() => setShowSelectorDropdown(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X size={16} />
            </button>
          </div>
          
          <div className="mb-2 flex justify-between">
            <button
              className="text-xs text-blue-600 hover:text-blue-800"
              onClick={() => setSelectedSensors(availableSensors)}
            >
              Select All
            </button>
            <button
              className="text-xs text-gray-600 hover:text-gray-800"
              onClick={() => setSelectedSensors([])}
            >
              Clear All
            </button>
          </div>
          
          <div className="max-h-60 overflow-y-auto">
            {availableSensors.map(sensor => (
              <div 
                key={sensor} 
                className="flex items-center py-1 hover:bg-gray-50 cursor-pointer"
                onClick={() => {
                  if (selectedSensors.includes(sensor)) {
                    setSelectedSensors(selectedSensors.filter(s => s !== sensor));
                  } else {
                    setSelectedSensors([...selectedSensors, sensor]);
                  }
                }}
              >
                <div className="mr-2">
                  {selectedSensors.includes(sensor) ? (
                    <div className="w-4 h-4 flex items-center justify-center bg-blue-500 text-white rounded">
                      <Check size={12} />
                    </div>
                  ) : (
                    <Square size={16} className="text-gray-300" />
                  )}
                </div>
                <span className="text-sm truncate">
                  {friendlyNames[sensor] || sensor}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    )}
  </div>
);

// View selector component
const ViewSelector = ({ activeView, setActiveView, showDevInfo }) => (
  <div className="p-1 bg-gray-100 rounded-lg border-2 border-gray-200 flex">
    <button
      onClick={() => setActiveView('grid')}
      className={`flex items-center px-3 py-1.5 text-sm rounded-md ${
        activeView === 'grid' 
          ? 'bg-white text-blue-600 shadow-md border-2 border-blue-200' 
          : 'text-gray-600 hover:bg-gray-200'
      }`}
    >
      <Grid className="h-4 w-4 mr-1.5" />
      <span>Grid</span>
    </button>
    {/* Hierarchical view only in dev mode */}
    {showDevInfo && (
      <button
        onClick={() => setActiveView('hierarchical')}
        className={`flex items-center px-3 py-1.5 text-sm rounded-md ${
          activeView === 'hierarchical' 
            ? 'bg-white text-blue-600 shadow-md border-2 border-blue-200' 
            : 'text-gray-600 hover:bg-gray-200'
        }`}
      >
        <LayoutGrid className="h-4 w-4 mr-1.5" />
        <span>By Location</span>
      </button>
    )}
    <button
      onClick={() => setActiveView('table')}
      className={`flex items-center px-3 py-1.5 text-sm rounded-md ${
        activeView === 'table' 
          ? 'bg-white text-blue-600 shadow-md border-2 border-blue-200' 
          : 'text-gray-600 hover:bg-gray-200'
      }`}
    >
      <List className="h-4 w-4 mr-1.5" />
      <span>Table</span>
    </button>
    
    {/* Charts button (always visible in dev mode) */}
    {showDevInfo && (
      <button
        onClick={() => setActiveView('chart')}
        className={`flex items-center px-3 py-1.5 text-sm rounded-md ${
          activeView === 'chart' 
            ? 'bg-white text-blue-600 shadow-md border-2 border-blue-200' 
            : 'text-gray-600 hover:bg-gray-200'
        }`}
      >
        <LineChart className="h-4 w-4 mr-1.5" />
        <span>Charts</span>
      </button>
    )}
  </div>
);

// Developer mode controls with working interval selector
const DevModeControls = ({ setShowDevInfo, showDevInfo, selectedInterval, setSelectedInterval, handleExport }) => (
  <div className="flex justify-end mb-4 space-x-2">
    <div className="flex items-center">
      <span className="text-sm text-gray-600 mr-2">Interval:</span>
      <div className="border rounded-md overflow-hidden flex">
        {[
          { label: '1s', value: 1000 },
          { label: '5s', value: 5000 },
          { label: '15s', value: 15000 },
          { label: '30s', value: 30000 },
          { label: '1m', value: 60000 },
          { label: '5m', value: 300000 },
          { label: '10m', value: 600000 },
          { label: '30m', value: 1800000 }
        ].map((interval) => (
          <button
            key={interval.label}
            className={`px-2 py-1 text-xs ${
              selectedInterval === interval.value 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            onClick={() => setSelectedInterval(interval.value)}
            type="button"
          >
            {interval.label}
          </button>
        ))}
      </div>
    </div>
    <button
      className="px-3 py-1 border rounded text-sm bg-green-50 text-green-600 flex items-center"
      title="Export data"
      onClick={handleExport}
    >
      <Download size={16} className="mr-1" />
      <span>Export</span>
    </button>
    <button
      onClick={() => setShowDevInfo(!showDevInfo)}
      className="px-3 py-1 border rounded text-sm bg-gray-50 text-gray-600 flex items-center"
    >
      {showDevInfo ? "User Mode" : "Dev Mode"}
    </button>
  </div>
);

// Table pagination component
const TablePagination = ({ currentPage, totalPages, setCurrentPage }) => (
  <div className="flex justify-between items-center">
    <div>
      <p className="text-sm text-gray-700">
        Page <span className="font-medium">{currentPage}</span> of{" "}
        <span className="font-medium">{totalPages}</span>
      </p>
    </div>
    <div className="flex space-x-2">
      <button
        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1}
        className={`relative inline-flex items-center px-2 py-1 border border-gray-300 text-sm font-medium rounded-md ${
          currentPage === 1 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-700 hover:bg-gray-50'
        }`}
      >
        <ArrowLeft className="h-4 w-4" />
      </button>
      <button
        onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage === totalPages}
        className={`relative inline-flex items-center px-2 py-1 border border-gray-300 text-sm font-medium rounded-md ${
          currentPage === totalPages ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-700 hover:bg-gray-50'
        }`}
      >
        <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  </div>
);

/**
 * Main component with multiple views for scalability
 * Includes charts in developer mode
 */
function App() {
  // State
  const [isLoading, setIsLoading] = useState(true);
  const [showDevInfo, setShowDevInfo] = useState(false);
  const [activeView, setActiveView] = useState('grid'); // 'grid', 'hierarchical', 'table', 'chart'
  const [searchTerm, setSearchTerm] = useState("");
  const [searchTerms, setSearchTerms] = useState([]);
  const [selectedSensors, setSelectedSensors] = useState([]);
  const [showSelectorDropdown, setShowSelectorDropdown] = useState(false);
  const [theme, setTheme] = useLocalStorage('theme', 'light');
  const [notifications, setNotifications] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [modalContent, setModalContent] = useState({
    title: '',
    message: '',
    onConfirm: () => {},
    confirmText: '',
    cancelText: ''
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [selectedInterval, setSelectedInterval] = useState(30000); // 30 seconds default
  const [showNotifications, setShowNotifications] = useState(false);
  
  // Refs
  const devKeyPressCount = useRef(0);
  const notificationIdCounter = useRef(0);
  
  // MQTT hook for data
  const { 
    sensorData,
    priorityDevices,
    isConnected, 
    connectionError,
    reconnect,
    exportData,
    lastUpdate,
    friendlyNames,
    mqttStatus
  } = useMqtt();

  // Toggle theme
  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  // Apply theme
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // Get all available sensors
  const availableSensors = useMemo(() => {
    // In dev mode, show ALL topics from sensorData, 
    // otherwise use priorityDevices
    const dataSource = showDevInfo ? sensorData : priorityDevices;
    
    if (!dataSource) return [];
    
    return Object.keys(dataSource).filter(
      name => !name.startsWith('bridge/') && !name.includes('bridge')
    );
  }, [sensorData, priorityDevices, showDevInfo]);

  // Filter sensors based on search terms and selection
  const filteredSensors = useMemo(() => {
    if (selectedSensors.length > 0) {
      return selectedSensors;
    }
    
    if (searchTerms.length === 0 && !searchTerm.trim()) {
      return availableSensors;
    }
    
    // Terms to search (confirmed ones plus current if it exists)
    const allTerms = [...searchTerms];
    if (searchTerm.trim()) {
      allTerms.push(searchTerm.trim().toLowerCase());
    }
    
    // Filter sensors that match AT LEAST ONE term (OR)
    return availableSensors.filter(sensor => {
      const sensorLower = sensor.toLowerCase();
      const friendlyName = (friendlyNames[sensor] || '').toLowerCase();
      
      return allTerms.some(term => 
        sensorLower.includes(term) || friendlyName.includes(term)
      );
    });
  }, [availableSensors, selectedSensors, searchTerms, searchTerm, friendlyNames]);

  // Calculate total pages for pagination
  const totalPages = useMemo(() => {
    return Math.ceil(filteredSensors.length / pageSize);
  }, [filteredSensors.length, pageSize]);

  // Handle export functionality
  const handleExport = useCallback(() => {
    try {
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
      const data = {
        timestamp: new Date().toISOString(),
        interval: selectedInterval,
        sensors: filteredSensors.map(sensorId => ({
          id: sensorId,
          name: friendlyNames[sensorId] || sensorId,
          data: sensorData[sensorId] || []
        }))
      };
      
      // Create and download JSON file
      const jsonString = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `zigbee-sensors-${timestamp}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      addNotification({
        type: 'success',
        message: 'Data exported successfully',
        timeout: 3000
      });
      
      return true;
    } catch (error) {
      console.error("Export error:", error);
      addNotification({
        type: 'error',
        message: `Export failed: ${error.message}`,
        timeout: 5000
      });
      return false;
    }
  }, [filteredSensors, sensorData, friendlyNames, selectedInterval]);

  // Effects
  
  // Simulate loading time to allow connection
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
      
      // Initial connection notification
      if (isConnected) {
        addNotification({
          type: 'success',
          message: 'Successfully connected to MQTT broker'
        });
      } else {
        addNotification({
          type: 'error',
          message: 'Failed to connect to MQTT broker. Check your connection.',
          timeout: 0 // Do not auto-dismiss
        });
      }
    }, 1500);
    return () => clearTimeout(timer);
  }, [isConnected]);
  
  // Initial sensor info notification
  useEffect(() => {
    if (!isLoading && isConnected) {
      addNotification({
        type: 'info',
        message: 'Magnetic sensors will only appear in the dashboard after they are activated for the first time.',
        timeout: 10000 // 10 seconds
      });
    }
  }, [isLoading, isConnected]);

  // Track MQTT status and show notifications
  useEffect(() => {
    if (mqttStatus && mqttStatus !== 'idle') {
      addNotification({
        type: mqttStatus === 'connected' ? 'success' : 
              mqttStatus === 'connecting' ? 'info' : 
              mqttStatus === 'reconnecting' ? 'warning' : 'error',
        message: mqttStatus === 'connected' ? 'Successfully connected to MQTT broker' :
                mqttStatus === 'connecting' ? 'Connecting to MQTT broker...' :
                mqttStatus === 'reconnecting' ? 'Connection lost. Attempting to reconnect...' :
                'Failed to connect to MQTT broker. Check your connection.'
      });
    }
  }, [mqttStatus]);

  // Secret developer mode
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key.toLowerCase() === 'd') {
        devKeyPressCount.current += 1;
        
        if (devKeyPressCount.current >= 5) {
          setShowDevInfo(true);
          console.log("Developer mode activated");
          addNotification({
            type: 'warning',
            message: 'Developer mode activated. Additional features are now available.'
          });
        }
      } else {
        devKeyPressCount.current = 0;
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  // Handler functions
  
  // Add search term
  const addSearchTerm = () => {
    if (searchTerm.trim() && !searchTerms.includes(searchTerm.trim().toLowerCase())) {
      setSearchTerms([...searchTerms, searchTerm.trim().toLowerCase()]);
      setSearchTerm("");
    }
  };
  
  // Remove search term
  const removeSearchTerm = (termToRemove) => {
    setSearchTerms(searchTerms.filter(term => term !== termToRemove));
  };
  
  // Handle key press for search
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && searchTerm.trim()) {
      addSearchTerm();
    }
  };

  // Add notification
  const addNotification = (notification) => {
    const id = notificationIdCounter.current++;
    setNotifications(prev => [
      ...prev, 
      { ...notification, id }
    ]);
  };

  // Remove notification
  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  };

  // Show confirmation modal
  const showConfirmation = (content) => {
    setModalContent(content);
    setShowModal(true);
  };

  // Example usage: Delete data confirmation
  const handleDataDeletion = () => {
    showConfirmation({
      title: "Delete Data",
      message: "Are you sure you want to delete all sensor data? This action cannot be undone.",
      confirmText: "Delete",
      cancelText: "Cancel",
      onConfirm: () => {
        // Delete data logic here
        addNotification({
          type: 'success',
          message: 'Data deleted successfully'
        });
        setShowModal(false);
      }
    });
  };

  // Render loading state
  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <div className={`container mx-auto px-4 py-6 ${theme === 'dark' ? 'dark bg-gray-800 text-white' : ''}`}>
      {/* Header */}
      <Header 
        isConnected={isConnected}
        showDevInfo={showDevInfo}
        connectionError={connectionError}
        lastUpdate={lastUpdate}
        reconnect={reconnect}
        exportData={exportData}
        theme={theme}
        toggleTheme={toggleTheme}
        notifications={notifications}
        showNotifications={showNotifications}
        setShowNotifications={setShowNotifications}
        removeNotification={removeNotification}
      />

      {/* MQTT Status Message - shown at initial load */}
      {mqttStatus && !connectionError && (
        <div className={`mb-4 p-3 rounded-md ${
          mqttStatus === 'connected' ? 'bg-green-50 text-green-700' :
          mqttStatus === 'connecting' ? 'bg-blue-50 text-blue-700' :
          mqttStatus === 'reconnecting' ? 'bg-yellow-50 text-yellow-700' :
          'bg-red-50 text-red-700'
        }`}>
          <div className="flex items-center">
            {mqttStatus === 'connected' && <CheckCircle className="h-5 w-5 mr-2" />}
            {mqttStatus === 'connecting' && <Info className="h-5 w-5 mr-2" />}
            {mqttStatus === 'reconnecting' && <AlertTriangle className="h-5 w-5 mr-2" />}
            {mqttStatus === 'error' && <AlertCircle className="h-5 w-5 mr-2" />}
            <span>
              {mqttStatus === 'connected' && 'Connected to MQTT broker successfully.'}
              {mqttStatus === 'connecting' && 'Establishing connection to MQTT broker...'}
              {mqttStatus === 'reconnecting' && 'Connection lost. Attempting to reconnect...'}
              {mqttStatus === 'error' && 'Failed to connect to MQTT broker. Check your connection settings.'}
            </span>
          </div>
        </div>
      )}

      {/* Search and view selector in the same row */}
      <div className="mb-4 flex flex-wrap justify-between items-center">
        {/* Search box and sensor selector on the left */}
        <div className="relative flex-grow mr-4 mb-2 md:mb-0">
          <div className="flex items-center">
            <SearchBar
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              addSearchTerm={addSearchTerm}
              handleKeyPress={handleKeyPress}
            />
            
            <SensorDropdown
              showSelectorDropdown={showSelectorDropdown}
              setShowSelectorDropdown={setShowSelectorDropdown}
              selectedSensors={selectedSensors}
              availableSensors={availableSensors}
              setSelectedSensors={setSelectedSensors}
              friendlyNames={friendlyNames}
            />
          </div>
          
          <SearchTags
            searchTerms={searchTerms}
            removeSearchTerm={removeSearchTerm}
            setSearchTerms={setSearchTerms}
          />
        </div>
        
        {/* View selector on the right */}
        <ViewSelector 
          activeView={activeView} 
          setActiveView={setActiveView} 
          showDevInfo={showDevInfo} 
        />
      </div>

      {/* Time interval and export options - only visible in dev mode */}
      {showDevInfo && (
        <DevModeControls 
          setShowDevInfo={setShowDevInfo} 
          showDevInfo={showDevInfo}
          selectedInterval={selectedInterval}
          setSelectedInterval={setSelectedInterval}
          handleExport={handleExport}
        />
      )}

      {/* Active view */}
      <div className="mb-6">
        {activeView === 'grid' && (
          <StatusGridVisualization 
            sensorData={sensorData} 
            priorityDevices={priorityDevices}
            isConnected={isConnected}
            showAllDevices={showDevInfo}
            filteredSensors={filteredSensors}
          />
        )}
        
        {activeView === 'hierarchical' && (
          <HierarchicalSensorView
            sensorData={showDevInfo ? sensorData : priorityDevices}
            friendlyNames={friendlyNames}
            isConnected={isConnected}
            filteredSensors={filteredSensors}
          />
        )}
        
        {activeView === 'table' && (
          <>
            <div className="border rounded-lg shadow-md overflow-hidden">
              <div className="p-4 border-b">
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-semibold">Sensors (Table View)</h2>
                  <div className="flex items-center space-x-2">
                    <select
                      className="border rounded-md px-2 py-1 text-sm"
                      value={pageSize}
                      onChange={(e) => {
                        setPageSize(parseInt(e.target.value));
                        setCurrentPage(1);
                      }}
                    >
                      <option value="10">10 / page</option>
                      <option value="20">20 / page</option>
                      <option value="50">50 / page</option>
                      <option value="100">100 / page</option>
                    </select>
                  </div>
                </div>
                <div className="mt-2 text-xs text-gray-500">
                  Showing {Math.min(pageSize, filteredSensors.length - (currentPage - 1) * pageSize)} of {filteredSensors.length} sensors
                </div>
              </div>

              <TabularSensorView
                sensorData={showDevInfo ? sensorData : priorityDevices}
                friendlyNames={friendlyNames}
                isConnected={isConnected}
                filteredSensors={filteredSensors.slice(
                  (currentPage - 1) * pageSize,
                  currentPage * pageSize
                )}
                currentPage={currentPage}
                pageSize={pageSize}
              />
              
              {/* Pagination at the bottom of the table */}
              <div className="p-4 border-t">
                <TablePagination 
                  currentPage={currentPage}
                  totalPages={totalPages}
                  setCurrentPage={setCurrentPage}
                />
              </div>
            </div>
          </>
        )}
        
        {/* Charts view (only in dev mode) */}
        {activeView === 'chart' && showDevInfo && (
          <MultiSensorChart 
            sensorData={sensorData} // Always pass full data for dev mode
            isConnected={isConnected}
            showAllDevices={true}
            filteredSensors={filteredSensors}
            timeInterval={selectedInterval}
          />
        )}
      </div>

      {/* Legacy sensor grid (visualization in dev mode) */}
      {showDevInfo && activeView === 'chart' && (
        <div className="mb-6">
          <ImprovedSensorGrid 
            sensorData={sensorData}
            isConnected={isConnected}
            filteredSensors={filteredSensors}
          />
        </div>
      )}

      {/* Footer */}
      <footer className="mt-8 text-center text-sm text-gray-500">
        <div className="flex items-center justify-center">
          <Gauge className="h-4 w-4 mr-1" />
          <span>Living Lab Monitor &copy; {new Date().getFullYear()}</span>
        </div>
      </footer>

      {/* Notifications */}
      <NotificationsContainer 
        notifications={notifications} 
        removeNotification={removeNotification} 
      />

      {/* Confirmation Modal */}
      {showModal && (
        <ConfirmationModal
          isOpen={showModal}
          title={modalContent.title}
          message={modalContent.message}
          onConfirm={modalContent.onConfirm}
          onClose={() => setShowModal(false)}
          confirmText={modalContent.confirmText}
          cancelText={modalContent.cancelText}
        />
      )}
    </div>
  );
}

export default App;