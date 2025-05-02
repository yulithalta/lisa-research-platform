import React, { useState, useMemo, useEffect } from "react";
import OptimizedSensorCard from "./OptimizedSensorCard";
import ConnectionStatus from "./ConnectionStatus";
import TopicFilter from "./TopicFilter";
import { WifiOff, RefreshCw, Download, Database, Server } from "lucide-react";
import { useLocalStorage } from "../hooks/useLocalStorage";
//import useImprovedMqtt from "../hooks/useImprovedMqtt";
import useSimpleMqtt from "../hooks/useSimpleMqtt";
import ConfirmationModal from "./ConfirmationModal";
import Papa from "papaparse";

const RefinedSensorGrid = () => {
    // Layout configuration
    const [gridLayout, setGridLayout] = useLocalStorage("sensorGridLayout", 2);
    const [sensorImages, setSensorImages] = useLocalStorage("sensorImages", {});
    const [showConfirmation, setShowConfirmation] = useState(false);
    const [confirmationData, setConfirmationData] = useState({
        title: "",
        message: "",
        onConfirm: () => { },
        onCancel: () => { },
        confirmText: "",
        cancelText: ""
    });
    const [filteredTopics, setFilteredTopics] = useState([]);

    // Get MQTT data with improved hook
    const {
        isConnected,
        isOfflineMode,
        connectionError,
        availableTopics,
        reconnect,
        toggleOfflineMode,
        getSensorData, // This replaces getMessagesByTopic
        saveData,      // This replaces saveDataToStorage
        _forceUpdate   // Add this to dependencies of useMemo if needed
    } = useSimpleMqtt({
        brokerUrl: ["ws://192.168.0.20:9001", "ws://mforum-livinglab:9001"],
        topics: ["zigbee2mqtt/#"]
    });

    // Get sensor data grouped by topic
    const sensorsData = useMemo(() => {
        return getSensorData(filteredTopics.length > 0 ? filteredTopics : null);
    }, [getSensorData, filteredTopics, _forceUpdate]); // Include _forceUpdate as dependency

    // Handle topic filtering
    const handleTopicFilterChange = (selectedTopics) => {
        setFilteredTopics(selectedTopics);
    };

    // Update sensor image
    const updateSensorImage = (sensorName, imageUrl) => {
        setSensorImages(prev => ({
            ...prev,
            [sensorName]: imageUrl
        }));
    };

    // Export data to CSV
    const handleExportCSV = () => {
        const csvData = [];

        Object.keys(sensorsData).forEach(sensorName => {
            sensorsData[sensorName].forEach(entry => {
                if (entry.x && !isNaN(new Date(entry.x).getTime())) {
                    csvData.push({
                        sensor: sensorName,
                        timestamp: new Date(entry.x).toISOString(),
                        contact: entry.y,
                        battery: entry.battery,
                        linkquality: entry.linkquality
                    });
                }
            });
        });

        if (csvData.length === 0) {
            setConfirmationData({
                title: "Sin datos",
                message: "No hay datos para exportar",
                onConfirm: () => setShowConfirmation(false),
                confirmText: "Aceptar",
                showCancel: false
            });
            setShowConfirmation(true);
            return;
        }

        const csv = Papa.unparse(csvData);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');

        link.setAttribute('href', url);
        link.setAttribute('download', `zigbee-sensors-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        // Show confirmation
        setConfirmationData({
            title: "Exportación completa",
            message: `Se han exportado ${csvData.length} registros de ${Object.keys(sensorsData).length} sensores.`,
            onConfirm: () => setShowConfirmation(false),
            confirmText: "Aceptar",
            showCancel: false
        });
        setShowConfirmation(true);
    };

    // Save data to storage
    const handleSaveData = () => {
        const success = saveDataToStorage();

        if (success) {
            setConfirmationData({
                title: "Datos guardados",
                message: "Los datos se han guardado correctamente en el almacenamiento local.",
                onConfirm: () => setShowConfirmation(false),
                confirmText: "Aceptar",
                showCancel: false
            });
        } else {
            setConfirmationData({
                title: "Error",
                message: "No se pudieron guardar los datos en el almacenamiento local.",
                onConfirm: () => setShowConfirmation(false),
                confirmText: "Aceptar",
                showCancel: false
            });
        }

        setShowConfirmation(true);
    };

    // Grid layout class
    const gridClass = {
        2: 'grid-cols-1 sm:grid-cols-2',
        3: 'grid-cols-1 sm:grid-cols-3',
        4: 'grid-cols-1 sm:grid-cols-4'
    }[gridLayout];

    // Handle filtered topics with sensor prefix
    useEffect(() => {
        if (allTopics.length > 0 && filteredTopics.length === 0) {
            // Auto-select sensor topics by default
            const sensorTopics = allTopics.filter(topic =>
                topic.toLowerCase().includes("sensor") &&
                !topic.includes("availability") &&
                !topic.includes("compatible") &&
                !topic.startsWith("zigbee2mqtt/")
            );

            setFilteredTopics(sensorTopics);
        }
    }, [allTopics, filteredTopics.length]);

    // Connection error state
    if (connectionError && !isOfflineMode && Object.keys(sensorsData).length === 0) {
        return (
            <div className="p-4 bg-white shadow-md rounded-lg w-full min-h-[250px] flex items-center justify-center">
                <div className="text-center">
                    <WifiOff className="h-10 w-10 mx-auto text-gray-400 mb-3" />
                    <h2 className="text-lg font-semibold mb-2">Error de conexión</h2>
                    <p className="text-gray-500 max-w-md text-sm">{connectionError}</p>
                    <div className="mt-4 flex space-x-2 justify-center">
                        <button
                            onClick={reconnect}
                            className="px-3 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 text-sm"
                        >
                            <RefreshCw className="h-3 w-3 inline mr-1" />
                            Reintentar
                        </button>
                        <button
                            onClick={toggleOfflineMode}
                            className="px-3 py-1 bg-gray-500 text-white rounded-md hover:bg-gray-600 text-sm"
                        >
                            <Server className="h-3 w-3 inline mr-1" />
                            Modo Offline
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Main view
    return (
        <div className="p-4 bg-white shadow-md rounded-lg w-full">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3 gap-2">
                <div className="flex items-center">
                    <h2 className="text-lg font-bold text-gray-800">
                        📊 Estado de los Sensores
                        {isOfflineMode && (
                            <span className="ml-2 text-xs font-normal text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                                Modo Offline
                            </span>
                        )}
                    </h2>
                    <div className="ml-3">
                        <ConnectionStatus
                            isConnected={isConnected}
                            connectionError={connectionError}
                            isUsingLoadedData={isOfflineMode}
                            retryConnection={reconnect}
                            toggleOfflineMode={toggleOfflineMode}
                            broker={currentBroker || "MQTT"}
                        />
                    </div>
                </div>

                <div className="flex items-center space-x-2 flex-wrap sm:flex-nowrap">
                    <div className="flex border rounded-md overflow-hidden">
                        {[4, 3, 2].map(cols => (
                            <button
                                key={cols}
                                className={`px-2 py-1 flex items-center text-xs ${gridLayout === cols ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}
                                onClick={() => setGridLayout(cols)}
                                title={`${cols} columnas`}
                            >
                                <span>{cols}x</span>
                            </button>
                        ))}
                    </div>

                    <TopicFilter
                        availableTopics={allTopics}
                        onFilterChange={handleTopicFilterChange}
                    />

                    <button
                        className="px-2 py-1 bg-green-500 text-white rounded-md hover:bg-green-600 flex items-center text-xs"
                        onClick={handleExportCSV}
                        title="Exportar datos a CSV"
                    >
                        <Download className="h-3 w-3 mr-1" />
                        <span>CSV</span>
                    </button>

                    <button
                        className="px-2 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 flex items-center text-xs"
                        onClick={handleSaveData}
                        title="Guardar datos en almacenamiento local"
                    >
                        <Database className="h-3 w-3 mr-1" />
                        <span>Guardar</span>
                    </button>

                    <button
                        className={`px-2 py-1 ${isOfflineMode ? 'bg-amber-500 hover:bg-amber-600' : 'bg-gray-500 hover:bg-gray-600'} text-white rounded-md flex items-center text-xs`}
                        onClick={toggleOfflineMode}
                        title={isOfflineMode ? "Activar conexión en vivo" : "Activar modo offline"}
                    >
                        {isOfflineMode ? (
                            <>
                                <RefreshCw className="h-3 w-3 mr-1" />
                                <span>En vivo</span>
                            </>
                        ) : (
                            <>
                                <Server className="h-3 w-3 mr-1" />
                                <span>Offline</span>
                            </>
                        )}
                    </button>
                </div>
            </div>

            <div className={`grid ${gridClass} gap-4 mx-auto max-w-6xl`}>
                {Object.keys(sensorsData).length > 0 ? (
                    Object.keys(sensorsData).map((sensorName) => (
                        <OptimizedSensorCard
                            key={sensorName}
                            sensorName={sensorName}
                            sensorData={sensorsData[sensorName]}
                            imageUrl={sensorImages[sensorName] || "/sensor-icon.png"}
                            onImageChange={(url) => updateSensorImage(sensorName, url)}
                        />
                    ))
                ) : (
                    <div className="col-span-full p-10 text-center text-gray-500">
                        {isOfflineMode ? (
                            <>
                                No hay datos guardados en el modo offline.
                                <div className="mt-3">
                                    <button
                                        onClick={toggleOfflineMode}
                                        className="px-3 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 text-sm"
                                    >
                                        <RefreshCw className="h-3 w-3 inline mr-1" />
                                        Intentar conexión en vivo
                                    </button>
                                </div>
                            </>
                        ) : (
                            <>
                                {filteredTopics.length > 0 && allTopics.length > 0 ? (
                                    <>No hay datos disponibles para los tópicos seleccionados.</>
                                ) : (
                                    <>No se detectaron sensores. Compruebe la conexión MQTT y que los dispositivos están emparejados.</>
                                )}
                                <div className="mt-3">
                                    <button
                                        onClick={reconnect}
                                        className="px-3 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 text-sm"
                                    >
                                        <RefreshCw className="h-3 w-3 inline mr-1" />
                                        Reconectar
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* Modal de confirmación */}
            <ConfirmationModal
                isOpen={showConfirmation}
                title={confirmationData.title}
                message={confirmationData.message}
                onConfirm={confirmationData.onConfirm}
                onClose={() => setShowConfirmation(false)}
                confirmText={confirmationData.confirmText || "Confirmar"}
                cancelText={confirmationData.cancelText || "Cancelar"}
            />
        </div>
    );
};

export default RefinedSensorGrid;