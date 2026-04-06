export function SearchModal() {
    return `
    <div class="modal" id="searchModal" role="dialog" aria-modal="true" aria-label="Pencarian video">
        <div class="modal-content">
            <button class="close-modal" id="closeSearch" aria-label="Tutup pencarian">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
            <h3 style="font-weight: 700; font-size: 0.9375rem;">Cari Video</h3>
            <form class="search-form" role="search" action="/f/" method="get" onsubmit="event.preventDefault(); var v=this.q.value.trim().toLowerCase().replace(/\\s+/g,'-'); if(v) window.location.href='/f/'+encodeURIComponent(v)">
                <label for="searchInput" class="sr-only" style="position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;">Cari video</label>
                <input type="search" name="q" id="searchInput" class="search-input" placeholder="Ketik kata kunci..." aria-label="Kata kunci pencarian" autocomplete="off" autofocus>
                <button type="submit" class="btn btn-primary">Cari</button>
            </form>
        </div>
    </div>
    `;
}
