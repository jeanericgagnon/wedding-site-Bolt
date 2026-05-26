import { test, expect } from '@playwright/test';

async function gotoDom(page: Parameters<typeof test>[0]['page'], path: string) {
  await page.goto(path, { waitUntil: 'domcontentloaded' });
}

test.describe('public v1 trust smoke', () => {
  test('homepage carries the narrowed v1 story', async ({ page, baseURL }) => {
    await page.goto(baseURL || 'https://dayof.love', { waitUntil: 'domcontentloaded' });

    await expect(page).toHaveTitle(/WeddingSite|Dayof|DayOf/i);
    await expect(page.getByRole('heading', { name: /A calmer wedding operating system\./i })).toBeVisible();
    await expect(page.getByText(/Build the wedding site, manage the guest list, run RSVP and messages, collect photos/i)).toBeVisible();
    await expect(page.getByRole('heading', { name: /Most wedding websites stop at publish\. dayof stays useful through the rest\./i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Site, guests, and day-of work in the same rhythm\./i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /One place for the details, people, and memories that matter\./i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Built for launch truth, not wedding-tech theater\./i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Simple, honest pricing\./i })).toBeVisible();
    await expect(page.getByRole('button', { name: /sign up for your wedding site|start your wedding site draft|start your draft/i }).first()).toBeVisible();
  });

  test('product page exposes the current product shape', async ({ page }) => {
    await gotoDom(page, '/product');

    await expect(page.getByRole('heading', { name: /Start with the website\. Keep the rest close\./i })).toBeVisible();
    await expect(page.getByText(/Build a beautiful site, then handle guests, RSVPs, messaging, seating, and the wedding-day plan/i)).toBeVisible();
    await expect(page.getByRole('heading', { name: /If you already started elsewhere, dayof is strongest when you move the core wedding spine\./i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /The wedding day should keep unfolding without taking over the planning flow\./i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Current product shape/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /What couples can rely on right now/i })).toBeVisible();
    await expect(page.getByText(/Public site \+ trust/i)).toBeVisible();
    await expect(page.getByText(/Messages/i).first()).toBeVisible();
    await expect(page.getByRole('heading', { name: /^Registry$/i })).toBeVisible();
  });

  test('trust page shows both the claim line and per-slice reality', async ({ page }) => {
    await gotoDom(page, '/trust');

    await expect(page.getByRole('heading', { name: /Built to make wedding planning feel calmer, not more manipulative\./i })).toBeVisible();
    await expect(page.getByText(/say what is real, ship the parts couples actually need/i)).toBeVisible();
    await expect(page.getByText(/Current promise/i)).toBeVisible();
    await expect(page.getByRole('heading', { name: /Trust gets a lot easier when the promise is narrow and real\./i })).toBeVisible();
    await expect(page.getByText(/Core promise/i)).toBeVisible();
    await expect(page.getByText(/Future or limited today/i)).toBeVisible();
    await expect(page.getByText(/Feature-by-feature read/i)).toBeVisible();
    await expect(page.getByText(/Guests \+ RSVP/i)).toBeVisible();
    await expect(page.getByText(/Onboarding/i)).toBeVisible();
  });
});

test.describe('public route smoke basics', () => {
  test('signup page loads with the direct setup promise', async ({ page }) => {
    await gotoDom(page, '/signup');
    await expect(page.getByRole('heading', { name: /start your wedding/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /continue with google/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /create account/i })).toBeVisible();
  });

  test('login page loads', async ({ page }) => {
    await gotoDom(page, '/login');
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });

  test('support page loads with contact path', async ({ page }) => {
    await gotoDom(page, '/support');
    const main = page.locator('main');
    await expect(page.getByRole('heading', { name: /we['’]ll help you get back to planning/i })).toBeVisible();
    await expect(main.getByRole('link', { name: /support@dayof\.love/i })).toBeVisible();
    await expect(main.getByRole('link', { name: /refund policy/i })).toBeVisible();
  });

  test('refund policy page loads', async ({ page }) => {
    await gotoDom(page, '/refund');
    await expect(page.getByRole('heading', { name: /refund policy/i })).toBeVisible();
    await expect(page.getByText(/30-day refund window/i)).toBeVisible();
    await expect(page.getByRole('link', { name: /support@dayof\.love/i })).toBeVisible();
  });

  test('payment-required route falls back to login when auth is missing', async ({ page }) => {
    await gotoDom(page, '/payment-required');
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
  });

  test('quick-start preview stays reachable without auth when bypass preview is explicit', async ({ page }) => {
    await gotoDom(page, '/onboarding/quick-start?bypassPayment=1');
    if (process.env.VITE_ALLOW_PAYMENT_BYPASS !== 'true') {
      await expect(page).toHaveURL(/\/login$/);
      await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
      return;
    }
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
    await expect(page.getByText(/use the code from your invitation email/i)).toBeVisible();
    await expect(page.getByText(/make sure you're using the invitation link from your email/i)).not.toBeVisible();
  });

  test('guest contact update page stays publicly reachable', async ({ page }) => {
    await gotoDom(page, '/guest-contact/ericandkaras');
    await expect(page.getByRole('heading', { name: /update contact (info|&)\s*(or\s*)?rsvp/i })).toBeVisible();
    await expect(page.getByPlaceholder(/search your full name/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /^find$/i })).toBeDisabled();
  });

  test('site photo upload link does not ask guests for a token', async ({ page }) => {
    await gotoDom(page, '/photos/upload?site=ericandkaras');
    await expect(page.getByRole('heading', { name: /share your photos/i })).toBeVisible();
    await expect(page.getByText(/uploading to ericandkaras\.dayof\.love/i)).toBeVisible();
    await expect(page.locator('#photo-upload-token')).toHaveCount(0);
  });

  test('collaborator invite page loads with token param', async ({ page }) => {
    await gotoDom(page, '/accept-collaborator-invite?token=test-token');
    await expect(page.getByRole('heading', { name: /join this wedding/i })).toBeVisible();
    await expect(page.getByText(/check invite/i)).toBeVisible();
    await expect(page.getByText(/this invite could not be found|checking invite/i)).toBeVisible();
  });
});
