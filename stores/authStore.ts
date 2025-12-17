import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  apiKey: string;
  useProxy: boolean;
  setCredentials: (apiKey: string, useProxy: boolean) => void;
  clearCredentials: () => void;
}

// Helper to migrate legacy local storage keys to Zustand persistence
const getInitialState = () => {
    const legacyKey = localStorage.getItem('billettoApiKey');
    const legacyProxy = localStorage.getItem('billettoUseProxy');
    
    // Default values if no legacy data found
    let initialKey = '';
    let initialProxy = true;

    if (legacyKey) {
        initialKey = legacyKey;
    }
    if (legacyProxy !== null) {
        try {
            initialProxy = JSON.parse(legacyProxy);
        } catch (e) {
            // ignore parse error
        }
    }

    return {
        apiKey: initialKey,
        useProxy: initialProxy
    };
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      ...getInitialState(), // Initialize with legacy data if available (persist will overwrite if store exists)
      
      setCredentials: (apiKey, useProxy) => {
          // Clean up legacy keys to avoid confusion
          localStorage.removeItem('billettoApiKey');
          localStorage.removeItem('billettoUseProxy');
          set({ apiKey, useProxy });
      },
      
      clearCredentials: () => {
          localStorage.removeItem('billettoApiKey');
          localStorage.removeItem('billettoUseProxy');
          set({ apiKey: '', useProxy: true });
      },
    }),
    {
      name: 'billetto-auth-storage',
    }
  )
);
