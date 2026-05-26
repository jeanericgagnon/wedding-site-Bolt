import { expect, test, type Page } from '@playwright/test';

const mobileViewport = { width: 390, height: 844 };
const proofSiteSlug = process.env.V1_PROOF_SITE_SLUG || 'maya-and-leo';
const publicProofSiteSlug = process.env.V1_PUBLIC_PROOF_SITE_SLUG || 'alex-jordan-demo';

async function expectPublicSiteRouteLoaded(page: Page) {
  await expect(page.getByText(/something went wrong/i)).toHaveCount(0);
  await expect(page.getByText(/wedding site not found/i)).toHaveCount(0);
  await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
}

async function expectNoMeaningfulHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => {
    const doc = document.documentElement;
    return Math.max(0, doc.scrollWidth - doc.clientWidth);
  });
  expect(overflow).toBeLessThanOrEqual(8);
}

async function signInOnMobile(page: Page) {
  const email = process.env.V1_OWNER_EMAIL || 'test@gmail.com';
  const password = process.env.V1_OWNER_PASSWORD || '12345678';

  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.getByPlaceholder('your@email.com').fill(email);
  await page.getByPlaceholder('Enter your password').fill(password);
  await expect(page.getByRole('button', { name: /^sign in$/i })).toBeEnabled();
  await page.getByRole('button', { name: /^sign in$/i }).click();
  await expect
    .poll(() => new URL(page.url()).pathname, {
      timeout: 30_000,
      intervals: [500, 1_000, 2_000],
    })
    .toMatch(/^\/dashboard/);
}

test.describe('mobile core smoke', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(mobileViewport);
  });

  test('guest-facing mobile routes stay reachable and token-free where intended', async ({ page }) => {
    await page.goto('/rsvp', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /^rsvp$/i })).toBeVisible();
    await expect(page.getByText(/use the code from your invitation email/i)).toBeVisible();
    await expectNoMeaningfulHorizontalOverflow(page);

    await page.goto('/rsvp?previewGuest=guest-1&previewSurface=rsvp', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(/owner preview mode/i)).toHaveCount(0);
    await expect(page.getByRole('link', { name: /leave preview/i })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: /^rsvp$/i })).toBeVisible();
    await expectNoMeaningfulHorizontalOverflow(page);

    await page.goto(`/guest-contact/${proofSiteSlug}`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /update contact\s*&\s*rsvp/i })).toBeVisible();
    await expect(page.getByPlaceholder(/search your full name/i)).toBeVisible();
    await expectNoMeaningfulHorizontalOverflow(page);

    await page.goto(`/photos/upload?site=${proofSiteSlug}`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /share your photos/i })).toBeVisible();
    await expect(page.locator('#photo-upload-token')).toHaveCount(0);
    await expectNoMeaningfulHorizontalOverflow(page);

    await page.goto(`/site/${publicProofSiteSlug}?mobileSmoke=1&previewGuest=guest-1&previewSurface=public`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(/owner preview mode/i)).toHaveCount(0);
    await expect(page.getByRole('link', { name: /leave preview/i })).toHaveCount(0);
    await expectPublicSiteRouteLoaded(page);
    await expectNoMeaningfulHorizontalOverflow(page);

    await page.goto(`/site/${publicProofSiteSlug}?mobileSmoke=1#travel`, { waitUntil: 'domcontentloaded' });
    await expect.poll(() => new URL(page.url()).hash).toBe('#travel');
    await expectPublicSiteRouteLoaded(page);
    await expect(page.getByRole('heading', { name: /travel & accommodations/i })).toBeVisible();
    await expectNoMeaningfulHorizontalOverflow(page);

    await page.goto(`/vault/${proofSiteSlug}/1?vaultQaOpen=1&mobileSmoke=1`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /anniversary vault/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /save in vault/i })).toBeVisible();
    await expectNoMeaningfulHorizontalOverflow(page);
  });

  test('authenticated dashboard core routes render on mobile without native dialog regressions', async ({ page }) => {
    const nativeDialogs: string[] = [];
    page.on('dialog', async (dialog) => {
      nativeDialogs.push(dialog.type());
      await dialog.dismiss();
    });

    await signInOnMobile(page);

    const routes = [
      { path: '/dashboard/overview?bypassPayment=1&mobileSmoke=1', heading: null },
      { path: '/dashboard/guests?bypassPayment=1&mobileSmoke=1', heading: /guests\s*&\s*rsvp|people, replies, and details/i },
      { path: '/dashboard/itinerary?bypassPayment=1&mobileSmoke=1', heading: /itinerary|shape the rhythm of the wedding weekend|schedule/i },
      { path: '/dashboard/photos?bypassPayment=1&mobileSmoke=1', heading: /memories|bucket board|photos, notes, and moments/i },
      { path: '/dashboard/messages?bypassPayment=1&mobileSmoke=1', heading: /message guests|send (a )?guest update/i },
      { path: '/dashboard/planning?bypassPayment=1&mobileSmoke=1', heading: /planning|practical pieces/i },
      { path: '/dashboard/planning?tab=budget&bypassPayment=1&mobileSmoke=1', heading: /planning|practical pieces/i },
      { path: '/dashboard/seating?bypassPayment=1&mobileSmoke=1', heading: /seating|place guests at tables/i },
      { path: '/dashboard/settings?bypassPayment=1&mobileSmoke=1', heading: /settings|quiet controls/i },
    ];

    for (const route of routes) {
      await page.goto(route.path, { waitUntil: 'domcontentloaded' });
      if (route.heading) {
        await expect(
          page.getByRole('banner').getByRole('heading', { name: route.heading })
            .or(page.getByRole('main').getByRole('heading', { name: route.heading }))
            .first(),
        ).toBeVisible();
      }
      if (route.path.includes('/dashboard/overview')) {
        await expect(page.getByRole('main').getByText(/your wedding at a glance/i)).toBeVisible();
        await expect(page.getByRole('main').getByText(/engagement dashboard/i)).toBeVisible();
        await expect(page.getByRole('main').getByText(/proof baseline/i)).toBeVisible();
      }
      if (route.path.includes('/dashboard/messages')) {
        await expect(page.getByRole('main').getByText(/communication flow/i)).toBeVisible();
        await expect(page.getByRole('main').getByRole('heading', { name: /write a message/i })).toBeVisible();
        await expect(page.getByRole('main').getByText(/template/i).first()).toBeVisible();
        await expect(page.getByRole('main').getByRole('combobox').first()).toBeVisible();
      }
      if (route.path.includes('/dashboard/photos')) {
        await expect(page.getByRole('main').getByText(/link \+ qr ready/i)).toBeVisible();
        await expect(page.getByRole('main').getByRole('button', { name: /open archive vaults/i })).toBeVisible();
        await expect(page.getByRole('main').getByRole('heading', { name: /bucket sheet/i })).toBeVisible();
      }
      if (route.path.includes('/dashboard/guests')) {
        await expect(page.getByRole('heading', { name: /guests\s*&\s*rsvp/i })).toBeVisible();
        await expect(page.getByRole('link', { name: /open rsvp board|open rsvp view/i })).toBeVisible();
        await page.getByRole('button', { name: /rsvp settings/i }).click();
        await expect(page.getByRole('button', { name: /rsvp config/i })).toBeVisible();
        await expect(page.getByText(/rsvp questions & meal choices/i)).toBeVisible();
        await expect(page.getByText(/collect meal choice on the rsvp form/i)).toBeVisible();
      }
      if (route.path.includes('tab=budget')) {
        await expect(page.getByRole('main').getByText(/budget goal/i).first()).toBeVisible();
        await expect(page.getByRole('main').getByText(/estimated/i).first()).toBeVisible();
        await expect(page.getByRole('main').getByText(/actual/i).first()).toBeVisible();
        await expect(page.getByRole('main').getByText(/remaining/i).first()).toBeVisible();
      }
      if (route.path.includes('/dashboard/seating')) {
        await expect(page.getByRole('main').getByText(/open seating lookup/i)).toBeVisible();
        await expect(page.getByRole('main').getByText(/open coordinator mode/i)).toBeVisible();
        await expect(page.getByRole('main').getByText(/seating insights/i)).toBeVisible();
      }
      if (route.path.includes('/dashboard/settings')) {
        await page.getByRole('button', { name: /site settings/i }).first().click();
        await expect(page.getByRole('main').getByText(/site url/i)).toBeVisible();
        await expect(page.getByRole('main').getByText(/privacy settings/i)).toBeVisible();
      }
      await expectNoMeaningfulHorizontalOverflow(page);
    }

    expect(nativeDialogs).toEqual([]);
  });
});
