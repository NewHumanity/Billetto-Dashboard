
import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useEvents } from '../../hooks/useEvents';
import { BillettoApiClient } from '../../services/billettoService';
import { createWrapper } from '../test-utils';
import { BillettoEvent } from '../../types';

describe('useEvents', () => {
    // Mock the API Client
    const mockApiClient = {
        fetchListEndpoint: vi.fn(),
    } as unknown as BillettoApiClient;

    const mockAddToast = vi.fn();

    const mockEventData: BillettoEvent = {
        id: 'evt_1',
        object: 'event',
        name: 'Test Event 1',
        state: 'published',
        starts_at: '2024-01-01T12:00:00Z',
        ends_at: '2024-01-01T14:00:00Z',
        currency: 'EUR',
        public_url: 'http://test.url',
        kind: 'regular',
        online_event: false,
        total_capacity: 100
    };

    it('should fetch and return events', async () => {
        // Mock implementation of fetchListEndpoint
        (mockApiClient.fetchListEndpoint as any).mockResolvedValue({
            object: 'list',
            data: [mockEventData],
            has_more: false,
            total: 1,
            url: '/events'
        });

        const { result } = renderHook(() => useEvents(mockApiClient, mockAddToast), {
            wrapper: createWrapper(),
        });

        // Initially loading
        expect(result.current.loadingEvents).toBe(true);
        expect(result.current.events).toEqual([]);

        // Wait for the query to resolve
        await waitFor(() => expect(result.current.loadingEvents).toBe(false));

        // Verify data
        expect(result.current.events).toHaveLength(1);
        expect(result.current.events[0].name).toBe('Test Event 1');
        expect(result.current.eventsError).toBeNull();
    });

    it('should handle API errors', async () => {
        // Mock failure
        (mockApiClient.fetchListEndpoint as any).mockRejectedValue(new Error('API Failure'));

        const { result } = renderHook(() => useEvents(mockApiClient, mockAddToast), {
            wrapper: createWrapper(),
        });

        await waitFor(() => expect(result.current.loadingEvents).toBe(false));

        expect(result.current.events).toEqual([]);
        // Note: useEvents exposes `eventsError` which comes from `useQuery`.
        // However, fetchAllPaginatedData might throw, which useQuery catches.
        // We need to ensure error state is reflected.
        expect(result.current.eventsError).toBe('API Failure');
    });

    it('should not fetch if apiClient is null', async () => {
        const { result } = renderHook(() => useEvents(null, mockAddToast), {
            wrapper: createWrapper(),
        });

        expect(result.current.loadingEvents).toBe(false); // isPending is true if enabled, but with enabled: false, status is 'idle' which tanstack calls pending but fetchStatus is idle.
        // Actually, TanStack Query v5 `isPending` is true for initial load if no data.
        // But since `enabled: !!apiClient` is false, it won't fetch.
        // Let's verify events is empty.
        expect(result.current.events).toEqual([]);
        expect(mockApiClient.fetchListEndpoint).not.toHaveBeenCalled();
    });
});
