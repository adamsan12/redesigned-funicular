import { h } from '../../lib/utils.js';

export function Breadcrumbs(catName, catUrl, title, webpageId) {
    return `
    <nav class="breadcrumbs" aria-label="Breadcrumb" itemscope itemtype="https://schema.org/BreadcrumbList">
        <a href="/" itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem">
            <span itemprop="name">Beranda</span>
            <meta itemprop="item" content="${webpageId.split('/').slice(0, 3).join('/')}/">
            <meta itemprop="position" content="1">
        </a> / 
        <a href="${catUrl}" itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem">
            <span itemprop="name">${h(catName)}</span>
            <meta itemprop="item" content="${catUrl}">
            <meta itemprop="position" content="2">
        </a> / 
        <span itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem">
            <span itemprop="name">${h(title)}</span>
            <meta itemprop="item" content="${webpageId}">
            <meta itemprop="position" content="3">
        </span>
    </nav>
    `;
}
