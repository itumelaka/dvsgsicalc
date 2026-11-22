# Skop dan pencapaian projek — DVS GSI Calculator

## Asal dan tujuan
Keperluan daripada perbincangan WhatsApp bersama Dr Farrah Alias pada 10 April 2026: alat pengiraan Gonadosomatic Index (GSI) ayam jantan daripada berat badan serta berat testis kiri dan kanan, tanpa EBV.

## Fungsi yang telah dilaksanakan (22 November 2026)
- Kalkulator GSI LIVE, jumlah testis dan kategori julat rujukan sementara.
- Antaramuka 3D Clay dengan gaya warna DVS; medan ID ayam, baka, umur, tarikh, lokasi dan nama pegawai.
- Google OAuth / Google Identity Services untuk akaun DVS `@dvs.gov.my`, dengan token identiti disahkan di Cloudflare Worker.
- Cloudflare Worker production → Google Sheets API → **satu** spreadsheet utama, tab `Rekod GSI`.
- Simpan pemeriksaan sebenar, baca semula sejarah cloud, eksport CSV dan cetak/PDF.
- Mod rekod peranti melalui `localStorage` dan PWA dengan cache shell aplikasi.
- Pemadaman cloud **dikunci**, tidak tersedia untuk pengguna pada release ini.

## Bukti pencapaian
Pada 22 November 2026, pengguna menunjukkan respons GET sejarah HTTP 200 selepas akses Editor Service Account ke fail dikongsi semula. Selepas fungsi Simpan dibuka, pengguna memaparkan mesej kejayaan serta satu rekod sebenar dalam sejarah dan baris Google Sheets yang sepadan. Ini mengesahkan satu aliran simpanan end-to-end; ia **bukan** ujian beban, ujian semua pengguna atau pengesahan diagnostik.

## Di luar skop semasa
EBV, ramalan kesuburan, norma khusus baka, carta purata GSI bulanan tanpa data rujukan, pemadaman cloud oleh pengguna, dan pengesahan rasmi sistem sebagai alat diagnostik.

## Baki tugas
Penyelarasan kod sumber Worker di GitHub dengan bundle production yang telah dikemas kini terus di Cloudflare; ujian kawalan akses dan operasi penulisan tanpa rekod dummy; semakan SOP, keselamatan data, dan kelulusan penggunaan organisasi. Rujuk [checkpoint](CHECKPOINT_2026-11-22.md) serta [security](SECURITY_RELEASE.md).
