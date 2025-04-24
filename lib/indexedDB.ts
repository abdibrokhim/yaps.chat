'use client'

import { logger } from '@/lib/logger';

// Database configuration
const DB_NAME = 'yapsChat';
const DB_VERSION = 1;

// Store names
const STORES: Record<string, string> = {
  SETTINGS: 'settings',
  USER: 'user',
  VERSIONS: 'versions',
};

// Define database schema and types
type StoreSchema = {
  [STORES.SETTINGS]: {
    key: string;
    value: any;
  };
  [STORES.USER]: {
    key: string;
    value: any;
  };
  [STORES.VERSIONS]: {
    key: string;
    value: string;
  };
};

// Function to initialize the database
const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (!indexedDB) {
      reject(new Error('IndexedDB is not supported in this browser'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => {
      logger.error('IndexedDB', 'Failed to open database', event);
      reject(new Error('Failed to open IndexedDB'));
    };

    request.onsuccess = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      logger.info('IndexedDB', 'Database opened successfully');
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      logger.info('IndexedDB', 'Database upgrade needed');

      // Create object stores if they don't exist
      if (!db.objectStoreNames.contains(STORES.SETTINGS)) {
        db.createObjectStore(STORES.SETTINGS, { keyPath: 'key' });
        logger.info('IndexedDB', `Created ${STORES.SETTINGS} store`);
      }

      if (!db.objectStoreNames.contains(STORES.USER)) {
        db.createObjectStore(STORES.USER, { keyPath: 'key' });
        logger.info('IndexedDB', `Created ${STORES.USER} store`);
      }

      if (!db.objectStoreNames.contains(STORES.VERSIONS)) {
        db.createObjectStore(STORES.VERSIONS, { keyPath: 'key' });
        logger.info('IndexedDB', `Created ${STORES.VERSIONS} store`);
      }
    };
  });
};

// Generic function to get an item from a store
const getItem = async <T>(storeName: keyof StoreSchema, key: string): Promise<T | null> => {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName as string, 'readonly');
      const store = transaction.objectStore(storeName as string);
      const request = store.get(key);

      request.onsuccess = (event) => {
        const result = (event.target as IDBRequest).result;
        resolve(result ? result.value : null);
      };

      request.onerror = (event) => {
        logger.error('IndexedDB', `Error getting item ${key} from ${storeName}`, event);
        reject(new Error(`Failed to get item ${key} from IndexedDB`));
      };

      transaction.oncomplete = () => {
        db.close();
      };
    });
  } catch (error) {
    logger.error('IndexedDB', `Failed to get item ${key}`, error);
    return null;
  }
};

// Generic function to set an item in a store
const setItem = async <T>(storeName: keyof StoreSchema, key: string, value: T): Promise<void> => {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName as string, 'readwrite');
      const store = transaction.objectStore(storeName as string);
      const request = store.put({ key, value });

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = (event) => {
        logger.error('IndexedDB', `Error setting item ${key} in ${storeName}`, event);
        reject(new Error(`Failed to set item ${key} in IndexedDB`));
      };

      transaction.oncomplete = () => {
        db.close();
      };
    });
  } catch (error) {
    logger.error('IndexedDB', `Failed to set item ${key}`, error);
    throw error;
  }
};

// Generic function to remove an item from a store
const removeItem = async (storeName: keyof StoreSchema, key: string): Promise<void> => {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName as string, 'readwrite');
      const store = transaction.objectStore(storeName as string);
      const request = store.delete(key);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = (event) => {
        logger.error('IndexedDB', `Error removing item ${key} from ${storeName}`, event);
        reject(new Error(`Failed to remove item ${key} from IndexedDB`));
      };

      transaction.oncomplete = () => {
        db.close();
      };
    });
  } catch (error) {
    logger.error('IndexedDB', `Failed to remove item ${key}`, error);
    throw error;
  }
};

// Function to check if IndexedDB is supported
const isSupported = (): boolean => {
  return typeof window !== 'undefined' && !!window.indexedDB;
};

// Utility functions for specific stores
const userUtils = {
  getUserId: async (): Promise<string | null> => {
    return getItem<string>(STORES.USER, 'userId');
  },
  setUserId: async (userId: string): Promise<void> => {
    return setItem(STORES.USER, 'userId', userId);
  },
  getUsername: async (): Promise<string | null> => {
    return getItem<string>(STORES.USER, 'username');
  },
  setUsername: async (username: string): Promise<void> => {
    return setItem(STORES.USER, 'username', username);
  },
};

const settingsUtils = {
  getSoundEnabled: async (): Promise<boolean> => {
    const result = await getItem<boolean>(STORES.SETTINGS, 'soundEnabled');
    return result === null ? true : result; // Default to true if not set
  },
  setSoundEnabled: async (enabled: boolean): Promise<void> => {
    return setItem(STORES.SETTINGS, 'soundEnabled', enabled);
  },
};

const versionUtils = {
  getAppVersion: async (): Promise<string | null> => {
    return getItem<string>(STORES.VERSIONS, 'app_version');
  },
  setAppVersion: async (version: string): Promise<void> => {
    return setItem(STORES.VERSIONS, 'app_version', version);
  },
  checkVersion: async (currentVersion: string): Promise<boolean> => {
    const storedVersion = await getItem<string>(STORES.VERSIONS, 'app_version');
    // Only return true if we have both versions and they don't match
    return !!storedVersion && storedVersion !== currentVersion;
  },
};

// Migration functions
const migrateFromLocalStorage = async (): Promise<void> => {
  if (typeof window === 'undefined') return;

  try {
    logger.info('IndexedDB', 'Starting migration from localStorage');

    // Migrate user data
    const userId = localStorage.getItem('userId');
    if (userId) {
      await userUtils.setUserId(userId);
      logger.info('IndexedDB', 'Migrated userId from localStorage');
    }

    const username = localStorage.getItem('username');
    if (username) {
      await userUtils.setUsername(username);
      logger.info('IndexedDB', 'Migrated username from localStorage');
    }

    // Migrate settings
    const soundEnabled = localStorage.getItem('soundEnabled');
    if (soundEnabled !== null) {
      await settingsUtils.setSoundEnabled(soundEnabled === 'true');
      logger.info('IndexedDB', 'Migrated soundEnabled from localStorage');
    }

    // Migrate version
    const appVersion = localStorage.getItem('app_version');
    if (appVersion) {
      await versionUtils.setAppVersion(JSON.parse(appVersion));
      logger.info('IndexedDB', 'Migrated app_version from localStorage');
    }

    logger.info('IndexedDB', 'Migration from localStorage completed');
  } catch (error) {
    logger.error('IndexedDB', 'Failed to migrate from localStorage', error);
  }
};

// Export the IndexedDB API
export const db = {
  init: initDB,
  isSupported,
  getItem,
  setItem,
  removeItem,
  user: userUtils,
  settings: settingsUtils,
  version: versionUtils,
  migrate: {
    fromLocalStorage: migrateFromLocalStorage,
  },
}; 