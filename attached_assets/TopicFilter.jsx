import React, { useState, useEffect, useRef } from 'react';
import { Filter, X, Check, ChevronDown } from 'lucide-react';
import { useLocalStorage } from '../hooks/useLocalStorage';

const TopicFilter = ({ availableTopics = [], onFilterChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [selectedTopics, setSelectedTopics] = useLocalStorage('mqtt_selected_topics', []);
    const dropdownRef = useRef(null);

    // Filtrar tópicos por búsqueda
    const filteredTopics = availableTopics.filter(topic =>
        topic.toLowerCase().includes(search.toLowerCase()) && !topic.startsWith('bridge/')
    );

    // Al cambiar los tópicos disponibles, seleccionar automáticamente los sensores
    useEffect(() => {
        if (availableTopics.length > 0 && selectedTopics.length === 0) {
            // Seleccionar automáticamente tópicos de sensores
            const sensorTopics = availableTopics.filter(topic =>
                topic.toLowerCase().includes('sensor') &&
                !topic.includes('availability') &&
                !topic.includes('bridge/')
            );

            if (sensorTopics.length > 0) {
                setSelectedTopics(sensorTopics);
            }
        }
    }, [availableTopics, selectedTopics.length, setSelectedTopics]);

    // Actualizar el filtro cuando cambian los tópicos seleccionados
    useEffect(() => {
        if (onFilterChange) {
            onFilterChange(selectedTopics);
        }
    }, [selectedTopics, onFilterChange]);

    // Cerrar dropdown al hacer click fuera
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // Toggle para seleccionar/deseleccionar un tópico
    const toggleTopic = (topic) => {
        setSelectedTopics(prev => {
            if (prev.includes(topic)) {
                return prev.filter(t => t !== topic);
            } else {
                return [...prev, topic];
            }
        });
    };

    // Seleccionar/deseleccionar todos los tópicos
    const toggleAll = () => {
        if (selectedTopics.length === filteredTopics.length) {
            setSelectedTopics([]);
        } else {
            setSelectedTopics([...filteredTopics]);
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                className="px-2 py-1 bg-gray-100 text-gray-800 rounded-md hover:bg-gray-200 flex items-center text-xs"
                onClick={() => setIsOpen(!isOpen)}
            >
                <Filter className="h-3 w-3 mr-1" />
                <span>Filtro</span>
                <span className="ml-1 text-xs bg-blue-500 text-white rounded-full w-4 h-4 inline-flex items-center justify-center">
                    {selectedTopics.length}
                </span>
                <ChevronDown className="h-3 w-3 ml-1" />
            </button>

            {isOpen && (
                <div className="absolute right-0 z-10 mt-1 w-64 bg-white rounded-md shadow-lg border border-gray-200 text-xs">
                    <div className="p-2">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="font-medium">Filtrar tópicos</h3>
                            <button
                                className="text-gray-500 hover:text-gray-700"
                                onClick={() => setIsOpen(false)}
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </div>

                        <div className="relative mb-2">
                            <input
                                type="text"
                                placeholder="Buscar tópicos..."
                                className="w-full border rounded px-2 py-1 text-xs"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                            {search && (
                                <button
                                    className="absolute right-2 top-1 text-gray-400 hover:text-gray-600"
                                    onClick={() => setSearch('')}
                                >
                                    <X className="h-3 w-3" />
                                </button>
                            )}
                        </div>

                        <div className="flex justify-between mb-2">
                            <button
                                className="text-blue-500 hover:text-blue-700 text-xs"
                                onClick={toggleAll}
                            >
                                {selectedTopics.length === filteredTopics.length ? 'Deseleccionar todos' : 'Seleccionar todos'}
                            </button>
                            <span className="text-gray-500 text-xs">
                                {selectedTopics.length} / {filteredTopics.length}
                            </span>
                        </div>

                        <div className="max-h-40 overflow-y-auto pr-1">
                            {filteredTopics.length > 0 ? (
                                filteredTopics.map((topic) => (
                                    <div
                                        key={topic}
                                        className="flex items-center py-1 hover:bg-gray-50 cursor-pointer"
                                        onClick={() => toggleTopic(topic)}
                                    >
                                        <div className={`w-4 h-4 rounded border mr-2 flex items-center justify-center ${selectedTopics.includes(topic) ? 'bg-blue-500 border-blue-500' : 'border-gray-300'}`}>
                                            {selectedTopics.includes(topic) && <Check className="h-3 w-3 text-white" />}
                                        </div>
                                        <span className="truncate">{topic}</span>
                                    </div>
                                ))
                            ) : (
                                <div className="py-2 text-center text-gray-500">
                                    No se encontraron tópicos
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TopicFilter;