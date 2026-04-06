import { CONFIG, CATEGORIES } from '../../lib/config.js';

export function Footer() {
    const year = new Date().getFullYear();
    const halfIndex = Math.ceil(CATEGORIES.length / 2);
    const footerCategories = CATEGORIES.slice(halfIndex);

    return `
    <footer role="contentinfo">
        <div class="container">
            <nav class="footer-links" aria-label="Kategori populer" style="display:flex;flex-wrap:wrap;gap:8px 16px;justify-content:center;margin-bottom:12px;font-size:0.8125rem;">
                ${footerCategories.map(cat => `<a href="/f/${cat.slug}" style="color:hsl(var(--muted-foreground));text-decoration:none;">${cat.name}</a>`).join('')}
            </nav>
            <p><small>&copy; ${year} ${CONFIG.name}. All rights reserved. - Nonton dan Download Video Bokep Viral Tiktok, Instagram, Twitter, Telagram VIP Terbaru Gratis</small></p>
        </div>
    </footer>
    `;
}
