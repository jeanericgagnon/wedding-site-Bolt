import { expect, test } from '@playwright/test';

test.use({ serviceWorkers: 'block' });

test('photo upload keeps translated helper and validation copy on guest-language links', async ({ page }) => {
  await page.goto('/photos/upload?site=maya-and-leo&hub=1&guestLang=es-MX&i18nSmoke=1', { waitUntil: 'domcontentloaded' });

  await expect(page.getByRole('heading', { name: 'Comparte tus fotos' })).toBeVisible();
  await expect(page.getByText('No hace falta app ni cuenta.')).toBeVisible();
  await expect(page.getByText('Las fotos y los videos van directo a la pareja.')).toBeVisible();
  await expect(page.getByText('Puedes añadir una nota breve para que sepan la historia.')).toBeVisible();
  await expect(page.getByText(/photo_upload\./)).toHaveCount(0);

  await page.getByRole('button', { name: 'Subir archivos' }).click();

  await expect(page.getByText('Elige al menos un archivo.')).toBeVisible();
  await expect(page.getByText(/photo_upload\./)).toHaveCount(0);
});
