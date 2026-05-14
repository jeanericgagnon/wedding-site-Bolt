import { expect, test, type Page } from '@playwright/test';

test.use({ serviceWorkers: 'block' });

async function enableLocalDemo(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem('dayof_e2e_local_auth', '1');
  });

  await page.addInitScript(() => {
    const blobStore = new Map<string, Blob>();
    const capturedDownloads: Array<{ filename: string; href: string }> = [];
    let seq = 0;
    const originalCreateObjectUrl = window.URL.createObjectURL.bind(window.URL);
    const originalRevokeObjectUrl = window.URL.revokeObjectURL.bind(window.URL);
    const originalAnchorClick = window.HTMLAnchorElement.prototype.click;

    Object.assign(window, {
      __dayofCapturedDownloads: capturedDownloads,
      __dayofCapturedBlobStore: blobStore,
    });

    window.URL.createObjectURL = ((object: Blob | MediaSource) => {
      if (object instanceof Blob) {
        const href = `blob:dayof-captured/${seq += 1}`;
        blobStore.set(href, object);
        return href;
      }
      return originalCreateObjectUrl(object);
    }) as typeof window.URL.createObjectURL;

    window.URL.revokeObjectURL = ((url: string | URL) => {
      if (typeof url === 'string' && blobStore.has(url)) {
        return;
      }
      return originalRevokeObjectUrl(url);
    }) as typeof window.URL.revokeObjectURL;

    window.HTMLAnchorElement.prototype.click = function patchedAnchorClick() {
      if (this.download && this.href && blobStore.has(this.href)) {
        capturedDownloads.push({ filename: this.download, href: this.href });
        return;
      }
      return originalAnchorClick.call(this);
    };
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

test('guest hub print pack downloads as nonblank safe html', async ({ page }) => {
  await enableLocalDemo(page);
  await page.goto('/dashboard/photos?bypassPayment=1&guestHubQrQa=1', { waitUntil: 'domcontentloaded' });

  await expect(page.getByRole('heading', { name: /collect guest photos|memories/i }).first()).toBeVisible();
  await expect(page.getByRole('heading', { name: /one qr guest hub/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /save print cards/i })).toBeEnabled();

  await page.getByRole('button', { name: /save print cards/i }).click();
  await page.waitForFunction(() => Array.isArray((window as typeof window & { __dayofCapturedDownloads?: unknown[] }).__dayofCapturedDownloads) && ((window as typeof window & { __dayofCapturedDownloads?: unknown[] }).__dayofCapturedDownloads?.length ?? 0) > 0);

  const downloadCapture = await page.evaluate(async () => {
    const runtime = window as typeof window & {
      __dayofCapturedDownloads?: Array<{ filename: string; href: string }>;
      __dayofCapturedBlobStore?: Map<string, Blob>;
    };
    const capture = runtime.__dayofCapturedDownloads?.[0] ?? null;
    if (!capture) return null;
    const blob = runtime.__dayofCapturedBlobStore?.get(capture.href) ?? null;
    return {
      filename: capture.filename,
      html: blob ? await blob.text() : '',
    };
  });

  expect(downloadCapture?.filename).toBe('dayof-guest-hub-qr-print-pack.html');
  const html = downloadCapture?.html ?? '';

  expect(html).toContain('DayOf guest hub QR print pack');
  expect(html).toContain('<section class="card welcome-sign">');
  expect(html).toContain('<section class="card table-card">');
  expect(html).toContain('<section class="card invite-insert">');
  expect(html).toContain('<section class="card photo-prompt">');
  expect(html).toContain('https://api.qrserver.com/v1/create-qr-code/');
  expect(html).toContain('https://alex-jordan-demo.dayof.love/event/alex-jordan-demo');
  expect(html).not.toContain('token=');
  expect(html).not.toContain('invite_token=');
});
