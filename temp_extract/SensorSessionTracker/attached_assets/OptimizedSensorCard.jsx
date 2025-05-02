import React, { useState, useEffect, useRef, useMemo } from "react";
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from "chart.js";
import { Line } from "react-chartjs-2";

// Registrar componentes Chart.js
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend
);

const OptimizedSensorCard = ({
    sensorName,
    sensorData = [],
    imageUrl,
    onImageChange
}) => {
    const [imageInput, setImageInput] = useState("");
    const [showImageInput, setShowImageInput] = useState(false);
    const [showEvents, setShowEvents] = useState(false);
    const chartRef = useRef(null);
    const renderTimerRef = useRef(null);

    // Filtrar datos válidos y asegurar que tengan el formato correcto
    const validData = useMemo(() => {
        try {
            // Validar que sensorData es un array
            if (!Array.isArray(sensorData)) {
                console.warn(`⚠️ sensorData no es un array para ${sensorName}`);
                return [];
            }

            const filtered = sensorData
                .filter(entry => (
                    entry && 
                    entry.x &&
                    !isNaN(new Date(entry.x).getTime())
                ))
                .map(entry => {
                    // Normalizar la estructura de datos
                    let yValue, battery, linkquality;
                    
                    // Extraer valores según la estructura
                    if (typeof entry.y !== 'undefined') {
                        yValue = entry.y;
                        battery = entry.battery || 0;
                        linkquality = entry.linkquality || 0;
                    } else if (entry.payload) {
                        yValue = entry.payload.contact;
                        battery = entry.payload.battery || 0;
                        linkquality = entry.payload.linkquality || 0;
                    } else {
                        yValue = 0;
                        battery = 0;
                        linkquality = 0;
                    }
                    
                    // Normalizar yValue a 0 o 1
                    if (typeof yValue === 'boolean') {
                        yValue = yValue ? 1 : 0;
                    } else if (typeof yValue === 'string') {
                        yValue = (yValue === 'true' || yValue === 'on' || yValue === 'open') ? 1 : 0;
                    } else {
                        yValue = parseInt(yValue) ? 1 : 0;
                    }
                    
                    return {
                        x: new Date(entry.x),
                        y: yValue,
                        battery: parseInt(battery) || 0,
                        linkquality: parseInt(linkquality) || 0
                    };
                });
                
            // Ordenar por fecha y limitar a los últimos 20 registros
            const sortedData = filtered.sort((a, b) => a.x - b.x).slice(-20);
            console.log(`📊 Datos procesados para ${sensorName}: ${sortedData.length} registros`);
            return sortedData;
        } catch (error) {
            console.error(`❌ Error procesando datos del sensor ${sensorName}:`, error);
            return [];
        }
    }, [sensorData, sensorName]);

    // Último registro
    const lastEntry = useMemo(() => {
        if (validData.length === 0) {
            return { y: 0, battery: 0, linkquality: 0, x: new Date() };
        }
        return validData[validData.length - 1];
    }, [validData]);

    // Últimos 5 eventos para la tabla
    const lastEvents = useMemo(() => {
        return validData.slice(-5).reverse();
    }, [validData]);

    // Datos para el gráfico
    const chartData = useMemo(() => {
        if (validData.length === 0) {
            return {
                labels: [],
                datasets: [{
                    label: 'Estado',
                    data: [],
                    fill: false,
                    backgroundColor: 'rgb(75, 192, 192)',
                    borderColor: 'rgba(75, 192, 192, 0.8)',
                    stepped: true,
                    tension: 0.1,
                    pointRadius: 2,
                }]
            };
        }

        return {
            labels: validData.map(entry => {
                return entry.x.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            }),
            datasets: [{
                label: 'Estado',
                data: validData.map(entry => entry.y),
                fill: false,
                backgroundColor: 'rgb(75, 192, 192)',
                borderColor: 'rgba(75, 192, 192, 0.8)',
                stepped: true,
                tension: 0.1,
                pointRadius: 2,
            }]
        };
    }, [validData]);

    // Configuración del gráfico
    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 0 }, // Desactivar animaciones para mejor rendimiento
        plugins: {
            legend: { display: false },
            tooltip: {
                callbacks: {
                    label: function (context) {
                        return context.raw === 1 ? 'Abierto' : 'Cerrado';
                    }
                }
            }
        },
        scales: {
            x: {
                display: true,
                ticks: {
                    maxRotation: 0,
                    autoSkip: true,
                    maxTicksLimit: 5,
                    font: { size: 9 }
                }
            },
            y: {
                display: true,
                min: 0,
                max: 1,
                ticks: {
                    stepSize: 1,
                    callback: function (value) {
                        return value === 1 ? 'Abierto' : 'Cerrado';
                    },
                    font: { size: 9 }
                }
            }
        }
    };

    // Actualizar gráfico con throttling
    useEffect(() => {
        if (!chartRef.current) return;

        // Cancelar timer anterior si existe
        if (renderTimerRef.current) {
            clearTimeout(renderTimerRef.current);
        }

        // Establecer nuevo timer para actualizar el gráfico (throttling)
        renderTimerRef.current = setTimeout(() => {
            try {
                if (chartRef.current) {
                    chartRef.current.update('none'); // Modo 'none' para evitar animaciones
                }
            } catch (e) {
                console.debug(`❌ No se pudo actualizar el gráfico para ${sensorName}:`, e);
            }
        }, 300);

        // Limpiar timer en desmontaje
        return () => {
            if (renderTimerRef.current) {
                clearTimeout(renderTimerRef.current);
            }
        };
    }, [chartData, sensorName]);

    // Actualizar imagen
    const handleImageUpdate = () => {
        if (imageInput.trim()) {
            onImageChange(imageInput.trim());
            setImageInput("");
            setShowImageInput(false);
        }
    };

    // Tarjeta vacía si no hay datos
    if (validData.length === 0) {
        return (
            <div className="border rounded-lg shadow-md bg-white p-3 flex flex-col h-full sensor-card">
                <div className="flex items-center mb-2">
                    <img
                        src={imageUrl}
                        alt={`Sensor ${sensorName}`}
                        className="w-12 h-12 rounded-lg object-contain border p-1"
                        onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = "/sensor-icon.png";
                        }}
                    />
                    <div className="ml-2">
                        <h3 className="text-base font-semibold">{sensorName}</h3>
                        <p className="text-xs text-gray-500">Esperando datos...</p>
                    </div>
                </div>

                <div className="h-24 flex items-center justify-center bg-gray-50 rounded text-xs">
                    <p className="text-gray-400">No hay datos disponibles</p>
                </div>
            </div>
        );
    }

    return (
        <div className="border rounded-lg shadow-md bg-white p-3 flex flex-col h-full sensor-card">
            <div className="flex items-start mb-2">
                <div className="relative mr-2 group">
                    <img
                        src={imageUrl}
                        alt={`Sensor ${sensorName}`}
                        className="w-12 h-12 rounded-lg object-contain border p-1"
                        onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = "/sensor-icon.png";
                        }}
                    />
                    <button
                        className="absolute -top-1 -right-1 bg-gray-100 hover:bg-gray-200 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => setShowImageInput(!showImageInput)}
                        type="button"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                    </button>
                </div>

                <div className="flex-1 min-w-0">
                    <h3 className="text-base font-semibold truncate">{sensorName}</h3>
                    <div className="grid grid-cols-2 gap-x-2 text-xs">
                        <div className="flex items-center">
                            <div className={`h-2 w-2 rounded-full mr-1 ${lastEntry.y === 1 ? 'bg-green-500' : 'bg-red-500'}`}></div>
                            <span>{lastEntry.y === 0 ? 'Cerrado' : 'Abierto'}</span>
                        </div>
                        <div>🔋 {lastEntry.battery || 0}%</div>
                        <div>📶 {lastEntry.linkquality || 0} LQI</div>
                        <div className="text-xs text-gray-500">
                            {lastEntry.x ? lastEntry.x.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : ''}
                        </div>
                    </div>
                </div>
            </div>

            {showImageInput && (
                <div className="mb-2 flex">
                    <input
                        type="text"
                        className="flex-1 border rounded-l-md px-2 py-0.5 text-xs"
                        placeholder="URL de imagen"
                        value={imageInput}
                        onChange={(e) => setImageInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleImageUpdate()}
                    />
                    <button
                        className="bg-blue-500 text-white rounded-r-md px-2 py-0.5 text-xs"
                        onClick={handleImageUpdate}
                        type="button"
                    >
                        OK
                    </button>
                </div>
            )}

            <div className="chart-container my-1 mx-auto w-full">
                {validData.length > 0 && (
                    <Line
                        ref={chartRef}
                        data={chartData}
                        options={chartOptions}
                        key={`chart-${sensorName}`}
                    />
                )}
            </div>

            <div className="mt-auto">
                <button
                    className="text-xs text-blue-500 hover:text-blue-700 flex items-center"
                    onClick={() => setShowEvents(!showEvents)}
                    type="button"
                >
                    {showEvents ? 'Ocultar eventos' : 'Ver últimos 5 eventos'}
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className={`h-3 w-3 ml-1 transition-transform ${showEvents ? 'rotate-180' : ''}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </button>

                {showEvents && (
                    <div className="mt-1 overflow-x-auto">
                        <table className="w-full text-xs border-collapse">
                            <thead>
                                <tr className="bg-gray-50">
                                    <th className="p-1 border text-left font-medium text-gray-600">Tiempo</th>
                                    <th className="p-1 border text-center font-medium text-gray-600">Estado</th>
                                    <th className="p-1 border text-center font-medium text-gray-600">Batería</th>
                                    <th className="p-1 border text-center font-medium text-gray-600">Señal</th>
                                </tr>
                            </thead>
                            <tbody>
                                {lastEvents.map((event, index) => (
                                    <tr key={index} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                                        <td className="p-1 border">
                                            {event.x ? event.x.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'N/A'}
                                        </td>
                                        <td className="p-1 border text-center">
                                            <span className={`inline-block w-2 h-2 rounded-full ${event.y === 1 ? 'bg-green-500' : 'bg-red-500'}`}></span>
                                        </td>
                                        <td className="p-1 border text-center">{event.battery || 0}%</td>
                                        <td className="p-1 border text-center">{event.linkquality || 0}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default OptimizedSensorCard;