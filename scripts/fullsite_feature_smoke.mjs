import { chromium } from 'playwright';
import fs from 'node:fs/promises';

const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:4173';
const OUT_JSON = 'tmp/fullsite-feature-smoke-results.json';

const publicRoutes = [
  '/', '/product', '/templates', '/builder-v2-lab', '/variant-preview-capture', '/template-scroll-capture',
  '/rsvp', '/events', '/features/guests', '/features/rsvp', '/features/messaging', '/features/travel',
  '/features/registry', '/features/seating', '/login', '/signup', '/site/alex-jordan-demo',
  '/vault/alex-jordan-demo', '/vault/alex-jordan-demo/2026', '/photos/upload', '/guest-contact/demo-token'
];

const protectedRoutes = [
  '/dashboard', '/dashboard/overview', '/dashboard/builder', '/dashboard/builder-guide', '/dashboard/guests', '/dashboard/itinerary',
  '/dashboard/planning', '/dashboard/seating', '/dashboard/seating-lookup', '/dashboard/vault',
  '/dashboard/photos', '/dashboard/registry', '/dashboard/settings', '/dashboard/messages',
  '/dashboard/rsvp-board', '/dashboard/coordinator', '/admin/errors', '/builder', '/builder-guide', '/setup', '/setup/names',
  '/onboarding', '/onboarding/status', '/onboarding/celebration', '/onboarding/quick-start', '/onboarding/guided',
  '/payment-required', '/payment/success'
];

const keywordChecks = [
  { route: '/template-scroll-capture?templateId=full-featured-classic', name: 'RSVP section', any: ['rsvp', 'respond', 'attending'] },
  { route: '/template-scroll-capture?templateId=full-featured-classic', name: 'Registry section', any: ['registry', 'gift'] },
  { route: '/template-scroll-capture?templateId=full-featured-classic', name: 'Schedule section', any: ['schedule', 'itinerary', 'timeline'] },
  { route: '/template-scroll-capture?templateId=full-featured-classic', name: 'Travel section', any: ['travel', 'accommodations', 'hotel'] },
  { route: '/template-scroll-capture?templateId=full-featured-classic', name: 'Venue section', any: ['venue', 'location', 'where'] },
];

function sanitizeError(error) {
  return String(error || '').slice(0, 500);
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const runtimeErrors = [];
  const consoleErrors = [];

  page.on('pageerror', (err) => {
    runtimeErrors.push({ route: page.url(), error: sanitizeError(err?.message || err) });
  });
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push({ route: page.url(), text: sanitizeError(msg.text()) });
    }
  });

  const results = [];

  for (const route of publicRoutes) {
    const item = { area: 'public-route', route };
    try {
      const resp = await page.goto(`${BASE_URL}${route}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(500);
      item.statusCode = resp?.status?.() ?? null;
      item.finalUrl = page.url();
      item.title = await page.title();
      item.pass = !!item.statusCode && item.statusCode < 500;
      if (!item.pass) item.failure = `HTTP ${item.statusCode}`;
    } catch (e) {
      item.pass = false;
      item.failure = sanitizeError(e?.message || e);
    }
    results.push(item);
  }

  // Template gallery -> template detail smoke
  const templateFlow = { area: 'template-flow', route: '/templates', pass: false };
  try {
    await page.goto(`${BASE_URL}/templates`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(800);
    const link = page.locator('a[href^="/templates/"]').first();
    if (await link.count()) {
      await link.click();
      await page.waitForTimeout(800);
      templateFlow.finalUrl = page.url();
      templateFlow.pass = /\/templates\/.+/.test(new URL(page.url()).pathname);
      if (!templateFlow.pass) templateFlow.failure = 'Did not navigate to template detail';
    } else {
      templateFlow.failure = 'No template detail links found in gallery';
    }
  } catch (e) {
    templateFlow.failure = sanitizeError(e?.message || e);
  }
  results.push(templateFlow);

  for (const route of protectedRoutes) {
    const item = { area: 'protected-route', route };
    try {
      const resp = await page.goto(`${BASE_URL}${route}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(700);
      item.statusCode = resp?.status?.() ?? null;
      item.finalUrl = page.url();
      const finalPath = new URL(item.finalUrl).pathname;
      item.pass = finalPath === '/login' || finalPath === '/payment-required';
      if (!item.pass) item.failure = `Expected redirect to /login or /payment-required, got ${finalPath}`;
    } catch (e) {
      item.pass = false;
      item.failure = sanitizeError(e?.message || e);
    }
    results.push(item);
  }

  // Site/template content keyword assertions
  const bodyTextByRoute = new Map();
  for (const check of keywordChecks) {
    if (!bodyTextByRoute.has(check.route)) {
      await page.goto(`${BASE_URL}${check.route}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(1500);
      bodyTextByRoute.set(check.route, (await page.locator('body').innerText()).toLowerCase());
    }

    const routeBodyText = bodyTextByRoute.get(check.route) || '';
    const pass = check.any.some((kw) => routeBodyText.includes(kw));
    results.push({
      area: 'site-section-keyword',
      route: check.route,
      check: check.name,
      expectedAny: check.any,
      pass,
      failure: pass ? undefined : `None of [${check.any.join(', ')}] found in body text`,
    });
  }

  // Basic utility check: wildcard route redirects to /
  const wildcard = { area: 'routing-utility', route: '/definitely-not-real-route-123' };
  try {
    await page.goto(`${BASE_URL}${wildcard.route}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(500);
    wildcard.finalUrl = page.url();
    wildcard.pass = new URL(wildcard.finalUrl).pathname === '/';
    if (!wildcard.pass) wildcard.failure = `Expected wildcard redirect to /, got ${wildcard.finalUrl}`;
  } catch (e) {
    wildcard.pass = false;
    wildcard.failure = sanitizeError(e?.message || e);
  }
  results.push(wildcard);

  const summary = {
    baseUrl: BASE_URL,
    totalChecks: results.length,
    passed: results.filter((r) => r.pass).length,
    failed: results.filter((r) => !r.pass).length,
    consoleErrorCount: consoleErrors.length,
    runtimeErrorCount: runtimeErrors.length,
    startedAt: new Date().toISOString()
  };

  const output = { summary, results, consoleErrors, runtimeErrors };
  await fs.mkdir('tmp', { recursive: true });
  await fs.writeFile(OUT_JSON, JSON.stringify(output, null, 2));

  console.log(JSON.stringify(summary, null, 2));
  console.log(`Wrote ${OUT_JSON}`);

  await browser.close();

  if (summary.failed > 0 || summary.consoleErrorCount > 0 || summary.runtimeErrorCount > 0) {
    process.exitCode = 1;
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
