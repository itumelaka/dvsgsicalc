# DVS GSI Calculator — 3D Clay PWA

**Aplikasi:** https://itumelaka.github.io/dvsgsicalc/  
**Status teknikal (22 November 2026):** Login Google DVS, pengiraan GSI LIVE, bacaan sejarah dan **simpan rekod production ke Google Sheets** telah berjaya diperhatikan. Ini **bukan** pengesahan saintifik atau kelulusan penggunaan rasmi organisasi.

## Seni bina LIVE

- **Frontend:** GitHub Pages / PWA 3D Clay.
- **Login:** Google Identity Services; akses cloud memerlukan akaun Google Workspace `@dvs.gov.my` yang disahkan oleh Cloudflare Worker.
- **Backend:** Cloudflare Worker `dvs-gsi-api` dengan pengesahan token ID Google.
- **Pangkalan data tunggal:** Google Sheets sedia ada, tab **Rekod GSI**. Worker menggunakan Google Sheets API dan Service Account production `dvs-gsi-sheets` yang mempunyai akses Editor.
- **Simpanan:** Butang **Simpan Rekod** menghantar pemeriksaan yang sah ke API; kejayaan dipaparkan selepas respons backend. Sejarah cloud memaparkan rekod yang dibenarkan kepada pengguna.
- **Pemadaman cloud:** **Belum diaktifkan** pada frontend dan disekat di Worker. Jangan menganggap butang Padam tersedia.
- **Rekod peranti:** Mod peranti setempat masih wujud; data peranti tidak sama dengan data cloud dan tidak disegerakkan secara automatik.
- **Tanpa Google Apps Script (GAS)** dan tanpa pangkalan data staging GSI.

## Formula

`GSI (%) = (Berat testis kiri + Berat testis kanan) / Berat badan × 100`

Semua berat dalam **gram**. Contoh: (9.2 + 8.8) / 2500 × 100 = **0.72%**.

**Julat rujukan sementara, bukan diagnostik:** kurang 0.30% (bawah julat); 0.30%–1.10% (dalam julat); lebih 1.10% (atas julat). Interpretasi perlu mengambil kira baka, umur, keadaan fisiologi dan bukti saintifik.

## Cara mula

1. Buka aplikasi dalam pelayar dan log masuk menggunakan akaun Google DVS `@dvs.gov.my`.
2. Masukkan ID ayam, baka, umur (bulan), tarikh, lokasi dan berat badan/testis dalam gram. Nama pegawai akan menggunakan profil Google ketika mod cloud.
3. Semak pengiraan LIVE dan kategori; tekan **Simpan Rekod** untuk simpan ke Google Sheets. Tunggu mesej pengesahan.
4. Tekan **Muat Semula Sejarah** untuk membaca semula rekod cloud; **Eksport CSV** untuk rekod yang tersedia dan **Cetak / PDF** untuk laporan.
5. Untuk mod peranti/offline, baca [manual](docs/USER_MANUAL.md) kerana rekod lokal bukan sandaran rekod Google Sheets.

## Pencapaian & dokumentasi

- [Checkpoint LIVE — 22 November 2026](docs/CHECKPOINT_2026-11-22.md)
- [Manual pengguna](docs/USER_MANUAL.md)
- [Integrasi Google Sheets dan operasi](docs/GOOGLE_SHEETS.md)
- [Keselamatan dan status release](docs/SECURITY_RELEASE.md)
- [Skop projek](docs/PROJECT.md)
- [Formula](docs/FORMULA.md)
- [Cadangan carta umur 1–12 bulan](docs/AGE_CHART.md)

**Perhatian:** Carta umur belum dilaksanakan kerana data rujukan bulanan yang sah belum tersedia. Jangan masukkan data pemeriksaan atau kunci/credential ke GitHub awam. Penggunaan logo/warna DVS bukan bukti kelulusan rasmi.
