# DVS GSI Calculator — 3D Clay PWA

**Web app:** https://itumelaka.github.io/dvsgsicalc/

Kalkulator Gonadosomatic Index (GSI) ayam jantan baka untuk kegunaan percubaan pegawai lapangan. **Status: prototaip, bukan alat diagnostik kesuburan yang disahkan.**

## Fungsi
- Pengiraan GSI secara LIVE.
- Maklumat ID ayam, baka, umur (bulan), tarikh, pegawai dan lokasi.
- Rekod setempat dalam pelayar, eksport CSV, cetak/PDF, reset.
- Antaramuka 3D Clay warna inspirasi DVS; butang timbul dengan animasi.
- **Progressive Web App**: boleh dipasang pada telefon dan digunakan offline selepas lawatan pertama berjaya.

## Formula
`GSI (%) = (Berat testis kiri + Berat testis kanan) / Berat badan × 100`

Semua berat mesti dalam **gram**. Contoh: (9.2 + 8.8) / 2500 × 100 = **0.72%**. Dalam mesej asal, “1800 gm” ialah salah taip; jumlah sebenar **18.0 g**.

**Julat sementara (bukan diagnostik):** <0.30% bawah julat; 0.30%–1.10% dalam julat; >1.10% atas julat. Interpretasi bergantung pada baka, umur, keadaan fisiologi dan bukti saintifik.

## Cara guna
1. Buka halaman web di atas.
2. Isi maklumat ayam dan tiga ukuran berat dalam gram.
3. Semak keputusan GSI LIVE; tekan **Simpan Rekod**, **Eksport CSV** atau **Cetak / PDF**.
4. Android: menu Chrome → **Install app** / **Add to Home screen**. iOS Safari: **Share → Add to Home Screen**.
5. Buka laman sekurang-kurangnya sekali ketika online untuk membolehkan cache offline.

**Data disimpan pada pelayar/peranti sahaja**. Ia boleh hilang selepas padam data pelayar atau tukar peranti. Eksport CSV secara berkala; jangan dedahkan rekod pegawai dalam GitHub awam.

## Dokumentasi
- [Skop projek](docs/PROJECT.md)
- [Formula](docs/FORMULA.md)
- [Manual penggunaan](docs/USER_MANUAL.md)
- [Spesifikasi carta GSI mengikut umur 1–12 bulan](docs/AGE_CHART.md)
- [Keselamatan dan release](docs/SECURITY_RELEASE.md)

Carta umur adalah **cadangan yang belum dilaksanakan**, kerana petikan pengarah tidak membekalkan data GSI bulanan. Jangan mencipta lengkung data rekaan.

**Penafian:** Penggunaan logo/warna DVS tidak bermaksud kelulusan rasmi. Penggunaan operasi rasmi memerlukan semakan kesahan saintifik, SOP dan tadbir urus data.
