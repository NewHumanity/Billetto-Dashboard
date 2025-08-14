
import { ListResponse } from '../types';
import { BillettoApiError, BillettoErrorType } from '../services/billettoService';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper to fetch all pages from a paginated API endpoint with retry logic for rate limiting
export const fetchAllPaginatedData = async <T>(
    fetchFunction: (page: number) => Promise<ListResponse<T>>,
    maxRetries = 5
): Promise<T[]> => {
    let allItems: T[] = [];
    let currentPage = 1;
    let hasMore = true;
    let retries = 0;
    let backoffTime = 1000; // Start with 1 second for backoff

    while (hasMore) {
        try {
            const response = await fetchFunction(currentPage);
            allItems = allItems.concat(response.data);
            hasMore = response.has_more;
            
            // Success for this page, so reset retry logic and move to next page
            currentPage++;
            retries = 0;
            backoffTime = 1000;

            // Add a conservative delay between successful requests to prevent rate limiting.
            if (hasMore) {
                await delay(400); // Increased base delay
            }
        } catch (error) {
            if (error instanceof BillettoApiError && error.type === BillettoErrorType.RATE_LIMIT && retries < maxRetries) {
                retries++;
                console.warn(`Rate limit hit on page ${currentPage}. Retrying in ${backoffTime}ms... (Attempt ${retries}/${maxRetries})`);
                await delay(backoffTime);
                backoffTime *= 2; // Exponentially increase backoff time for next retry
                // Do not increment currentPage, the loop will retry the same page.
            } else {
                // For other errors, or if max retries are exceeded, log the error and stop pagination.
                console.error(`Failed to fetch page ${currentPage} after ${retries} retries. Halting pagination for this request.`, error);
                hasMore = false;
            }
        }
    }
    return allItems;
};