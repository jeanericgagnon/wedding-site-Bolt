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

const baseUrl = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:5177';
const email = process.env.V1_OWNER_EMAIL || 'test@gmail.com';
const password = process.env.V1_OWNER_PASSWORD || '12345678';
const siteSlug = process.env.V1_PROOF_SITE_SLUG || 'maya-and-leo';
const runId = process.env.RUNTIME_WORDING_RUN_ID || String(Date.now());
const proofDir = join(process.cwd(), 'docs', 'proof-screenshots', '2026-05-01', `runtime-wording-truth-${runId}`);
mkdirSync(proofDir, { recursive: true });

const forbiddenPatterns = [
  /AI setup/i,
  /AI-guided/i,
  /AI-led/i,
  /AI-assisted setup/i,
  /the AI still wants/i,
  /real product brain/i,
  /starter wedding site is ready/i,
  /ready to launch/i,
  /OpenAI/i,
  /GPT[-\s]?\d/i,
  /token spend/i,
  /AI spend/i,
  /provider model/i,
  /model:/i,
];

const publicRoutes = [
  { label: 'home', path: '/' },
  { label: 'product', path: '/product' },
  { label: 'trust', path: '/trust' },
  { label: 'signup', path: '/signup' },
  { label: 'quick-start-bypass', path: '/onboarding/quick-start?bypassPayment=1&wordingTruth=1' },
  { label: 'public-site', path: `/site/${siteSlug}?wordingTruth=1` },
  { label: 'rsvp-entry', path: '/rsvp?wordingTruth=1' },
  { label: 'event-hub', path: `/event/${siteSlug}?wordingTruth=1` },
];

const authenticatedRoutes = [
  { label: 'overview', path: '/dashboard/overview?bypassPayment=1&wordingTruth=1' },
  { label: 'builder', path: '/dashboard/builder?bypassPayment=1&wordingTruth=1' },
  { label: 'settings', path: '/dashboard/settings?bypassPayment=1&wordingTruth=1' },
  { label: 'messages', path: '/dashboard/messages?bypassPayment=1&wordingTruth=1' },
  { label: 'planning', path: '/dashboard/planning?bypassPayment=1&wordingTruth=1' },
  { label: 'guests', path: '/dashboard/guests?bypassPayment=1&wordingTruth=1' },
  { label: 'photos', path: '/dashboard/photos?bypassPayment=1&wordingTruth=1' },
  { label: 'registry', path: '/dashboard/registry?bypassPayment=1&wordingTruth=1' },
  { label: 'vault', path: '/dashboard/vault?bypassPayment=1&wordingTruth=1' },
  { label: 'coordinator', path: '/dashboard/coordinator?bypassPayment=1&wordingTruth=1' },
];

async function inspectRoute(page, route, index) {
  await page.goto(route.path, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => undefined);
  const bodyText = await page.locator('body').innerText().catch(() => '');
  const headings = await page.locator('h1,h2,h3').evaluateAll((nodes) =>
    nodes.map((node) => node.textContent?.trim() || '').filter(Boolean).slice(0, 8),
  ).catch(() => []);
  const matches = forbiddenPatterns
    .filter((pattern) => pattern.test(bodyText))
    .map((pattern) => String(pattern));
  const fileName = `${String(index + 1).padStart(2, '0')}-${route.label}.png`;
  const screenshotPath = join(proofDir, fileName);
  await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => undefined);
  return {
    label: route.label,
    requestedPath: route.path,
    finalUrl: page.url(),
    headings,
    forbiddenMatches: matches,
    screenshot: screenshotPath,
  };
}

const browser = await chromium.launch();
const page = await browser.newPage({ baseURL: baseUrl, viewport: { width: 1440, height: 1100 } });
const results = [];

try {
  for (const route of publicRoutes) {
    results.push(await inspectRoute(page, route, results.length));
  }

  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.getByPlaceholder('your@email.com').fill(email);
  await page.getByPlaceholder('Enter your password').fill(password);
  await page.getByRole('button', { name: 'Sign In' }).click();
  await page.waitForURL(/\/dashboard/, { timeout: 30_000 });

  for (const route of authenticatedRoutes) {
    results.push(await inspectRoute(page, route, results.length));
  }
} finally {
  await browser.close();
}

const failures = results.filter((result) => result.forbiddenMatches.length > 0);
const markdown = [
  '# Runtime Wording Truth Proof',
  '',
  `Generated: ${new Date().toISOString()}`,
  `Base URL: ${baseUrl}`,
  `Proof site: ${siteSlug}`,
  `Status: ${failures.length === 0 ? 'PASS' : 'FAIL'}`,
  '',
  'Forbidden wording checked: AI setup hype, provider/model names, token or AI spend, and premature launch-ready claims.',
  '',
  ...results.map((result) => [
    `## ${result.label}`,
    '',
    `Requested: ${result.requestedPath}`,
    `Final URL: ${result.finalUrl}`,
    `Screenshot: ${result.screenshot}`,
    `Headings: ${result.headings.length ? result.headings.join(' | ') : 'none captured'}`,
    `Forbidden matches: ${result.forbiddenMatches.length ? result.forbiddenMatches.join(', ') : 'none'}`,
    '',
  ].join('\n')),
].join('\n');

const notesPath = join(proofDir, 'notes.md');
writeFileSync(notesPath, markdown);

console.log(JSON.stringify({
  ok: failures.length === 0,
  proofDir,
  notesPath,
  checkedRoutes: results.length,
  failures,
}, null, 2));

if (failures.length > 0) {
  process.exitCode = 1;
}
