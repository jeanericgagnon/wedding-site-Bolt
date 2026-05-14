import { expect, test, type Page } from '@playwright/test';

test.use({ serviceWorkers: 'block' });

async function enableLocalDemo(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem('dayof_e2e_local_auth', '1');
  });

  await page.addInitScript(() => {
    const blobStore = new Map<string, Blob>();
    const capturedDownloads: Array<{ filename: string; href: string }> = [];
    const copiedTexts: string[] = [];
    let seq = 0;
    const originalCreateObjectUrl = window.URL.createObjectURL.bind(window.URL);
    const originalRevokeObjectUrl = window.URL.revokeObjectURL.bind(window.URL);
    const originalAnchorClick = window.HTMLAnchorElement.prototype.click;

    Object.assign(window, {
      __dayofCapturedDownloads: capturedDownloads,
      __dayofCapturedBlobStore: blobStore,
      __dayofCopiedTexts: copiedTexts,
    });

    if (!navigator.clipboard) {
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: {
          writeText: async (value: string) => {
            copiedTexts.push(value);
          },
        },
      });
    } else {
      navigator.clipboard.writeText = async (value: string) => {
        copiedTexts.push(value);
      };
    }

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

test('settings identity exports copy and download safe wedding assets', async ({ page }) => {
  test.setTimeout(120_000);
  await enableLocalDemo(page);
  await page.goto('/dashboard/settings?bypassPayment=1&identityExportsQa=1', { waitUntil: 'domcontentloaded' });

  const siteSettingsButton = page.getByRole('button', { name: /site settings/i });
  await expect(siteSettingsButton).toBeVisible();
  await siteSettingsButton.evaluate((button) => {
    (button as HTMLButtonElement).click();
  });
  await expect(page.getByRole('heading', { name: 'Wedding identity exports' })).toBeVisible();

  for (const label of ['Copy manifest', 'Copy style kit', 'Save print pack', 'Save story graphic']) {
    await page.getByRole('button', { name: label }).evaluate((button) => {
      (button as HTMLButtonElement).click();
    });
  }

  await page.waitForFunction(() => {
    const runtime = window as typeof window & {
      __dayofCopiedTexts?: string[];
      __dayofCapturedDownloads?: Array<{ filename: string; href: string }>;
    };
    return (runtime.__dayofCopiedTexts?.length ?? 0) >= 2 && (runtime.__dayofCapturedDownloads?.length ?? 0) >= 2;
  });

  const capture = await page.evaluate(async () => {
    const runtime = window as typeof window & {
      __dayofCopiedTexts?: string[];
      __dayofCapturedDownloads?: Array<{ filename: string; href: string }>;
      __dayofCapturedBlobStore?: Map<string, Blob>;
    };
    const files = await Promise.all(
      (runtime.__dayofCapturedDownloads ?? []).map(async (entry) => ({
        filename: entry.filename,
        text: await runtime.__dayofCapturedBlobStore?.get(entry.href)?.text(),
      })),
    );
    return {
      copiedTexts: runtime.__dayofCopiedTexts ?? [],
      files,
    };
  });

  const manifest = capture.copiedTexts[0] ?? '';
  const styleKit = capture.copiedTexts[1] ?? '';
  const printPack = capture.files.find((file) => file.filename === 'dayof-wedding-identity-print-pack.html')?.text ?? '';
  const storyGraphic = capture.files.find((file) => file.filename === 'dayof-wedding-story-graphic.svg')?.text ?? '';

  expect(manifest).toContain('identity export kit');
  expect(manifest).toContain('Public site: https://alex-jordan-demo.dayof.love');
  expect(manifest).not.toMatch(/token|invite_token|guest_access|secret/i);

  expect(styleKit).toMatch(/Monogram: [A-Z] · [A-Z]/);
  expect(styleKit).toContain('Do not add guest-specific or private invite URLs to shared print assets.');
  expect(styleKit).not.toMatch(/token|invite_token|guest_access|secret/i);

  expect(printPack).toContain('DayOf wedding identity print pack');
  expect(printPack).toContain('https://api.qrserver.com/v1/create-qr-code/');
  expect(printPack).toContain('https://alex-jordan-demo.dayof.love/rsvp');
  expect(printPack).not.toContain('token=');
  expect(printPack).not.toContain('invite_token=');

  expect(storyGraphic).toContain('<svg');
  expect(storyGraphic).toMatch(/[A-Z] · [A-Z]/);
  expect(storyGraphic).toContain('https://alex-jordan-demo.dayof.love');
  expect(storyGraphic).not.toMatch(/token|invite_token|guest_access|secret/i);
});
