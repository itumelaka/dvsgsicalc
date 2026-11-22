import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createStagingWorker } from './staging.mjs';

const origin = 'https://gsi-staging.example.workers.dev';
const sheetId = 'fixture-staging';
const serviceAccount = 'gsi-staging@example.iam.gserviceaccount.com';
const worker = createStagingWorker({
  origin, sheetId, serviceAccount,
  assets: { '/index.html': { type: 'text/html', text: '<h1>Staging</h1>' } },
});
const env = {
  APP_ORIGIN: origin,
  SHEETS_SPREADSHEET_ID: sheetId,
  SHEETS_TAB: 'Rekod GSI',
  GOOGLE_CLIENT_ID: 'fixture.apps.googleusercontent.com',
  GSI_WRITES_ENABLED: 'false',
};

test('staging serves the test page and protects the authenticated API', async () => {
  const page = await worker.fetch(new Request(origin), env);
  assert.equal(page.status, 200);
  assert.equal(page.headers.get('Cache-Control'), 'no-store');
  assert.match(page.headers.get('Content-Security-Policy'), /frame-ancestors 'none'/);
  assert.equal(await page.text(), '<h1>Staging</h1>');
  const officer = await worker.fetch(new Request(origin + '/api/me'), env);
  assert.equal(officer.status, 401);
  const records = await worker.fetch(new Request(origin + '/api/records'), env);
  assert.equal(records.status, 503);
  assert.deepEqual(await records.json(), { error: 'api_unconfigured' });
});

test('staging rejects the wrong host, spreadsheet, or Service Account', async () => {
  const path = '/api/records';
  const wrongHost = await worker.fetch(new Request('https://production.example' + path), env);
  assert.equal(wrongHost.status, 503);
  assert.deepEqual(await wrongHost.json(), { error: 'staging_binding_mismatch' });
  const write = new Request(origin + path, { method: 'POST' });
  const wrongSheet = await worker.fetch(write, { ...env, SHEETS_SPREADSHEET_ID: 'fixture-main' });
  assert.equal(wrongSheet.status, 503);
  assert.deepEqual(await wrongSheet.json(), { error: 'staging_binding_mismatch' });
  const wrongAccount = await worker.fetch(write, {
    ...env, GSI_WRITES_ENABLED: 'true',
    GOOGLE_SERVICE_ACCOUNT_JSON: JSON.stringify({
      type: 'service_account', client_email: 'gsi-production@example.iam.gserviceaccount.com',
    }),
  });
  assert.equal(wrongAccount.status, 503);
  assert.deepEqual(await wrongAccount.json(), { error: 'staging_service_account_mismatch' });
});
