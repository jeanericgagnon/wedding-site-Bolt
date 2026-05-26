import { loadSmokeEnv, normalizeEnvValue } from './smokeEnv.mjs';

const fileEnv = loadSmokeEnv();

const base = normalizeEnvValue(process.env.VITE_SUPABASE_URL || fileEnv.VITE_SUPABASE_URL);
const key = normalizeEnvValue(process.env.VITE_SUPABASE_ANON_KEY || fileEnv.VITE_SUPABASE_ANON_KEY);
const requestedSlug = normalizeEnvValue(process.argv[2] || '');

if (!base || !key) {
  console.log(JSON.stringify({ ok: false, step: 'env_missing', message: 'VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY missing' }, null, 2));
  process.exit(1);
}

let baseUrl;
try {
  baseUrl = new URL(base).toString().replace(/\/+$/, '');
} catch {
  console.log(JSON.stringify({ ok: false, step: 'env_invalid_url', message: `Malformed VITE_SUPABASE_URL: ${JSON.stringify(base)}` }, null, 2));
  process.exit(1);
}

async function req(path) {
  const res = await fetch(`${baseUrl}${path}`, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
  });
  let data = null;
  try { data = await res.json(); } catch {}
  return { status: res.status, data };
}

const fail = (step, message, extra = {}) => {
  console.log(JSON.stringify({ ok: false, step, message, ...extra }, null, 2));
  process.exit(1);
};

const baseList = await req('/rest/v1/wedding_sites?select=id,site_slug,site_url,is_published&order=created_at.desc&limit=15');

if (baseList.status !== 200 || !Array.isArray(baseList.data)) {
  fail('list_failed', 'Failed to load recent wedding sites', {
    project: baseUrl,
    listStatus: baseList.status,
    listData: baseList.data,
  });
}

const publishedSite = baseList.data.find((site) => site?.is_published && site?.site_slug);
const targetSite = requestedSlug
  ? baseList.data.find((site) => site?.site_slug === requestedSlug)
  : publishedSite;

if (!targetSite?.site_slug) {
  fail(
    'target_missing',
    requestedSlug
      ? `Requested site slug not found in recent records: ${requestedSlug}`
      : 'No published wedding site with a slug was found for live lookup smoke',
    {
      requestedSlug: requestedSlug || null,
      project: baseUrl,
      listCount: baseList.data.length,
      recent: baseList.data.slice(0, 5),
    }
  );
}

const targetSlug = targetSite.site_slug;
const targetUrl = targetSite.site_url || `${targetSlug}.dayof.love`;
const bySlug = await req(`/rest/v1/wedding_sites?select=id,site_slug,site_url,is_published&site_slug=eq.${encodeURIComponent(targetSlug)}`);
const byUrl = await req(`/rest/v1/wedding_sites?select=id,site_slug,site_url,is_published&site_url=eq.${encodeURIComponent(targetUrl)}`);

const slugHit = Array.isArray(bySlug.data) && bySlug.data.some((site) => site?.site_slug === targetSlug);
const urlHit = Array.isArray(byUrl.data) && byUrl.data.some((site) => site?.site_slug === targetSlug || site?.site_url === targetUrl);

if (bySlug.status !== 200 || !slugHit) {
  fail('slug_lookup_failed', 'Exact slug lookup did not resolve the target site', {
    slug: targetSlug,
    targetUrl,
    bySlugStatus: bySlug.status,
    bySlug: bySlug.data,
  });
}

if (byUrl.status !== 200 || !urlHit) {
  fail('url_lookup_failed', 'Exact site_url lookup did not resolve the target site', {
    slug: targetSlug,
    targetUrl,
    byUrlStatus: byUrl.status,
    byUrl: byUrl.data,
  });
}

console.log(JSON.stringify({
  ok: true,
  requestedSlug: requestedSlug || null,
  slug: targetSlug,
  siteUrl: targetUrl,
  project: baseUrl,
  listStatus: baseList.status,
  listCount: baseList.data.length,
  recent: baseList.data.slice(0, 5),
  bySlugStatus: bySlug.status,
  bySlugCount: Array.isArray(bySlug.data) ? bySlug.data.length : null,
  bySlug: bySlug.data,
  byUrlStatus: byUrl.status,
  byUrlCount: Array.isArray(byUrl.data) ? byUrl.data.length : null,
  byUrl: byUrl.data,
}, null, 2));
