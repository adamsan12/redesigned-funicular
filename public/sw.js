// Service Worker untuk offline support dan caching optimization
const CACHE_VERSION = 'site-v2';
const RUNTIME_CACHE = 'runtime-v2';
const DATA_CACHE = 'data-v2';

// Assets untuk pre-cache (core essentials)
const ASSETS_TO_CACHE = [
    '/',
    '/css/main.css',
    '/images/logo.png',
    '/images/favicon-32x32.png'
];

// Cache strategies
const CACHE_STRATEGIES = {
    // Network first untuk HTML (render immediately dari network, fallback ke cache)
    networkFirst: ['/', '/list/', '/f/', '/e/'],
    
    // Cache first untuk static assets
    cacheFirst: ['.css', '.js', '.png', '.jpg', '.jpeg', '.svg', '.webp', '.woff2', '.gif', '.ico'],
    
    // Stale while revalidate untuk data
    staleWhileRevalidate: ['/data/', '.json']
};

self.addEventListener('install', (event) => {
    console.log('[SW] Installing...');
    event.waitUntil(
        caches.open(CACHE_VERSION).then((cache) => {
            console.log('[SW] Pre-caching assets');
            return cache.addAll(ASSETS_TO_CACHE).catch(err => {
                console.warn('[SW] Pre-cache failed for some assets:', err);
            });
        })
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    console.log('[SW] Activating...');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((cacheName) => 
                        cacheName !== CACHE_VERSION && 
                        cacheName !== RUNTIME_CACHE && 
                        cacheName !== DATA_CACHE
                    )
                    .map((cacheName) => {
                        console.log('[SW] Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    })
            );
        })
    );
    self.clients.claim();
});

// Helper untuk menentukan strategi cache
function getStrategy(url) {
    const urlStr = url.toString();
    
    // Check exact match untuk network first
    if (CACHE_STRATEGIES.networkFirst.some(path => urlStr.includes(path))) {
        return 'networkFirst';
    }
    
    // Check file extensions untuk cache first
    if (CACHE_STRATEGIES.cacheFirst.some(ext => urlStr.endsWith(ext))) {
        return 'cacheFirst';
    }
    
    // Check untuk data
    if (CACHE_STRATEGIES.staleWhileRevalidate.some(path => urlStr.includes(path))) {
        return 'staleWhileRevalidate';
    }
    
    return 'networkFirst'; // default
}

// Network first strategy (network dengan fallback ke cache)
async function networkFirst(request) {
    try {
        const response = await fetch(request);
        if (response.ok || response.type === 'basic') {
            // Clone dan simpan ke cache
            const cache = await caches.open(RUNTIME_CACHE);
            cache.put(request, response.clone());
        }
        return response;
    } catch (error) {
        const cached = await caches.match(request);
        if (cached) {
            console.log('[SW] Serving from cache (network failed):', request.url);
            return cached;
        }
        // Fallback response
        return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
    }
}

// Cache first strategy (cache dengan fallback ke network)
async function cacheFirst(request) {
    const cached = await caches.match(request);
    if (cached) {
        console.log('[SW] Serving from cache:', request.url);
        return cached;
    }
    
    try {
        const response = await fetch(request);
        if (response.ok || response.type === 'basic') {
            const cache = await caches.open(CACHE_VERSION);
            cache.put(request, response.clone());
        }
        return response;
    } catch (error) {
        console.error('[SW] Cache first failed:', request.url, error);
        return new Response('Resource not available', { status: 404 });
    }
}

// Stale while revalidate strategy
async function staleWhileRevalidate(request) {
    const cached = await caches.match(request);
    
    const fetchPromise = fetch(request).then(response => {
        if (response.ok || response.type === 'basic') {
            const cache = caches.open(DATA_CACHE);
            cache.then(c => c.put(request, response.clone()));
        }
        return response;
    }).catch(err => {
        console.error('[SW] Fetch failed for:', request.url, err);
        throw err;
    });
    
    // Return cached version immediately if available
    if (cached) {
        console.log('[SW] Serving stale from cache:', request.url);
        return cached;
    }
    
    // Otherwise wait for network
    return fetchPromise;
}

self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);
    
    // Skip non-GET requests
    if (request.method !== 'GET') {
        return;
    }
    
    // Skip chrome extensions and other non-http(s)
    if (!url.protocol.startsWith('http')) {
        return;
    }
    
    const strategy = getStrategy(url);
    
    if (strategy === 'cacheFirst') {
        event.respondWith(cacheFirst(request));
    } else if (strategy === 'staleWhileRevalidate') {
        event.respondWith(staleWhileRevalidate(request));
    } else {
        event.respondWith(networkFirst(request));
    }
});
