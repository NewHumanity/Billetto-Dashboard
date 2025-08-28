import { ListResponse } from '../types';
import { BillettoApiClient, BillettoApiError, BillettoErrorType } from '../services/billettoService';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper to fetch all pages from a paginated API endpoint with retry logic and progress reporting
export const fetchAllPaginatedData = async <T>(
    initialEndpoint: string,
    apiClient: BillettoApiClient,
    maxRetries = 5,
    onProgress?: (progress: number) => void
): Promise<T[]> => {
    let allItems: T[] = [];
    const limit = 100; // Enforce max limit for all bulk fetches.

    // Ensure the initial endpoint has the limit parameter.
    let nextEndpoint: string | null;
    if (initialEndpoint.includes('?')) {
        nextEndpoint = initialEndpoint.includes('limit=') ? initialEndpoint : `${initialEndpoint}&limit=${limit}`;
    } else {
        nextEndpoint = `${initialEndpoint}?limit=${limit}`;
    }
    
    let retries = 0;
    let backoffTime = 1000; // Start with 1 second for backoff
    let totalItems = 0;

    while (nextEndpoint) {
        try {
            // Use the new generic method on the client to fetch an arbitrary list endpoint
            const response = await apiClient.fetchListEndpoint<T>(nextEndpoint);
            
            if (allItems.length === 0) { // On the first successful response
                totalItems = response.total;
            }

            allItems = allItems.concat(response.data);
            
            if (response.has_more && response.next_url) {
                let url = response.next_url;
                // If the next_url provided by the API doesn't include a limit, add it.
                // This handles the case for `after=` pagination which might omit the limit.
                if (!/[?&]limit=/.test(url)) {
                    url += `&limit=${limit}`;
                }
                nextEndpoint = url;
            } else {
                nextEndpoint = null;
            }
            
            if (onProgress && totalItems > 0) {
                const progress = Math.min(Math.round((allItems.length / totalItems) * 100), 100);
                onProgress(progress);
            }

            // Success for this page, so reset retry logic
            retries = 0;
            backoffTime = 1000;

            // Add a conservative delay between successful requests to prevent rate limiting.
            if (nextEndpoint) {
                await delay(750);
            }
        } catch (error) {
            if (error instanceof BillettoApiError && error.type === BillettoErrorType.RATE_LIMIT && retries < maxRetries) {
                retries++;
                let waitTime = backoffTime;
                
                // New logic to parse wait time from error message
                const message = (error.details as any)?.error?.message || error.message || '';
                const match = message.match(/try again in (\d+)\s*seconds/i);
                
                if (match && match[1]) {
                    const secondsToWait = parseInt(match[1], 10);
                    waitTime = secondsToWait * 1000 + 500; // Add 500ms buffer
                    console.warn(`Rate limit hit. API requested a wait of ${secondsToWait} seconds. Retrying in ${waitTime}ms...`);
                } else {
                    console.warn(`Rate limit hit on endpoint ${nextEndpoint}. Retrying in ${waitTime}ms... (Attempt ${retries}/${maxRetries})`);
                    backoffTime *= 2; // Only use exponential backoff if API doesn't specify time
                }

                await delay(waitTime);
                // Do not change nextEndpoint, the loop will retry the same one.
            } else {
                // For other errors, or if max retries are exceeded, log the error and stop pagination.
                console.error(`Failed to fetch endpoint ${nextEndpoint} after ${retries} retries. Halting pagination for this request.`, error);
                throw error; // Re-throw the error so the calling function knows about the failure.
            }
        }
    }
    return allItems;
};