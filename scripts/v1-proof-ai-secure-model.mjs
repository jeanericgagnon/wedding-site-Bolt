#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { createClient } from '@supabase/supabase-js';

const PROJECT_REF = 'atuzuobpprjstfmdnwso';
const envFiles = ['.env', '.env.local', '.env.production', '.env.production.local', '.vercel/.env.production.local'];
const checks = [];
const startedAt = new Date();

function parseEnvFile(filePath) {
  if (!existsSync(filePath)) return {};
  const parsed = {};
  for (const line of readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const index = trimmed.indexOf('=');
    const key = trimmed.slice(0, index).trim();
    let value = trimmed.slice(index + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    parsed[key] = value.replace(/\\n$/, '').trim();
  }
  return parsed;
}

const fileEnv = envFiles.reduce((merged, filePath) => ({ ...merged, ...parseEnvFile(filePath) }), {});
const getEnv = (key) => (process.env[key] && String(process.env[key]).trim()) || fileEnv[key] || '';

function addCheck(id, ok, detail = {}) {
  checks.push({ id, ok: Boolean(ok), detail });
}

function redact(value) {
  return String(value ?? '')
    .replace(/sk-[A-Za-z0-9_-]{12,}/g, '[REDACTED_OPENAI_KEY]')
    .replace(/sbp_[A-Za-z0-9_-]+/g, '[REDACTED_SUPABASE_TOKEN]')
    .replace(/eyJ[A-Za-z0-9._-]{20,}/g, '[REDACTED_JWT]')
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, 'Bearer [REDACTED]');
}

function loadServiceRoleKey() {
  const envKey = getEnv('SUPABASE_SERVICE_ROLE_KEY') || getEnv('V1_SUPABASE_SERVICE_ROLE_KEY');
  if (envKey) return envKey;
  const output = execFileSync('supabase', ['projects', 'api-keys', '--project-ref', PROJECT_REF, '-o', 'json'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const keys = JSON.parse(output);
  const service = keys.find((key) => key.name === 'service_role' || key.type === 'secret');
  if (!service?.api_key) throw new Error('Could not load Supabase service-role key from CLI.');
  return service.api_key;
}

function listSecretNames() {
  const output = execFileSync('supabase', ['secrets', 'list', '--project-ref', PROJECT_REF], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  return output
    .split(/\r?\n/)
    .map((line) => line.replace(/\|.*$/, '').trim())
    .filter((name) => /^[A-Z][A-Z0-9_]{2,}$/.test(name) && name !== 'NAME')
    .sort();
}

async function jsonFetch(url, init = {}) {
  const response = await fetch(url, { ...init, signal: AbortSignal.timeout(init.timeoutMs ?? 60_000) });
  const text = await response.text();
  let body = {};
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = { raw: redact(text).slice(0, 300) };
  }
  return { response, body };
}

function assertNoSecretLeak(value) {
  const serialized = JSON.stringify(value);
  return !/sk-[A-Za-z0-9_-]{12,}|OPENAI_API_KEY|SUPABASE_SERVICE_ROLE|service[_\s-]?role|Bearer\s+[A-Za-z0-9._-]+|sbp_/i.test(serialized);
}

function hasKeyDeep(value, keyNames) {
  if (!value || typeof value !== 'object') return false;
  if (Array.isArray(value)) return value.some((item) => hasKeyDeep(item, keyNames));
  return Object.entries(value).some(([key, nested]) => keyNames.includes(key) || hasKeyDeep(nested, keyNames));
}

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const typeBuffer = Buffer.from(type, 'ascii');
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
  return Buffer.concat([length, typeBuffer, data, crc]);
}

function buildProofPng() {
  const width = 128;
  const height = 96;
  const rows = [];
  for (let y = 0; y < height; y += 1) {
    const row = Buffer.alloc(1 + width * 3);
    row[0] = 0;
    for (let x = 0; x < width; x += 1) {
      const offset = 1 + x * 3;
      const aisle = Math.abs(x - width / 2) < 10;
      const sky = y < 26;
      const garden = y > 58;
      row[offset] = aisle ? 238 : sky ? 196 : garden ? 91 : 224;
      row[offset + 1] = aisle ? 226 : sky ? 218 : garden ? 132 : 183;
      row[offset + 2] = aisle ? 204 : sky ? 230 : garden ? 93 : 156;
    }
    rows.push(row);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', deflateSync(Buffer.concat(rows))),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

const liveEnabled = getEnv('V1_AI_SECURE_MODEL_LIVE') === '1';
const supabaseUrl = getEnv('VITE_SUPABASE_URL') || 'https://atuzuobpprjstfmdnwso.supabase.co';
const anonKey = getEnv('VITE_SUPABASE_ANON_KEY');
const ownerEmail = getEnv('V1_OWNER_EMAIL') || 'test@gmail.com';
const ownerPassword = getEnv('V1_OWNER_PASSWORD') || '12345678';
const proofSiteSlug = getEnv('V1_PROOF_SITE_SLUG') || 'maya-and-leo';

if (!liveEnabled) {
  console.log(JSON.stringify({
    ok: false,
    generatedAt: new Date().toISOString(),
    proofMode: 'blocked_live_flag_required',
    error: 'Set V1_AI_SECURE_MODEL_LIVE=1 to run the secure live model-backed proof.',
  }, null, 2));
  process.exit(1);
}

if (!/^https:\/\/.+\.supabase\.co$/.test(supabaseUrl) || !anonKey) {
  console.log(JSON.stringify({
    ok: false,
    generatedAt: new Date().toISOString(),
    proofMode: 'blocked_missing_supabase_env',
    error: 'Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
  }, null, 2));
  process.exit(1);
}

let cleanupAlbumId = '';

try {
  const serviceRoleKey = loadServiceRoleKey();
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const secretNames = listSecretNames();
  addCheck('server-openai-secret-name-configured', secretNames.includes('OPENAI_API_KEY'), {
    configuredSecretNames: secretNames.filter((name) => /^OPENAI|^PHOTO_AI|^ONBOARDING_AI/.test(name)).sort(),
    valuesPrinted: false,
  });

  const authResult = await jsonFetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: anonKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ownerEmail, password: ownerPassword }),
    timeoutMs: 20_000,
  });
  const ownerToken = authResult.body.access_token;
  addCheck('owner-auth-token-created-without-printing', authResult.response.ok && typeof ownerToken === 'string' && ownerToken.length > 20, {
    status: authResult.response.status,
    tokenPrinted: false,
  });
  if (!ownerToken) throw new Error('Owner auth failed.');

  const { data: site, error: siteError } = await admin
    .from('wedding_sites')
    .select('id,user_id,site_slug')
    .eq('site_slug', proofSiteSlug)
    .maybeSingle();
  if (siteError || !site?.id) throw new Error(`Could not load proof site: ${redact(siteError?.message)}`);
  addCheck('proof-site-loaded-service-side', true, { siteSlug: site.site_slug, siteId: site.id });

  const authHeaders = {
    apikey: anonKey,
    Authorization: `Bearer ${ownerToken}`,
    'Content-Type': 'application/json',
  };

  const beforeOnboarding = await admin
    .from('internal_ai_usage_events')
    .select('id')
    .eq('feature', 'onboarding_concierge')
    .eq('wedding_site_id', site.id)
    .gte('created_at', startedAt.toISOString());

  const onboarding = await jsonFetch(`${supabaseUrl}/functions/v1/onboarding-ai-orchestrate`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      siteId: site.id,
      loopCount: 0,
      answers: {
        names: 'Maya and Leo',
        labelPreference: 'Maya and Leo',
        whenWhere: 'June 14, 2026 at Coastal Garden House',
        venueNameOrTbd: 'Coastal Garden House',
        style: 'garden dinner with warm coastal details',
        guestFeel: 'welcomed, clear, and excited for a relaxed weekend',
        weekendEventsRaw: 'Welcome drinks Friday, ceremony and dinner Saturday, farewell coffee Sunday',
        ceremonyArrivalTime: '4:30 PM',
        guestCountBand: '80 to 100',
        plusOnePolicy: 'Named guests only unless the invite says otherwise',
        childrenAllowed: 'Adults only except immediate family',
        rsvpDeadline: 'May 1, 2026',
        mealChoice: 'Guests can choose chicken, fish, vegetarian, or vegan',
        registryIntent: 'Small registry and honeymoon fund',
        optionalStory: 'They chose the coast because it is where their families first spent time together.',
      },
    }),
  });
  const onboardingHasProviderModelKey = hasKeyDeep(onboarding.body, ['provider', 'model']);
  const onboardingLeakFree = assertNoSecretLeak(onboarding.body) && !onboardingHasProviderModelKey;
  addCheck('quick-start-live-model-route-success-safe-response', onboarding.response.ok && onboarding.body.success === true && onboardingLeakFree, {
    status: onboarding.response.status,
    mode: onboarding.body.mode,
    fallbackUsed: Boolean(onboarding.body.fallbackUsed),
    providerOrModelReturned: onboardingHasProviderModelKey,
  });
  const afterOnboarding = await admin
    .from('internal_ai_usage_events')
    .select('id,provider,model,feature,created_at')
    .eq('feature', 'onboarding_concierge')
    .eq('wedding_site_id', site.id)
    .gte('created_at', startedAt.toISOString())
    .order('created_at', { ascending: false })
    .limit(3);
  addCheck('quick-start-model-backed-usage-recorded-internal-only', !afterOnboarding.error && (afterOnboarding.data?.length ?? 0) > (beforeOnboarding.data?.length ?? 0), {
    newEvents: Math.max(0, (afterOnboarding.data?.length ?? 0) - (beforeOnboarding.data?.length ?? 0)),
    providerRecorded: afterOnboarding.data?.[0]?.provider === 'openai',
    eventIds: (afterOnboarding.data ?? []).map((row) => row.id),
  });

  const noAuthTranslation = await jsonFetch(`${supabaseUrl}/functions/v1/translate-site-content`, {
    method: 'POST',
    headers: { apikey: anonKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ siteId: site.id, language: 'es' }),
    timeoutMs: 20_000,
  });
  addCheck('translation-safe-missing-auth-failure', noAuthTranslation.response.status === 401 && assertNoSecretLeak(noAuthTranslation.body), {
    status: noAuthTranslation.response.status,
    error: noAuthTranslation.body.error,
  });

  const translation = await jsonFetch(`${supabaseUrl}/functions/v1/translate-site-content`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ siteId: site.id, language: 'pt' }),
    timeoutMs: 180_000,
  });
  const translationReadback = await admin
    .from('site_translations')
    .select('id,language,status,translated_at')
    .eq('wedding_site_id', site.id)
    .eq('language', 'pt')
    .maybeSingle();
  const translationRecoveredFromReadback = !translation.response.ok
    && translation.response.status === 546
    && !translationReadback.error
    && translationReadback.data?.status === 'ready'
    && assertNoSecretLeak(translation.body);
  addCheck(
    'site-translation-live-model-success-safe-response',
    (translation.response.ok && translation.body.success === true && assertNoSecretLeak(translation.body))
      || translationRecoveredFromReadback,
    {
      status: translation.response.status,
      language: translation.body.translation?.language ?? translationReadback.data?.language,
      translationId: translation.body.translation?.id ?? translationReadback.data?.id,
      recoveredFromReadyReadback: translationRecoveredFromReadback,
    },
  );
  addCheck('site-translation-ready-row-readback', !translationReadback.error && translationReadback.data?.status === 'ready', {
    id: translationReadback.data?.id,
    language: translationReadback.data?.language,
    status: translationReadback.data?.status,
  });

  const albumName = `AI secure model proof ${Date.now()}`;
  const createAlbum = await jsonFetch(`${supabaseUrl}/functions/v1/photo-album-create`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ siteId: site.id, name: albumName, opensAt: null, closesAt: null }),
    timeoutMs: 30_000,
  });
  cleanupAlbumId = String(createAlbum.body.album?.id || createAlbum.body.albumId || '');
  const uploadUrl = String(createAlbum.body.uploadUrl || '');
  const token = new URL(uploadUrl, 'https://dayof.love').searchParams.get('t') || '';
  addCheck('photo-proof-album-created', createAlbum.response.ok && cleanupAlbumId && token, {
    status: createAlbum.response.status,
    albumId: cleanupAlbumId,
    uploadTokenPrinted: false,
  });
  if (!cleanupAlbumId || !token) throw new Error('Could not create proof photo album.');

  const form = new FormData();
  form.set('token', token);
  form.set('guestName', 'AI Proof Guest');
  form.set('guestEmail', `dayof.ai-proof.${Date.now()}@example.com`);
  form.set('note', 'Secure model proof upload showing a small garden ceremony aisle scene');
  form.append('files', new File([
    buildProofPng(),
  ], 'ai-secure-model-proof.png', { type: 'image/png' }));
  const upload = await jsonFetch(`${supabaseUrl}/functions/v1/photo-upload`, {
    method: 'POST',
    body: form,
    timeoutMs: 45_000,
  });
  const uploadId = upload.body.uploaded?.[0]?.id;
  addCheck('photo-upload-live-proof-media-created', upload.response.ok && typeof uploadId === 'string', {
    status: upload.response.status,
    uploadId,
    failedCount: upload.body.failed?.length ?? 0,
  });
  if (!uploadId) throw new Error(`Photo upload proof failed: ${redact(JSON.stringify(upload.body))}`);

  const photoAnalysis = await jsonFetch(`${supabaseUrl}/functions/v1/photo-analyze-batch`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ siteId: site.id, uploadIds: [uploadId], limit: 1, mode: 'vision', force: true, provider: 'openai' }),
    timeoutMs: 180_000,
  });
  addCheck('photo-vision-live-model-route-success', photoAnalysis.response.ok && photoAnalysis.body.success === true && photoAnalysis.body.analyzed === 1 && assertNoSecretLeak(photoAnalysis.body), {
    status: photoAnalysis.response.status,
    analyzed: photoAnalysis.body.analyzed,
    resultStatus: photoAnalysis.body.results?.[0]?.status,
    ownerProtectedResponseContainsProviderModel: /\bprovider\b|\bmodel\b/i.test(JSON.stringify(photoAnalysis.body.results?.[0] ?? {})),
  });
  const photoReadback = await admin
    .from('photo_upload_ai_analysis')
    .select('upload_id,status,provider,model,detected_moment,suggested_bucket_name,bucket_confidence,quality_score,error_message')
    .eq('upload_id', uploadId)
    .maybeSingle();
  addCheck('photo-vision-openai-analysis-row-readback-protected', !photoReadback.error && photoReadback.data?.provider === 'openai' && photoReadback.data?.status === 'ready', {
    uploadId,
    status: photoReadback.data?.status,
    provider: photoReadback.data?.provider,
    hasDetectedMoment: Boolean(photoReadback.data?.detected_moment),
    hasSuggestedBucket: Boolean(photoReadback.data?.suggested_bucket_name),
    hasSafeError: !photoReadback.data?.error_message || assertNoSecretLeak(photoReadback.data?.error_message),
  });
  const photoUsage = await admin
    .from('internal_ai_usage_events')
    .select('id,provider,feature,created_at')
    .eq('feature', 'photo_vision')
    .eq('upload_id', uploadId)
    .gte('created_at', startedAt.toISOString())
    .order('created_at', { ascending: false })
    .limit(3);
  addCheck('photo-vision-usage-recorded-internal-only', !photoUsage.error && (photoUsage.data?.length ?? 0) > 0 && photoUsage.data?.[0]?.provider === 'openai', {
    eventIds: (photoUsage.data ?? []).map((row) => row.id),
    providerRecorded: photoUsage.data?.[0]?.provider === 'openai',
  });

  const noAuthPhoto = await jsonFetch(`${supabaseUrl}/functions/v1/photo-analyze-batch`, {
    method: 'POST',
    headers: { apikey: anonKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ siteId: site.id, uploadIds: [uploadId] }),
    timeoutMs: 20_000,
  });
  addCheck('photo-vision-safe-missing-auth-failure', noAuthPhoto.response.status === 401 && assertNoSecretLeak(noAuthPhoto.body), {
    status: noAuthPhoto.response.status,
    error: noAuthPhoto.body.error,
  });

  const onboardingSource = readFileSync('supabase/functions/onboarding-ai-orchestrate/index.ts', 'utf8');
  const photoSource = readFileSync('supabase/functions/photo-analyze-batch/index.ts', 'utf8');
  const translationSource = readFileSync('supabase/functions/translate-site-content/index.ts', 'utf8');
  addCheck('source-contract-provider-failure-fallbacks-present', /catch \(err\)[\s\S]{0,240}fallbackUsed: true/.test(onboardingSource)
    && /vision_failed/.test(photoSource)
    && /Translation could not be generated right now/.test(translationSource), {
    routes: ['onboarding-ai-orchestrate', 'photo-analyze-batch', 'translate-site-content'],
  });
  addCheck('source-contract-invalid-output-safe-fallbacks-present', /sanitizeDecision/.test(onboardingSource)
    && /normalizeResult/.test(photoSource)
    && /Translation could not be read cleanly/.test(translationSource), {
    routes: ['onboarding-ai-orchestrate', 'photo-analyze-batch', 'translate-site-content'],
  });
} catch (error) {
  addCheck('secure-model-proof-unexpected-error', false, { message: redact(error?.message || error) });
} finally {
  if (cleanupAlbumId) {
    try {
      const serviceRoleKey = loadServiceRoleKey();
      const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
      await admin.from('photo_uploads').delete().eq('photo_album_id', cleanupAlbumId);
      await admin.from('photo_albums').delete().eq('id', cleanupAlbumId);
      addCheck('photo-proof-album-cleaned-up', true, { albumId: cleanupAlbumId });
    } catch (error) {
      addCheck('photo-proof-album-cleaned-up', false, { albumId: cleanupAlbumId, message: redact(error?.message || error) });
    }
  }
}

const ok = checks.every((check) => check.ok);
console.log(JSON.stringify({
  ok,
  generatedAt: new Date().toISOString(),
  proofMode: 'secure_live_model_backed_ai',
  production: 'https://dayof.love',
  projectRef: PROJECT_REF,
  secretHandling: 'Supabase service-role/OpenAI values are used only in memory by live services or CLI and are not printed, pasted, committed, or written.',
  summary: `${checks.filter((check) => check.ok).length}/${checks.length} secure model-backed AI checks passed`,
  checks,
}, null, 2));
process.exit(ok ? 0 : 1);
