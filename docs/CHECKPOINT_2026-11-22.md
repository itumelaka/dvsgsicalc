# Checkpoint GSI Calculator — 22 November 2026

**Repositori:** `itumelaka/dvsgsicalc`  
**Frontend:** https://itumelaka.github.io/dvsgsicalc/  
**Backend production:** `https://dvs-gsi-api.itumelaka.workers.dev`  
**Pangkalan data tunggal:** Google Sheets utama, tab `Rekod GSI`  
**Pilihan seni bina yang dikekalkan:** GitHub Pages + Google Identity Services + Cloudflare Worker + Google Sheets API (**tanpa GAS**).

## Pencapaian yang disahkan

1. Login menggunakan akaun Google `@dvs.gov.my` telah berfungsi dan borang kalkulator dilindungi di sebalik login.
2. Pengiraan LIVE menggunakan formula `(testis kiri + testis kanan) / berat badan × 100` dan memaparkan kategori julat sementara.
3. Sebelum pemulihan, bacaan Google Sheets API memulangkan `403 PERMISSION_DENIED`. API Enabled, Service Account production aktif, Secret Cloudflare menunjukkan identiti production, spreadsheet ID dan tab sepadan serta izin Editor tercatat.
4. Pemilik spreadsheet membuang kemudian memberikan semula **izin Editor kepada Service Account production yang sama**. Selepas itu, pengguna memaparkan `GET /api/records` dengan HTTP 200 dan mesej sejarah berjaya dikemas kini. Punca dalaman Google bagi 403 tidak diketahui secara definitif.
5. Frontend GitHub `main` commit `e1e446eec9be86afcddbf38c3219af42ed5542d3` membuka `Simpan Rekod` cloud (`cloudReadOnly=false`) tetapi menyembunyikan pemadaman cloud.
6. Cloudflare Worker production mempunyai `GSI_WRITES_ENABLED=true` dan kod production yang menyekat `DELETE` secara berasingan. Secret kekal sebagai `secret_text` dan bindings asal dikekalkan selepas kemas kini.
7. Pengguna menunjukkan mesej **“Rekod CN002 disahkan tersimpan dalam Google Sheets”**, sejarah **1 rekod**, dan baris spreadsheet yang sepadan pada 22 November 2026. Ini mengesahkan **sekurang-kurangnya satu** penulisan end-to-end sebenar. Jangan reka rekod ujian atau mengulang simpan data dummy.
8. Akaun Service Account GSI staging telah dipadam oleh pengguna selepas audit; Worker staging GSI tiada. **Jangan** ganggu sumber staging milik projek lain.

## Status release

| Bahagian | Status pada checkpoint | Bukti/nota |
|---|---|---|
| Frontend GitHub Pages | LIVE | Pengguna memaparkan UI kalkulator dan sejarah |
| Google login DVS | Berfungsi | Google ID token diterima melalui Worker |
| Pengiraan GSI LIVE | Berfungsi | Hasil pengiraan dipaparkan |
| GET sejarah cloud | Berfungsi | Network HTTP 200 dan UI sejarah |
| POST Simpan ke Google Sheets | Berfungsi untuk rekod yang diperhatikan | Mesej pengesahan + baris sebenar di spreadsheet |
| CSV / Cetak/PDF | Fungsi kod tersedia | Belum disahkan secara berasingan dalam checkpoint ini |
| DELETE cloud | **Dilumpuhkan** | UI menanda `—`; backend production menyekat DELETE |
| Kualiti saintifik/julat rujukan | **Belum disahkan secara rasmi** | Bukan keputusan diagnostik |
| Ujian ramai pegawai, beban dan recovery | **Belum lengkap** | Jangan andaikan satu transaksi membuktikan semuanya |

## Konfigurasi yang mesti dikekalkan

- Worker: `dvs-gsi-api` sahaja untuk GSI production.
- Spreadsheet: `1bAxIm4CC4uJZVjT6_iEi4p4o8N5r-54__N6JfC4s4mI`; tab `Rekod GSI`.
- Service Account: `dvs-gsi-sheets@dvs-gsi-calculator.iam.gserviceaccount.com`, izin **Editor** pada spreadsheet utama.
- `APP_ORIGIN=https://itumelaka.github.io`.
- `GSI_WRITES_ENABLED=true` untuk POST, **bukan** kebenaran DELETE.
- `GOOGLE_SERVICE_ACCOUNT_JSON` = Secret Cloudflare; jangan salin nilai/token/kunci ke GitHub, isu awam atau log.
- Tiada Google Apps Script, Worker staging GSI atau spreadsheet ujian baharu.

## Risiko dan tugasan seterusnya

1. **Prioriti tertinggi — drift kod sumber:** Bundle Worker yang LIVE telah dikemas kini terus melalui Cloudflare untuk diagnostik 403 dan penguncian DELETE. Kod di branch PR `feature/cloudflare-gsi-api` belum dijamin mengandungi perubahan itu; melakukan redeploy daripada branch tanpa penyelarasan boleh mengembalikan konfigurasi/perilaku lama. Selaraskan source, semak HEAD dan rancang rollout tanpa force-push.
2. **Security review:** Sahkan hak admin/pemilik, prosedur akses untuk staf DVS, kitar semula kunci secara terkawal jika perlu, dan audit log tanpa mendedahkan token.
3. **Kawalan operasi:** Uji idempotensi/duplikasi, kegagalan rangkaian dan integriti rekod melalui kaedah tidak merosakkan data; jangan padam atau cipta rekod palsu.
4. **Manual/latihan:** Terangkan perbezaan mod Google Sheets dengan mod peranti serta kesan offline/PWA.
5. **Kelulusan domain:** Ambang GSI ialah rujukan sementara, bukan pengesahan kesuburan; semakan pakar veterinar dan SOP diperlukan.
6. **PR #1:** Semak kandungan dan status sebelum merge; jangan anggap PR telah disatukan ke `main`.

## Keputusan kerja dokumentasi

Pada checkpoint ini, kemas kini Markdown untuk `README.md`, `docs/PROJECT.md`, `docs/GOOGLE_SHEETS.md`, `docs/USER_MANUAL.md`, `docs/SECURITY_RELEASE.md` serta fail checkpoint ini dihantar terus ke GitHub `main`. **Tiada penulisan/ubah suai rekod sebenar** dilakukan oleh proses dokumentasi.

## Peraturan sambungan

Mulakan sesi seterusnya dengan menyemak HEAD terkini GitHub dan tetapan Worker production. Jangan mula semula pembangunan atau memadam sumber LIVE. Kekalkan satu spreadsheet utama. Bezakan jelas perubahan **dokumentasi** daripada perubahan **kod Worker** yang memerlukan pengesahan tersendiri.
