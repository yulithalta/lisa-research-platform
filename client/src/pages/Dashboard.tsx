import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import StatsCards from '@/components/StatsCards';
import SessionsList from '@/components/SessionsList';
import SensorsList from '@/components/SensorsList';
import SessionDetailModal from '@/components/SessionDetailModal';
import DeleteConfirmModal from '@/components/DeleteConfirmModal';
import DownloadProgressModal from '@/components/DownloadProgressModal';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { queryClient } from "@/lib/queryClient";

interface Session {
  id: number;
  sessionId: string;
  name: string;
  startDate: string;
  status: string;
  sensorIds: string[];
  fileCount: number;
}

const Dashboard: React.FC = () => {
  const { toast } = useToast();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [isSessionDetailOpen, setIsSessionDetailOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadSize, setDownloadSize] = useState({ current: '0 MB', total: '0 MB' });
  const [downloadFiles, setDownloadFiles] = useState<{ name: string; status: 'pending' | 'processing' | 'completed' }[]>([]);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const handleViewSession = (session: Session) => {
    setSelectedSession(session);
    setIsSessionDetailOpen(true);
  };

  const handleDownloadSession = async (session: Session) => {
    setSelectedSession(session);
    await startDownload(session.sessionId);
  };

  const handleDeleteSession = (session: Session) => {
    setSelectedSession(session);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedSession) return;
    
    try {
      await apiRequest('DELETE', `/api/sessions/${selectedSession.sessionId}`);
      setIsDeleteModalOpen(false);
      
      // Invalidate sessions query to refresh the list
      queryClient.invalidateQueries({ queryKey: ['/api/sessions'] });
      
      toast({
        title: "Sesión eliminada",
        description: `La sesión ${selectedSession.name} ha sido eliminada correctamente.`,
      });
    } catch (error) {
      console.error('Error deleting session:', error);
      toast({
        title: "Error al eliminar la sesión",
        description: "Ha ocurrido un error al eliminar la sesión. Inténtelo de nuevo.",
        variant: "destructive",
      });
    }
  };

  const startDownload = async (sessionId: string) => {
    // Reset progress state
    setDownloadProgress(0);
    setDownloadSize({ current: '0 MB', total: '0 MB' });
    
    try {
      // Fetch files for this session
      const filesResponse = await apiRequest('GET', `/api/sessions/${sessionId}/files`);
      const files = await filesResponse.json();
      
      // Prepare files list for progress tracking
      const progressFiles = files.map((file: any) => ({
        name: file.fileName,
        status: 'pending' as const
      }));
      
      setDownloadFiles(progressFiles);
      setIsDownloadModalOpen(true);
      
      // Start download with progress tracking
      const response = await apiRequest('GET', `/api/sessions/${sessionId}/download`);
      
      if (!response.ok) {
        throw new Error('Download failed');
      }
      
      // Simulate progress updates - in a real app, you would get this from the server
      let progress = 0;
      const totalSize = '35.2 MB'; // This would come from the server
      
      const interval = setInterval(() => {
        progress += 5;
        const currentProgress = Math.min(progress, 100);
        setDownloadProgress(currentProgress);
        
        // Update file statuses
        if (progress <= 25) {
          updateFileStatus(0, 'completed');
        } else if (progress <= 50) {
          updateFileStatus(1, 'completed');
        } else if (progress <= 75) {
          updateFileStatus(2, 'completed');
        } else if (progress < 100) {
          updateFileStatus(3, 'completed');
        }
        
        // Update size display
        const currentSizeNum = Math.round((currentProgress / 100) * 35.2 * 10) / 10;
        setDownloadSize({
          current: `${currentSizeNum} MB`,
          total: totalSize
        });
        
        if (currentProgress >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            setIsDownloadModalOpen(false);
            
            // Start the actual download
            const downloadResponse = response;
            const blob = new Blob([downloadResponse.body!], { type: 'application/zip' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `session_${sessionId}.zip`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            
            toast({
              title: "Descarga completada",
              description: "Los archivos de la sesión se han descargado correctamente.",
            });
          }, 1000);
        }
      }, 300);
      
    } catch (error) {
      console.error('Error downloading session:', error);
      setIsDownloadModalOpen(false);
      toast({
        title: "Error en la descarga",
        description: "Ha ocurrido un error al descargar los archivos de la sesión.",
        variant: "destructive",
      });
    }
  };

  const updateFileStatus = (index: number, status: 'pending' | 'processing' | 'completed') => {
    setDownloadFiles(prev => {
      const newFiles = [...prev];
      if (newFiles[index]) {
        newFiles[index] = { ...newFiles[index], status };
        
        // Update next file to processing if this one is completed
        if (status === 'completed' && newFiles[index + 1]) {
          newFiles[index + 1] = { ...newFiles[index + 1], status: 'processing' };
        }
      }
      return newFiles;
    });
  };

  const handleNewSession = () => {
    toast({
      title: "Funcionalidad no implementada",
      description: "La creación de nuevas sesiones no está implementada en esta versión.",
    });
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar for desktop */}
      <Sidebar />
      
      {/* Mobile sidebar */}
      {isSidebarOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="fixed inset-0 bg-black opacity-50" onClick={toggleSidebar}></div>
          <div className="fixed inset-y-0 left-0 w-64 bg-white shadow-xl z-50">
            <Sidebar />
          </div>
        </div>
      )}
      
      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <Header toggleSidebar={toggleSidebar} handleNewSession={handleNewSession} />
        
        {/* Content Area */}
        <div className="flex-1 overflow-y-auto bg-neutral-100 p-4 md:p-6">
          <div className="space-y-6">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-2xl font-semibold">Panel de Control</h1>
                <p className="text-neutral-300">Gestiona tus sesiones y sensores</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <input type="text" placeholder="Buscar sesiones..." className="input-field pr-10" />
                  <span className="material-icons absolute right-3 top-2 text-neutral-300">search</span>
                </div>
                <button 
                  className="btn-primary flex items-center gap-2"
                  onClick={() => toast({
                    title: "Funcionalidad no implementada",
                    description: "Esta función está en desarrollo.",
                  })}
                >
                  <span className="material-icons">download</span>
                  <span>Descargar Todo</span>
                </button>
              </div>
            </div>

            {/* Stats Cards */}
            <StatsCards />

            {/* Sessions List */}
            <SessionsList 
              onViewSession={handleViewSession}
              onDownloadSession={handleDownloadSession}
              onDeleteSession={handleDeleteSession}
            />

            {/* Sensors List */}
            <SensorsList />
          </div>
        </div>
      </main>

      {/* Modals */}
      <SessionDetailModal 
        isOpen={isSessionDetailOpen}
        sessionId={selectedSession?.sessionId || null}
        onClose={() => setIsSessionDetailOpen(false)}
        onDownload={() => selectedSession && startDownload(selectedSession.sessionId)}
      />
      
      <DeleteConfirmModal 
        isOpen={isDeleteModalOpen}
        onConfirm={handleConfirmDelete}
        onCancel={() => setIsDeleteModalOpen(false)}
      />
      
      <DownloadProgressModal 
        isOpen={isDownloadModalOpen}
        onCancel={() => setIsDownloadModalOpen(false)}
        files={downloadFiles}
        progress={downloadProgress}
        totalSize={downloadSize.total}
        currentSize={downloadSize.current}
      />
    </div>
  );
};

export default Dashboard;
