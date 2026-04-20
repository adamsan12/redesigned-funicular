import { get } from "../lib/fetch.js";
import { render } from "../lib/render.js";
import { h, norm, wpImg, generateSrcset, formatDuration, videoPath } from "../lib/utils.js";
import { CONFIG, DESCRIPTIONS, TITLES, desc, IMG_ERR } from "../lib/config.js";
import { notFound } from "./notfound.js";
import { Pagination } from "../templates/components/pagination.js";

export async function list(url, env, pageParam) {
  const p = pageParam || url.pathname.split("/")[2];
  let page = parseInt(p, 10);
  if (isNaN(page) || page < 1) page = 1;
  const meta = await get(url, env, "/data/meta.json");
  if (!meta) return notFound(url, env);
  const data = await get(url, env, `/data/list/${page}.json`);
  if (!data) return notFound(url, env);

  const seenDup = new Set();
  const files = (data.result?.files || []).filter(v => {
      // Dedup: skip jika durasi sama persis
      const fileCode = v.f || v.file_code || v.filecode;
      const rawDur = v.length || v.d || v.ln || '';
      const normDur = rawDur ? (parseInt(rawDur) || 0) : 0;
      
      // Key dedup = durasi saja. Jika durasi tidak ada, fallback ke file_code
      const dupKey = normDur > 0 ? `dur_${normDur}` : fileCode;
      
      if (seenDup.has(dupKey)) return false;
      seenDup.add(dupKey);
      return true;
  });
  
  // Jika page > 1 tapi tidak ada file, redirect ke beranda
  if (page > 1 && files.length === 0) {
      return notFound(url, env);
  }

  const origin = url.origin;
  const publisherId = `${origin}/#organization`;
  const websiteId = `${origin}/#website`;
  const webpageId = origin + url.pathname;

  const listSchema = buildListSchema(
    origin,
    page,
    files,
    publisherId,
    websiteId,
    webpageId,
  );

  const body = buildListBody(files, page, meta, origin);

  const metaData = {
    description: desc(DESCRIPTIONS.listMeta, { name: CONFIG.name, page }),
    canonical: page === 1 ? `${url.origin}/list/` : `${url.origin}/list/${page}`,
    robots: page === 1 ? "index, follow" : "noindex, follow",
    type: "website",
  };

  return render(desc(TITLES.listPage, { page }), body, listSchema, url, metaData);
}

// Helper internal sudah dihapus karea menggunakan handler notfound.js

function buildListSchema(
  origin,
  page,
  files,
  publisherId,
  websiteId,
  webpageId,
) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": webpageId,
        url: webpageId,
        name:
          page === 1
            ? `${CONFIG.name} - Video Terbaru`
            : `Video Terbaru - Halaman ${page}`,
        isPartOf: { "@id": websiteId },
        description: `Daftar video terbaru koleksi ${CONFIG.name} - Halaman ${page}. Platform streaming video viral terlengkap.`,
        inLanguage: "id-ID",
      },
      {
        "@type": "ItemList",
        "@id": webpageId + "#itemlist",
        name: page === 1 ? "Video Terbaru" : `Video Terbaru - Halaman ${page}`,
        description: `Koleksi video terbaru di ${CONFIG.name} - Halaman ${page}.`,
        numberOfItems: files.length,
        itemListElement: files.map((v, index) => ({
          "@type": "ListItem",
          position: index + 1,
          url: `${origin}${videoPath(v)}`,
          name: v.title,
          image: {
            "@type": "ImageObject",
            "url": wpImg(v.single_img, 300),
            "width": 300,
            "height": 168
          },
        })),
      },
    ],
  };
}

function buildListBody(files, page, meta, origin) {
  return `
    <section itemscope itemtype="https://schema.org/ItemList">
        <meta itemprop="name" content="${page === 1 ? "Video Terbaru" : `Video Terbaru - Halaman ${page}`}">
        <meta itemprop="description" content="Koleksi video terbaru di ${CONFIG.name} - Halaman ${page}.">
        <meta itemprop="numberOfItems" content="${files.length}">
        
        <h1 class="section-title" itemprop="name">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg> 
            Video Terbaru - Halaman ${page}
        </h1>
        
        <div class="video-grid">
            ${files.map((v, index) => VideoCard(v, origin, index)).join("")}
        </div>
        
        ${Pagination(page, meta.total, 200, "/list/", "")}
    </section>
    `;
}

function VideoCard(v, origin, i) {
    const duration = formatDuration(v.ln || v.length || v.d);
    const position = i + 1;
    const titleVal = v.t || v.title || 'Video';
    const titleEsc = v.t_esc || h(titleVal);
    const thumb = v.si || v.sp || v.single_img || v.splash_img || '';
    const views = v.vw_fmt || v.vw || v.views || "0";
    const uploadVal = v.up || v.added || null;
    const uploadDate = uploadVal || new Date().toISOString();
    const formattedDate = uploadVal ? new Date(uploadVal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : 'baru';
    const filecode = v.f || v.file_code || v.filecode;

    return `
     <article class="video-card" itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem">
        <meta itemprop="position" content="${position}">
        <meta itemprop="url" content="${origin}${videoPath(v)}">
        <a href="${videoPath(v)}" class="video-card-link" title="${titleEsc}" aria-label="Tonton video: ${titleEsc}" style="display: block; text-decoration: none; color: inherit;">
            <div class="card-thumb">
                <img
                    itemprop="image"
                    src="${wpImg(thumb, 320)}"
                    srcset="${generateSrcset(thumb)}"
                    sizes="(max-width: 600px) 100vw, (max-width: 1200px) 33vw, 300px"
                    alt="${titleEsc} - ${CONFIG.name}"
                    loading="lazy"
                    decoding="async"
                    width="320"
                    height="180"
                    onerror="this.onerror=null; this.removeAttribute('srcset'); this.src='${IMG_ERR}'; this.width=320; this.height=180;">
                <div class="card-hover-overlay"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polygon points="5 3 19 12 5 21 5 3"/></svg></div>
                <span class="card-views" aria-label="${views} tayangan"><svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg> ${views}</span>
                <span class="card-duration" aria-label="Durasi video: ${duration}">${duration}</span>
            </div>
            <div class="card-content">
                <h3 class="card-title" itemprop="name">${titleEsc}</h3>
                <div class="card-stats">
                    <span style="text-transform: capitalize;">${v.kt || 'Video'}</span> • 
                    <time datetime="${uploadDate}" title="Diupload pada ${formattedDate}">${formattedDate}</time>
                </div>
            </div>
        </a>
    </article>
    `;
}
