// components/ConfirmationModal.jsx
import React from "react";

const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, message, confirmText, cancelText }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-4 max-w-md w-full mx-4">
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <p className="text-sm text-gray-600 mb-4">{message}</p>
        
        <div className="flex justify-end space-x-2">
          <button
            className="px-3 py-1 border border-gray-300 rounded-md text-sm hover:bg-gray-100"
            onClick={onClose}
          >
            {cancelText || "Cancelar"}
          </button>
          <button
            className="px-3 py-1 bg-blue-500 text-white rounded-md text-sm hover:bg-blue-600"
            onClick={onConfirm}
          >
            {confirmText || "Confirmar"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;