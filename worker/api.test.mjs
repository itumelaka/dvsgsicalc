import assert from 'node:assert/strict';
import { after, beforeEach, test } from 'node:test';
import { exportJWK, exportPKCS8, generateKeyPair, jwtVerify, SignJWT } from 'jose';
import { category, measures, recordHeaders } from '../record.mjs';
import worker from './index.mjs';

const { privateKey, publicKey } = await generateKeyPair('RS256', { extractable: true });
const jwk = { ...await exportJWK(publicKey), kid: 'test-google-key', alg: 'RS256' };
const origin = 'https://itumelaka.github.io';
const env = {
  APP_ORIGIN: origin,
  GOOGLE_CLIENT_ID: '100-test.apps.googleusercontent.com',
  SHEETS_SPREADSHEET_ID: 'fixture-spreadsheet',
  SHEETS_TAB: 'Rekod GSI',
  GOOGLE_SERVICE_ACCOUNT_JSON: JSON.stringify({
    type: 'service_account',
    client_email: 'test@example.iam.gserviceaccount.com',
    private_key: await exportPKCS8(privateKey),
  }),
  GSI_ADMIN_EMAILS: 'admin@example.invalid, admin@dvs.gov.my',
};
const sheetUrl = 'https://sheets.googleapis.com/v4/spreadsheets/' + env.SHEETS_SPREADSHEET_ID;
const googleFetch = globalThis.fetch;
let values;
let metadata;
let sheetStatus;
let dropAppendReply;
let sheetRequests;
let appendBatches;
let previousToken;

beforeEach(() => {
  values = [[...recordHeaders]];
  metadata = new Map();
  sheetStatus = 200;
  dropAppendReply = false;
  sheetRequests = 0;
  appendBatches = 0;
});
after(() => { globalThis.fetch = googleFetch; });

function enteredCells(data) {
  return data.values.map(cell => cell.userEnteredValue.stringValue ?? cell.userEnteredValue.numberValue);
}

globalThis.fetch = async (url, options) => {
  if (url === 'https://www.googleapis.com/oauth2/v3/certs') return Response.json({ keys: [jwk] });
  if (url === 'https://oauth2.googleapis.com/token') {
    const { payload } = await jwtVerify(options.body.get('assertion'), publicKey, {
      audience: url,
      issuer: 'test@example.iam.gserviceaccount.com',
    });
    assert.equal(payload.scope, 'https://www.googleapis.com/auth/spreadsheets');
    assert.equal(payload.sub, undefined);
    previousToken = 'fixture-token';
    return Response.json({ access_token: previousToken, expires_in: 3600 });
  }
  assert.ok(url.startsWith(sheetUrl), 'No request leaves the local test');
  sheetRequests += 1;
  assert.equal(options.headers.Authorization, 'Bearer ' + previousToken);
  if (sheetStatus !== 200) return Response.json({}, { status: sheetStatus });
  const path = url.slice(sheetUrl.length);
  if (path.startsWith('/values/')) {
    assert.equal(decodeURIComponent(path.split('?')[0]), "/values/'Rekod GSI'!A1:P");
    return Response.json({ values });
  }
  if (path.startsWith('?fields=')) {
    return Response.json({ sheets: [{ properties: {
      sheetId: 0, title: 'Rekod GSI', gridProperties: { columnCount: 17 },
    } }] });
  }
  if (path.startsWith('/developerMetadata/')) {
    const marker = metadata.get(Number(path.split('/').at(-1)));
    return Response.json(marker ?? {}, { status: marker ? 200 : 404 });
  }
  assert.equal(path, ':batchUpdate');
  const { requests } = JSON.parse(options.body);
  const marker = requests.find(request => request.createDeveloperMetadata)?.createDeveloperMetadata.developerMetadata;
  if (marker && metadata.has(marker.metadataId)) return Response.json({}, { status: 400 });
  if (marker) metadata.set(marker.metadataId, marker);
  const replies = requests.map(request => {
    if (request.updateCells) {
      assert.deepEqual(request.updateCells.start, { sheetId: 0, rowIndex: 0, columnIndex: 13 });
      values[0].splice(13, 3, ...enteredCells(request.updateCells.rows[0]));
    } else if (request.appendCells) {
      appendBatches += 1;
      assert.equal(request.appendCells.sheetId, 0);
      values.push(enteredCells(request.appendCells.rows[0]));
    } else if (request.findReplace) {
      const { range, find, replacement, matchEntireCell, matchCase } = request.findReplace;
      assert.deepEqual(range, { sheetId: 0, startRowIndex: 1, startColumnIndex: 15, endColumnIndex: 16 });
      assert.ok(matchEntireCell && matchCase);
      const row = values.slice(1).find(value => value[15] === find);
      if (row) row[15] = replacement;
      return { findReplace: { occurrencesChanged: row ? 1 : 0 } };
    }
    return {};
  });
  if (marker && dropAppendReply) throw new Error('Reply lost after commit');
  return Response.json({ replies });
};

function idToken({ email = 'pilot@dvs.gov.my', sub = '111', hd = 'dvs.gov.my',
  verified = true, expires = '10m', audience = env.GOOGLE_CLIENT_ID, key = privateKey } = {}) {
  return new SignJWT({ name: 'Pegawai Ujian', email, email_verified: verified, hd })
    .setProtectedHeader({ alg: 'RS256', kid: jwk.kid })
    .setIssuer('https://accounts.google.com')
    .setAudience(audience)
    .setSubject(sub)
    .setIssuedAt()
    .setExpirationTime(expires)
    .sign(key);
}

function request(path, { method = 'GET', token, body, settings = env, headers = {} } = {}) {
  return worker.fetch(new Request('https://gsi-worker.example' + path, {
    method,
    headers: {
      Origin: origin,
      ...(token && { Authorization: 'Bearer ' + token }),
      ...(body && { 'Content-Type': 'application/json' }),
      ...headers,
    },
    body: body && JSON.stringify(body),
  }), settings);
}

function fixture(fields = {}) {
  return { recordKey: crypto.randomUUID(), id: 'SAMPLE-ONLY', breed: 'Baka ujian', age: '4',
    date: '2026-11-22', officer: 'Unverified name', location: '="Unsafe spreadsheet formula"',
    body: '2500', left: '9.2', right: '8.8', gsi: 100, ...fields };
}

test('GSI formula, invalid weights, and inclusive thresholds', () => {
  assert.equal(measures(2500, 9.2, 8.8).gsi.toFixed(2), '0.72');
  assert.equal(measures(2500, '', 8.8), null);
  assert.equal(measures(0, 0, 0), null);
  assert.equal(measures(10, -1, 1), null);
  assert.equal(measures(10, 8, 8), null);
  assert.equal(category(0.3), 'DALAM JULAT RUJUKAN');
  assert.equal(category(1.1), 'DALAM JULAT RUJUKAN');
});

test('health, unconfigured API, CORS, and authentication before Sheets access', async () => {
  const health = await request('/health', { settings: {}, headers: { Origin: '' } });
  assert.deepEqual(await health.json(), { status: 'ok', configured: false });
  assert.equal((await request('/api/config', { settings: { APP_ORIGIN: origin } })).status, 503);
  assert.deepEqual(await (await request('/api/config')).json(),
    { domain: 'dvs.gov.my', clientId: env.GOOGLE_CLIENT_ID });
  const expected = { method: 'OPTIONS', headers: { 'Access-Control-Request-Method': 'POST' } };
  const preflight = await request('/api/records', expected);
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers.get('Access-Control-Allow-Origin'), origin);
  const denied = await request('/api/records', { headers: { Origin: 'https://another.example' } });
  assert.equal(denied.status, 403);
  assert.equal(denied.headers.get('Access-Control-Allow-Origin'), null);
  assert.equal((await request('/api/records')).status, 401);
  assert.equal((await request('/api/records.csv')).status, 401);
  assert.equal(sheetRequests, 0);
});

test('signed-in officer, strict Workspace domain, signature, audience, expiry, and pilot list', async () => {
  const token = await idToken();
  const response = await request('/api/me', { token });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).email, 'pilot@dvs.gov.my');
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  const cases = [
    [{ hd: 'other.example' }, 403],
    [{ email: 'pilot@example.com' }, 403],
    [{ verified: false }, 403],
    [{ audience: 'unexpected.apps.googleusercontent.com' }, 401],
    [{ expires: '1 second ago' }, 401],
    [{ key: (await generateKeyPair('RS256')).privateKey }, 401],
  ];
  for (const [overrides, status] of cases) {
    assert.equal((await request('/api/me', { token: await idToken(overrides) })).status, status);
  }
  const settings = { ...env, GSI_ALLOWED_EMAILS: 'other@dvs.gov.my' };
  assert.equal((await request('/api/me', { token, settings })).status, 403);
  assert.equal(sheetRequests, 0);
});

test('rejects invalid form data and oversized input without writes', async () => {
  const token = await idToken();
  const cases = [
    [{ date: '2026-02-29' }, 400],
    [{ age: -1 }, 400],
    [{ right: null }, 400],
    [{ recordKey: 'not-a-uuid' }, 400],
    [{ location: 'a'.repeat(8500) }, 413],
  ];
  for (const [fields, status] of cases) {
    const save = await request('/api/records', { method: 'POST', token, body: fixture(fields) });
    assert.equal(save.status, status);
  }
  assert.equal(sheetRequests, 0);
});

test('save, history, protected CSV, and recoverable deletion', async () => {
  values.push(['25/10/2026', 'LEGACY', 'Baka sedia ada', 5, 'Pegawai sedia ada']);
  const token = await idToken();
  const body = fixture();
  const saved = await request('/api/records', { method: 'POST', token, body });
  assert.equal(saved.status, 201, await saved.clone().text());
  const { record } = await saved.json();
  assert.equal(record.gsi, '0.72');
  assert.equal(record.officer, 'Pegawai Ujian');
  assert.equal(record.canDelete, true);
  assert.equal(record.owner, undefined);
  assert.equal(values[2][10], 0.72);
  assert.equal(values[2][5], body.location);

  const own = await request('/api/records', { token });
  assert.deepEqual((await own.json()).records, [record]);
  const admin = await idToken({ email: 'admin@dvs.gov.my', sub: '222' });
  const adminList = await request('/api/records', { token: admin });
  const records = (await adminList.json()).records;
  assert.equal(records.length, 2);
  assert.equal(records[1].id, 'LEGACY');
  assert.equal(records[1].canDelete, false);

  const csv = await request('/api/records.csv', { token });
  assert.match(csv.headers.get('Content-Type'), /^text\/csv/);
  const csvText = await csv.text();
  assert.match(csvText, /"SAMPLE-ONLY"/);
  assert.ok(csvText.includes(`"'=""Unsafe spreadsheet formula"""`));
  assert.doesNotMatch(csvText, /LEGACY|ID Akaun Pegawai/);

  const path = '/api/records/' + body.recordKey;
  const outsider = await idToken({ email: 'other@dvs.gov.my', sub: '333' });
  assert.deepEqual((await (await request('/api/records', { token: outsider })).json()).records, []);
  assert.equal((await request(path, { method: 'DELETE', token: outsider })).status, 404);
  assert.equal((await request(path, { method: 'DELETE', token })).status, 204);
  assert.equal((await request(path, { method: 'DELETE', token })).status, 204);
  assert.match(values[2][15], /^DIPADAM:.*:111$/);
  assert.equal((await request('/api/records.csv', { token })).status, 404);
  assert.equal((await request('/api/records', { method: 'POST', token, body })).status, 409);
  assert.equal(appendBatches, 1);
});

test('simultaneous saves and a lost response result in one physical record', async () => {
  dropAppendReply = true;
  const token = await idToken();
  const body = fixture();
  const save = () => request('/api/records', { method: 'POST', token, body });
  const replies = await Promise.all([save(), save(), save()]);
  assert.deepEqual(replies.map(reply => reply.status), [200, 200, 200],
    await Promise.all(replies.map(reply => reply.clone().text())));
  assert.equal(values.length, 2);
  assert.equal(appendBatches, 1);
  const changedBody = { ...body, id: 'DIFFERENT-ID' };
  assert.equal((await request('/api/records', { method: 'POST', token, body: changedBody })).status, 409);
  const collisionBody = fixture({ recordKey: body.recordKey.slice(0, -1) +
    (body.recordKey.endsWith('0') ? '1' : '0') });
  assert.equal((await request('/api/records', { method: 'POST', token, body: collisionBody })).status, 409);
  assert.equal(values.length, 2);
});

test('Google Sheets access denial and changed headers fail without exposing Google errors', async () => {
  sheetStatus = 403;
  const token = await idToken();
  const denied = await request('/api/records', { token });
  assert.equal(denied.status, 503);
  assert.deepEqual(await denied.json(), { error: 'sheets_access' });
  sheetStatus = 200;
  values[0][0] = 'Unexpected header';
  const wrongSchema = await request('/api/records', { method: 'POST', token, body: fixture() });
  assert.deepEqual(await wrongSchema.json(), { error: 'sheets_schema' });
  assert.equal(values.length, 1);
});
