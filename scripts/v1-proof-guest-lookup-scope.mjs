#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';

const envFiles = ['.env', '.env.local', '.env.production', '.env.production.local', '.vercel/.env.production.local'];

function parseEnvFile(filePath) {
  if (!existsSync(filePath)) return {};
  const parsed = {};
  for (const line of readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const index = trimmed.indexOf('=');
    const key = trimmed.slice(0, index).trim();
    let value = trimmed.slice(index + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    parsed[key] = value.replace(/\\n$/, '').trim();
  }
  return parsed;
}

const fileEnv = envFiles.reduce((merged, filePath) => ({ ...merged, ...parseEnvFile(filePath) }), {});
const getEnv = (key, fallback = '') => {
  const runtimeValue = process.env[key];
  if (runtimeValue && runtimeValue.trim()) return runtimeValue.trim();
  const fileValue = fileEnv[key];
  if (typeof fileValue === 'string' && fileValue.trim()) return fileValue.trim();
  return fallback;
};

const supabaseUrl = getEnv('VITE_SUPABASE_URL');
const anonKey = getEnv('VITE_SUPABASE_ANON_KEY');
const ownerEmail = getEnv('V1_OWNER_EMAIL', 'test@gmail.com');
const ownerPassword = getEnv('V1_OWNER_PASSWORD', '12345678');
const proofSiteSlug = getEnv('V1_PROOF_SITE_SLUG', 'maya-and-leo');

function blocked(reason, missing = []) {
  console.log(JSON.stringify({
    ok: false,
    blocked: true,
    slice: 'guest-lookup-scope',
    generatedAt: new Date().toISOString(),
    reason,
    missingEnv: missing,
    requiredEnv: [
      'VITE_SUPABASE_URL',
      'VITE_SUPABASE_ANON_KEY',
      'V1_OWNER_EMAIL',
      'V1_OWNER_PASSWORD',
    ],
  }, null, 2));
}

if (!/^https:\/\/.+\.supabase\.co$/.test(supabaseUrl) || !anonKey || !ownerEmail || !ownerPassword) {
  blocked('Guest lookup scope proof needs live Supabase URL, anon key, and owner proof credentials.', [
    ...(!supabaseUrl ? ['VITE_SUPABASE_URL'] : []),
    ...(!anonKey ? ['VITE_SUPABASE_ANON_KEY'] : []),
    ...(!ownerEmail ? ['V1_OWNER_EMAIL'] : []),
    ...(!ownerPassword ? ['V1_OWNER_PASSWORD'] : []),
  ]);
  process.exit(0);
}

const authUrl = new URL('/auth/v1/token', supabaseUrl);
authUrl.searchParams.set('grant_type', 'password');
const restBase = `${supabaseUrl.replace(/\/$/, '')}/rest/v1`;
const lookupFunctionUrl = `${supabaseUrl.replace(/\/$/, '')}/functions/v1/guest-contact-lookup`;
const submitFunctionUrl = `${supabaseUrl.replace(/\/$/, '')}/functions/v1/guest-contact-submit`;

function jsonHeaders(extra = {}) {
  return {
    apikey: anonKey,
    'Content-Type': 'application/json',
    ...extra,
  };
}

async function signInOwner() {
  const response = await fetch(authUrl, {
    method: 'POST',
    headers: jsonHeaders(),
    body: JSON.stringify({ email: ownerEmail, password: ownerPassword }),
    signal: AbortSignal.timeout(15_000),
  });
  const body = await response.json().catch(() => ({}));
  const accessToken = typeof body.access_token === 'string' ? body.access_token : '';
  return {
    ok: response.ok && Boolean(accessToken),
    status: response.status,
    accessToken,
    body,
  };
}

function restHeaders(accessToken, extra = {}) {
  return jsonHeaders({
    Authorization: `Bearer ${accessToken}`,
    ...extra,
  });
}

async function restFetch(path, accessToken, init = {}) {
  return fetch(`${restBase}/${path}`, {
    ...init,
    headers: {
      ...restHeaders(accessToken),
      ...(init.headers || {}),
    },
    signal: AbortSignal.timeout(15_000),
  });
}

async function lookupGuest(body) {
  const response = await fetch(lookupFunctionUrl, {
    method: 'POST',
    headers: jsonHeaders(),
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15_000),
  });
  const payload = await response.json().catch(() => ({}));
  return { status: response.status, payload };
}

async function submitGuestContact(body) {
  const response = await fetch(submitFunctionUrl, {
    method: 'POST',
    headers: jsonHeaders(),
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15_000),
  });
  const payload = await response.json().catch(() => ({}));
  return { status: response.status, payload };
}

function expectNoMatches(result, label) {
  const matches = Array.isArray(result.payload?.matches) ? result.payload.matches : null;
  return {
    id: label,
    ok: result.status === 200 && Array.isArray(matches) && matches.length === 0,
    status: result.status,
    payload: result.payload,
  };
}

function expectExactSingleMatch(result, expectedName, expectedHouseholdSize, expectedHouseholdAllowed) {
  const matches = Array.isArray(result.payload?.matches) ? result.payload.matches : [];
  const match = matches[0] || null;
  const forbiddenKeys = ['id', 'guestId', 'guest_id', 'household_id', 'householdId', 'wedding_site_id', 'weddingSiteId'];
  const leaksForbiddenIds = match && forbiddenKeys.some((key) => Object.hasOwn(match, key));
  return {
    id: 'exact-full-name-match',
    ok: result.status === 200
      && matches.length === 1
      && match?.name === expectedName
      && match?.household_size === expectedHouseholdSize
      && match?.household_updates_allowed === expectedHouseholdAllowed
      && typeof match?.contact_session === 'string'
      && match.contact_session.length > 20
      && !leaksForbiddenIds,
    status: result.status,
    payload: result.payload,
  };
}

function expectScopedSubmit(result, rows, expectedPhone, expectedCity) {
  const everyoneUpdated = Array.isArray(rows)
    && rows.length === 2
    && rows.every((row) => row?.phone === expectedPhone && row?.mailing_city === expectedCity && row?.sms_consent === true);
  return {
    id: 'contact-session-submit-household-scope',
    ok: result.status === 200 && result.payload?.ok === true && everyoneUpdated,
    status: result.status,
    payload: result.payload,
    rows,
  };
}

function expectHouseholdSubmitDenied(result) {
  return {
    id: 'contact-session-submit-household-requires-last4',
    ok: result.status === 403 && result.payload?.error === 'Add the last 4 digits of the phone number on file before updating your whole party.',
    status: result.status,
    payload: result.payload,
  };
}

async function main() {
  const auth = await signInOwner();
  if (!auth.ok) {
    console.log(JSON.stringify({
      ok: false,
      blocked: true,
      slice: 'guest-lookup-scope',
      generatedAt: new Date().toISOString(),
      reason: `Owner proof sign-in failed with status ${auth.status}.`,
    }, null, 2));
    process.exit(0);
  }

  const siteResponse = await restFetch(`wedding_sites?select=id,site_slug,is_published,privacy_mode,guest_access_token&site_slug=eq.${encodeURIComponent(proofSiteSlug)}&limit=1`, auth.accessToken);
  const siteRows = await siteResponse.json().catch(() => []);
  const site = Array.isArray(siteRows) ? siteRows[0] : null;
  if (!site?.id) {
    console.log(JSON.stringify({
      ok: false,
      blocked: true,
      slice: 'guest-lookup-scope',
      generatedAt: new Date().toISOString(),
      reason: `Could not resolve proof site slug ${proofSiteSlug}.`,
    }, null, 2));
    process.exit(0);
  }

  const accessArtifacts = {};
  if (typeof site.guest_access_token === 'string' && site.guest_access_token.trim()) {
    accessArtifacts.inviteToken = site.guest_access_token.trim();
  }
  if (site.privacy_mode === 'password' && !accessArtifacts.inviteToken) {
    console.log(JSON.stringify({
      ok: false,
      blocked: true,
      slice: 'guest-lookup-scope',
      generatedAt: new Date().toISOString(),
      reason: `Proof site ${proofSiteSlug} requires a password-session artifact, which this runtime proof does not mint.`,
    }, null, 2));
    process.exit(0);
  }

  const runId = `${Date.now()}`;
  const lastName = `LookupScopeQA${runId}`;
  const emailVerifier = runId.slice(-6);
  const householdId = randomUUID();
  const guestRows = [
    {
      wedding_site_id: site.id,
      first_name: 'Taylor',
      last_name: lastName,
      name: `Taylor ${lastName}`,
      email: `dayof.lookupscope.${runId}.1@example.com`,
      phone: '5555550999',
      rsvp_status: 'pending',
      household_id: householdId,
    },
    {
      wedding_site_id: site.id,
      first_name: 'Morgan',
      last_name: lastName,
      name: `Morgan ${lastName}`,
      email: `dayof.lookupscope.${runId}.2@example.com`,
      phone: null,
      rsvp_status: 'pending',
      household_id: householdId,
    },
  ];

  let insertedIds = [];

  try {
    const insertResponse = await restFetch('guests', auth.accessToken, {
      method: 'POST',
      headers: {
        Prefer: 'return=representation',
      },
      body: JSON.stringify(guestRows),
    });
    const insertedRows = await insertResponse.json().catch(() => []);
    if (!insertResponse.ok || !Array.isArray(insertedRows) || insertedRows.length !== 2) {
      throw new Error(`Could not insert QA guest rows (${insertResponse.status}): ${JSON.stringify(insertedRows)}`);
    }
    insertedIds = insertedRows.map((row) => row.id).filter(Boolean);

    const partialName = await lookupGuest({
      site_ref: proofSiteSlug,
      query: lastName,
      ...accessArtifacts,
    });
    const mismatchedName = await lookupGuest({
      site_ref: proofSiteSlug,
      query: `Taylor Wrong${runId}`,
      ...accessArtifacts,
    });
    const reversedName = await lookupGuest({
      site_ref: proofSiteSlug,
      query: `${lastName} Taylor`,
      ...accessArtifacts,
    });
    const exactNameWithoutVerifier = await lookupGuest({
      site_ref: proofSiteSlug,
      query: `Taylor ${lastName}`,
      ...accessArtifacts,
    });
    const exactNameWithWrongVerifier = await lookupGuest({
      site_ref: proofSiteSlug,
      query: `Taylor ${lastName}`,
      verifier: `wrong-${runId}`,
      ...accessArtifacts,
    });
    const exactName = await lookupGuest({
      site_ref: proofSiteSlug,
      query: `Taylor ${lastName}`,
      verifier: emailVerifier,
      household_verifier: '9999',
      ...accessArtifacts,
    });
    const exactNameWithoutHouseholdVerifier = await lookupGuest({
      site_ref: proofSiteSlug,
      query: `Taylor ${lastName}`,
      verifier: emailVerifier,
      ...accessArtifacts,
    });
    const contactSession = exactName.payload?.matches?.[0]?.contact_session;
    const contactSessionWithoutHouseholdVerifier = exactNameWithoutHouseholdVerifier.payload?.matches?.[0]?.contact_session;
    const expectedPhone = `555${runId.slice(-7)}`.slice(0, 10);
    const expectedCity = `LookupScope${runId.slice(-4)}`;
    const submitResult = typeof contactSession === 'string' && contactSession.length > 20
      ? await submitGuestContact({
        site_ref: proofSiteSlug,
        contact_session: contactSession,
        apply_household: true,
        phone: expectedPhone,
        sms_consent: true,
        mailing_city: expectedCity,
      })
      : { status: 0, payload: { error: 'Missing contact session from lookup proof.' } };
    const deniedHouseholdSubmit = typeof contactSessionWithoutHouseholdVerifier === 'string' && contactSessionWithoutHouseholdVerifier.length > 20
      ? await submitGuestContact({
        site_ref: proofSiteSlug,
        contact_session: contactSessionWithoutHouseholdVerifier,
        apply_household: true,
        phone: '5550000000',
      })
      : { status: 0, payload: { error: 'Missing contact session from lookup proof.' } };
    const verifyResponse = await restFetch(
      `guests?select=id,phone,sms_consent,mailing_city&id=in.(${insertedIds.join(',')})`,
      auth.accessToken,
    );
    const verifyRows = await verifyResponse.json().catch(() => []);

    const checks = [
      expectNoMatches(partialName, 'last-name-only-lookup'),
      expectNoMatches(mismatchedName, 'mismatched-full-name-lookup'),
      expectNoMatches(reversedName, 'reversed-name-lookup'),
      expectNoMatches(exactNameWithoutVerifier, 'exact-name-without-verifier'),
      expectNoMatches(exactNameWithWrongVerifier, 'exact-name-with-wrong-verifier'),
      expectExactSingleMatch(exactName, `Taylor ${lastName}`, 2, true),
      expectExactSingleMatch(exactNameWithoutHouseholdVerifier, `Taylor ${lastName}`, 2, false),
      expectHouseholdSubmitDenied(deniedHouseholdSubmit),
      expectScopedSubmit(submitResult, verifyRows, expectedPhone, expectedCity),
    ];

    const failures = checks.filter((check) => !check.ok);
    console.log(JSON.stringify({
      ok: failures.length === 0,
      blocked: false,
      slice: 'guest-lookup-scope',
      generatedAt: new Date().toISOString(),
      summary: {
        total: checks.length,
        passed: checks.length - failures.length,
        failed: failures.length,
      },
      site: {
        siteSlug: proofSiteSlug,
        privacyMode: site.privacy_mode,
        isPublished: site.is_published === true,
        authMode: accessArtifacts.inviteToken ? 'invite-token' : 'public',
      },
      checks,
    }, null, 2));
    if (failures.length > 0) process.exit(1);
  } finally {
    if (insertedIds.length > 0) {
      await restFetch(`guests?id=in.(${insertedIds.join(',')})`, auth.accessToken, {
        method: 'DELETE',
      }).catch(() => null);
    }
  }
}

main().catch((error) => {
  console.error(JSON.stringify({
    ok: false,
    slice: 'guest-lookup-scope',
    generatedAt: new Date().toISOString(),
    error: error instanceof Error ? error.message : 'Unknown guest lookup scope proof failure',
  }, null, 2));
  process.exit(1);
});
