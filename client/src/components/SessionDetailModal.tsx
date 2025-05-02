import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface Sensor {
  id: string;
  name: string;
  fileCount: number;
}

interface SessionFile {
  id: number;
  fileName: string;
  fileType: string;
  fileSize: string;
  sensorId: string;
}

interface SessionDetail {
  id: number;
  sessionId: string;
  name: string;
  startDate: string;
  endDate: string | null;
  status: string;
  sensors: Sensor[];
  files: SessionFile[];
}

interface SessionDetailModalProps {
  isOpen: boolean;
  sessionId: string | null;
  onClose: () => void;
  onDownload: () => void;
}

const SessionDetailModal: React.FC<SessionDetailModalProps> = ({ 
  isOpen, 
  sessionId, 
  onClose, 
  onDownload 
}) => {
  const { data: sessionDetail, isLoading } = useQuery<SessionDetail>({ 
    queryKey: ['/api/sessions', sessionId],
    enabled: !!sessionId && isOpen,
  });

  if (!isOpen) return null;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <span className="badge badge-success inline-block mt-1">Completada</span>;
      case 'processing':
        return <span className="badge badge-warning inline-block mt-1">Procesando</span>;
      case 'error':
        return <span className="badge badge-error inline-block mt-1">Error</span>;
      default:
        return <span className="badge badge-warning inline-block mt-1">En progreso</span>;
    }
  };

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('es-ES');
  };

  const getFileTypeIcon = (fileType: string) => {
    switch (fileType.toLowerCase()) {
      case 'video':
        return 'play_circle';
      case 'data':
        return 'visibility';
      default:
        return 'description';
    }
  };

  const handlePlayVideo = (fileName: string) => {
    window.open(`/api/files/stream/${fileName}`, '_blank');
  };

  const handleDownloadFile = async (fileName: string) => {
    try {
      window.open(`/api/files/download/${fileName}`, '_blank');
    } catch (error) {
      console.error("Error downloading file:", error);
    }
  };

  // Default session detail for rendering
  const defaultDetail: SessionDetail = {
    id: 1,
    sessionId: 'SS-001',
    name: 'Sesión Laboratorio A',
    startDate: '2023-07-12T10:30:15',
    endDate: '2023-07-12T11:45:22',
    status: 'completed',
    sensors: [
      { id: 'MOV-123', name: 'Sensor de Movimiento', fileCount: 2 },
      { id: 'TEMP-456', name: 'Sensor de Temperatura', fileCount: 3 },
      { id: 'PROX-789', name: 'Sensor de Proximidad', fileCount: 1 },
      { id: 'PRES-101', name: 'Sensor de Presión', fileCount: 2 }
    ],
    files: [
      { id: 1, fileName: 'mov_recording_01.mp4', fileType: 'video', fileSize: '28.5 MB', sensorId: 'MOV-123' },
      { id: 2, fileName: 'temp_data_01.csv', fileType: 'data', fileSize: '1.2 MB', sensorId: 'TEMP-456' },
      { id: 3, fileName: 'prox_recording_01.mp4', fileType: 'video', fileSize: '15.7 MB', sensorId: 'PROX-789' },
      { id: 4, fileName: 'pres_data_01.csv', fileType: 'data', fileSize: '0.8 MB', sensorId: 'PRES-101' }
    ]
  };

  const displayDetail = sessionDetail || defaultDetail;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-semibold">Detalles de la Sesión</h2>
          <button 
            className="text-neutral-400 hover:text-neutral-600"
            onClick={onClose}
          >
            <span className="material-icons">close</span>
          </button>
        </div>
        
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : (
          <>
            <div className="overflow-y-auto p-4 flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-medium mb-2">Información General</h3>
                  <div className="space-y-4">
                    <div className="flex flex-col">
                      <span className="text-sm text-neutral-300">ID de Sesión</span>
                      <span className="font-medium">{displayDetail.sessionId}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm text-neutral-300">Nombre</span>
                      <span className="font-medium">{displayDetail.name}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm text-neutral-300">Fecha de Inicio</span>
                      <span className="font-medium">{formatDateTime(displayDetail.startDate)}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm text-neutral-300">Fecha de Finalización</span>
                      <span className="font-medium">{formatDateTime(displayDetail.endDate)}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm text-neutral-300">Estado</span>
                      {getStatusBadge(displayDetail.status)}
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="font-medium mb-2">Sensores Utilizados</h3>
                  <div className="space-y-3">
                    {displayDetail.sensors.map((sensor) => (
                      <div key={sensor.id} className="flex items-center gap-3 p-2 border rounded-md">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                          <span className="material-icons text-sm">sensors</span>
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-sm">{sensor.name}</p>
                          <p className="text-xs text-neutral-300">ID: {sensor.id}</p>
                        </div>
                        <span className="text-xs bg-neutral-100 px-2 py-1 rounded-full">
                          {sensor.fileCount} {sensor.fileCount === 1 ? 'archivo' : 'archivos'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <h3 className="font-medium mb-2">Archivos de la Sesión</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full border rounded-lg">
                    <thead className="bg-neutral-100">
                      <tr>
                        <th className="py-2 px-4 text-left text-sm font-medium text-neutral-400">Nombre</th>
                        <th className="py-2 px-4 text-left text-sm font-medium text-neutral-400">Tipo</th>
                        <th className="py-2 px-4 text-left text-sm font-medium text-neutral-400">Tamaño</th>
                        <th className="py-2 px-4 text-left text-sm font-medium text-neutral-400">Sensor</th>
                        <th className="py-2 px-4 text-left text-sm font-medium text-neutral-400">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {displayDetail.files.map((file) => (
                        <tr key={file.id} className="hover:bg-neutral-50">
                          <td className="py-2 px-4 text-sm font-medium">{file.fileName}</td>
                          <td className="py-2 px-4 text-sm text-neutral-300">{file.fileType}</td>
                          <td className="py-2 px-4 text-sm text-neutral-300">{file.fileSize}</td>
                          <td className="py-2 px-4 text-sm text-neutral-300">{file.sensorId}</td>
                          <td className="py-2 px-4">
                            <div className="flex items-center gap-2">
                              <button 
                                className="rounded p-1 hover:bg-neutral-100 text-primary"
                                onClick={() => file.fileType.toLowerCase() === 'video' 
                                  ? handlePlayVideo(file.fileName) 
                                  : handleDownloadFile(file.fileName)
                                }
                              >
                                <span className="material-icons text-sm">{getFileTypeIcon(file.fileType)}</span>
                              </button>
                              <button 
                                className="rounded p-1 hover:bg-neutral-100 text-primary"
                                onClick={() => handleDownloadFile(file.fileName)}
                              >
                                <span className="material-icons text-sm">download</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            <div className="p-4 border-t flex justify-end gap-3">
              <button className="btn-outline" onClick={onClose}>Cerrar</button>
              <button 
                className="btn-primary flex items-center gap-2"
                onClick={onDownload}
              >
                <span className="material-icons">download</span>
                <span>Descargar Todo</span>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default SessionDetailModal;
