# Manual Penggunaan — DVS GSI Calculator 3D

**Alamat:** https://itumelaka.github.io/dvsgsicalc/  
**Kemas kini:** 22 November 2026 — fungsi simpan rekod Google Sheets LIVE telah berjaya digunakan.

## 1. Log masuk
1. Buka laman dalam Chrome, Edge atau Safari semasa internet tersedia.
2. Pilih log masuk Google dan gunakan akaun DVS `@dvs.gov.my` yang dibenarkan.
3. Selepas login berjaya, borang kalkulator dan sejarah pemeriksaan dipaparkan. Dalam mod Google Sheets, medan **Nama Pegawai** diisi menggunakan profil akaun login.

**Jika tidak boleh login:** pastikan akaun DVS yang betul dipilih, sambungan internet aktif dan cuba muat semula halaman. Jangan kongsi token/kod akses kepada orang lain.

## 2. Isi maklumat pemeriksaan
1. Masukkan **ID Ayam**, **Baka**, **Umur (bulan)**, **Tarikh Pemeriksaan** dan **Lokasi / Ladang**.
2. Masukkan **Berat Badan Ayam (g)**, **Testis Kiri (g)** dan **Testis Kanan (g)**. Gunakan gram untuk ketiga-tiga ukuran.
3. Sistem memaparkan **Jumlah Berat Testis**, **GSI (%)** dan kategori julat secara LIVE.
4. Jika **DATA TIDAK SAH** muncul, semak medan kosong, berat badan sifar/negatif, ukuran bukan angka atau jumlah testis yang melebihi berat badan.

Formula: `GSI (%) = (Testis kiri + Testis kanan) / Berat badan × 100`.

## 3. Simpan rekod ke Google Sheets
1. Pastikan mod **Rekod Google Sheets** digunakan, akaun DVS masih login dan sambungan internet aktif.
2. Semak semua butiran pemeriksaan **sebenar** sebelum menyimpan.
3. Klik **Simpan Rekod**.
4. Tunggu mesej hijau seperti **“Rekod [ID] disahkan tersimpan dalam Google Sheets.”**. Mesej ini menandakan permintaan simpan telah disahkan oleh backend.
5. Semak rekod di bahagian **Sejarah Pemeriksaan**; klik **Muat Semula Sejarah** untuk memuatkan data terkini.

**Jangan tekan Simpan berulang kali tanpa sebab** jika sambungan lambat. Jika permintaan gagal, semak mesej ralat sebelum mencuba semula. Tiada rekod dummy patut dimasukkan ke pangkalan data production.

## 4. Sejarah, CSV, PDF dan Reset
- **Sejarah Pemeriksaan:** memaparkan rekod cloud yang dibenarkan kepada akaun semasa; bukan semestinya semua baris spreadsheet.
- **Muat Semula Sejarah:** baca data semasa dari Google Sheets.
- **Eksport CSV:** muat turun senarai rekod yang tersedia untuk pengguna; lindungi fail eksport kerana boleh mengandungi nama pegawai dan lokasi.
- **Cetak / PDF:** buka fungsi cetak/pengesahan pelayar.
- **Reset:** kosongkan borang untuk pemeriksaan seterusnya; **tidak memadam rekod yang telah disimpan**.
- **Padam:** **belum tersedia** untuk rekod Google Sheets dalam release ini (ditandakan `—`).

## 5. Mod peranti dan pemasangan PWA
- Aplikasi menyediakan mod **Rekod Peranti** (`localStorage`); rekod mod ini berasingan daripada Google Sheets dan boleh hilang jika data pelayar dibersihkan atau peranti ditukar.
- Android: Chrome → **Install app / Add to Home screen**. iPhone: Safari → **Share → Add to Home Screen**.
- Cache PWA boleh memuatkan shell aplikasi secara offline selepas lawatan online; **login baru dan operasi Google Sheets memerlukan internet**, dan data mod peranti tidak disegerakkan automatik.
- Jika masih nampak butang Simpan berwarna kelabu selepas release terkini, buat **Ctrl + Shift + R** pada komputer untuk memuat semula fail aplikasi.

## 6. Perhatian keselamatan dan saintifik
- Gunakan peranti dan akaun yang dibenarkan, kemudian **Log Keluar** pada peranti berkongsi.
- Jangan kongsi token login, kata laluan, private key atau fail data rasmi secara terbuka.
- Ikut SOP pensampelan, kebajikan haiwan, bioselamatan dan arahan pentadbir.
- Label 0.30%–1.10% ialah julat **sementara**, bukan diagnosis kesuburan atau kualiti sperma.

Baca juga [Integrasi Sheets](GOOGLE_SHEETS.md) dan [Checkpoint LIVE](CHECKPOINT_2026-11-22.md).
