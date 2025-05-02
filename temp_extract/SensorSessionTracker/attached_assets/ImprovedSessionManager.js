import React, { useState, useEffect, useRef } from 'react';
import { Download, RefreshCw, Play, Pause, Clock, Database } from 'lucide-react';

const SESSIONS_KEY = 'zigbee_monitor_sessions';
const MAX_SESSIONS = 7;

const ImprovedSessionManager = ({ 
  isConnected, 
  isRecording,
  recordingStartTime,
  onStartRecording, 
  onStopRecording,
  onExportData,
  onClearData,
  eventCount = 0
}) => {
  const [sessions, setSessions] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const timerRef = useRef(null);
  const dropdownRef = useRef(null);
  
  // Cargar sesiones guardadas
  useEffect(() => {
    try {
      const savedSessions = localStorage.getItem(SESSIONS_KEY);
      if (savedSessions) {
        setSessions(JSON.parse(savedSessions));
      }
    } catch (error) {
      console.error("Error al cargar sesiones:", error);
      // En caso de error, inicializa con un array vacío
      setSessions([]);
    }
  }, []);
  
  // Manejar temporizador para sesión activa
  useEffect(() => {
    if (isRecording && recordingStartTime) {
      // Inicializar el contador con el tiempo transcurrido actual
      const now = new Date();
      const start = new Date(recordingStartTime);
      const initialElapsed = Math.floor((now - start) / 1000);
      setElapsedTime(initialElapsed);
      
      // Iniciar timer que actualiza cada segundo
      timerRef.current = setInterval(() => {
        const now = new Date();
        const start = new Date(recordingStartTime);
        const elapsed = Math.floor((now - start) / 1000);
        setElapsedTime(elapsed);
      }, 1000);
    } else {
      // Limpiar timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setElapsedTime(0);
    }
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isRecording, recordingStartTime]);

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  // Iniciar sesión
  const handleStartSession = () => {
    if (onStartRecording) {
      onStartRecording();
    }
  };
  
  // Finalizar sesión y exportar
  const handleStopAndExport = () => {
    if (onStopRecording) {
      onStopRecording();
    }
    
    // Exportar datos
    const filename = `zigbee-session-${new Date().toISOString().slice(0,19).replace(/:/g, '-')}.json`;
    
    if (onExportData) {
      try {
        const success = onExportData(filename);
        
        if (success) {
          // Guardar referencia de la sesión
          const newSession = {
            id: `session-${Date.now()}`,
            timestamp: new Date().toISOString(),
            duration: elapsedTime,
            eventCount: eventCount,
            filename
          };
          
          const updatedSessions = [newSession, ...sessions].slice(0, MAX_SESSIONS);
          setSessions(updatedSessions);
          localStorage.setItem(SESSIONS_KEY, JSON.stringify(updatedSessions));
        }
      } catch (error) {
        console.error("Error al exportar sesión:", error);
        alert("Hubo un error al exportar la sesión. Inténtalo de nuevo.");
      }
    }
  };
  
  // Nueva sesión (limpia y comienza)
  const handleNewSession = () => {
    if (isRecording) {
      // Finalizar sesión actual primero
      onStopRecording();
      
      // Pequeño delay para asegurar que la sesión termine correctamente
      setTimeout(() => {
        // Limpiar datos
        if (onClearData) {
          onClearData();
        }
        
        // Iniciar nueva sesión
        setTimeout(() => {
          handleStartSession();
        }, 300);
      }, 300);
    } else {
      // Limpiar datos
      if (onClearData) {
        onClearData();
      }
      
      // Iniciar nueva sesión
      setTimeout(() => {
        handleStartSession();
      }, 300);
    }
    
    setShowDropdown(false);
  };
  
  // Formatear duración
  const formatDuration = (seconds) => {
    if (typeof seconds !== 'number' || isNaN(seconds)) {
      return "00:00";
    }
    
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hrs > 0) {
      return `${hrs}h ${mins.toString().padStart(2, '0')}m ${secs.toString().padStart(2, '0')}s`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Formatear fecha
  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString();
    } catch (error) {
      return dateString || "Fecha desconocida";
    }
  };

  const handleExportCurrentData = () => {
    if (onExportData) {
      try {
        onExportData();
      } catch (error) {
        console.error("Error al exportar datos actuales:", error);
      }
    }
    setShowDropdown(false);
  };

  const handleClearData = () => {
    if (onClearData) {
      onClearData();
    }
    setShowDropdown(false);
  };

  const handleCreateBackup = () => {
    try {
      localStorage.setItem("zigbee_sensor_events_backup", localStorage.getItem("zigbee_sensor_events") || "[]");
      alert("Se ha creado una copia de seguridad de los eventos actuales");
    } catch (error) {
      console.error("Error al crear backup:", error);
      alert("Error al crear la copia de seguridad");
    }
    setShowDropdown(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {!isRecording ? (
        // Botón para iniciar sesión
        <button
          onClick={handleStartSession}
          disabled={!isConnected}
          className={`px-4 py-2 rounded-md text-white font-medium flex items-center gap-2 ${
            isConnected ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-400 cursor-not-allowed'
          }`}
          title="Iniciar una nueva sesión de grabación"
        >
          <Play size={16} />
          Iniciar Sesión
        </button>
      ) : (
        // Botón para finalizar sesión con contador en tiempo real
        <button
          onClick={handleStopAndExport}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-md text-white font-medium flex items-center gap-2"
          title="Finalizar la sesión actual y exportar datos"
        >
          <Pause size={16} />
          <span>Finalizar</span>
          <span className="bg-red-700 px-2 py-0.5 rounded text-xs flex items-center">
            <Clock size={12} className="mr-1" />
            {formatDuration(elapsedTime)} | {eventCount} eventos
          </span>
        </button>
      )}
      
      {/* Botón para mostrar menú de sesiones */}
      <button 
        onClick={() => setShowDropdown(!showDropdown)}
        className="ml-2 p-1 bg-gray-200 hover:bg-gray-300 rounded"
        title="Mostrar opciones de sesión"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 9l6 6 6-6"/>
        </svg>
      </button>
      
      {/* Menú desplegable */}
      {showDropdown && (
        <div className="absolute right-0 mt-1 w-72 bg-white rounded-md shadow-lg z-10 overflow-hidden">
          {/* Acciones de sesión */}
          <div className="p-3 border-b">
            <h3 className="text-sm font-medium mb-2">Acciones:</h3>
            <div className="flex flex-col gap-1">
              <button
                onClick={handleNewSession}
                className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 rounded flex items-center gap-2"
              >
                <RefreshCw size={14} />
                {isRecording ? "Nueva Sesión" : "Iniciar Nueva Sesión"}
              </button>
              
              <button
                onClick={handleExportCurrentData}
                disabled={!sessions.length && !isRecording}
                className={`w-full text-left px-3 py-2 text-sm rounded flex items-center gap-2 ${
                  !sessions.length && !isRecording ? 'text-gray-400' : 'hover:bg-blue-50'
                }`}
              >
                <Download size={14} />
                Exportar Datos Actuales
              </button>
              
              <button
                onClick={handleClearData}
                className="w-full text-left px-3 py-2 text-sm hover:bg-red-50 text-red-600 rounded flex items-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                </svg>
                Limpiar Datos
              </button>
              
              <button
                onClick={handleCreateBackup}
                className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 rounded flex items-center gap-2"
              >
                <Database size={14} />
                Crear Backup
              </button>
            </div>
          </div>
          
          {/* Lista de sesiones guardadas */}
          <div className="p-3">
            <h3 className="text-sm font-medium">Sesiones recientes:</h3>
            {sessions.length === 0 ? (
              <div className="text-xs text-gray-500 py-2">No hay sesiones guardadas</div>
            ) : (
              <div className="text-xs max-h-60 overflow-y-auto">
                {sessions.map((session) => (
                  <div key={session.id} className="py-2 border-b last:border-0">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium">{formatDate(session.timestamp)}</div>
                        <div className="text-gray-500 mt-0.5">
                          {formatDuration(session.duration)} | {session.eventCount} eventos
                        </div>
                      </div>
                      <a 
                        href={`data:application/json;charset=utf-8,${encodeURIComponent(JSON.stringify({ session }))}`} 
                        download={session.filename}
                        className="text-blue-600 hover:text-blue-800 p-1"
                      >
                        <Download size={14} />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ImprovedSessionManager;