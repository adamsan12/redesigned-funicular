import { render } from "../lib/render.js";
import { CONFIG, DESCRIPTIONS, TITLES, desc } from "../lib/config.js";

export async function welcome(url, env) {
  const origin = url.origin;
  const publisherId = `${origin}/#organization`;
  const websiteId = `${origin}/#website`;
  const webpageId = origin + url.pathname;

  const welcomeSchema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": publisherId,
        name: CONFIG.name,
        url: origin,
        logo: {
          "@type": "ImageObject",
          url: origin + CONFIG.logo,
        },
        sameAs: CONFIG.socialMedia,
        foundingDate: CONFIG.foundingDate,
        description: CONFIG.description,
      },
      {
        "@type": "WebSite",
        "@id": websiteId,
        url: origin,
        name: CONFIG.name,
        publisher: { "@id": publisherId },
        description: CONFIG.description,
        inLanguage: "id-ID",
        potentialAction: {
          "@type": "SearchAction",
          target: {
            "@type": "EntryPoint",
            urlTemplate: `${origin}/f/{search_term_string}`,
          },
          "query-input": "required name=search_term_string",
        },
      },
      {
        "@type": "WebPage",
        "@id": webpageId,
        url: webpageId,
        name: `${CONFIG.name} - Selamat Datang`,
        isPartOf: { "@id": websiteId },
        description: desc(DESCRIPTIONS.welcomeMeta, { name: CONFIG.name }),
        inLanguage: "id-ID",
      },
    ],
  };

  const body = buildWelcomeBody(origin);

  const metaData = {
    description: desc(DESCRIPTIONS.welcomeMeta, { name: CONFIG.name }),
    canonical: url.origin,
    robots: "index, follow",
    type: "website",
    showCategories: false,
  };

  return render(desc(TITLES.welcomePage, { name: CONFIG.name }), body, welcomeSchema, url, metaData);
}

function buildWelcomeBody(origin) {
  return `
    <section class="welcome-section" style="text-align: center; padding: 3rem 1rem; max-width: 800px; margin: 0 auto;">
        <div class="welcome-header" style="margin-bottom: 2rem;">
            <h1 style="font-size: 2.5rem; font-weight: 700; margin-bottom: 1rem; color: hsl(var(--foreground));">
                Selamat Datang di ${CONFIG.name}
            </h1>
            <p style="font-size: 1.1rem; color: hsl(var(--muted-foreground)); line-height: 1.6; margin-bottom: 2rem;">
                Temukan ribuan video viral terbaru dari berbagai kategori favorit. Streaming gratis tanpa iklan dengan kualitas HD terbaik.
            </p>
        </div>

        <div class="welcome-actions" style="display: flex; flex-direction: column; gap: 1rem; align-items: center; margin-bottom: 3rem;">
            <a href="/list/" class="btn btn-primary" style="padding: 1rem 2rem; font-size: 1.1rem; font-weight: 600; text-decoration: none; display: inline-flex; align-items: center; gap: 0.5rem;">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
                </svg>
                Jelajahi Video Terbaru
            </a>

            <div class="search-section" style="width: 100%; max-width: 500px; margin-top: 1rem;">
                <form action="/f/" method="get" onsubmit="event.preventDefault(); var v=this.q.value.trim().toLowerCase().replace(/\s+/g,'-'); if(v) window.location.href='/f/'+encodeURIComponent(v)" style="display: flex; gap: 0.5rem;">
                    <input
                        type="search"
                        name="q"
                        placeholder="Cari video..."
                        required
                        style="flex: 1; padding: 0.75rem 1rem; border: 1px solid hsl(var(--border)); border-radius: var(--radius); background: hsl(var(--secondary)); color: hsl(var(--foreground)); font-size: 1rem;"
                    >
                    <button type="submit" class="btn btn-outline" style="padding: 0.75rem 1.5rem; display: flex; align-items: center; gap: 0.5rem;">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                        </svg>
                        Cari
                    </button>
                </form>
            </div>
        </div>

        <div class="welcome-features" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 2rem; margin-bottom: 3rem;">
            <div class="feature-card" style="background: hsl(var(--card)); border: 1px solid hsl(var(--border)); border-radius: var(--radius); padding: 1.5rem; text-align: center;">
                <div style="color: hsl(var(--primary)); margin-bottom: 1rem;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <polygon points="5 3 19 12 5 21 5 3"/>
                    </svg>
                </div>
                <h3 style="font-size: 1.25rem; font-weight: 600; margin-bottom: 0.5rem; color: hsl(var(--foreground));">Koleksi Video Lengkap</h3>
                <p style="color: hsl(var(--muted-foreground)); font-size: 0.9rem; line-height: 1.5;">
                    Nikmati ribuan video berkualitas tinggi dari berbagai kategori favorit Anda.
                </p>
            </div>

            <div class="feature-card" style="background: hsl(var(--card)); border: 1px solid hsl(var(--border)); border-radius: var(--radius); padding: 1.5rem; text-align: center;">
                <div style="color: hsl(var(--primary)); margin-bottom: 1rem;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                    </svg>
                </div>
                <h3 style="font-size: 1.25rem; font-weight: 600; margin-bottom: 0.5rem; color: hsl(var(--foreground));">Pencarian Cepat</h3>
                <p style="color: hsl(var(--muted-foreground)); font-size: 0.9rem; line-height: 1.5;">
                    Temukan video yang Anda cari dengan fitur pencarian canggih dan filter yang mudah.
                </p>
            </div>

            <div class="feature-card" style="background: hsl(var(--card)); border: 1px solid hsl(var(--border)); border-radius: var(--radius); padding: 1.5rem; text-align: center;">
                <div style="color: hsl(var(--primary)); margin-bottom: 1rem;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="9" y1="9" x2="15" y2="15"/><line x1="15" y1="9" x2="9" y2="15"/>
                    </svg>
                </div>
                <h3 style="font-size: 1.25rem; font-weight: 600; margin-bottom: 0.5rem; color: hsl(var(--foreground));">Gratis & Bebas Iklan</h3>
                <p style="color: hsl(var(--muted-foreground)); font-size: 0.9rem; line-height: 1.5;">
                    Tonton semua video tanpa gangguan iklan, cepat dan tanpa biaya tersembunyi.
                </p>
            </div>
        </div>

        <div class="welcome-footer" style="border-top: 1px solid hsl(var(--border)); padding-top: 2rem;">
            <p style="color: hsl(var(--muted-foreground)); font-size: 0.9rem;">
                © 2026 ${CONFIG.name}. Dibuat dengan ❤️ untuk pengalaman menonton terbaik.
            </p>
        </div>
    </section>
    `;
}