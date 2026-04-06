// functions/lib/cache.js
import { getCacheAge } from './utils.js';
import { CONFIG } from './config.js';

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
    if (cache) {
        try {
            const res = await cache.match(cacheKey);
            if (res) {
                console.log(`⚡ CACHE HIT: ${url.pathname}`);
                // Refresh response dengan headers baru
                const newHeaders = new Headers(res.headers);
                newHeaders.set("X-Cache", "HIT");
                newHeaders.set("X-Cache-Age", getCacheAge(res));
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

    // Jika response error (selain redirect), tetap cache singkat agar tidak membebani fungsi
    const isErrorResponse = !res.ok && ![301, 302].includes(res.status);
    if (isErrorResponse) {
        newHeaders.set("Cache-Control", "public, max-age=60, s-maxage=60, stale-while-revalidate=300");
        newHeaders.set("X-Cache-Type", "error");
        newHeaders.set("X-Cache", "MISS");
        newHeaders.set("X-Cache-Date", new Date().toISOString());
        newHeaders.set("X-Cache-Key", url.pathname);

        const errorRes = res.clone();
        await cache.put(cacheKey, errorRes);
        return res;
    }

    // SET CACHE HEADER berdasarkan tipe konten
    const isStatic = url.pathname.match(/\.(css|js|jpg|jpeg|png|ico|svg|woff2?|webp|mp4|gif)$/i);
    const isVideoPage = url.pathname.startsWith('/e/');
    const isSearchPage = url.pathname.startsWith('/f/');
    const isListingPage = url.pathname.startsWith('/page/') || url.pathname.startsWith('/list/') || url.pathname === '/';
    const isApi = url.pathname.startsWith('/api/');

    if (isStatic) {
        // Static assets: cache 1 tahun
        newHeaders.set("Cache-Control", "public, max-age=31536000, immutable");
        newHeaders.set("X-Cache-Type", "static");
    } else if (isApi) {
        // API endpoints: cache longer to reduce function invocations
        newHeaders.set("Cache-Control", "public, max-age=86400, s-maxage=86400, stale-while-revalidate=86400");
        newHeaders.set("X-Cache-Type", "api");
    } else if (isVideoPage) {
        // Halaman video: cache 24 jam di browser dan edge
        newHeaders.set("Cache-Control", "public, max-age=86400, s-maxage=86400, stale-while-revalidate=86400");
        newHeaders.set("X-Cache-Type", "video");
    } else if (isSearchPage) {
        // Halaman search: cache 30 menit (karena dinamis)
        newHeaders.set("Cache-Control", "public, max-age=1800, s-maxage=3600, stale-while-revalidate=3600");
        newHeaders.set("X-Cache-Type", "search");
    } else if (isListingPage) {
        // Halaman listing: cache 1 jam
        newHeaders.set("Cache-Control", "public, max-age=3600, s-maxage=7200, stale-while-revalidate=7200");
        newHeaders.set("X-Cache-Type", "listing");
    } else {
        // Default: cache 1 jam
        newHeaders.set("Cache-Control", "public, max-age=3600, s-maxage=3600");
        newHeaders.set("X-Cache-Type", "default");
    }

    // Tambahkan cache tags untuk purge (berguna jika pakai cache API)
    const tags = [];
    if (isVideoPage) tags.push('video');
    if (isSearchPage) tags.push('search');
    if (isListingPage) tags.push('list');
    if (tags.length) {
        newHeaders.set('Cache-Tag', tags.join(','));
    }

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

    return res;
}