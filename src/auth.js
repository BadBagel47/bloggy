// Admin protection (F-002). Cloudflare Access sits in front of /admin and signs each request
// with a JWT in the Cf-Access-Jwt-Assertion header. The Worker verifies that token too, so the
// admin stays closed even if the Access application is missing or misconfigured (fail closed).
//
// Configuration (Worker variables, not secret):
//   ACCESS_TEAM_DOMAIN  e.g. https://your-team.cloudflareaccess.com
//   ACCESS_AUD          the Access application's "Application Audience (AUD) Tag"
// Local development only: DEV_ADMIN_BYPASS=1 in .dev.vars, honoured only for localhost requests.

let jwksCache = { url: '', keys: null, fetchedAt: 0 };

function b64urlToBytes(s) {
  const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4));
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/') + pad);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

function decodePart(s) {
  return JSON.parse(new TextDecoder().decode(b64urlToBytes(s)));
}

async function getKeys(teamDomain, force = false) {
  const url = `${teamDomain.replace(/\/+$/, '')}/cdn-cgi/access/certs`;
  const fresh = Date.now() - jwksCache.fetchedAt < 60 * 60 * 1000;
  if (!force && jwksCache.url === url && jwksCache.keys && fresh) return jwksCache.keys;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Could not fetch Access keys (${res.status})`);
  const { keys } = await res.json();
  jwksCache = { url, keys, fetchedAt: Date.now() };
  return keys;
}

export async function verifyAccessJwt(token, { teamDomain, aud }, now = Date.now()) {
  const parts = String(token || '').split('.');
  if (parts.length !== 3) return null;
  let header;
  let payload;
  try {
    header = decodePart(parts[0]);
    payload = decodePart(parts[1]);
  } catch {
    return null;
  }
  if (header.alg !== 'RS256') return null;
  let keys = await getKeys(teamDomain);
  let jwk = keys.find((k) => k.kid === header.kid);
  if (!jwk) {
    keys = await getKeys(teamDomain, true);
    jwk = keys.find((k) => k.kid === header.kid);
  }
  if (!jwk) return null;
  const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
  const ok = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, b64urlToBytes(parts[2]), new TextEncoder().encode(`${parts[0]}.${parts[1]}`));
  if (!ok) return null;
  const auds = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  if (!auds.includes(aud)) return null;
  if (payload.iss && payload.iss.replace(/\/+$/, '') !== teamDomain.replace(/\/+$/, '')) return null;
  const nowSec = Math.floor(now / 1000);
  if (typeof payload.exp !== 'number' || payload.exp < nowSec) return null;
  if (typeof payload.nbf === 'number' && payload.nbf > nowSec + 60) return null;
  return { email: payload.email || '' };
}

/**
 * Returns { ok: true, email } for a signed-in admin, or { ok: false, reason } otherwise.
 * reason: 'not-configured' | 'unauthorized'
 */
export async function checkAdmin(request, env) {
  const url = new URL(request.url);
  const local = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
  if (env.DEV_ADMIN_BYPASS === '1' && local) return { ok: true, email: 'dev@localhost' };

  const teamDomain = (env.ACCESS_TEAM_DOMAIN || '').trim();
  const aud = (env.ACCESS_AUD || '').trim();
  if (!teamDomain || !aud) return { ok: false, reason: 'not-configured' };

  const token = request.headers.get('Cf-Access-Jwt-Assertion') || cookieValue(request.headers.get('Cookie'), 'CF_Authorization');
  if (!token) return { ok: false, reason: 'unauthorized' };
  try {
    const user = await verifyAccessJwt(token, { teamDomain, aud });
    return user ? { ok: true, email: user.email } : { ok: false, reason: 'unauthorized' };
  } catch {
    return { ok: false, reason: 'unauthorized' };
  }
}

function cookieValue(header, name) {
  if (!header) return '';
  for (const part of header.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return v.join('=');
  }
  return '';
}

/** Blocks cross-site form or fetch submissions to admin endpoints. */
export function sameOrigin(request) {
  const origin = request.headers.get('Origin');
  if (!origin) return request.headers.get('Sec-Fetch-Site') !== 'cross-site';
  return origin === new URL(request.url).origin;
}
