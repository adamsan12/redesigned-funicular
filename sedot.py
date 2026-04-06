 # sedot.py
import asyncio
import json
import os
import time
import random
import re
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Optional
import sys
import urllib.parse
import argparse  # for command line options

# Try to import aiohttp, install if not available
try:
    import aiohttp
except ImportError:
    print("📦 Installing aiohttp...")
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "aiohttp"])
    import aiohttp

# ============================================================================
# CONSTANTS AND CONFIGURATION
# ============================================================================

# ============ OPTIMIZED FOR LOCAL EXECUTION ============
# These can be aggressive since running on local machine (unlimited)
DATA_PER_PAGE = 30
MAX_INDEXED_VIDEOS = 50000  # Maksimal video untuk search index
SEARCH_PREFIX_LEN = 2
PREFIX2_LIMIT = 500

# ========== CONFIGS OPTIMIZED FOR LOCAL ==========
CONFIGS = {
    'doodstream': {
        'api_url': 'https://doodapi.co/api/file/list',
        'api_key': '112623ifbcbltzajwjrpjx',
        'per_page': 200,
        'request_delay': 0.2,        # Reduced from 0.5 (local safe)
        'max_retries': 3,
        'concurrent_requests': 3     # Reduced from 5 (respectful to API)
    },
    'lulustream': {
        'api_url': 'https://api.lulustream.com/api/file/list',
        'api_key': '37943j35tc5i1bg3gje5y',
        'per_page': 500,
        'request_delay': 0.2,        # Reduced from 0.5 (local safe)
        'max_retries': 3,
        'concurrent_requests': 3     # Reduced from 5 (respectful to API)
    }
}

# ============================================================================
# BLOCKED TITLE PATTERNS - Skip videos matching these patterns
# ============================================================================

BLOCKED_TITLE_PATTERNS = [
    re.compile(p, re.IGNORECASE) for p in [
        r'anak\s+kecil',
        r'bocil',
        r'pedofil',
        r'\bsd\b',
        r'bawah\s+umur',
        r'dibawah\s+umur',
        r'kids?',
        r'child',
        r'bayi',
        r'balita',
        r'toddler',
        r'baby',
        r'junior',
        r'pre-?school',
        r'paud',
        r'tk',
        r'sd\s+kelas',
        r'sekolah\s+dasar',
        r'childhood',
        r'teen',
        r'belia',
        r'underage',
        r'minor',
        r'pemerkosaan',
        r'incest',
        r'sodomi',
        r'kekerasan\s+anak',
    ]
]

SKIP_WORDS = set([
    'di', 'ke', 'dari', 'pada', 'yang', 'untuk', 'dan', 'atau', 'tapi', 'tetapi',
    'dengan', 'oleh', 'karena', 'sehingga', 'agar', 'supaya', 'jika', 'kalau',
    'apabila', 'walau', 'meski', 'walaupun', 'meskipun', 'sementara',
    'sedang', 'ketika', 'saat', 'setelah', 'sebelum', 'hingga', 'sampai',
    'demi', 'lewat', 'melalui', 'via', 'tanpa', 'sejak', 'selama', 'ketika',
    'sambil', 'seraya', 'biar', 'meski', 'meskipun', 'agar', 'supaya',
    'atas', 'bawah', 'depan', 'belakang', 'samping', 'dalam', 'luar',
    'antara', 'sekitar', 'sebelah', 'hadap', 'tepi', 'pinggir', 'ujung',
    'kah', 'lah', 'tah', 'pun', 'nya',
    'se', 'ber', 'ter', 'me', 'pe', 'per', 'mem', 'pen', 'peng', 'men',
    'pem', 'pel', 'ber', 'ter', 'ke', 'di', 'per', 'se', 'meng', 'meny',
    'memper', 'mempert', 'diper', 'terper',
    'kan', 'an', 'i', 'nya', 'ku', 'mu',
    'ini', 'itu', 'sini', 'situ', 'sana', 'kamu', 'aku', 'saya', 'kita',
    'mereka', 'dia', 'beliau', 'anda', 'kalian', 'kami', 'engkau', 'kau',
    'beliau', 'nya',
    'sebuah', 'suatu', 'sang', 'si', 'para', 'kaum', 'segala', 'seluruh',
    'semua', 'setiap', 'masing', 'beberapa', 'sedikit', 'banyak', 'semua',
    'adalah', 'ialah', 'merupakan', 'menjadi', 'bisa', 'dapat', 'mampu',
    'harus', 'wajib', 'perlu', 'hendak', 'akan', 'sedang', 'telah', 'sudah',
    'pernah', 'belum', 'masih', 'baru', 'hanya', 'cuma', 'sekadar', 'hampir',
    'nyaris', 'agak', 'cukup', 'terlalu', 'amat', 'sangat', 'benar', 'sungguh',
    'ada', 'tidak', 'bukan', 'jangan', 'janganlah', 'usah', 'jangan',
    'mohon', 'tolong', 'harap', 'silahkan', 'mari', 'ayo', 'ayolah',
    'wah', 'aduh', 'astaga', 'ya', 'tidak', 'bukan',
    'dalam', 'oleh', 'pada', 'sebagai', 'bagi', 'menurut', 'tentang',
    'mengenai', 'atas', 'bawah', 'depan', 'belakang', 'samping', 'antara',
    'di', 'ke', 'dari', 'demi', 'hingga', 'sampai', 'selama', 'sementara',
    'seraya', 'ketika', 'sewaktu', 'sebelum', 'sesudah', 'setelah', 'sejak',
    'tatkala', 'selagi', 'sedangkan', 'sambil', 'seraya', 'biar', 'meski',
    'walau', 'walaupun', 'meskipun', 'supaya', 'agar', 'untuk', 'guna',
    'dengan', 'tanpa', 'via', 'lewat', 'melalui', 'oleh', 'sebab', 'karena',
    'lantas', 'lalu', 'kemudian', 'maka', 'oleh_karena', 'sehingga',
    'maka_dari', 'adapun', 'akan', 'bahwa', 'bahwasanya', 'sebab', 'jika',
    'kalau', 'apabila', 'andai', 'andaikata', 'seandainya', 'seumpama',
    'seakan', 'seolah', 'ibarat', 'sebagaimana', 'seperti', 'bagai',
    'laksana', 'daripada', 'alih', 'daripada',
    'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan',
    'sembilan', 'sepuluh', 'seratus', 'seribu', 'sejuta', 'pertama',
    'kedua', 'ketiga', 'keempat', 'kelima',
])

# ============================================================================
# DATA NORMALIZER CLASS - FIXED VERSION
# ============================================================================

class DataNormalizer:
    # Class-level statistics to aggregate across all instances
    _stats = {
        'total': 0,
        'unique_first': 0,
        'regenerated': 0,
        'duplicate_failed': 0
    }

    # Internal pools for natural language generation
    _intros = [
        "Tengah menjadi perbincangan hangat,", "Banyak dicari oleh netizen,", "Video yang satu ini sedang viral,",
        "Jangan lewatkan tayangan ini,", "Simak video terbaru yang lagi trending,", "Koleksi pilihan untuk hari ini,",
        "Update terbaru yang sangat menarik,", "Bagi Anda penikmat konten viral,", "Inilah video yang sedang naik daun,",
        "Menampilkan momen yang tak terduga,", "Rekomendasi tontonan buat Anda,", "Baru saja rilis dan langsung viral,",
        "Banyak yang penasaran dengan konten ini,", "Koleksi terbaru dari archive kami,", "Video populer minggu ini,"
    ]
    
    _sentiments = [
        "sangat seru untuk disaksikan.", "memberikan sensasi yang berbeda.", "membuat siapa saja penasaran.",
        "benar-benar memanjakan mata.", "patut masuk dalam daftar tontonan Anda.", "menampilkan kualitas konten terbaik.",
        "sangat direkomendasikan untuk Anda.", "menghibur dan penuh kejutan.", "menjadi favorit banyak orang saat ini.",
        "kualitasnya tidak perlu diragukan lagi.", "bikin nagih buat ditonton ulang.", "menyuguhkan alur yang menarik.",
        "cocok menemani waktu santai Anda.", "menghadirkan pengalaman menonton yang unik.", "sangat memuaskan untuk ditonton."
    ]
    
    _descriptors = [
        "kualitas visual yang jernih", "resolusi gambar yang sangat baik", "tampilan video yang memukau",
        "detail yang sangat jelas", "format high definition yang mantap", "sinematografi yang apik",
        "kualitas audio visual yang seimbang", "tampilan yang sangat smooth", "pencahayaan yang pas",
        "konten berkualitas premium", "produksi video yang sangat rapi", "efek visual yang natural"
    ]
    
    _connectors = [
        "Selain itu,", "Menariknya lagi,", "Tidak hanya itu,", "Hadir dengan,", "Di sisi lain,",
        "Lebih lanjut,", "Bahkan,", "Kabarnya,", "Secara khusus,", "Terlebih lagi,",
        "Sebagai tambahan,", "Uniknya,", "Pastinya,", "Yang jelas,", "Menarik untuk disimak,"
    ]
    
    _outros = [
        "Segera nikmati konten ini sebelum ketinggalan update selanjutnya.",
        "Pastikan Anda menonton sampai selesai untuk melihat keseruannya.",
        "Jangan lupa untuk berbagi pengalaman menonton Anda dengan yang lain.",
        "Simpan link video ini agar mudah ditemukan kembali nanti.",
        "Konten ini diperbarui secara berkala untuk kepuasan Anda.",
        "Nikmati waktu santai Anda dengan tayangan berkualitas ini.",
        "Terima kasih telah mempercayai kami sebagai sumber hiburan Anda.",
        "Selalu ada kejutan baru setiap harinya di platform kami.",
        "Sampai jumpa di update video viral berikutnya.",
        "Tetaplah bersama kami untuk konten berkualitas lainnya."
    ]

    _tech_phrases = [
        "Video ini memiliki durasi {length} dengan ukuran file sekitar {size}.",
        "Hadir dengan durasi total {length}, konten ini berkapasitas {size}.",
        "Anda bisa menikmati tayangan sepanjang {length} ini dalam ukuran {size}.",
        "Data teknis menunjukkan durasi {length} dan besar file mencapai {size}.",
        "Dibungkus dalam durasi {length}, video berukuran {size} ini sangat efisien.",
        "Durasi tayang: {length}. Ukuran penyimpanan: {size}.",
        "Menyuguhkan durasi {length} dengan pemakaian kuota sekitar {size}."
    ]

    _tag_labels = [
        "Tags:", "Keywords:", "Kata Kunci:", "Label Terkait:", "Pencarian:", 
        "Hashtags:", "Kategori:", "Informasi Terkait:", "Topik:", "Relevansi:"
    ]

    _faq_questions = [
        "Bagaimana cara menonton {title} secara lengkap?",
        "Di mana link download {title} yang masih aktif?",
        "Apakah video {title} ini memiliki kualitas HD?",
        "Kapan video {title} ini pertama kali viral?",
        "Siapa saja yang terlibat dalam video {title} ini?",
        "Mengapa {title} menjadi sangat populer di media sosial?",
        "Di platform mana {title} bisa disaksikan tanpa iklan?",
        "Apakah ada kelanjutan dari video {title} ini?"
    ]

    _intent_phrases = [
        "pencarian video viral terbaru", "koleksi asupan viral sosmed", "link nonton video bokeh museum",
        "update skandal viral hari ini", "video viral durasi full tanpa sensor", "download video viral tercepat",
        "nonton streaming video populer", "kumpulan video viral telegram terbaru"
    ]

    def __init__(self):
        self.seo_data = self.load_seo_data()

    def load_seo_data(self) -> Dict[str, List[str]]:
        """Load SEO data from .txt files"""
        data = {
            'key': [],
            'kw': [],
            'cta': [],
            'domain': [],
            'tg': []
        }
        
        files = {
            'key': 'key.txt',
            'kw': 'kw.txt',
            'cta': 'cta.txt',
            'domain': 'domain.txt',
            'tg': 'tg.txt'
        }
        
        for key, filename in files.items():
            try:
                path = Path(filename)
                if path.exists():
                    with open(path, 'r', encoding='utf-8', errors='ignore') as f:
                        if key == 'tg':
                            # tg.txt is often a single line of comma-separated tags
                            content = f.read().strip()
                            if content:
                                data[key] = [t.strip() for t in content.split(',') if t.strip()]
                        else:
                            # Other files are one entry per line
                            data[key] = [line.strip() for line in f if line.strip()]
                else:
                    print(f"⚠️ Warning: {filename} not found. Using empty list for {key}.")
            except Exception as e:
                print(f"❌ Error loading {filename}: {e}")
                
        return data

    def strip_blocked_words(self, title: str) -> str:
        """Remove blocked words/phrases from title"""
        if not title:
            return ''
        cleaned = title
        for pattern in BLOCKED_TITLE_PATTERNS:
            cleaned = pattern.sub('', cleaned)
        # Collapse multiple spaces
        cleaned = re.sub(r'\s+', ' ', cleaned).strip()
        return cleaned

    def _clean_text(self, text: str) -> str:
        """
        Helper method to apply consistent cleaning to any text.
        This ensures all text goes through the same normalization process.
        """
        if not text:
            return ''
        
        # Add space before capital letters following lowercase
        cleaned = re.sub(r'([a-z])([A-Z])', r'\1 \2', text)
        
        # Replace special characters within words with spaces (include digits)
        cleaned = re.sub(r'([a-zA-Z0-9])[^a-zA-Z0-9\s]+([a-zA-Z0-9])', r'\1 \2', cleaned)
        
        # Remove remaining special characters
        cleaned = re.sub(r'[^a-zA-Z0-9\s]', '', cleaned)
        
        # Filter useless numbers
        words = cleaned.split()
        cleaned_words = []
        for i, word in enumerate(words):
            if word.isdigit():
                if word in ['2024', '2025', '2026']:
                    cleaned_words.append(word)
                elif i > 0 and words[i-1].lower() == 'part':
                    cleaned_words.append(word)
                else:
                    continue
            else:
                cleaned_words.append(word)
                
        cleaned = ' '.join(cleaned_words)
        
        # Replace multiple spaces and trim
        cleaned = re.sub(r'\s+', ' ', cleaned).strip()
        
        return cleaned

    def clean_and_format_title(self, title: str, seen_titles: set = None) -> str:
        """
        Clean and format title with enhanced natural SEO strategy.
        Uses dynamic structures and probabilistic components to avoid spam patterns.
        """
        if not title:
            return ''
        
        # Strip blocked words and initial cleaning
        base_title_clean = self.strip_blocked_words(title)
        base_title_clean = self._clean_text(base_title_clean)
        base_title_clean = base_title_clean.title()
        
        DataNormalizer._stats['total'] += 1
        
        final_clean_title = base_title_clean
        success = False
        
        # Try to make it unique (max 10 attempts)
        for attempt in range(10):
            # Components with individual probability (for natural feel - don't always add everything)
            prefix = self.get_title_prefixes(1)[0] if random.random() > 0.3 else ""
            seo_phrase = self.get_seo_keywords(1)[0] if random.random() > 0.4 else ""
            suffix = self.get_title_suffixes(1)[0] if random.random() > 0.3 else ""
            brand = self.get_random_words(1)[0] if random.random() > 0.5 else ""
            
            # Select a random title structure (to avoid bot pattern detection)
            structures = [
                f"{prefix} {base_title_clean} {seo_phrase} {suffix} {brand}",
                f"{base_title_clean} {seo_phrase} {prefix} {suffix} {brand}",
                f"{prefix} {base_title_clean} {brand} {suffix}",
                f"{base_title_clean} {suffix} {seo_phrase} {brand}",
                f"{prefix} {base_title_clean} {seo_phrase}",
                f"Tonton {base_title_clean} {suffix} {brand}",
                f"{base_title_clean} ({seo_phrase}) {brand}"
            ]
            
            new_title = random.choice(structures).strip()
            
            # Final cleaning and title casing
            new_title = self._clean_text(new_title)
            new_title = new_title.title()
            
            # Final word processing (deduplicate words within title)
            words = new_title.split()
            # Preserve order but remove case-insensitive duplicates (e.g. "Viral viral" -> "Viral")
            unique_words = []
            for w in words:
                if w.lower() not in [uw.lower() for uw in unique_words]:
                    unique_words.append(w)
            
            # Limit word count for human readability (SEO Best Practice: 15 words max for natural flow)
            candidate_title = ' '.join(unique_words[:15]).strip()
            
            # Check uniqueness if seen_titles is provided
            if seen_titles is not None:
                slug = self.generate_slug(candidate_title)
                if slug not in seen_titles:
                    final_clean_title = candidate_title
                    success = True
                    if attempt == 0:
                        DataNormalizer._stats['unique_first'] += 1
                    else:
                        DataNormalizer._stats['regenerated'] += 1
                    break
            else:
                # If no seen_titles check needed, return immediately
                final_clean_title = candidate_title
                success = True
                break
        
        if not success:
            DataNormalizer._stats['duplicate_failed'] += 1
                
        return final_clean_title
    
    def get_title_prefixes(self, count: int) -> List[str]:
        """Get random title prefixes from the list"""
        prefixes = [
            "Video Viral", "Video Terbaru", "Update Lagi", "Nonton Video", "Asupan Video", 
            "Koleksi Video", "Nonton Bareng", "Video Trending", "Link Viral", "Update Hari Ini",
            "Video Populer", "Video Pilihan", "Wajib Nonton", "Video Hot", "Link Terbaru",
            "Update Viral", "Video Mantap", "Cek Video", "Tonton Sekarang", "Video Asli",
            "Viral Sekarang", "Bocoran Video", "Full Durasi", "Tanpa Sensor", "Link Terabox", 
            "Doodstream Viral", "Lulustream Terbaru", "Simontok Update", "Bokepindo Viral", "Skandal Terbaru",
            "Video Syakirah", "Video Tobrut", "Link Telegram", "Grup Viral", "Asupan Malam", 
            "Video Bokeh", "Bokeh Museum", "Video Museum", "Viral Sosmed", "Viral Tiktok",
            "Update 2026", "Rilis Terbaru", "Video Premium", "Eksklusif Video", "Video Rahasia", 
            "Link Alternatif", "Download Video", "Streaming Viral", "Video HD", "Kualitas Jernih",
            "Video Rekomendasi", "Video Terlaris", "Video Paling Dicari", "Video Bikin Nagih", "Video Penasaran", 
            "Update Setiap Hari", "Update Tiap Jam", "Video Baru Rilis", "Video Fresh", "Nonton Bebas",
            "Video Viral Indo", "Video Viral Barat", "Video Viral Jepang", "Skandal Viral", "Video Mesum",
            "Video Bokep Viral", "Video Pemersatu", "Link Gacor", "Video Full HD", "Nonton Gratis",
            "Koleksi Terbaru", "Daftar Video", "Video Update", "Video Eksklusif", "Video Paling Hot"
        ]
        random.shuffle(prefixes)
        return prefixes[:count]

    def get_title_suffixes(self, count: int) -> List[str]:
        """Get random title suffixes for long-tail enhancement"""
        suffixes = [
            "Download Gratis", "Nonton Online", "Full Durasi", "Tanpa Sensor", "Link Mediafire",
            "Link Terabox", "Update Hari Ini", "Full HD Quality", "Streaming Cepat", "Link Alternatif",
            "Koleksi Terbaru", "Bocoran Viral", "Link Telegram Viral", "Grup WA Viral", "Asupan Terbaru",
            "Nonton Tanpa Iklan", "Link Video Asli", "Video Viral Sosmed", "Bikin Penasaran", "Viral Banget",
            "Tonton Sampai Habis", "Momen Langka", "Kejadian Viral", "Video Terpopuler", "Lagi Trend"
        ]
        random.shuffle(suffixes)
        return suffixes[:count]

    def get_random_words(self, count: int) -> List[str]:
        """Get random brands/platforms for context (raw, will be cleaned later)"""
        words = [
            'Sotwe', 'Wiki', 'wikidood', 'Bokepin', 'Dood', 'Twitter', 'Bokepsatset',
            'Simontok','Yandex', 'Xpanas', 'Doodstream', 'Bokepsin', 'Link Asupan', 
            'Bebasindo', 'Pekoblive', 'Terabox', 'Streaming', 'Videy', 'Link Telegram', 
            'Tiktok', 'Telegram', 'Poophd', 'Bokepindo', 'Links Tele', 'Dodstream', 
            'Link Pemersatu', 'DoodViral', 'Lulustream', 'Website', 'Doodsflix', 'Yakwad', 
            'Doodflix', 'Doodstreem', 'Pejuang Lendir', 'Popstream', 'Staklam', 'Bokepind', 
            'Video Bokep', 'Bokep31', 'Toketbagus', 'DoodsPro', 'Bokepin', 'DoodTele', 'Memeksiana'
        ]
        random.shuffle(words)
        return words[:count]

    def get_seo_keywords(self, count: int) -> List[str]:
        """Get random Long-tail SEO keywords/phrases from the list"""
        seo_list = [
            "Full Video Terbaru Viral 2026", "Tonton Full Durasi Tanpa Sensor", "Link Download Terbaru Tanpa Iklan",
            "Video Viral TikTok Paling Dicari", "Koleksi Video Bokeh Museum Viral", "Bocoran Video Viral Hari Ini",
            "Update Link Video Viral Terbaru", "Nonton Video Full HD Jernih", "Link Video Viral Telegram Terbaru",
            "Video Skandal Viral Paling Hot", "Full Video Viral Sosmed Hari Ini", "Link Download Video Viral Tercepat",
            "Video Viral Update Setiap Jam", "Koleksi Video Viral Terlengkap 2026", "Link Video Viral Mediafire Terbaru",
            "Nonton Video Viral Tanpa Buffering", "Video Viral Paling Banyak Dicari", "Link Grup Video Viral Terbaru",
            "Video Viral Terbaru Rilis Hari Ini", "Tonton Video Viral Paling Mantap", "Link Video Viral Bokepindo Terbaru",
            "Full Video Viral Durasi Panjang", "Video Viral Terbaru Kualitas 4K", "Link Video Viral Doodstream Terbaru",
            "Nonton Video Viral Paling Seru", "Update Video Viral Viral Banget", "Link Video Viral Lulustream Terbaru",
            "Video Viral Paling Hot Sekarang", "Full Video Viral Tanpa Potongan", "Link Video Viral Terabox Terbaru"
        ]
        # Keep original list but add more long-tail phrases
        original_seo = [
            "Full Video", "Video Full", "Full Terbaru", "Terbaru 2026", "Viral Sekarang", "Viral Banget",
            "Super Viral", "Trending Video", "Video Trending", "Lagi Viral", "Update Terbaru", "Baru Rilis",
            "Paling Dicari", "Paling Hot", "Paling Baru", "Full HD", "Full Percakapan", "Full Tanpa Sensor",
            "Link Langsung", "Download Gratis", "Gratis Full", "Koleksi Lengkap", "Paket Lengkap", "Full Collection",
            "Exclusive Full", "Premium Video", "Raw Video", "Uncut Full", "Leak Video", "Bocoran Full",
            "Private Video", "Real Couple", "Amateur Video", "Viral Video", "Asupan Viral", "Asupan Terbaru",
            "Asupan Hot", "Full Asupan", "Asupan Full HD", "Terbaru Viral", "Viral Full Video", "Full Video Terbaru"
        ]
        seo_list.extend(original_seo)
        random.shuffle(seo_list)
        return seo_list[:count]
    
    def parse_duration(self, duration) -> int:
        if isinstance(duration, (int, float)):
            return int(duration)
        
        if isinstance(duration, str):
            parts = list(reversed(duration.split(':')))
            seconds = 0
            for idx, val in enumerate(parts):
                seconds += int(val) * (60 ** idx)
            return seconds
        
        return 0
    
    def parse_size_to_bytes(self, size_value) -> int:
        """Convert size from string with units (e.g., '608.00 MB') to bytes (integer)"""
        if isinstance(size_value, int):
            return size_value
        
        if isinstance(size_value, str):
            # Remove spaces and convert to uppercase
            size_str = size_value.strip().upper()
            
            # Extract number and unit
            import re
            match = re.match(r'([0-9.]+)\s*(BYTES|KB|MB|GB|TB)?', size_str)
            if match:
                number = float(match.group(1))
                unit = match.group(2) or 'BYTES'
                
                # Convert to bytes
                multipliers = {
                    'BYTES': 1,
                    'KB': 1024,
                    'MB': 1024 ** 2,
                    'GB': 1024 ** 3,
                    'TB': 1024 ** 4
                }
                
                return int(number * multipliers.get(unit, 1))
        
        return 0
    
    def duration_to_iso8601(self, seconds: int) -> str:
        """Convert duration in seconds to ISO 8601 format PT[M]M[S]S"""
        if seconds <= 0:
            return "PT10M30S"
        
        minutes = seconds // 60
        remaining_seconds = seconds % 60
        
        if minutes > 0 and remaining_seconds > 0:
            return f"PT{minutes}M{remaining_seconds}S"
        elif minutes > 0:
            return f"PT{minutes}M"
        else:
            return f"PT{remaining_seconds}S"
    
    def proxy_img(self, url: str) -> str:
        """Return image URL without proxy"""
        if not url:
            return ""
        if url.startswith('data:'):
            return url
        return url
    
    def format_number(self, num) -> str:
        """Format number (views) to K/M format"""
        if not num:
            return '0'
        try:
            num = int(num)
        except (ValueError, TypeError):
            return str(num)
            
        if num >= 1000000:
            return f"{(num/1000000):.1f}M"
        if num >= 1000:
            return f"{(num/1000):.1f}K"
        return str(num)

    def format_date(self, uploaded: str, format_type='full') -> str:
        """Format ISO date to Indonesian format"""
        if not uploaded:
            return ''
        try:
            # Handle possible 'Z' suffix
            dt_str = uploaded.replace('Z', '+00:00')
            dt = datetime.fromisoformat(dt_str)
            # Basic month mapping for Indonesian
            months = ["", "Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"]
            
            if format_type == 'full':
                return f"{dt.day} {months[dt.month]} {dt.year}"
            elif format_type == 'short':
                return f"{dt.day} {months[dt.month]}"
        except Exception:
            return uploaded
        return uploaded

    def generate_slug(self, text: str) -> str:
        """Generate URL-friendly slug"""
        if not text:
            return "video"
            
        # Apply skip words filtering
        words = text.split()
        filtered = [w for w in words if w.lower() not in SKIP_WORDS]
        if filtered:
            text = ' '.join(filtered)
            
        # Mirror of JS norm() function but for slugs
        norm = text.lower()
        norm = re.sub(r'[^a-z0-9\s]', ' ', norm)
        norm = re.sub(r'\s+', ' ', norm).strip()
        return norm.replace(' ', '-')

    def html_escape(self, text: str) -> str:
        """Basic HTML escaping"""
        if not text:
            return ""
        return (text.replace('&', '&amp;')
                    .replace('<', '&lt;')
                    .replace('>', '&gt;')
                    .replace('"', '&quot;')
                    .replace("'", '&#39;'))
    
    def format_size(self, size_bytes: int) -> str:
        """Format size from bytes to human readable format (MB/GB)"""
        if size_bytes <= 0:
            return "0.00 B"
        
        units = ['B', 'KB', 'MB', 'GB', 'TB']
        index = 0
        size = float(size_bytes)
        
        while size >= 1024 and index < len(units) - 1:
            size /= 1024
            index += 1
            
        return f"{size:.2f} {units[index]}"

    def format_duration(self, seconds: int) -> str:
        """Format duration in seconds to HH:MM:SS"""
        if seconds <= 0:
            return "00:00:00"
        
        hours = seconds // 3600
        minutes = (seconds % 3600) // 60
        remaining_seconds = seconds % 60
        
        return f"{hours:02d}:{minutes:02d}:{remaining_seconds:02d}"

    def generate_description(self, video_data: Dict) -> str:
        """Generate a human-like, dynamic, and unique SEO description for maximum natural flow"""
        # Ensure we use a clean title for the description (avoid keyword stuffing)
        raw_title = video_data.get('title', 'Unknown Title')
        title = self.strip_blocked_words(raw_title)
        
        uploaded = self.format_date(video_data.get('uploaded', ''), 'full') or 'baru-baru ini'
        size = video_data.get('size', 'Unknown Size')
        length = video_data.get('length', 'Unknown Duration')
        
        # 1. Component Selection
        # Get random components from loaded SEO data (.txt files)
        key_phrase = random.choice(self.seo_data['key']) if self.seo_data['key'] else "Video Viral"
        kw_phrase = random.choice(self.seo_data['kw']) if self.seo_data['kw'] else "Streaming Video"
        cta_phrase = random.choice(self.seo_data['cta']) if self.seo_data['cta'] else "Nonton sekarang"
        domain_name = random.choice(self.seo_data['domain']) if self.seo_data['domain'] else "Video Kita"
        
        # 2. Dynamic Phrase Construction
        parts = []
        
        # Intro Paragraph
        if random.random() > 0.2:
            intro = random.choice(self._intros)
            parts.append(f"{intro} {title} ({key_phrase}) {random.choice(self._sentiments)}")
        else:
            parts.append(f"{title} ({key_phrase}) {random.choice(self._sentiments)}")

        # Technical Data & Quality
        tech_base = random.choice(self._tech_phrases)
        tech_sentence = tech_base.format(length=length, size=size)
        parts.append(f"{random.choice(self._connectors)} {tech_sentence} Konten ini diunggah pada {uploaded} dan memiliki {random.choice(self._descriptors)}.")

        # FAQ & Intent
        intent = random.choice(self._intent_phrases)
        raw_faq = random.choice(self._faq_questions)
        faq_snippet = raw_faq.replace("{title}", title)
        
        if random.random() > 0.3:
            parts.append(f"Mungkin Anda bertanya, {faq_snippet} Tenang saja, {domain_name} adalah platform terbaik untuk {intent}. {random.choice(self._connectors)} {kw_phrase} ini dipastikan memuaskan.")
        else:
            parts.append(f"Informasi {intent}: {faq_snippet} {cta_phrase} segera di {domain_name}!")

        # Final Polish & Call to Action
        parts.append(f"{random.choice(self._outros)} {cta_phrase}!")

        # Tags with Dynamic Labels
        tags_pool = self.seo_data['tg'] if self.seo_data['tg'] else ['video', 'viral', 'terbaru']
        num_tags = min(len(tags_pool), random.randint(12, 18))
        random_tags = random.sample(tags_pool, num_tags)
        tag_label = random.choice(self._tag_labels)
        
        full_description = " ".join(parts)
        tag_block = f"\n\n{tag_label} {', '.join(random_tags)}"
        
        return full_description + tag_block, random_tags
            
    def generate_category_name(self, title: str) -> str:
        """Generate category name from title"""
        # Kata-kata prioritas
        priority_words = [
            # Kategori umum viral
            'bokep indo',  'hijab', 'Prank Ojol', 'simontok', 'terabox', 'lulustream', 'doodstream', 'prank ojol', 
            'chindo', 'adik kakak', 'tante yona', 'stw', 'trending', 'cewek colmek', 'remaja', 'pijat plus', 
            'mbah maryono', 'jav', 'jilbab', 'tobrut', 'skandal', 'tante yona', 'lokal', 'terbaru', 
            'vcs', 'onlyfans', 'telegram', 'jepang', 'china', 'indonesia', 'malaysia', 
           'vietnam', 'barat', 'binor', 'bokep viral', 'siskaeee',
            'bokep pelajar',
            'video ngentot',
            'bokep perawan',
            'jilbab mesum',
            'prank ojol',
            'pijat plus',
            'sepong kontol',
            'hijab tobrut',
            'tante sange',
            'abg viral',
            'skandal mesum',
           
            'syakirah',
            'doggy style',
            'tante bohay',
            'cewek semok',
            'msbreewc',
            'cewek tobrut',
            'janda sange',
            'bokep jepang',
            'doodstream',
            'doods pro',
            'dood tele',
            'cantik Tobrut',
            'tante sange',
            'susu gede',
            'adik kakak',
            'simontok',
            'bokep indo',
            'bokep stw',
            'video lokal',
              ]
        
        # Kata-kata yang harus dilewati (awalan, akhiran, imbuhan, kata sambung)
        skip_words = SKIP_WORDS
        # Pisahkan kata-kata dalam title
        words = title.split()
        
        # Hapus kata "Video" dari awal jika ada
        original_words = words.copy()  # Simpan original untuk pengecekan panjang
        if words and words[0].lower() == 'video':
            words = words[1:]  # Hapus kata pertama jika itu "Video"
        
        # Jika setelah dihapus masih ada kata-kata
        if words:
            # Inisialisasi first_word dengan kata pertama setelah menghapus "Video"
            first_word = None
            
            # Periksa kata-kata prioritas dalam title terlebih dahulu
            for priority_word in priority_words:
                if priority_word.lower() in [w.lower() for w in words]:
                    first_word = priority_word
                    break
            
            # Jika tidak ada kata prioritas, cari kata yang tidak di skip_words
            if not first_word:
                for word in words:
                    # Skip jika kata hanya angka
                    if word.isdigit():
                        continue
                    
                    # Skip jika kata kurang dari 3 huruf
                    if len(word) < 3:
                        continue
                    
                    # Skip jika kata ada di skip_words
                    if word.lower() in skip_words:
                        continue
                    
                    # Kata ini valid, gunakan sebagai first_word
                    first_word = word
                    break
            
            # Fallback: jika masih tidak ada first_word yang valid
            if not first_word:
                # Cek apakah semua kata dalam original title kurang dari 3 huruf
                # (kecuali kata "Video" yang sudah dihapus)
                all_short_words = True
                for word in original_words:
                    # Abaikan kata "video" dari pengecekan panjang
                    if word.lower() != 'video' and len(word) >= 3:
                        all_short_words = False
                        break
                
                first_word = "Terbaru"
            
            # Ubah huruf pertama menjadi besar dan tambahkan "Video" di awal
            category_name = 'Video ' + first_word.capitalize()
        else:
            # Jika tidak ada kata lain setelah "Video", gunakan default
            category_name = 'Video Terbaru'
        
        return category_name
    
    def normalize_data(self, api_data: Dict, api_source: str = 'doodstream', existing_videos: List[Dict] = None) -> List[Dict]:
        if existing_videos is None:
            existing_videos = []
        
        normalized_items = []
        
        if not api_data.get('result') or not isinstance(api_data['result'].get('files'), list):
            return normalized_items
        
        existing_videos_map = {}
        seen_slugs = set()
        
        for video in existing_videos:
            filecode = video.get('filecode') or video.get('file_code')
            if filecode:
                existing_videos_map[filecode] = video
            
            # Index existing slugs for uniqueness check
            slug = video.get('seo_url') or self.generate_slug(video.get('title', ''))
            if slug:
                seen_slugs.add(slug)
        
        for item in api_data['result']['files']:
            filecode = item.get('file_code') or item.get('filecode', '')
            raw_title = item.get('title') or item.get('file_title', '')
            
            # Generate a clean title, trying to make it unique against seen_slugs
            clean_title = self.clean_and_format_title(raw_title, seen_slugs)
            
            # Register this new slug so the next video in this batch doesn't use it
            seen_slugs.add(self.generate_slug(clean_title))
            
            duration = self.parse_duration(item.get('length') or item.get('file_length', 0))
            duration_iso = self.duration_to_iso8601(duration)
            formatted_length = self.format_duration(duration)
            kategori = self.generate_category_name(clean_title)
            
            if api_source == 'doodstream':
                size_bytes = self.parse_size_to_bytes(item.get('size', self.convert_duration_to_size(duration)))
                formatted_size = self.format_size(size_bytes)
                
                # Create a temporary dict to pass to generate_description
                temp_data = {
                    'title': clean_title,
                    'uploaded': item.get('uploaded', ''),
                    'size': formatted_size,
                    'length': formatted_length
                }
                deskripsi, tags = self.generate_description(temp_data)

                normalized_item = {
                    'protected_embed': item.get('protected_embed', f'https://dodl.pages.dev/{filecode}'),
                    'size': formatted_size,
                    'length': formatted_length,
                    'duration': duration_iso,
                    'protected_dl': item.get('download_url', f'https://doodstream.com/d/{filecode}'),
                    'views': item.get('views', 0),
                    'vw_fmt': self.format_number(item.get('views', 0)),
                    'single_img': self.proxy_img(item.get('single_img') or item.get('splash_img', '')),
                    'title': clean_title,
                    't_esc': self.html_escape(clean_title),
                    'seo_url': self.generate_slug(clean_title),
                    'raw_title': raw_title,
                    'status': item.get('status', '200'),
                    'uploaded': item.get('uploaded', ''),
                    'up_fmt': self.format_date(item.get('uploaded', ''), 'full'),
                    'up_short': self.format_date(item.get('uploaded', ''), 'short'),
                    'last_view': item.get('uploaded', ''),
                    'splash_img': self.proxy_img(item.get('splash_img') or item.get('single_img', '')),
                    'filecode': filecode,
                    'file_code': filecode,
                    'canplay': item.get('canplay', True),
                    'api_source': item.get('api_source', 'doodstream'),
                    'kategori': kategori,
                    'kt_slug': self.generate_slug(kategori),
                    'kt_url': f"/f/{self.generate_slug(kategori)}",
                    'deskripsi': deskripsi,
                    'ds_esc': self.html_escape(deskripsi),
                    'tg': tags
                }
            else:
                size_bytes = self.parse_size_to_bytes(item.get('file_size', self.convert_duration_to_size(duration)))
                formatted_size = self.format_size(size_bytes)
                
                # Create a temporary dict to pass to generate_description
                temp_data = {
                    'title': clean_title,
                    'uploaded': item.get('uploaded', ''),
                    'size': formatted_size,
                    'length': formatted_length
                }
                deskripsi, tags = self.generate_description(temp_data)

                normalized_item = {
                    'protected_embed': item.get('protected_embed', f'https://luvluv.pages.dev/{filecode}'),
                    'size': formatted_size,
                    'length': formatted_length,
                    'duration': duration_iso,
                    'protected_dl': item.get('download_url', f'https://lulustream.com/d/{filecode}'),
                    'views': item.get('views', item.get('file_views', 0)),
                    'vw_fmt': self.format_number(item.get('views', item.get('file_views', 0))),
                    'single_img': self.proxy_img(item.get('player_img', f'https://img.lulucdn.com/{filecode}_t.jpg')),
                    'splash_img': self.proxy_img(item.get('player_img', f'https://img.lulucdn.com/{filecode}_xt.jpg')),
                    'title': clean_title,
                    't_esc': self.html_escape(clean_title),
                    'seo_url': self.generate_slug(clean_title),
                    'raw_title': raw_title,
                    'status': item.get('status', '200'),
                    'uploaded': item.get('uploaded', ''),
                    'up_fmt': self.format_date(item.get('uploaded', ''), 'full'),
                    'up_short': self.format_date(item.get('uploaded', ''), 'short'),
                    'last_view': item.get('uploaded', ''),
                    'filecode': filecode,
                    'file_code': filecode,
                    'canplay': item.get('canplay', True),
                    'api_source': item.get('api_source', 'lulustream'),
                    'kategori': kategori,
                    'kt_slug': self.generate_slug(kategori),
                    'kt_url': f"/f/{self.generate_slug(kategori)}",
                    'deskripsi': deskripsi,
                    'ds_esc': self.html_escape(deskripsi),
                    'tg': tags
                }
            
            if filecode in existing_videos_map:
                normalized_items.append(self.update_existing_data(existing_videos_map[filecode], normalized_item))
            else:
                normalized_items.append(normalized_item)
        
        return normalized_items
    
    def convert_duration_to_size(self, duration: int, bitrate: int = 1) -> float:
        return duration * bitrate * 1024 * 1024
    
    def update_existing_data(self, existing_data: Dict, new_data: Dict) -> Dict:
        """Preserve existing SEO data to maintain consistency across fetch cycles"""
        updated_data = new_data.copy()
        
        # 1. Preserve Title and SEO URL
        preserved_title = existing_data.get('title') or new_data.get('title') or ''
        updated_data['title'] = preserved_title
        updated_data['t_esc'] = self.html_escape(preserved_title)
        
        preserved_seo = existing_data.get('seo_url')
        if not preserved_seo:
            preserved_seo = self.generate_slug(preserved_title)
        updated_data['seo_url'] = preserved_seo
        
        # 2. Preserve Category and related fields
        preserved_kategori = existing_data.get('kategori')
        if preserved_kategori:
            updated_data['kategori'] = preserved_kategori
            updated_data['kt_slug'] = self.generate_slug(preserved_kategori)
            updated_data['kt_url'] = f"/f/{self.generate_slug(preserved_kategori)}"
            
        # 3. Preserve Description
        preserved_deskripsi = existing_data.get('deskripsi')
        if preserved_deskripsi:
            updated_data['deskripsi'] = preserved_deskripsi
            updated_data['ds_esc'] = self.html_escape(preserved_deskripsi)
        
        # 4. Preserve Tags (tg)
        preserved_tg = existing_data.get('tg')
        if preserved_tg:
            updated_data['tg'] = preserved_tg
            
        return updated_data

# ============================================================================
# ASYNC API CLIENT
# ============================================================================

class AsyncAPIClient:
    def __init__(self):
        self.normalizer = DataNormalizer()
        self.user_agents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:124.0) Gecko/20100101 Firefox/124.0',
        ]
        self.session = None
    
    def get_random_user_agent(self) -> str:
        return random.choice(self.user_agents)
    
    async def __aenter__(self):
        timeout = aiohttp.ClientTimeout(total=30)
        connector = aiohttp.TCPConnector(limit_per_host=10, limit=20, ssl=False)
        self.session = aiohttp.ClientSession(
            timeout=timeout,
            connector=connector,
            headers={'Accept': 'application/json'}
        )
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()
    
    async def fetch_page(self, url: str, max_retries: int = 3) -> Optional[Dict]:
        for attempt in range(max_retries):
            try:
                headers = {'User-Agent': self.get_random_user_agent()}
                async with self.session.get(url, headers=headers) as response:
                    if response.status == 200:
                        return await response.json()
                    else:
                        print(f"HTTP {response.status} for {url}")
                        if response.status == 429:  # Too Many Requests
                            wait_time = (attempt + 1) * 2
                            print(f"Rate limited, waiting {wait_time} seconds...")
                            await asyncio.sleep(wait_time)
            except asyncio.TimeoutError:
                print(f"Timeout on attempt {attempt + 1} for {url}")
            except Exception as e:
                print(f"Attempt {attempt + 1} failed for {url}: {str(e)}")
            
            if attempt < max_retries - 1:
                await asyncio.sleep(2 ** attempt)  # Exponential backoff
        
        return None
    
    async def fetch_all_pages_concurrent(self, config: Dict, api_source: str, existing_videos: List[Dict] = None) -> List[Dict]:
        """Fetch all pages using actual API response data for pagination"""
        if existing_videos is None:
            existing_videos = []
        
        all_data = []
        max_concurrent = config.get('concurrent_requests', 5)
        
        # Semaphore untuk membatasi concurrent requests
        semaphore = asyncio.Semaphore(max_concurrent)
        
        print(f"Starting fetch from {api_source}...")
        
        # Fetch first page to get total pages from API response
        url = f"{config['api_url']}?key={config['api_key']}&per_page={config['per_page']}&page=1"
        first_result = await self.fetch_page(url, config['max_retries'])
        
        if not first_result or first_result.get('status') != 200:
            print(f"Failed to fetch first page from {api_source}")
            return []
        
        # Get total pages from API response
        # doodapi uses 'total_pages', lulustream uses 'pages'
        result_data = first_result.get('result', {})
        total_pages = result_data.get('total_pages') or result_data.get('pages', 1)
        
        print(f"API {api_source} reports {total_pages} total pages")
        
        # Process first page data
        normalized_data = self.normalizer.normalize_data(first_result, api_source, existing_videos)
        if normalized_data:
            all_data.extend(normalized_data)
            print(f"  ✓ Page 1 from {api_source}: {len(normalized_data)} videos")
        
        # If only one page, return early
        if total_pages <= 1:
            print(f"Completed fetch from {api_source}: {len(all_data)} total videos")
            return self.preserve_existing_titles(all_data, existing_videos)
        
        # Fetch remaining pages concurrently
        async def fetch_and_process(page_num: int):
            async with semaphore:
                url = f"{config['api_url']}?key={config['api_key']}&per_page={config['per_page']}&page={page_num}"
                result = await self.fetch_page(url, config['max_retries'])
                
                if result and result.get('status') == 200:
                    normalized_data = self.normalizer.normalize_data(result, api_source, existing_videos)
                    if normalized_data:
                        print(f"  ✓ Page {page_num} from {api_source}: {len(normalized_data)} videos")
                        await asyncio.sleep(config.get('request_delay', 0.5))
                        return normalized_data
                return []
        
        # Create tasks for remaining pages
        tasks = [fetch_and_process(page) for page in range(2, total_pages + 1)]
        
        # Execute in batches
        batch_size = max_concurrent
        for i in range(0, len(tasks), batch_size):
            batch = tasks[i:i + batch_size]
            results = await asyncio.gather(*batch, return_exceptions=True)
            
            for result in results:
                if isinstance(result, Exception):
                    print(f"Error in batch processing: {result}")
                    continue
                if result:
                    all_data.extend(result)
        
        print(f"Completed fetch from {api_source}: {len(all_data)} total videos")
        return self.preserve_existing_titles(all_data, existing_videos)
    
    def preserve_existing_titles(self, new_videos: List[Dict], existing_videos: List[Dict]) -> List[Dict]:
        existing_titles_map = {}
        
        for video in existing_videos:
            filecode = video.get('filecode') or video.get('file_code', '')
            title = video.get('title', '')
            seo_url = video.get('seo_url', '')
            if filecode and title:
                existing_titles_map[filecode] = {'title': title, 'seo_url': seo_url}
        
        for video in new_videos:
            filecode = video.get('filecode') or video.get('file_code', '')
            if filecode in existing_titles_map:
                preserved_data = existing_titles_map[filecode]
                video['title'] = preserved_data['title']
                if preserved_data.get('seo_url'):
                    video['seo_url'] = preserved_data['seo_url']
                video['title_preserved'] = True
            else:
                video['title_preserved'] = False
        
        return new_videos

# ============================================================================
# FILE OPERATIONS - OPTIMIZED FOR AGC.PHP
# ============================================================================

def load_all_videos_from_detail_files() -> List[Dict]:
    """
    Load all videos from public/data/detail/ shard folders.
    This replaces load_all_videos_from_paginated_files for better persistence.
    """
    detail_dir = Path('public/data/detail')
    all_videos = []
    
    if not detail_dir.exists():
        return all_videos
    
    print("   • Scanning shard folders in output/detail/...")
    shard_dirs = [d for d in detail_dir.iterdir() if d.is_dir()]
    
    for shard_dir in shard_dirs:
        for detail_file in shard_dir.glob('*.json'):
            try:
                with open(detail_file, 'r', encoding='utf-8') as f:
                    v = json.load(f)
                    if v:
                        all_videos.append(v)
            except Exception as e:
                print(f"Error loading {detail_file}: {e}")
    
    return all_videos

def parse_uploaded_timestamp(uploaded: str) -> int:
    """
    Parse uploaded string to timestamp
    """
    if not uploaded:
        return 0
    
    if isinstance(uploaded, (int, float)):
        return int(uploaded)
    
    try:
        # Try to parse various date formats
        dt = datetime.fromisoformat(uploaded.replace('Z', '+00:00'))
        return int(dt.timestamp())
    except:
        try:
            dt = datetime.strptime(uploaded, '%Y-%m-%d %H:%M:%S')
            return int(dt.timestamp())
        except:
            try:
                dt = datetime.strptime(uploaded, '%Y-%m-%d')
                return int(dt.timestamp())
            except:
                return 0

def merge_video_data(new_videos: List[Dict], existing_videos: List[Dict]) -> List[Dict]:
    merged_videos = []
    existing_map = {}
    
    for video in existing_videos:
        filecode = video.get('filecode') or video.get('file_code', '')
        if filecode:
            existing_map[filecode] = video
    
    for new_video in new_videos:
        filecode = new_video.get('filecode') or new_video.get('file_code', '')
        
        if filecode and filecode in existing_map:
            existing_video = existing_map[filecode]
            merged_video = new_video.copy()
            
            # Preserve important fields from existing data
            preserved_title = existing_video.get('title') or new_video.get('title') or ''
            merged_video['title'] = preserved_title
            
            preserved_seo = existing_video.get('seo_url')
            if not preserved_seo:
                preserved_seo = DataNormalizer().generate_slug(preserved_title)
            merged_video['seo_url'] = preserved_seo
            
            merged_video['kategori'] = existing_video.get('kategori', new_video.get('kategori'))
            merged_video['custom_fields'] = existing_video.get('custom_fields', new_video.get('custom_fields', {}))
            merged_video['title_preserved'] = True
            
            merged_videos.append(merged_video)
            del existing_map[filecode]
        else:
            new_video['title_preserved'] = False
            merged_videos.append(new_video)
    
    # Add remaining existing videos
    for existing_video in existing_map.values():
        existing_video['title_preserved'] = True
        existing_video['data_preserved'] = True
        merged_videos.append(existing_video)
    
    return merged_videos

def save_fetch_status(status_data: Dict):
    """Save fetch status to file"""
    status_file = Path('fetch_status.json')
    with open(status_file, 'w', encoding='utf-8') as f:
        json.dump(status_data, f, indent=2, ensure_ascii=False)



# ============================================================================
# MAIN ASYNC FUNCTIONS
# ============================================================================

async def fetch_from_source_async(source_name: str, config: Dict, existing_videos: List[Dict]) -> List[Dict]:
    """Async function to fetch data from a single source"""
    async with AsyncAPIClient() as client:
        print(f"🚀 Starting async fetch from {source_name}...")
        start_time = time.time()
        
        # Use concurrent fetching
        videos = await client.fetch_all_pages_concurrent(config, source_name, existing_videos)
        
        elapsed = time.time() - start_time
        print(f"✅ Completed async fetch from {source_name}: {len(videos)} videos in {elapsed:.2f} seconds")
        return videos

async def fetch_all_sources_concurrently(existing_videos: List[Dict]) -> List[Dict]:
    """Fetch from all sources concurrently"""
    print("🔄 Starting concurrent fetch from all sources...")
    
    # Create tasks for all sources
    tasks = []
    for source_name, config in CONFIGS.items():
        task = fetch_from_source_async(source_name, config, existing_videos)
        tasks.append(task)
    
    # Run all tasks concurrently with timeout
    try:
        results = await asyncio.wait_for(
            asyncio.gather(*tasks, return_exceptions=True),
            timeout=300  # 5 minutes timeout
        )
    except asyncio.TimeoutError:
        print("⏰ Timeout: Fetch operation took too long")
        return []
    
    # Process results
    all_videos = []
    for idx, result in enumerate(results):
        source_name = list(CONFIGS.keys())[idx]
        if isinstance(result, Exception):
            print(f"❌ Error fetching from {source_name}: {str(result)}")
        elif result:
            all_videos.extend(result)
            print(f"✓ Successfully fetched {len(result)} videos from {source_name}")
        else:
            print(f"⚠️ No data fetched from {source_name}")
    
    return all_videos

def normalize_title_for_search(title: str) -> str:
    if not title:
        return ""
    t = title.lower()
    t = re.sub(r'[^a-z0-9]', '', t)
    return t

def get_prefix2(norm: str) -> str:
    if not norm:
        return "__"
    if len(norm) == 1:
        return norm + "_"
    return norm[:2]

def get_prefix3(norm: str) -> str:
    if len(norm) >= 3:
        return norm[:3]
    return (norm + "__")[:3]

def get_md5_shard(filecode: str) -> str:
    """Get SHA256-based shard hex (00-ff) untuk batch sharding"""
    import hashlib
    hash_obj = hashlib.sha256(filecode.encode())
    hex_digest = hash_obj.hexdigest()
    # Ambil 2 karakter pertama (00-ff)
    return hex_digest[:2]

def generate_static_indexes_sharded(videos: List[Dict], per_page: int):
    """Generate static indexes with batch sharding and pre-calculated related videos"""
    output = Path("public/data")
    index_dir = output / "index"
    detail_dir = output / "detail"

    index_dir.mkdir(exist_ok=True)
    detail_dir.mkdir(exist_ok=True)

    normalizer = DataNormalizer()
    
    # ============================================================
    # PRE-BUILD INDEX FOR RELATED VIDEOS (FAST SEARCH)
    # ============================================================
    print("   • Preparing related videos index (build-time optimization)...")
    
    # Simplified summaries for related video items (save space in shards)
    summaries = []
    category_index = {} # kategori -> list of indices
    keyword_index = {}  # word -> list of indices
    
    for i, v in enumerate(videos):
        vid = v.get("filecode") or v.get("file_code", "")
        title = v.get("title", "")
        # Get length as seconds
        length_raw = v.get("length", "")
        if isinstance(length_raw, str) and ":" in length_raw:
            parts = list(reversed(length_raw.split(':')))
            length_secs = sum(int(p) * (60 ** i) for i, p in enumerate(parts))
        else:
            length_secs = int(length_raw) if isinstance(length_raw, (int, float)) else 0

        summary = {
            "f": vid,
            "t": title,
            "si": v.get("single_img"),
            "vw_fmt": v.get("vw_fmt"),
            "ln": length_secs,
            "kt": v.get("kategori"),
            "up_short": v.get("up_short")
        }
        summaries.append(summary)
        
        # Index by category
        kat = v.get("kategori", "Video")
        if kat not in category_index: category_index[kat] = []
        category_index[kat].append(i)
        
        # Index by keywords (normalized words from title)
        # Skip very short words and common words
        words = [w.lower() for w in re.sub(r'[^a-zA-Z0-9\s]', ' ', title).split() 
                if len(w) >= 3 and w.lower() not in SKIP_WORDS]
        for w in words:
            if w not in keyword_index: keyword_index[w] = []
            keyword_index[w].append(i)

    # Batch sharding: gunakan MD5 hex (00-ff) untuk 256 shard files
    batch_shards: Dict[str, List[Dict]] = {}
    prefix2_map: Dict[str, List[Dict]] = {}

    for i, v in enumerate(videos):
        vid = v.get("filecode") or v.get("file_code")
        if not vid:
            continue

        title = v.get("title", "")
        seo_url = v.get("seo_url") or normalizer.generate_slug(title)
        norm_title = normalize_title_for_search(title)
        
        # ============================================================
        # FIND RELATED VIDEOS (BUILD-TIME SEARCH)
        # ============================================================
        # Get 4 significant words from title
        kw_words = [w.lower() for w in re.sub(r'[^a-zA-Z0-9\s]', ' ', title).split() 
                   if len(w) >= 3 and w.lower() not in SKIP_WORDS][:4]
        
        related_indices = {} # index -> score
        for kw in kw_words:
            if kw in keyword_index:
                for match_idx in keyword_index[kw]:
                    if match_idx == i: continue
                    related_indices[match_idx] = related_indices.get(match_idx, 0) + 10
        
        # Convert to list of indices sorted by score, then by index (recency)
        sorted_related_indices = sorted(
            related_indices.keys(), 
            key=lambda idx: (related_indices[idx], -idx), # Score higher, then index higher (newer)
            reverse=True
        )
        
        # Collect top 16 unique by content length (ln) AND unique titles
        final_related_indices = []
        seen_lengths = {summaries[idx]["ln"] for idx in final_related_indices}
        seen_titles = {normalizer.generate_slug(v.get("title", ""))} # Don't repeat current video title
        
        # 1. First add keyword matches that have unique lengths and titles
        for idx in sorted_related_indices:
            v_ln = summaries[idx]["ln"]
            v_title_slug = normalizer.generate_slug(summaries[idx]["t"])
            
            # Skip if length match (for durability) or title match (for uniqueness)
            if (v_ln > 0 and v_ln in seen_lengths) or (v_title_slug in seen_titles):
                continue
            
            final_related_indices.append(idx)
            seen_lengths.add(v_ln)
            seen_titles.add(v_title_slug)
            if len(final_related_indices) >= 16: break
        
        # 2. If less than 16, fallback to category with unique length and title check
        if len(final_related_indices) < 16:
            kat = v.get("kategori", "Video")
            if kat in category_index:
                # Add videos from same category that aren't already included or have duplicated lengths/titles
                cat_videos = category_index[kat]
                for cat_idx in cat_videos:
                    if cat_idx == i or cat_idx in related_indices: continue
                    
                    v_ln = summaries[cat_idx]["ln"]
                    v_title_slug = normalizer.generate_slug(summaries[cat_idx]["t"])
                    
                    if (v_ln > 0 and v_ln in seen_lengths) or (v_title_slug in seen_titles):
                        continue
                    
                    final_related_indices.append(cat_idx)
                    seen_lengths.add(v_ln)
                    seen_titles.add(v_title_slug)
                    if len(final_related_indices) >= 16: break
        
        # 3. Fallback to general random if still less than 16 (rare) with unique checks
        if len(final_related_indices) < 16:
            for j in range(min(150, len(videos))): # Increased scan range
                if j == i or j in related_indices or j in final_related_indices: continue
                
                v_ln = summaries[j]["ln"]
                v_title_slug = normalizer.generate_slug(summaries[j]["t"])
                
                if (v_ln > 0 and v_ln in seen_lengths) or (v_title_slug in seen_titles):
                    continue
                
                final_related_indices.append(j)
                seen_lengths.add(v_ln)
                seen_titles.add(v_title_slug)
                if len(final_related_indices) >= 16: break
                
        # Final summaries for related
        related_videos = [summaries[idx] for idx in final_related_indices[:16]]

        page = (i // per_page) + 1
        index = i % per_page
        shard_key = get_md5_shard(vid)
        
        detail = {
            "f": vid,
            "t": title,
            "t_esc": v.get("t_esc"),
            "seo_url": seo_url,
            "ds": v.get("deskripsi"),
            "ds_esc": v.get("ds_esc"),
            "tg": v.get("tag"),
            "pe": v.get("protected_embed"),
            "pd": v.get("protected_dl"),
            "si": v.get("single_img"),
            "sp": v.get("splash_img"),
            "sz": v.get("size"),
            "ln": summaries[i]["ln"], # Use pre-calculated length
            "vw": v.get("views", 0),
            "vw_fmt": v.get("vw_fmt"),
            "up": v.get("uploaded"),
            "up_fmt": v.get("up_fmt"),
            "up_short": v.get("up_short"),
            "lv": v.get("last_view"),
            "as": v.get("api_source"),
            "kt": v.get("kategori"),
            "kt_slug": v.get("kt_slug"),
            "kt_url": v.get("kt_url"),
            "pg": page,
            "ix": index,
            "rv": related_videos # NEW: Related Videos
        }
        
        batch_shards.setdefault(shard_key, []).append(detail)

        # ===== PREFIX-2 INDEX =====
        p2 = get_prefix2(norm_title)
        prefix2_map.setdefault(p2, []).append({
            "f": vid, "t": title, "t_esc": v.get("t_esc"), "seo_url": seo_url,
            "ln": summaries[i]["ln"], "sp": v.get("splash_img"), "si": v.get("single_img"),
            "vw": v.get("views", 0), "kt": v.get("kategori"), "vw_fmt": v.get("vw_fmt"),
            "as": v.get("api_source"), "up": v.get("uploaded"), "up_fmt": v.get("up_fmt"),
            "up_short": v.get("up_short"), "pg": page
        })

    # ===== WRITE BATCH SHARDS (00.json - ff.json) =====
    print(f"💾 Writing {len(batch_shards)} batch shard files...")
    for shard_key in sorted(batch_shards.keys()):
        items = batch_shards[shard_key]
        shard_file = detail_dir / f"{shard_key}.json"
        
        with open(shard_file, "w", encoding="utf-8") as f:
            json.dump(items, f, ensure_ascii=False, separators=(",", ":"))
        
        if len(batch_shards) <= 10:
            print(f"   ✓ {shard_key}.json: {len(items)} videos")

    print(f"✅ Batch shards generated: {len(batch_shards)} files")

    # =========================
    # WRITE PREFIX INDEX (ADAPTIVE)
    # =========================
    for p2, items in prefix2_map.items():
        if len(items) <= PREFIX2_LIMIT:
            # Tulis langsung ke file prefix.json
            with open(index_dir / f"{p2}.json", "w", encoding="utf-8") as f:
                json.dump(items, f, ensure_ascii=False, separators=(",", ":"))
        else:
            # Jika items > PREFIX2_LIMIT, buat subdirectory dan split by prefix-3
            subdir = index_dir / p2
            subdir.mkdir(exist_ok=True)
            bucket3: Dict[str, List[Dict]] = {}

            for item in items:
                # item sudah memiliki abbreviated keys (f, t, sz, ln, sp, si, vw, up, pg)
                title = item.get("t", "")  # Abbreviated key untuk title
                norm = normalize_title_for_search(title)
                p3 = get_prefix3(norm)  # Returns 3-char prefix like "via", "vic", etc.
                bucket3.setdefault(p3, []).append(item)

            # Tulis setiap bucket ke file subdirectory
            for p3, subitems in bucket3.items():
                with open(subdir / f"{p3}.json", "w", encoding="utf-8") as sf:
                    json.dump(subitems, sf, ensure_ascii=False, separators=(",", ":"))

    # =========================
    # GENERATE LOOKUP_SHARD.JSON (untuk client-side static lookup)
    # =========================
    # Mapping file_code -> shard untuk mengurangi function requests
    lookup_shard: Dict[str, str] = {}
    for video in videos:
        vid = video.get("filecode") or video.get("file_code")
        if vid:
            shard = get_md5_shard(vid)
            lookup_shard[vid] = shard
    
    with open(output / "lookup_shard.json", "w", encoding="utf-8") as lf:
        json.dump(lookup_shard, lf, ensure_ascii=False, separators=(",", ":"))
    
    print(f"✅ Lookup shard mapping generated: {len(lookup_shard)} entries")

    # =========================
    # META
    # =========================
    meta = {
        "total": len(videos),
        "per_page": per_page,
        "prefix_len": SEARCH_PREFIX_LEN,
        "prefix2_limit": PREFIX2_LIMIT,
        "detail_shard": "md5_hex[:2] (00-ff)",
        "batch_sharding": True,
        "max_files": 256,
        "lookup_shard_available": True
    }

    with open(output / "meta.json", "w", encoding="utf-8") as mf:
        json.dump(meta, mf, indent=2, ensure_ascii=False)

    # =========================
    # CONSTANTS (CONFIG, IMG_ERR)
    # =========================
    config_data = {
        "name": "VideoStream",
        "logo": "https://wsrv.nl/?url=https://videostream.pages.dev/images/apple-touch-icon.png",
        "description": "Situs streaming video viral terbaru dan terlengkap 2024",
        "foundingDate": "2024-01-01",
        "socialMedia": [
            "https://www.facebook.com/videostream",
            "https://twitter.com/videostream",
            "https://www.instagram.com/videostream"
        ],
        "img_err": "this.onerror=null;this.src='data:image/svg+xml,%3Csvg%20width=%22200%22%20height=%22200%22%20viewBox=%220%200%20100%20100%22%20xmlns=%22http://www.w3.org/2000/svg%22%3E%3Crect%20width=%22100%22%20height=%22100%22%20fill=%22%23FEF2F2%22/%3E%3Ctext%20x=%2250%22%20y=%2250%22%20text-anchor=%22middle%22%20dominant-baseline=%22middle%22%20fill=%22%23F87171%22%20style=%22font-family:sans-serif;font-size:10px;font-weight:bold%22%3EIMAGE%20ERROR%3C/text%3E%3C/svg%3E';"
    }
    with open(output / "constants.json", "w", encoding="utf-8") as cf:
        json.dump(config_data, cf, indent=2, ensure_ascii=False)

    print("✅ Static batch-sharded index and constants generated")


def generate_frontend_config():
    """Generate functions/lib/config.js based on site configurations"""
    js_content = """// functions/lib/config.js
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
    version: "1.0.0"
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
"""
    config_path = Path("functions/lib/config.js")
    config_path.parent.mkdir(parents=True, exist_ok=True)
    with open(config_path, "w", encoding="utf-8") as f:
        f.write(js_content)
    print("✅ Frontend config generated at functions/lib/config.js")


def generate_robots_txt(domain: str = "https://domainkamu.com"):
    """Generate public/robots.txt with dynamic domain"""
    robots_content = f"""User-agent: *
Allow: /
Allow: /detail/
Allow: /search/
Disallow: /api/
Disallow: /download/

Sitemap: {domain}/sitemap.xml
"""
    robots_path = Path("public/robots.txt")
    robots_path.parent.mkdir(parents=True, exist_ok=True)
    with open(robots_path, "w", encoding="utf-8") as f:
        f.write(robots_content)
    print(f"✅ Robots.txt generated at public/robots.txt with domain: {domain}")


def generate_static_list_files(videos: List[Dict], per_page: int = 100):
    output = Path("public/data")
    list_dir = output / "list"
    list_dir.mkdir(exist_ok=True)

    normalizer = DataNormalizer()
    total = len(videos)
    total_pages = (total + per_page - 1) // per_page

    for page in range(total_pages):
        chunk = videos[page * per_page : (page + 1) * per_page]

        items = []
        for v in chunk:
            vid = v.get("filecode") or v.get("file_code")
            if not vid:
                continue

            title = v.get("title")
            seo_url = v.get("seo_url")
            if not seo_url:
                seo_url = normalizer.generate_slug(title or "")
                
            items.append({
                "download_url": v.get("protected_dl"),
                "si": v.get("single_img"),
                "f": vid,
                "ln": normalizer.parse_duration(v.get("length", 0)),
                "vw": str(v.get("views", 0)),
                "vw_fmt": v.get("vw_fmt"),
                "up": v.get("uploaded"),
                "up_fmt": v.get("up_fmt"),
                "kt": v.get("kategori"),
                "as": v.get("api_source"),
                "up_short": v.get("up_short"),
                "t": title,
                "t_esc": v.get("t_esc"),
                "seo_url": seo_url
            })

        server_time = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

        page_data = {
            "msg": "OK",
            "server_time": server_time,
            "status": 200,
            "result": {
                "total_pages": total_pages,
                "files": items,
                "results_total": str(total),
                "results": len(items)
            }
        }

        with open(list_dir / f"{page+1}.json", "w", encoding="utf-8") as f:
            json.dump(page_data, f, ensure_ascii=False, separators=(",", ":"))

    print(f"✅ Static list files generated: {total_pages} pages ({per_page}/page)")

def update_config_version():
    """Automatically increment the version number in config.js for cache busting"""
    config_path = Path("functions/lib/config.js")
    if not config_path.exists():
        print("⚠️ Warning: functions/lib/config.js not found. Skipping version update.")
        return

    try:
        with open(config_path, "r", encoding="utf-8") as f:
            content = f.read()

        # Look for version: "x.y.z"
        version_match = re.search(r'version:\s*["\'](\d+\.\d+\.\d+)["\']', content)
        if version_match:
            old_version = version_match.group(1)
            parts = old_version.split('.')
            if len(parts) == 3:
                # Increment the patch version
                parts[2] = str(int(parts[2]) + 1)
                new_version = ".".join(parts)
                
                # Replace in content
                new_content = content.replace(f'version: "{old_version}"', f'version: "{new_version}"')
                new_content = new_content.replace(f"version: '{old_version}'", f"version: '{new_version}'")
                
                with open(config_path, "w", encoding="utf-8") as f:
                    f.write(new_content)
                
                print(f"🚀 Version updated: {old_version} -> {new_version} (Cache Busting Active)")
            else:
                print("⚠️ Warning: Invalid version format in config.js")
        else:
            # Try to add it if missing? No, better warn
            print("⚠️ Warning: version field not found in config.js")
    except Exception as e:
        print(f"❌ Error updating config version: {e}")

async def main_fetch_async():
    """Main async fetch function dengan optimasi untuk AGC.php"""
    start_time = datetime.now()
    start_time_str = start_time.strftime('%Y-%m-%d %H:%M:%S')
    
    print("=" * 60)
    print(f"🚀 ASYNC FETCH STARTED at {start_time_str}")
    print("=" * 60)
    
    try:
        # Load existing data for title preservation
        print("📂 Loading existing videos from detail files...")
        existing_videos = load_all_videos_from_detail_files()
        print(f"📊 Loaded {len(existing_videos)} existing videos for preservation")
        
        # Fetch from all sources concurrently
        print("\n🌐 Fetching data from all sources concurrently...")
        all_videos = await fetch_all_sources_concurrently(existing_videos)
        
        if not all_videos and not existing_videos:
            print("❌ No videos fetched and no existing videos found")
            return {
                'status': 'error',
                'error': 'No data available',
                'started_at': start_time_str
            }
        
        print(f"\n📈 Total fetched videos: {len(all_videos)}")
        
        # Merge with existing data
        print("🔄 Merging with existing data...")
        merged_videos = merge_video_data(all_videos, existing_videos)
        
        # Calculate statistics
        preserved_count = sum(1 for v in merged_videos if v.get('title_preserved', False))
        new_count = len(merged_videos) - preserved_count
        
        print(f"📊 Merge statistics:")
        print(f"   • Preserved titles: {preserved_count}")
        print(f"   • New videos: {new_count}")
        
        # Remove duplicates by filecode AND title slug
        print("🧹 Removing duplicates (by filecode and title)...")
        unique_videos = []
        seen_filecodes = set()
        seen_titles = set()
        
        normalizer = DataNormalizer()
        
        for video in merged_videos:
            filecode = video.get('filecode') or video.get('file_code', '')
            title = video.get('title', '')
            title_slug = normalizer.generate_slug(title)
            
            # Check unique filecode and unique title
            if filecode and filecode not in seen_filecodes:
                if title_slug and title_slug not in seen_titles:
                    unique_videos.append(video)
                    seen_filecodes.add(filecode)
                    seen_titles.add(title_slug)
        
        print(f"🎯 Unique videos after deduplication: {len(unique_videos)}")
        
        # Sort by uploaded date (newest first)
        print("📅 Sorting by uploaded date (newest first)...")
        unique_videos.sort(
            key=lambda x: parse_uploaded_timestamp(x.get('uploaded', '')),
            reverse=True
        )
        
        # ============================================================
        # SAVE DATA FILES
        # ============================================================
        print("\n💾 Saving processed data...")
        
        # (save_paginated_data_files removed as requested)
        
        # Save static indexes and list files
        print("\n⚡ Generating static indexes and list files...")
        generate_static_indexes_sharded(unique_videos, DATA_PER_PAGE)
        generate_static_list_files(unique_videos, DATA_PER_PAGE)
        
        # Save unique categories to categories.json
        print("📁 Saving unique categories...")
        unique_cats = []
        seen_cat_slugs = set()
        for v in unique_videos:
            cat_name = v.get('kategori')
            cat_slug = v.get('kt_slug')
            if cat_name and cat_slug and cat_slug not in seen_cat_slugs:
                unique_cats.append({'name': cat_name, 'slug': cat_slug})
                seen_cat_slugs.add(cat_slug)
        
        with open(Path("public/data/categories.json"), "w", encoding="utf-8") as f:
            json.dump(unique_cats, f, ensure_ascii=False, separators=(",", ":"))
        print(f"✅ Saved {len(unique_cats)} unique categories to categories.json")
        
        generate_frontend_config()
        
        # Generate robots.txt with dynamic domain
        domain = os.getenv('SITE_DOMAIN', 'https://domainkamu.com')
        generate_robots_txt(domain)
        
        # Calculate execution time
        end_time = datetime.now()
        end_time_str = end_time.strftime('%Y-%m-%d %H:%M:%S')
        execution_time = (end_time - start_time).total_seconds()
        
        print("\n" + "=" * 60)
        print(f"✅ ASYNC FETCH COMPLETED at {end_time_str}")
        print("=" * 60)
        print(f"📊 Final Statistics:")
        print(f"   • Total videos: {len(unique_videos)}")
        total_pages = (len(unique_videos) + DATA_PER_PAGE - 1) // DATA_PER_PAGE
        print(f"   • Total pages: {total_pages}")
        print(f"   • Preserved titles: {preserved_count}")
        print(f"   • New videos: {new_count}")
        print(f"   • Execution time: {execution_time:.2f} seconds")
        print(f"   • Sources: {', '.join(CONFIGS.keys())}")
        print("=" * 60)
        
        # Prepare result
        result = {
            'status': 'completed',
            'started_at': start_time_str,
            'completed_at': end_time_str,
            'execution_time_seconds': execution_time,
            'total_videos': len(unique_videos),
            'preserved_titles': preserved_count,
            'new_videos': new_count,
            'title_stats': DataNormalizer._stats,
            'sources_fetched': list(CONFIGS.keys())
        }
        
        # Save status
        save_fetch_status(result)
        
        # Update config version for cache busting
        update_config_version()
        
        return result
        
    except asyncio.CancelledError:
        print("⏹️ Fetch operation cancelled")
        return {
            'status': 'cancelled',
            'started_at': start_time_str
        }
    except Exception as e:
        error_time = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        print(f"\n❌ ERROR: {str(e)}")
        
        result = {
            'status': 'error',
            'started_at': start_time_str,
            'completed_at': error_time,
            'error': str(e),
            'error_type': type(e).__name__
        }
        
        save_fetch_status(result)
        return result

async def main_fetch_async_for_php():
    """Versi khusus untuk integrasi PHP"""
    result = await main_fetch_async()
    
    # Print JSON untuk PHP
    print("\n===JSON_RESULT_START===")
    print(json.dumps(result, ensure_ascii=False))
    print("===JSON_RESULT_END===")
    
    return result


async def run_periodic_fetch(interval_hours: float = 24.0):
    """Run main_fetch_async in an infinite loop separated by the given interval (in hours)."""
    while True:
        print(f"🕒 Starting periodic fetch (interval {interval_hours}h)")
        result = await main_fetch_async()
        # store last run timestamp for external reference
        try:
            with open('last_fetch.txt', 'w') as f:
                f.write(datetime.now().isoformat())
        except Exception:
            pass

        if result.get('status') != 'completed':
            print(f"⚠️ Fetch finished with status {result.get('status')}")
        print(f"⏳ Sleeping for {interval_hours} hours before next fetch...\n")
        await asyncio.sleep(interval_hours * 3600)

def run_async_fetch():
    """Entry point for synchronous environments"""
    try:
        # Check if already running
        try:
            with open('fetch.lock', 'x') as lock_file:
                lock_file.write(str(os.getpid()))
        except FileExistsError:
            print("⚠️ Another fetch operation is already running")
            return {'status': 'already_running'}
        
        try:
            # Run async main function
            result = asyncio.run(main_fetch_async())
            return result
        finally:
            # Clean up lock file
            if os.path.exists('fetch.lock'):
                os.remove('fetch.lock')
    except Exception as e:
        print(f"❌ Fatal error: {str(e)}")
        return {'status': 'fatal_error', 'error': str(e)}



# ============================================================================
# MAIN ENTRY POINT
# ============================================================================

if __name__ == "__main__":
    print("🚀 Video Fetcher - LOCAL EXECUTION MODE")
    print("=" * 60)
    print("Running from: LOCAL MACHINE (Unlimited Resources)")
    print("Output: public/data/ (Static JSON files)")
    print("=" * 60)
    
    # Handle command line arguments
    if len(sys.argv) > 1:
        if sys.argv[1] == '--php':
            # Mode khusus untuk PHP
            result = asyncio.run(main_fetch_async_for_php())
        elif sys.argv[1] == '--sync':
            # Synchronous entry point for compatibility
            result = run_async_fetch()
            print("\n===JSON_RESULT_START===")
            print(json.dumps(result, ensure_ascii=False))
            print("===JSON_RESULT_END===")
        elif sys.argv[1] == '--help':
            print("\n📖 LOCAL EXECUTION MODES:")
            print("\nUsage:")
            print("  python sedot.py [OPTION]")
            print("\nOptions:")
            print("  (default)    : Run once, fetch & generate static files")
            print("  --loop       : Run continuously every 24 hours (for cron/CI)")
            print("  --interval H : Set custom interval (hours) with --loop")
            print("  --sync       : Synchronous mode for compatibility")
            print("  --php        : Output JSON for PHP integration")
            print("  --help       : Show this help")
            print("\n✅ Output (Git-committed static files):")
            print("  - public/data/detail/*.json (256 shard files)")
            print("  - public/data/index/*.json (prefix indices)")
            print("  - public/data/meta.json (metadata)")
            print("  - public/data/lookup_shard.json (lookup table)")
            print("\n🔄 Recommended CI/CD Setup:")
            print("  - GitHub Actions: Run daily (07:00 UTC)")
            print("  - Linux Cron: 0 7 * * * cd /path && python sedot.py && git push")
            sys.exit(0)
        elif sys.argv[1] == '--loop':
            # continuous scheduling
            # check if interval supplied as second argument
            interval = 24.0
            if len(sys.argv) > 2:
                try:
                    interval = float(sys.argv[2])
                except ValueError:
                    pass
            print(f"⏰ Starting fetch loop ({interval}h interval)...")
            result = asyncio.run(run_periodic_fetch(interval))
    else:
        # Mode normal - single run for local execution
        print("\n🎯 Single Run Mode (Optimized for Local)")
        print("   • Process: Fetch → Normalize → Generate Indexes")
        print("   • Output: Static JSON files in public/data/")
        print("   • Next: git add . && git push\n")
        result = asyncio.run(main_fetch_async())
        
        # Print JSON result
        print("\n===JSON_RESULT_START===")
        print(json.dumps(result, ensure_ascii=False))
        print("===JSON_RESULT_END===")
    
    # Exit with appropriate code
    if result.get('status') == 'completed':
        sys.exit(0)
    else:
        sys.exit(1)