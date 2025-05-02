import { useState, useEffect } from 'react';

export function useGlobalRecordingTime(isAnyRecording: boolean) {
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    // Obtener el tiempo de inicio del localStorage
    const getStartTime = () => {
      const storedTime = localStorage.getItem('recordingStartTime');
      return storedTime ? new Date(storedTime) : null;
    };

    // Actualizar el tiempo de inicio en localStorage
    const updateStartTime = (startTime: Date | null) => {
      if (startTime) {
        localStorage.setItem('recordingStartTime', startTime.toISOString());
      } else {
        localStorage.removeItem('recordingStartTime');
      }
    };

    let startTime = getStartTime();
    
    // Si hay grabación activa pero no hay tiempo guardado, inicializar
    if (isAnyRecording && !startTime) {
      startTime = new Date();
      updateStartTime(startTime);
    }
    // Si no hay grabación activa pero hay tiempo guardado, limpiar
    else if (!isAnyRecording && startTime) {
      startTime = null;
      updateStartTime(null);
      setElapsedTime(0);
    }

    // Función para actualizar el tiempo transcurrido
    const updateElapsedTime = () => {
      if (startTime) {
        const now = new Date();
        const elapsed = Math.floor((now.getTime() - startTime.getTime()) / 1000);
        setElapsedTime(elapsed);
      }
    };

    // Actualizar inmediatamente y configurar el intervalo
    if (startTime) {
      updateElapsedTime();
      const intervalId = setInterval(updateElapsedTime, 1000);
      return () => clearInterval(intervalId);
    }
  }, [isAnyRecording]);

  // Función para formatear el tiempo
  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return {
    elapsedTime,
    formattedTime: formatTime(elapsedTime)
  };
}
