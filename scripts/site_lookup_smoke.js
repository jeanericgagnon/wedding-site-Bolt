import fs from 'node:fs';

const normalizeEnvValue = (value) => {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim().replace(/[\r\n]+/g, '').replace(/\\n/g, '').replace(/\\r/g, '');
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
};

const fileEnv = fs.existsSync('.env.local')
  ? Object.fromEntries(
      fs.readFileSync('.env.local', 'utf8')
        .split('\n')
        .map((l) => l.trim())
        .filter((line) => line && !line.startsWith('#') && line.includes('='))
        .map((line) => {
          const i = line.indexOf('=');
          return [line.slice(0, i), normalizeEnvValue(line.slice(i + 1))];
        })
    )
  : {};

const base = normalizeEnvValue(process.env.VITE_SUPABASE_URL || fileEnv.VITE_SUPABASE_URL);
const key = normalizeEnvValue(process.env.VITE_SUPABASE_ANON_KEY || fileEnv.VITE_SUPABASE_ANON_KEY);
const slug = process.argv[2] || 'demo';

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

const baseList = await req('/rest/v1/wedding_sites?select=id,site_slug,site_url,is_published&order=created_at.desc&limit=15');
const bySlug = await req(`/rest/v1/wedding_sites?select=id,site_slug,site_url,is_published&site_slug=eq.${encodeURIComponent(slug)}`);
const byUrl = await req(`/rest/v1/wedding_sites?select=id,site_slug,site_url,is_published&site_url=eq.${encodeURIComponent(`${slug}.dayof.love`)}`);

console.log(JSON.stringify({
  ok: true,
  slug,
  project: baseUrl,
  listStatus: baseList.status,
  listCount: Array.isArray(baseList.data) ? baseList.data.length : null,
  recent: Array.isArray(baseList.data) ? baseList.data.slice(0, 5) : baseList.data,
  bySlugStatus: bySlug.status,
  bySlugCount: Array.isArray(bySlug.data) ? bySlug.data.length : null,
  bySlug: bySlug.data,
  byUrlStatus: byUrl.status,
  byUrlCount: Array.isArray(byUrl.data) ? byUrl.data.length : null,
  byUrl: byUrl.data,
}, null, 2));
