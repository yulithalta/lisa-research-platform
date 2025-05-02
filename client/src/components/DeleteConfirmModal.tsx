import React from 'react';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({ 
  isOpen, 
  onConfirm, 
  onCancel 
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-md p-6">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-error/20 flex items-center justify-center text-error mx-auto">
            <span className="material-icons text-3xl">warning</span>
          </div>
          <h2 className="text-xl font-semibold mt-4">¿Eliminar esta sesión?</h2>
          <p className="text-neutral-300 mt-2">
            Esta acción eliminará permanentemente todos los datos, grabaciones y archivos asociados a esta sesión. Esta acción no se puede deshacer.
          </p>
        </div>
        <div className="flex justify-center gap-3 mt-6">
          <button 
            className="btn-outline" 
            onClick={onCancel}
          >
            Cancelar
          </button>
          <button 
            className="bg-error text-white font-medium py-2 px-4 rounded-md hover:bg-error/90 transition-colors flex items-center gap-2" 
            onClick={onConfirm}
          >
            <span className="material-icons">delete</span>
            <span>Eliminar</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmModal;
