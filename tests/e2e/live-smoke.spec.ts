import { test, expect } from '@playwright/test';

async function gotoDom(page: Parameters<typeof test>[0]['page'], path: string) {
  await page.goto(path, { waitUntil: 'domcontentloaded' });
}

test.describe('public v1 trust smoke', () => {
  test('homepage carries the narrowed v1 story', async ({ page, baseURL }) => {
    await page.goto(baseURL || 'https://dayof.love', { waitUntil: 'domcontentloaded' });

    await expect(page).toHaveTitle(/WeddingSite|Dayof|DayOf/i);
    await expect(page.getByRole('heading', { name: /beautiful wedding website with RSVP and guest tools built in/i })).toBeVisible();
    await expect(page.getByText(/Core v1 today/i)).toBeVisible();
    await expect(page.getByText(/Should ship/i)).toBeVisible();
    await expect(page.getByText(/Cut from promise/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /start your wedding site draft|sign up for your wedding site|start your site/i }).first()).toBeVisible();
  });

  test('product page exposes the real v1 line instead of the wishlist', async ({ page }) => {
    await gotoDom(page, '/product');

    await expect(page.getByRole('heading', { name: /see the actual v1 spine, not the wishlist/i })).toBeVisible();
    await expect(page.getByText(/Core v1 today/i)).toBeVisible();
    await expect(page.getByText(/Should ship, but not carry the launch claim/i)).toBeVisible();
    await expect(page.getByText(/Explicitly not part of the current v1 promise/i)).toBeVisible();
    await expect(page.getByText(/Public site \+ trust/i)).toBeVisible();
    await expect(page.getByText(/Comms center/i)).toBeVisible();
    await expect(page.getByRole('heading', { name: /^Registry$/i })).toBeVisible();
  });

  test('trust page shows both the claim line and per-slice reality', async ({ page }) => {
    await gotoDom(page, '/trust');

    await expect(page.getByRole('heading', { name: /built to make wedding planning feel calmer, not more manipulative/i })).toBeVisible();
    await expect(page.getByText(/Core v1 claim/i)).toBeVisible();
    await expect(page.getByText(/Real product direction/i)).toBeVisible();
    await expect(page.getByText(/Not part of the current promise/i)).toBeVisible();
    await expect(page.getByText(/Per-slice v1 read/i)).toBeVisible();
    await expect(page.getByText(/Guests \+ RSVP/i)).toBeVisible();
    await expect(page.getByText(/Onboarding/i)).toBeVisible();
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
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });

  test('payment-required route falls back to login when auth is missing', async ({ page }) => {
    await gotoDom(page, '/payment-required');
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
  });

  test('quick-start preview stays reachable without auth when bypass preview is explicit', async ({ page }) => {
    await gotoDom(page, '/onboarding/quick-start?bypassPayment=1');
    await expect(page.getByRole('heading', { name: /who’s getting married\?/i })).toBeVisible();
    await expect(page.getByText(/use the names exactly how you want guests to see them on the site/i)).toBeVisible();
    await page.getByPlaceholder(/alex & jordan/i).fill('Alex & Jordan');
    await page.getByRole('button', { name: /^continue$/i }).click();
    await expect(page.getByRole('heading', { name: /how should we refer to each of you on the site\?/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /just our names/i })).toBeVisible();
  });

  test('protected onboarding route falls back to login when auth is missing', async ({ page }) => {
    await gotoDom(page, '/onboarding');
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
  });

  test('protected builder route falls back to login when auth is missing', async ({ page }) => {
    await gotoDom(page, '/dashboard/builder');
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
  });

  test('protected dashboard root falls back to login when auth is missing', async ({ page }) => {
    await gotoDom(page, '/dashboard');
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
  });

  test('protected dashboard overview route falls back to login when auth is missing', async ({ page }) => {
    await gotoDom(page, '/dashboard/overview');
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
  });

  test('protected dashboard guests route falls back to login when auth is missing', async ({ page }) => {
    await gotoDom(page, '/dashboard/guests');
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
  });

  test('protected dashboard rsvp board route falls back to login when auth is missing', async ({ page }) => {
    await gotoDom(page, '/dashboard/rsvp-board');
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
  });

  test('protected dashboard planning route falls back to login when auth is missing', async ({ page }) => {
    await gotoDom(page, '/dashboard/planning');
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
  });

  test('protected dashboard settings route falls back to login when auth is missing', async ({ page }) => {
    await gotoDom(page, '/dashboard/settings');
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
  });

  test('protected dashboard messages route falls back to login when auth is missing', async ({ page }) => {
    await gotoDom(page, '/dashboard/messages');
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
  });

  test('protected dashboard itinerary route falls back to login when auth is missing', async ({ page }) => {
    await gotoDom(page, '/dashboard/itinerary');
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
  });

  test('protected dashboard registry route falls back to login when auth is missing', async ({ page }) => {
    await gotoDom(page, '/dashboard/registry');
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
  });

  test('protected dashboard seating route falls back to login when auth is missing', async ({ page }) => {
    await gotoDom(page, '/dashboard/seating');
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
  });

  test('protected dashboard seating lookup route falls back to login when auth is missing', async ({ page }) => {
    await gotoDom(page, '/dashboard/seating-lookup');
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
  });

  test('protected dashboard vault route falls back to login when auth is missing', async ({ page }) => {
    await gotoDom(page, '/dashboard/vault');
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
  });

  test('protected dashboard photos route falls back to login when auth is missing', async ({ page }) => {
    await gotoDom(page, '/dashboard/photos');
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
  });

  test('protected dashboard coordinator route falls back to login when auth is missing', async ({ page }) => {
    await gotoDom(page, '/dashboard/coordinator');
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
  });

  test('protected dashboard audit logs route falls back to login when auth is missing', async ({ page }) => {
    await gotoDom(page, '/dashboard/audit-logs');
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
  });

  test('protected setup route falls back to login when auth is missing', async ({ page }) => {
    await gotoDom(page, '/setup');
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
  });

  test('protected setup step route falls back to login when auth is missing', async ({ page }) => {
    await gotoDom(page, '/setup/celebration');
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
  });

  test('protected onboarding status route falls back to login when auth is missing', async ({ page }) => {
    await gotoDom(page, '/onboarding/status');
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
  });

  test('protected onboarding guided route falls back to login when auth is missing', async ({ page }) => {
    await gotoDom(page, '/onboarding/guided');
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
  });

  test('protected onboarding celebration route falls back to login when auth is missing', async ({ page }) => {
    await gotoDom(page, '/onboarding/celebration');
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
  });

  test('rsvp entry page exposes the secure lookup guidance', async ({ page }) => {
    await gotoDom(page, '/rsvp');
    await expect(page.getByText(/use the invitation code from your email for the fastest lookup/i)).toBeVisible();
    await expect(page.getByText(/make sure you're using the invitation link from your email/i)).not.toBeVisible();
  });

  test('collaborator invite page loads with token param', async ({ page }) => {
    await gotoDom(page, '/accept-collaborator-invite?token=test-token');
    await expect(page.getByRole('heading', { name: /join this wedding team/i })).toBeVisible();
    await expect(page.getByText(/checking invite/i)).toBeVisible();
  });
});
