import { useState, useEffect } from 'react';

/**
 * Hook personalizado para persistir datos en localStorage
 * @param {string} key - Clave para guardar/recuperar del localStorage
 * @param {any} initialValue - Valor inicial si no hay nada guardado
 * @returns {Array} - [storedValue, setStoredValue]
 */
export function useLocalStorage(key, initialValue) {
  // Estado para almacenar nuestro valor
  const [storedValue, setStoredValue] = useState(() => {
    try {
      // Obtener del localStorage por clave
      const item = window.localStorage.getItem(key);
      // Analizar JSON almacenado o devolver initialValue
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  // Hook useEffect para actualizar localStorage cuando el estado cambia
  useEffect(() => {
    try {
      // Guardar el estado
      window.localStorage.setItem(key, JSON.stringify(storedValue));
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  }, [key, storedValue]);

  return [storedValue, setStoredValue];
}