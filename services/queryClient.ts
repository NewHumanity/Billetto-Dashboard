
import { QueryClient } from '@tanstack/react-query';
import { Persister } from '@tanstack/react-query-persist-client';
import { openDB } from 'idb';

const DB_NAME = 'billetto-query-cache';
const STORE_NAME = 'queries';

// Initialize the Query Client with conservative defaults suitable for data that doesn't change every second
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes (data is considered fresh for 5 mins)
      gcTime: 1000 * 60 * 60 * 24, // 24 hours (data remains in cache for 24h)
      refetchOnWindowFocus: false, // Don't refetch automatically on window focus to save API calls
      retry: 2,
    },
  },
});

// Custom IDB Persister for TanStack Query
export const idbPersister: Persister = {
  persistClient: async (client) => {
    const db = await openDB(DB_NAME, 1, {
      upgrade(db) {
        db.createObjectStore(STORE_NAME);
      },
    });
    await db.put(STORE_NAME, client, 'react-query-client');
  },
  restoreClient: async () => {
    const db = await openDB(DB_NAME, 1, {
        upgrade(db) {
          db.createObjectStore(STORE_NAME);
        },
    });
    return await db.get(STORE_NAME, 'react-query-client');
  },
  removeClient: async () => {
    const db = await openDB(DB_NAME, 1);
    await db.delete(STORE_NAME, 'react-query-client');
  },
};

// Helper to manually clear the persisted cache (e.g. on logout)
export const clearPersistedQueryCache = async () => {
    await idbPersister.removeClient();
};
