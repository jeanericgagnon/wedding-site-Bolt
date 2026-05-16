import { expect, test, type Page } from '@playwright/test';
import {
  authHeaders,
  envValue,
  readOwnerAuthState,
  restFetch,
  restUrl,
  signInAsOwner,
} from './liveOwnerSession';

const COMPOSER_TEMPLATES = [
  'Save the date',
  'RSVP reminder',
  'Event reminder',
  'Photo request',
  'Day-of update',
  'Thank you',
] as const;

async function resolveOwnerSiteContext(page: Page) {
  const supabaseUrl = envValue('VITE_SUPABASE_URL', 'https://atuzuobpprjstfmdnwso.supabase.co');
  const supabaseAnonKey = envValue('VITE_SUPABASE_ANON_KEY');
  const authState = await readOwnerAuthState(page);
  expect(authState.token || supabaseAnonKey).toBeTruthy();

  let siteId = authState.activeSiteId;
  if (!siteId && authState.userId) {
    const siteResponse = await restFetch(
      restUrl(supabaseUrl, 'wedding_sites', {
        select: 'id',
        user_id: `eq.${authState.userId}`,
        order: 'created_at.asc',
        limit: '1',
      }),
      authHeaders(authState.token, supabaseAnonKey),
    );
    const siteText = await siteResponse.text();
    expect(siteResponse.ok, siteText).toBeTruthy();
    const [siteRow] = JSON.parse(siteText) as Array<{ id: string }>;
    siteId = siteRow?.id ?? '';
  }

  expect(siteId).toBeTruthy();
  return { siteId, token: authState.token, supabaseUrl, supabaseAnonKey };
}

async function cleanupProofMessages(
  context: { siteId: string; token: string; supabaseUrl: string; supabaseAnonKey: string },
  subjects: string[],
) {
  for (const subject of subjects) {
    await restFetch(
      restUrl(context.supabaseUrl, 'messages', {
        wedding_site_id: `eq.${context.siteId}`,
        subject: `eq.${subject}`,
      }),
      authHeaders(context.token, context.supabaseAnonKey),
      { method: 'DELETE' },
    );
  }
}

test('live owner messages dashboard composes and saves each operational template path', async ({ page }) => {
  test.setTimeout(240_000);

  await signInAsOwner(page);
  const ownerContext = await resolveOwnerSiteContext(page);
  const runId = `${Date.now()}`;
  const createdSubjects: string[] = [];

  try {
    await page.goto('/dashboard/messages?bypassPayment=1&liveCommsProof=1', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /send guest updates without making them feel automated/i })).toBeVisible();

    const campaignNameInput = page.getByPlaceholder('Spring RSVP reminder');
    const bodyInput = page.getByPlaceholder('Write your message here');
    const subjectInput = page.getByPlaceholder('For example: Wedding day reminder');
    const templateSelect = page.getByLabel('Template');

    for (const [index, label] of COMPOSER_TEMPLATES.entries()) {
      await templateSelect.selectOption({ label });
      await expect(bodyInput).not.toHaveValue('');

      const uniqueSubject = `Live comms proof ${runId} ${index + 1} ${label}`;
      const uniqueCampaign = `Live comms proof ${label} ${index + 1}`;
      const seededBody = await bodyInput.inputValue();

      await campaignNameInput.fill(uniqueCampaign);
      await subjectInput.fill(uniqueSubject);
      await bodyInput.fill(`${seededBody}\n\nLive proof ${runId} ${label}.`);
      await page.getByRole('button', { name: 'Save Draft' }).click();

      await expect(page.getByText('Saved as draft').first()).toBeVisible();
      createdSubjects.push(uniqueSubject);

      await expect
        .poll(async () => {
          const response = await restFetch(
            restUrl(ownerContext.supabaseUrl, 'messages', {
              select: 'id,subject,status,wedding_site_id',
              wedding_site_id: `eq.${ownerContext.siteId}`,
              subject: `eq.${uniqueSubject}`,
              order: 'created_at.desc',
              limit: '1',
            }),
            authHeaders(ownerContext.token, ownerContext.supabaseAnonKey),
          );
          const text = await response.text();
          if (!response.ok) return { ok: false, text };
          const [row] = JSON.parse(text) as Array<{ id: string; subject: string; status: string; wedding_site_id: string }>;
          return row ? { ok: true, row } : { ok: false, text };
        })
        .toMatchObject({
          ok: true,
          row: {
            subject: uniqueSubject,
            status: 'draft',
            wedding_site_id: ownerContext.siteId,
          },
        });
    }
  } finally {
    await cleanupProofMessages(ownerContext, createdSubjects);
  }
});
