
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

export const createTestQueryClient = () => new QueryClient({
    defaultOptions: {
        queries: {
            retry: false, // Turn off retries for testing
            gcTime: 0, // Disable garbage collection
            staleTime: 0,
        },
    },
});

export const createWrapper = () => {
    const queryClient = createTestQueryClient();
    return ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
};
