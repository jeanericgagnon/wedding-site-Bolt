import { expect, test } from '@playwright/test';

test.describe('guest-facing language selector', () => {
  test('translates RSVP, event hub, upload flow, and recap shell from guest language links without exposing raw keys', async ({ page }) => {
    await page.goto('/rsvp?guestLang=es-MX&i18nSmoke=1');
    await expect(page.getByRole('heading', { name: 'Responde en un minuto y vuelve a celebrar.' })).toBeVisible();
    await expect(page.getByPlaceholder('Tu código de invitación')).toBeVisible();
    await expect(page.getByText('Usa el código de tu invitación por correo')).toBeVisible();
    await expect(page.getByRole('button', { name: /Buscar mi invitación/i })).toBeVisible();
    await expect(page.getByRole('button', { name: 'ES' })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByText(/rsvp\./)).toHaveCount(0);

    await page.goto('/event/maya-and-leo?guestLang=es-MX&i18nSmoke=1');
    await expect(page.getByText('Centro de invitados DayOf')).toBeVisible();
    await expect(page.getByRole('link', { name: /Subir fotos o video/i })).toBeVisible();
    await expect(page.getByText(/guest_hub\./)).toHaveCount(0);

    await page.goto('/photos/upload?site=maya-and-leo&hub=1&guestLang=es-MX&i18nSmoke=1');
    await expect(page.getByRole('heading', { name: 'Comparte tus fotos' })).toBeVisible();
    await expect(page.getByLabel('Tu nombre (opcional)')).toBeVisible();
    await expect(page.getByText(/photo_upload\./)).toHaveCount(0);

    await page.goto('/event/maya-and-leo/recap?guestLang=es-MX&i18nSmoke=1');
    await expect(page.getByText('Resumen de la boda')).toBeVisible();
    await expect(page.getByRole('button', { name: /Compartir resumen/i })).toBeVisible();
    await expect(page.getByText(/event_recap\./)).toHaveCount(0);
  });
});
