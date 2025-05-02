import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface Session {
  id: number;
  sessionId: string;
  name: string;
  startDate: string;
  status: string;
  sensorIds: string[];
  fileCount: number;
}

interface SessionsListProps {
  onViewSession: (session: Session) => void;
  onDownloadSession: (session: Session) => void;
  onDeleteSession: (session: Session) => void;
}

const SessionsList: React.FC<SessionsListProps> = ({ 
  onViewSession, 
  onDownloadSession, 
  onDeleteSession 
}) => {
  const { data: sessions, isLoading } = useQuery<Session[]>({ 
    queryKey: ['/api/sessions'], 
  });

  // Default sample sessions for initial render
  const defaultSessions: Session[] = [
    {
      id: 1,
      sessionId: 'SS-001',
      name: 'Sesión Laboratorio A',
      startDate: '2023-07-12T10:30:15',
      status: 'completed',
      sensorIds: ['MOV-123', 'TEMP-456', 'PROX-789', 'PRES-101'],
      fileCount: 8
    },
    {
      id: 2,
      sessionId: 'SS-002',
      name: 'Prueba Sensores Movimiento',
      startDate: '2023-07-10T14:20:45',
      status: 'processing',
      sensorIds: ['MOV-123', 'PROX-789'],
      fileCount: 3
    },
    {
      id: 3,
      sessionId: 'SS-003',
      name: 'Calibración Sensores Nuevos',
      startDate: '2023-07-05T09:15:30',
      status: 'completed',
      sensorIds: ['TEMP-456', 'HUM-789', 'PRESS-456', 'VIB-123', 'ACCEL-234', 'GYRO-567'],
      fileCount: 12
    },
    {
      id: 4,
      sessionId: 'SS-004',
      name: 'Monitoreo Continuo',
      startDate: '2023-07-01T08:00:00',
      status: 'error',
      sensorIds: ['TEMP-456', 'HUM-789', 'PRESS-456'],
      fileCount: 5
    }
  ];

  const displaySessions = sessions || defaultSessions;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <span className="badge badge-success">Completada</span>;
      case 'processing':
        return <span className="badge badge-warning">Procesando</span>;
      case 'error':
        return <span className="badge badge-error">Error</span>;
      default:
        return <span className="badge badge-warning">En progreso</span>;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Sesiones Recientes</h2>
        <a href="#" className="text-primary flex items-center gap-1 text-sm">
          <span>Ver todas</span>
          <span className="material-icons text-sm">arrow_forward</span>
        </a>
      </div>
      
      <div className="overflow-x-auto">
        {isLoading ? (
          <div className="w-full h-40 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <table className="min-w-full bg-white rounded-lg shadow">
            <thead className="bg-neutral-100">
              <tr>
                <th className="py-3 px-4 text-left text-sm font-medium text-neutral-400">ID</th>
                <th className="py-3 px-4 text-left text-sm font-medium text-neutral-400">Nombre</th>
                <th className="py-3 px-4 text-left text-sm font-medium text-neutral-400">Fecha</th>
                <th className="py-3 px-4 text-left text-sm font-medium text-neutral-400">Sensores</th>
                <th className="py-3 px-4 text-left text-sm font-medium text-neutral-400">Estado</th>
                <th className="py-3 px-4 text-left text-sm font-medium text-neutral-400">Archivos</th>
                <th className="py-3 px-4 text-left text-sm font-medium text-neutral-400">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {displaySessions.map((session) => (
                <tr key={session.id} className="hover:bg-neutral-50">
                  <td className="py-3 px-4 text-sm">{session.sessionId}</td>
                  <td className="py-3 px-4 text-sm">{session.name}</td>
                  <td className="py-3 px-4 text-sm text-neutral-300">{formatDate(session.startDate)}</td>
                  <td className="py-3 px-4 text-sm">{session.sensorIds.length}</td>
                  <td className="py-3 px-4">
                    {getStatusBadge(session.status)}
                  </td>
                  <td className="py-3 px-4 text-sm">{session.fileCount} archivos</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <button 
                        className="rounded p-1 hover:bg-neutral-100 text-primary"
                        onClick={() => onViewSession(session)}
                      >
                        <span className="material-icons text-sm">visibility</span>
                      </button>
                      <button 
                        className="rounded p-1 hover:bg-neutral-100 text-primary"
                        onClick={() => onDownloadSession(session)}
                      >
                        <span className="material-icons text-sm">download</span>
                      </button>
                      <button 
                        className="rounded p-1 hover:bg-neutral-100 text-error"
                        onClick={() => onDeleteSession(session)}
                      >
                        <span className="material-icons text-sm">delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default SessionsList;
