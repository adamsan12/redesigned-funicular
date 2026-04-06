// functions/[[path]].js
// Cloudflare Pages Functions format dengan CACHE OPTIMIZED

import { withCache } from './lib/cache.js';
import { welcome } from './handlers/welcome.js';
import { detail } from './handlers/detail.js';
import { search } from './handlers/search.js';
import { list } from './handlers/list.js';
import { downloadPage } from './handlers/download.js';
import { sitemap, videoSitemap, postSitemap, robots, categorySitemap } from './handlers/sitemap.js';

export async function onRequest(context) {
    const { request, env, next } = context;
    const url = new URL(request.url);
    const p = url.pathname;

    // 1. Strict Parameter Validation
    // Only allow 'q' and 'page' parameters on the root path ('/' or '')
    // Redirect to home if any unauthorized parameters are present on any path
    if (url.searchParams.size > 0) {
        const isHome = p === "/" || p === "";
        const allowedParams = isHome ? ['q', 'page'] : [];
        const hasInvalidParams = Array.from(url.searchParams.keys()).some(k => !allowedParams.includes(k));
        
        if (hasInvalidParams) {
            return Response.redirect(url.origin + '/', 301);
        }
    }


    if (p === "/" || p === "") {
        if (url.searchParams.has('q')) return search(url, env);
        return withCache(request, () => welcome(url, env));
    }
    if (p === "/robots.txt") return withCache(request, () => robots(request));
    if (p === "/sitemap.xml") return withCache(request, () => sitemap(url, env));
    if (p.startsWith("/post-sitemap")) return withCache(request, () => postSitemap(url, env, p));
    if (p.startsWith("/video-sitemap")) return withCache(request, () => videoSitemap(url, env, p));
    if (p === "/category-sitemap.xml") return withCache(request, () => categorySitemap(url, env));
    if (/^\/e\/[\w-]+$/.test(p)) return withCache(request, () => detail(url, env));
    if (/^\/dl\/[\w-]+$/.test(p)) return withCache(request, () => downloadPage(url, env));
    if (/^\/f\/.+[^\/]$/.test(p)) return withCache(request, () => search(url, env));

    // Handle list pages: /list/ and /list/2, /list/3, etc.
    if (p === "/list") return Response.redirect(url.origin + '/list/', 301);
    if (p === "/list/") return withCache(request, () => list(url, env, "1"));
    if (/^\/list\/\d+$/.test(p)) {
        const page = p.split("/")[2];
        return withCache(request, () => list(url, env, page));
    }

    // Legacy /page/ redirects to /list/
    if (p === "/page/1" || p === "/page/") return Response.redirect(url.origin + '/list/', 301);
    if (/^\/page\/\d+$/.test(p)) {
        const page = p.split("/")[2];
        return Response.redirect(url.origin + `/list/${page}`, 301);
    }

    // Handle old format redirects: /category/123 -> /list/123
    if (/^\/[a-zA-Z0-9_.-]+\/\d+$/.test(p)) {
        if (!p.startsWith('/page/') && !p.startsWith('/list/')) {
            const num = p.split('/')[2];
            if (num === "1") return Response.redirect(url.origin + '/list/', 301);
            return Response.redirect(url.origin + `/list/${num}`, 301);
        }
    }

    // --- END OF ROUTE DEFINITIONS ---

    // Jika tidak ada route yang cocok, coba fetch static assets terlebih dahulu
    const res = await next();
    
    // Jika static asset ditemukan, kirimkan apa adanya
    if (res.ok) return res;

    // Untuk requests ke path yang nampak seperti asset (ekstensi file), biarkan 404 muncul
    // agar browser tidak mengarahkan request gambar/js/css yang hilang ke beranda
    if (p.match(/\.(png|jpg|jpeg|svg|gif|webp|ico|css|js|mp4|woff2?)$/i)) {
        return res;
    }

    // Default catch-all: DIRECT KE HOME /url.origin
    return Response.redirect(url.origin + '/', 301);
}