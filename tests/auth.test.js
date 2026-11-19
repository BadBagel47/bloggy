import { test } from 'node:test';
import assert from 'node:assert/strict';
import { verifyAccessJwt, checkAdmin, sameOrigin } from '../src/auth.js';

const TEAM = 'https://example-team.cloudflareaccess.com';
const AUD = 'aud-123';

const b64url = (buf) => Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

async function setup() {
  const { publicKey, privateKey } = await crypto.subtle.generateKey(
    { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']);
  const kid = `k-${Math.random().toString(36).slice(2)}`;
  const jwk = { ...(await crypto.subtle.exportKey('jwk', publicKey)), kid, alg: 'RS256' };
  globalThis.fetch = async (url) => {
    assert.equal(url, `${TEAM}/cdn-cgi/access/certs`);
    return new Response(JSON.stringify({ keys: [jwk] }), { status: 200 });
  };
  async function sign(payload) {
    const head = b64url(JSON.stringify({ alg: 'RS256', kid, typ: 'JWT' }));
    const body = b64url(JSON.stringify(payload));
    const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', privateKey, new TextEncoder().encode(`${head}.${body}`));
    return `${head}.${body}.${b64url(sig)}`;
  }
  return sign;
}

const now = Math.floor(Date.now() / 1000);

test('valid Access token is accepted, wrong audience or expired is rejected', async () => {
  const sign = await setup();
  const good = await sign({ aud: [AUD], iss: TEAM, exp: now + 600, email: 'me@example.com' });
  assert.deepEqual(await verifyAccessJwt(good, { teamDomain: TEAM, aud: AUD }), { email: 'me@example.com' });
  assert.equal(await verifyAccessJwt(await sign({ aud: ['other'], iss: TEAM, exp: now + 600 }), { teamDomain: TEAM, aud: AUD }), null);
  assert.equal(await verifyAccessJwt(await sign({ aud: [AUD], iss: TEAM, exp: now - 10 }), { teamDomain: TEAM, aud: AUD }), null);
  assert.equal(await verifyAccessJwt(await sign({ aud: [AUD], iss: 'https://evil.cloudflareaccess.com', exp: now + 600 }), { teamDomain: TEAM, aud: AUD }), null);
  const tampered = good.split('.');
  tampered[1] = b64url(JSON.stringify({ aud: [AUD], iss: TEAM, exp: now + 600, email: 'attacker@example.com' }));
  assert.equal(await verifyAccessJwt(tampered.join('.'), { teamDomain: TEAM, aud: AUD }), null);
});

test('admin is closed when Access is not configured, and the dev bypass only works on localhost', async () => {
  const req = (host, headers = {}) => new Request(`https://${host}/admin`, { headers });
  assert.deepEqual(await checkAdmin(req('bloggy.example.workers.dev'), {}), { ok: false, reason: 'not-configured' });
  assert.deepEqual(await checkAdmin(req('bloggy.example.workers.dev'), { DEV_ADMIN_BYPASS: '1' }), { ok: false, reason: 'not-configured' });
  assert.equal((await checkAdmin(new Request('http://localhost:8787/admin'), { DEV_ADMIN_BYPASS: '1' })).ok, true);
  const env = { ACCESS_TEAM_DOMAIN: TEAM, ACCESS_AUD: AUD };
  assert.deepEqual(await checkAdmin(req('bloggy.example.workers.dev'), env), { ok: false, reason: 'unauthorized' });
  const sign = await setup();
  const token = await sign({ aud: [AUD], iss: TEAM, exp: now + 600, email: 'me@example.com' });
  assert.equal((await checkAdmin(req('bloggy.example.workers.dev', { 'Cf-Access-Jwt-Assertion': token }), env)).ok, true);
});

test('cross-site requests are refused', () => {
  assert.equal(sameOrigin(new Request('https://a.dev/admin/api/posts', { method: 'POST', headers: { Origin: 'https://a.dev' } })), true);
  assert.equal(sameOrigin(new Request('https://a.dev/admin/api/posts', { method: 'POST', headers: { Origin: 'https://b.dev' } })), false);
});
