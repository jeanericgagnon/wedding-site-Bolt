import { expect, test } from '@playwright/test';

test.use({ serviceWorkers: 'block' });

const COMPOSER_TEMPLATES = [
  'Save the date',
  'RSVP reminder',
  'Event reminder',
  'Photo request',
  'Day-of update',
  'Thank you',
] as const;

function buildLocalDemoEnvelope(messages: Array<Record<string, unknown>>) {
  return JSON.stringify({
    savedAtISO: new Date('2026-05-13T12:00:00.000Z').toISOString(),
    value: messages,
  });
}

async function readStoredDemoMessages(page: import('@playwright/test').Page) {
  return page.evaluate(() => {
    const raw = window.localStorage.getItem('dayof.demo.messages.history');
    if (!raw) return [];
    try {
      return JSON.parse(raw).value ?? [];
    } catch {
      return [];
    }
  });
}

async function enableLocalDemo(page: import('@playwright/test').Page) {
  await page.addInitScript(({ messageEnvelope }) => {
    window.localStorage.setItem('dayof_e2e_local_auth', '1');
    window.localStorage.setItem('dayof.demo.messages.history', messageEnvelope);
  }, {
    messageEnvelope: buildLocalDemoEnvelope([
      {
        id: 'proof-seed-review',
        subject: 'Guest arrival update',
        body: 'We hit a partial delivery earlier and need follow-up.',
        sent_at: '2026-05-13T10:00:00.000Z',
        scheduled_for: null,
        status: 'partial',
        channel: 'email',
        audience_filter: 'not_responded',
        recipient_filter: { audience: 'not_responded', recipient_count: 12, skipped_count: 2 },
        recipient_count: 12,
        delivered_count: 10,
        failed_count: 0,
      },
      {
        id: 'proof-seed-failed',
        subject: 'Parking reminder',
        body: 'A contact detail still needs review before we retry this note.',
        sent_at: '2026-05-13T09:00:00.000Z',
        scheduled_for: null,
        status: 'failed',
        channel: 'email',
        audience_filter: 'all',
        recipient_filter: { audience: 'all', recipient_count: 18, skipped_count: 1 },
        recipient_count: 18,
        delivered_count: 15,
        failed_count: 2,
      },
    ]),
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

test('messages comms center composes and saves each operational template path in local demo mode', async ({ page }) => {
  await enableLocalDemo(page);
  await page.goto('/dashboard/messages?bypassPayment=1&commsCenterProof=1', { waitUntil: 'domcontentloaded' });

  await expect(page.getByRole('heading', { name: /send guest updates without making them feel automated/i })).toBeVisible();

  const campaignNameInput = page.getByPlaceholder('Spring RSVP reminder');
  const bodyInput = page.getByPlaceholder('Write your message here');
  const subjectInput = page.getByPlaceholder('For example: Wedding day reminder');
  const templateSelect = page.getByLabel('Template');
  const initialStoredMessages = await readStoredDemoMessages(page);

  for (const [index, label] of COMPOSER_TEMPLATES.entries()) {
    await templateSelect.selectOption({ label });
    await expect(bodyInput).not.toHaveValue('');

    const uniqueName = `${label} proof ${index + 1}`;
    await campaignNameInput.fill(uniqueName);
    await page.getByRole('button', { name: 'Save Draft' }).click();

    await expect(page.getByText('Saved as draft').first()).toBeVisible();
    await expect
      .poll(async () => {
        const stored = await readStoredDemoMessages(page);
        return {
          count: stored.length,
          latest: stored[0] ?? null,
        };
      })
      .toMatchObject({
        count: initialStoredMessages.length + index + 1,
        latest: {
          status: 'draft',
        },
      });

    const stored = await readStoredDemoMessages(page);
    expect(stored[0]?.body?.length ?? 0).toBeGreaterThan(0);
    expect(stored[0]?.subject?.length ?? 0).toBeGreaterThan(0);
  }
});

test('messages comms center supports local scheduled saves and keeps review wording honest', async ({ page }) => {
  await enableLocalDemo(page);
  await page.goto('/dashboard/messages?bypassPayment=1&commsCenterProof=1', { waitUntil: 'domcontentloaded' });

  await expect(page.getByRole('button', { name: 'Needs review' }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Needs contact details' }).first()).toBeVisible();

  await page.getByLabel('Template').selectOption({ label: 'Event reminder' });
  const subject = await page.getByPlaceholder('For example: Wedding day reminder').inputValue();
  await page.getByPlaceholder('Spring RSVP reminder').fill('Week-of details scheduled proof');
  await page.locator('form').getByRole('button', { name: 'Schedule', exact: true }).click();

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const year = tomorrow.getFullYear();
  const month = String(tomorrow.getMonth() + 1).padStart(2, '0');
  const day = String(tomorrow.getDate()).padStart(2, '0');

  await page.locator('input[type="date"]').fill(`${year}-${month}-${day}`);
  await page.locator('input[type="time"]').fill('17:30');
  await page.getByRole('button', { name: 'Schedule message' }).click();

  await expect(page.getByText(/scheduled for/i)).toBeVisible();
  await expect(page.getByText('Scheduled').first()).toBeVisible();
  await expect
    .poll(async () => {
      const stored = await readStoredDemoMessages(page);
      return stored.find((message) => message.subject === subject);
    })
    .toMatchObject({
      subject,
      status: 'scheduled',
    });
});
