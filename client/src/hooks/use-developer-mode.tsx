import { useState, useEffect } from 'react';
import { useLocalStorage } from './use-local-storage';

export function useDeveloperMode(): [boolean, () => void] {
  // Store developer mode status in localStorage
  const [isDeveloperMode, setIsDeveloperMode] = useLocalStorage('developer_mode', false);
  
  // Store key sequence for developer mode activation
  const [keySequence, setKeySequence] = useState<string[]>([]);
  
  // Function to toggle developer mode manually
  const toggleDeveloperMode = () => {
    setIsDeveloperMode(!isDeveloperMode);
  };
  
  useEffect(() => {
    // Listen for key presses to detect developer mode activation sequence
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'D' || event.key === 'd') {
        // Add key to sequence
        const newSequence = [...keySequence, event.key];
        
        // Keep only the last 5 keys
        const limitedSequence = newSequence.slice(Math.max(0, newSequence.length - 5));
        setKeySequence(limitedSequence);
        
        // Check if we have 5 'D' keys in a row
        if (limitedSequence.length === 5 && limitedSequence.every(key => key === 'D' || key === 'd')) {
          // Toggle developer mode
          toggleDeveloperMode();
          // Reset sequence
          setKeySequence([]);
        }
      } else {
        // Reset sequence for any other key
        setKeySequence([]);
      }
    };
    
    // Add event listener
    window.addEventListener('keydown', handleKeyDown);
    
    // Clean up
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [keySequence, isDeveloperMode]);
  
  return [isDeveloperMode, toggleDeveloperMode];
}