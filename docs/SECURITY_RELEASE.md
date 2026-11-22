# Keselamatan & Release — PWA

## Sistem
GitHub Pages menyediakan PWA statik melalui HTTPS. Apabila URL API dikonfigurasi, Cloudflare Worker mengesahkan tandatangan token Google, klien OAuth, tempoh sah, e-mel disahkan dan domain hos Workspace `dvs.gov.my`. Ia menggunakan akaun perkhidmatan khusus untuk memanggil Sheets. Google boleh menapis pilihan akaun mengikut domain, dan Worker tetap mengesahkan kelayakan akaun sebelum memproses rekod.

Token pegawai dan sejarah Google Sheets berada dalam memori tab dan dilupus semasa log keluar atau sesi tamat. Service worker cache hanya fail aplikasi awam. Mod peranti kekal menggunakan `localStorage`. Ikuti [panduan integrasi](GOOGLE_SHEETS.md) untuk konfigurasi dan pengesahan LIVE.

## Risiko
- Hilang data apabila storage dipadam atau peranti ditukar.
- Rekod di peranti kongsi boleh dibaca pengguna lain.
- CSV mungkin mengandungi data pegawai/lokasi; simpan di repositori dibenarkan, **jangan commit rekod sebenar ke GitHub awam**.
- Rekod peranti tidak mempunyai audit berpusat. Mod Google Sheets menyimpan pengenal akaun pembuat dan tanda audit padam bersama rekod API.
- GitHub Pages menetapkan akses pada origin `https://itumelaka.github.io`. Pentadbir projek perlu mengawal kandungan aktif yang diterbitkan pada origin itu.
- Penggunaan identiti DVS perlukan semakan/kelulusan.

## PWA
Manifest mengisytihar nama, warna, ikon dan mod standalone. Service worker memasang cache app shell dan fallback offline. Service worker hanya terpasang pada HTTPS/localhost, bukan apabila fail dibuka melalui `file://`.

## Semakan penerimaan
- (2500, 9.2, 8.8) → 0.72%.
- Input kosong, negatif, berat badan 0 dan jumlah testis > berat badan → ralat.
- Julat 0.30% dan 1.10% adalah inklusif.
- Uji install/offline di Android, iOS; uji cetakan PDF dan eksport CSV.
- Uji semula selepas penukaran versi cache; sahkan aplikasi terbaru diterima.

## Status
Kod disediakan sebagai prototaip; semakan pelayar/peranti sebenar dan pengesahan saintifik serta organisasi masih diperlukan sebelum pelepasan rasmi.
