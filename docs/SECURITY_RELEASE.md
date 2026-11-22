# Keselamatan & Release — PWA

## Sistem
GitHub Pages statik, HTTPS, tiada backend atau login. Data rekod disimpan dalam **localStorage peranti**, bukan dihantar ke pelayan. Service worker cache hanya fail aplikasi awam, bukan rekod pemeriksaan.

## Risiko
- Hilang data apabila storage dipadam atau peranti ditukar.
- Rekod di peranti kongsi boleh dibaca pengguna lain.
- CSV mungkin mengandungi data pegawai/lokasi; simpan di repositori dibenarkan, **jangan commit rekod sebenar ke GitHub awam**.
- Tiada audit trail/akses berpusat; belum sesuai sebagai sistem rekod rasmi.
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
