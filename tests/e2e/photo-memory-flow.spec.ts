import { expect, test, type Page } from '@playwright/test';

const MOBILE_VIEWPORT = { width: 390, height: 844 };

function expectNoGuestFacingInternalLeaks(text: string) {
  expect(text).not.toMatch(/invite_token|previewGuest|previewSurface|provider|bucket|metadata|service role|supabase|openai|telnyx|debug|functions\/v1|internal/i);
}

async function expectNoMeaningfulHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => {
    const doc = document.documentElement;
    return Math.max(0, doc.scrollWidth - doc.clientWidth);
  });
  expect(overflow).toBeLessThanOrEqual(8);
}

async function expectGuestSafeSurface(page: Page) {
  expectNoGuestFacingInternalLeaks(await page.locator('body').innerText());
  await expectNoMeaningfulHorizontalOverflow(page);
}

async function enableLocalPhotoAuth(page: Page) {
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

function isLocalBaseURL(baseURL: string | undefined) {
  if (!baseURL) return false;
  return /127\.0\.0\.1|localhost/i.test(baseURL);
}

test.describe('photo memory flow proof', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
  });

  test('guest mobile upload handles progress, retry, success, and upload-more follow-through', async ({ page }) => {
    let uploadCount = 0;
    await page.route('**/functions/v1/photo-upload', async (route) => {
      uploadCount += 1;
      await new Promise((resolve) => setTimeout(resolve, 250));

      if (uploadCount === 1) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            uploaded: [{ name: 'party.jpg' }],
            failed: [{ name: 'dance.mp4' }],
          }),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          uploaded: [{ name: 'dance.mp4' }],
          failed: [],
        }),
      });
    });

    await page.goto('/photos/upload?site=ericandkaras&albumName=Welcome%20Dinner&hub=1&invite_token=invite-123&previewGuest=guest-1&previewSurface=photos', {
      waitUntil: 'domcontentloaded',
    });

    await expect(page.getByRole('heading', { name: /share your photos/i })).toBeVisible();
    await expect(page.getByText('Uploading to the Welcome Dinner album')).toBeVisible();
    await expect(page.getByText('Hosted at ericandkaras.dayof.love')).toBeVisible();
    await expect(page.locator('#photo-upload-token')).toHaveCount(0);
    await expectGuestSafeSurface(page);

    await page.locator('#photo-upload-files').setInputFiles([
      {
        name: 'party.jpg',
        mimeType: 'image/jpeg',
        buffer: Buffer.from('party'),
      },
      {
        name: 'dance.mp4',
        mimeType: 'video/mp4',
        buffer: Buffer.from('dance'),
      },
    ]);

    await page.getByRole('button', { name: 'Upload files' }).click();
    await expect(page.getByRole('button', { name: 'Uploading…' })).toBeDisabled();
    await expect(page.getByText('Uploaded 1 file(s), 1 failed. Failed files stayed selected so you can retry them.')).toBeVisible();
    await expect(page.getByText('Failed files are still selected so you can retry right away.')).toBeVisible();
    await expect(page.getByText('dance.mp4')).toBeVisible();

    await page.getByRole('button', { name: 'Upload files' }).click();
    await expect(page.getByText('Uploaded 1 file(s). Thank you!')).toBeVisible();

    await page.getByRole('button', { name: 'Upload more' }).click();
    await expect(page.getByRole('button', { name: 'Upload more' })).toHaveCount(0);
    await expect(page.getByText(/uploaded 1 file\(s\)\. thank you!/i)).toHaveCount(0);
    await expectGuestSafeSurface(page);
  });

  test('guest vault route stays calm and mobile-safe', async ({ page }) => {
    await page.goto('/vault/maya-and-leo/1?vaultQaOpen=1&invite_token=invite-123&previewGuest=guest-1&previewSurface=vault', {
      waitUntil: 'domcontentloaded',
    });
    await expect(page.getByRole('heading', { name: /anniversary vault/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /save in vault/i })).toBeVisible();
    await expect(page.getByText(/ready to save|photo, video, and voice attachments are ready|you can still leave a written message/i).first()).toBeVisible();
    await expectGuestSafeSurface(page);
  });

  test('owner memory dashboard stays understandable on mobile localhost proof', async ({ page, baseURL }) => {
    test.skip(!isLocalBaseURL(baseURL), 'Local auth bypass is only valid on localhost.');

    await enableLocalPhotoAuth(page);
    await page.goto('/dashboard/photos?bypassPayment=1&mobileSmoke=1', { waitUntil: 'domcontentloaded' });

    await expect(page.getByRole('heading', { name: /build a beautiful bucket board for every memory you want guests to upload/i })).toBeVisible();
    await expect(page.getByText(/memory curator/i)).toBeVisible();
    await expect(page.getByRole('heading', { name: /start with the one photo guests should remember first/i })).toBeVisible();
    await expect(page.getByText(/needs a signature anchor/i)).toBeVisible();
    await expect(page.getByText(/upload one favorite couple portrait into main photo of you two/i).first()).toBeVisible();
    await expectNoMeaningfulHorizontalOverflow(page);
  });
});
