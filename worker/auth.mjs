import { createRemoteJWKSet, errors, importPKCS8, jwtVerify, SignJWT } from 'jose';
import { ApiError } from './errors.mjs';

export const officerDomain = 'dvs.gov.my';
const googleKeys = createRemoteJWKSet(
  new URL('https://www.googleapis.com/oauth2/v3/certs'),
  { timeoutDuration: 5000 },
);
const tokenUrl = 'https://oauth2.googleapis.com/token';
let cachedAccount;

function emails(value = '') {
  return value.toLowerCase().split(',').map(email => email.trim()).filter(Boolean);
}

export async function verifyOfficer(request, env) {
  const match = /^Bearer ([\w.-]{1,8192})$/i.exec(request.headers.get('Authorization') ?? '');
  if (!match) throw new ApiError(401, 'login_required');

  let payload;
  try {
    ({ payload } = await jwtVerify(match[1], googleKeys, {
      algorithms: ['RS256'],
      audience: env.GOOGLE_CLIENT_ID,
      issuer: ['https://accounts.google.com', 'accounts.google.com'],
      requiredClaims: ['exp', 'iat', 'sub', 'aud', 'iss'],
    }));
  } catch (error) {
    if (error instanceof errors.JWKSTimeout || !(error instanceof errors.JOSEError)) {
      throw new ApiError(503, 'google_signin_unavailable');
    }
    throw new ApiError(401, 'invalid_login');
  }

  if (payload.aud !== env.GOOGLE_CLIENT_ID || !/^\d{1,255}$/.test(payload.sub)) {
    throw new ApiError(401, 'invalid_login');
  }
  const email = typeof payload.email === 'string' ? payload.email.toLowerCase() : '';
  if (payload.hd !== officerDomain || payload.email_verified !== true ||
      !/^[^@\s]+@dvs\.gov\.my$/.test(email)) {
    throw new ApiError(403, 'dvs_account_required');
  }
  const allowedEmails = emails(env.GSI_ALLOWED_EMAILS);
  if (allowedEmails.length && !allowedEmails.includes(email)) {
    throw new ApiError(403, 'officer_not_allowed');
  }
  const name = typeof payload.name === 'string' ? payload.name.trim().slice(0, 200) : '';
  return {
    sub: payload.sub,
    email,
    name: name || email,
    expiresAt: payload.exp * 1000,
    admin: emails(env.GSI_ADMIN_EMAILS).includes(email),
  };
}

async function exchangeServiceToken(secret) {
  let assertion;
  try {
    const account = JSON.parse(secret);
    if (account.type !== 'service_account' || !account.client_email || !account.private_key) {
      throw new Error('Invalid service account');
    }
    const key = await importPKCS8(account.private_key, 'RS256');
    assertion = await new SignJWT({ scope: 'https://www.googleapis.com/auth/spreadsheets' })
      .setProtectedHeader({ alg: 'RS256', kid: account.private_key_id })
      .setIssuer(account.client_email)
      .setAudience(tokenUrl)
      .setIssuedAt()
      .setExpirationTime('55m')
      .sign(key);
  } catch {
    throw new ApiError(503, 'sheets_credentials_invalid');
  }

  const response = await fetch(tokenUrl, {
    method: 'POST',
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
    signal: AbortSignal.timeout(8000),
  }).catch(() => { throw new ApiError(503, 'sheets_unavailable'); });
  if (!response.ok) {
    const denied = response.status === 400 || response.status === 401 || response.status === 403;
    throw new ApiError(503, denied ? 'sheets_credentials_invalid' : 'sheets_unavailable');
  }
  const { access_token: token, expires_in: lifetime } = await response.json();
  if (typeof token !== 'string' || !Number.isFinite(lifetime) || lifetime <= 0) {
    throw new ApiError(503, 'sheets_unavailable');
  }
  return { token, refreshAt: Date.now() + Math.max(0, lifetime - 60) * 1000 };
}

export async function serviceToken(secret) {
  if (cachedAccount?.secret === secret && cachedAccount.refreshAt > Date.now()) {
    return cachedAccount.token;
  }
  // A Worker fetch belongs to its request. Only cache completed token values.
  const token = await exchangeServiceToken(secret);
  cachedAccount = { secret, ...token };
  return token.token;
}
