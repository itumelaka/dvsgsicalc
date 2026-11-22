import { category, measures, recordsCsv } from './record.mjs';

const $ = id => document.getElementById(id);
const fields = ['id', 'breed', 'age', 'date', 'officer', 'location', 'body', 'left', 'right'];
const storage = 'dvs_gsi_clay_v1';
const cloudReadOnly = false; // Authorized production record saves; deletion remains disabled.
const apiRoot = $('cloudAccess').dataset.apiUrl.trim().replace(/\/+$/, '');
const errors = {
  api_unconfigured: 'API GSI belum dikonfigurasi.',
  dvs_account_required: 'Guna akaun Google Workspace @dvs.gov.my untuk log masuk.',
  google_signin_unavailable: 'Pengesahan Google tergendala. Cuba semula sebentar lagi.',
  invalid_login: 'Sesi telah tamat atau tidak sah. Log masuk semula.',
  invalid_record: 'Semak maklumat pemeriksaan, tarikh dan bacaan berat.',
  login_required: 'Log masuk dengan akaun @dvs.gov.my dahulu.',
  no_records: 'Tiada rekod dalam Google Sheets untuk dieksport.',
  officer_not_allowed: 'Akaun ini belum dibenarkan mengakses projek GSI.',
  record_changed: 'Rekod telah berubah. Muat semula sejarah sebelum cuba semula.',
  record_deleted: 'Rekod ini telah dipadam. Reset borang untuk membuat pemeriksaan baharu.',
  record_key_conflict: 'ID simpanan bertindih. Tekan Simpan Rekod sekali lagi.',
  record_not_found: 'Rekod tidak ditemui atau tiada kebenaran untuk memadam.',
  sheets_access: 'Worker tiada akses ke Google Sheets. Hubungi penyelaras GSI.',
  sheets_credentials_invalid: 'Pengesahan Google Sheets gagal. Hubungi penyelaras GSI.',
  sheets_quota: 'Kuota sementara Google Sheets dicapai. Cuba semula dalam satu minit.',
  sheets_schema: 'Struktur tab Rekod GSI perlu disemak oleh penyelaras.',
  sheets_unavailable: 'Google Sheets tidak dapat dihubungi. Cuba semula dengan borang yang sama.',
  writes_disabled: 'Akses Google Sheets dalam mod baca sahaja. Simpan atau padam belum diaktifkan.',
};

let localRecords = [];
try {
  const stored = JSON.parse(localStorage.getItem(storage) || '[]');
  if (Array.isArray(stored)) localRecords = stored.filter(record => record && typeof record === 'object');
} catch {
  // Recalculation is available even when browser storage is unavailable.
}
let useCloud = Boolean(apiRoot);
let liveRecords = null;
let session = null;
let pendingSave = null;
let busy = false;
let loginLoading = false;
let googleInitialized = false;
let loginUnavailable = '';
let expiryTimer;
let localOfficer = '';

function today() {
  const date = new Date();
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

function notify(message, fail = false) {
  $('notice').textContent = message;
  $('notice').className = fail ? 'notice fail' : 'notice';
}

function calculate() {
  const result = measures($('body').value, $('left').value, $('right').value);
  $('gsi').textContent = result ? result.gsi.toFixed(2) + '%' : '—';
  $('total').textContent = result ? result.total.toFixed(2) + ' g' : '—';
  $('weight').textContent = result ? result.b.toLocaleString('en-MY') + ' g' : '—';
  $('status').textContent = result ? category(result.gsi) : 'DATA TIDAK SAH';
  $('error').textContent = result ? ''
    : 'Sila isi berat dalam gram. Berat badan mesti melebihi 0 dan jumlah testis tidak boleh melebihi berat badan.';
  return result;
}

function formRecord() {
  const result = calculate();
  if (!result) {
    notify('Rekod tidak disimpan. Semak semua bacaan berat.', true);
    return null;
  }
  const empty = fields.find(field => !$(field).value.trim());
  if (empty) {
    notify('Lengkapkan ID ayam, baka, umur, tarikh, pegawai dan lokasi sebelum menyimpan.', true);
    $(empty).focus();
    return null;
  }
  const age = Number($('age').value);
  if (!Number.isFinite(age) || age < 0 || age > 240) {
    notify('Umur mesti antara 0 hingga 240 bulan.', true);
    $('age').focus();
    return null;
  }
  return Object.fromEntries(fields.map(field => [field, $(field).value.trim()]));
}

function persist(next) {
  try {
    localStorage.setItem(storage, JSON.stringify(next));
    localRecords = next;
    return true;
  } catch {
    notify('Gagal menyimpan pada peranti. Semak ruang storan atau mod pelayar.', true);
    return false;
  }
}

function setOfficerField() {
  $('officer').readOnly = useCloud;
  $('officer').value = useCloud ? session?.name ?? '' : localOfficer;
}

function render() {
  const signedIn = Boolean(session);
  const connected = Boolean(session && navigator.onLine);
  // Keep all examination inputs and saved history behind verified DVS sign-in.
  $('calculatorArea').hidden = Boolean(apiRoot) && !signedIn;
  $('historySection').hidden = Boolean(apiRoot) && !signedIn;
  const isCloudDisabled = useCloud && (busy || !connected);
  $('cloudAccess').hidden = !apiRoot;
  $('toggleMode').textContent = useCloud ? 'Rekod Peranti' : 'Rekod Google Sheets';
  $('toggleMode').disabled = busy;
  $('toggleMode').hidden = Boolean(apiRoot) && !signedIn;
  $('googleButton').hidden = Boolean(session) || !navigator.onLine;
  $('retryLogin').hidden = Boolean(session) || !useCloud || !loginUnavailable || !navigator.onLine;
  $('retryLogin').disabled = loginLoading;
  $('logout').hidden = !session;
  $('logout').disabled = busy;
  $('save').disabled = busy || isCloudDisabled || (useCloud && cloudReadOnly);
  $('reset').disabled = busy;
  $('csv').disabled = busy || isCloudDisabled;
  $('refresh').hidden = !useCloud;
  $('refresh').disabled = isCloudDisabled;
  $('accountStatus').textContent = session
    ? session.email + (navigator.onLine ? '' : ' · Luar talian')
    : navigator.onLine ? loginUnavailable || 'Log masuk dengan akaun @dvs.gov.my untuk rekod Google Sheets.'
      : 'Luar talian. Kalkulator dan rekod peranti masih boleh digunakan.';
  $('historyNote').textContent = useCloud
    ? 'Sejarah Google Sheets. Rekod dipadam dikeluarkan daripada sejarah dan eksport.'
    : 'Rekod disimpan dalam pelayar peranti ini. Eksport CSV secara berkala.';

  const list = useCloud ? liveRecords ?? [] : localRecords;
  const rows = $('rows');
  rows.replaceChildren();
  $('count').textContent = list.length + ' rekod';
  if (!list.length) {
    const cell = rows.insertRow().insertCell();
    cell.colSpan = 8;
    cell.textContent = !useCloud || liveRecords ? 'Belum ada rekod disimpan.'
      : session ? 'Sejarah belum dimuatkan.' : 'Log masuk untuk membaca sejarah.';
    return;
  }
  list.forEach((record, index) => {
    const row = rows.insertRow();
    const weights = measures(record.body, record.left, record.right);
    const gsi = String(record.gsi ?? '').replace(/%$/, '');
    const values = [record.date, record.id, record.breed, record.body,
      record.total || weights?.total.toFixed(2), gsi ? gsi + '%' : '', record.officer];
    for (const value of values) row.insertCell().textContent = value === '' || value == null ? '—' : value;

    const cell = row.insertCell();
    if (useCloud) {
      cell.textContent = '—';
      return;
    }
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = 'Padam';
    button.setAttribute('aria-label', 'Padam rekod ' + (record.id || String(index + 1)));
    button.className = 'btn red delete-record';
    button.disabled = busy || isCloudDisabled;
    button.addEventListener('click', () => removeRecord(record, index));
    cell.append(button);
  });
}

async function api(path, { token = session?.token, method = 'GET', body } = {}) {
  const response = await fetch(apiRoot + path, {
    method,
    mode: 'cors',
    cache: 'no-store',
    credentials: 'omit',
    headers: {
      ...(token && { Authorization: 'Bearer ' + token }),
      ...(body && { 'Content-Type': 'application/json' }),
    },
    body: body && JSON.stringify(body),
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) {
    const { error: code } = await response.json().catch(() => ({}));
    const failure = new Error(errors[code] || 'Pelayan rekod GSI tidak dapat dihubungi.');
    failure.code = code;
    failure.status = response.status;
    throw failure;
  }
  return response;
}

function clearSession() {
  clearTimeout(expiryTimer);
  session = null;
  liveRecords = null;
  setOfficerField();
  window.google?.accounts?.id?.disableAutoSelect();
}

async function run(operation) {
  if (busy) return;
  busy = true;
  render();
  try {
    await operation();
  } catch (error) {
    if (error.status === 401) clearSession();
    if (error.code === 'record_key_conflict') pendingSave = null;
    notify(error.status ? error.message : 'Permintaan gagal. Semak sambungan dan cuba semula.', true);
  } finally {
    busy = false;
    render();
  }
}

async function refreshRecords() {
  const active = session;
  const response = await api('/api/records');
  const { records } = await response.json();
  if (session === active) liveRecords = records;
}

async function signIn({ credential }) {
  if (!credential || !useCloud) return;
  await run(async () => {
    const response = await api('/api/me', { token: credential });
    session = { ...await response.json(), token: credential };
    expiryTimer = setTimeout(() => {
      clearSession();
      render();
      notify('Sesi telah tamat. Log masuk semula untuk rekod Google Sheets.', true);
    }, Math.max(0, session.expiresAt - Date.now()));
    setOfficerField();
    await refreshRecords();
    notify('Log masuk berjaya.');
  });
}

async function prepareLogin() {
  if (!apiRoot || !useCloud || loginLoading || googleInitialized || !navigator.onLine) return;
  loginLoading = true;
  loginUnavailable = '';
  render();
  try {
    const response = await api('/api/config', { token: '' });
    const settings = await response.json();
    if (!window.google?.accounts?.id) {
      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.onload = resolve;
        script.onerror = () => {
          script.remove();
          reject(new Error('Google Identity Services unavailable'));
        };
        document.head.append(script);
      });
    }
    const google = window.google.accounts.id;
    google.initialize({ client_id: settings.clientId, hd: settings.domain, callback: signIn });
    google.renderButton($('googleButton'), { type: 'standard', theme: 'outline', size: 'large' });
    googleInitialized = true;
  } catch (error) {
    loginUnavailable = error.status ? error.message : 'Log masuk Google gagal dimuatkan. Cuba semula.';
  } finally {
    loginLoading = false;
    render();
  }
}

function resetForm() {
  for (const field of fields) $(field).value = '';
  $('date').value = today();
  pendingSave = null;
  if (!useCloud) localOfficer = '';
  setOfficerField();
  calculate();
}

async function saveRecord() {
  if (useCloud && cloudReadOnly) {
    notify('Mod Google Sheets hanya untuk login dan bacaan. Simpan LIVE belum diaktifkan.', true);
    return;
  }
  const record = formRecord();
  if (!record) return;
  if (!useCloud) {
    const weights = measures(record.body, record.left, record.right);
    const local = { ...record, total: weights.total.toFixed(2), gsi: weights.gsi.toFixed(2),
      category: category(weights.gsi), savedAt: new Date().toISOString() };
    if (persist([local, ...localRecords])) {
      render();
      notify('Rekod ' + record.id + ' berjaya disimpan pada peranti ini.');
    }
    return;
  }
  const active = session;
  if (!active) return;
  const fingerprint = JSON.stringify([active.email, record]);
  if (pendingSave?.fingerprint !== fingerprint) {
    pendingSave = { fingerprint, recordKey: crypto.randomUUID() };
  }
  await run(async () => {
    const response = await api('/api/records', {
      method: 'POST',
      body: { ...record, recordKey: pendingSave.recordKey },
    });
    const { record: saved } = await response.json();
    if (session !== active) return;
    liveRecords = [saved, ...(liveRecords ?? []).filter(item => item.recordKey !== saved.recordKey)];
    notify('Rekod ' + saved.id + ' disahkan tersimpan dalam Google Sheets.');
  });
}

function removeRecord(record, index) {
  const source = useCloud ? 'sejarah Google Sheets' : 'peranti ini';
  if (!confirm('Padam rekod ' + (record.id || 'ini') + ' daripada ' + source + '?')) return;
  if (useCloud) {
    notify('Padam Google Sheets belum diaktifkan.', true);
    return;
  }
  if (useCloud) {
    const active = session;
    run(async () => {
      await api('/api/records/' + encodeURIComponent(record.recordKey), { method: 'DELETE' });
      if (session !== active) return;
      liveRecords = liveRecords.filter(item => item.recordKey !== record.recordKey);
      notify('Rekod dipadam daripada sejarah Google Sheets.');
    });
  } else if (persist(localRecords.filter((_, current) => current !== index))) {
    render();
    notify('Rekod berjaya dipadam daripada peranti ini.');
  }
}

function downloadCsv(blob, source) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'GSI_Rekod_' + source + '_' + today() + '.csv';
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

function exportCsv() {
  if (useCloud) {
    const active = session;
    run(async () => {
      const response = await api('/api/records.csv');
      const csv = await response.blob();
      if (session !== active) return;
      downloadCsv(csv, 'Sheets');
      notify('Eksport CSV Google Sheets dimulakan. Semak folder Downloads.');
    });
    return;
  }
  if (!localRecords.length) {
    notify('Tiada rekod peranti untuk dieksport.', true);
    return;
  }
  try {
    downloadCsv(new Blob([recordsCsv(localRecords)], { type: 'text/csv;charset=utf-8' }), 'Peranti');
    notify('Eksport CSV peranti dimulakan. Semak folder Downloads.');
  } catch {
    notify('Gagal eksport CSV pada peranti ini.', true);
  }
}

function printReport() {
  const weights = calculate();
  if (!weights) {
    notify('Cetakan dibatalkan kerana bacaan berat tidak sah.', true);
    return;
  }
  const entries = [
    ['ID Ayam', $('id').value], ['Baka', $('breed').value], ['Umur (bulan)', $('age').value],
    ['Tarikh pemeriksaan', $('date').value], ['Pegawai', $('officer').value], ['Lokasi', $('location').value],
    ['Berat badan (g)', weights.b], ['Testis kiri (g)', weights.l], ['Testis kanan (g)', weights.r],
    ['Jumlah testis (g)', weights.total.toFixed(2)], ['GSI (%)', weights.gsi.toFixed(2)],
    ['Kategori (sementara)', category(weights.gsi)],
  ];
  const table = document.createElement('table');
  for (const [label, value] of entries) {
    const row = table.insertRow();
    row.insertCell().textContent = label;
    row.insertCell().textContent = String(value);
  }
  const title = document.createElement('h2');
  title.textContent = 'Laporan Pemeriksaan GSI';
  $('printSummary').replaceChildren(title, table);
  notify('Dialog cetakan dibuka. Pilih “Save as PDF” untuk fail PDF.');
  window.print();
}

for (const field of fields) $(field).addEventListener('input', () => {
  calculate();
  notify('');
});
$('save').addEventListener('click', saveRecord);
$('reset').addEventListener('click', () => {
  resetForm();
  notify('Borang dikosongkan. Rekod tersimpan kekal.');
});
$('print').addEventListener('click', printReport);
$('csv').addEventListener('click', exportCsv);
$('retryLogin').addEventListener('click', prepareLogin);
$('logout').addEventListener('click', () => {
  if (apiRoot) useCloud = true;
  clearSession();
  pendingSave = null;
  if (useCloud) resetForm();
  render();
  notify('Anda telah log keluar.');
});
$('toggleMode').addEventListener('click', () => {
  if (!useCloud) localOfficer = $('officer').value;
  useCloud = !useCloud;
  setOfficerField();
  render();
  notify('');
  if (useCloud) prepareLogin();
});
$('refresh').addEventListener('click', () => run(async () => {
  await refreshRecords();
  notify('Sejarah Google Sheets dikemas kini.');
}));
window.addEventListener('offline', render);
window.addEventListener('online', () => {
  render();
  prepareLogin();
});

if (useCloud) resetForm();
else {
  $('date').value = today();
  calculate();
}
render();
prepareLogin();
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch(error => console.warn('PWA service worker:', error));
}
