import { get } from "../lib/fetch.js";
import { h, norm, generateSrcset, formatNumber, wpImg, formatDuration, videoPath } from "../lib/utils.js";
import { render } from "../lib/render.js";
import { CONFIG, DESCRIPTIONS, TITLES, desc, IMG_ERR } from "../lib/config.js";
import { Breadcrumbs } from "../templates/components/breadcrumbs.js";
import { notFound } from "./notfound.js";

async function resolveIdBySlug(url, env, slug) {
  const prefix = slug.charAt(0).toLowerCase();
  const cacheKey = new Request(`/cache-internal/slug_lookup_${prefix}`, url);

  // Try cache first
  if (typeof caches !== 'undefined' && caches.default) {
    try {
      const cached = await caches.default.match(cacheKey);
      if (cached) {
        const data = await cached.json();
        return data[slug] || null;
      }
    } catch (e) {
      // Cache miss or error, continue to fetch
    }
  }

  // Fetch sharded file
  const data = await get(url, env, `/data/slug_lookup/${prefix}.json`);
  if (!data || typeof data !== "object") return null;

  // Cache the result
  if (typeof caches !== 'undefined' && caches.default) {
    try {
      const res = new Response(JSON.stringify(data), {
        headers: {
          "Cache-Control": "public, max-age=3600, s-maxage=3600, stale-while-revalidate=3600"
        }
      });
      await caches.default.put(cacheKey, res);
    } catch (e) {
      // Cache write failed, continue
    }
  }

  return data[slug] || null;
}

async function fetchSlugDetail(url, env, slug) {
  const firstWord = slug.split('-')[0] || slug.substring(0, 3);
  return await get(url, env, `/data/slug/${firstWord}/${slug}.json`);
}

export async function detail(url, env) {
  const origin = url.origin;
  const pathKey = url.pathname.split("/")[2];
  if (!pathKey) return notFound(url, env);

  const lookup = await get(url, env, "/data/lookup_shard.json");
  if (!lookup) return notFound(url, env);

  let id = pathKey;
  let usedSlug = false;
  let slugDetail = null;

  if (!lookup[id]) {
    const resolvedId = await resolveIdBySlug(url, env, pathKey);
    if (!resolvedId) return notFound(url, env);
    id = resolvedId;
    usedSlug = true;
    slugDetail = await fetchSlugDetail(url, env, pathKey);
  }

  const shardKey = lookup[id];
  let v = null;

  if (slugDetail && slugDetail.f === id) {
    v = slugDetail;
  } else {
    const data = await get(url, env, `/data/detail/${shardKey}.json`);
    if (!data) return notFound(url, env);
    v = data.find((x) => x.f === id);
    if (!v) return notFound(url, env);
  }

  const canonicalPath = videoPath(v);
  if (!usedSlug && v.seo_url && pathKey !== v.seo_url) {
    return Response.redirect(`${origin}${canonicalPath}`, 301);
  }

  const titleWords = norm(v.t)
    .split(" ")
    .filter((w) => w.length >= 3);
  const seenDup = new Set();
  // Use pre-calculated related videos if available (from rv field)
  const related = v.rv && Array.isArray(v.rv) && v.rv.length > 0 
    ? v.rv.map(rv => ({
        ...rv,
        // Ensure consistent field names if different
        filecode: rv.f,
        title: rv.t,
        single_img: rv.si,
        length: rv.ln
      }))
    : data
        .filter((x) => {
          if (x.f === id) return false;
          const dupKey = norm(x.t) + '|' + (x.ln || x.length || x.d || '');
          if (seenDup.has(dupKey)) return false;
          seenDup.add(dupKey);
          return true;
        })
        .map((x) => {
          let score = 0;
          if (v.kt && x.kt && norm(v.kt) === norm(x.kt)) score += 20;

          const nt = norm(x.t);
          const matches = titleWords.filter((w) => nt.includes(w));
          score += matches.length * 10;

          if (matches.length >= 2) score += 30;

          return { ...x, _score: score };
        })
        .sort(
          (a, b) =>
            b._score - a._score || (parseInt(b.vw) || 0) - (parseInt(a.vw) || 0),
        )
        .slice(0, 16);

  // Schema.org IDs
  const publisherId = `${origin}/#organization`;
  const websiteId = `${origin}/#website`;
  const webpageId = origin + url.pathname;
  const videoId = origin + url.pathname + "#video";
  const articleId = origin + url.pathname + "#article";
  const breadcrumbId = origin + url.pathname + "#breadcrumb";

  const catName = v.kt || "Video";
  const rawCatUrl = v.kt_url || `/f/video`;
  const catUrl = rawCatUrl.startsWith('http') ? rawCatUrl : `${origin}${rawCatUrl}`;

  const durationISO = v.dr || "PT10M30S";
  const uploadDate = v.up || new Date().toISOString();
  const viewCount = parseInt(v.vw) || 0;

  // Schema.org Graph - PERBAIKAN: kirim url sebagai parameter
  const schema = buildSchema(origin, url, v, related, {
    publisherId,
    websiteId,
    webpageId,
    videoId,
    articleId,
    breadcrumbId,
    catName,
    catUrl,
    durationISO,
    uploadDate,
    viewCount,
  });

  const breadcrumbsHtml = Breadcrumbs(catName, catUrl, v.t, webpageId);

  const duration = formatDuration(v.ln || v.length || v.d);

  const body = buildDetailBody(
    v,
    related,
    breadcrumbsHtml,
    duration,
    origin,
    viewCount,
    uploadDate,
    durationISO,
  );

  // random related
  let randomRelatedHtml = "";
  /*
  let cache;
  try {
    cache = caches.default;
  } catch (e) {
    cache = null;
  }

  const randomCacheKey = new Request(new URL(`/cache-internal/random-related/${shardKey}`, origin).toString());

  if (cache) {
    try {
      const cached = await cache.match(randomCacheKey);
      if (cached) {
        randomRelatedHtml = await cached.text();
      }
    } catch (e) {}
  }

  if (!randomRelatedHtml) {
    const metaData = await get(url, env, "/data/meta.json");
    const totalPages = Math.ceil((metaData?.total || 26000) / 200);
    const randomPageNum = Math.floor(Math.random() * totalPages) + 1;
    const randomListData = await get(
      url,
      env,
      `/data/list/${randomPageNum}.json`,
    );
    const randomFiles = randomListData?.result?.files || [];
    const randomRelated = randomFiles
      .sort(() => 0.5 - Math.random())
      .slice(0, 20);

    randomRelatedHtml =
      randomRelated.length > 0
        ? buildRandomRelatedHTML(randomRelated, origin)
        : "";

    if (cache && randomRelatedHtml) {
      try {
        const res = new Response(randomRelatedHtml, {
          headers: {
            "Cache-Control": "public, max-age=86400, s-maxage=86400, stale-while-revalidate=86400"
          }
        });
        await cache.put(randomCacheKey, res);
      } catch (e) {}
    }
  }
  */

  const fullBody = body + randomRelatedHtml;

  const meta = {
    description: desc(DESCRIPTIONS.detailMeta, { title: v.t_esc || h(v.t), name: CONFIG.name }),
    image: wpImg(v.sp || v.si, 300),
    canonical: `${origin}${canonicalPath}`,
    type: "article",
    robots: "index, follow",
    keywords: v.tags
      ? v.tags.join(", ")
      : "video Doodstream  , streaming video, Video Viral",
  };

  return render(v.t, fullBody, schema, url, meta);
}

// Helper internal dihapus

// PERBAIKAN: Tambahkan url sebagai parameter
function buildSchema(origin, url, v, related, ids) {
  const {
    publisherId,
    websiteId,
    webpageId,
    videoId,
    articleId,
    breadcrumbId,
    catName,
    catUrl,
    durationISO,
    uploadDate,
    viewCount,
  } = ids;

  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": webpageId,
        url: webpageId,
        name: v.t_esc || h(v.t),
        isPartOf: { "@id": websiteId },
        description: desc(DESCRIPTIONS.detailMeta, { title: v.t_esc || h(v.t), name: CONFIG.name }),
        primaryImageOfPage: {
          "@type": "ImageObject",
          url: wpImg(v.sp || v.si, 1280),
          width: 1280,
          height: 720,
        },
        breadcrumb: { "@id": breadcrumbId },
        datePublished: uploadDate,
        dateModified: uploadDate,
        inLanguage: "id-ID",
      },
      {
        "@type": "VideoObject",
        "@id": videoId,
        name: v.t_esc || h(v.t),
        description: desc(DESCRIPTIONS.detailMeta, { title: v.t_esc || h(v.t), name: CONFIG.name }),
        thumbnailUrl: [wpImg(v.sp || v.si, 1280)],
        uploadDate: uploadDate,
        duration: durationISO,
        contentUrl: v.pe,
        embedUrl: v.pe,
        interactionStatistic: [
          {
            "@type": "InteractionCounter",
            interactionType: { "@type": "WatchAction" },
            userInteractionCount: viewCount,
          },
          {
            "@type": "InteractionCounter",
            interactionType: { "@type": "LikeAction" },
            userInteractionCount: Math.floor(viewCount * 0.1),
          },
        ],
        genre: v.kt
          ? [v.kt, "Viral", "Hiburan"]
          : ["Viral", "Hiburan", "Komedi"],
        publisher: { "@id": publisherId },
        regionsAllowed: "ID",
        isFamilyFriendly: true,
        keywords: v.tags
          ? v.tags.join(", ")
          : "video viral, video terbaru, video trending",
        potentialAction: {
          "@type": "SeekToAction",
          target: `${webpageId}?t={seek_to_second_number}`,
          "startOffset-input": "required name=seek_to_second_number",
        },
      },
      {
        "@type": "Article",
        "@id": articleId,
        headline: v.t_esc || h(v.t),
        description: desc(DESCRIPTIONS.detailMeta, { title: v.t_esc || h(v.t), name: CONFIG.name }),
        image: {
          "@type": "ImageObject",
          url: wpImg(v.sp || v.si, 1280),
          width: 1280,
          height: 720,
        },
        datePublished: uploadDate,
        dateModified: uploadDate,
        author: { 
          "@type": "Person",
          "name": "Admin",
          "url": origin + "/author/admin"
        },
        publisher: { "@id": publisherId },
        mainEntityOfPage: { "@id": webpageId },
        video: { "@id": videoId },
        wordCount: v.ds ? v.ds.split(/\s+/).length : 50,
        articleSection: catName,
        inLanguage: "id-ID",
      },
      {
        "@type": "BreadcrumbList",
        "@id": breadcrumbId,
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Beranda",
            item: origin,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: catName,
            item: catUrl,
          },
          {
            "@type": "ListItem",
            position: 3,
            name: v.t,
            item: webpageId,
          },
        ],
      },
    ],
  };

  if (related.length > 0) {
    schema["@graph"].push({
      "@type": "ItemList",
      "@id": origin + url.pathname + "#related",
      name: "Video Terkait Lainnya",
      description: `Video-video terkait dengan ${v.t}`,
      numberOfItems: related.length,
      itemListElement: related.map((rv, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: `${origin}${videoPath(rv)}`,
        name: rv.t_esc || rv.t || rv.title || `Video ${index + 1}`,
      })),
    });
  }

  return schema;
}

function buildDetailBody(
  v,
  related,
  breadcrumbsHtml,
  duration,
  origin,
  viewCount,
  uploadDate,
  durationISO,
) {

  return `
    ${breadcrumbsHtml}
    
    <article class="player-section" itemscope itemtype="https://schema.org/Article">

        
        <div class="video-wrapper" id="videoContainer">
            <img srcset="${generateSrcset(v.sp || v.si, [320, 640, 960])}"
     sizes="(max-width: 600px) 100vw, 1200px"
     src="${wpImg(v.sp || v.si, 1200)}" 
     alt="${h(v.t)} - ${CONFIG.name}"
     class="video-placeholder" 
     id="mainThumbnail"
     width="1200" 
     height="630" 
     loading="lazy" itemprop="image"
     onerror="this.onerror=null; this.removeAttribute('srcset'); this.src='${IMG_ERR}';">
            <button class="play-overlay" id="playTrigger" aria-label="Putar Video" data-video-url="${v.pe}">
                <div class="play-btn-large"><svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg></div>
            </button>
            <div id="playerFrameContainer" style="display:none; width:100%; height:100%;"></div>
        </div>

        <div class="video-info">
            <h1 class="video-title" itemprop="headline">${v.t_esc}</h1>
            <div class="video-meta">
                <span class="badge" itemprop="author" itemscope itemtype="https://schema.org/Person"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fc0015ff" stroke-width="2"> <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path> <circle cx="12" cy="7" r="4"></circle> </svg> <span itemprop="name">Admin</span></span>
                <span class="badge"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> ${duration}</span>
                <span class="badge"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg> ${v.vw_fmt}</span>
                <span class="badge"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="22" y2="10"/></svg> <time datetime="${uploadDate}" itemprop="datePublished">${v.up_fmt}</time></span>
            </div>
            
            <div class="video-description" itemprop="articleBody">
                <center> <script async data-cfasync="false" data-clbaid="" src="//bartererfaxtingling.com/bn.js"></script>
                <div data-cl-spot="2064816"></div> </center>
                <div class="read-more-content" id="readMoreWrapper">
                    <p><strong>${CONFIG.name}</strong> - ${v.ds_esc || desc(DESCRIPTIONS.detailMeta, { title: v.t_esc, name: CONFIG.name })}</p>
                    <p>${v.tg ? v.tg.map((t) => `<a href="/f/${norm(t).replace(/\s+/g, '-')}" class="tag-link">#${t.replace(/\s+/g, "") || 'Video'}</a>`).join(" ") : ``}</p>
                    <div class="read-more-overlay"></div>
                </div>
                <button class="read-more-btn" id="toggleReadMoreBtn" onclick="toggleReadMore()">Selengkapnya...</button>
            </div>
            <center> <script async data-cfasync="false" data-clbaid="" src="//bartererfaxtingling.com/bn.js"></script>
<div data-cl-spot="2064816"></div> </center>
            <div class="btn-group">
                <a href="/dl/${v.f}" class="btn btn-primary"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> Download Video</a>
                <button class="btn btn-outline" onclick="copyVideoUrl()"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 9V5a3 3 0 0 0-3-3H5a3 3 0 0 0-3 3v6a3 3 0 0 0 3 3h4"/><path d="M18 13v6a3 3 0 0 1-3 3H9a3 3 0 0 1-3-3v-6a3 3 0 0 1 3-3h6a3 3 0 0 1 3 3z"/></svg> Like (${formatNumber(viewCount)})</button>
                <button class="btn btn-outline" onclick="shareVideo()"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg> Share</button>
            </div>
        </div>
    </article>

    <section aria-label="Video terkait">
        
        <h2 class="section-title"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="2.18"/><line x1="8" y1="2" x2="8" y2="22"/><line x1="16" y1="2" x2="16" y2="22"/><line x1="2" y1="8" x2="22" y2="8"/><line x1="2" y1="16" x2="22" y2="16"/></svg> Video Terkait ${v.t_esc}</h2>
        
        <div class="video-grid">
            ${related.map((rv, i) => VideoCard(rv, origin, i)).join("")}
        </div>
    </section>
    `;
}


function buildRandomRelatedHTML(randomRelated, origin) {
  return `
    <section style="margin-top: 2rem;" aria-label="Video rekomendasi ">
        <h2 class="section-title"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg> Video Rekomendasi Lainnya</h2>
        <div class="video-grid">
            ${randomRelated.map((rv, index) => VideoCard(rv, origin, index)).join("")}
        </div>
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
