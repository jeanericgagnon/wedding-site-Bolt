import { expect, test, type Page } from '@playwright/test';

const mobileViewport = { width: 390, height: 844 };

async function expectNoMeaningfulHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => {
    const doc = document.documentElement;
    return Math.max(0, doc.scrollWidth - doc.clientWidth);
  });
  expect(overflow).toBeLessThanOrEqual(8);
}

test.describe('mobile core smoke', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(mobileViewport);
  });

  test('guest-facing mobile routes stay reachable and token-free where intended', async ({ page }) => {
    await page.goto('/rsvp', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /reply in a minute/i })).toBeVisible();
    await expect(page.getByText(/use the code from your invitation email/i)).toBeVisible();
    await expectNoMeaningfulHorizontalOverflow(page);

    await page.goto('/rsvp?previewGuest=guest-1&previewSurface=rsvp', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(/owner preview mode/i)).toBeVisible();
    await expect(page.getByRole('link', { name: /leave preview/i })).toHaveAttribute('href', '/rsvp');
    await expectNoMeaningfulHorizontalOverflow(page);

    await page.goto('/guest-contact/ericandkaras', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /update contact & rsvp/i })).toBeVisible();
    await expect(page.getByPlaceholder(/search your full name/i)).toBeVisible();
    await expectNoMeaningfulHorizontalOverflow(page);

    await page.goto('/photos/upload?site=ericandkaras', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /share your photos/i })).toBeVisible();
    await expect(page.locator('#photo-upload-token')).toHaveCount(0);
    await expectNoMeaningfulHorizontalOverflow(page);

    await page.goto('/event/ericandkaras?mobileSmoke=1&previewGuest=guest-1&previewSurface=public', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(/owner preview mode/i)).toBeVisible();
    await expect(page.getByRole('link', { name: /leave preview/i })).toHaveAttribute('href', '/event/ericandkaras?mobileSmoke=1');
    await expect(page.getByRole('link', { name: /RSVP/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Upload photos or video/i })).toBeVisible();
    await expect(page.getByText(/travel guest path/i)).toBeVisible();
    await expect(page.getByRole('link', { name: /Travel details Review travel/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Reply Confirm attendance/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Upload photos Share photos/i })).toBeVisible();
    await expect(page.getByText(/day-of web mode/i)).toBeVisible();
    await expect(page.getByText(/guests can use the wedding hub in a mobile browser without an app or account/i)).toBeVisible();
    await expect(page.getByText(/guest hub status/i)).toBeVisible();
    await expect(page.getByText(/live updates still belong in owner messaging/i)).toBeVisible();
    await expect(page.getByText(/RSVP and check-in status stay in their dedicated flows/i)).toBeVisible();
    await expectNoMeaningfulHorizontalOverflow(page);

    await page.goto('/event/ericandkaras?mobileSmoke=1&hubQaConfigFallback=1', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(/showing the saved guest hub/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /try again/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Travel details Review travel/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Reply Confirm attendance/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Upload photos Share photos/i })).toBeVisible();
    await expectNoMeaningfulHorizontalOverflow(page);

    await page.goto('/event/ericandkaras/recap?mobileSmoke=1', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /eric.*kara|ericandkaras/i }).first()).toBeVisible();
    await expectNoMeaningfulHorizontalOverflow(page);

    await page.goto('/guestbook/ericandkaras?mobileSmoke=1', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /leave a note/i })).toBeVisible();
    await expect(page.getByLabel(/note/i)).toBeVisible();
    await expectNoMeaningfulHorizontalOverflow(page);

    await page.goto('/vault/maya-and-leo/1?vaultQaOpen=1&mobileSmoke=1', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /anniversary vault/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /save in vault/i })).toBeVisible();
    await expectNoMeaningfulHorizontalOverflow(page);
  });

  test('authenticated dashboard core routes render on mobile without native dialog regressions', async ({ page }) => {
    const email = process.env.V1_OWNER_EMAIL || 'test@gmail.com';
    const password = process.env.V1_OWNER_PASSWORD || '12345678';
    const nativeDialogs: string[] = [];
    page.on('dialog', async (dialog) => {
      nativeDialogs.push(dialog.type());
      await dialog.dismiss();
    });

    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.getByPlaceholder('your@email.com').fill(email);
    await page.getByPlaceholder('Enter your password').fill(password);
    await page.getByRole('button', { name: 'Sign In' }).click();
    await expect(page).toHaveURL(/\/dashboard/);

    const routes = [
      { path: '/dashboard/overview?bypassPayment=1&mobileSmoke=1', heading: /wedding home|calmer place to plan/i },
      { path: '/dashboard/guests?bypassPayment=1&mobileSmoke=1', heading: /know who is coming|guests & rsvp/i },
      { path: '/dashboard/itinerary?bypassPayment=1&mobileSmoke=1', heading: /shape the rhythm of the wedding weekend|schedule/i },
      { path: '/dashboard/photos?bypassPayment=1&mobileSmoke=1', heading: /collect guest photos|memories/i },
      { path: '/dashboard/messages?bypassPayment=1&mobileSmoke=1', heading: /send guest updates/i },
      { path: '/dashboard/planning?bypassPayment=1&mobileSmoke=1', heading: /practical pieces|planning/i },
      { path: '/dashboard/planning?tab=budget&bypassPayment=1&mobileSmoke=1', heading: /practical pieces|planning/i },
      { path: '/dashboard/registry?bypassPayment=1&mobileSmoke=1', heading: /keep gifts helpful|registry/i },
      { path: '/dashboard/seating?bypassPayment=1&mobileSmoke=1', heading: /place guests at tables|seating/i },
      { path: '/dashboard/settings?bypassPayment=1&mobileSmoke=1', heading: /quiet controls|settings/i },
    ];

    for (const route of routes) {
      await page.goto(route.path, { waitUntil: 'domcontentloaded' });
      await expect(page.getByRole('main').getByRole('heading', { name: route.heading }).first()).toBeVisible();
      if (route.path.includes('/dashboard/overview')) {
        await expect(page.getByRole('main').getByText(/proof baseline/i)).toHaveCount(0);
        await expect(page.getByRole('main').getByText(/migration proof/i)).toHaveCount(0);
        await expect(page.getByRole('main').getByText(/recent site activity/i)).toHaveCount(0);
        await expect(page.getByRole('main').getByText(/guest pulse/i)).toHaveCount(0);
        await expect(page.getByRole('main').getByText(/ready check/i)).toHaveCount(0);
        await expect(page.getByRole('main').getByText(/digest preview/i)).toBeVisible();
        await expect(page.getByRole('main').getByText(/preview only until delivery is connected/i)).toBeVisible();
        await expect(page.getByRole('button', { name: /review preferences/i })).toBeVisible();
        await page.getByRole('button', { name: /show more detail/i }).click();
        await expect(page.getByRole('main').getByText(/guest pulse/i)).toBeVisible();
        await expect(page.getByRole('main').getByText(/website and invite analytics/i)).toBeVisible();
        await expect(page.getByRole('main').getByText(/guest journey funnel/i)).toBeVisible();
        await expect(page.getByRole('main').getByText(/Do not expose IP addresses, exact devices, raw user agents, guest tokens/i)).toBeVisible();
        await expect(page.getByRole('main').getByText(/visit tracking, invite opens, and qr scans stay marked planned/i)).toBeVisible();
        await expect(page.getByRole('main').getByText(/ready check/i)).toBeVisible();
      }
      if (route.path.includes('/dashboard/messages')) {
        await expect(page.getByRole('main').getByText(/recent credit activity/i)).toHaveCount(0);
        await expect(page.getByRole('main').getByText(/guest reach/i)).toHaveCount(0);
        await page.getByLabel(/template/i).selectOption('rsvp-reminder');
        await expect(page.getByRole('main').getByText(/language preview/i)).toBeVisible();
        await expect(page.getByRole('main').getByText(/Spanish/i)).toBeVisible();
        await expect(page.getByRole('main').getByText(/Recordatorio para confirmar asistencia/i)).toBeVisible();
        await expect(page.getByRole('main').getByText(/French/i)).toBeVisible();
        await page.getByRole('button', { name: /show sending details/i }).click();
        await expect(page.getByRole('main').getByText(/guest reach/i)).toBeVisible();
      }
      if (route.path.includes('/dashboard/photos')) {
        await expect(page.getByRole('main').getByText(/no-app memory flow/i)).toBeVisible();
        await expect(page.getByRole('main').getByRole('heading', { name: /^slideshow draft$/i }).first()).toBeVisible();
        await expect(page.getByRole('main').getByText(/photo handoff export/i)).toBeVisible();
        await expect(page.getByRole('main').getByText(/one qr guest hub/i)).toBeVisible();
        await expect(page.getByRole('button', { name: /save print cards/i })).toBeVisible();
      }
      if (route.path.includes('/dashboard/guests')) {
        await page.getByRole('button', { name: /rsvp settings/i }).click();
        await expect(page.getByRole('heading', { name: /ask only what you truly need from guests/i })).toBeVisible();
        await expect(page.getByText(/setup proof checklist/i)).toBeVisible();
        await expect(page.getByText(/owner readback/i)).toBeVisible();
        await expect(page.getByRole('button', { name: /dietary notes/i })).toBeVisible();
      }
      if (route.path.includes('tab=budget')) {
        await expect(page.getByRole('main').getByText(/budget and vendor ledger/i)).toBeVisible();
        await expect(page.getByRole('main').getByText(/payment review/i)).toBeVisible();
        await expect(page.getByRole('main').getByText(/guest surfaces must not expose financial details/i)).toBeVisible();
        await expect(page.getByRole('button', { name: /export ledger/i })).toBeVisible();
      }
      if (route.path.includes('/dashboard/registry')) {
        await expect(page.getByRole('main').getByText(/keep gifts helpful, optional, and easy for guests/i)).toBeVisible();
        await expect(page.getByRole('main').getByText(/clean up imported gifts/i)).toBeVisible();
        await expect(page.getByRole('main').getByText(/gift snapshot and review details/i)).toBeVisible();
      }
      if (route.path.includes('/dashboard/seating')) {
        await expect(page.getByRole('main').getByText(/venue and catering packet/i)).toBeVisible();
        await expect(page.getByRole('main').getByText(/venue handoff review/i)).toBeVisible();
        await expect(page.getByRole('main').getByText(/printable seating packet/i)).toBeVisible();
        await expect(page.getByRole('button', { name: /catering csv/i })).toBeVisible();
      }
      if (route.path.includes('/dashboard/settings')) {
        await page.getByRole('button', { name: /site settings/i }).click();
        await expect(page.getByRole('main').getByText(/wedding identity exports/i)).toBeVisible();
        await expect(page.getByRole('button', { name: /save print pack/i })).toBeVisible();
      }
      await expectNoMeaningfulHorizontalOverflow(page);
    }

    expect(nativeDialogs).toEqual([]);
  });
});
