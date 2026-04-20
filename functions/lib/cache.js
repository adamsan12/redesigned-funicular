// functions/lib/cache.js
import { getCacheAge } from './utils.js';
import { CONFIG } from './config.js';

const memoryCache = new Map();
const MEMORY_CACHE_TTL = 120; // seconds for same-isolate hits (increased from 30 for better performance)

// Generate simple ETag
function generateETag(content) {
    // Simple hash for ETag generation
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
        const char = content.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return `"${Math.abs(hash).toString(36)}"`;
}

export async function withCache(req, fn) {
    const url = new URL(req.url);

    // Hanya cache GET requests
    if (req.method !== 'GET') return fn();

    // DEV MODE - bypass cache untuk local development
    if (url.hostname === "localhost" || url.hostname === "127.0.0.1") {
        console.log(`🔧 DEV MODE: ${url.pathname}`);
        const res = await fn();
        const newHeaders = new Headers(res.headers);
        newHeaders.set("X-Cache", "BYPASS-DEV");
        return new Response(res.body, {
            status: res.status,
            statusText: res.statusText,
            headers: newHeaders
        });
    }

    // Buat cache key yang konsisten (normalisasi URL) dengan CACHE BUSTER
    const cacheKeyUrlObj = new URL(url.toString());
    
    // Gunakan CONFIG.version sebagai global cache buster
    // Tiap kali sedot.py jalan, versi naik, dan semua cache otomatis MISS
    cacheKeyUrlObj.searchParams.set('v', CONFIG.version);
    cacheKeyUrlObj.searchParams.sort();
    
    const cacheKeyUrl = cacheKeyUrlObj.toString();

    const cacheKey = new Request(cacheKeyUrl, {
        method: 'GET',
        headers: {
            'accept': req.headers.get('accept')?.split(',')[0] || '*/*'
        }
    });

    let cache;
    try {
        cache = caches.default;
    } catch (e) {
        cache = null;
    }

    // COBA AMBIL DARI CACHE DULU
    const memoryEntry = memoryCache.get(cacheKeyUrl);
    if (memoryEntry && Date.now() < memoryEntry.expires) {
        const cachedRes = memoryEntry.response.clone();
        console.log(`⚡ MEMORY CACHE HIT: ${url.pathname}`);
        const newHeaders = new Headers(cachedRes.headers);
        newHeaders.set("X-Cache", "MEMORY-HIT");
        newHeaders.set("X-Cache-Age", `${Math.floor((Date.now() - memoryEntry.created) / 1000)}s`);
        return new Response(cachedRes.body, {
            status: cachedRes.status,
            statusText: cachedRes.statusText,
            headers: newHeaders
        });
    }

    if (cache) {
        try {
            const res = await cache.match(cacheKey);
            if (res) {
                console.log(`⚡ CACHE HIT: ${url.pathname}`);
                // Refresh response dengan headers baru
                const newHeaders = new Headers(res.headers);
                newHeaders.set("X-Cache", "HIT");
                newHeaders.set("X-Cache-Age", getCacheAge(res));
                newHeaders.set('Vary', 'Accept');
                return new Response(res.body, {
                    status: res.status,
                    statusText: res.statusText,
                    headers: newHeaders
                });
            }
        } catch (e) {
            console.warn("Cache match failed, bypassing cache", e);
        }
    }

    // CACHE MISS - eksekusi function
    console.log(`🔄 CACHE MISS: ${url.pathname}`);
    const original = await fn();

    // Clone response dan set header baru sebelum caching
    const newHeaders = new Headers(original.headers);
    const res = new Response(original.body, {
        status: original.status,
        statusText: original.statusText,
        headers: newHeaders
    });

    // Jika response error (selain redirect), tetap cache medium untuk mengurangi load
    const isErrorResponse = !res.ok && ![301, 302].includes(res.status);
    if (isErrorResponse) {
        newHeaders.set("Cache-Control", "public, max-age=300, s-maxage=300, stale-while-revalidate=600, stale-if-error=3600");
        newHeaders.set("X-Cache-Type", "error");
        newHeaders.set("X-Cache", "MISS");
        newHeaders.set("X-Cache-Date", new Date().toISOString());
        newHeaders.set("X-Cache-Key", url.pathname);

        const errorRes = res.clone();
        if (cache) await cache.put(cacheKey, errorRes);
        return res;
    }

    // SET CACHE HEADER berdasarkan tipe konten
    const isStatic = url.pathname.match(/\.(css|js|jpg|jpeg|png|ico|svg|woff2?|webp|mp4|gif)$/i);
    const isSitemap = url.pathname.includes('sitemap');
    const isRobots = url.pathname === '/robots.txt';
    const isVideoPage = url.pathname.startsWith('/e/');
    const isDownloadPage = url.pathname.startsWith('/dl/');
    const isSearchPage = url.pathname.startsWith('/f/');
    const isListingPage = url.pathname.startsWith('/page/') || url.pathname.startsWith('/list/') || url.pathname === '/';
    const isApi = url.pathname.startsWith('/api/');

    if (isStatic) {
        // Static assets: cache 1 tahun (immutable)
        newHeaders.set("Cache-Control", "public, max-age=31536000, immutable, s-maxage=31536000");
        newHeaders.set("X-Cache-Type", "static");
    } else if (isSitemap) {
        // Sitemap: cache 7 hari (diupdate tidak sering)
        newHeaders.set("Cache-Control", "public, max-age=604800, s-maxage=604800, stale-while-revalidate=172800, stale-if-error=604800");
        newHeaders.set("X-Cache-Type", "sitemap");
    } else if (isRobots) {
        // Robots.txt: cache 7 hari
        newHeaders.set("Cache-Control", "public, max-age=604800, s-maxage=604800, stale-while-revalidate=604800");
        newHeaders.set("X-Cache-Type", "robots");
    } else if (isApi) {
        // API endpoints: cache 24 jam + stale-while-revalidate untuk reduce load drastis
        newHeaders.set("Cache-Control", "public, max-age=86400, s-maxage=86400, stale-while-revalidate=86400, stale-if-error=86400");
        newHeaders.set("X-Cache-Type", "api");
    } else if (isVideoPage) {
        // Halaman video: cache 7 hari (video URL permanent, tidak akan berubah)
        // dengan stale-while-revalidate untuk pengalaman cepat
        newHeaders.set("Cache-Control", "public, max-age=604800, s-maxage=604800, stale-while-revalidate=86400, stale-if-error=604800");
        newHeaders.set("X-Cache-Type", "video");
    } else if (isDownloadPage) {
        // Download pages: cache 3 hari
        newHeaders.set("Cache-Control", "public, max-age=259200, s-maxage=259200, stale-while-revalidate=86400");
        newHeaders.set("X-Cache-Type", "download");
    } else if (isSearchPage) {
        // Halaman search: cache 12 jam (hasil search cenderung stabil)
        // Gunakan stale-while-revalidate agresif untuk load lebih cepat
        newHeaders.set("Cache-Control", "public, max-age=43200, s-maxage=43200, stale-while-revalidate=86400, stale-if-error=86400");
        newHeaders.set("X-Cache-Type", "search");
    } else if (isListingPage) {
        // Halaman listing: cache 6 jam (diupdate regular tapi tidak sering)
        // Gunakan stale-while-revalidate untuk performa optimal
        newHeaders.set("Cache-Control", "public, max-age=21600, s-maxage=21600, stale-while-revalidate=86400, stale-if-error=172800");
        newHeaders.set("X-Cache-Type", "listing");
    } else {
        // Default: cache 6 jam
        newHeaders.set("Cache-Control", "public, max-age=21600, s-maxage=21600, stale-while-revalidate=86400");
        newHeaders.set("X-Cache-Type", "default");
    }

    // Tambahkan cache tags untuk purge (berguna jika pakai Cloudflare Cache API)
    const tags = [];
    if (isVideoPage) tags.push('video');
    if (isDownloadPage) tags.push('download');
    if (isSearchPage) tags.push('search');
    if (isListingPage) tags.push('list');
    if (isSitemap) tags.push('sitemap');
    if (tags.length) {
        newHeaders.set('Cache-Tag', tags.join(','));
    }

    // Tambahkan Vary header untuk proper cache key management
    const varyHeaders = ['Accept-Encoding'];
    if (isSearchPage || isListingPage) varyHeaders.push('Accept-Language');
    newHeaders.set('Vary', varyHeaders.join(', '));

    // Header tambahan untuk monitoring
    newHeaders.set('X-Cache', 'MISS');
    newHeaders.set('X-Cache-Date', new Date().toISOString());
    newHeaders.set('X-Cache-Key', url.pathname);

    // Simpan ke cache (jika tersedia)
    if (cache) {
        try {
            await cache.put(cacheKey, res.clone());
        } catch (e) {
            console.warn("Cache put failed, returning response without caching", e);
        }
    }

    // Simpan juga ke cache memori lokal untuk reload berulang pada isolate yang sama
    try {
        memoryCache.set(cacheKeyUrl, {
            response: res.clone(),
            created: Date.now(),
            expires: Date.now() + MEMORY_CACHE_TTL * 1000,
        });
    } catch (e) {
        console.warn("Memory cache store failed", e);
    }

    return res;
}