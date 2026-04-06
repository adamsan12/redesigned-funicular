// functions/lib/utils.js
export const norm = (t) => (t || "").toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();

export function h(str) {
    if (!str) return "";
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

export const p2 = (t) => {
    const n = norm(t).replace(/\s+/g, "");
    return !n ? "__" : n.length === 1 ? n + "_" : n.slice(0, 2);
};

export const p3 = (t) => {
    const n = norm(t).replace(/\s+/g, "");
    return !n ? "___" : n.length === 1 ? n + "__" : n.length === 2 ? n + "_" : n.slice(0, 3);
};

export function getCacheAge(response) {
    const date = response.headers.get('date');
    if (!date) return 'unknown';
    const age = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    return `${age}s`;
}

export function formatNumber(num) {
    if (!num) return '0';
    const n = typeof num === 'string' ? parseInt(num) : num;
    if (isNaN(n)) return '0';
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
    return n.toString();
}

export function formatDuration(seconds) {
    if (!seconds || isNaN(seconds)) return '00:10:30';
    const s = parseInt(seconds);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

// wp.com CDN index rotator (load balance across i0–i3)
const WP_HOSTS = ['i0.wp.com', 'i1.wp.com', 'i2.wp.com', 'i3.wp.com'];
export function wpImg(imageUrl, w = 320, q = 85) {
    if (!imageUrl) return '';
    const host = WP_HOSTS[Math.floor(Math.random() * WP_HOSTS.length)];
    // Remove any http(s):// prefix before passing to wp.com
    const clean = imageUrl.replace(/^https?:\/\//, '');
    return `https://${host}/${clean}?w=${w}&q=${q}&strip=all`;
}

export function generateSrcset(imageUrl, widths = [320, 640, 960]) {
    if (!imageUrl) return '';
    const clean = imageUrl.replace(/^https?:\/\//, '');
    return widths
        .map((w, i) => `https://${WP_HOSTS[i % WP_HOSTS.length]}/${clean}?w=${w}&q=85&strip=all ${w}w`)
        .join(', ');
}