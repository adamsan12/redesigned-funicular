import { CONFIG, CATEGORIES } from '../../lib/config.js';

export function Header(origin) {
    const halfIndex = Math.ceil(CATEGORIES.length / 2);
    const headerCategories = CATEGORIES.slice(0, halfIndex);
    
    return `
    <header role="banner">
        <div class="container header-content">
            <a href="/" class="logo" aria-label="${CONFIG.name} - Halaman Utama">
                <img src="${CONFIG.logo}" alt="${CONFIG.name} logo" width="140" height="32" decoding="async" loading="eager">
                <span>${CONFIG.name}</span>
            </a>

            <nav class="nav-links" aria-label="Navigasi utama" role="navigation">
                <a href="/" style="display: flex; align-items: center; gap: 4px;">
                    <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                    Beranda
                </a>
                <a href="/f/jav-sub-indo">Jav Sub Indo</a>
                 <a href="/f/bokep-indo">Bokep Indo</a>
                  <a href="/f/bokep-indo"> Bokep Indo</a>
                <div class="dropdown">
                    <button class="dropbtn" aria-haspopup="true" aria-expanded="false" style="background:none;border:none;color:inherit;font:inherit;cursor:pointer;padding:inherit;">Kategori</button>
                 
                    <div class="dropdown-content" role="menu">
                        ${headerCategories.map(cat => `<a href="/f/${cat.slug}" role="menuitem">${cat.name}</a>`).join('\n                        ')}
                    </div>
                </div>
               
            </nav>

            <div class="actions">
                <button class="icon-btn" id="searchBtn" aria-label="Cari video">
                    <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                </button>
                <button class="icon-btn" id="themeToggle" aria-label="Ganti Tema">
                    <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" id="themeIcon" data-lucide="sun"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
                </button>
                <button class="icon-btn mobile-menu-btn" id="mobileMenuBtn" aria-label="Menu">
                    <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
                </button>
            </div>
        </div>
    </header>
    `;
}
