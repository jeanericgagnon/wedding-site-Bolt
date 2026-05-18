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
  messageIds: string[],
) {
  for (const messageId of messageIds) {
    await restFetch(
      restUrl(context.supabaseUrl, 'messages', {
        id: `eq.${messageId}`,
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
  const createdMessageIds: string[] = [];

  try {
    await page.goto('/dashboard/messages?bypassPayment=1&liveCommsProof=1', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /updates guests can actually use/i })).toBeVisible();

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
      const uniqueBody = `${seededBody}\n\nLive proof ${runId} ${label}.`;
      const subjectFieldVisible = await subjectInput.isVisible();
      let createdMessageId = '';

      if (subjectFieldVisible) {
        await expect(subjectInput).not.toHaveValue('');
      }
      await campaignNameInput.fill(uniqueCampaign);
      if (subjectFieldVisible) {
        await subjectInput.fill(uniqueSubject);
        await expect(subjectInput).toHaveValue(uniqueSubject);
      }
      await bodyInput.fill(uniqueBody);
      await expect(bodyInput).toHaveValue(uniqueBody);
      await page.getByRole('button', { name: 'Save Draft' }).click();

      await expect(page.getByText('Saved as draft').first()).toBeVisible();

      await expect
        .poll(async () => {
          const response = await restFetch(
            restUrl(ownerContext.supabaseUrl, 'messages', {
              select: 'id,subject,status,wedding_site_id,body',
              wedding_site_id: `eq.${ownerContext.siteId}`,
              body: `ilike.*Live proof ${runId} ${label}.*`,
              order: 'created_at.desc',
              limit: '1',
            }),
            authHeaders(ownerContext.token, ownerContext.supabaseAnonKey),
          );
          const text = await response.text();
          if (!response.ok) return { ok: false, text };
          const [row] = JSON.parse(text) as Array<{ id: string; subject: string; status: string; wedding_site_id: string; body: string }>;
          if (!row) return { ok: false, text };
          createdMessageId = row.id;
          return {
            ok: true,
            row,
            subjectOk: subjectFieldVisible ? row.subject === uniqueSubject : row.subject.trim().length > 0,
            bodyOk: row.body.includes(`Live proof ${runId} ${label}.`),
          };
        })
        .toMatchObject({
          ok: true,
          subjectOk: true,
          bodyOk: true,
          row: {
            status: 'draft',
            wedding_site_id: ownerContext.siteId,
          },
        });

      createdMessageIds.push(createdMessageId);
    }
  } finally {
    await cleanupProofMessages(ownerContext, createdMessageIds);
  }
});
