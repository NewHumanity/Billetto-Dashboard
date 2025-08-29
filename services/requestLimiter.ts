// A simple queue to process promises sequentially.
class PromiseQueue {
    private queue: (() => Promise<any>)[] = [];
    private pendingPromise = false;

    enqueue<T>(promiseFn: () => Promise<T>): Promise<T> {
        return new Promise((resolve, reject) => {
            this.queue.push(() => promiseFn().then(resolve).catch(reject));
            this.dequeue();
        });
    }

    private async dequeue() {
        if (this.pendingPromise || this.queue.length === 0) {
            return;
        }

        if (isGloballyPaused) {
            const now = Date.now();
            if (now < unpauseTime) {
                await delay(unpauseTime - now);
            }
            isGloballyPaused = false;
            console.log("Resuming Billetto API requests.");
        }

        this.pendingPromise = true;
        const promiseFn = this.queue.shift()!;

        // Use finally to ensure the next item is dequeued even if the current one fails.
        promiseFn().finally(() => {
            this.pendingPromise = false;
            this.dequeue();
        });
    }
}

let isGloballyPaused = false;
let unpauseTime = 0;

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Sets a global pause on all outgoing API requests.
 * @param durationInMs The duration to pause for in milliseconds.
 */
export const pauseGlobalRequests = (durationInMs: number) => {
    const newUnpauseTime = Date.now() + durationInMs;
    // Only extend the pause if the new requested pause is longer
    if (newUnpauseTime > unpauseTime) {
        unpauseTime = newUnpauseTime;
    }
    if (!isGloballyPaused) {
        console.warn(`Billetto API requests are globally paused for ${Math.round(durationInMs / 1000)}s.`);
        isGloballyPaused = true;
    }
};


const requestQueue = new PromiseQueue();
// A safe, conservative delay between all API requests to avoid rate-limiting.
const INTER_REQUEST_DELAY_MS = 250; // Reduced delay as the queue is now reactive.

/**
 * Wraps an API request function in a sequential queue with a built-in delay
 * to prevent rate-limiting. This ensures only one API request is active at a time
 * across the entire application.
 * @param requestFn The function that returns the Promise for the API request.
 * @returns A Promise that resolves with the result of the requestFn.
 */
export const limitRequest = <T>(requestFn: () => Promise<T>): Promise<T> => {
    return requestQueue.enqueue(async () => {
        // Execute the request.
        const result = await requestFn();
        // Wait AFTER the request completes before allowing the next one in the queue to start.
        await delay(INTER_REQUEST_DELAY_MS);
        return result;
    });
};
