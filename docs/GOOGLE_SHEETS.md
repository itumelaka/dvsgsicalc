# Integrasi Google Sheets — Production

**Status 22 November 2026:** Bacaan dan simpanan LIVE berjaya diperhatikan menggunakan **Cloudflare Worker + Google Sheets API**, tanpa GAS.

## Lokasi data
- Spreadsheet **tunggal**: https://docs.google.com/spreadsheets/d/1bAxIm4CC4uJZVjT6_iEi4p4o8N5r-54__N6JfC4s4mI/edit
- Tab: **Rekod GSI**.
- Lajur A:M (13 medan asal): Tarikh Pemeriksaan, ID Ayam, Baka, Umur (Bulan), Nama Pegawai, Lokasi / Ladang, Berat Badan (g), Testis Kiri (g), Testis Kanan (g), Jumlah Testis (g), GSI (%), Kategori GSI, Tarikh Rekod.
- Lajur N:P: ID Rekod API, ID Akaun Pegawai, Status Rekod API. Disediakan untuk pengenalpastian, hak rekod dan audit.
- **Jangan** cipta spreadsheet staging, tukar ID spreadsheet atau padam rekod sebenar untuk pengujian.

## Aliran sistem
1. Pegawai log masuk menggunakan akaun `@dvs.gov.my`; frontend memperoleh Google ID token.
2. Worker `dvs-gsi-api` mengesahkan tandatangan token, issuer, audience, hosted domain dan e-mel pengguna.
3. Worker mengakses Google Sheets API melalui token Service Account `dvs-gsi-sheets@dvs-gsi-calculator.iam.gserviceaccount.com` yang disimpan sebagai Cloudflare **Secret** (JSON private key tidak berada dalam frontend/repo).
4. GET `/api/records` membaca rekod yang dibenarkan; POST `/api/records` memvalidasi input dan menyimpan. Worker menggunakan ID rekod UUID untuk mengekalkan idempotensi percubaan semula. Kod backend mempunyai laluan pemadaman tetapi **DELETE disekat** dalam deployment production semasa.
5. Sejarah cloud dan CSV berasaskan senarai rekod yang dibenarkan kepada pengguna; mod peranti menggunakan data setempat yang berasingan.

## Pemulihan akses Google pada 22 November 2026
Sebelum pembetulan, Google Sheets API memulangkan `403 PERMISSION_DENIED` walaupun API Enabled, Service Account aktif dan perkongsian Editor dipaparkan. Pemilik fail membuang dan **berkongsi semula akses Editor kepada Service Account production yang sama**. Selepas itu GET `/api/records` kembali HTTP 200; operasi simpan sebenar turut menunjukkan kejayaan. Ini urutan pemerhatian yang berjaya, **bukan bukti definitif** mengapa Google menolak akses sebelumnya.

## Konfigurasi penting
- Worker production: `dvs-gsi-api`.
- `SHEETS_SPREADSHEET_ID`: ID spreadsheet tunggal di atas.
- `SHEETS_TAB`: `Rekod GSI`.
- `GOOGLE_SERVICE_ACCOUNT_JSON`: Cloudflare encrypted Secret; **jangan papar, commit atau berkongsi private key**.
- `APP_ORIGIN`: `https://itumelaka.github.io`.
- `GOOGLE_CLIENT_ID`: OAuth Web Client Google DVS Calculator.
- `GSI_WRITES_ENABLED`: `true` untuk POST dalam Worker production; DELETE mempunyai sekatan berasingan dalam bundle LIVE.

## Peraturan operasi
- Jangan beri perkongsian `Anyone with the link`; kekalkan spreadsheet Restricted.
- Jangan tampal Google ID token, kunci Service Account, URL permintaan bercredential atau data sebenar dalam isu GitHub awam.
- Jangan tukar kunci, perkongsian atau Worker production tanpa sebab dan pelan rollback.
- Kejayaan bacaan **tidak** membuktikan setiap jenis simpanan; pengesahan yang direkod pada checkpoint ialah satu rekod sebenar.
- Kod Worker dalam PR `feature/cloudflare-gsi-api` mungkin tidak sama dengan bundle production yang dikemas kini terus; **selaraskan sebelum redeploy daripada GitHub**, untuk mengelakkan menghidupkan semula pemadaman atau membuang diagnostik/guard.
