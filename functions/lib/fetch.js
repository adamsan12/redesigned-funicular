// functions/lib/fetch.js

// In-memory cache (lives for the duration of the worker isolate)
// On Cloudflare Workers, a single isolate can serve multiple requests,
// so this effectively caches data across concurrent and sequential requests
// within the same isolate lifecycle (~seconds to minutes).
const memoryCache = new Map();

// TTL configurations (in seconds) - OPTIMIZED FOR MAXIMUM REDUCTION OF REQUESTS
const CACHE_TTL = {
    '/data/lookup_shard.json': 604800,        // 7 days — stable lookup table, rarely changes
    '/data/categories.json': 604800,          // 7 days — stable categories
    '/data/meta.json': 86400,                 // 24 hours — meta info updated less frequently
    '/data/constants.json': 604800,           // 7 days — constants don't change
    'default': 86400,                         // 24 hours default — data relatively stable
};

function getTTL(path) {
    // Check exact path match first
    if (CACHE_TTL[path]) return CACHE_TTL[path];
    
    // Check pattern matches
    if (path.includes('/data/detail/')) return 604800;        // 7 days for detail pages
    if (path.includes('/data/index/')) return 432000;         // 5 days for index files
    if (path.includes('/data/slug')) return 604800;           // 7 days for slug data
    if (path.includes('/data/list/')) return 86400;           // 24 hours for list pages (updated regularly)
    
    return CACHE_TTL['default'];
}

export async function get(url, env, path) {
    // 1. Check in-memory cache first (fastest, zero I/O)
    const memKey = path;
    const memEntry = memoryCache.get(memKey);
    if (memEntry && Date.now() < memEntry.expires) {
        return memEntry.data;
    }

    // 2. Check Cloudflare Cache API (edge-level, fast)
    const cacheKeyUrl = new URL(`/cache-data${path}`, url.origin).toString();
    const cacheKey = new Request(cacheKeyUrl);
    let cfCache;
    try {
        cfCache = caches.default;
    } catch (e) {
        cfCache = null;
    }

    if (cfCache) {
        try {
            const cached = await cfCache.match(cacheKey);
            if (cached) {
                const data = await cached.json();
                // Populate memory cache from edge cache
                const ttl = getTTL(path);
                memoryCache.set(memKey, {
                    data,
                    expires: Date.now() + ttl * 1000,
                });
                return data;
            }
        } catch (e) {
            // Cache read failed, proceed to origin
        }
    }

    // 3. Fetch from origin (ASSETS binding)
    try {
        const r = await env.ASSETS.fetch(new URL(path, url.origin));
        if (!r.ok) return null;

        const contentType = r.headers.get("content-type") || "";
        if (!contentType.includes("application/json")) {
            console.warn(`Expected JSON for ${path} but got ${contentType}`);
            return null;
        }

        const data = await r.json();
        const ttl = getTTL(path);

        // Store in memory cache
        memoryCache.set(memKey, {
            data,
            expires: Date.now() + ttl * 1000,
        });

        // Store in Cloudflare Cache API (edge cache) with optimized Cache-Control
        if (cfCache) {
            try {
                // Use more aggressive stale-while-revalidate for data files
                const swrTtl = Math.min(ttl * 2, 604800); // stale-while-revalidate = 2x TTL or 7 days max
                const sierraTtl = Math.min(ttl * 7, 2592000); // stale-if-error = 7x TTL or 30 days max
                
                const cacheResp = new Response(JSON.stringify(data), {
                    headers: {
                        'Content-Type': 'application/json',
                        'Cache-Control': `public, max-age=${ttl}, s-maxage=${ttl}, stale-while-revalidate=${swrTtl}, stale-if-error=${sierraTtl}`,
                    },
                });
                // waitUntil is not available here, but cache.put is fire-and-forget safe
                await cfCache.put(cacheKey, cacheResp);
            } catch (e) {
                // Cache write failed — non-critical
            }
        }

        return data;
    } catch (e) {
        console.error(`Error fetching/parsing ${path}:`, e);
    }
    return null;
}