# Keselamatan & Status Release — DVS GSI Calculator

**Tarikh semakan:** 22 November 2026. **Status:** Aliran production login → kira → baca → simpan ke Sheets telah berjaya diperhatikan menggunakan rekod pemeriksaan sebenar; **belum diluluskan sebagai alat diagnostik rasmi**.

## Seni bina dan akses
- Frontend HTTPS di GitHub Pages, backend HTTPS Cloudflare Worker `dvs-gsi-api`, data dalam satu spreadsheet Google Sheets Restricted.
- Backend mengesahkan Google ID token (signature/JWKS, issuer, audience, hosted domain `dvs.gov.my`, `email_verified`, `sub`); frontend sahaja bukan kawalan akses.
- Service Account production mengakses Sheets melalui JSON private key yang disimpan dalam Cloudflare encrypted Secret. **Jangan** letak credential/token dalam kod, GitHub, log atau screenshot.
- GET sejarah dan eksport CSV ditapis mengikut pemilikan rekod (melainkan identiti ditetapkan admin oleh konfigurasi).
- POST perlu input sah, pengguna login, dan `GSI_WRITES_ENABLED=true`; penggunaan ID rekod UUID mengurangkan risiko pendua pada retry.
- **DELETE cloud ditutup dalam bundle production** walaupun kod sumber lama mungkin masih memaparkan laluan tersebut. Jangan redeploy tanpa menyelaraskan guard ini.

## Risiko dan pemerhatian
1. **Ketidakselarasan source/deployment:** Kod sumber Worker dalam PR `feature/cloudflare-gsi-api` belum dijamin mencerminkan perubahan hotfix dan sekatan DELETE pada bundle Cloudflare LIVE. Pengubahsuaian/penerbitan semula tanpa semakan boleh menyebabkan regresi. Ini isu operasi utama untuk dibereskan.
2. **Credential jangka panjang:** Private key Service Account perlu dikendalikan secara sulit; pertimbangkan rancangan key rotation terkawal dan kebenaran minimum, bukan memutar kunci tanpa rollback.
3. **Polisi dan peranan:** Semak senarai admin yang dibenarkan dan keperluan perkongsian rasmi; jangan andaikan semua akaun `@dvs.gov.my` mempunyai kelulusan penggunaan organisasi.
4. **Data setempat:** `localStorage` dan fail CSV eksport boleh mendedahkan data di peranti berkongsi; laporkan kepada pentadbir jika peranti/akaun hilang.
5. **Kesahihan saintifik:** Julat rujukan sementara bukan ambang klinikal disahkan; semakan pakar dan SOP masih perlu.
6. **PWA/cache:** Selepas kemas kini, semak versi aplikasi pada peranti; browser/cache lama mungkin menampilkan butang terkunci.
7. **Ujian/ketahanan:** Bukti LIVE merangkumi bacaan dan **satu** simpanan berjaya, bukan bukti ujian peranan pelbagai pengguna, restore, idempotensi produksi, beban atau integrasi keselamatan lengkap.

## Keputusan release 22 November 2026
- **Disahkan oleh bukti pengguna:** Login DVS, paparan kalkulator LIVE, GET sejarah HTTP 200, POST simpan yang memberi pengesahan dan baris sepadan dalam Google Sheets.
- **Dikekalkan:** Spreadsheet utama, Service Account production, Cloudflare Worker production, kebenaran fail Restricted.
- **Tidak dilaksanakan:** GAS, staging baharu, rekod dummy, fungsi Padam cloud.
- **Belum selesai:** Selaraskan GitHub Worker source dengan production bundle; semak audit/admin dan kelulusan operasi sebelum peluasan penggunaan.

## Semakan penerimaan fungsian (rujukan)
- (2500, 9.2, 8.8) → GSI 0.72%.
- Kosong, berat badan ≤ 0, berat testis negatif, jumlah testis > badan → tidak sah.
- 0.30% dan 1.10% termasuk dalam kategori julat.
- Sahkan cetak/PDF, eksport CSV, install PWA dan cache selepas kemas kini secara berasingan; jangan dakwa semuanya telah diuji LIVE pada 22 November.

Lihat [Checkpoint](CHECKPOINT_2026-11-22.md), [Manual](USER_MANUAL.md), dan [Google Sheets](GOOGLE_SHEETS.md).
