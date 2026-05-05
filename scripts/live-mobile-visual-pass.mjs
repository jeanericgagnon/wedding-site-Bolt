import { chromium, devices } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const runId = String(Date.now());
const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'https://dayof.love';
const email = process.env.V1_OWNER_EMAIL || 'test@gmail.com';
const password = process.env.V1_OWNER_PASSWORD || '12345678';
const outDir = join(process.cwd(), 'test-results', 'live-mobile-visual-pass', runId);
const latestPath = join(process.cwd(), 'test-results', 'live-mobile-visual-pass', 'latest.json');

const noisyConsoleRe = /ResizeObserver loop|net::ERR_ABORTED|NO_COLOR|favicon|Failed to load resource: the server responded with a status of 404/;
const safeTapTextRe = /\b(menu|close|show|hide|details|filter|preview|view|rsvp|photos|registry|schedule|travel|story|faq)\b/i;
const unsafeTapTextRe = /\b(delete|remove|send|sms|email|invite|purchase|checkout|pay|confirm|revoke|flag|unflag|archive|publish|save|sign out|logout|import|upload|download|export|copy|google|venmo|paypal)\b/i;

const mobileProfiles = [
  {
    name: 'iphone-13',
    viewport: { width: 390, height: 844 },
    userAgent: devices['iPhone 13'].userAgent,
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
  },
  {
    name: 'narrow-android',
    viewport: { width: 360, height: 740 },
    userAgent: devices['Pixel 5'].userAgent,
    deviceScaleFactor: 2.75,
    isMobile: true,
    hasTouch: true,
  },
];

const publicRoutes = [
  '/',
  '/product',
  '/templates',
  '/trust',
  '/features/guests',
  '/features/rsvp',
  '/features/messaging',
  '/features/registry',
  '/features/seating',
  '/site/maya-and-leo',
  '/event/maya-and-leo',
  '/event/maya-and-leo/recap',
  '/guestbook/maya-and-leo',
  '/photos/upload?site=maya-and-leo&hub=1',
  '/vault/maya-and-leo?vaultQaOpen=1',
  '/rsvp',
];

const ownerRoutes = [
  '/dashboard/overview?bypassPayment=1',
  '/dashboard/guests?bypassPayment=1',
  '/dashboard/itinerary?bypassPayment=1',
  '/dashboard/photos?bypassPayment=1',
  '/dashboard/messages?bypassPayment=1',
  '/dashboard/planning?bypassPayment=1',
  '/dashboard/seating?bypassPayment=1',
  '/dashboard/registry?bypassPayment=1',
  '/dashboard/settings?bypassPayment=1',
  '/dashboard/builder?bypassPayment=1',
];

const slugFor = (profile, route) => `${profile}-${route.replace(/^\/$/, 'home').replace(/^\//, '').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').slice(0, 90)}`;

function classifyTapSkip(label, reason = '') {
  const text = `${label} ${reason}`.toLowerCase();
  if (/not visible|not enabled|element is outside|element is not attached|intercepts pointer|timeout/.test(text)) return 'hidden-or-transient-control';
  if (unsafeTapTextRe.test(label)) return 'guarded-or-destructive-control';
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

function addIssue(result, issue) {
  result.issues.push({
    ...issue,
    text: String(issue.text || '').slice(0, 800),
  });
}

async function login(page, result, profileName) {
  await page.goto(`${baseURL}/login`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  await page.getByPlaceholder('your@email.com').fill(email);
  await page.getByPlaceholder('Enter your password').fill(password);
  await page.getByRole('button', { name: 'Sign In' }).click();
  await page.waitForURL(/\/dashboard/, { timeout: 30_000 });
  result.auth.push({ profile: profileName, status: 'logged-in' });
}

async function collectLayoutState(page) {
  return page.evaluate(() => {
    const doc = document.documentElement;
    const viewportWidth = doc.clientWidth;
    const overflow = Math.max(0, doc.scrollWidth - viewportWidth);
    const brokenImages = Array.from(document.images)
      .filter((image) => image.complete && image.naturalWidth === 0)
      .map((image) => ({
        alt: image.getAttribute('alt') || '',
        src: image.currentSrc || image.src || '',
      }))
      .slice(0, 8);
    const wideElements = Array.from(document.body.querySelectorAll('body *'))
      .map((element) => {
        const rect = element.getBoundingClientRect();
        const style = window.getComputedStyle(element);
        return {
          tag: element.tagName.toLowerCase(),
          className: String(element.getAttribute('class') || '').slice(0, 120),
          text: String(element.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 120),
          width: Math.round(rect.width),
          left: Math.round(rect.left),
          right: Math.round(rect.right),
          display: style.display,
          position: style.position,
        };
      })
      .filter((item) => item.display !== 'none' && item.width > viewportWidth + 14 && item.right > viewportWidth + 8)
      .slice(0, 8);
    const bodyInnerText = (document.body.innerText || '').replace(/\s+/g, ' ').trim();
    const bodyTextContent = (document.body.textContent || '').replace(/\s+/g, ' ').trim();
    const bodyText = bodyInnerText || bodyTextContent;
    return {
      viewportWidth,
      scrollWidth: doc.scrollWidth,
      overflow,
      brokenImages,
      wideElements,
      bodyTextLength: bodyText.length,
      bodyTextPreview: bodyText.slice(0, 220),
    };
  });
}

async function safeMobileTaps(page, result, route, profileName) {
  const candidates = (await page.locator('button:not([disabled]), [role="button"], a[href]').evaluateAll((elements) => elements
    .map((element, index) => {
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      const text = [
        element.getAttribute('aria-label') || '',
        element.textContent || '',
        element.getAttribute('href') || '',
      ].join(' ').replace(/\s+/g, ' ').trim();
      return {
        index,
        text,
        href: element.getAttribute('href') || '',
        visible: rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none',
      };
    })
    .filter((item) => item.visible && item.text)))
    .filter((item) => safeTapTextRe.test(item.text) && !unsafeTapTextRe.test(item.text))
    .slice(0, 3);

  for (const candidate of candidates) {
    try {
      const beforeUrl = page.url();
      await page.locator('button:not([disabled]), [role="button"], a[href]').nth(candidate.index).click({ timeout: 2_500 });
      result.taps.push({ profile: profileName, route, label: candidate.text.slice(0, 160) });
      await page.waitForTimeout(250);
      await page.keyboard.press('Escape').catch(() => {});
      if (page.url() !== beforeUrl) {
        await page.goto(`${baseURL}${route}`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
      }
    } catch (error) {
      const reason = error instanceof Error ? error.message.slice(0, 240) : String(error).slice(0, 240);
      result.tapSkips.push({
        profile: profileName,
        route,
        label: candidate.text.slice(0, 160),
        reason,
        classification: classifyTapSkip(candidate.text, reason),
      });
    }
  }
}

async function auditRoute(page, result, route, profileName, authenticated = false) {
  const url = `${baseURL}${route}`;
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  if (authenticated && /\/login/.test(page.url())) {
    await login(page, result, profileName);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  }
  await page.waitForLoadState('networkidle', { timeout: 12_000 }).catch(() => {});
  await page
    .waitForFunction(() => {
      const bodyInnerText = (document.body.innerText || '').replace(/\s+/g, ' ').trim();
      const bodyTextContent = (document.body.textContent || '').replace(/\s+/g, ' ').trim();
      return (bodyInnerText || bodyTextContent).length >= 80;
    }, { timeout: 5_000 })
    .catch(() => {});
  if (route.startsWith('/site/')) {
    await page
      .waitForFunction(() => !/^\s*Loading wedding site\.\.\.\s*$/.test(document.body.innerText || ''), { timeout: 15_000 })
      .catch(() => {});
  }
  const state = await collectLayoutState(page);
  const screenshotPath = join(outDir, `${slugFor(profileName, route)}.png`);
  await page.screenshot({ path: screenshotPath, fullPage: true });
  const routeResult = {
    profile: profileName,
    route,
    finalUrl: page.url(),
    title: await page.title().catch(() => ''),
    screenshotPath,
    ...state,
  };
  result.routes.push(routeResult);

  if (state.bodyTextLength < 80) {
    addIssue(result, { profile: profileName, route, kind: 'blank-or-too-little-content', text: state.bodyTextPreview });
  }
  if (state.overflow > 8) {
    addIssue(result, { profile: profileName, route, kind: 'horizontal-overflow', text: JSON.stringify({ overflow: state.overflow, wideElements: state.wideElements }) });
  }
  if (state.brokenImages.length > 0) {
    addIssue(result, { profile: profileName, route, kind: 'broken-images', text: JSON.stringify(state.brokenImages) });
  }
  await safeMobileTaps(page, result, route, profileName);
}

async function main() {
  mkdirSync(outDir, { recursive: true });
  mkdirSync(join(process.cwd(), 'test-results', 'live-mobile-visual-pass'), { recursive: true });

  const result = {
    runId,
    baseURL,
    startedAt: new Date().toISOString(),
    finishedAt: '',
    profiles: mobileProfiles.map((profile) => profile.name),
    routes: [],
    taps: [],
    tapSkips: [],
    auth: [],
    issues: [],
    console: [],
    failedRequests: [],
  };

  const browser = await chromium.launch({ headless: true });
  try {
    for (const profile of mobileProfiles) {
      const context = await browser.newContext({
        viewport: profile.viewport,
        userAgent: profile.userAgent,
        deviceScaleFactor: profile.deviceScaleFactor,
        isMobile: profile.isMobile,
        hasTouch: profile.hasTouch,
      });
      const page = await context.newPage();
      page.on('console', (message) => {
        if (message.type() !== 'error') return;
        const text = message.text();
        if (noisyConsoleRe.test(text)) return;
        result.console.push({ profile: profile.name, route: page.url().replace(baseURL, '') || page.url(), text: text.slice(0, 800) });
      });
      page.on('pageerror', (error) => {
        addIssue(result, { profile: profile.name, route: page.url().replace(baseURL, '') || page.url(), kind: 'pageerror', text: error.message });
      });
      page.on('requestfailed', (request) => {
        const failure = request.failure();
        const text = `${request.method()} ${request.url()} ${failure?.errorText || ''}`;
        if (noisyConsoleRe.test(text)) return;
        result.failedRequests.push({ profile: profile.name, route: page.url().replace(baseURL, '') || page.url(), text: text.slice(0, 800) });
      });
      page.on('response', (response) => {
        const status = response.status();
        if (status < 500) return;
        result.failedRequests.push({ profile: profile.name, route: page.url().replace(baseURL, '') || page.url(), text: `${status} ${response.url()}`.slice(0, 800) });
      });

      for (const route of publicRoutes) {
        await auditRoute(page, result, route, profile.name, false);
      }

      await login(page, result, profile.name);
      for (const route of ownerRoutes) {
        await auditRoute(page, result, route, profile.name, true);
      }

      await context.close();
    }
  } finally {
    await browser.close();
  }

  for (const entry of result.console) {
    addIssue(result, { profile: entry.profile, route: entry.route, kind: 'console-error', text: entry.text });
  }
  for (const entry of result.failedRequests) {
    addIssue(result, { profile: entry.profile, route: entry.route, kind: 'failed-request', text: entry.text });
  }
  result.finishedAt = new Date().toISOString();
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, 'result.json'), `${JSON.stringify(result, null, 2)}\n`);
  mkdirSync(join(process.cwd(), 'test-results', 'live-mobile-visual-pass'), { recursive: true });
  writeFileSync(latestPath, `${JSON.stringify(result, null, 2)}\n`);

  const summary = {
    runId,
    profiles: result.profiles,
    routes: result.routes.length,
    taps: result.taps.length,
    tapSkips: result.tapSkips.length,
    tapSkipSummary: summarizeSkips(result.tapSkips),
    issues: result.issues.length,
    outDir,
    latestPath,
  };
  console.log(JSON.stringify(summary, null, 2));
  if (result.issues.length > 0) {
    console.error(JSON.stringify(result.issues.slice(0, 12), null, 2));
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
