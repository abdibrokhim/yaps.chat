'use client'

import { useState, useEffect, useCallback } from 'react';
import { db } from '@/lib/indexedDB';

// Function to safely access storage (avoid SSR issues)
const isBrowser = typeof window !== 'undefined';

// Updated hook to use IndexedDB with the same interface
export function useLocalStorage<T>(
  key: string, 
  initialValue: T,
  storeName: 'settings' | 'user' | 'versions' = 'settings'
): [T, (value: T) => void] {
  // Initialize state with a function to avoid unnecessary calculations during SSR
  const [storedValue, setStoredValue] = useState<T>(initialValue);
  const [isInitialized, setIsInitialized] = useState(false);

  // Fetch initial value from IndexedDB
  useEffect(() => {
    const fetchValue = async () => {
      if (!isBrowser) return;
      
      try {
        const value = await db.getItem<T>(storeName, key);
        if (value !== null) {
          setStoredValue(value);
        }
        setIsInitialized(true);
      } catch (error) {
        console.error('Error reading from IndexedDB:', error);
        setIsInitialized(true);
      }
    };

    fetchValue();
  }, [key, storeName]);

  // Memoize the setValue function to avoid recreating it on every render
  const setValue = useCallback(async (value: T) => {
    try {
      // Allow value to be a function so we have same API as useState
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      
      // Save state
      setStoredValue(valueToStore);
      
      // Save to IndexedDB
      if (isBrowser) {
        await db.setItem(storeName, key, valueToStore);
      }
    } catch (error) {
      console.error('Error setting IndexedDB item:', error);
    }
  }, [key, storeName, storedValue]);

  return [storedValue, setValue];
}

// Helper functions for direct IndexedDB access without React state
export const localStorageUtils = {
  getItem: async <T>(key: string, defaultValue: T, storeName: 'settings' | 'user' | 'versions' = 'settings'): Promise<T> => {
    if (!isBrowser) return defaultValue;
    try {
      const item = await db.getItem<T>(storeName, key);
      return item !== null ? item : defaultValue;
    } catch (error) {
      console.error('Error getting IndexedDB item:', error);
      return defaultValue;
    }
  },
  
  setItem: async <T>(key: string, value: T, storeName: 'settings' | 'user' | 'versions' = 'settings'): Promise<void> => {
    if (!isBrowser) return;
    try {
      await db.setItem(storeName, key, value);
    } catch (error) {
      console.error('Error setting IndexedDB item:', error);
    }
  },
  
  removeItem: async (key: string, storeName: 'settings' | 'user' | 'versions' = 'settings'): Promise<void> => {
    if (!isBrowser) return;
    try {
      await db.removeItem(storeName, key);
    } catch (error) {
      console.error('Error removing IndexedDB item:', error);
    }
  },
  
  // Helper specifically for version checking using IndexedDB
  checkVersion: async (currentVersion: string): Promise<boolean> => {
    if (!isBrowser) return false;
    try {
      return await db.version.checkVersion(currentVersion);
    } catch (error) {
      console.error('Error checking version:', error);
      return false;
    }
  }
};

// Version-specific hook with better hydration handling
export function useAppVersion(currentVersion: string) {
  // Use a function to initialize state to avoid SSR issues
  const [needsRefresh, setNeedsRefresh] = useState<boolean>(false);
  const [storedVersion, setStoredVersion] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Initial load of version from IndexedDB
  useEffect(() => {
    const loadVersion = async () => {
      if (!isBrowser) return;
      
      try {
        const version = await db.version.getAppVersion();
        setStoredVersion(version);
        
        // Check if version is different and needs refresh
        if (version && version !== currentVersion) {
          setNeedsRefresh(true);
        } else if (!version) {
          // First time user, set the current version
          await db.version.setAppVersion(currentVersion);
          setStoredVersion(currentVersion);
        }
        
        setIsInitialized(true);
      } catch (error) {
        console.error('Error loading app version:', error);
        setIsInitialized(true);
      }
    };
    
    loadVersion();
  }, [currentVersion]);

  // Update version in IndexedDB
  const updateVersion = useCallback(async () => {
    if (!isBrowser) return;
    
    try {
      await db.version.setAppVersion(currentVersion);
      setStoredVersion(currentVersion);
      setNeedsRefresh(false);
      console.log('Version updated! You\'re using version:', currentVersion);
    } catch (error) {
      console.error('Error updating version:', error);
    }
  }, [currentVersion]);

  return { storedVersion, needsRefresh, updateVersion, isInitialized };
}

// Initialize database and migrate data when module is imported
if (isBrowser) {
  // Initialize DB
  db.init().catch((error) => {
    console.error('Failed to initialize IndexedDB:', error);
  });
  
  // Migrate data from localStorage (runs only once)
  db.migrate.fromLocalStorage().catch((error) => {
    console.error('Failed to migrate from localStorage:', error);
  });
} 