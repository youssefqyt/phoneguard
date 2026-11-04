#!/usr/bin/env node
/**
 * PhoneGuard API smoke test.
 *
 * Exercises the full happy-path across every module against a running API
 * instance. Requires the database to have been seeded (`npm run db:seed`).
 *
 * Usage:
 *   node scripts/smoke.mjs [baseUrl]
 *   BASE_URL=http://localhost:3000/api/v1 node scripts/smoke.mjs
 */

const BASE = (process.argv[2] ?? process.env.BASE_URL ?? 'http://localhost:3000/api/v1').replace(/\/$/, '');

const PARENT = { email: 'parent@phoneguard.dev', password: 'Password123!' };
const CHILD = { email: 'child@phoneguard.dev', password: 'Password123!' };

let passed = 0;
let failed = 0;
const failures = [];

function ok(name, detail = '') {
  passed += 1;
  console.log(`  \u001b[32m✓\u001b[0m ${name}${detail ? ` \u001b[90m${detail}\u001b[0m` : ''}`);
}

function bad(name, error) {
  failed += 1;
  failures.push({ name, error });
  console.log(`  \u001b[31m✗\u001b[0m ${name} \u001b[90m${error}\u001b[0m`);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function api(method, path, { token, body } = {}) {
  const url = path.startsWith('http') ? path : `${BASE}${path}`;
  const res = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = text;
  }
  return { status: res.status, body: json };
}

async function step(name, fn) {
  try {
    const result = await fn();
    ok(name, typeof result === 'string' ? result : '');
    return result;
  } catch (error) {
    bad(name, error instanceof Error ? error.message : String(error));
    return undefined;
  }
}

async function login(creds) {
  const res = await api('POST', '/auth/login', { body: creds });
  assert(res.status === 200 || res.status === 201, `login failed (${res.status}): ${JSON.stringify(res.body)}`);
  assert(res.body?.tokens?.accessToken, 'no access token returned');
  return res.body.tokens.accessToken;
}

async function main() {
  console.log(`\n\u001b[1mPhoneGuard API smoke test\u001b[0m \u2192 ${BASE}\n`);

  // --- health -------------------------------------------------------------
  const healthBase = BASE.replace(/\/api\/v1$/, '');
  await step('GET /health', async () => {
    const res = await api('GET', `${healthBase}/health`);
    assert(res.status === 200, `status ${res.status}`);
    assert(res.body.status === 'ok', 'not ok');
  });

  // --- auth ---------------------------------------------------------------
  const parentToken = await step('POST /auth/login (parent)', () => login(PARENT));
  const childToken = await step('POST /auth/login (child)', () => login(CHILD));

  if (!parentToken || !childToken) {
    console.log('\n\u001b[31mCannot continue without tokens. Did you run `npm run db:seed`?\u001b[0m\n');
    process.exit(1);
  }

  let childUserId;
  await step('GET /auth/me', async () => {
    const res = await api('GET', '/auth/me', { token: parentToken });
    assert(res.status === 200, `status ${res.status}`);
    assert(res.body.email === PARENT.email, 'unexpected email');

    const childMe = await api('GET', '/auth/me', { token: childToken });
    assert(childMe.status === 200, `child status ${childMe.status}`);
    childUserId = childMe.body.id;

    return res.body.displayName;
  });

  await step('POST /auth/register + refresh round-trip', async () => {
    const email = `smoke+${Date.now()}@phoneguard.dev`;
    const reg = await api('POST', '/auth/register', {
      body: { email, password: 'Password123!', displayName: 'Smoke Tester' },
    });
    assert([200, 201].includes(reg.status), `register status ${reg.status}`);
    const refreshed = await api('POST', '/auth/refresh', {
      body: { refreshToken: reg.body.tokens.refreshToken },
    });
    assert(refreshed.status === 200, `refresh status ${refreshed.status}`);
    assert(refreshed.body.accessToken, 'no rotated access token');
    // Reusing a rotated token must fail.
    const reuse = await api('POST', '/auth/refresh', {
      body: { refreshToken: reg.body.tokens.refreshToken },
    });
    assert(reuse.status === 401, `rotated token reuse should 401, got ${reuse.status}`);
  });

  await step('GET /auth/me without a token is 401', async () => {
    const res = await api('GET', '/auth/me');
    assert(res.status === 401, `expected 401, got ${res.status}`);
  });

  // --- households ---------------------------------------------------------
  const households = await step('GET /households', async () => {
    const res = await api('GET', '/households', { token: parentToken });
    assert(res.status === 200, `status ${res.status}`);
    assert(res.body.length > 0, 'no households found — run the seed');
    return res.body;
  });
  const household = households?.[0];

  await step('POST /households (create + delete)', async () => {
    const created = await api('POST', '/households', {
      token: parentToken,
      body: { name: 'Smoke Household' },
    });
    assert([200, 201].includes(created.status), `create status ${created.status}`);
    const del = await api('DELETE', `/households/${created.body.id}`, { token: parentToken });
    assert(del.status === 200, `delete status ${del.status}`);
  });

  await step('POST /households/:id/invites + accept', async () => {
    assert(household, 'no household');
    const invite = await api('POST', `/households/${household.id}/invites`, {
      token: parentToken,
      body: { role: 'VIEWER' },
    });
    assert([200, 201].includes(invite.status), `invite status ${invite.status}`);
    assert(invite.body.code, 'no invite code');
    // Accepting with the parent (already a member) must conflict.
    const accept = await api('POST', '/households/invites/accept', {
      token: parentToken,
      body: { code: invite.body.code },
    });
    assert(accept.status === 409, `expected 409 for existing member, got ${accept.status}`);
    await api('DELETE', `/households/${household.id}/invites/${invite.body.id}`, { token: parentToken });
  });

  // --- devices ------------------------------------------------------------
  await step('GET /devices', async () => {
    const res = await api('GET', '/devices', { token: parentToken });
    assert(res.status === 200, `status ${res.status}`);
    assert(res.body.length > 0, 'no devices — run the seed');
    const revoked = await api('GET', '/devices?includeRevoked=true', { token: parentToken });
    assert(revoked.body.length >= res.body.length, 'includeRevoked returned fewer devices');
    return `${res.body.length} visible`;
  });

  // Everything below writes data, so it runs against a throwaway device that is
  // revoked at the end. The seeded devices are never written to: a partial
  // ingest would replace the daily summary but not the per-app rows, so the
  // demo dashboard's "screen time" would stop matching its top-apps list.
  let smokeDevice = null;

  await step('POST /devices + /devices/pair', async () => {
    const reg = await api('POST', '/devices', {
      token: childToken,
      body: { name: 'Smoke Phone', platform: 'ANDROID' },
    });
    assert([200, 201].includes(reg.status), `register status ${reg.status}`);
    assert(reg.body.pairingCode, 'no pairing code');
    const paired = await api('POST', '/devices/pair', {
      token: parentToken,
      body: { code: reg.body.pairingCode, householdId: household.id },
    });
    assert(paired.status === 200 || paired.status === 201, `pair status ${paired.status}`);
    assert(paired.body.status === 'PAIRED', 'device not marked PAIRED');
    smokeDevice = paired.body;
  });

  await step('POST /devices/:id/heartbeat', async () => {
    assert(smokeDevice, 'no device');
    const res = await api('POST', `/devices/${smokeDevice.id}/heartbeat`, { token: parentToken });
    assert(res.status === 201 || res.status === 200, `status ${res.status}`);
  });

  // --- usage --------------------------------------------------------------
  await step('POST /usage/ingest', async () => {
    assert(smokeDevice, 'no device');
    const today = new Date().toISOString().slice(0, 10);
    const res = await api('POST', '/usage/ingest', {
      token: childToken,
      body: {
        deviceId: smokeDevice.id,
        date: today,
        apps: [
          { packageName: 'com.instagram.android', appName: 'Instagram', category: 'SOCIAL', totalSeconds: 1234, launches: 12 },
          { packageName: 'com.duolingo', appName: 'Duolingo', category: 'EDUCATION', totalSeconds: 300, launches: 3 },
        ],
        summary: { screenTimeSeconds: 1534, pickups: 40, notifications: 90, unlocks: 25, focusSeconds: 0 },
      },
    });
    assert([200, 201].includes(res.status), `status ${res.status}`);
    assert(res.body.accepted === 2, 'unexpected accepted count');
  });

  await step('GET /usage/overview', async () => {
    assert(smokeDevice, 'no device');
    const res = await api('GET', `/usage/overview?deviceId=${smokeDevice.id}`, { token: parentToken });
    assert(res.status === 200, `status ${res.status}`);
    assert(typeof res.body.screenTimeSeconds === 'number', 'missing screenTimeSeconds');
    assert(Array.isArray(res.body.topApps), 'missing topApps');
    assert(Array.isArray(res.body.week) && res.body.week.length === 7, 'week series should have 7 days');
    return `${(res.body.screenTimeSeconds / 3600).toFixed(1)}h today`;
  });

  await step('GET /usage/range', async () => {
    assert(smokeDevice, 'no device');
    const to = new Date();
    const from = new Date(to.getTime() - 6 * 86400000);
    const res = await api(
      'GET',
      `/usage/range?deviceId=${smokeDevice.id}&from=${from.toISOString().slice(0, 10)}&to=${to.toISOString().slice(0, 10)}`,
      { token: parentToken },
    );
    assert(res.status === 200, `status ${res.status}`);
    assert(res.body.days.length === 7, 'expected 7 days');
  });

  await step('GET /usage/categories', async () => {
    assert(smokeDevice, 'no device');
    const to = new Date();
    const from = new Date(to.getTime() - 6 * 86400000);
    const res = await api(
      'GET',
      `/usage/categories?deviceId=${smokeDevice.id}&from=${from.toISOString().slice(0, 10)}&to=${to.toISOString().slice(0, 10)}`,
      { token: parentToken },
    );
    assert(res.status === 200, `status ${res.status}`);
    assert(Array.isArray(res.body), 'expected an array');
  });

  // --- rules --------------------------------------------------------------
  let ruleId;
  await step('POST /rules (app limit)', async () => {
    assert(household, 'no household');
    const res = await api('POST', '/rules', {
      token: parentToken,
      body: {
        householdId: household.id,
        name: 'Smoke: Instagram limit',
        type: 'APP_LIMIT',
        config: { packages: ['com.instagram.android'], dailyLimitMinutes: 20 },
      },
    });
    assert([200, 201].includes(res.status), `status ${res.status}: ${JSON.stringify(res.body)}`);
    ruleId = res.body.id;
  });

  await step('POST /rules rejects an invalid config', async () => {
    const res = await api('POST', '/rules', {
      token: parentToken,
      body: {
        householdId: household.id,
        name: 'Bad rule',
        type: 'APP_LIMIT',
        config: { packages: 'not-an-array' },
      },
    });
    assert(res.status === 400, `expected 400, got ${res.status}`);
  });

  await step('POST /rules/:id/toggle', async () => {
    assert(ruleId, 'no rule');
    const res = await api('POST', `/rules/${ruleId}/toggle`, {
      token: parentToken,
      body: { enabled: false },
    });
    assert(res.status === 201 || res.status === 200, `status ${res.status}`);
    assert(res.body.enabled === false, 'rule not disabled');
  });

  await step('GET /rules/effective/:deviceId', async () => {
    assert(smokeDevice, 'no device');
    const res = await api('GET', `/rules/effective/${smokeDevice.id}`, { token: parentToken });
    assert(res.status === 200, `status ${res.status}`);
    assert(Array.isArray(res.body.rules), 'missing rules');
    return `${res.body.rules.length} rules`;
  });

  await step('DELETE /rules/:id', async () => {
    assert(ruleId, 'no rule');
    const res = await api('DELETE', `/rules/${ruleId}`, { token: parentToken });
    assert(res.status === 200, `status ${res.status}`);
  });

  // --- focus --------------------------------------------------------------
  await step('POST /focus/start + /stop', async () => {
    const started = await api('POST', '/focus/start', {
      token: childToken,
      body: { plannedMinutes: 5, label: 'Smoke focus', blockedPackages: ['com.instagram.android'] },
    });
    assert([200, 201].includes(started.status), `start status ${started.status}: ${JSON.stringify(started.body)}`);
    const active = await api('GET', '/focus/active', { token: childToken });
    assert(active.body?.id === started.body.id, 'active session mismatch');
    const stopped = await api('POST', `/focus/${started.body.id}/stop`, { token: childToken });
    assert(stopped.status === 201 || stopped.status === 200, `stop status ${stopped.status}`);
  });

  await step('POST /focus/start is rejected while one is active', async () => {
    const a = await api('POST', '/focus/start', { token: childToken, body: { plannedMinutes: 10 } });
    assert([200, 201].includes(a.status), `first start status ${a.status}`);
    const b = await api('POST', '/focus/start', { token: childToken, body: { plannedMinutes: 10 } });
    assert(b.status === 400, `expected 400, got ${b.status}`);
    await api('POST', `/focus/${a.body.id}/cancel`, { token: childToken });
  });

  await step('GET /focus/stats', async () => {
    const res = await api('GET', '/focus/stats', { token: childToken });
    assert(res.status === 200, `status ${res.status}`);
    assert(typeof res.body.totalMinutes === 'number', 'missing totalMinutes');
  });

  // --- rewards ------------------------------------------------------------
  const rewards = await step('GET /rewards', async () => {
    const res = await api('GET', '/rewards', { token: childToken });
    assert(res.status === 200, `status ${res.status}`);
    assert(res.body.length > 0, 'no rewards — run the seed');
    return res.body;
  });

  await step('POST /rewards/:id/redeem + decide', async () => {
    const affordable = (rewards ?? []).find((r) => r.pointCost <= 240);
    assert(affordable, 'no affordable reward for the child');

    // Redeeming spends points, so repeated runs would eventually run the
    // balance dry. Top the child up first (exercising guardian -> member
    // grants) to keep this check deterministic.
    const topUp = await api('POST', '/rewards/points/grant', {
      token: parentToken,
      body: {
        points: affordable.pointCost + 100,
        reason: 'Smoke: balance top-up',
        targetUserId: childUserId,
      },
    });
    assert([200, 201].includes(topUp.status), `top-up status ${topUp.status}`);
    assert(
      topUp.body.balance >= affordable.pointCost,
      `top-up did not reach the reward cost (balance ${topUp.body.balance})`,
    );

    const redeem = await api('POST', `/rewards/${affordable.id}/redeem`, {
      token: childToken,
      body: { note: 'smoke test' },
    });
    assert([200, 201].includes(redeem.status), `redeem status ${redeem.status}: ${JSON.stringify(redeem.body)}`);
    const decide = await api('POST', `/rewards/redemptions/${redeem.body.id}/decide`, {
      token: parentToken,
      body: { approve: true },
    });
    assert(decide.status === 201 || decide.status === 200, `decide status ${decide.status}`);
    assert(decide.body.status === 'APPROVED', 'redemption not approved');
  });

  await step('POST /rewards/points/grant', async () => {
    const res = await api('POST', '/rewards/points/grant', {
      token: parentToken,
      body: { points: 25, reason: 'Smoke: tidy room' },
    });
    assert([200, 201].includes(res.status), `status ${res.status}`);
    assert(typeof res.body.balance === 'number', 'missing balance');
  });

  await step('GET /rewards/points', async () => {
    const res = await api('GET', '/rewards/points', { token: childToken });
    assert(res.status === 200, `status ${res.status}`);
    assert(Array.isArray(res.body.items), 'missing ledger items');
  });

  // --- notifications ------------------------------------------------------
  await step('GET /notifications + read-all', async () => {
    const res = await api('GET', '/notifications', { token: childToken });
    assert(res.status === 200, `status ${res.status}`);
    assert(Array.isArray(res.body), 'expected an array');
    const all = await api('POST', '/notifications/read-all', { token: childToken });
    assert(all.status === 201 || all.status === 200, `read-all status ${all.status}`);
  });

  await step('GET /notifications/unread-count', async () => {
    const res = await api('GET', '/notifications/unread-count', { token: childToken });
    assert(res.status === 200, `status ${res.status}`);
    assert(typeof res.body.count === 'number', 'missing count');
  });

  // --- authorisation ------------------------------------------------------
  await step('child cannot manage household rules', async () => {
    assert(household, 'no household');
    const res = await api('POST', '/rules', {
      token: childToken,
      body: {
        householdId: household.id,
        name: 'Child rule',
        type: 'BLOCKLIST',
        config: { packages: ['com.example'] },
      },
    });
    assert(res.status === 403, `expected 403, got ${res.status}`);
  });

  await step('viewing an unknown device returns 404', async () => {
    const res = await api('GET', '/usage/overview?deviceId=does-not-exist', { token: parentToken });
    assert(res.status === 404, `expected 404, got ${res.status}`);
  });

  // --- cleanup ------------------------------------------------------------
  await step('DELETE /devices/:id (smoke device)', async () => {
    assert(smokeDevice, 'no smoke device');
    const res = await api('DELETE', `/devices/${smokeDevice.id}`, { token: parentToken });
    assert(res.status === 200, `status ${res.status}`);
    const after = await api('GET', '/devices', { token: parentToken });
    assert(
      !after.body.some((d) => d.id === smokeDevice.id),
      'revoked device is still listed',
    );
  });

  // --- summary ------------------------------------------------------------
  const total = passed + failed;
  const colour = failed === 0 ? '\u001b[32m' : '\u001b[31m';
  console.log(`\n${colour}${passed}/${total} checks passed\u001b[0m`);
  if (failed > 0) {
    console.log('\nFailures:');
    for (const f of failures) console.log(`  - ${f.name}: ${f.error}`);
    process.exit(1);
  }
  console.log('');
}

main().catch((error) => {
  console.error('\n\u001b[31mSmoke test crashed:\u001b[0m', error);
  process.exit(1);
});
