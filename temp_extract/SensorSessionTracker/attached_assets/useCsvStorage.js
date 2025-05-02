// hooks/useCsvStorage.js
import { useState, useEffect } from 'react';

export function useCsvStorage(key) {
  const [storedData, setStoredData] = useState([]);
  
  // Load data when component mounts
  useEffect(() => {
    try {
      const storageData = localStorage.getItem(key);
      if (storageData) {
        setStoredData(JSON.parse(storageData));
      }
    } catch (error) {
      console.error(`Error reading CSV data from localStorage for key "${key}":`, error);
    }
  }, [key]);
  
  // Update localStorage when data changes
  const updateStoredData = (newData) => {
    try {
      setStoredData(newData);
      localStorage.setItem(key, JSON.stringify(newData));
    } catch (error) {
      console.error(`Error saving CSV data to localStorage for key "${key}":`, error);
    }
  };
  
  // Save CSV data
  const saveCsvData = (data, fileName) => {
    try {
      // Store the metadata about saved CSV
      const metadata = {
        fileName,
        savedAt: new Date().toISOString(),
        recordCount: data.length
      };
      
      // Store both metadata and data
      localStorage.setItem(`${key}_metadata`, JSON.stringify(metadata));
      localStorage.setItem(`${key}_data`, JSON.stringify(data));
      
      return true;
    } catch (error) {
      console.error(`Error saving CSV data:`, error);
      return false;
    }
  };
  
  // Check if a CSV file exists in storage
  const hasSavedCsv = () => {
    return localStorage.getItem(`${key}_metadata`) !== null;
  };
  
  // Get CSV metadata
  const getCsvMetadata = () => {
    try {
      const metadata = localStorage.getItem(`${key}_metadata`);
      return metadata ? JSON.parse(metadata) : null;
    } catch (error) {
      console.error(`Error reading CSV metadata:`, error);
      return null;
    }
  };
  
  // Load CSV data
  const loadCsvData = () => {
    try {
      const data = localStorage.getItem(`${key}_data`);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error(`Error loading CSV data:`, error);
      return null;
    }
  };
  
  return { 
    storedData, 
    updateStoredData, 
    saveCsvData, 
    hasSavedCsv, 
    getCsvMetadata, 
    loadCsvData 
  };
}