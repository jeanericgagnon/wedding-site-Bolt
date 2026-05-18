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

  await page.getByRole('button', { name: 'Copy manifest' }).evaluate((button) => {
    (button as HTMLButtonElement).click();
  });
  await page.waitForFunction(() => {
    const runtime = window as typeof window & { __dayofCopiedTexts?: string[] };
    return (runtime.__dayofCopiedTexts?.length ?? 0) >= 1;
  }, { timeout: 10_000 });

  await page.getByRole('button', { name: 'Copy style kit' }).evaluate((button) => {
    (button as HTMLButtonElement).click();
  });
  await page.waitForFunction(() => {
    const runtime = window as typeof window & { __dayofCopiedTexts?: string[] };
    return (runtime.__dayofCopiedTexts?.length ?? 0) >= 2;
  }, { timeout: 10_000 });

  await page.getByRole('button', { name: 'Save print pack' }).evaluate((button) => {
    (button as HTMLButtonElement).click();
  });
  await page.waitForFunction(() => {
    const runtime = window as typeof window & {
      __dayofCapturedDownloads?: Array<{ filename: string; href: string }>;
    };
    return (runtime.__dayofCapturedDownloads?.length ?? 0) >= 4;
  }, { timeout: 10_000 });

  await page.getByRole('button', { name: 'Save story graphic' }).evaluate((button) => {
    (button as HTMLButtonElement).click();
  });
  await page.waitForFunction(() => {
    const runtime = window as typeof window & {
      __dayofCapturedDownloads?: Array<{ filename: string; href: string }>;
    };
    return (runtime.__dayofCapturedDownloads?.length ?? 0) >= 6;
  }, { timeout: 10_000 });

  const capture = await page.evaluate(async () => {
    const runtime = window as typeof window & {
      __dayofCopiedTexts?: string[];
      __dayofCapturedDownloads?: Array<{ filename: string; href: string }>;
      __dayofCapturedBlobStore?: Map<string, Blob>;
    };
    const files = await Promise.all(
      (runtime.__dayofCapturedDownloads ?? []).map(async (entry) => {
        const blob = runtime.__dayofCapturedBlobStore?.get(entry.href);
        const type = blob?.type ?? null;
        const isInspectableText = type?.startsWith('text/') || type === 'image/svg+xml;charset=utf-8';

        return {
          filename: entry.filename,
          type,
          size: blob?.size ?? 0,
          text: isInspectableText ? await blob?.text() : null,
        };
      }),
    );
    return {
      copiedTexts: runtime.__dayofCopiedTexts ?? [],
      files,
    };
  });

  const manifest = capture.copiedTexts[0] ?? '';
  const styleKit = capture.copiedTexts[1] ?? '';
  const printPackHtml = capture.files.find((file) => file.filename === 'dayof-wedding-identity-print-pack.html')?.text ?? '';
  const printPackSvg = capture.files.find((file) => file.filename === 'dayof-wedding-identity-print-pack.svg')?.text ?? '';
  const storyGraphicSvg = capture.files.find((file) => file.filename === 'dayof-wedding-story-graphic.svg')?.text ?? '';
  const printPackPng = capture.files.find((file) => file.filename === 'dayof-wedding-identity-print-pack.png');
  const printPackPdf = capture.files.find((file) => file.filename === 'dayof-wedding-identity-print-pack.pdf');
  const storyGraphicPng = capture.files.find((file) => file.filename === 'dayof-wedding-story-graphic.png');

  expect(manifest).toContain('identity export kit');
  expect(manifest).toContain('Public site: https://alex-jordan-demo.dayof.love');
  expect(manifest).not.toMatch(/token|invite_token|guest_access|secret/i);

  expect(styleKit).toMatch(/Monogram: [A-Z] · [A-Z]/);
  expect(styleKit).toContain('Do not add guest-specific or private invite URLs to shared print assets.');
  expect(styleKit).not.toMatch(/token|invite_token|guest_access|secret/i);

  expect(printPackHtml).toContain('DayOf wedding identity print pack');
  expect(printPackHtml).toContain('https://api.qrserver.com/v1/create-qr-code/');
  expect(printPackHtml).toContain('https://alex-jordan-demo.dayof.love/rsvp');
  expect(printPackHtml).not.toContain('token=');
  expect(printPackHtml).not.toContain('invite_token=');

  expect(printPackSvg).toContain('<svg');
  expect(printPackSvg).toContain('Public site QR card');
  expect(printPackSvg).toContain('https://alex-jordan-demo.dayof.love/rsvp');
  expect(printPackSvg).not.toMatch(/token=|invite_token=|guest_access|secret/i);

  expect(storyGraphicSvg).toContain('<svg');
  expect(storyGraphicSvg).toMatch(/[A-Z] · [A-Z]/);
  expect(storyGraphicSvg).toContain('https://alex-jordan-demo.dayof.love');
  expect(storyGraphicSvg).not.toMatch(/token|invite_token|guest_access|secret/i);

  const fileMetadata = [printPackPng, printPackPdf, storyGraphicPng].map((file) => ({
    filename: file?.filename ?? '',
    type: file?.type ?? null,
    size: file?.size ?? 0,
  }));

  expect(fileMetadata).toEqual([
    expect.objectContaining({ filename: 'dayof-wedding-identity-print-pack.png', type: 'image/png', size: expect.any(Number) }),
    expect.objectContaining({ filename: 'dayof-wedding-identity-print-pack.pdf', type: 'application/pdf', size: expect.any(Number) }),
    expect.objectContaining({ filename: 'dayof-wedding-story-graphic.png', type: 'image/png', size: expect.any(Number) }),
  ]);
  expect(fileMetadata.every((item) => item.size > 5000)).toBe(true);
});

test('settings identity exports stay readable across theme variants with long names', async ({ page }) => {
  test.setTimeout(120_000);
  await enableLocalDemo(page);
  await page.goto('/dashboard/settings?bypassPayment=1&identityExportsQa=1&identityThemeQa=1', { waitUntil: 'domcontentloaded' });

  const siteSettingsButton = page.getByRole('button', { name: /site settings/i });
  await expect(siteSettingsButton).toBeVisible();
  await siteSettingsButton.evaluate((button) => {
    (button as HTMLButtonElement).click();
  });
  await expect(page.getByRole('heading', { name: 'Wedding identity exports' })).toBeVisible();

  await expect(page.getByRole('button', { name: /save print pack/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /save story graphic/i })).toBeVisible();

  await expect(page.getByText(/7 of 7 ready|6 of 7 ready|5 of 7 ready/)).toBeVisible();
});
