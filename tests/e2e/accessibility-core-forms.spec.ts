import { expect, test } from '@playwright/test';

const MOBILE_VIEWPORT = { width: 390, height: 844 };

async function tabUntilFocused(page: import('@playwright/test').Page, locator: ReturnType<import('@playwright/test').Page['locator']>, maxTabs = 8) {
  for (let i = 0; i < maxTabs; i += 1) {
    await page.keyboard.press('Tab');
    if (await locator.evaluate((node) => node === document.activeElement)) return;
  }
  await expect(locator).toBeFocused();
}

test.describe('accessibility core forms', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
  });

  test('guest-facing forms expose keyboard-focusable labeled controls', async ({ page }) => {
    await page.goto('/rsvp', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /^rsvp$/i })).toBeVisible();
    const inviteLookup = page.getByRole('textbox', { name: /your name or invitation code/i });
    await expect(inviteLookup).toBeVisible();
    await tabUntilFocused(page, inviteLookup, 6);

    await page.goto('/guest-contact/ericandkaras', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /update contact.*rsvp/i })).toBeVisible();
    const guestSearch = page.getByRole('textbox', { name: /search your full name/i });
    await expect(guestSearch).toBeVisible();
    await expect(guestSearch).toBeDisabled();
    await expect(page.getByRole('button', { name: /^find$/i })).toBeDisabled();

    await page.goto('/vault/maya-and-leo/1?vaultQaOpen=1&invite_token=invite-123&previewGuest=guest-1&previewSurface=vault', { waitUntil: 'domcontentloaded' });
    const vaultName = page.getByLabel(/^your name/i);
    const vaultMessage = page.getByLabel(/message/i);
    await expect(vaultName).toBeVisible();
    await expect(vaultMessage).toBeVisible();
    await tabUntilFocused(page, vaultName, 6);
    await tabUntilFocused(page, vaultMessage, 3);
  });

  test('owner login form stays labeled and keyboard-reachable on mobile', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    const emailField = page.getByRole('textbox', { name: /^email$/i });
    const passwordField = page.getByLabel(/^password$/i);
    const signInButton = page.getByRole('button', { name: /^sign in$/i });
    await expect(emailField).toBeVisible();
    await expect(passwordField).toBeVisible();
    await tabUntilFocused(page, emailField, 4);
    await tabUntilFocused(page, passwordField, 3);
    await tabUntilFocused(page, signInButton, 3);
  });
});
