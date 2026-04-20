// functions/handlers/sitemap.js
import { get } from "../lib/fetch.js";
import { videoPath } from "../lib/utils.js";

// Helper untuk minify XML
function minifyXml(xml) {
  return xml
    .replace(/>\s+</g, '><')
    .replace(/^\s+|\s+$/g, '')
    .replace(/\n/g, '');
}

export async function sitemap(url, env) {
  const lookup = await get(url, env, "/data/lookup_shard.json");
  const keys = Object.keys(lookup || {});
  const perSitemap = 500;
  const postPages = Math.ceil(keys.length / perSitemap);
  const videoPages = Math.ceil(keys.length / perSitemap);

  let out = `<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;
  
  // Post Sitemaps
  for (let i = 1; i <= postPages; i++) {
    out += `<sitemap><loc>${url.origin}/post-sitemap${i}.xml</loc></sitemap>`;
  }
  
  // Video Sitemaps (Paginated for full coverage)
  for (let i = 1; i <= videoPages; i++) {
    out += `<sitemap><loc>${url.origin}/video-sitemap${i}.xml</loc></sitemap>`;
  }
  
  // Category Sitemap
  out += `<sitemap><loc>${url.origin}/category-sitemap.xml</loc></sitemap>`;
  
  out += "</sitemapindex>";

  return new Response(minifyXml(out), {
    headers: { 
      "content-type": "application/xml; charset=utf-8",
      "cache-control": "public, max-age=604800, s-maxage=604800, stale-while-revalidate=172800, stale-if-error=604800",
      "vary": "Accept-Encoding"
    },
  });
}

export async function postSitemap(url, env, path) {
  const match = path.match(/post-sitemap(\d+)\.xml/);
  if (!match) return new Response("Not found", { status: 404 });
  const page = parseInt(match[1], 10);

  const lookup = await get(url, env, "/data/lookup_shard.json");
  const keys = Object.keys(lookup || {});
  const start = (page - 1) * 500;
  const slice = keys.slice(start, start + 500);
  if (slice.length === 0) return new Response("Not found", { status: 404 });

  const sliceSet = new Set(slice);
  const requiredShards = [...new Set(slice.map(id => lookup[id]))];
  const videoMap = {};

  // Fetch meta data dalam chunks lebih besar untuk efisiensi
  const chunkSize = 50;
  for (let i = 0; i < requiredShards.length; i += chunkSize) {
    const chunk = requiredShards.slice(i, i + chunkSize);
    await Promise.all(chunk.map(async (shard) => {
      if (!shard) return;
      const data = await get(url, env, `/data/detail/${shard}.json`);
      if (data && Array.isArray(data)) {
        for (const v of data) {
          if (sliceSet.has(v.f)) videoMap[v.f] = v;
        }
      }
    }));
  }

  let out = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">`;
  for (const id of slice) {
    const v = videoMap[id];
    const locPath = v ? videoPath(v) : `/e/${id}`;
    const isoDate = v && v.up ? v.up.replace(" ", "T") + "+00:00" : new Date().toISOString().split(".")[0] + "+00:00";
    const thumb = v ? (v.sp || v.si || "") : "";
    const title = v ? (v.t_esc || v.t || "Video Viral") : "Video Viral";
    
    out += `<url><loc>${url.origin}${locPath}</loc><lastmod>${isoDate}</lastmod>`;
    if (thumb) {
      const fullThumb = thumb.startsWith('http') ? thumb : url.origin + thumb;
      out += `<image:image><image:loc>${fullThumb}</image:loc><image:title>${title}</image:title></image:image>`;
    }
    out += `</url>`;
  }
  out += "</urlset>";

  return new Response(minifyXml(out), {
    headers: { 
      "content-type": "application/xml; charset=utf-8",
      "cache-control": "public, max-age=604800, s-maxage=604800, stale-while-revalidate=172800, stale-if-error=604800",
      "vary": "Accept-Encoding"
    },
  });
}

export async function videoSitemap(url, env, path) {
  const match = path.match(/video-sitemap(\d+)\.xml/);
  if (!match) return new Response("Not found", { status: 404 });
  const page = parseInt(match[1], 10);

  const lookup = await get(url, env, "/data/lookup_shard.json");
  const keys = Object.keys(lookup || {});
  const start = (page - 1) * 500;
  const slice = keys.slice(start, start + 500);
  if (slice.length === 0) return new Response("Not found", { status: 404 });

  const sliceSet = new Set(slice);
  const requiredShards = [...new Set(slice.map(id => lookup[id]))];
  const videoMap = {};

  // Fetch meta data dalam chunks lebih besar untuk efisiensi
  const chunkSize = 50;
  for (let i = 0; i < requiredShards.length; i += chunkSize) {
    const chunk = requiredShards.slice(i, i + chunkSize);
    await Promise.all(chunk.map(async (shard) => {
      if (!shard) return;
      const data = await get(url, env, `/data/detail/${shard}.json`);
      if (data && Array.isArray(data)) {
        for (const v of data) {
          if (sliceSet.has(v.f)) videoMap[v.f] = v;
        }
      }
    }));
  }

  let out = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">`;
  
  for (const id of slice) {
    const v = videoMap[id];
    if (!v) continue;
    
    const title = v.t_esc || v.t || "Video Viral";
    const thumb = v.sp || v.si || "";
    const description = (v.ds_esc || v.ds || `Nonton video ${title} terbaru full HD gratis.`).substring(0, 2048);
    const duration = v.ln || v.length || 0;
    const pubDate = v.up ? v.up.replace(" ", "T") + "+00:00" : new Date().toISOString();
    const locPath = videoPath(v);

    out += `<url><loc>${url.origin}${locPath}</loc><video:video><video:thumbnail_loc>${thumb.startsWith('http') ? thumb : url.origin + thumb}</video:thumbnail_loc><video:title>${title.substring(0, 100)}</video:title><video:description>${description}</video:description><video:player_loc>${v.pe || url.origin + locPath}</video:player_loc><video:duration>${duration}</video:duration><video:publication_date>${pubDate}</video:publication_date></video:video></url>`;
  }
  
  out += "</urlset>";

  return new Response(minifyXml(out), {
    headers: { 
      "content-type": "application/xml; charset=utf-8",
      "cache-control": "public, max-age=604800, s-maxage=604800, stale-while-revalidate=172800, stale-if-error=604800",
      "vary": "Accept-Encoding"
    },
  });
}

export async function categorySitemap(url, env) {
  // Read unique categories generated by sedot.py
  const categories = await get(url, env, "/data/categories.json") || [];
  
  let out = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;
  
  // Base categories from categories.json
  for (const cat of categories) {
    if (cat.slug) {
      out += `<url><loc>${url.origin}/f/${cat.slug}</loc><changefreq>weekly</changefreq><priority>0.6</priority></url>`;
    }
  }
  
  out += "</urlset>";

  return new Response(minifyXml(out), {
    headers: { 
      "content-type": "application/xml; charset=utf-8",
      "cache-control": "public, max-age=604800, s-maxage=604800, stale-while-revalidate=172800, stale-if-error=604800",
      "vary": "Accept-Encoding"
    },
  });
}

export function robots(req) {
  const url = new URL(req.url);
  const content = "User-agent: *\nAllow: /\nDisallow: /api/\nSitemap: https://" +
    url.hostname +
    "/sitemap.xml";

  return new Response(content, {
    headers: { 
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=604800, s-maxage=604800, stale-while-revalidate=604800"
    },
  });
}
