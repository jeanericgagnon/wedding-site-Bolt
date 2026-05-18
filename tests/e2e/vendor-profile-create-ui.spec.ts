import { expect, test } from '@playwright/test';

test.use({ serviceWorkers: 'block' });

test('owner vendor page studio labels draft controls and announces publish result', async ({ page }) => {
  const previewDraft = {
    slug: 'everlight-studio',
    vendor_name: 'Everlight Studio',
    descriptor: 'Editorial wedding photography',
    about: 'Warm, candid wedding photography for full weekends.',
    hero_image_url: 'https://cdn.example.com/hero.jpg',
    image_urls: ['https://cdn.example.com/gallery.jpg'],
    instagram_url: 'https://instagram.com/everlight',
    website_url: 'https://everlight.example.com',
    contact_email: null,
    source_payload: {
      template_id: 'editorial',
      sourceLabel: 'everlight.example.com',
    },
  };
  const createdProfile = {
    ...previewDraft,
    id: 'vendor-profile-create-ui-proof',
  };
  const previewRequests: unknown[] = [];
  const publishRequests: unknown[] = [];

  await page.addInitScript(() => {
    window.localStorage.setItem('dayof_e2e_local_auth', '1');
  });

  await page.route('**/*', async (route) => {
    const request = route.request();
    const url = request.url();
    if (url.includes('/functions/v1/vendor-profile-preview')) {
      previewRequests.push(request.postDataJSON());
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(previewDraft),
      });
      return;
    }
    if (url.includes('/auth/v1/user')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: 'demo-local-user', email: 'demo@dayof.love' }),
      });
      return;
    }
    if (url.includes('/rest/v1/rpc/vendor_profile_write') && request.method() === 'POST') {
      publishRequests.push(request.postDataJSON());
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(createdProfile),
      });
      return;
    }
    await route.continue();
  });

  await page.goto('/vendor-profile-v1', { waitUntil: 'domcontentloaded' });

  const vendorName = page.getByLabel('Vendor name');
  await expect(vendorName).toHaveAttribute('id', 'vendor-create-name');
  await expect(page.getByLabel('Instagram URL (optional)')).toHaveAttribute('id', 'vendor-create-instagram');
  await expect(page.getByLabel('Website URL (optional)')).toHaveAttribute('id', 'vendor-create-website');
  await expect(page.getByLabel('Contact email for inquiry CTA (optional)')).toHaveAttribute('id', 'vendor-create-contact-email');
  await expect(page.getByLabel('Design style')).toHaveAttribute('id', 'vendor-create-template');

  await vendorName.fill('Everlight Studio');
  await page.getByRole('button', { name: 'Generate vendor profile' }).click();

  await expect(page.getByRole('heading', { name: 'Vendor page details' })).toBeVisible();
  await expect(page.getByLabel('Public vendor name')).toHaveAttribute('id', 'vendor-draft-name');
  await expect(page.getByLabel('Short descriptor')).toHaveAttribute('id', 'vendor-draft-descriptor');
  await expect(page.getByLabel('Public URL slug')).toHaveAttribute('id', 'vendor-draft-slug');
  await expect(page.getByRole('textbox', { name: 'About' })).toHaveAttribute('id', 'vendor-draft-about');
  await expect(page.getByLabel('Images')).toHaveAttribute('aria-describedby', 'vendor-draft-images-help');

  await page.getByRole('button', { name: 'Publish vendor page' }).click();
  await expect(page.getByText('/vendor/everlight-studio')).toBeVisible();
  await expect(page.getByText('Published')).toBeVisible();

  expect(previewRequests).toEqual([
    expect.objectContaining({ vendorName: 'Everlight Studio' }),
  ]);
  expect(publishRequests).toEqual([
    expect.objectContaining({
      p_payload: expect.objectContaining({
        slug: 'everlight-studio',
        vendor_name: 'Everlight Studio',
      }),
    }),
  ]);
});
