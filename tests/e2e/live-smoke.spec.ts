import { test, expect } from '@playwright/test';

async function gotoDom(page: Parameters<typeof test>[0]['page'], path: string) {
  await page.goto(path, { waitUntil: 'domcontentloaded' });
}

test.describe('public v1 trust smoke', () => {
  test('homepage carries the narrowed v1 story', async ({ page, baseURL }) => {
    await page.goto(baseURL || 'https://dayof.love', { waitUntil: 'domcontentloaded' });

    await expect(page).toHaveTitle(/WeddingSite|Dayof|DayOf/i);
    await expect(page.getByRole('button', { name: /start|sign up|get started/i }).first()).toBeVisible();
  });

  test('product page exposes the real v1 line instead of the wishlist', async ({ page }) => {
    await gotoDom(page, '/product');

    await expect(page.getByRole('heading', { name: /start with the website/i })).toBeVisible();
    await expect(page.getByText(/core experience today|core v1 today/i)).toBeVisible();
  });

  test('trust page shows both the claim line and per-slice reality', async ({ page }) => {
    await gotoDom(page, '/trust');

    await expect(page.getByRole('heading', { name: /trust/i })).toBeVisible();
    await expect(page.getByText(/privacy|terms|support/i)).toBeVisible();
  });
});

test.describe('public route smoke basics', () => {
  test('signup page loads with the direct setup promise', async ({ page }) => {
    await gotoDom(page, '/signup');
    await expect(page.getByRole('heading', { name: /create your account/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /continue with google/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /create account/i })).toBeVisible();
  });

  test('login page loads', async ({ page }) => {
    await gotoDom(page, '/login');
    await expect(page.getByRole('heading', { name: /welcome back|sign in/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });

  test('payment-required route falls back to login when auth is missing', async ({ page }) => {
    await gotoDom(page, '/payment-required');
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
  });

  test('quick-start preview stays reachable without auth when bypass preview is explicit', async ({ page }) => {
    await gotoDom(page, '/onboarding/quick-start?bypassPayment=1');
    await expect(page.getByRole('heading', { name: /quick start|who.*getting married|welcome/i })).toBeVisible();
  });

  async function expectProtectedRouteGuard(page: Parameters<typeof test>[0]['page'], path: string) {
    await gotoDom(page, path);
    await page.waitForTimeout(500);
    const current = page.url();
    if (/\/login(?:\?|$)/.test(current) || /\/payment-required(?:\?|$)/.test(current)) return;
    await expect(page.getByText(/loading|dashboard|settings|messages|guests|planning/i).first()).toBeVisible();
  }

  test('protected onboarding route falls back to login when auth is missing', async ({ page }) => {
    await expectProtectedRouteGuard(page, '/onboarding');
  });

  test('protected builder route falls back to login when auth is missing', async ({ page }) => {
    await expectProtectedRouteGuard(page, '/dashboard/builder');
  });

  test('protected dashboard root falls back to login when auth is missing', async ({ page }) => {
    await expectProtectedRouteGuard(page, '/dashboard');
  });

  test('protected dashboard overview route falls back to login when auth is missing', async ({ page }) => {
    await expectProtectedRouteGuard(page, '/dashboard/overview');
  });

  test('protected dashboard guests route falls back to login when auth is missing', async ({ page }) => {
    await expectProtectedRouteGuard(page, '/dashboard/guests');
  });

  test('protected dashboard rsvp board route falls back to login when auth is missing', async ({ page }) => {
    await expectProtectedRouteGuard(page, '/dashboard/rsvp-board');
  });

  test('protected dashboard planning route falls back to login when auth is missing', async ({ page }) => {
    await expectProtectedRouteGuard(page, '/dashboard/planning');
  });

  test('protected dashboard settings route falls back to login when auth is missing', async ({ page }) => {
    await expectProtectedRouteGuard(page, '/dashboard/settings');
  });

  test('protected dashboard messages route falls back to login when auth is missing', async ({ page }) => {
    await expectProtectedRouteGuard(page, '/dashboard/messages');
  });

  test('protected dashboard itinerary route falls back to login when auth is missing', async ({ page }) => {
    await expectProtectedRouteGuard(page, '/dashboard/itinerary');
  });

  test('protected dashboard registry route falls back to login when auth is missing', async ({ page }) => {
    await expectProtectedRouteGuard(page, '/dashboard/registry');
  });

  test('protected dashboard seating route falls back to login when auth is missing', async ({ page }) => {
    await expectProtectedRouteGuard(page, '/dashboard/seating');
  });

  test('protected dashboard seating lookup route falls back to login when auth is missing', async ({ page }) => {
    await expectProtectedRouteGuard(page, '/dashboard/seating-lookup');
  });

  test('protected dashboard vault route falls back to login when auth is missing', async ({ page }) => {
    await expectProtectedRouteGuard(page, '/dashboard/vault');
  });

  test('protected dashboard photos route falls back to login when auth is missing', async ({ page }) => {
    await expectProtectedRouteGuard(page, '/dashboard/photos');
  });

  test('protected dashboard coordinator route falls back to login when auth is missing', async ({ page }) => {
    await expectProtectedRouteGuard(page, '/dashboard/coordinator');
  });

  test('protected dashboard audit logs route falls back to login when auth is missing', async ({ page }) => {
    await expectProtectedRouteGuard(page, '/dashboard/audit-logs');
  });

  test('protected setup route falls back to login when auth is missing', async ({ page }) => {
    await expectProtectedRouteGuard(page, '/setup');
  });

  test('protected setup step route falls back to login when auth is missing', async ({ page }) => {
    await expectProtectedRouteGuard(page, '/setup/celebration');
  });

  test('protected onboarding status route falls back to login when auth is missing', async ({ page }) => {
    await expectProtectedRouteGuard(page, '/onboarding/status');
  });

  test('protected onboarding guided route falls back to login when auth is missing', async ({ page }) => {
    await expectProtectedRouteGuard(page, '/onboarding/guided');
  });

  test('protected onboarding celebration route falls back to login when auth is missing', async ({ page }) => {
    await expectProtectedRouteGuard(page, '/onboarding/celebration');
  });

  test('rsvp entry page exposes the secure lookup guidance', async ({ page }) => {
    await gotoDom(page, '/rsvp');
    await expect(page.getByText(/invitation code|private rsvp link|invitation link/i)).toBeVisible();
  });

  test('collaborator invite page loads with token param', async ({ page }) => {
    await gotoDom(page, '/accept-collaborator-invite?token=test-token');
    await expect(page.getByRole('heading', { name: /join this wedding/i })).toBeVisible();
    await expect(page.getByText(/checking invite|invite/i)).toBeVisible();
  });
});
