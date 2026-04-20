# Video Site Project

  npx -y wrangler pages dev public --port 8785
Proyek ini adalah situs web video statis yang dihosting di Cloudflare Pages dengan fungsionalitas serverless menggunakan Cloudflare Functions.

## Struktur Proyek

- `/public`: Berisi file statis (HTML, images, data).
- `/functions`: Berisi logika serverless (Cloudflare Functions).
- `wrangler.toml`: Konfigurasi untuk Cloudflare Wrangler.

## Fitur SEO dan URL Structure

Proyek ini mendukung URL SEO-friendly untuk detail video menggunakan slug:

- **URL Detail Video**: `/e/<seo_url>` (contoh: `/e/video-viral-terbaru-2024`)
- **Redirect Legacy**: URL lama `/e/<id>` otomatis redirect ke `/e/<seo_url>` untuk preserve traffic
- **Canonical URLs**: Setiap halaman detail memiliki canonical URL SEO-friendly
- **Slug Lookup**: Mapping cepat dari slug ke ID video untuk performa optimal

### Struktur Data

Data video disimpan dalam format JSON teroptimasi:

- `/public/data/index/`: Index pencarian dengan prefix-based sharding
- `/public/data/detail/`: Detail video dalam shard MD5 (00-ff.json)
- `/public/data/slug/`: Detail video langsung berdasarkan slug dengan sharding berdasarkan kata pertama
- `/public/data/lookup_shard.json`: Mapping ID ke shard untuk client-side lookup
- `/public/data/slug_lookup.json`: Mapping slug ke ID video (sharded)
- `/public/data/meta.json`: Metadata proyek dengan flag `slug_detail_sharded`

### Slug-Based Detail Files (Sharded)

Untuk performa optimal, sistem menghasilkan file detail per slug dengan sharding:

- Struktur: `/public/data/slug/(kata-pertama)/(slug-seo).json`
- Contoh: `/public/data/slug/video/video-viral-terbaru-2024.json`
- Jika slug ambigu: `/public/data/slug/(kata-pertama)/(slug-seo)-(id).json`
- Handler detail akan coba fetch langsung dari file sharded sebelum fallback ke shard MD5

## Cara Deploy ke Cloudflare

### 1. Melalui Cloudflare Dashboard (Direkomendasikan)

Metode ini paling mudah jika kode Anda ada di GitHub atau GitLab.

1.  Login ke [Cloudflare Dashboard](https://dash.cloudflare.com/).
2.  Buka **Workers & Pages** > **Create application** > **Pages** > **Connect to Git**.
3.  Pilih repositori Anda.
4.  Di bagian **Build settings**:
    *   **Framework preset**: None
    *   **Build command**: (Kosongkan)
    *   **Build output directory**: `public`
5.  Klik **Save and Deploy**.
6.  Cloudflare akan secara otomatis mendeteksi folder `functions` dan men-deploy-nya sebagai Functions.

---

### 2. Melalui Wrangler CLI

Metode ini berguna untuk deployment manual langsung dari terminal.

1.  **Install Wrangler:**
    ```bash
    npm install -g wrangler
    ```

2.  **Login ke Cloudflare:**
    ```bash
    wrangler login
    ```

3.  **Deploy Proyek:**
    Jalankan perintah berikut di root direktori proyek:
    ```bash
    wrangler pages deploy ./public
    ```
    *Wrangler akan otomatis mengunggah isi folder `./public` dan memproses folder `functions` di root.*

---

## Pengembangan Lokal

Untuk menjalankan proyek secara lokal menggunakan Wrangler:

```bash
wrangler pages dev ./public
```
Proyek akan berjalan di `http://localhost:8788`.
## Otomatisasi Pembaruan Data

Skrip sedot.py ...
## Otomatisasi Pembaruan Data

Skrip `sedot.py` digunakan untuk mengambil dan memperbarui berkas JSON statis
di bawah `public/data`. Skrip ini menghasilkan:

- Index pencarian dengan sharding adaptif
- Detail video dalam shard MD5 (00-ff.json) 
- **Slug-based detail files** untuk lookup cepat (`/public/data/detail/slug/`)
- Mapping lookup untuk ID dan slug
- Metadata proyek dengan flag fitur tersedia

Untuk menjaga data tetap up‑to‑date, jalankan skrip satu kali setiap 24 jam. Ada dua pendekatan:

1. **Loop internal** – biarkan skrip terus berjalan dan tidur di antara pengambilan:
   ```bash
   python sedot.py --loop        # interval default 24 jam
   python sedot.py --loop 12     # interval 12 jam
   ```
   Skrip akan mencetak log ke terminal dan menulis timestamp terakhir ke file
   `last_fetch.txt`.

2. **Penjadwalan eksternal (cron/dll)** – gunakan scheduler sistem untuk memanggil
   skrip pada waktu yang Anda tentukan. Contoh cron:
   ```cron
   0 3 * * * /usr/bin/python3 /path/to/sedot.py >> /var/log/sedot.log 2>&1
   ```
   Ganti path dan jam sesuai kebutuhan.

Kedua metode akan menghasilkan file baru di `public/data`, lalu file tersebut
dapat dideploy kembali ke Cloudflare Pages.

### Otomasi dengan GitHub Actions

Anda juga bisa menyerahkan semua pekerjaan ke GitHub Actions sehingga
proses pengambil data dan commit berjalan di server GitHub setiap hari
(jadi Anda tidak perlu meninggalkan mesin sendiri berjalan atau membuka
Codespace). Berikut langkah umum:

1. Buat file workflow di `.github/workflows/update-data.yml` (contoh file
   sudah disediakan di repo).
2. Atur *schedule* (cron) di dalam workflow sesuai kebutuhan. Defaultnya
   adalah `0 3 * * *` (pukul 03:00 UTC setiap hari).
3. Pastikan skrip `sedot.py` dan dependensi (`aiohttp`) sudah berada di
   repo; workflow akan menginstalnya pada runner.
4. Workflow akan menjalankan `python sedot.py --sync`, mengidentifikasi
   perubahan di `public/data`, dan otomatis commit/push bila ada file
   baru atau ter-update.
5. (Opsional) tambahkan langkah setelah commit untuk menjalankan `wrangler
   pages deploy ./public` jika Anda ingin deployment Pages dilakukan
   langsung dari Actions. Gunakan secret `CF_API_TOKEN` untuk autentikasi.

Dengan pendekatan ini, data statis akan diperbarui setiap 24 jam (atau
interval lain yang ditentukan) dan commit hasilnya ke repository tanpa
intervensi manual.

### Regenerasi Slug Files

Jika Anda melakukan perubahan pada logika slug atau data video, jalankan:

```bash
python sedot.py --sync
```

Ini akan meregenerasi semua file data termasuk slug-based detail files dan mapping lookup.

