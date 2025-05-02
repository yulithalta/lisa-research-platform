import React, { useState, useEffect, useMemo, useCallback } from "react";
import useMqtt from "../hooks/useMqtt";
import { motion } from "framer-motion";
import SensorCard from "./SensorCard";
import ConnectionStatus from "./ConnectionStatus";
import { Download, Upload, Activity, RefreshCw, FileText } from "lucide-react";
import { useLocalStorage } from "../hooks/useLocalStorage";
import Papa from "papaparse";

const SensorGrid = () => {
  const { sensorMessages, isConnected, connectionError } = useMqtt();
  const [gridLayout, setGridLayout] = useLocalStorage("sensorGridLayout", 2);
  const [sensorImages, setSensorImages] = useLocalStorage("sensorImages", {});
  const [csvData, setCsvData] = useState([]);
  const [loadedSensorData, setLoadedSensorData] = useState({});
  const [isUsingLoadedData, setIsUsingLoadedData] = useState(false);
  
  // Modal states
  const [showLoadConfirmation, setShowLoadConfirmation] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showFileManagement, setShowFileManagement] = useState(false);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [confirmationMessage, setConfirmationMessage] = useState({ title: '', message: '', onConfirm: () => {}, onCancel: () => {} });
  const [csvFileName, setCsvFileName] = useState(`sensor-data-${new Date().toISOString().slice(0,10)}`);
  const [csvFileToLoad, setCsvFileToLoad] = useState(null);

  // Funciones para guardar y cargar datos del localStorage
  const saveDataToLocalStorage = (data, metadata) => {
    try {
      localStorage.setItem('sensorData', JSON.stringify(data));
      localStorage.setItem('sensorDataMeta', JSON.stringify({
        ...metadata,
        savedAt: new Date().toISOString()
      }));
      return true;
    } catch (error) {
      console.error('Error saving data to localStorage:', error);
      return false;
    }
  };

  const loadDataFromLocalStorage = () => {
    try {
      const data = localStorage.getItem('sensorData');
      const meta = localStorage.getItem('sensorDataMeta');
      
      if (data && meta) {
        setLoadedSensorData(JSON.parse(data));
        setIsUsingLoadedData(true);
        
        const metadata = JSON.parse(meta);
        console.log(`Datos cargados: ${metadata.fileName} (${metadata.entryCount} registros) guardados el ${new Date(metadata.savedAt).toLocaleString()}`);
        
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error loading data from localStorage:', error);
      return false;
    }
  };

  // Esta función calcula los datos de sensores combinando datos cargados y en vivo
  const sensorsData = useMemo(() => {
    const sensors = {};
    const allData = [];
    
    // Primero cargamos los datos históricos del CSV (si existen)
    if (isUsingLoadedData && Object.keys(loadedSensorData).length > 0) {
      // Copiar los datos cargados como base
      Object.keys(loadedSensorData).forEach(sensorName => {
        sensors[sensorName] = [...loadedSensorData[sensorName]];
      });
    }
    
    // Luego añadimos los datos en vivo más recientes
    if (sensorMessages && sensorMessages.length > 0) {
      sensorMessages.forEach((msg) => {
        const sensorName = msg.topic.replace("zigbee2mqtt/", "");
        
        // Omitir tópicos de bridge/sistema
        if (sensorName.startsWith("bridge/") || sensorName.includes("bridge")) {
          return;
        }
        
        // Inicializar array si no existe
        if (!sensors[sensorName]) {
          sensors[sensorName] = [];
        }
        
        // Determinar estado (abierto/cerrado) - 0 para abierto, 1 para cerrado
        let yValue;
        if (typeof msg.payload.contact === 'boolean') {
          // Invertimos la lógica para solucionar el problema de estado
          yValue = msg.payload.contact ? 1 : 0; // true = closed (1), false = open (0)
        } else if (msg.payload.contact === 'true' || 
                   msg.payload.contact === 'open' || 
                   msg.payload.contact === true ||
                   msg.payload.contact === 0) {
          // Various "open" indicators
          yValue = 1; // Open
        } else if (msg.payload.contact === 'false' || 
                   msg.payload.contact === 'closed' || 
                   msg.payload.contact === false ||
                   msg.payload.contact === 1) {
          // Various "closed" indicators
          yValue = 0; // Closed
        } else {
          // Default to closed if we can't determine
          yValue = 0;
        }
        
        // Crear entrada de datos
        const entry = {
          x: msg.timestamp,
          y: yValue,
          battery: msg.payload.battery || 0,
          linkquality: msg.payload.linkquality || 0,
        };
        
        console.debug(`Sensor: ${sensorName}, Raw contact: ${JSON.stringify(msg.payload.contact)}, Processed yValue: ${yValue}`);
        // Añadir entrada a los datos del sensor
        sensors[sensorName].push(entry);
        
        // Añadir a los datos CSV
        if (entry.x && !isNaN(new Date(entry.x).getTime())) {
          allData.push({
            sensor: sensorName,
            timestamp: new Date(entry.x).toISOString(),
            contact: entry.y,
            battery: entry.battery,
            linkquality: entry.linkquality
          });
        }
      });
    }
    
    // Limitar la cantidad de datos por sensor y ordenarlos cronológicamente
    Object.keys(sensors).forEach(key => {
      // Ordenar por fecha
      sensors[key].sort((a, b) => new Date(a.x) - new Date(b.x));
      
      // Limitar a 50 entradas más recientes
      if (sensors[key].length > 50) {
        sensors[key] = sensors[key].slice(-50);
      }
    });
    
    // Ordenar y actualizar datos CSV
    const combinedData = [...allData];
    if (isUsingLoadedData) {
      // Añadir los datos cargados del CSV que no estén ya en allData
      Object.keys(loadedSensorData).forEach(sensorName => {
        loadedSensorData[sensorName].forEach(entry => {
          if (entry.x && !isNaN(new Date(entry.x).getTime())) {
            combinedData.push({
              sensor: sensorName,
              timestamp: new Date(entry.x).toISOString(),
              contact: entry.y,
              battery: entry.battery,
              linkquality: entry.linkquality
            });
          }
        });
      });
    }
    
    // Ordenar por fecha (más reciente primero)
    combinedData.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    // Eliminar duplicados basados en sensor+timestamp
    const uniqueData = Array.from(
      new Map(combinedData.map(item => 
        [`${item.sensor}-${item.timestamp}`, item]
      )).values()
    );
    
    setCsvData(uniqueData);
    
    return sensors;
  }, [sensorMessages, isUsingLoadedData, loadedSensorData]);

  // Manejo del archivo CSV
  const handleCsvFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setCsvFileToLoad(e.target.files[0]);
      setShowLoadConfirmation(true);
    }
  };

  // Función para cargar datos desde CSV
  const handleLoadFromCSV = useCallback(() => {
    if (!csvFileToLoad) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        Papa.parse(e.target.result, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            const parsedData = {};
            
            // Procesar cada fila de datos CSV
            results.data.forEach((row) => {
              if (!row.sensor || !row.timestamp) return;
              
              const sensorName = row.sensor;
              if (!parsedData[sensorName]) parsedData[sensorName] = [];
              
              const timestamp = new Date(row.timestamp);
              if (!isNaN(timestamp.getTime())) {
                parsedData[sensorName].push({
                  x: timestamp,
                  y: parseInt(row.contact) || 0,
                  battery: parseInt(row.battery) || 0,
                  linkquality: parseInt(row.linkquality) || 0,
                });
              }
            });
            
            // Ordenar datos cronológicamente para cada sensor
            Object.keys(parsedData).forEach((key) => {
              parsedData[key].sort((a, b) => new Date(a.x) - new Date(b.x));
            });
            
            // Guardar los datos en localStorage
            const fileName = csvFileToLoad.name;
            localStorage.setItem('sensorData', JSON.stringify(parsedData));
            localStorage.setItem('sensorDataMeta', JSON.stringify({
              fileName,
              loadedAt: new Date().toISOString(),
              sensorCount: Object.keys(parsedData).length,
              entryCount: results.data.length
            }));
            
            // Actualizar estado con datos cargados y mantener actualización en vivo
            setLoadedSensorData(parsedData);
            setIsUsingLoadedData(true);
            setShowLoadConfirmation(false);
            
            // Mostrar mensaje de éxito
            alert(`Se han cargado ${results.data.length} registros para ${Object.keys(parsedData).length} sensores desde ${fileName}.`);
          },
          error: (error) => {
            console.error('Error parsing CSV:', error);
            alert('Error al procesar el archivo CSV. Verifique el formato.');
          }
        });
      } catch (error) {
        console.error('Error reading CSV file:', error);
        alert('Error al leer el archivo CSV.');
      }
    };
    
    reader.readAsText(csvFileToLoad);
  }, [csvFileToLoad]);

  // Función para exportar datos a CSV
  const exportToCSV = () => {
    if (csvData.length === 0) {
      alert('No hay datos para exportar.');
      return;
    }
    
    // Crear CSV
    const csv = Papa.unparse(csvData);
    
    // Crear blob y descargar
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    // Generar nombre de archivo con fecha actual
    const date = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const fileName = `${csvFileName || `zigbee_sensors_${date}`}.csv`;
    
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Guardar metadatos para referencia futura
    saveDataToLocalStorage(sensorsData, {
      fileName,
      entryCount: csvData.length,
      sensorCount: Object.keys(sensorsData).length,
      exportDate: new Date().toISOString()
    });
    
    setShowExportModal(false);
    alert(`Datos exportados exitosamente a ${fileName}`);
  };

  // Volver a los datos en vivo
  const handleUseLiveData = () => {
    setIsUsingLoadedData(false);
    setLoadedSensorData({});
  };

  // Verificar datos guardados al inicio
  useEffect(() => {
    // Comprobar si hay datos guardados al montar el componente
    const meta = localStorage.getItem('sensorDataMeta');
    if (meta) {
      const metadata = JSON.parse(meta);
      
      // Mostrar modal de confirmación para cargar datos guardados
      setConfirmationMessage({
        title: 'Datos guardados encontrados',
        message: `Se encontraron datos guardados (${metadata.fileName}) con ${metadata.entryCount} registros. ¿Desea cargarlos?`,
        onConfirm: () => {
          loadDataFromLocalStorage();
          setShowConfirmationModal(false);
        },
        onCancel: () => {
          // Si no se cargan los datos guardados, continuar con datos en vivo
          setIsUsingLoadedData(false);
          setShowConfirmationModal(false);
        }
      });
      setShowConfirmationModal(true);
    }
  }, []);

  // Función para actualizar la imagen del sensor
  const updateSensorImage = (sensorName, imageUrl) => {
    setSensorImages(prev => ({
      ...prev,
      [sensorName]: imageUrl
    }));
  };

  // Set grid class based on layout selection
  const gridClass = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-4'
  }[gridLayout];

  // Filter out bridge and system topics
  const filteredSensors = useMemo(() => {
    return Object.keys(sensorsData).filter(
      name => !name.startsWith('bridge/') && !name.includes('bridge')
    );
  }, [sensorsData]);


  <div className="flex items-center">
    <h2 className="text-lg font-bold text-gray-800">
      📊 Estado de los Sensores
      {isUsingLoadedData && (
        <span className="ml-2 text-xs font-normal text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
          Datos cargados desde CSV
        </span>
      )}
    </h2>
    <div className="ml-3">
      <ConnectionStatus 
        isConnected={isConnected} 
        connectionError={connectionError}
        isUsingLoadedData={isUsingLoadedData}
        retryConnection={() => window.location.reload()}
      />
    </div>
  </div>

  // Componente para el diálogo de confirmación
  const ConfirmationModal = ({ isOpen, onConfirm, onCancel }) => {
    if (!isOpen) return null;
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl p-4 max-w-md w-full mx-4">
          <h3 className="text-lg font-semibold mb-2">{confirmationMessage.title}</h3>
          <p className="text-sm mb-4">{confirmationMessage.message}</p>
          
          <div className="flex justify-end space-x-2">
            <button 
              className="px-3 py-1 bg-gray-200 text-gray-800 rounded-md text-sm hover:bg-gray-300"
              onClick={onCancel || confirmationMessage.onCancel}
            >
              Cancelar
            </button>
            <button 
              className="px-3 py-1 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
              onClick={onConfirm || confirmationMessage.onConfirm}
            >
              Confirmar
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Componente para la gestión de archivos
  const FileManagementDialog = ({ isOpen, onClose }) => {
    const [savedFiles, setSavedFiles] = useState([]);
    
    // Cargar información de archivos guardados
    useEffect(() => {
      if (!isOpen) return;
      
      // Buscar todos los archivos guardados
      const files = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.endsWith('_meta')) {
          try {
            const metadata = JSON.parse(localStorage.getItem(key));
            const baseKey = key.replace('_meta', '');
            
            files.push({
              id: baseKey,
              name: metadata.fileName || 'Archivo sin nombre',
              date: metadata.savedAt || new Date().toISOString(),
              sensors: metadata.sensorCount || 0,
              entries: metadata.entryCount || 0
            });
          } catch (error) {
            console.error(`Error parsing metadata for ${key}:`, error);
          }
        }
      }
      
      // Ordenar por fecha (más reciente primero)
      files.sort((a, b) => new Date(b.date) - new Date(a.date));
      setSavedFiles(files);
    }, [isOpen]);
    
    // Función para cargar un archivo
    const handleLoadFile = (fileId) => {
      try {
        const data = localStorage.getItem(fileId);
        const metadata = localStorage.getItem(`${fileId}_meta`);
        
        if (data && metadata) {
          const parsedData = JSON.parse(data);
          //const parsedMeta = JSON.parse(metadata);
          
          // Cerrar el diálogo y pasar los datos al componente principal
          setLoadedSensorData(parsedData);
          setIsUsingLoadedData(true);
          onClose();
          return true;
        }
        
        alert('Error: No se pudo cargar el archivo seleccionado.');
        return false;
      } catch (error) {
        console.error('Error loading file:', error);
        alert('Error al cargar el archivo seleccionado.');
        return false;
      }
    };
    
    // Función para eliminar un archivo
    const handleDeleteFile = (fileId) => {
      try {
        localStorage.removeItem(fileId);
        localStorage.removeItem(`${fileId}_meta`);
        
        // Actualizar la lista
        setSavedFiles(savedFiles.filter(file => file.id !== fileId));
        return true;
      } catch (error) {
        console.error('Error deleting file:', error);
        alert('Error al eliminar el archivo seleccionado.');
        return false;
      }
    };
    
    if (!isOpen) return null;
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl p-4 max-w-2xl w-full mx-4">
          <h3 className="text-lg font-semibold mb-2">Gestión de archivos guardados</h3>
          
          {savedFiles.length === 0 ? (
            <p className="text-sm text-gray-500 py-4 text-center">No hay archivos guardados</p>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              <table className="w-full text-sm border-collapse">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="p-2 border text-left">Nombre</th>
                    <th className="p-2 border text-left">Fecha</th>
                    <th className="p-2 border text-center">Sensores</th>
                    <th className="p-2 border text-center">Entradas</th>
                    <th className="p-2 border text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {savedFiles.map((file) => (
                    <tr key={file.id} className="hover:bg-gray-50">
                      <td className="p-2 border">{file.name}</td>
                      <td className="p-2 border">{new Date(file.date).toLocaleString()}</td>
                      <td className="p-2 border text-center">{file.sensors}</td>
                      <td className="p-2 border text-center">{file.entries}</td>
                      <td className="p-2 border text-center">
                        <div className="flex justify-center space-x-2">
                          <button
                            className="text-blue-500 hover:text-blue-700"
                            onClick={() => handleLoadFile(file.id)}
                          >
                            Cargar
                          </button>
                          <button
                            className="text-red-500 hover:text-red-700"
                            onClick={() => handleDeleteFile(file.id)}
                          >
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          
          <div className="flex justify-end mt-4">
            <button
              className="px-3 py-1 bg-gray-200 text-gray-800 rounded-md text-sm hover:bg-gray-300"
              onClick={() => onClose()}
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    );
  };

  // If there are no sensors or there's an error, show an informative message
  if (connectionError && !isUsingLoadedData) {
    return (
      <motion.div 
        className="p-4 bg-white shadow-md rounded-lg w-full min-h-[250px] flex items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="text-center">
          <Activity className="w-10 h-10 text-gray-400 mx-auto mb-3" />
          <h2 className="text-lg font-semibold mb-2">Error de conexión</h2>
          <p className="text-gray-500 max-w-md text-sm">{connectionError}</p>
          <div className="mt-4 flex justify-center space-x-3">
            <button 
              className="px-3 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors text-sm"
              onClick={() => window.location.reload()}
              type="button"
            >
              <RefreshCw className="w-3 h-3 inline mr-1" />
              Reintentar
            </button>
            <div className="relative">
              <input
                type="file"
                id="csv-upload"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                accept=".csv"
                onChange={handleCsvFileChange}
              />
              <button 
                className="px-3 py-1 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors text-sm"
                type="button"
              >
                <Upload className="w-3 h-3 inline mr-1" />
                Cargar CSV
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  if (filteredSensors.length === 0 && !isUsingLoadedData) {
    return (
      <motion.div 
        className="p-4 bg-white shadow-md rounded-lg w-full min-h-[250px] flex items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="text-center">
          <Activity className="w-10 h-10 text-gray-400 mx-auto mb-3" />
          <h2 className="text-lg font-semibold mb-2">No hay sensores disponibles</h2>
          <p className="text-gray-500 max-w-md text-sm">
            No se han detectado sensores Zigbee. Verifique que los dispositivos estén emparejados correctamente.
          </p>
          <div className="mt-4 flex justify-center space-x-3">
            <button 
              className="px-3 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors text-sm"
              onClick={() => window.location.reload()}
              type="button"
            >
              <RefreshCw className="w-3 h-3 inline mr-1" />
              Reintentar
            </button>
            <div className="relative">
              <input
                type="file"
                id="csv-upload"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                accept=".csv"
                onChange={handleCsvFileChange}
              />
              <button 
                className="px-3 py-1 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors text-sm"
                type="button"
              >
                <Upload className="w-3 h-3 inline mr-1" />
                Cargar CSV
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  // If there are sensors or we're using loaded data, show the grid
  return (
    <div className="relative">
      <motion.div 
        className="p-4 bg-white shadow-md rounded-lg w-full"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3 gap-2">
          <div className="flex items-center">
            <h2 className="text-lg font-bold text-gray-800">
              📊 Estado de los Sensores
              {isUsingLoadedData && (
                <span className="ml-2 text-xs font-normal text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                  Datos cargados desde CSV
                </span>
              )}
            </h2>
            {!isUsingLoadedData && (
              <div className="ml-3 flex items-center">
                <span className={`inline-flex h-2 w-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></span>
                <span className="ml-1 text-xs text-gray-600">{isConnected ? 'Conectado' : 'Desconectado'}</span>
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-1 w-full sm:w-auto">
            <div className="flex border rounded-md overflow-hidden">
              <button
                className={`px-2 py-1 flex items-center text-xs ${gridLayout === 4 ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}
                onClick={() => setGridLayout(4)}
                title="4 columnas"
                type="button"
              >
                <span>4x</span>
              </button>
              <button
                className={`px-2 py-1 flex items-center text-xs ${gridLayout === 3 ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}
                onClick={() => setGridLayout(3)}
                title="3 columnas"
                type="button"
              >
                <span>3x</span>
              </button>
              <button
                className={`px-2 py-1 flex items-center text-xs ${gridLayout === 2 ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}
                onClick={() => setGridLayout(2)}
                title="2 columnas"
                type="button"
              >
                <span>2x</span>
              </button>
            </div>
            
            <div className="flex space-x-1">
              <button
                className="px-2 py-1 bg-green-500 text-white rounded-md hover:bg-green-600 flex items-center text-xs"
                onClick={() => setShowExportModal(true)}
                title="Exportar datos a CSV"
                type="button"
              >
                <Download className="h-3 w-3 mr-1" />
                <span>CSV</span>
              </button>
              
              <button
                className="px-2 py-1 bg-gray-500 text-white rounded-md hover:bg-gray-600 flex items-center text-xs"
                onClick={() => setShowFileManagement(true)}
                title="Gestionar archivos guardados"
                type="button"
              >
                <FileText className="h-3 w-3 mr-1" />
                <span>Archivos</span>
              </button>
              
              {!isUsingLoadedData ? (
                <div className="relative">
                  <input
                    type="file"
                    id="csv-upload"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    accept=".csv"
                    onChange={handleCsvFileChange}
                  />
                  <button 
                    className="px-2 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 flex items-center text-xs"
                    type="button"
                  >
                    <Upload className="h-3 w-3 mr-1" />
                    <span>Cargar</span>
                  </button>
                </div>
              ) : (
                <button
                  className="px-2 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 flex items-center text-xs"
                  onClick={handleUseLiveData}
                  title="Volver a datos en vivo"
                  type="button"
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  <span>En vivo</span>
                </button>
              )}
            </div>
          </div>
        </div>

        <div className={`grid ${gridClass} gap-4 mx-auto max-w-6xl`}>
          {filteredSensors.map((sensorName) => (
            <SensorCard
              key={sensorName}
              sensorName={sensorName}
              sensorData={sensorsData[sensorName]}
              imageUrl={sensorImages[sensorName] || "/sensor-icon.png"}
              onImageChange={(url) => updateSensorImage(sensorName, url)}
            />
          ))}
        </div>
      </motion.div>
      
      {/* Confirmación Modal para Cargar CSV */}
      <ConfirmationModal
        isOpen={showLoadConfirmation}
        onConfirm={handleLoadFromCSV}
        onCancel={() => setShowLoadConfirmation(false)}
      />
      
      {/* Modal para gestión de archivos */}
      <FileManagementDialog
        isOpen={showFileManagement}
        onClose={() => setShowFileManagement(false)}
      />
      
      {/* Confirmación Modal para otras acciones */}
      <ConfirmationModal
        isOpen={showConfirmationModal}
        onConfirm={confirmationMessage.onConfirm}
        onCancel={() => {
          confirmationMessage.onCancel();
          setShowConfirmationModal(false);
        }}
      />
      
      {/* Modal para exportar CSV */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-4 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-2">Exportar datos a CSV</h3>
            <p className="text-sm text-gray-600 mb-4">Introduce un nombre para el archivo CSV:</p>
            
            <input
              type="text"
              className="w-full p-2 border rounded mb-4 text-sm"
              value={csvFileName}
              onChange={(e) => setCsvFileName(e.target.value)}
              placeholder="Nombre del archivo (sin extensión)"
            />
            
            <div className="flex justify-end space-x-2">
              <button
                className="px-3 py-1 border border-gray-300 rounded-md text-sm hover:bg-gray-100"
                onClick={() => setShowExportModal(false)}
              >
                Cancelar
              </button>
              <button
                className="px-3 py-1 bg-green-500 text-white rounded-md text-sm hover:bg-green-600"
                onClick={exportToCSV}
              >
                Exportar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SensorGrid;