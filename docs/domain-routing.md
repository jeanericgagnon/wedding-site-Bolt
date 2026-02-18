# Domain Routing

How dayof.love domains and wedding site slugs work.

---

## Current URL Structure

| Path | Auth | Description |
|------|------|-------------|
| `dayof.love/` | Public | Marketing homepage |
| `dayof.love/login` | Public | Login page |
| `dayof.love/signup` | Public | Sign up page |
| `dayof.love/onboarding` | Protected | New user setup flow |
| `dayof.love/dashboard` | Protected | Authenticated dashboard |
| `dayof.love/builder` | Protected | Site builder |
| `dayof.love/site/<slug>` | Public | Public wedding website |

Wedding sites are accessed via the `/site/<slug>` path on the same origin as the app. No special DNS configuration is required for this to work.

---

## Slug Format

Slugs are auto-generated at sign-up from partner names using the `generate_site_slug` trigger:

```
couple_name_1 + '-' + couple_name_2 + '-' + first8charsOfSiteId
```

All non-alphanumeric characters are replaced with `-`. Example: `alex-thompson-jordan-rivera-a1b2c3d4`.

Rules:
- Slugs are stored in `wedding_sites.site_slug` (UNIQUE constraint)
- A slug is generated once on INSERT if not already set
- Couples can update their slug via Settings — the old URL stops working immediately
- No redirect is maintained for old slugs

---

## Slug Resolution (SiteView.tsx)

When a visitor hits `/site/<slug>`:

1. `SiteView.tsx` reads the slug from React Router params
2. Supabase query: `SELECT ... FROM wedding_sites WHERE site_slug = :slug`
3. RLS policy allows anon SELECT when `site_slug IS NOT NULL`
4. Site data is loaded; rendering path chosen based on data availability:

```
published_json  → preferred (production snapshot)
    ↓ fallback
site_json       → draft (builder working copy)
    ↓ fallback
layout_config   → legacy V1 format (pre-builder sites)
    ↓ fallback
"Coming Soon" page (no published_json AND is_published = false)
    ↓ fallback
Error page (no data at all)
```

**Coming Soon behavior:** If a site has a slug but `is_published = false` AND no `published_json`, visitors see a "Coming Soon" page instead of a blank site or error.

---

## Subdomain Routing (Future)

For `alexandjordan.dayof.love` style URLs:

**DNS requirement:**
- Wildcard record: `*.dayof.love → app CDN/host`

**Edge/middleware requirement:**
- Read `Host` header on every request
- Extract subdomain: `host.split('.')[0]` (if host is `*.dayof.love`)
- Lookup `wedding_sites` by `site_slug = subdomain`
- Serve the same public site rendering path

**Vercel implementation:**
```json
// vercel.json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "has": [{ "type": "host", "value": "(?<slug>[^.]+)\\.dayof\\.love" }],
      "destination": "/site/:slug/$1"
    }
  ]
}
```

**Netlify implementation:**
Use `_redirects` or `netlify.toml` with a `_redirects` wildcard rewrite rule that maps the Host header's first segment to `/site/<slug>`.

No database schema changes are needed — the existing `site_slug` column handles both path-based and subdomain-based routing.

---

## Custom Domains (Future)

For couples who want `alexandjordan.com` to show their wedding site:

**Required additions:**
1. Add `custom_domain` column to `wedding_sites` (nullable text, unique)
2. Couple adds a CNAME: `alexandjordan.com → app.dayof.love` (or Vercel/Netlify alias)
3. Platform verifies domain ownership (DNS TXT record or HTTP challenge)
4. Edge/middleware resolves by `custom_domain` instead of `site_slug` when `Host` doesn't match `*.dayof.love`

**Resolution priority:**
```
Custom domain match (wedding_sites.custom_domain = Host header)
    ↓ fallback
Subdomain match (wedding_sites.site_slug = subdomain)
    ↓ fallback
Path-based match (/site/<slug>)
```

**SSL:** Vercel and Netlify handle automatic SSL for custom domains via Let's Encrypt.

---

## Current Limitations

| Limitation | Impact | Resolution |
|------------|--------|------------|
| No slug redirect on change | Old URL 404s immediately | Future: store `previous_slugs[]` and issue 301 |
| No subdomain routing | Sites accessible at path only | Future: edge rewrite rules |
| No custom domain support | Couples cannot use personal domains | Future: `custom_domain` column + DNS verification |
| `is_published` is app-layer only | Draft content readable via direct API if slug is known | Accepted design tradeoff for draft sharing |
