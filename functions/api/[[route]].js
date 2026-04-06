/**
 * Cloudflare Pages Functions - API Router dengan Batch Sharding
 * Handler untuk /api/list, /api/search, dan /api/info
 *
 * Detail Structure (Batch Sharding):
 * - /data/detail/00.json sampai ff.json (256 files max)
 * - Setiap file berisi array dari multiple video objects
 * - Diakses via MD5 hash dari file_code
 */

import { withCache } from "../lib/cache.js";
import { CONFIG } from "../lib/config.js";

function getServerTime() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

function apiResponse(status, msg, result) {
  return {
    status,
    msg,
    result,
    server_time: getServerTime(),
    version: CONFIG.version,
  };
}


async function handleRequest(context) {
  const { request } = context;
  const url = new URL(request.url);
  const path = url.pathname;
  const params = url.searchParams;

  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "X-API-Version": CONFIG.version,
    // Edge/browser cache control: allow public caching at edge and browsers for 1 day
    // s-maxage used by shared caches (Cloudflare), max-age by browsers
    "Cache-Control":
      "public, max-age=86400, s-maxage=86400, stale-while-revalidate=3600",
  };

  try {
    // 1. ENDPOINT: /api/list?page=1&per_page=50
    if (path === "/api/list") {
      let page = parseInt(params.get("page") || "1", 10);
      let per_page = parseInt(params.get("per_page") || "50", 10);

      // Validation
      if (isNaN(page) || page < 1) page = 1;
      if (isNaN(per_page) || per_page < 1) per_page = 50;

      const target = `${url.origin}/data/list/${page}.json`;
      try {
        const res = await fetch(target);
        if (res.ok) {
          const data = await res.json();
          if (data && data.result && Array.isArray(data.result.files)) {
            let filesArray = data.result.files;
            
            // Re-calculate pagination across the fetched 50-items chunk if per_page is arbitrary
            // (Assuming data/list/X.json actually holds 50 items already for that page)
            // But if per_page < 50, we just slice the beginning.
            if (per_page && per_page !== 50) {
                 if (per_page < 50) {
                     filesArray = filesArray.slice((page - 1) * per_page % 50, ((page - 1) * per_page % 50) + per_page);
                 } else {
                     filesArray = filesArray.slice(0, per_page); // Just return what we have in this single chunk (up to 50)
                 }
            }

            data.result.files = filesArray.map(file => {
              const lengthSecs = typeof file.ln === 'number' ? String(file.ln) : "0";
              return {
                download_url: file.download_url || "",
                api_source: (file.download_url && file.download_url.includes("lulu")) ? "lulustream" : "doodstream",
                single_img: file.si || "",
                file_code: file.f || "",
                canplay: file.canplay !== undefined ? file.canplay : 0,
                length: lengthSecs,
                views: String(file.vw || "0"),
                uploaded: file.up || "",
                public: file.public !== undefined ? String(file.public) : "1",
                fld_id: file.fld_id || "",
                title: file.t || ""
              };
            });
            
            // Update per_page in the response metadata if we sliced or it was requested
            data.result.per_page = per_page;
          }
          data.version = CONFIG.version;
          data.server_time = getServerTime();
          return new Response(JSON.stringify(data), { headers });
        } else {
          return new Response(JSON.stringify(apiResponse(404, "Data tidak ditemukan", [])), { status: 404, headers });
        }
      } catch (err) {
        return new Response(JSON.stringify(apiResponse(500, "Error fetching data", [])), { status: 500, headers });
      }
    }

    // 2. ENDPOINT: /api/search?q=keyword
    if (path === "/api/search") {
      let q = params.get("q") || "";
      q = q.trim().toLowerCase();
      
      let page = parseInt(params.get("page") || "1", 10);
      let perPage = parseInt(params.get("per_page") || "50", 10);
      
      // Validation
      if (isNaN(page) || page < 1) page = 1;
      if (isNaN(perPage) || perPage < 1) perPage = 50;
      
      const generateEmptySearch = () => ({
        server_time: getServerTime(), status: 200, msg: "OK", 
        result: [], total_results: 0, page: page, per_page: perPage, total_pages: 0 
      });

      if (!q) {
        return new Response(JSON.stringify(generateEmptySearch()), { headers });
      }

      // 1. Normalisasi Keyword
      const keywords = q
        .split(/\s+/)
        .map((kw) => kw.replace(/[^a-z0-9]/g, ""))
        .filter((kw) => kw.length > 0);

      if (keywords.length === 0) {
        return new Response(JSON.stringify(generateEmptySearch()), { headers });
      }


      try {
        // 2. Tentukan shard mana yang akan dibuka (Batch Sharding)
        // Kita ambil 2 karakter pertama dari kata kunci utama
        const primaryPrefix = keywords[0].substring(0, 2).padEnd(2, "a");

        // Helper function untuk fetch dari prefix (support subfolder)
        async function getAllItemsFromPrefix(prefix) {
          const items = [];
          const prefixCacheKey = `prefix:${prefix}`;

          // 1. Coba fetch dari file langsung: /data/index/{prefix}.json
          try {
            const res = await fetch(`${url.origin}/data/index/${prefix}.json`);
            if (res.ok) {
              const data = await res.json();
              if (Array.isArray(data)) items.push(...data);
            }
          } catch (e) {
            // File tidak ada, lanjut ke subfolder
          }

          // 2. Coba fetch dari subfolder: /data/index/{prefix}/{prefix}xx.json
          try {
            const suffixes = [];
            // a-z
            for (let i = 0; i < 26; i++) {
              suffixes.push(String.fromCharCode(97 + i));
            }
            // __ (underscore)
            suffixes.push("__");

            const subfolderPromises = suffixes.map(async (suffix) => {
              try {
                const res = await fetch(
                  `${url.origin}/data/index/${prefix}/${prefix}${suffix}.json`,
                );
                if (res.ok) return await res.json();
              } catch (e) {
                return [];
              }
              return [];
            });

            const subfolderResults = await Promise.all(subfolderPromises);
            for (const result of subfolderResults) {
              if (Array.isArray(result)) items.push(...result);
            }
          } catch (e) {
            // No subfolder, sudah fetch dari file langsung
          }


          return items;
        }

        let combinedPool = [];

        // 3. Fetch dari primary prefix (dengan subfolder support)
        combinedPool = await getAllItemsFromPrefix(primaryPrefix);

        // 4. Deduplication sebelum scoring (Fix untuk video duplikat HANYA berdasarkan durasi)
        const seenKeys = new Set();
        const deduplicatedPool = combinedPool.filter((item) => {
          if (!item) return false;
          
          const fc = item.f || item.file_code || '';
          const dur = parseInt(item.ln || item.length || item.d || 0) || 0;
          
          // Key dedup = durasi saja. Jika durasi tidak ada, fallback ke file_code
          const dupKey = dur > 0 ? `dur_${dur}` : fc;
          if (dupKey) {
            if (seenKeys.has(dupKey)) return false;
            seenKeys.add(dupKey);
          }
          return true;
        });

        // 5. Filtering Logic (OR Logic dengan Scoring)
        // Item dapat match dengan minimal 1 keyword, dengan scoring berdasarkan jumlah match
        const scoredEntries = deduplicatedPool
          .map((item) => {
            if (!item || !item.t) return { item, score: 0, matchCount: 0 };

            const titleLower = item.t.toLowerCase();
            let totalScore = 0;
            let matchCount = 0;

            keywords.forEach((kw, idx) => {
              const pos = titleLower.indexOf(kw);
              if (pos !== -1) {
                matchCount++;
                
                // Base score: 100 for each keyword match
                let keywordScore = 100;

                // Bonus for exact match
                if (titleLower === kw) keywordScore += 500;
                
                // Bonus for starting with keyword (especially the first keyword)
                if (pos === 0) {
                  keywordScore += (idx === 0 ? 300 : 150);
                }

                // Word boundary bonus (simple check)
                const isWordStart = pos === 0 || titleLower[pos - 1] === ' ';
                const isWordEnd = pos + kw.length === titleLower.length || titleLower[pos + kw.length] === ' ';
                if (isWordStart && isWordEnd) {
                  keywordScore += 200; // Whole word match
                } else if (isWordStart) {
                  keywordScore += 100; // Starts a word
                }

                // Position bonus (higher score if it appears earlier)
                keywordScore += Math.max(0, 50 - pos);

                totalScore += keywordScore;
              }
            });

            return {
              item,
              score: totalScore,
              hasAll: matchCount === keywords.length,
              matchCount: matchCount
            };
          })
          .filter((entry) => entry.matchCount > 0) // minimal 1 match (OR logic)
          .sort((a, b) => {
            // Prioritaskan yang match semua keyword dulu
            if (a.hasAll && !b.hasAll) return -1;
            if (!a.hasAll && b.hasAll) return 1;
            // Lalu sort berdasarkan total score
            return b.score - a.score;
          });

        // 5. Mapping Kembali Format API Search (Dengan Paginasi)
        const startIndex = (page - 1) * perPage;
        const endIndex = startIndex + perPage;
        
        const finalResults = scoredEntries.slice(startIndex, endIndex).map((entry) => {
          const video = entry.item;
          // `ln` sudah integer detik dari static index
          const lengthSecs = typeof video.ln === 'number' ? String(video.ln) : "0";
          return {
            single_img: video.si || "",
            length: lengthSecs,
            views: String(video.vw || "0"),
            title: video.t || "",
            file_code: video.f || "",
            uploaded: video.up || "",
            splash_img: video.sp || "",
            canplay: 0,
            api_source: video.as || "",
            relevance: entry.score
          };
        });

        const searchResponse = {
          server_time: getServerTime(),
          status: 200,
          msg: "OK",
          result: finalResults,
          total_results: scoredEntries.length,
          page: page,
          per_page: perPage,
          total_pages: Math.ceil(scoredEntries.length / perPage) || 0,
          version: CONFIG.version
        };


        return new Response(JSON.stringify(searchResponse), { headers });
      } catch (err) {
        return new Response(JSON.stringify(generateEmptySearch()), { headers });
      }
    }

    // 3. ENDPOINT: /api/info?file_code=xxx[&raw=true]
    if (path === "/api/info") {
      const fcode = params.get("file_code") || "";
      const raw = params.get("raw") === "true";

      if (!fcode) {
        return new Response(
          JSON.stringify(apiResponse(400, "file_code dibutuhkan", [])),
          { status: 400, headers },
        );
      }

      // Get MD5 shard (00-ff)
      const shard = await getMD5Prefix(fcode);

      // If raw=true, redirect to static shard file (minimize function requests)
      if (raw) {
        const target = `${url.origin}/data/detail/${shard}.json`;
        return Response.redirect(target, 302);
      }



      const shardRes = await fetch(`${url.origin}/data/detail/${shard}.json`);
      if (!shardRes.ok) {
        return new Response(
          JSON.stringify(apiResponse(404, "Video tidak ditemukan", [])),
          { status: 404, headers },
        );
      }

      const shardData = await shardRes.json();

      // Find specific video dalam batch shard
      if (!Array.isArray(shardData)) {
        return new Response(
          JSON.stringify(apiResponse(500, "Invalid shard format", [])),
          { status: 500, headers },
        );
      }

      const video = shardData.find((v) => v.f === fcode);
      if (!video) {
        return new Response(
          JSON.stringify(apiResponse(404, "Video tidak ditemukan", [])),
          { status: 404, headers },
        );
      }

      // Map shortened keys back to full names for API response
      const sizeParsed = parseFloat(video.sz) || 0;
      const lengthParsed = typeof video.ln === 'number' ? video.ln : 0;

      const fullData = {
        filecode: video.f || "",
        size: sizeParsed,
        status: 200,
        protected_embed: video.pe || "",
        uploaded: video.up || "",
        last_view: video.lv || "",
        canplay: 0,
        protected_dl: video.pd || "",
        single_img: video.si || "",
        title: video.t || "",
        views: String(video.vw || "0"),
        length: lengthParsed || 0,
        splash_img: video.sp || "",
        api_source: video.as || ""
      };


      return new Response(JSON.stringify(apiResponse(200, "OK", [fullData])), {
        headers,
      });
    }

    // 4. ENDPOINT: /api/random?count=1
    if (path === "/api/random") {
      let count = parseInt(params.get("count") || "30", 10);
      if (isNaN(count) || count < 1) count = 30;
      if (count > 30) count = 30;

      // 1. Get total pages from 1.json
      let totalPages = 132; // Default fallback
      try {
        const firstPageRes = await fetch(`${url.origin}/data/list/1.json`);
        if (firstPageRes.ok) {
          const firstPageData = await firstPageRes.json();
          if (firstPageData && firstPageData.result && firstPageData.result.total_pages) {
            totalPages = firstPageData.result.total_pages;
          }
        }
      } catch (e) {
        /* ignore */
      }

      // 2. Pick a random page
      const randomPage = Math.floor(Math.random() * totalPages) + 1;
      const target = `${url.origin}/data/list/${randomPage}.json`;

      try {
        const res = await fetch(target);
        if (res.ok) {
          const data = await res.json();
          if (data && data.result && Array.isArray(data.result.files)) {
            let filesArray = data.result.files;

            // Pick 'count' random unique items
            let selected = [];
            let indices = Array.from({ length: filesArray.length }, (_, i) => i);
            for (let i = 0; i < count && indices.length > 0; i++) {
              let idx = Math.floor(Math.random() * indices.length);
              selected.push(filesArray[indices[idx]]);
              indices.splice(idx, 1);
            }

            const finalResults = selected.map((file) => {
              const lengthSecs = typeof file.ln === 'number' ? String(file.ln) : "0";
              return {
                download_url: file.download_url || "",
                api_source:
                  file.download_url && file.download_url.includes("lulu")
                    ? "lulustream"
                    : "doodstream",
                single_img: file.si || "",
                file_code: file.f || "",
                canplay: file.canplay !== undefined ? file.canplay : 0,
                length: lengthSecs,
                views: String(file.vw || "0"),
                uploaded: file.up || "",
                public: file.public !== undefined ? String(file.public) : "1",
                fld_id: file.fld_id || "",
                title: file.t || "",
              };
            });

            return new Response(
              JSON.stringify(apiResponse(200, "OK", finalResults)),
              { headers },
            );
          }
        }
        return new Response(
          JSON.stringify(apiResponse(404, "Data tidak ditemukan", [])),
          { status: 404, headers },
        );
      } catch (err) {
        return new Response(
          JSON.stringify(apiResponse(500, "Error fetching random data", [])),
          { status: 500, headers },
        );
      }
    }


    return new Response(
      JSON.stringify(apiResponse(404, "Endpoint tidak ditemukan", [])),
      { status: 404, headers },
    );
  } catch (err) {
    return new Response(
      JSON.stringify(apiResponse(500, "Internal Server Error", [])),
      { status: 500, headers },
    );
  }
}

export async function onRequest(context) {
  return withCache(context.request, () => handleRequest(context));
}

async function getMD5Prefix(text) {
  try {
    const msgUint8 = new TextEncoder().encode(text);
    const hashBuffer = await crypto.subtle.digest("SHA-256", msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    return hashHex.substring(0, 2);
  } catch (e) {
    // Fallback jika crypto.subtle tidak tersedia
    return text.substring(0, 2).toLowerCase().padEnd(2, "0");
  }
}
