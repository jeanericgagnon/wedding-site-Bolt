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

const guestResp = await req(`${base}/rest/v1/guests?select=id,invite_token,plus_one_allowed,invited_to_ceremony,invited_to_reception,first_name,last_name,name&invite_token=not.is.null&limit=20`);
if (guestResp.status >= 300 || !Array.isArray(guestResp.data) || guestResp.data.length === 0) {
  console.log(JSON.stringify({ ok: false, step: 'guest_fetch_failed', guestResp }, null, 2));
  process.exit(1);
}

const guests = guestResp.data;
const g = guests.find((x) => x.invited_to_ceremony === false) || guests[0];

const fn = `${base}/functions/v1/validate-rsvp-token`;
const cases = [];

cases.push({
  name: 'valid_submit_baseline',
  payload: {
    action: 'submit',
    guestId: g.id,
    inviteToken: g.invite_token,
    attending: false,
    attendCeremony: false,
    attendReception: false,
    mealChoice: null,
    plusOneName: null,
    plusOneCount: 0,
    childrenCount: 0,
    notes: 'smoke-baseline',
  },
});

cases.push({
  name: 'invalid_token_blocked',
  payload: {
    action: 'submit',
    guestId: g.id,
    inviteToken: 'bad-token',
    attending: true,
    attendCeremony: false,
    attendReception: false,
    plusOneCount: 0,
    childrenCount: 0,
  },
});

cases.push({
  name: 'plus_one_limit_blocked',
  payload: {
    action: 'submit',
    guestId: g.id,
    inviteToken: g.invite_token,
    attending: true,
    attendCeremony: !!g.invited_to_ceremony,
    attendReception: !!g.invited_to_reception,
    plusOneName: 'Extra Guest',
    plusOneCount: g.plus_one_allowed ? 2 : 1,
    childrenCount: 0,
  },
});

if (g.invited_to_ceremony === false) {
  cases.push({
    name: 'scope_violation_ceremony_blocked',
    payload: {
      action: 'submit',
      guestId: g.id,
      inviteToken: g.invite_token,
      attending: true,
      attendCeremony: true,
      attendReception: false,
      plusOneCount: 0,
      childrenCount: 0,
    },
  });
}

const results = [];
for (const c of cases) {
  const r = await req(fn, { method: 'POST', body: JSON.stringify(c.payload) });
  results.push({
    name: c.name,
    status: r.status,
    success: !!(r.data && r.data.success),
    error: r.data && r.data.error ? r.data.error : null,
  });
}

const conf = await req(`${base}/rest/v1/rsvp_conflicts?select=id,conflict_code,message,created_at,resolved&order=created_at.desc&limit=10`);

console.log(JSON.stringify({
  ok: true,
  guest: {
    id: g.id,
    name: g.name || `${g.first_name || ''} ${g.last_name || ''}`.trim(),
    invited_to_ceremony: g.invited_to_ceremony,
    invited_to_reception: g.invited_to_reception,
    plus_one_allowed: g.plus_one_allowed,
  },
  results,
  conflicts_status: conf.status,
  conflicts_count: Array.isArray(conf.data) ? conf.data.length : null,
  conflicts_sample: Array.isArray(conf.data) ? conf.data.slice(0, 5) : conf.data,
}, null, 2));
