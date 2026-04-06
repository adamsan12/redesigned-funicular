import { norm } from '../../lib/utils.js';

export function Pagination(page, totalResults, perPage, baseUrl, rawQ = "") {
    const end = page * perPage;
    const qSlug = rawQ ? encodeURIComponent(norm(rawQ).replace(/\s+/g, '-')) : "";
    let prevUrl, nextUrl;

    if (baseUrl === "/page/") {
        // Path-based pagination untuk halaman list: /page/2, /page/3
        prevUrl = page === 2 ? "/" : `/page/${page - 1}`;
        nextUrl = `/page/${page + 1}`;
    } else if (baseUrl === "/list/") {
        // Path-based pagination untuk halaman list: /list/2, /list/3
        prevUrl = page === 2 ? "/list/" : `/list/${page - 1}`;
        nextUrl = `/list/${page + 1}`;
    } else if (baseUrl === "/f/") {
        // Path-based pagination untuk halaman search: /f/keyword/page/2
        const safeSlug = qSlug.toLowerCase();
        prevUrl = page === 2 ? `${baseUrl}${safeSlug}` : `${baseUrl}${safeSlug}/page/${page - 1}`;
        nextUrl = `${baseUrl}${safeSlug}/page/${page + 1}`;
    } else {
        // Query-based pagination untuk format lain (jika ada)
        prevUrl = page === 2 ? `${baseUrl}${qSlug}` : `${baseUrl}${qSlug}?page=${page - 1}`;
        nextUrl = `${baseUrl}${qSlug}?page=${page + 1}`;
    }

    return `
    <nav class="pagination" aria-label="Navigasi halaman" role="navigation">
        ${page > 1 ? `<a href="${prevUrl}" rel="prev" class="pagination-link">← Sebelumnya</a>` : ""}
        <span class="pagination-current" aria-current="page">Halaman ${page}</span>
        ${end < totalResults ? `<a href="${nextUrl}" rel="next" class="pagination-link pagination-next">Berikutnya →</a>` : ""}
    </nav>
    `;
}
