import { chromium } from '@playwright/test';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

function envValue(key, fallback = '') {
  if (process.env[key]) return String(process.env[key]);
  for (const file of ['.env.local', '.env']) {
    const path = join(process.cwd(), file);
    if (!existsSync(path)) continue;
    const match = readFileSync(path, 'utf8')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#'))
      .find((line) => line.startsWith(`${key}=`));
    if (match) return match.slice(key.length + 1).trim().replace(/^['"]|['"]$/g, '');
  }
  return fallback;
}

const baseUrl = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:5173';
const email = process.env.V1_OWNER_EMAIL || 'test@gmail.com';
const password = process.env.V1_OWNER_PASSWORD || '12345678';
const siteSlug = process.env.V1_PROOF_SITE_SLUG || 'maya-and-leo';
const runId = process.env.CANONICAL_PROOF_RUN_ID || String(Date.now());
const proofDir = join(process.cwd(), 'docs', 'proof-screenshots', '2026-05-01', `canonical-couple-path-${runId}`);
mkdirSync(proofDir, { recursive: true });

const notes = [];

async function capture(page, step, path, waitFor) {
  await page.goto(path, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  if (waitFor) await waitFor(page);
  const fileName = `${String(notes.length + 1).padStart(2, '0')}-${step}.png`;
  const screenshotPath = join(proofDir, fileName);
  await page.screenshot({ path: screenshotPath, fullPage: true });
  notes.push({
    step,
    url: page.url(),
    screenshot: screenshotPath,
    title: await page.title(),
  });
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 }, baseURL: baseUrl });
const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, baseURL: baseUrl, isMobile: true });
await Promise.all([page, mobile].map((target) => target.addInitScript(() => {
  window.localStorage.setItem('builder_coachmarks_seen_v1', '1');
})));

async function waitPastFullPageLoading(page) {
  await page.waitForFunction(() => {
    const text = document.body?.innerText?.trim() || '';
    const hasSkeleton = Boolean(document.querySelector('.animate-pulse'));
    const stillLoading = /^Loading(?:\.\.\.| your site editor\.\.\.)?$/i.test(text);
    return text.length > 0 && !stillLoading && !hasSkeleton;
  }, { timeout: 25_000 });
}

try {
  await capture(page, 'home', '/', async (p) => {
    await p.locator('main, body').first().waitFor({ timeout: 15_000 });
  });
  await capture(page, 'signup', '/signup', async (p) => {
    await p.locator('main, body').first().waitFor({ timeout: 15_000 });
  });
  await capture(page, 'quick-start-bypass', '/onboarding/quick-start?bypassPayment=1&canonicalProof=1', async (p) => {
    await p.waitForLoadState('domcontentloaded');
    await Promise.race([
      p.getByRole('heading', { name: /who.s getting married/i }).waitFor({ timeout: 15_000 }),
      p.getByRole('heading', { name: /welcome back/i }).waitFor({ timeout: 15_000 }),
    ]);
  });
  await capture(page, 'login', '/login', async (p) => {
    await p.getByRole('heading', { name: /welcome back/i }).waitFor({ timeout: 15_000 });
  });

  await page.getByPlaceholder('your@email.com').fill(email);
  await page.getByPlaceholder('Enter your password').fill(password);
  await page.getByRole('button', { name: 'Sign In' }).click();
  await page.waitForURL(/\/dashboard/, { timeout: 30_000 });
  const dashboardPath = '/dashboard/overview?bypassPayment=1&canonicalProof=1';
  await capture(page, 'dashboard-overview', dashboardPath, async (p) => {
    await waitPastFullPageLoading(p);
    await Promise.race([
      p.getByText('Worth doing next').first().waitFor({ timeout: 25_000 }),
      p.getByText('Couldn’t load overview right now').waitFor({ timeout: 25_000 }),
    ]);
  });
  await capture(page, 'builder', '/dashboard/builder?bypassPayment=1&canonicalProof=1', async (p) => {
    await waitPastFullPageLoading(p);
    await Promise.race([
      p.getByText(/Site sections|Website sections/i).waitFor({ timeout: 25_000 }),
      p.getByText('Couldn’t load your site editor').waitFor({ timeout: 25_000 }),
    ]);
    await p.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => undefined);
  });
  await capture(page, 'public-site', `/site/${siteSlug}?canonicalProof=1`, async (p) => {
    await p.locator('body').waitFor({ timeout: 20_000 });
    await p.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => undefined);
  });
  await capture(page, 'rsvp-entry', '/rsvp?canonicalProof=1', async (p) => {
    await p.getByText(/invitation code/i).first().waitFor({ timeout: 20_000 });
  });

  await capture(mobile, 'mobile-public-site', `/site/${siteSlug}?canonicalProof=1`, async (p) => {
    await p.locator('body').waitFor({ timeout: 20_000 });
    await p.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => undefined);
  });
  await capture(mobile, 'mobile-event-hub', `/event/${siteSlug}?canonicalProof=1`, async (p) => {
    await p.getByRole('link', { name: /RSVP/i }).waitFor({ timeout: 20_000 });
  });

  const markdown = [
    `# Canonical Couple Path Proof`,
    ``,
    `Generated: ${new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Los_Angeles',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZoneName: 'short',
    }).format(new Date()).replace(/\bPST\b|\bPDT\b/, 'PT')}`,
    `Base URL: ${baseUrl}`,
    `Proof site: ${siteSlug}`,
    ``,
    ...notes.map((note, index) => [
      `## ${index + 1}. ${note.step}`,
      ``,
      `URL: ${note.url}`,
      `Screenshot: ${note.screenshot}`,
      ``,
    ].join('\n')),
  ].join('\n');
  const notesPath = join(proofDir, 'route-notes.md');
  writeFileSync(notesPath, markdown);
  console.log(JSON.stringify({ ok: true, proofDir, notesPath, screenshots: notes.length }, null, 2));
} finally {
  await browser.close();
}
