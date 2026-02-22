/**
 * Airtable Request Throttle
 *
 * Airtable has a rate limit of 5 requests per second per base.
 * This module spaces requests 200ms apart but fires them concurrently —
 * it does NOT wait for each request to complete before starting the next.
 */

// Queue of pending requests
const requestQueue: Array<() => Promise<void>> = [];
let lastStartTime = 0;
let scheduleTimer: ReturnType<typeof setTimeout> | null = null;

// Minimum delay between starting requests (200ms = 5 requests/second max)
const MIN_DELAY_MS = 200;

/**
 * Process the next request in the queue, spacing starts by MIN_DELAY_MS.
 * Requests run concurrently — we don't await completion before starting the next.
 */
function scheduleNext(): void {
  if (scheduleTimer !== null || requestQueue.length === 0) return;

  const now = Date.now();
  const elapsed = now - lastStartTime;
  const delay = Math.max(0, MIN_DELAY_MS - elapsed);

  scheduleTimer = setTimeout(() => {
    scheduleTimer = null;

    const nextRequest = requestQueue.shift();
    if (nextRequest) {
      lastStartTime = Date.now();
      // Fire without awaiting — let it run concurrently
      nextRequest();
    }

    // Schedule the next one if queue isn't empty
    scheduleNext();
  }, delay);
}

/**
 * Throttled fetch for Airtable API calls.
 * Queues requests and spaces them 200ms apart, but allows concurrent in-flight requests.
 */
export function throttledAirtableFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  return new Promise((resolve, reject) => {
    requestQueue.push(async () => {
      // Skip if the request was aborted while waiting in queue
      if (options.signal?.aborted) {
        reject(new DOMException('The operation was aborted.', 'AbortError'));
        return;
      }
      try {
        const response = await fetch(url, options);
        resolve(response);
      } catch (error) {
        reject(error);
      }
    });

    scheduleNext();
  });
}
