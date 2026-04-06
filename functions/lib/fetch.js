// functions/lib/fetch.js

// In-memory cache (lives for the duration of the worker isolate)
// On Cloudflare Workers, a single isolate can serve multiple requests,
// so this effectively caches data across concurrent and sequential requests
// within the same isolate lifecycle (~seconds to minutes).
const memoryCache = new Map();

// TTL configurations (in seconds)
const CACHE_TTL = {
    '/data/lookup_shard.json': 86400,   // 24h — rarely changes
    '/data/meta.json': 3600,            // 1h  — changes infrequently
    'default': 1800,                    // 30m — default for all other data
};

function getTTL(path) {
    return CACHE_TTL[path] || CACHE_TTL['default'];
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

        // Store in Cloudflare Cache API (edge cache)
        if (cfCache) {
            try {
                const cacheResp = new Response(JSON.stringify(data), {
                    headers: {
                        'Content-Type': 'application/json',
                        'Cache-Control': `public, max-age=${ttl}, s-maxage=${ttl}, stale-while-revalidate=${ttl}`,
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