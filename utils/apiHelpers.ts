
import { ListResponse } from '../types';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper to fetch all pages from a paginated API endpoint
export const fetchAllPaginatedData = async <T,>(fetchFunction: (page: number) => Promise<ListResponse<T>>): Promise<T[]> => {
    let allItems: T[] = [];
    let currentPage = 1;
    let hasMore = true;

    while (hasMore) {
        try {
            const response = await fetchFunction(currentPage);
            allItems = allItems.concat(response.data);
            hasMore = response.has_more;
            currentPage++;
            // Add a small delay between requests to be polite to the API and proxy, avoiding rate-limiting errors.
            if (hasMore) {
                await delay(250);
            }
        } catch (error) {
            console.error(`Error fetching page ${currentPage}:`, error);
            hasMore = false; // Stop pagination on error
        }
    }
    return allItems;
};