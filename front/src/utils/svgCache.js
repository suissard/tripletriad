/**
 * SVG Cache — Ensures each SVG file is fetched exactly once.
 * 
 * All subsequent requests for the same URL receive the cached result
 * without any additional network traffic.
 */

// Stores resolved SVG content strings, keyed by URL.
const svgContentCache = new Map();

// Stores in-flight fetch promises to deduplicate concurrent requests.
const pendingFetches = new Map();

/**
 * Fetch an SVG file's text content, using a shared in-memory cache.
 * 
 * - First call for a given URL triggers a real fetch.
 * - Concurrent calls for the same URL share the same Promise (no duplicate requests).
 * - Subsequent calls return instantly from cache.
 * 
 * @param {string} url — The URL of the SVG to fetch (e.g. '/elements/eau.svg')
 * @returns {Promise<string|null>} — The SVG markup string, or null on error.
 */
export async function fetchSvg(url) {
  // 1. Already cached — instant return
  if (svgContentCache.has(url)) {
    return svgContentCache.get(url);
  }

  // 2. Already fetching — deduplicate by sharing the same promise
  if (pendingFetches.has(url)) {
    return pendingFetches.get(url);
  }

  // 3. First request — fetch and cache
  const fetchPromise = (async () => {
    try {
      const response = await fetch(url);
      if (response.ok) {
        const text = await response.text();
        svgContentCache.set(url, text);
        return text;
      } else {
        console.warn(`[svgCache] Failed to load SVG: ${url} (${response.status})`);
        svgContentCache.set(url, null);
        return null;
      }
    } catch (error) {
      console.error(`[svgCache] Error loading SVG: ${url}`, error);
      svgContentCache.set(url, null);
      return null;
    } finally {
      pendingFetches.delete(url);
    }
  })();

  pendingFetches.set(url, fetchPromise);
  return fetchPromise;
}

/**
 * Preload a list of SVG URLs into the cache.
 * Useful for warming up the cache at app startup.
 * 
 * @param {string[]} urls
 */
export function preloadSvgs(urls) {
  urls.forEach(url => fetchSvg(url));
}

/**
 * Clear the entire SVG cache.
 * Mainly useful for testing or hot-reloading scenarios.
 */
export function clearSvgCache() {
  svgContentCache.clear();
  pendingFetches.clear();
}
