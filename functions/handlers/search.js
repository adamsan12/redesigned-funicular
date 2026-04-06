import { get } from '../lib/fetch.js';
import { h, norm, p2, p3, wpImg, generateSrcset, formatDuration } from '../lib/utils.js';
import { render } from '../lib/render.js';
import { CONFIG, DESCRIPTIONS, TITLES, desc, IMG_ERR } from '../lib/config.js';
import { Pagination } from '../templates/components/pagination.js';

export async function search(url, env) {
    const parts = url.pathname.split("/");
    const slug = parts[2] ? decodeURIComponent(parts[2]) : "";
    const origin = url.origin;
    const searchQ = url.searchParams.get('q');
    const searchP = url.searchParams.get('page');
    
    // 1. Ekstrak Keyword Dasar
    let rawQ = slug || searchQ || "";
    rawQ = decodeURIComponent(rawQ).replace(/-/g, " ").trim();
    
    // Hapus duplikat kata urutan (case-insensitive)
    const seenWords = new Set();
    rawQ = rawQ.split(/\s+/).filter(w => {
        const lw = w.toLowerCase();
        if (seenWords.has(lw)) return false;
        seenWords.add(lw);
        return true;
    }).join(" ");

    const qSlug = norm(rawQ).replace(/\s+/g, '-').toLowerCase();

    // 2. Ekstrak Page Dasar
    let page = 1;
    if (parts.length === 5 && parts[3] === "page") {
        page = parseInt(parts[4], 10);
    } else if (searchP) {
        page = parseInt(searchP, 10);
    }
    if (isNaN(page) || page < 1) page = 1;

    // 3. SEO REDIRECTS (Force clean path-based URL)
    // Redirect jika: ada query param, ada typo segment selain 'page', ada uppercase, atau akses /page/1
    const isStandardPath = parts.length === 3 || (parts.length === 5 && parts[3] === "page");
    const isCanonicalSlug = slug === qSlug;
    const isCanonicalPage = (page === 1 && parts.length === 3) || (page > 1 && parts.length === 5);

    if (searchQ || searchP || !isStandardPath || !isCanonicalSlug || !isCanonicalPage) {
        let target = `/f/${qSlug}`;
        if (page > 1) target += `/page/${page}`;
        return Response.redirect(origin + target, 301);
        return d || [];
    });

    const datasets = await Promise.all(dataPromises);
    const scoredResults = [];
    const matchedKeywords = new Set();
    const seen = new Set();
    const seenDup = new Set(); // dedup by title+duration
    let hasCompleteKeywordMatch = false;
    let hasExactMatch = false;

    for (const dataset of datasets) {
        for (const item of dataset) {
            // Dedup: skip jika durasi sama persis (agar tidak ada video durasi ganda)
            const rawDur = item.ln || item.length || item.d || '';
            const normDur = rawDur ? (parseInt(rawDur) || 0) : 0;
            
            // Key = durasi saja. Fallback = file_code jika durasi tidak ada atau 0
            const dupKey = normDur > 0 ? `dur_${normDur}` : item.f;
            
            if (seenDup.has(dupKey)) continue;
            seenDup.add(dupKey);

            const titleVal = item.t || item.title || "";
            const tNorm = norm(titleVal);

            let score = 0;
            let matchCount = 0;

            if (tNorm === qNorm) {
                score += 50000;
                hasExactMatch = true;
            } else if (tNorm.includes(qNorm)) {
                score += 5000;
            }

            for (const kw of keywords) {
                if (tNorm.includes(kw)) {
                    matchedKeywords.add(kw);
                    matchCount++;
                    score += 100;
                    if (tNorm.startsWith(kw) || tNorm.includes(" " + kw)) {
                        score += 50;
                    }
                }
            }

            if (matchCount === 0) continue;
            if (matchCount === keywords.length) {
                score += 2000;
                hasCompleteKeywordMatch = true;
            }

            const views = parseInt(item.vw) || 0;
            score += Math.log10(views + 1) * 10;

            scoredResults.push({
                ...item,
                _score: score,
                _views: views
            });
        }
    }

    const activeKeywords = keywords.filter(kw => matchedKeywords.has(kw));
    
    // Redirect logic for cleaning keywords
    if (activeKeywords.length < keywords.length) {
        if (activeKeywords.length === 0) {
            return Response.redirect(origin + "/", 302);
        }
        const cleanedSlug = activeKeywords.map(norm).join("-").toLowerCase();
        if (cleanedSlug !== qSlug) {
            return Response.redirect(`${origin}/f/${cleanedSlug}`, 301);
        }
    }

    if (scoredResults.length === 0) {
        return Response.redirect(origin + "/", 302);
    }

    const sortedResults = scoredResults.sort((a, b) => b._score - a._score || b._views - a._views);
    const totalResults = sortedResults.length;
    const perPage = 50;
    const start = (page - 1) * perPage;
    const end = start + perPage;
    const res = sortedResults.slice(start, end);
    
    // Jika page > 1 tapi tidak ada hasil di slice ini, redirect ke base search URL
    if (page > 1 && res.length === 0) {
        return Response.redirect(`${origin}/f/${qSlug}`, 301);
    }

    const publisherId = `${origin}/#organization`;
    const websiteId = `${origin}/#website`;
    const qUrlSafe = encodeURIComponent(rawQ.replace(/\s+/g, "-")).toLowerCase();
    const webpageId = origin + `/f/${qUrlSafe}` + (page > 1 ? `/page/${page}` : '');

    const searchSchema = buildSearchSchema(origin, qShow, page, webpageId, totalResults, res, start, publisherId, websiteId);

    const body = buildSearchBody(qShow, page, totalResults, res, origin, start, end);

    const escapedQ = h(qShow);

    const metaData = {
        description: `${desc(DESCRIPTIONS.searchMeta, { query: escapedQ, name: CONFIG.name })}${page > 1 ? ` Halaman ${page}.` : ''}`,
        canonical: page === 1 ? `${url.origin}/f/${qUrlSafe}` : `${url.origin}/f/${qUrlSafe}/page/${page}`,
        robots: (page === 1 && rawQ.length >= 3 && (hasExactMatch || totalResults >= 10)) ? "index, follow" : "noindex, follow",
        type: "website",
    };

    const response = render(desc(TITLES.searchPage, { query: escapedQ, total: totalResults, name: CONFIG.name }), body, searchSchema, url, metaData);

    // Apply cache headers only if all keywords match
    if (hasCompleteKeywordMatch) {
        const newHeaders = new Headers(response.headers);
        newHeaders.set('Cache-Control', 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=86400');
        return new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers: newHeaders
        });
    }

    return response;
}

function getRelatedQueries(rawQ, results) {
    const qWords = new Set(norm(rawQ).split(/\s+/));
    const stopwords = new Set([
        'di', 'ke', 'dari', 'pada', 'yang', 'untuk', 'dan', 'atau', 'tapi', 'tetapi', 'dengan', 'oleh', 
        'karena', 'sehingga', 'agar', 'supaya', 'jika', 'kalau', 'apabila', 'walau', 'meski', 'ini', 'itu', 
        'sini', 'situ', 'sana', 'kamu', 'aku', 'saya', 'kita', 'mereka', 'dia', 'beliau', 'anda', 'kalian', 
        'kami', 'engkau', 'kau', 'sebuah', 'suatu', 'sang', 'si', 'para', 'kaum', 'segala', 'seluruh', 
        'semua', 'setiap', 'masing', 'beberapa', 'sedikit', 'banyak', 'adalah', 'ialah', 'merupakan', 
        'menjadi', 'bisa', 'dapat', 'mampu', 'harus', 'wajib', 'perlu', 'hendak', 'akan', 'sedang', 
        'telah', 'sudah', 'pernah', 'belum', 'masih', 'baru', 'hanya', 'cuma', 'sekadar', 'hampir', 
        'nyaris', 'agak', 'cukup', 'terlalu', 'amat', 'sangat', 'benar', 'sungguh', 'ada', 'tidak', 
        'bukan', 'jangan', 'janganlah', 'usah', 'mohon', 'tolong', 'harap', 'silahkan', 'mari', 'ayo', 
        'ayolah', 'wah', 'aduh', 'astaga', 'ya', 'tidak', 'bukan', 'video', 'nonton', 'download', 'link'
    ]);

    // Keywords derived from kw.txt
    const kwSource = [
        'abg', 'indo', 'viral', 'cantik', 'colmek', 'hijab', 'hot', 'mesum', 'sma', 'smp', 'terbaru', 
        'tobat', 'vcs', 'adik kakak', 'binor', 'bocil', 'barat', 'china', 'jepang', 'ngentot', 
        'skandal', 'tante', 'tobrut', 'jilbab', 'mahasiswi', 'memek', 'ngewe', 'pijat plus', 
        'prank ojol', 'sepong', 'simontok', 'syakirah', 'bohay', 'tiktoker', 'vcs hijab', 'xpanas',
        'artis', 'bacol', 'bispak', 'crot', 'gangbang', 'live', 'masturbasi', 'scandal', 'stw', 
        'ukhti', 'ai', 'malay', 'sange', 'janda', 'sub indo', 'toket', 'selingkuh', 'squirt'
    ];

    const wordCounts = {};
    results.slice(0, 20).forEach(item => {
        const title = item.t || item.title || "";
        const words = norm(title).split(/\s+/);
        words.forEach(w => {
            if (w.length > 2 && !qWords.has(w) && !stopwords.has(w)) {
                wordCounts[w] = (wordCounts[w] || 0) + 1;
            }
        });
    });

    const topWords = Object.entries(wordCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(e => e[0]);

    const variations = new Set();
    
    // 1. Prioritize results-based keywords (highly relevant)
    topWords.forEach(w => {
        variations.add(`${rawQ} ${w}`);
    });

    // 2. Fill the rest from kwSource (SEO variety)
    const availableKw = kwSource.filter(k => !qWords.has(k));
    const shuffledKw = availableKw.sort(() => 0.5 - Math.random());
    
    for (const k of shuffledKw) {
        if (variations.size >= 20) break;
        variations.add(`${rawQ} ${k}`);
    }

    return Array.from(variations).slice(0, 20);
}

function buildSearchSchema(origin, rawQ, page, webpageId, totalResults, res, start, publisherId, websiteId) {
    const escapedQ = h(rawQ);
    const pub = {
        "@type": "Organization",
        "name": CONFIG.name,
        "logo": {
            "@type": "ImageObject",
            "url": origin + CONFIG.logo
        }
    };

    const schema = {
        "@context": "https://schema.org",
        "@graph": [
            {
                "@type": "WebPage",
                "name": desc(TITLES.searchPage, { query: escapedQ, total: totalResults, name: CONFIG.name }),
                "description": desc(DESCRIPTIONS.searchMeta, { query: escapedQ, name: CONFIG.name }),
                "url": webpageId,
                "dateModified": new Date().toISOString().split('T')[0]
            },
            {
                "@type": "BreadcrumbList",
                "itemListElement": [
                    {
                        "@type": "ListItem",
                        "position": 1,
                        "name": CONFIG.name,
                        "item": origin
                    },
                    {
                        "@type": "ListItem",
                        "position": 2,
                        "name": "Pencarian",
                        "item": `${origin}/?q=${encodeURIComponent(rawQ).replace(/%20/g, '+')}`
                    },
                    {
                        "@type": "ListItem",
                        "position": 3,
                        "name": escapedQ,
                        "item": webpageId
                    }
                ]
            },
            {
                "@type": "SearchResultsPage",
                "name": `${totalResults} Video Kumpulan ${escapedQ} yang sedang Viral di ${CONFIG.name}`,
                "description": `Temukan video ${escapedQ} terbaru dan terlengkap. ${totalResults} video tersedia untuk streaming dan download gratis di ${CONFIG.name}.`,
                "url": webpageId,
                "mainEntity": {
                    "@type": "ItemList",
                    "name": `Video untuk ${escapedQ}`,
                    "numberOfItems": totalResults,
                    "itemListElement": res.map((v, index) => ({
                        "@type": "ListItem",
                        "position": start + index + 1,
                        "item": {
                            "@id": `${origin}/e/${v.f || v.file_code || v.filecode}#article`
                        }
                    }))
                }
            },
            ...res.map((v) => ({
                "@type": "Article",
                "@id": `${origin}/e/${v.f || v.file_code || v.filecode}#article`,
                "headline": v.t || v.title,
                "description": `Tonton atau download ${v.t || v.title} secara gratis.`,
                "image": [wpImg(v.si || v.sp, 960)],
                "url": `${origin}/e/${v.f || v.file_code || v.filecode}`,
                "datePublished": v.up || v.added || new Date().toISOString(),
                "publisher": pub
            }))
        ]
    };

    return schema;
}

function buildSearchBody(rawQ, page, totalResults, res, origin, start, end) {
    const qEsc = h(rawQ);
    const h1Text = `${totalResults} Video Kumpulan ${qEsc} yang sedang Viral di ${CONFIG.name}`;
    const foundText = `Kumpulan ${totalResults} video ${qEsc} yang sedang viral saat ini di ${CONFIG.name}. Viral Tiktok, Instagram, Twitter, Telagram VIP Terbaru Gratis `;
    
    // Tambah konten artikel unik untuk SEO
    const articleContent = `
    <div class="search-article" style="margin-bottom: 2rem; padding: 1.5rem; background: hsl(var(--card)); border: 1px solid hsl(var(--border)); border-radius: var(--radius);">
        <h2 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 1rem; color: hsl(var(--foreground));">Temukan Video ${qEsc} Terbaru dan Terlengkap</h2>
        <p style="color: hsl(var(--foreground)); line-height: 1.6; margin-bottom: 1rem;">
            Pencarian Anda untuk "${qEsc}" telah menemukan ${totalResults} video viral yang sedang tren saat ini. 
            Di ${CONFIG.name}, kami menyediakan koleksi video streaming gratis dengan kualitas HD tanpa iklan yang mengganggu. 
            Dari video TikTok yang viral hingga konten eksklusif dari platform seperti Doodstream dan Lulustream, 
            semua tersedia untuk ditonton kapan saja.
        </p>
        <p style="color: hsl(var(--foreground)); line-height: 1.6; margin-bottom: 1rem;">
            Video ${qEsc} ini mencakup berbagai kategori mulai dari asupan viral, skandal terbaru, hingga konten hiburan premium. 
            Setiap video telah diverifikasi untuk memastikan kualitas terbaik dan durasi yang memuaskan. 
            Jika Anda mencari link download atau streaming cepat, ${CONFIG.name} adalah pilihan tepat untuk pengalaman nonton yang maksimal.
        </p>
        <p style="color: hsl(var(--foreground)); line-height: 1.6;">
            Jelajahi lebih lanjut dengan pencarian terkait di bawah ini, atau gunakan fitur search kami untuk menemukan konten yang lebih spesifik. 
            Nikmati hiburan tanpa batas di ${CONFIG.name}!
        </p>
    </div>
    `;
    
    // Generate related queries
    const related = getRelatedQueries(rawQ, res);
    const relatedHtml = related.length > 0 ? `
    <div class="related-searches" style="margin-top: 2.5rem; padding: 1.5rem; background: hsl(var(--muted)/0.3); border-radius: 0.75rem; border: 1px solid hsl(var(--border));">
        <h2 style="font-size: 1.125rem; font-weight: 600; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem;">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m21 21-4.3-4.3"/><circle cx="10" cy="10" r="7"/><path d="M7 10h6"/></svg>
            Pencarian Terkait:
        </h2>
        <div style="display: flex; flex-wrap: wrap; gap: 0.75rem;">
            ${related.map(r => `<a href="/f/${norm(r).replace(/\s+/g, '-')}" class="tag-link" style="padding: 0.4rem 0.8rem; background: hsl(var(--background)); border: 1px solid hsl(var(--border)); border-radius: 2rem; font-size: 0.875rem; color: hsl(var(--foreground)); text-decoration: none; transition: all 0.2s;" onmouseover="this.style.borderColor='hsl(var(--primary))'; this.style.color='hsl(var(--primary))'" onmouseout="this.style.borderColor='hsl(var(--border))'; this.style.color='hsl(var(--foreground))'">${h(r)}</a>`).join("")}
        </div>
    </div>
    ` : '';

    return `
    <section>
        <h1 class="section-title" itemprop="name">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            ${h1Text}${page > 1 ? ` - Halaman ${page}` : ''}
        </h1>
        <p style="color: hsl(var(--muted-foreground)); font-size: 0.875rem; margin-bottom: 1rem;">${foundText}${page > 1 ? ` - Halaman ${page}` : ''}</p>
        
        ${articleContent}
        
        <div class="video-grid">
            ${res.map((v, index) => VideoCard(v, origin, start + index)).join("")}
        </div>

        ${relatedHtml}
        
        ${Pagination(page, totalResults, 50, "/f/", rawQ)}
    </section>
    `;
}

function VideoCard(v, origin, i) {
    const duration = formatDuration(v.ln || v.length || v.d);
    const titleVal = v.t || v.title || 'Video';
    const titleEsc = v.t_esc || h(titleVal);
    const thumb = v.si || v.sp || v.single_img || v.splash_img || '';
    const views = v.vw_fmt || v.vw || v.views || "0";
    const uploadVal = v.up || v.added || null;
    const uploadDate = uploadVal || new Date().toISOString();
    const formattedDate = uploadVal ? new Date(uploadVal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : 'baru';
    const filecode = v.f || v.file_code || v.filecode;

    return `
    <article class="video-card" itemscope itemtype="https://schema.org/Article">
        <meta itemprop="url" content="${origin}/e/${filecode}">
        <meta itemprop="image" content="${wpImg(thumb, 960)}">
        <a href="/e/${filecode}" class="video-card-link" title="${titleEsc}" aria-label="Tonton video: ${titleEsc}" style="display: block; text-decoration: none; color: inherit;" itemprop="url">
            <div class="card-thumb">
                <img
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
                <h3 class="card-title" itemprop="headline">${titleEsc}</h3>
                <div class="card-stats">
                    <span style="text-transform: capitalize;">${v.kt || 'Video'}</span> • 
                    <time datetime="${uploadDate}" title="Diupload pada ${formattedDate}">${formattedDate}</time>
                </div>
            </div>
        </a>
    </article>
    `;
}

