import { recordsCsv } from '../record.mjs';
import { officerDomain, verifyOfficer } from './auth.mjs';
import { ApiError } from './errors.mjs';
import { RecordSheet, recordKeyPattern, sheetsFailure, validateRecord } from './sheets.mjs';

const recordPath = '/api/records';
const maxBodyBytes = 8192;
const routes = new Map([
  ['/health', ['GET']],
  ['/api/config', ['GET']],
  ['/api/me', ['GET']],
  [recordPath, ['GET', 'POST']],
  [recordPath + '.csv', ['GET']],
]);

function json(body, status = 200) {
  return Response.json(body, { status });
}

function authConfigured(env) {
  return Boolean(env.APP_ORIGIN &&
    /^[\w-]+\.apps\.googleusercontent\.com$/.test(env.GOOGLE_CLIENT_ID ?? ''));
}

function sheetsConfigured(env) {
  return Boolean(/^[\w-]+$/.test(env.SHEETS_SPREADSHEET_ID ?? '') &&
    env.GOOGLE_SERVICE_ACCOUNT_JSON && env.SHEETS_TAB);
}

async function readBody(request) {
  if (!/^application\/json(?:\s*;|$)/i.test(request.headers.get('Content-Type') ?? '')) {
    throw new ApiError(415, 'json_required');
  }
  if (!request.body) throw new ApiError(400, 'invalid_json');
  if (Number(request.headers.get('Content-Length')) > maxBodyBytes) {
    throw new ApiError(413, 'body_too_large');
  }
  const reader = request.body.getReader();
  const decoder = new TextDecoder('utf-8', { fatal: true });
  let length = 0;
  let value = '';
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      length += chunk.value.length;
      if (length > maxBodyBytes) throw new ApiError(413, 'body_too_large');
      value += decoder.decode(chunk.value, { stream: true });
    }
    return JSON.parse(value + decoder.decode());
  } catch (error) {
    await reader.cancel().catch(() => {});
    if (error instanceof ApiError) throw error;
    throw new ApiError(400, 'invalid_json');
  } finally {
    reader.releaseLock();
  }
}

async function handle(request, env, path, method, key) {
  if (path === '/health') return json({ status: 'ok', configured: authConfigured(env) && sheetsConfigured(env) });
  if (!authConfigured(env)) throw new ApiError(503, 'api_unconfigured');
  if (path === '/api/config') return json({ clientId: env.GOOGLE_CLIENT_ID, domain: officerDomain });
  if (path !== '/api/me' && !sheetsConfigured(env)) throw new ApiError(503, 'api_unconfigured');

  const officer = await verifyOfficer(request, env);
  if (path === '/api/me') {
    return json({ name: officer.name, email: officer.email, expiresAt: officer.expiresAt });
  }

  const write = method === 'POST' || method === 'DELETE';
  if (write && env.GSI_WRITES_ENABLED !== 'true') throw new ApiError(403, 'writes_disabled');
  const sheet = new RecordSheet(env, write);
  if (method === 'DELETE') {
    await sheet.delete(key, officer);
    return new Response(null, { status: 204 });
  }
  if (method === 'POST') {
    const result = await sheet.save(validateRecord(await readBody(request), officer), officer);
    return json({ record: result.record }, result.created ? 201 : 200);
  }

  const records = await sheet.list(officer);
  if (path === recordPath + '.csv') {
    if (!records.length) throw new ApiError(404, 'no_records');
    return new Response(recordsCsv(records), {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="GSI_Rekod.csv"',
      },
    });
  }
  return json({ records });
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin');
    const headers = {
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      Vary: 'Origin, Access-Control-Request-Method, Access-Control-Request-Headers',
    };
    if (origin && origin === env.APP_ORIGIN) headers['Access-Control-Allow-Origin'] = origin;

    let response;
    try {
      if (origin && origin !== env.APP_ORIGIN) throw new ApiError(403, 'origin_denied');
      const path = new URL(request.url).pathname;
      const key = path.startsWith(recordPath + '/') ? path.slice(recordPath.length + 1) : '';
      const methods = routes.get(path) ?? (recordKeyPattern.test(key) ? ['DELETE'] : null);
      if (!methods) throw new ApiError(404, 'not_found');
      if (request.method === 'OPTIONS') {
        const requestedMethod = request.headers.get('Access-Control-Request-Method');
        if (!methods.includes(requestedMethod)) throw new ApiError(405, 'method_not_allowed');
        headers['Access-Control-Allow-Methods'] = methods.join(', ');
        headers['Access-Control-Allow-Headers'] = 'Authorization, Content-Type';
        headers['Access-Control-Max-Age'] = '600';
        response = new Response(null, { status: 204 });
      } else {
        if (!methods.includes(request.method)) throw new ApiError(405, 'method_not_allowed');
        response = await handle(request, env, path, request.method, key);
      }
    } catch (error) {
      const failure = sheetsFailure(error);
      response = failure instanceof ApiError
        ? json({ error: failure.code }, failure.status)
        : json({ error: 'internal_error' }, 500);
    }
    for (const [key, value] of Object.entries(headers)) response.headers.set(key, value);
    return response;
  },
};
