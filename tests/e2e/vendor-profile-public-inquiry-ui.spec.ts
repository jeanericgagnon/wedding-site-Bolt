import { expect, test } from '@playwright/test';

test.use({ serviceWorkers: 'block' });

test('public vendor inquiry form is labeled, submittable, and announced', async ({ page }) => {
  const profile = {
    id: 'vendor-profile-ui-proof',
    slug: 'everlight',
    vendor_name: 'Everlight Studio',
    descriptor: 'Editorial wedding photography',
    about: 'A focused public vendor profile for couples reviewing availability.',
    hero_image_url: null,
    image_urls: [],
    instagram_url: null,
    website_url: null,
    contact_email: null,
    source_payload: { template_id: 'minimal' },
  };
  const submitted: unknown[] = [];

  await page.route('**/*', async (route) => {
    const url = route.request().url();
    if (url.includes('/rest/v1/vendor_profiles')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'content-range': '0-0/1' },
        body: JSON.stringify([profile]),
      });
      return;
    }
    if (url.includes('/functions/v1/vendor-profile-inquiry-submit')) {
      submitted.push(route.request().postDataJSON());
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true }),
      });
      return;
    }
    await route.continue();
  });

  await page.goto('/vendor/everlight', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Everlight Studio' })).toBeVisible();

  const name = page.getByLabel('Your name');
  const email = page.getByLabel('Email');
  const message = page.getByLabel('What do you need from this vendor?');
  await expect(name).toHaveAttribute('id', 'vendor-inquiry-name');
  await expect(email).toHaveAttribute('id', 'vendor-inquiry-email');
  await expect(message).toHaveAttribute('id', 'vendor-inquiry-message');

  await name.fill('Jordan QA');
  await email.fill('jordan.qa@example.com');
  await message.fill('We would love to ask about June availability.');
  await page.getByRole('button', { name: 'Send inquiry' }).click();

  await expect(page.getByRole('status')).toContainText('Inquiry sent. We saved your message for follow-up.');
  expect(submitted).toEqual([
    {
      vendor_profile_id: 'vendor-profile-ui-proof',
      name: 'Jordan QA',
      email: 'jordan.qa@example.com',
      wedding_date: '',
      venue_name: '',
      venue_location: '',
      message: 'We would love to ask about June availability.',
    },
  ]);
});
