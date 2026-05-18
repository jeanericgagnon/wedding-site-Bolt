import { expect, test, type Page } from '@playwright/test';
import { signInAsOwner } from './liveOwnerSession';

test.use({ serviceWorkers: 'block' });

const PUBLIC_PATHS = [
  '/',
  '/product',
  '/templates',
  '/templates/luxury',
  '/features/guests',
  '/features/rsvp',
  '/features/messaging',
  '/features/travel',
  '/features/registry',
  '/features/seating',
  '/trust',
  '/support',
  '/refund',
  '/privacy',
  '/terms',
  '/login',
  '/signup',
  '/site/maya-and-leo',
  '/vendor/modern-events',
];

const GUEST_PATHS = [
  '/rsvp',
  '/rsvp/test-token',
  '/events',
  '/event/maya-and-leo',
  '/event/maya-and-leo/recap',
  '/photos/upload?site=maya-and-leo&hub=1&guestLang=es-MX',
  '/guest-contact/maya-and-leo',
  '/guestbook/maya-and-leo',
  '/vault/maya-and-leo',
  '/vault/maya-and-leo/2026',
  '/accept-collaborator-invite?token=test-token',
];

const DASHBOARD_PATHS = [
  '/dashboard',
  '/dashboard/overview',
  '/dashboard/tools',
  '/dashboard/builder',
  '/dashboard/builder/variants',
  '/dashboard/guests',
  '/dashboard/itinerary',
  '/dashboard/planning',
  '/dashboard/seating',
  '/dashboard/seating-lookup',
  '/dashboard/vault',
  '/dashboard/photos',
  '/dashboard/registry',
  '/dashboard/settings',
  '/dashboard/messages',
  '/dashboard/rsvp-board',
  '/dashboard/coordinator',
  '/dashboard/activity',
  '/dashboard/audit-logs',
  '/admin/errors',
  '/onboarding',
  '/onboarding/status',
  '/onboarding/quick-start',
  '/onboarding/guided',
  '/onboarding/celebration',
  '/setup',
  '/setup/celebration',
  '/vendor-templates',
  '/vendor-profile-v1',
  '/payment-required',
  '/payment/success',
];

const SKIP_CLICK = /why|features|pricing|view demo|start your wedding|delete|remove|discard|publish|unpublish|send now|send message|send update|start checkout|checkout|pay|sign out|log out|disconnect|revoke|archive|reset|clear all|drop|cancel subscription|invite|email invite|text guests|sms/i;
const EXPECTED_TEXT = /welcome back|not ready to view yet|this invite could not be found|checking invite|payment|refund|privacy|terms|wedding|dashboard|guests|registry|messages|photos|rsvp|vault|site|template|support|trust|sign/i;
const BAD_TEXT = /application error|something went wrong|please refresh to continue|undefined is not|cannot read properties|uncaught|stack trace|failed to fetch/i;

type AuditIssue = {
  area: string;
  path: string;
  issue: string;
  evidence: string;
};

function isIgnorableConsole(text: string) {
  return /favicon|manifest|analytics|accounts\.google\.com|accounts\.youtube\.com|Failed to load resource: the server responded with a status of (401|404)/i.test(text);
}

async function pageText(page: Page) {
  return (await page.locator('body').innerText({ timeout: 15_000 })).replace(/\s+/g, ' ').trim();
}

async function collectRouteIssues(page: Page, path: string, area: string): Promise<AuditIssue[]> {
  const issues: AuditIssue[] = [];
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const failedRequests: string[] = [];
  const badResponses: string[] = [];

  page.on('console', (message) => {
    if (message.type() !== 'error') return;
    const text = message.text();
    if (!isIgnorableConsole(text)) consoleErrors.push(text.slice(0, 260));
  });
  page.on('pageerror', (error) => pageErrors.push(String(error.message || error).slice(0, 260)));
  page.on('response', (response) => {
    const status = response.status();
    if (status >= 400 && status !== 401 && status !== 404) {
      badResponses.push(`${status} ${response.url()}`.slice(0, 320));
    }
  });
  page.on('requestfailed', (request) => {
    const resourceType = request.resourceType();
    if (!['document', 'script', 'xhr', 'fetch'].includes(resourceType)) return;
    const failure = request.failure()?.errorText ?? '';
    if (/ERR_ABORTED|NS_BINDING_ABORTED/i.test(failure)) return;
    failedRequests.push(`${resourceType} ${request.url()} ${failure}`.slice(0, 260));
  });

  const response = await page.goto(path, { waitUntil: 'domcontentloaded', timeout: 45_000 }).catch((error) => {
    issues.push({ area, path, issue: 'Route failed to load', evidence: String(error).slice(0, 320) });
    return null;
  });
  await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => undefined);
  await page.waitForTimeout(1200);

  if (response && response.status() >= 500) {
    issues.push({ area, path, issue: `Route returned HTTP ${response.status()}`, evidence: response.url() });
  }

  const text = await pageText(page).catch((error) => {
    issues.push({ area, path, issue: 'Could not read rendered page text', evidence: String(error).slice(0, 320) });
    return '';
  });

  if (text.length < 80 || !EXPECTED_TEXT.test(text)) {
    issues.push({ area, path, issue: 'Route rendered little or no recognizable launch content', evidence: text.slice(0, 320) });
  }

  if (BAD_TEXT.test(text)) {
    issues.push({ area, path, issue: 'Route shows user-facing error or raw runtime text', evidence: text.match(BAD_TEXT)?.[0] ?? text.slice(0, 220) });
  }

  const namelessControls = await page.locator('button:visible, a:visible').evaluateAll((elements) => elements
    .map((element, index) => ({
      index,
      tag: element.tagName.toLowerCase(),
      text: (element.textContent || '').replace(/\s+/g, ' ').trim(),
      aria: element.getAttribute('aria-label') || '',
      title: element.getAttribute('title') || '',
      href: element instanceof HTMLAnchorElement ? element.href : '',
      className: String(element.getAttribute('class') || '').slice(0, 160),
      html: String(element.outerHTML || '').replace(/\s+/g, ' ').slice(0, 280),
      nearby: String(element.parentElement?.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 220),
    }))
    .filter((item) => !item.text && !item.aria && !item.title)
    .slice(0, 8));

  for (const control of namelessControls) {
    issues.push({
      area,
      path,
      issue: 'Visible interactive control has no accessible name',
      evidence: `${control.tag}#${control.index}${control.href ? ` ${control.href}` : ''} nearby="${control.nearby}" class="${control.className}" html="${control.html}"`,
    });
  }

  const internalLinks = await page.locator('a[href]:visible').evaluateAll((anchors) => Array.from(new Set(anchors
    .map((anchor) => (anchor as HTMLAnchorElement).href)
    .filter((href) => {
      try {
        const url = new URL(href);
        return url.origin === window.location.origin && !url.hash;
      } catch {
        return false;
      }
    }))).slice(0, 10));

  for (const href of internalLinks) {
    const check = await page.request.get(href, { timeout: 15_000, failOnStatusCode: false }).catch((error) => error);
    if ('status' in check && check.status() >= 500) {
      issues.push({ area, path, issue: `Visible internal link returns HTTP ${check.status()}`, evidence: href });
    }
  }

  if (pageErrors.length) {
    issues.push({ area, path, issue: 'Runtime page error occurred', evidence: Array.from(new Set(pageErrors)).slice(0, 3).join(' | ') });
  }
  if (consoleErrors.length) {
    issues.push({ area, path, issue: 'Console error occurred', evidence: Array.from(new Set(consoleErrors)).slice(0, 3).join(' | ') });
  }
  if (failedRequests.length) {
    issues.push({ area, path, issue: 'Critical request failed', evidence: Array.from(new Set(failedRequests)).slice(0, 3).join(' | ') });
  }
  if (badResponses.length) {
    issues.push({ area, path, issue: 'HTTP error response occurred', evidence: Array.from(new Set(badResponses)).slice(0, 3).join(' | ') });
  }

  page.removeAllListeners('console');
  page.removeAllListeners('pageerror');
  page.removeAllListeners('requestfailed');
  page.removeAllListeners('response');
  return issues;
}

for (const path of PUBLIC_PATHS) {
  test(`public launch audit: ${path}`, async ({ page }) => {
    test.setTimeout(75_000);
    const issues = await collectRouteIssues(page, `${path}${path.includes('?') ? '&' : '?'}deepAudit=may17`, 'Public');
    if (issues.length) console.log(`DAYOF_DEEP_AUDIT_ROUTE_RESULT ${path} ` + JSON.stringify(issues, null, 2));
    expect(issues).toEqual([]);
  });
}

for (const path of GUEST_PATHS) {
  test(`guest launch audit: ${path}`, async ({ page }) => {
    test.setTimeout(75_000);
    const issues = await collectRouteIssues(page, `${path}${path.includes('?') ? '&' : '?'}deepAudit=may17`, 'Guest');
    if (issues.length) console.log(`DAYOF_DEEP_AUDIT_ROUTE_RESULT ${path} ` + JSON.stringify(issues, null, 2));
    expect(issues).toEqual([]);
  });
}

for (const path of DASHBOARD_PATHS) {
  test(`dashboard launch audit: ${path}`, async ({ page }) => {
    test.setTimeout(90_000);
    await signInAsOwner(page);
    const issues = await collectRouteIssues(page, `${path}${path.includes('?') ? '&' : '?'}deepAudit=may17`, 'Dashboard');
    if (issues.length) console.log(`DAYOF_DEEP_AUDIT_ROUTE_RESULT ${path} ` + JSON.stringify(issues, null, 2));
    expect(issues).toEqual([]);
  });
}
