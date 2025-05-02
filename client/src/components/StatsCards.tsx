import React from 'react';
import { useQuery } from '@tanstack/react-query';

interface StatCardProps {
  icon: string;
  iconBgClass: string;
  iconTextClass: string;
  title: string;
  value: string | number;
}

const StatCard: React.FC<StatCardProps> = ({ 
  icon, 
  iconBgClass, 
  iconTextClass, 
  title, 
  value 
}) => {
  return (
    <div className="card flex items-center gap-4">
      <div className={`w-12 h-12 rounded-full ${iconBgClass} flex items-center justify-center ${iconTextClass}`}>
        <span className="material-icons">{icon}</span>
      </div>
      <div>
        <p className="text-sm text-neutral-300">{title}</p>
        <p className="text-2xl font-semibold">{value}</p>
      </div>
    </div>
  );
};

const StatsCards: React.FC = () => {
  const { data: stats, isLoading } = useQuery({ 
    queryKey: ['/api/stats'], 
    staleTime: 60000, // 1 minute
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, index) => (
          <div key={index} className="card h-24 animate-pulse bg-gray-200"></div>
        ))}
      </div>
    );
  }

  // Default stats in case the API doesn't return data
  const defaultStats = {
    activeSessions: 5,
    connectedSensors: 12,
    recordings: 32,
    storage: "64.2 GB"
  };

  const statsData = stats || defaultStats;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        icon="meeting_room"
        iconBgClass="bg-primary-light/20"
        iconTextClass="text-primary"
        title="Sesiones Activas"
        value={statsData.activeSessions}
      />
      <StatCard
        icon="sensors"
        iconBgClass="bg-secondary-light/20"
        iconTextClass="text-secondary"
        title="Sensores Conectados"
        value={statsData.connectedSensors}
      />
      <StatCard
        icon="videocam"
        iconBgClass="bg-success/20"
        iconTextClass="text-success"
        title="Grabaciones"
        value={statsData.recordings}
      />
      <StatCard
        icon="storage"
        iconBgClass="bg-warning/20"
        iconTextClass="text-warning"
        title="Almacenamiento"
        value={statsData.storage}
      />
    </div>
  );
};

export default StatsCards;
