
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BillettoApiClient, BillettoApiError, BillettoErrorType } from '../../services/billettoService';

describe('BillettoApiClient', () => {
    let client: BillettoApiClient;
    const mockApiKey = 'test_key:secret';

    beforeEach(() => {
        client = new BillettoApiClient(mockApiKey, false);
        // Mock global fetch
        globalThis.fetch = vi.fn();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should throw AUTHENTICATION_ERROR on 401', async () => {
        (globalThis.fetch as any).mockResolvedValue({
            ok: false,
            status: 401,
            statusText: 'Unauthorized',
            json: async () => ({ error: { message: 'Invalid API key' } })
        });

        await expect(client.getEvents()).rejects.toThrow('Authentication failed');
        await expect(client.getEvents()).rejects.toMatchObject({ type: BillettoErrorType.AUTHENTICATION });
    });

    it('should throw RATE_LIMIT_ERROR on 429', async () => {
        (globalThis.fetch as any).mockResolvedValue({
            ok: false,
            status: 429,
            statusText: 'Too Many Requests',
            json: async () => ({ error: { message: 'Rate limit exceeded' } })
        });

        await expect(client.getEvents()).rejects.toThrow('Rate limit exceeded');
        await expect(client.getEvents()).rejects.toMatchObject({ type: BillettoErrorType.RATE_LIMIT });
    });

    it('should default to UNKNOWN_ERROR on other status codes', async () => {
        (globalThis.fetch as any).mockResolvedValue({
            ok: false,
            status: 500,
            statusText: 'Internal Server Error',
            json: async () => ({})
        });

        await expect(client.getEvents()).rejects.toThrow('HTTP 500: Internal Server Error');
        await expect(client.getEvents()).rejects.toMatchObject({ type: BillettoErrorType.UNKNOWN });
    });
});
