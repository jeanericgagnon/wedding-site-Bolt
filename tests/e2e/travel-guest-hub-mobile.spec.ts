import { expect, test, type Page } from '@playwright/test';

test.use({ serviceWorkers: 'block' });

const mobileViewport = { width: 390, height: 844 };
const hubPath = '/event/alex-jordan-demo?invite_token=token-c-2&guestLang=fr&mobileSmoke=1';

async function expectNoMeaningfulHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => {
    const doc = document.documentElement;
    return Math.max(0, doc.scrollWidth - doc.clientWidth);
  });
  expect(overflow).toBeLessThanOrEqual(8);
}

test('mobile guest travel hub keeps invite-scoped travel guidance and follow-on guest paths intact', async ({ page }) => {
  await page.setViewportSize(mobileViewport);
  await page.goto(hubPath, { waitUntil: 'domcontentloaded' });

  await expect(page.getByRole('heading', { name: /Everything guests need in one place\./i })).toBeVisible();
  await expect(page.getByText('Travel quick plan')).toBeVisible();
  await expect(page.locator('body')).not.toContainText('token-c-2');
  await expectNoMeaningfulHorizontalOverflow(page);

  await page.getByRole('link', { name: 'Open travel page' }).click();
  await expect(page).toHaveURL(/\/site\/alex-jordan-demo\?invite_token=token-c-2&guestLang=fr#travel/);
  await expect(page.locator('body')).not.toContainText('token-c-2');
  await expectNoMeaningfulHorizontalOverflow(page);

  await page.goto(hubPath, { waitUntil: 'domcontentloaded' });
  await page.getByRole('link', { name: /Reply Confirm attendance and any event-specific details from the same hub\./i }).click();
  await expect(page).toHaveURL(/\/site\/alex-jordan-demo\?invite_token=token-c-2&guestLang=fr#rsvp/);
  await expect(page.locator('body')).not.toContainText('token-c-2');
  await expectNoMeaningfulHorizontalOverflow(page);

  await page.goto(hubPath, { waitUntil: 'domcontentloaded' });
  await page.getByRole('link', { name: /Upload photos Share photos or videos without installing an app\./i }).click();
  await expect(page).toHaveURL(/\/photos\/upload\?site=alex-jordan-demo&hub=1&invite_token=token-c-2&guestLang=fr/);
  await expect(page.locator('label[for="photo-upload-files"]').first()).toBeVisible();
  await expect(page.locator('body')).not.toContainText('token-c-2');
  await expectNoMeaningfulHorizontalOverflow(page);
});
