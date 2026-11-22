import api from './index.mjs';

const documentHeaders = {
  'Cache-Control': 'no-store',
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' https://accounts.google.com/gsi/client",
    "style-src 'self' 'unsafe-inline' https://accounts.google.com/gsi/style",
    "connect-src 'self' https://accounts.google.com/gsi/",
    'frame-src https://accounts.google.com/gsi/',
    "object-src 'none'",
    "base-uri 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
  ].join('; '),
  'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Content-Type-Options': 'nosniff',
  'X-Robots-Tag': 'noindex, nofollow',
};

function matchesServiceAccount(secret, email) {
  if (!secret) return true;
  try {
    const account = JSON.parse(secret);
    return account?.type === 'service_account' && account.client_email === email;
  } catch {
    return false;
  }
}

export function createStagingWorker({ origin, sheetId, serviceAccount, assets }) {
  const files = new Map(Object.entries(assets));
  return {
    fetch(request, env) {
      const url = new URL(request.url);
      if (url.origin !== origin || env.APP_ORIGIN !== origin || env.SHEETS_SPREADSHEET_ID !== sheetId) {
        return Response.json({ error: 'staging_binding_mismatch' }, {
          status: 503, headers: { 'Cache-Control': 'no-store' },
        });
      }
      const file = files.get(url.pathname === '/' ? '/index.html' : url.pathname);
      if (file && ['GET', 'HEAD'].includes(request.method)) {
        const body = file.base64 ? Uint8Array.from(atob(file.base64), char => char.charCodeAt(0)) : file.text;
        return new Response(request.method === 'HEAD' ? null : body, {
          headers: { ...documentHeaders, 'Content-Type': file.type },
        });
      }
      if (!matchesServiceAccount(env.GOOGLE_SERVICE_ACCOUNT_JSON, serviceAccount)) {
        return Response.json({ error: 'staging_service_account_mismatch' }, {
          status: 503, headers: { 'Cache-Control': 'no-store' },
        });
      }
      return api.fetch(request, env);
    },
  };
}
