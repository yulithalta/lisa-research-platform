import React from 'react';
import { useLocation } from 'wouter';

const Sidebar: React.FC = () => {
  const [location, setLocation] = useLocation();
  
  const menuItems = [
    { icon: 'dashboard', text: 'Dashboard', path: '/' },
    { icon: 'sensors', text: 'Sensores', path: '/sensors' },
    { icon: 'meeting_room', text: 'Sesiones', path: '/sessions' },
    { icon: 'videocam', text: 'Grabaciones', path: '/recordings' },
    { icon: 'settings', text: 'Configuración', path: '/settings' },
  ];

  return (
    <aside className="w-64 bg-white shadow-md flex-shrink-0 hidden md:block h-full flex flex-col">
      <div className="flex items-center justify-center h-16 border-b">
        <h1 className="text-xl font-semibold text-primary">Sensor Tracker</h1>
      </div>
      <nav className="py-4 flex-1">
        <ul className="space-y-1 px-2">
          {menuItems.map((item) => (
            <li key={item.path}>
              <a 
                href={item.path}
                className={`sidebar-item ${location === item.path ? 'active' : ''}`}
                onClick={(e) => {
                  e.preventDefault();
                  setLocation(item.path);
                }}
              >
                <span className="material-icons">{item.icon}</span>
                <span>{item.text}</span>
              </a>
            </li>
          ))}
        </ul>
      </nav>
      <div className="p-4 border-t">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary-light flex items-center justify-center text-white">
            <span className="material-icons">person</span>
          </div>
          <div>
            <p className="text-sm font-medium">Administrador</p>
            <p className="text-xs text-neutral-300">admin@sesiones.es</p>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
