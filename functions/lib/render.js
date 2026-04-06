// functions/lib/render.js
import { BaseLayout } from '../templates/layouts/base.js';

function minifyCSS(css) {
    return css
        .replace(/\/\*[\s\S]*?\*\//g, '')       // Remove CSS comments
        .replace(/\s+/g, ' ')                    // Collapse whitespace
        .replace(/\s*([{}:;,>~+])\s*/g, '$1')   // Remove space around selectors/braces/etc
        .replace(/;}/g, '}')                     // Remove last semicolon before }
        .replace(/^\s+|\s+$/g, '');              // Trim
}

function minifyJS(js) {
    return js
        .replace(/\/\*[\s\S]*?\*\//g, '') // Remove block comments
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0 && !line.startsWith('//'))
        .join('\n')
        .replace(/([{,;(=\-+*/&|<>!?:\[])\n+/g, '$1') // Safely remove newline after open operators/brackets
        .replace(/\n+([},;)\].,])/g, '$1');           // Safely remove newline before close brackets/punctuation
}

function minifyHTML(html) {
    const preserved = [];

    // Minify CSS inside <style> tags
    html = html.replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gi, (match, css) => {
        return `<style>${minifyCSS(css)}</style>`;
    });

    // Preserve JS inside script (and minify it); preserve pre, code, textarea
    html = html.replace(/<(pre|code|script|textarea)([^>]*)>([\s\S]*?)<\/\1>/gi, (match, tag, attrs, content) => {
        if (tag.toLowerCase() === 'script') {
            content = minifyJS(content);
        }
        preserved.push(`<${tag}${attrs}>${content}</${tag}>`);
        return `<!--PRESERVED_${preserved.length - 1}-->`;
    });

    html = html
        .replace(/<!--(?!\[if|PRESERVED)[\s\S]*?-->/g, '')  // Remove HTML comments (keep IE conditionals and PRESERVED markers)
        .replace(/\s+/g, ' ')                       // Collapse all whitespace to single space
        .replace(/>\s+</g, '><')                    // Remove whitespace between tags
        .replace(/\s+>/g, '>')                      // Remove whitespace before closing >
        .replace(/\s+\/>/g, '/>')                   // Remove whitespace before self-closing />
        .trim();

    // Restore preserved blocks
    html = html.replace(/<!--PRESERVED_(\d+)-->/g, (_, i) => preserved[i]);

    return html;
}

export function render(t, b, schema, url, meta = {}) {
    const html = minifyHTML(BaseLayout(t, b, schema, url, meta));
    return new Response(html, {
        headers: { "content-type": "text/html; charset=utf-8" }
    });
}