import { CONFIG, CATEGORIES } from '../../lib/config.js';

export function MobileMenu() {
    return `
    <style>
        .mobile-dropdown {
            width: 100%;
            border-bottom: 1px solid var(--border-color, #333);
        }
        .mobile-dropdown summary {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 16px;
            cursor: pointer;
            color: var(--text-color, #fff);
            list-style: none; /* Hide default triangle */
        }
        .mobile-dropdown summary::-webkit-details-marker {
            display: none;
        }
        .mobile-dropdown[open] .dropdown-arrow {
            transform: rotate(180deg);
        }
        .dropdown-arrow {
            transition: transform 0.2s ease;
        }
        .mobile-dropdown-content {
            display: flex;
            flex-direction: column;
            background-color: var(--nav-bg-hover, #2a2a2a);
            padding: 8px 0;
        }
        .mobile-dropdown-content a {
            padding: 12px 16px 12px 48px; /* Indent sub-items */
            font-size: 0.95rem;
            color: var(--text-muted, #ccc);
            text-decoration: none;
            display: block;
            border-bottom: none;
        }
        .mobile-dropdown-content a:hover {
            color: var(--accent, #e50914);
            background-color: rgba(255,255,255,0.05);
        }
    </style>
    <div class="menu-overlay" id="menuOverlay"></div>

    <aside class="mobile-menu" id="mobileMenu">
        <div class="mobile-menu-header">
            <span class="mobile-menu-title">
                <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 8px;"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
                Menu
            </span>
            <button class="icon-btn" id="closeMobileMenu" aria-label="Tutup Menu">
                <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
        </div>
        
        <nav class="mobile-menu-links" aria-label="Menu navigasi mobile">
            <a href="/">
                <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                Beranda
            </a>
            <a href="/f/populer">
                <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 6 13.5 15.5 8 10 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
                Populer
            </a>
            
            <details class="mobile-dropdown">
                <summary>
                    <div style="display: flex; align-items: center;">
                        <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
                        <span style="margin-left: 12px; font-weight: 500;">Kategori</span>
                    </div>
                    <svg aria-hidden="true" class="dropdown-arrow" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
                </summary>
                <div class="mobile-dropdown-content">
                    ${CATEGORIES.map(cat => `<a href="/f/${cat.slug}">${cat.name}</a>`).join('\n                    ')}
                </div>
            </details>
            <a href="/f/terbaru">
                <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                Terbaru
            </a>
        </nav>
        
        <div class="mobile-menu-footer">
            <p>&copy; ${new Date().getFullYear()} ${CONFIG.name}</p>
            <p style="font-size: 0.7rem; margin-top: 4px;">v${CONFIG.version}</p>
        </div>
    </aside>
    `;
}
