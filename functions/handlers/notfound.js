import { get } from "../lib/fetch.js";
import { render } from "../lib/render.js";
import { h, wpImg, generateSrcset, formatDuration, videoPath } from "../lib/utils.js";
import { CONFIG, IMG_ERR } from "../lib/config.js";

export async function notFound(url, env) {
  const meta = await get(url, env, "/data/meta.json");
  const totalPages = meta?.total_pages || 10; // Fallback if meta not found
  const randomPage = Math.floor(Math.random() * totalPages) + 1;
  const listData = await get(url, env, `/data/list/${randomPage}.json`);
  
  const files = listData?.result?.files || [];
  const related = files.sort(() => 0.5 - Math.random()).slice(0, 30);

  const origin = url.origin;
  const title = `404 - Halaman Tidak Ditemukan | ${CONFIG.name}`;
  
  const body = `
    <section style="text-align: center; padding: 4rem 1rem;">
        <h1 style="font-size: 5rem; font-weight: 800; margin-bottom: 1rem; color: hsl(var(--primary));">404</h1>
        <p style="font-size: 1.5rem; font-weight: 600; margin-bottom: 0.5rem;">Waduh! Halaman tidak ditemukan.</p>
        <p style="color: hsl(var(--muted-foreground)); margin-bottom: 3rem;">Mungkin halaman telah dipindah atau dihapus. Coba cari video lain di bawah ini atau kembali ke <a href="/" style="color: hsl(var(--primary)); text-decoration: underline;">Beranda</a>.</p>
        
        <div style="text-align: left;">
            <h2 class="section-title">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                Rekomendasi Video Untukmu
            </h2>
            <div class="video-grid">
                ${related.map((v, i) => VideoCard(v, origin, i)).join("")}
            </div>
        </div>
    </section>
  `;

  const metaData = {
    description: `Halaman yang Anda cari tidak ditemukan di ${CONFIG.name}. Temukan ribuan video viral lainnya di sini.`,
    robots: "noindex, nofollow",
    type: "website",
  };

  const schema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": title,
    "description": metaData.description
  };

  return render(title, body, schema, url, metaData, { status: 404 });
}

function VideoCard(v, origin, i) {
    const duration = formatDuration(v.ln || v.length || v.d);
    const titleVal = v.t || v.title || 'Video';
    const titleEsc = h(titleVal);
    const thumb = v.si || v.sp || v.single_img || v.splash_img || '';
    const views = v.vw_fmt || v.vw || v.views || "0";
    const uploadVal = v.up || v.added || null;
    const formattedDate = uploadVal ? new Date(uploadVal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : 'baru';
    const filecode = v.f || v.file_code || v.filecode;

    return `
    <article class="video-card">
        <a href="${videoPath(v)}" class="video-card-link" title="${titleEsc}" style="display: block; text-decoration: none; color: inherit;">
            <div class="card-thumb">
                <img
                    src="${wpImg(thumb, 320)}"
                    srcset="${generateSrcset(thumb)}"
                    alt="${titleEsc}"
                    loading="lazy"
                    width="320"
                    height="180"
                    onerror="this.onerror=null; this.src='${IMG_ERR}';">
                <div class="card-hover-overlay"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg></div>
                <span class="card-views"><svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg> ${views}</span>
                <span class="card-duration">${duration}</span>
            </div>
            <div class="card-content">
                <h3 class="card-title">${titleEsc}</h3>
                <div class="card-stats">
                    <span style="text-transform: capitalize;">${v.kt || 'Video'}</span> • ${formattedDate}
                </div>
            </div>
        </a>
    </article>
    `;
}
