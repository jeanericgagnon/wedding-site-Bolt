import fs from 'node:fs';

const normalizeEnvValue = (value) => {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim().replace(/[\r\n]+/g, '').replace(/\\n/g, '').replace(/\\r/g, '');
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
};

const loadEnvFile = (path) => (fs.existsSync(path)
  ? Object.fromEntries(
      fs.readFileSync(path, 'utf8')
        .split('\n')
        .map((l) => l.trim())
        .filter((line) => line && !line.startsWith('#') && line.includes('='))
        .map((line) => {
          const i = line.indexOf('=');
          return [line.slice(0, i), normalizeEnvValue(line.slice(i + 1))];
        }),
    )
  : {});

const fileEnv = {
  ...loadEnvFile('.env'),
  ...loadEnvFile('.env.local'),
};

const base = normalizeEnvValue(process.env.VITE_SUPABASE_URL || fileEnv.VITE_SUPABASE_URL);
const key = normalizeEnvValue(process.env.VITE_SUPABASE_ANON_KEY || fileEnv.VITE_SUPABASE_ANON_KEY);
const strict = process.argv.includes('--strict');

if (!base || !key) {
  console.log(JSON.stringify({ ok: false, step: 'env_missing', message: 'VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY missing' }, null, 2));
  process.exit(1);
}

async function req(url, opts = {}) {
  const res = await fetch(url, {
    ...opts,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      ...(opts.headers || {}),
    },
  });
  let data;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  return { status: res.status, data };
}

const fn = `${base}/functions/v1/validate-rsvp-token`;

const preflight = await req(fn, {
  method: 'POST',
  body: JSON.stringify({ action: 'lookup', searchValue: 'smoke-preflight-token' }),
});

if (preflight.status === 401) {
  const output = {
    ok: !strict,
    strict,
    skipped: true,
    step: 'external_fixture_required',
    message: 'validate-rsvp-token function is not callable with current anon credentials (401).',
    recommendation: 'Provide anon-callable function auth in this environment or run with credentials that can invoke the function.',
  };
  console.log(JSON.stringify(output, null, 2));
  if (strict) process.exit(1);
  process.exit(0);
}

async function lookupByToken(inviteToken) {
  const lookup = await req(fn, {
    method: 'POST',
    body: JSON.stringify({ action: 'lookup', searchValue: inviteToken }),
  });

  if (lookup.status === 401) {
    return { unauthorized: true };
  }
  if (lookup.status !== 200 || !lookup.data?.guest?.id) return null;

  const guest = lookup.data.guest;
  return {
    id: guest.id,
    invite_token: guest.invite_token,
    rsvpSession: lookup.data.rsvpSession ?? lookup.data.rsvp_session ?? lookup.data.session ?? null,
    plus_one_allowed: !!guest.plus_one_allowed,
    invited_to_ceremony: !!guest.invited_to_ceremony,
    invited_to_reception: !!guest.invited_to_reception,
    first_name: guest.first_name ?? null,
    last_name: guest.last_name ?? null,
    name: guest.name ?? null,
  };
}

const guestsResp = await req(`${base}/rest/v1/guests?select=id,invite_token,plus_one_allowed,invited_to_ceremony,invited_to_reception,first_name,last_name,name&invite_token=not.is.null&limit=500`);

let guests = Array.isArray(guestsResp.data) ? guestsResp.data : [];
let usingFixtureFallback = false;

if (guestsResp.status >= 300 || guests.length === 0) {
  const fixtureTokens = ['smoke-ceremony-only-token', 'smoke-reception-only-token'];
  const fixtureGuests = [];
  for (const token of fixtureTokens) {
    const g = await lookupByToken(token);
    if (g) fixtureGuests.push(g);
  }

  if (fixtureGuests.length > 0) {
    guests = fixtureGuests;
    usingFixtureFallback = true;
  } else {
    console.log(JSON.stringify({
      ok: false,
      step: 'guest_fixture_missing',
      message: 'Could not fetch guests from REST and deterministic smoke fixture tokens were not found.',
      guestsResp,
      expectedFixtureTokens: fixtureTokens,
    }, null, 2));
    process.exit(1);
  }
}

async function hydrateGuestSession(guest) {
  if (!guest?.invite_token) return guest;
  const lookedUp = await lookupByToken(guest.invite_token);
  return lookedUp && !lookedUp.unauthorized ? { ...guest, ...lookedUp } : guest;
}

function buildSubmitAuth(guest, inviteToken = guest.invite_token) {
  return {
    guestId: guest.id,
    inviteToken,
    rsvpSession: inviteToken === guest.invite_token
      ? (guest.rsvpSession ?? guest.rsvp_session ?? guest.invite_token)
      : inviteToken,
  };
}

let baselineGuest = guests.find((x) => x.invited_to_ceremony === true && x.invited_to_reception === true) || guests[0];
let noCeremonyGuest = guests.find((x) => x.invited_to_ceremony === false && x.id !== baselineGuest.id);
let noReceptionGuest = guests.find((x) => x.invited_to_reception === false && x.id !== baselineGuest.id);

[baselineGuest, noCeremonyGuest, noReceptionGuest] = await Promise.all([
  hydrateGuestSession(baselineGuest),
  noCeremonyGuest ? hydrateGuestSession(noCeremonyGuest) : null,
  noReceptionGuest ? hydrateGuestSession(noReceptionGuest) : null,
]);

const cases = [
  {
    name: 'valid_submit_baseline',
    payload: {
      action: 'submit',
      ...buildSubmitAuth(baselineGuest),
      attending: false,
      attendCeremony: false,
      attendReception: false,
      mealChoice: null,
      plusOneName: null,
      plusOneCount: 0,
      childrenCount: 0,
      notes: 'smoke-baseline',
    },
  },
  {
    name: 'invalid_token_blocked',
    payload: {
      action: 'submit',
      ...buildSubmitAuth(baselineGuest, 'bad-token'),
      attending: true,
      attendCeremony: !!baselineGuest.invited_to_ceremony,
      attendReception: !!baselineGuest.invited_to_reception,
      plusOneCount: 0,
      childrenCount: 0,
    },
  },
  {
    name: 'plus_one_limit_blocked',
    payload: {
      action: 'submit',
      ...buildSubmitAuth(baselineGuest),
      attending: true,
      attendCeremony: !!baselineGuest.invited_to_ceremony,
      attendReception: !!baselineGuest.invited_to_reception,
      plusOneName: 'Extra Guest',
      plusOneCount: baselineGuest.plus_one_allowed ? 2 : 1,
      childrenCount: 0,
    },
  },
  {
    name: 'children_limit_blocked',
    payload: {
      action: 'submit',
      ...buildSubmitAuth(baselineGuest),
      attending: true,
      attendCeremony: !!baselineGuest.invited_to_ceremony,
      attendReception: !!baselineGuest.invited_to_reception,
      plusOneCount: 0,
      childrenCount: 1,
    },
  },
];

if (noCeremonyGuest) {
  cases.push({
    name: 'scope_violation_ceremony_blocked',
    payload: {
      action: 'submit',
      ...buildSubmitAuth(noCeremonyGuest),
      attending: true,
      attendCeremony: true,
      attendReception: !!noCeremonyGuest.invited_to_reception,
      plusOneCount: 0,
      childrenCount: 0,
    },
  });
} else {
  cases.push({ name: 'scope_violation_ceremony_blocked', skipped: 'no ceremony-excluded guest available' });
}

if (noReceptionGuest) {
  cases.push({
    name: 'scope_violation_reception_blocked',
    payload: {
      action: 'submit',
      ...buildSubmitAuth(noReceptionGuest),
      attending: true,
      attendCeremony: !!noReceptionGuest.invited_to_ceremony,
      attendReception: true,
      plusOneCount: 0,
      childrenCount: 0,
    },
  });
} else {
  cases.push({ name: 'scope_violation_reception_blocked', skipped: 'no reception-excluded guest available' });
}

const results = [];
for (const c of cases) {
  if ('skipped' in c) {
    results.push({ name: c.name, skipped: c.skipped });
    continue;
  }
  const r = await req(fn, { method: 'POST', body: JSON.stringify(c.payload) });
  results.push({
    name: c.name,
    status: r.status,
    success: !!(r.data && r.data.success),
    error: r.data && r.data.error ? r.data.error : null,
  });
}

const expectedStatus = {
  valid_submit_baseline: 200,
  invalid_token_blocked: [403, 404],
  plus_one_limit_blocked: 400,
  children_limit_blocked: 400,
  scope_violation_ceremony_blocked: 400,
  scope_violation_reception_blocked: 400,
};

const failures = [];
for (const r of results) {
  if ('skipped' in r) {
    if (strict) failures.push(`${r.name} skipped: ${r.skipped}`);
    continue;
  }
  const wanted = expectedStatus[r.name];
  const allowed = Array.isArray(wanted) ? wanted : [wanted];
  if (typeof wanted !== 'undefined' && !allowed.includes(r.status)) {
    failures.push(`${r.name} expected ${allowed.join(' or ')} got ${r.status}`);
  }
}

const output = {
  ok: failures.length === 0,
  strict,
  usingFixtureFallback,
  selectedGuests: {
    baseline: {
      id: baselineGuest.id,
      name: baselineGuest.name || `${baselineGuest.first_name || ''} ${baselineGuest.last_name || ''}`.trim(),
      invited_to_ceremony: baselineGuest.invited_to_ceremony,
      invited_to_reception: baselineGuest.invited_to_reception,
      plus_one_allowed: baselineGuest.plus_one_allowed,
    },
    noCeremony: noCeremonyGuest ? { id: noCeremonyGuest.id, name: noCeremonyGuest.name, invited_to_ceremony: noCeremonyGuest.invited_to_ceremony, invited_to_reception: noCeremonyGuest.invited_to_reception } : null,
    noReception: noReceptionGuest ? { id: noReceptionGuest.id, name: noReceptionGuest.name, invited_to_ceremony: noReceptionGuest.invited_to_ceremony, invited_to_reception: noReceptionGuest.invited_to_reception } : null,
  },
  results,
  failures,
};

console.log(JSON.stringify(output, null, 2));
if (failures.length > 0) process.exit(1);
