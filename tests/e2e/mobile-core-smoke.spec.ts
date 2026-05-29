import { expect, test, type Page } from '@playwright/test';

const mobileViewport = { width: 390, height: 844 };

async function expectNoMeaningfulHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => {
    const doc = document.documentElement;
    return Math.max(0, doc.scrollWidth - doc.clientWidth);
  });
  expect(overflow).toBeLessThanOrEqual(8);
}

function isLocalBaseURL(baseURL: string | undefined) {
  if (!baseURL) return false;
  return /127\.0\.0\.1|localhost/i.test(baseURL);
}

async function enableLocalMobileAuth(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem('dayof_e2e_local_auth', '1');
  });

  await page.route('**/*', async (route) => {
    const url = route.request().url();
    if (url.includes('/auth/v1/user')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: 'demo-local-user', email: 'demo@dayof.love' }),
      });
      return;
    }
    await route.continue();
  });
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

    await page.goto('/guest-contact/ericandkaras', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /update contact.*rsvp/i })).toBeVisible();
    await expect(page.getByPlaceholder(/search your full name/i)).toBeVisible();
    await expect(page.getByPlaceholder(/search your full name/i)).toBeDisabled();
    await expect(page.getByRole('button', { name: /^find$/i })).toBeDisabled();
    await expectNoMeaningfulHorizontalOverflow(page);

    await page.goto('/photos/upload?site=ericandkaras', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /share your photos/i })).toBeVisible();
    await expect(page.locator('#photo-upload-token')).toHaveCount(0);
    await expectNoMeaningfulHorizontalOverflow(page);

    await page.goto('/site/alex-jordan-demo?publicQualitySmoke=mobile-core&previewGuest=guest-1&previewSurface=public&invite_token=invite-123', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(/owner preview mode/i)).toHaveCount(0);
    await expect(page.getByRole('link', { name: /leave preview/i })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: /Alex Thompson.*Jordan Rivera|Alex Thompson & Jordan Rivera/i }).first()).toBeVisible();
    await expect(page.getByText(/June 15, 2026/i).first()).toBeVisible();
    await expect(page.getByText(/Sunset Gardens Estate/i).first()).toBeVisible();
    await expect(page.getByText(/Ceremony/i).first()).toBeVisible();
    await expectNoMeaningfulHorizontalOverflow(page);

    await page.goto('/vault/maya-and-leo/1?vaultQaOpen=1&mobileSmoke=1', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /anniversary vault/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /save in vault/i })).toBeVisible();
    await expectNoMeaningfulHorizontalOverflow(page);
  });

  test('authenticated dashboard core routes render on mobile without native dialog regressions', async ({ page, baseURL }) => {
    const nativeDialogs: string[] = [];
    page.on('dialog', async (dialog) => {
      nativeDialogs.push(dialog.type());
      await dialog.dismiss();
    });

    if (isLocalBaseURL(baseURL)) {
      await enableLocalMobileAuth(page);
      await page.goto('/dashboard/overview?bypassPayment=1&mobileSmoke=1', { waitUntil: 'domcontentloaded' });
      await expect(page).toHaveURL(/\/dashboard\/overview/);
    } else {
      await signInOnMobile(page);
    }

    const routes = [
      { path: '/dashboard/overview?bypassPayment=1&mobileSmoke=1', heading: null },
      { path: '/dashboard/guests?bypassPayment=1&mobileSmoke=1', heading: /people, replies, and details|guests/i },
      { path: '/dashboard/itinerary?bypassPayment=1&mobileSmoke=1', heading: /events.*seating|weekend plans/i },
      { path: '/dashboard/photos?bypassPayment=1&mobileSmoke=1', heading: /photos, notes, and moments|memories/i },
      { path: '/dashboard/messages?bypassPayment=1&mobileSmoke=1', heading: /message guests with more control/i },
      { path: '/dashboard/planning?bypassPayment=1&mobileSmoke=1', heading: /practical pieces|planning/i },
      { path: '/dashboard/planning?tab=budget&bypassPayment=1&mobileSmoke=1', heading: /practical pieces|planning/i },
      { path: '/dashboard/registry?bypassPayment=1&mobileSmoke=1', heading: /registry/i },
      { path: '/dashboard/seating?bypassPayment=1&mobileSmoke=1', heading: /place guests at tables|seating/i },
      { path: '/dashboard/coordinator?bypassPayment=1&mobileSmoke=1', heading: /coordinator mode/i },
      { path: '/dashboard/settings?bypassPayment=1&mobileSmoke=1', heading: /quiet controls|settings/i },
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
        await expect(page.getByRole('main').getByRole('button', { name: /open shared website/i }).first()).toBeVisible();
        await expect(page.getByRole('main').getByRole('heading', { name: /proof baseline/i })).toBeVisible();
        await expect(page.getByRole('main').getByRole('heading', { name: /recent site activity/i })).toBeVisible();
      }
      if (route.path.includes('/dashboard/messages')) {
        await expect(page.getByRole('main').getByText(/recent credit activity/i)).toBeVisible();
        await expect(page.getByRole('main').getByRole('heading', { name: /keep the lifecycle obvious/i })).toBeVisible();
        await expect(page.getByRole('main').locator('p').filter({ hasText: /^Day-of update$/i }).first()).toBeVisible();
        await expect(page.getByRole('main').getByRole('heading', { name: /needs attention/i })).toBeVisible();
      }
      if (route.path.includes('/dashboard/photos')) {
        await expect(page.getByRole('main').getByRole('heading', { name: /build a beautiful bucket board/i })).toBeVisible();
        await expect(page.getByRole('main').getByText(/start with a blank bucket sheet/i)).toBeVisible();
        await expect(page.getByRole('main').getByRole('heading', { name: /start with the one photo guests should remember first/i })).toBeVisible();
        await expect(page.getByRole('main').getByRole('heading', { name: /couple photo buckets/i })).toBeVisible();
        await expect(page.getByRole('button', { name: /open archive vaults/i })).toBeVisible();
      }
      if (route.path.includes('/dashboard/guests')) {
        await page.goto('/dashboard/guests?bypassPayment=1&mobileSmoke=1', { waitUntil: 'domcontentloaded' });
        await page.getByRole('button', { name: /rsvp (config|settings)/i }).click();
        await expect(page.getByRole('heading', { name: /rsvp questions.*meal choices/i })).toBeVisible();
        await expect(page.getByText(/choose what guests answer when they reply on the rsvp page/i)).toBeVisible();
        await expect(page.getByRole('checkbox', { name: /collect meal choice on the rsvp form/i })).toBeVisible();
        await expect(page.getByRole('button', { name: /add question/i })).toBeVisible();
      }
      if (route.path.includes('/dashboard/registry')) {
        await expect(page.getByRole('main').getByText(/view registry/i)).toBeVisible();
      }
      await expectNoMeaningfulHorizontalOverflow(page);
    }

    expect(nativeDialogs).toEqual([]);
  });
});
