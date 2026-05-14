import { expect, test, type Page } from '@playwright/test';

test.use({ serviceWorkers: 'block' });

async function enableLocalDemo(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem('dayof_e2e_local_auth', '1');

    if (window.localStorage.getItem('dayof.demo.seating.state')) return;

    const savedAtISO = new Date().toISOString();
    window.localStorage.setItem('dayof.demo.seating.state', JSON.stringify({
      savedAtISO,
      value: {
        'welcome-dinner-id': {
          tables: [
            {
              id: 'table-1',
              seating_event_id: 'demo-seating-event',
              table_name: 'Head Table',
              capacity: 8,
              sort_order: 0,
              notes: '',
              table_shape: 'round',
            },
            {
              id: 'table-2',
              seating_event_id: 'demo-seating-event',
              table_name: 'Friends',
              capacity: 8,
              sort_order: 1,
              notes: '',
              table_shape: 'rectangle',
            },
          ],
          assignments: [
            {
              id: 'assign-1',
              seating_event_id: 'demo-seating-event',
              table_id: 'table-1',
              guest_id: 'confirmed-guest-0',
              seat_index: 1,
              is_valid: true,
              checked_in_at: '2026-06-14T18:05:00.000Z',
            },
            {
              id: 'assign-2',
              seating_event_id: 'demo-seating-event',
              table_id: 'table-1',
              guest_id: 'confirmed-guest-1',
              seat_index: 2,
              is_valid: true,
            },
            {
              id: 'assign-3',
              seating_event_id: 'demo-seating-event',
              table_id: 'table-2',
              guest_id: 'confirmed-guest-2',
              seat_index: 1,
              is_valid: true,
            },
          ],
        },
      },
    }));
  });

  await page.addInitScript(() => {
    const blobStore = new Map<string, Blob>();
    const capturedDownloads: Array<{ filename: string; href: string }> = [];
    let popupHtml = '';
    let popupPrintCount = 0;
    let seq = 0;

    const originalCreateObjectUrl = window.URL.createObjectURL.bind(window.URL);
    const originalRevokeObjectUrl = window.URL.revokeObjectURL.bind(window.URL);
    const originalAnchorClick = window.HTMLAnchorElement.prototype.click;
    const originalWindowOpen = window.open.bind(window);

    Object.assign(window, {
      __dayofCapturedDownloads: capturedDownloads,
      __dayofCapturedBlobStore: blobStore,
      __dayofSeatingPopupSnapshot: () => ({ html: popupHtml, printCount: popupPrintCount }),
    });

    window.URL.createObjectURL = ((object: Blob | MediaSource) => {
      if (object instanceof Blob) {
        const href = `blob:dayof-seating/${seq += 1}`;
        blobStore.set(href, object);
        return href;
      }
      return originalCreateObjectUrl(object);
    }) as typeof window.URL.createObjectURL;

    window.URL.revokeObjectURL = ((url: string | URL) => {
      if (typeof url === 'string' && blobStore.has(url)) return;
      return originalRevokeObjectUrl(url);
    }) as typeof window.URL.revokeObjectURL;

    window.HTMLAnchorElement.prototype.click = function patchedAnchorClick() {
      if (this.download && this.href && blobStore.has(this.href)) {
        capturedDownloads.push({ filename: this.download, href: this.href });
        return;
      }
      return originalAnchorClick.call(this);
    };

    window.open = ((...args: Parameters<typeof window.open>) => {
      popupHtml = '';
      popupPrintCount = 0;
      const popup = {
        document: {
          open() {
            popupHtml = '';
          },
          write(value: string) {
            popupHtml += value;
          },
          close() {},
        },
        focus() {},
        print() {
          popupPrintCount += 1;
        },
      };
      return popup as unknown as Window;
    }) as typeof window.open;

    Object.assign(window, {
      __dayofRestoreWindowOpen: () => {
        window.open = originalWindowOpen;
      },
    });
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

async function enterDemoSeatingBoard(page: Page, url = '/dashboard/seating?bypassPayment=1&packetQa=1') {
  await page.goto(url, { waitUntil: 'domcontentloaded' });

  const tryDemo = page.getByRole('button', { name: /try demo/i });
  if (await tryDemo.isVisible().catch(() => false)) {
    await Promise.all([
      page.waitForURL(/\/dashboard(\/seating)?/),
      tryDemo.click(),
    ]);
  }
}

test('seating packet exports stay event-scoped and reflect RSVP-backed source rows', async ({ page }) => {
  await enableLocalDemo(page);
  await enterDemoSeatingBoard(page);

  await expect(page.getByRole('heading', { name: /place guests at tables without losing the room/i })).toBeVisible();
  await expect(page.getByText(/Current Event:/)).toContainText('Welcome Dinner');

  await page.getByRole('button', { name: /^CSV$/ }).click();
  await page.getByRole('button', { name: /Kitchen summary/i }).click();
  await page.getByRole('button', { name: /^Image$/ }).click();
  await page.getByRole('button', { name: /^PDF$/ }).click();

  await page.waitForFunction(() => {
    const runtime = window as typeof window & { __dayofCapturedDownloads?: Array<{ filename: string; href: string }> };
    return (runtime.__dayofCapturedDownloads?.length ?? 0) >= 3;
  });

  const captured = await page.evaluate(async () => {
    const runtime = window as typeof window & {
      __dayofCapturedDownloads?: Array<{ filename: string; href: string }>;
      __dayofCapturedBlobStore?: Map<string, Blob>;
      __dayofSeatingPopupSnapshot?: () => { html: string; printCount: number };
    };
    const downloads = await Promise.all((runtime.__dayofCapturedDownloads ?? []).map(async (item) => {
      const blob = runtime.__dayofCapturedBlobStore?.get(item.href) ?? null;
      return {
        filename: item.filename,
        text: blob ? await blob.text() : '',
      };
    }));
    return {
      downloads,
      popup: runtime.__dayofSeatingPopupSnapshot?.() ?? { html: '', printCount: 0 },
    };
  });

  const seatingCsv = captured.downloads.find((item) => item.filename === 'seating-Welcome Dinner.csv');
  expect(seatingCsv?.text).toContain('"Event","Guest Name","Email","Household / Group","RSVP Status","Table","Seat","Checked In","Checked In At","Exception Flags"');
  expect(seatingCsv?.text).toContain('"Welcome Dinner","Emma Waters","emma.waters+0@dayof.demo","","confirmed","Head Table","1","Yes","2026-06-14T18:05:00.000Z","Already checked in"');

  const kitchenSummary = captured.downloads.find((item) => item.filename === 'kitchen-summary-welcome-dinner.csv');
  expect(kitchenSummary?.text).toContain('"Event","Meal Choice","Guest Count","Guests With Dietary Notes","Guests With Allergies","Tables","Dietary Highlights"');
  expect(kitchenSummary?.text).toContain('"Welcome Dinner"');
  expect(kitchenSummary?.text).toContain('Head Table');

  const imageExport = captured.downloads.find((item) => item.filename === 'seating-layout-welcome-dinner.svg');
  expect(imageExport?.text).toContain('Welcome Dinner seating layout');
  expect(imageExport?.text).toContain('Head Table (2/8)');

  expect(captured.popup.printCount).toBe(1);
  expect(captured.popup.html).toContain('Welcome Dinner');
  expect(captured.popup.html).toContain('Emma Waters');
  expect(captured.popup.html).toContain('Head Table');
});

test('seating lookup reads back demo assignment edits after a browser seat change', async ({ page }) => {
  await enableLocalDemo(page);
  await enterDemoSeatingBoard(page, '/dashboard/seating?bypassPayment=1&lookupContinuityQa=1');

  await expect(page.getByRole('heading', { name: /place guests at tables without losing the room/i })).toBeVisible();
  await page.getByRole('button', { name: 'Seat 3' }).first().click();
  await expect(page.getByRole('heading', { name: /Map a guest to seat 3/i })).toBeVisible();
  await page.getByRole('button', { name: 'Liam Nguyen Guest' }).click();
  await expect(page.getByRole('heading', { name: /Map a guest to seat 3/i })).not.toBeVisible();
  await page.waitForFunction(() => {
    const raw = window.localStorage.getItem('dayof.demo.seating.state');
    if (!raw) return false;
    const parsed = JSON.parse(raw) as {
      value?: Record<string, { assignments?: Array<{ guest_id?: string; table_id?: string | null; seat_index?: number | null }> }>;
    };
    const assignments = parsed.value?.['welcome-dinner-id']?.assignments ?? [];
    return assignments.some((assignment) => (
      assignment.guest_id === 'confirmed-guest-3'
      && assignment.table_id === 'table-1'
      && assignment.seat_index === 3
    ));
  });

  await page.goto('/dashboard/seating-lookup?bypassPayment=1&lookupContinuityQa=1', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: /find a guest seat/i })).toBeVisible();
  await expect(page.getByText(/Data is for/i)).toContainText('Welcome Dinner');
  await page.getByPlaceholder('Search guest name, email, or table').fill('Liam');

  const liamRow = page.locator('tr', { hasText: 'Liam Nguyen' });
  await expect(liamRow).toContainText('Head Table');
  await expect(liamRow).toContainText('Seat 3');
});
