// functions/lib/config.js
export const CONFIG = {
    name: "Video Viral",
    logo: "/images/logo.png",
    description: "Nonton Video Viral Terbaru Gratis Full HD 720p.",
    foundingDate: "2024-01-01",
    socialMedia: [
        "https://www.facebook.com/videostream",
        "https://twitter.com/videostream",
        "https://www.instagram.com/videostream"
    ],
    version: "1.0.1"
};

// Template deskripsi — gunakan {title}, {name}, {page}, {query}, {total}
export const DESCRIPTIONS = {
    // Welcome page
    welcomeMeta: `Selamat datang di {name}. Platform streaming video viral terbaru dan terlengkap dengan koleksi video berkualitas tinggi.`,
    // Detail page
    detailMeta: `Nonton video {title} terbaru. Streaming video viral dan terbaru hanya di {name}.`,
    // Search page
    searchMeta: `Hasil pencarian video untuk '{query}' di {name}. Temukan video viral dan terbaru.`,
    // List page
    listMeta: `Daftar video terbaru koleksi {name} - Halaman {page}. Platform streaming video viral terlengkap.`,
    // Download page
    downloadMeta: `Download video {title} gratis di {name}.`,
};

// Template judul — gunakan {title}, {name}, {page}, {query}, {total}
export const TITLES = {
    // Welcome page
    welcomePage: `Selamat Datang di {name}`,
    // Search page
    searchPage: `Kumpulan {total} Video {query}`,
    // List page
    listPage: `Daftar Video - Halaman {page}`,
    // Download page
    downloadPage: `Download {title}`,
};

// Helper: replace placeholders
export function desc(template, vars = {}) {
    let s = template;
    for (const [k, v] of Object.entries(vars)) {
        s = s.replaceAll(`{${k}}`, v);
    }
    return s;
}

export const CATEGORIES = [
    { name: "Bokep Viral", slug: "bokep-viral" },
    { name: "Bokep Pelajar", slug: "bokep-pelajar" },
    { name: "Video Ngentot", slug: "video-ngentot" },
    { name: "Bokep Perawan", slug: "bokep-perawan" },
    { name: "Jilbab Mesum", slug: "jilbab-mesum" },
    { name: "Prank Ojol", slug: "prank-ojol" },
    { name: "Pijat Plus", slug: "pijat-plus" },
    { name: "Mbah Maryono", slug: "mbah-maryono" },
    { name: "Toket Bagus", slug: "toket-bagus" },
    { name: "Video Mesum", slug: "video-mesum" },
    { name: "Jilbab Viral", slug: "jilbab-viral" },
    { name: "Abg Mesum", slug: "abg-mesum" },
    { name: "Tante Yona", slug: "tante-yona" },
    { name: "Janda Muda", slug: "janda-muda" },
    { name: "Open Bo", slug: "open-bo" },
    { name: "Bebasindo", slug: "bebasindo" },
    { name: "Sepong Kontol", slug: "sepong-kontol" },
    { name: "Hijab Tobrut", slug: "hijab-tobrut" },
    { name: "Tante Sange", slug: "tante-sange" },
    { name: "Abg Viral", slug: "abg-viral" },
    { name: "Skandal Mesum", slug: "skandal-mesum" },
    { name: "Cewek Colmek", slug: "cewek-colmek" },
    { name: "Doggy Style", slug: "doggy-style" },
    { name: "Tante Bohay", slug: "tante-bohay" },
    { name: "Cewek Semok", slug: "cewek-semok" },
    { name: "Msbreewc", slug: "msbreewc" },
    { name: "Cewek Tobrut", slug: "cewek-tobrut" },
    { name: "Janda Sange", slug: "janda-sange" },
    { name: "Bokep Jepang", slug: "bokep-jepang" },
    { name: "Bokepsatset", slug: "bokepsatset" },
    { name: "Doodstream", slug: "doodstream" },
    { name: "Dood Tele", slug: "dood-tele" },
    { name: "Cantik Tobrut", slug: "cantik-tobrut" },
    { name: "Memeksiana", slug: "memeksiana" },
    { name: "Susu Gede", slug: "susu-gede" },
    { name: "Adik Kakak", slug: "adik-kakak" },
    { name: "Simontok", slug: "simontok" },
    { name: "Bokep Indo", slug: "bokep-indo" },
    { name: "Bokep STW", slug: "bokep-stw" },
    { name: "Video Lokal", slug: "video-lokal" }
];

export const IMG_ERR = 'data:image/svg+xml,%3Csvg%20width=%22320%22%20height=%22180%22%20viewBox=%220%200%20320%20180%22%20xmlns=%22http://www.w3.org/2000/svg%22%3E%3Crect%20width=%22320%22%20height=%22180%22%20fill=%22%23FEF2F2%22/%3E%3Ctext%20x=%22160%22%20y=%2290%22%20text-anchor=%22middle%22%20dominant-baseline=%22middle%22%20fill=%22%23F87171%22%20style=%22font-family:sans-serif;font-size:14px;font-weight:bold%22%3EIMAGE%20ERROR%3C/text%3E%3C/svg%3E';
