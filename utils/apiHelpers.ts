
import { ListResponse } from '../types';
import { BillettoApiClient, BillettoApiError, BillettoErrorType, NotModifiedError } from '../services/billettoService';
import { pauseGlobalRequests } from '../services/requestLimiter';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export class CancellationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'CancellationError';
    }
}

// Helper to fetch all pages from a paginated API endpoint with retry logic and progress reporting
export const fetchAllPaginatedData = async <T extends { id: string }>(
    initialEndpoint: string,
    apiClient: BillettoApiClient,
    maxRetries = 5,
    onProgress?: (progress: number) => void,
    signal?: AbortSignal,
    onRateLimit?: (message: string) => void
): Promise<T[]> => {
    const allItems = new Map<string, T>(); // Use a Map to handle duplicates automatically
    const limit = 100; // Enforce max limit for all bulk fetches.

    // Ensure the initial endpoint has the limit parameter.
    let nextEndpoint: string | null;
    if (initialEndpoint.includes('?')) {
        nextEndpoint = initialEndpoint.includes('limit=') ? initialEndpoint : `${initialEndpoint}&limit=${limit}`;
    } else {
        nextEndpoint = `${initialEndpoint}?limit=${limit}`;
    }
    
    let retries = 0;
    let backoffTime = 2000; // Start with 2 seconds for backoff
    let totalItems = 0; // The total count from the first API response
    let isFirstPage = true;

    while (nextEndpoint) {
        if (signal?.aborted) {
            throw new CancellationError('Task was cancelled by the user.');
        }

        try {
            const response = await apiClient.fetchListEndpoint<T>(nextEndpoint, signal);
            
            if (totalItems === 0) { // On the first successful response, set the total
                totalItems = response.total;
            }

            response.data.forEach(item => allItems.set(item.id, item));
            
            if (response.has_more && response.next_url && (totalItems === 0 || allItems.size < totalItems)) {
                let url = response.next_url;
                try {
                    const parsedUrl = new URL(url, 'http://dummy.base');
                    let pathAndQuery = parsedUrl.pathname + parsedUrl.search;
                    const apiBasePath = '/api/v3/organiser';
                    if (pathAndQuery.startsWith(apiBasePath)) {
                        pathAndQuery = pathAndQuery.substring(apiBasePath.length);
                    }
                    url = pathAndQuery;
                } catch (e) {
                    console.error(`Could not parse next_url from API: "${url}". Halting pagination.`, e);
                    nextEndpoint = null;
                    continue;
                }
                
                if (!/[?&]limit=/.test(url)) {
                    url += (url.includes('?') ? '&' : '?') + `limit=${limit}`;
                }
                nextEndpoint = url;
            } else {
                nextEndpoint = null;
            }
            
            if (onProgress && totalItems > 0) {
                const progress = Math.min(Math.round((allItems.size / totalItems) * 100), 100);
                onProgress(progress);
            }

            retries = 0;
            backoffTime = 2000;
            isFirstPage = false;

        } catch (error) {
             if (isFirstPage && error instanceof NotModifiedError) {
                throw error;
            } else if (error instanceof NotModifiedError) {
                console.warn(`A subsequent page for ${initialEndpoint} returned 304. Pagination stopped prematurely. Data might be incomplete.`);
                nextEndpoint = null; 
                continue;
            }
            
            if (error instanceof BillettoApiError && error.type === BillettoErrorType.RATE_LIMIT && retries < maxRetries) {
                retries++;
                let waitTime = backoffTime;
                
                const message = (error.details as any)?.error?.message || error.message || '';
                const match = message.match(/try again in (\d+)\s*seconds/i);
                
                if (match && match[1]) {
                    const secondsToWait = parseInt(match[1], 10);
                    waitTime = secondsToWait * 1000 + 500;
                    const userMessage = `API rate limit reached. Pausing requests for ${secondsToWait} seconds...`;
                    console.warn(userMessage);
                    if (onRateLimit) onRateLimit(userMessage);

                } else {
                    const userMessage = `API rate limit hit. Retrying in ${Math.round(backoffTime / 1000)}s...`;
                    console.warn(`Rate limit hit on endpoint ${nextEndpoint}. Pausing all requests and backing off for ${waitTime}ms. (Attempt ${retries}/${maxRetries})`);
                    if (onRateLimit) onRateLimit(userMessage);
                    backoffTime *= 2;
                }

                pauseGlobalRequests(waitTime);
                await delay(50);
                
            } else {
                console.warn(`Failed to fetch endpoint ${nextEndpoint} after ${retries} retries. Halting pagination for this request.`, error);
                throw error;
            }
        }
    }
    return Array.from(allItems.values());
};
