import fs from 'node:fs';

const env = Object.fromEntries(
  fs.readFileSync('.env.local', 'utf8')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      const i = line.indexOf('=');
      return [line.slice(0, i), line.slice(i + 1)];
    })
);

const base = env.VITE_SUPABASE_URL;
const key = env.VITE_SUPABASE_ANON_KEY;
const strict = process.argv.includes('--strict');

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

const guestsResp = await req(`${base}/rest/v1/guests?select=id,invite_token,plus_one_allowed,invited_to_ceremony,invited_to_reception,first_name,last_name,name&invite_token=not.is.null&limit=500`);
if (guestsResp.status >= 300 || !Array.isArray(guestsResp.data) || guestsResp.data.length === 0) {
  console.log(JSON.stringify({ ok: false, step: 'guest_fetch_failed', guestsResp }, null, 2));
  process.exit(1);
}

const guests = guestsResp.data;
const baselineGuest = guests.find((x) => x.invited_to_ceremony === true && x.invited_to_reception === true) || guests[0];
const noCeremonyGuest = guests.find((x) => x.invited_to_ceremony === false && x.id !== baselineGuest.id);
const noReceptionGuest = guests.find((x) => x.invited_to_reception === false && x.id !== baselineGuest.id);

const fn = `${base}/functions/v1/validate-rsvp-token`;
const cases = [
  {
    name: 'valid_submit_baseline',
    payload: {
      action: 'submit',
      guestId: baselineGuest.id,
      inviteToken: baselineGuest.invite_token,
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
      guestId: baselineGuest.id,
      inviteToken: 'bad-token',
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
      guestId: baselineGuest.id,
      inviteToken: baselineGuest.invite_token,
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
      guestId: baselineGuest.id,
      inviteToken: baselineGuest.invite_token,
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
      guestId: noCeremonyGuest.id,
      inviteToken: noCeremonyGuest.invite_token,
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
      guestId: noReceptionGuest.id,
      inviteToken: noReceptionGuest.invite_token,
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
  invalid_token_blocked: 403,
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
  if (typeof wanted === 'number' && r.status !== wanted) {
    failures.push(`${r.name} expected ${wanted} got ${r.status}`);
  }
}

const output = {
  ok: failures.length === 0,
  strict,
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
