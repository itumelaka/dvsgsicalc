# Integrasi Google Sheets

Spreadsheet disediakan oleh pemilik projek:
https://docs.google.com/spreadsheets/d/1bAxIm4CC4uJZVjT6_iEi4p4o8N5r-54__N6JfC4s4mI/edit

Tab **Rekod GSI** (13 lajur) dikonfigurasikan:
Tarikh Pemeriksaan, ID Ayam, Baka, Umur (Bulan), Nama Pegawai, Lokasi / Ladang, Berat Badan (g), Testis Kiri (g), Testis Kanan (g), Jumlah Testis (g), GSI (%), Kategori GSI, Tarikh Rekod.

**Status:** Struktur Google Sheets sahaja tersedia. Calculator GitHub Pages belum disambungkan untuk menyimpan automatik ke spreadsheet. Butang Simpan Rekod masih menggunakan localStorage dan Eksport CSV untuk dipindah secara manual.

**Keselamatan:** Jangan jadikan Google Sheets boleh sunting kepada umum, jangan letakkan token/kunci API atau URL Apps Script yang memberi akses tanpa pengesahan dalam laman statik. Untuk penyegerakan automatik, guna backend yang mempunyai pengesahan serta pengesahan input, atau perantara identiti yang dikawal pentadbir. Perlu pengesahan skop data, hak akses pegawai, audit dan pengendalian ralat sebelum pengeluaran rasmi.

**Penggunaan semasa:** Eksport CSV daripada aplikasi, kemudian import data ke tab `Rekod GSI` selepas semak pemetaan lajur. Elakkan menyimpan data sensitif dalam repository GitHub awam.
