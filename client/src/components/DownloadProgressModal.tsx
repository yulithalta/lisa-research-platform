import React, { useEffect, useState } from 'react';

interface ProgressFile {
  name: string;
  status: 'pending' | 'processing' | 'completed';
}

interface DownloadProgressModalProps {
  isOpen: boolean;
  onCancel: () => void;
  files: ProgressFile[];
  progress: number;
  totalSize: string;
  currentSize: string;
}

const DownloadProgressModal: React.FC<DownloadProgressModalProps> = ({ 
  isOpen, 
  onCancel, 
  files, 
  progress, 
  totalSize, 
  currentSize 
}) => {
  if (!isOpen) return null;

  const getFileStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <span className="material-icons text-success text-sm">check_circle</span>;
      case 'processing':
        return <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>;
      default:
        return <span className="material-icons text-sm">pending</span>;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-md p-6">
        <h2 className="text-xl font-semibold">Descargando archivos</h2>
        <p className="text-neutral-300 mt-2">Preparando los archivos para la descarga. Por favor, espere...</p>
        
        <div className="mt-4">
          <div className="w-full bg-neutral-100 rounded-full h-2.5">
            <div 
              className="bg-primary h-2.5 rounded-full" 
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <div className="flex justify-between mt-2">
            <span className="text-sm text-neutral-300">{progress}%</span>
            <span className="text-sm text-neutral-300">{currentSize} / {totalSize}</span>
          </div>
        </div>
        
        <div className="mt-4">
          <p className="text-sm font-medium">Procesando archivos:</p>
          <ul className="mt-2 space-y-2 text-sm">
            {files.map((file, index) => (
              <li key={index} className="flex items-center gap-2">
                {getFileStatusIcon(file.status)}
                <span className={file.status === 'pending' ? 'text-neutral-300' : ''}>{file.name}</span>
              </li>
            ))}
          </ul>
        </div>
        
        <div className="flex justify-end mt-6">
          <button 
            className="btn-outline"
            onClick={onCancel}
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};

export default DownloadProgressModal;
