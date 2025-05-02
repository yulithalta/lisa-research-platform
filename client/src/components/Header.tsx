import React from 'react';
import { Button } from '@/components/ui/button';

interface HeaderProps {
  toggleSidebar: () => void;
  handleNewSession: () => void;
}

const Header: React.FC<HeaderProps> = ({ toggleSidebar, handleNewSession }) => {
  return (
    <header className="bg-white border-b h-16 flex items-center justify-between px-4 md:px-6">
      <button 
        className="md:hidden text-neutral-400 hover:text-neutral-600"
        onClick={toggleSidebar}
      >
        <span className="material-icons">menu</span>
      </button>
      <div className="flex items-center gap-4">
        <button className="btn-outline flex items-center gap-2" onClick={handleNewSession}>
          <span className="material-icons">add</span>
          <span>Nueva Sesión</span>
        </button>
        <div className="relative">
          <button className="rounded-full w-10 h-10 bg-neutral-100 flex items-center justify-center">
            <span className="material-icons">notifications</span>
          </button>
          <span className="absolute top-0 right-0 w-4 h-4 bg-error rounded-full text-white text-xs flex items-center justify-center">
            2
          </span>
        </div>
      </div>
    </header>
  );
};

export default Header;
