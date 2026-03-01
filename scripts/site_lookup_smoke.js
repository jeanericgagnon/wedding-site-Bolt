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
const slug = process.argv[2] || 'demo';

async function req(url) {
  const res = await fetch(url, {
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

const baseList = await req(`${base}/rest/v1/wedding_sites?select=id,site_slug,site_url,is_published&order=created_at.desc&limit=15`);
const bySlug = await req(`${base}/rest/v1/wedding_sites?select=id,site_slug,site_url,is_published&site_slug=eq.${encodeURIComponent(slug)}`);
const byUrl = await req(`${base}/rest/v1/wedding_sites?select=id,site_slug,site_url,is_published&site_url=eq.${encodeURIComponent(`${slug}.dayof.love`)}`);

console.log(JSON.stringify({
  slug,
  project: base,
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
