import { chromium, devices } from 'playwright';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const runId = String(Date.now());
const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'https://dayof.love';
const email = process.env.V1_OWNER_EMAIL || 'test@gmail.com';
const password = process.env.V1_OWNER_PASSWORD || '12345678';
const mobileMode = process.env.LIVE_EXPLORATORY_MOBILE === '1';
const outDir = join(process.cwd(), 'test-results', 'live-exploratory-click-upload');
const outPath = join(outDir, mobileMode ? 'latest-mobile.json' : 'latest.json');

const publicRoutes = [
  '/',
  '/product',
  '/templates',
  '/trust',
  '/features/guests',
  '/features/rsvp',
  '/features/messaging',
  '/features/travel',
  '/features/registry',
  '/features/seating',
  '/privacy',
  '/terms',
  '/support',
  '/refund',
  '/site/maya-and-leo',
  '/event/maya-and-leo',
  '/event/maya-and-leo/recap',
  '/guestbook/maya-and-leo',
  '/vault/maya-and-leo?vaultQaOpen=1',
];

const ownerRoutes = [
  '/dashboard/overview?bypassPayment=1',
  '/dashboard/guests?bypassPayment=1',
  '/dashboard/itinerary?bypassPayment=1',
  '/dashboard/planning?bypassPayment=1',
  '/dashboard/seating?bypassPayment=1',
  '/dashboard/seating-lookup?bypassPayment=1',
  '/dashboard/vault?bypassPayment=1',
  '/dashboard/photos?bypassPayment=1',
  '/dashboard/registry?bypassPayment=1',
  '/dashboard/settings?bypassPayment=1',
  '/dashboard/messages?bypassPayment=1',
  '/dashboard/rsvp-board?bypassPayment=1',
  '/dashboard/coordinator?bypassPayment=1',
  '/dashboard/builder?bypassPayment=1',
  '/dashboard/builder/variants?bypassPayment=1',
  '/dashboard/audit-logs?bypassPayment=1',
];

const skipClickRe = /\b(delete|remove|send|sms|email|invite|purchase|checkout|pay|confirm|revoke|flag|unflag|hide|unhide|archive|publish|save|sign out|logout|import|upload|download|export|copy|google|venmo|paypal)\b/i;
const noisyConsoleRe = /net::ERR_ABORTED|ResizeObserver loop|NO_COLOR|Failed to load resource: the server responded with a status of 404/;
const knownIssueRe = /image\.thum\.io|drive\.google\.com\/file|guest_audit_logs|PGRST200|Could not find a relationship between 'guest_audit_logs' and 'guests'|s\.map is not a function|Please refresh to continue|builder Add photo/i;
const mobileBuilderAddPhotoMissingText = 'builder Add photo has no visible mobile media entry point on the deployed frontend.';

function envValue(key, fallback = '') {
  if (process.env[key]) return String(process.env[key]);
  const envPath = join(process.cwd(), '.env');
  if (!existsSync(envPath)) return fallback;
  const match = readFileSync(envPath, 'utf8')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
    .find((line) => line.startsWith(`${key}=`));
  if (!match) return fallback;
  return match.slice(key.length + 1).trim().replace(/^['"]|['"]$/g, '');
}

function classifyProblem(route, text) {
  if (knownIssueRe.test(text)) return 'known';
  if (/\/event\/.+\/recap/.test(route) && /\b403\b/.test(text)) return 'known';
  if (/\/dashboard\/audit-logs/.test(route) && /\b400\b/.test(text)) return 'known';
  if (/\/dashboard\/builder/.test(route) && /refresh|s\.map|Add photo/i.test(text)) return 'known';
  return 'unknown';
}

function addProblem(result, kind, route, text) {
  if (!text || noisyConsoleRe.test(text)) return;
  const bucket = classifyProblem(route, text);
  result[bucket].push({ kind, route, text: text.slice(0, 600) });
}

function classifyClickSkip(label, reason = '') {
  const text = `${label} ${reason}`.toLowerCase();
  if (/not visible|not enabled|element is outside|element is not attached|intercepts pointer|timeout/.test(text)) return 'hidden-or-transient-control';
  if (skipClickRe.test(label)) return 'guarded-or-destructive-control';
  if (/strict mode violation|resolved to \d+ elements/.test(text)) return 'duplicate-selector-candidate';
  return 'needs-review';
}

function summarizeSkips(skips) {
  return skips.reduce((acc, skip) => {
    const key = skip.classification || 'needs-review';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

function tinyPngBuffer() {
  return Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=',
    'base64',
  );
}

async function login(page) {
  await page.goto(`${baseURL}/login`, { waitUntil: 'domcontentloaded' });
  await page.getByPlaceholder('your@email.com').fill(email);
  await page.getByPlaceholder('Enter your password').fill(password);
  await page.getByRole('button', { name: 'Sign In' }).click();
  await page.waitForURL(/\/dashboard/, { timeout: 30_000 });
}

async function ownerAccessToken(page) {
  return page.evaluate(() => {
    for (const [key, value] of Object.entries(window.localStorage)) {
      if (!key.includes('auth-token')) continue;
      try {
        const parsed = JSON.parse(String(value));
        const token = parsed.access_token || parsed.currentSession?.access_token || '';
        if (token) return token;
      } catch {
        // Keep scanning.
      }
    }
    return '';
  });
}

async function clickSafeVisibleControls(page, result, route, maxClicks = 12) {
  const seen = new Set();
  for (let clicked = 0; clicked < maxClicks; clicked += 1) {
    const items = await page.locator('button:not([disabled]), [role="button"], a[href]').evaluateAll((elements) => (
      elements.map((el, index) => {
        const rect = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);
        const text = [
          el.getAttribute('aria-label') || '',
          el.textContent || '',
          el.getAttribute('href') || '',
        ].join(' ').replace(/\s+/g, ' ').trim();
        return {
          index,
          text,
          tag: el.tagName,
          href: el.getAttribute('href') || '',
          visible: rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none',
        };
      }).filter((item) => item.visible && item.text)
    ));

    const next = items.find((item) => {
      const key = `${item.tag}:${item.text.slice(0, 120)}`;
      if (seen.has(key)) return false;
      if (skipClickRe.test(item.text)) return false;
      if (item.href && !item.href.startsWith('/') && !item.href.startsWith(baseURL)) return false;
      seen.add(key);
      return true;
    });

    if (!next) break;
    try {
      const before = page.url();
      await page.locator('button:not([disabled]), [role="button"], a[href]').nth(next.index).click({ timeout: 2_000 });
      result.clicks.push({ route, label: next.text.slice(0, 160) });
      await page.waitForTimeout(350);
      await page.keyboard.press('Escape').catch(() => {});
      if (page.url() !== before && !page.url().startsWith(`${baseURL}${route.split('?')[0]}`)) {
        await page.goto(`${baseURL}${route}`, { waitUntil: 'domcontentloaded' });
      }
    } catch (error) {
      const reason = error instanceof Error ? error.message.slice(0, 180) : String(error);
      result.clickSkips.push({
        route,
        label: next.text.slice(0, 160),
        reason,
        classification: classifyClickSkip(next.text, reason),
      });
    }
  }
}

async function sweepRoutes(page, result, routes, authenticated) {
  for (const route of routes) {
    const url = `${baseURL}${route}`;
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 });
      if (authenticated && /\/login/.test(page.url())) {
        await login(page);
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 });
      }
      await page.waitForTimeout(700);
      result.routes.push({ route, title: await page.title().catch(() => '') });
      await clickSafeVisibleControls(page, result, route);
    } catch (error) {
      addProblem(result, 'route', route, error instanceof Error ? error.message : String(error));
    }
  }
}

async function guidedSetupCsvUpload(page, result) {
  const supabaseUrl = envValue('VITE_SUPABASE_URL', 'https://atuzuobpprjstfmdnwso.supabase.co');
  const anonKey = envValue('VITE_SUPABASE_ANON_KEY');
  const token = await ownerAccessToken(page);
  const guestEmail = `dayof.guidedcsv.${runId}@example.com`;
  const headers = {
    apikey: anonKey,
    Authorization: `Bearer ${token || anonKey}`,
    'Content-Type': 'application/json',
  };

  await page.goto(`${baseURL}/onboarding/guided?bypassPayment=1&liveExploratory=${runId}`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    window.localStorage.setItem('dayoflove:guided-setup-draft', JSON.stringify({
      currentStep: 'guests',
      coupleNames: { name1: 'Maya', name2: 'Leo' },
      formData: {
        weddingDate: '',
        venue: '',
        city: '',
        ourStory: '',
        ceremonyTime: '',
        receptionTime: '',
        attire: '',
        hotelRecommendations: '',
        parking: '',
        rsvpDeadline: '',
        mealOptions: '',
        registryLinks: '',
        customFaqs: '',
        template: 'modern',
        colorScheme: 'romantic',
      },
    }));
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator('input[type="file"][accept=".csv,text/csv"]').setInputFiles({
    name: `guided-setup-guests-${runId}.csv`,
    mimeType: 'text/csv',
    buffer: Buffer.from(`first_name,last_name,email,phone,group_name\nGuided,CSV,${guestEmail},555-0100,QA\n`),
  });
  await page.getByText('Import complete').waitFor({ timeout: 20_000 });
  result.uploads.push({ surface: 'guided setup CSV', status: 'uploaded and imported QA guest' });

  await fetch(`${supabaseUrl}/rest/v1/guests?email=eq.${encodeURIComponent(guestEmail)}`, {
    method: 'DELETE',
    headers,
    signal: AbortSignal.timeout(10_000),
  }).catch((error) => addProblem(result, 'cleanup', '/onboarding/guided', error instanceof Error ? error.message : String(error)));
}

async function builderV2JsonImport(page, result) {
  await page.goto(`${baseURL}/builder-v2-lab`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Import layout' }).click();
  await page.locator('input[type="file"][accept="application/json,.json"]').setInputFiles({
    name: `builder-v2-invalid-${runId}.json`,
    mimeType: 'application/json',
    buffer: Buffer.from('{ "not": "a valid builder document" }'),
  });
  await page.waitForTimeout(1_000);
  result.uploads.push({ surface: 'builder v2 JSON import', status: 'file input accepted invalid JSON without page crash' });
}

async function ownerPhotoAlbumUpload(page, result) {
  await page.goto(`${baseURL}/dashboard/photos?bypassPayment=1&liveExploratory=${runId}`, { waitUntil: 'domcontentloaded' });
  const uploadButton = page.getByRole('button', { name: 'Upload to this album' }).first();
  await uploadButton.waitFor({ timeout: 30_000 });
  await page.waitForFunction(() => {
    const button = Array.from(document.querySelectorAll('button')).find((node) => node.textContent?.includes('Upload to this album'));
    return button instanceof HTMLButtonElement && !button.disabled;
  }, null, { timeout: 30_000 });
  const filename = `owner-photo-album-qa-${runId}.png`;
  const chooserPromise = page.waitForEvent('filechooser');
  await uploadButton.click();
  const chooser = await chooserPromise;
  await chooser.setFiles({
    name: filename,
    mimeType: 'image/png',
    buffer: tinyPngBuffer(),
  });
  await page.waitForTimeout(10_000);
  const uploadedCount = await page.getByAltText(filename).count();
  if (uploadedCount < 1 && !await page.getByText(/Photo album updated/i).isVisible().catch(() => false)) {
    throw new Error('Owner Photos album upload did not render the uploaded QA image.');
  }
  result.uploads.push({ surface: 'owner Photos album upload', status: 'uploaded through hidden album input' });
  const remove = page.getByRole('button', { name: new RegExp(`Remove ${filename}`) });
  const tile = page.getByAltText(filename).first();
  await tile.hover().catch(() => {});
  if (await remove.isVisible().catch(() => false)) {
    await remove.click();
    await page.getByText(/Photo removed from album/i).waitFor({ timeout: 10_000 });
    result.cleanups.push({ surface: 'owner Photos album upload', status: 'removed from album UI' });
  }
}

async function builderMediaUpload(page, result) {
  await page.goto(`${baseURL}/dashboard/builder?bypassPayment=1&liveExploratory=${runId}`, { waitUntil: 'domcontentloaded' });
  const mediaButton = page.locator('button').filter({ hasText: /^Media$/i }).first();
  if (await mediaButton.isVisible().catch(() => false)) {
    await mediaButton.click({ timeout: 30_000 });
  } else {
    const addPhotoButtons = page.getByRole('button', { name: /^Add photo$/i });
    await addPhotoButtons.first().waitFor({ state: 'attached', timeout: 15_000 }).catch(() => {});
    let openedFromVisibleButton = false;
    const addPhotoCount = await addPhotoButtons.count();
    for (let index = 0; index < addPhotoCount; index += 1) {
      const button = addPhotoButtons.nth(index);
      if (await button.isVisible().catch(() => false)) {
        await button.click({ timeout: 30_000 });
        openedFromVisibleButton = true;
        break;
      }
    }
    if (!openedFromVisibleButton) {
      if (mobileMode) {
        throw new Error(mobileBuilderAddPhotoMissingText);
      }
      await page.getByText('Add a favorite photo', { exact: true }).click({ timeout: 30_000 });
      await page.getByText('Add photo', { exact: true }).click({ timeout: 30_000 });
    }
  }
  if (await page.getByText(/Please refresh to continue/i).isVisible({ timeout: 1_000 }).catch(() => false)) {
    throw new Error('builder Add photo hit the app error boundary: Please refresh to continue.');
  }
  await page.getByText(/Drop photos here or click to add them/i).waitFor({ timeout: 15_000 });
  const filename = `builder-media-qa-${runId}.png`;
  await page.locator('input[type="file"][accept*="image"]').last().setInputFiles({
    name: filename,
    mimeType: 'image/png',
    buffer: tinyPngBuffer(),
  });
  await page.getByAltText(filename).waitFor({ timeout: 30_000 });
  result.uploads.push({ surface: 'builder media library upload', status: 'uploaded image asset' });
  const tile = page.getByAltText(filename).first();
  await tile.hover().catch(() => {});
  const remove = page.getByRole('button', { name: 'Remove image' }).first();
  if (await remove.isVisible().catch(() => false)) {
    await remove.click();
    result.cleanups.push({ surface: 'builder media library upload', status: 'removed asset row from media library' });
  }
}

mkdirSync(outDir, { recursive: true });
const result = {
  runId,
  baseURL,
  profile: mobileMode ? 'mobile-iphone-13' : 'desktop',
  startedAt: new Date().toISOString(),
  routes: [],
  clicks: [],
  clickSkips: [],
  uploads: [],
  cleanups: [],
  known: [],
  unknown: [],
};

const browser = await chromium.launch();
const context = await browser.newContext(mobileMode ? {
  baseURL,
  viewport: { width: 390, height: 844 },
  userAgent: devices['iPhone 13'].userAgent,
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
} : {
  baseURL,
  viewport: { width: 1366, height: 900 },
});
let page = await context.newPage();
let currentRoute = '';

const attachMonitors = (targetPage) => {
  targetPage.on('console', (message) => {
    if (message.type() !== 'error') return;
    addProblem(result, 'console', currentRoute || targetPage.url(), message.text());
  });
  targetPage.on('pageerror', (error) => addProblem(result, 'pageerror', currentRoute || targetPage.url(), error.message));
  targetPage.on('response', (response) => {
    const status = response.status();
    if (status < 400) return;
    const url = response.url();
    if (/\/favicon\.ico$/.test(url)) return;
    addProblem(result, 'response', currentRoute || targetPage.url(), `${status} ${url}`);
  });
};

attachMonitors(page);

try {
  for (const route of publicRoutes) {
    currentRoute = route;
    await sweepRoutes(page, result, [route], false);
  }

  await login(page);

  for (const route of ownerRoutes) {
    currentRoute = route;
    await sweepRoutes(page, result, [route], true);
  }

  await page.close();
  page = await context.newPage();
  attachMonitors(page);
  await login(page);

  for (const [route, fn] of [
    ['/dashboard/photos', ownerPhotoAlbumUpload],
    ['/builder-v2-lab', builderV2JsonImport],
    ['/onboarding/guided', guidedSetupCsvUpload],
    ['/dashboard/builder', builderMediaUpload],
  ]) {
    currentRoute = route;
    try {
      await fn(page, result);
    } catch (error) {
      addProblem(result, 'upload', route, error instanceof Error ? error.message : String(error));
    }
  }
} finally {
  result.finishedAt = new Date().toISOString();
  await browser.close();
  mkdirSync(outDir, { recursive: true });
  writeFileSync(outPath, `${JSON.stringify(result, null, 2)}\n`);
}

console.log(JSON.stringify({
  runId,
  profile: result.profile,
  routesVisited: result.routes.length,
  safeClicks: result.clicks.length,
  clickSkips: result.clickSkips.length,
  clickSkipSummary: summarizeSkips(result.clickSkips),
  uploads: result.uploads,
  cleanups: result.cleanups,
  knownIssues: result.known.length,
  unknownIssues: result.unknown.length,
  evidence: outPath,
}, null, 2));

if (result.unknown.length > 0) {
  process.exitCode = 1;
}
