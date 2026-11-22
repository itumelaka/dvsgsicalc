export const recordFields = [
  'date', 'id', 'breed', 'age', 'officer', 'location', 'body', 'left', 'right',
  'total', 'gsi', 'category', 'savedAt',
];

export const recordHeaders = [
  'Tarikh Pemeriksaan', 'ID Ayam', 'Baka', 'Umur (Bulan)', 'Nama Pegawai',
  'Lokasi / Ladang', 'Berat Badan (g)', 'Testis Kiri (g)', 'Testis Kanan (g)',
  'Jumlah Testis (g)', 'GSI (%)', 'Kategori GSI', 'Tarikh Rekod',
];

export function numberInput(value) {
  if (typeof value === 'number') return value;
  return typeof value === 'string' && value.trim() !== '' ? Number(value) : NaN;
}

export function measures(body, left, right) {
  const [b, l, r] = [body, left, right].map(numberInput);
  const total = l + r;
  if (![b, l, r].every(Number.isFinite) || b <= 0 || l < 0 || r < 0 || total > b) {
    return null;
  }
  return { b, l, r, total, gsi: total / b * 100 };
}

export function category(gsi) {
  if (gsi < 0.3) return 'BAWAH JULAT RUJUKAN';
  return gsi <= 1.1 ? 'DALAM JULAT RUJUKAN' : 'ATAS JULAT RUJUKAN';
}

function csvCell(value) {
  let text = String(value ?? '');
  if (/^[\t\r\n]|^\s*[=+@\-＝＋＠－]/u.test(text)) text = "'" + text;
  return '"' + text.replaceAll('"', '""') + '"';
}

export function recordsCsv(records) {
  const rows = records.map(record => {
    const weights = measures(record.body, record.left, record.right);
    const gsi = numberInput(record.gsi);
    const values = {
      ...record,
      total: record.total ?? weights?.total.toFixed(2),
      category: record.category ?? (Number.isFinite(gsi) ? category(gsi) : ''),
    };
    return recordFields.map(field => csvCell(values[field])).join(',');
  });
  return '\uFEFF' + [recordHeaders.map(csvCell).join(','), ...rows].join('\r\n');
}
