# Integrasi Cloudflare Workers dan Google Sheets

[Spreadsheet DVS GSI](https://docs.google.com/spreadsheets/d/1bAxIm4CC4uJZVjT6_iEi4p4o8N5r-54__N6JfC4s4mI/edit) menggunakan tab **Rekod GSI** dengan 13 lajur asal di A:M. Worker mengesahkan tajuk lajur sebelum membaca atau menulis. Semasa simpanan pemeriksaan sebenar yang pertama melalui API, Worker mengisi ruang kosong N:P untuk ID rekod, ID akaun pegawai dan status audit.

GSI dikira semula oleh Worker. Nama pegawai datang daripada identiti Google yang disahkan. Simpan semula borang yang sama menggunakan ID permintaan yang sama, termasuk jika sambungan terputus selepas Google menerima simpanan. Reset borang sebelum memulakan pemeriksaan baharu.

Pegawai melihat dan memadam rekod sendiri. Penyelaras yang ditetapkan dalam `GSI_ADMIN_EMAILS` boleh melihat dan mengeksport semua rekod aktif, termasuk rekod lama A:M yang tiada ID API. Penyelaras boleh memadam rekod yang mempunyai ID API. Padam mengecualikan rekod daripada sejarah dan CSV serta mengekalkan baris dalam Sheets dengan status audit `DIPADAM`. Kekalkan N:P dan metadata pembangun apabila menyunting tab. Jika perlu mengisih secara manual, isih seluruh rekod termasuk N:P.

## 1. Kelulusan dan konfigurasi Google

1. Dapatkan pengesahan pentadbir DVS untuk projek Google Cloud, aplikasi Google OAuth dan penggunaan Worker untuk rekod GSI. Polisi DVS menentukan tetapan Audience dan pengguna yang dibenarkan. Pilih **Internal** jika klien berada dalam organisasi DVS dan pentadbir meluluskannya.
2. Di **Google Auth Platform → Clients**, gunakan klien OAuth jenis **Web application**. Masukkan `https://itumelaka.github.io` sebagai **Authorized JavaScript origin**, tanpa laluan `/dvsgsicalc/`. Log masuk menggunakan Google Identity Services untuk identiti pegawai.
3. Aktifkan **Google Sheets API** dalam projek yang diluluskan. Gunakan akaun perkhidmatan khusus dengan akses **Viewer** untuk semakan baca, dan **Editor** untuk spreadsheet yang dibenarkan menerima penulisan. Worker meminta skop `spreadsheets.readonly` bagi sejarah dan CSV, serta `spreadsheets` bagi operasi tulis yang dibenarkan. Tiada domain-wide delegation diperlukan.
4. Jika polisi mengizinkan kunci akaun perkhidmatan, masukkan JSON kunci terus sebagai **Secret** Cloudflare. Jika polisi menyekat kunci atau perkongsian kepada akaun perkhidmatan, minta pentadbir menentukan kaedah yang dibenarkan sebelum sambung LIVE.

## 2. Deploy Worker pada pelan Free

Sahkan **Workers Free** di akaun Cloudflare sebelum deploy. Diagnostik Observability ditetapkan kepada off dalam konfigurasi Worker. Pilih satu cara deploy.

- **Dashboard Cloudflare.** Dalam **Workers & Pages**, pilih import repository GitHub `itumelaka/dvsgsicalc`. Gunakan branch yang mengandungi perubahan ini, **Root directory** `worker` dan **Deploy command** `npx wrangler deploy --keep-vars`. Selepas perubahan disemak dan digabungkan, tukar production branch ke `main` jika menggunakan integrasi Git.
- **Wrangler.** Dalam checkout repo, masuk ke direktori `worker`. Jalankan `npm ci`, `npx wrangler login` dan `npm run deploy` menggunakan akaun Cloudflare yang ditetapkan.

Pada Worker yang dideploy, tambah binding berikut di **Settings → Variables and Secrets**.

| Nama | Jenis | Nilai |
|---|---|---|
| `APP_ORIGIN` | Text | `https://itumelaka.github.io` (daripada Wrangler) |
| `SHEETS_TAB` | Text | `Rekod GSI` (daripada Wrangler) |
| `GOOGLE_CLIENT_ID` | Text | ID klien Web OAuth yang diluluskan |
| `SHEETS_SPREADSHEET_ID` | Text | ID spreadsheet sasaran |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Secret | JSON penuh kunci akaun perkhidmatan |
| `GSI_WRITES_ENABLED` | Text, pilihan | Penulisan dimatikan secara lalai. Tetapkan `true` hanya pada deployment yang dibenarkan menulis. |
| `GSI_ALLOWED_EMAILS` | Secret, pilihan | E-mel pegawai perintis yang dibenarkan, dipisahkan dengan koma. Jika kosong, akaun DVS sah boleh mengakses rekod sendiri, tertakluk kepada polisi Google. |
| `GSI_ADMIN_EMAILS` | Secret, pilihan | E-mel penyelaras DVS yang diluluskan, dipisahkan dengan koma. Jika menggunakan senarai pegawai perintis, masukkan penyelaras dalam kedua-dua senarai. |

Simpan kunci di luar checkout Git. Klien ID OAuth ialah maklumat awam. Token, kunci akaun perkhidmatan dan rekod pemeriksaan kekal di luar GitHub.

## 3. Semak dan aktifkan pada frontend

1. Buka `/health` pada URL Worker. Respons HTTP 200 dengan `configured: true` mengesahkan binding tersedia. Ia belum mengesahkan Google menerima akses.
2. Uji login Google melalui frontend ujian pada origin yang diluluskan. Dengan klien OAuth dikonfigurasi, `/api/me` boleh mengesahkan token Google sebelum secret Sheets ditambah.
3. Selepas konfigurasi Sheets, semak `/api/records`. HTTP 401 tanpa token menunjukkan rekod memerlukan log masuk. HTTP 200 dengan token yang diluluskan mengesahkan akses bacaan. Untuk semakan LIVE, biarkan `GSI_WRITES_ENABLED` kosong atau `false`.
4. Untuk ujian tulis dan padam, setkan ID spreadsheet ujian berasingan dan `GSI_WRITES_ENABLED=true` pada deployment ujian. Sahkan ID sasaran deployment sebelum menghantar data ujian.
5. Selepas ujian dan kelulusan production, setkan URL Worker dalam atribut `data-api-url` pada seksyen `cloudAccess` di `index.html`. Semak Eksport CSV, logout dan mod luar talian. Gunakan pemeriksaan sebenar yang dibenarkan untuk pengesahan simpanan LIVE.

Ujian setempat dijalankan dengan `npm test` dan `npm run build` dalam `worker`. Ujian API menggunakan kekunci ujian dan respons Google olok-olok. Build Wrangler ialah dry run.
