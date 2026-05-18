import { expect, test } from '@playwright/test';
import { signInAsOwner } from './liveOwnerSession';

const proofSiteSlug = process.env.V1_PROOF_SITE_SLUG || 'maya-and-leo';

test('live owner messaging preview and guest-facing language routes stay translated and token-safe', async ({ page }) => {
  test.setTimeout(180_000);

  await signInAsOwner(page);
  await page.goto('/dashboard/messages?bypassPayment=1&guestLanguageLive=1', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: /send (a )?guest update/i })).toBeVisible();

  await page.getByLabel(/template/i).selectOption('rsvp-reminder');
  await expect(page.getByText(/language preview/i)).toBeVisible();
  await expect(page.locator('main')).not.toContainText(/guest_hub\.|rsvp\.|photo_upload\.|event_recap\./i);

  await page.goto('/rsvp?guestLang=es-MX&i18nSmoke=1', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Responde en un minuto y vuelve a celebrar.' })).toBeVisible();
  await expect(page.getByPlaceholder('Tu código de invitación')).toBeVisible();
  await expect(page.locator('body')).not.toContainText(/invite_token=|token-[a-z0-9]/i);
  await expect(page.locator('body')).not.toContainText(/rsvp\./i);

  await page.goto(`/event/${proofSiteSlug}?guestLang=es-MX&i18nSmoke=1`, { waitUntil: 'domcontentloaded' });
  await expect(page.getByText('Centro de invitados DayOf')).toBeVisible();
  await expect(page.getByRole('link', { name: /Subir fotos o video/i })).toBeVisible();
  await expect(page.locator('body')).not.toContainText(/guest_hub\./i);
  await expect(page.locator('body')).not.toContainText(/invite_token=|token-[a-z0-9]/i);

  await page.goto(`/photos/upload?site=${proofSiteSlug}&hub=1&guestLang=es-MX&i18nSmoke=1`, { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Comparte tus fotos' })).toBeVisible();
  await expect(page.getByLabel('Tu nombre (opcional)')).toBeVisible();
  await expect(page.locator('body')).not.toContainText(/photo_upload\./i);
  await expect(page.locator('body')).not.toContainText(/invite_token=|token-[a-z0-9]/i);

  await page.goto(`/event/${proofSiteSlug}/recap?guestLang=es-MX&i18nSmoke=1`, { waitUntil: 'domcontentloaded' });
  await expect(page.getByText('Resumen de la boda')).toBeVisible();
  await expect(page.getByRole('button', { name: /Compartir resumen/i })).toBeVisible();
  await expect(page.locator('body')).not.toContainText(/event_recap\./i);
  await expect(page.locator('body')).not.toContainText(/invite_token=|token-[a-z0-9]/i);
});
