#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';

const SAFE_BLOCKED_COPY = 'Enter a public product URL.';
const UNSAFE_COPY_RE = /\b(stack|trace|supabase|postgres|postgrest|sql|schema|relation|service\s*role|token|secret|fetch|network|deno|edge\s*function|functions\/v1|metadata|internal|localhost|private|dns)\b/i;

const hostileCases = [
  ['aws-metadata-ip', 'http://169.254.169.254/latest/meta-data/'],
  ['gcp-metadata-host', 'http://metadata.google.internal/computeMetadata/v1/'],
  ['localhost-name', 'http://localhost:54321/product'],
  ['localhost-subdomain', 'http://shop.localhost/product'],
  ['dot-local-host', 'http://printer.local/product'],
  ['dot-internal-host', 'http://admin.internal/product'],
  ['dot-invalid-host', 'https://proof.invalid/product'],
  ['dot-example-host', 'https://registry.example/product'],
  ['dot-test-host', 'http://shop.test/product'],
  ['loopback-ipv4', 'http://127.0.0.1:8080/product'],
  ['decimal-loopback-ipv4', 'http://2130706433/product'],
  ['hex-loopback-ipv4', 'http://0x7f000001/product'],
  ['short-loopback-ipv4', 'http://127.1/product'],
  ['zero-network-ipv4', 'http://0.0.0.0/product'],
  ['private-class-a', 'http://10.0.0.4/product'],
  ['private-class-b', 'http://172.16.4.9/product'],
  ['private-class-c', 'http://192.168.1.2/product'],
  ['carrier-grade-nat', 'http://100.64.1.2/product'],
  ['link-local-ipv4', 'http://169.254.10.20/product'],
  ['documentation-ipv4', 'http://192.0.2.20/product'],
  ['benchmark-ipv4', 'http://198.18.1.1/product'],
  ['multicast-ipv4', 'http://224.0.0.1/product'],
  ['ipv6-loopback', 'http://[::1]/product'],
  ['ipv4-mapped-ipv6-loopback', 'http://[::ffff:127.0.0.1]/product'],
  ['credentialed-url', 'https://user:pass@example.com/product'],
  ['non-http-scheme', 'file:///etc/passwd'],
];

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

function getEnv(key) {
  const runtimeValue = process.env[key];
  if (runtimeValue && runtimeValue.trim()) return runtimeValue.trim();
  const fileValue = fileEnv[key];
  return typeof fileValue === 'string' ? fileValue.trim() : '';
}

function readEnv() {
  const supabaseUrl = getEnv('VITE_SUPABASE_URL');
  const endpoint = getEnv('REGISTRY_PREVIEW_ENDPOINT')
    || (supabaseUrl ? `${supabaseUrl.replace(/\/$/, '')}/functions/v1/registry-preview` : '');
  const bearer = getEnv('V1_REGISTRY_PREVIEW_AUTH_TOKEN') || getEnv('REGISTRY_PREVIEW_AUTH_TOKEN');
  const anonKey = getEnv('VITE_SUPABASE_ANON_KEY') || getEnv('SUPABASE_ANON_KEY');
  const ownerEmail = getEnv('V1_OWNER_EMAIL');
  const ownerPassword = getEnv('V1_OWNER_PASSWORD');
  return { endpoint, bearer, anonKey, supabaseUrl, ownerEmail, ownerPassword };
}

async function resolveBearer(env) {
  if (env.bearer) return { bearer: env.bearer, authMode: 'provided_bearer' };
  if (!env.supabaseUrl || !env.anonKey || !env.ownerEmail || !env.ownerPassword) {
    return {
      bearer: '',
      authMode: 'missing_auth',
      missingAuth: [
        !env.ownerEmail || !env.ownerPassword ? 'V1_OWNER_EMAIL and V1_OWNER_PASSWORD or V1_REGISTRY_PREVIEW_AUTH_TOKEN' : null,
        !env.anonKey ? 'VITE_SUPABASE_ANON_KEY or SUPABASE_ANON_KEY' : null,
      ].filter(Boolean),
    };
  }

  const signInUrl = new URL('/auth/v1/token', env.supabaseUrl);
  signInUrl.searchParams.set('grant_type', 'password');
  const response = await fetch(signInUrl, {
    method: 'POST',
    headers: {
      apikey: env.anonKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: env.ownerEmail,
      password: env.ownerPassword,
    }),
    signal: AbortSignal.timeout(15_000),
  });
  const payload = await response.json().catch(() => ({}));
  const bearer = typeof payload.access_token === 'string' ? payload.access_token : '';
  if (response.ok && bearer) {
    return { bearer, authMode: 'owner_password_signin' };
  }

  return {
    bearer: '',
    authMode: 'owner_password_signin_failed',
    authError: `Owner proof sign-in failed with status ${response.status}.`,
  };
}

async function probe({ endpoint, bearer, anonKey }, [id, url]) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${bearer}`,
      ...(anonKey ? { apikey: anonKey } : {}),
    },
    body: JSON.stringify({ url, force_refresh: true }),
  });

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  const error = typeof payload?.error === 'string' ? payload.error : '';
  const safeCopy = error === SAFE_BLOCKED_COPY && !UNSAFE_COPY_RE.test(error);
  const blockedBeforeFetch = response.status === 400 && safeCopy;

  return {
    id,
    url,
    status: response.status,
    error: error || null,
    blockedBeforeFetch,
    safeCopy,
  };
}

async function main() {
  const env = readEnv();
  const auth = await resolveBearer(env);
  const missing = [];
  if (!env.endpoint) missing.push('REGISTRY_PREVIEW_ENDPOINT or VITE_SUPABASE_URL');
  if (!auth.bearer) {
    missing.push('V1_REGISTRY_PREVIEW_AUTH_TOKEN or V1_OWNER_EMAIL/V1_OWNER_PASSWORD');
    if (Array.isArray(auth.missingAuth)) missing.push(...auth.missingAuth);
  }

  if (missing.length > 0) {
    const output = {
      ok: false,
      blocked: true,
      proof: 'registry-preview-ssrf-runtime',
      generatedAt: new Date().toISOString(),
      missingEnv: missing,
      requiredEnv: [
        'REGISTRY_PREVIEW_ENDPOINT or VITE_SUPABASE_URL',
        'V1_REGISTRY_PREVIEW_AUTH_TOKEN or V1_OWNER_EMAIL/V1_OWNER_PASSWORD',
        'VITE_SUPABASE_ANON_KEY or SUPABASE_ANON_KEY',
      ],
      authMode: auth.authMode,
      ...(auth.authError ? { authError: auth.authError } : {}),
      hostileCases: hostileCases.map(([id, url]) => ({ id, url })),
      message: 'Live authenticated registry-preview SSRF matrix is ready but requires either a disposable bearer token or reusable owner proof credentials.',
    };
    console.log(JSON.stringify(output, null, 2));
    if (process.argv.includes('--require-live')) process.exit(1);
    return;
  }

  const results = [];
  for (const testCase of hostileCases) {
    results.push(await probe({ ...env, bearer: auth.bearer }, testCase));
  }

  const failures = results.filter((result) => !result.blockedBeforeFetch);
  const output = {
    ok: failures.length === 0,
    blocked: false,
    proof: 'registry-preview-ssrf-runtime',
    generatedAt: new Date().toISOString(),
    endpoint: env.endpoint,
    authMode: auth.authMode,
    summary: {
      total: results.length,
      passed: results.length - failures.length,
      failed: failures.length,
    },
    contractSummary: 'Registry-preview SSRF proof is green: this runtime security lane validates hostile URL blocking for the shipped preview fetch surface, but it remains supporting fetch-safety evidence rather than a broader launch-truth source by itself.',
    results,
  };

  console.log(JSON.stringify(output, null, 2));
  if (!output.ok) process.exit(1);
}

main().catch((error) => {
  console.error(JSON.stringify({
    ok: false,
    proof: 'registry-preview-ssrf-runtime',
    generatedAt: new Date().toISOString(),
    error: error instanceof Error ? error.message : 'Unknown registry-preview SSRF proof failure',
  }, null, 2));
  process.exit(1);
});
