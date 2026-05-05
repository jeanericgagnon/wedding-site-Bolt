import { expect, test, type Page } from '@playwright/test';

const flagshipTemplates = [
  { id: 'modern-luxe', cue: /black tie in sayulita/i },
  { id: 'editorial-romance', cue: /a weekend in chapters/i },
  { id: 'timeless-classic', cue: /together with their families/i },
  { id: 'destination-minimal', cue: /pack for the pacific/i },
  { id: 'bold-contemporary', cue: /the weekend starts soon/i },
  { id: 'photo-storytelling', cue: /a love story in photographs/i },
  { id: 'floral-garden', cue: /an open-air celebration/i },
] as const;

const launchVisibleTemplates = [
  ...flagshipTemplates,
  { id: 'editorial-romance-ivory', cue: /kara & eric/i },
  { id: 'editorial-romance-midnight', cue: /kara & eric/i },
  { id: 'floral-garden-sage', cue: /kara & eric/i },
  { id: 'floral-garden-rose', cue: /kara & eric/i },
  { id: 'modern-luxe-ivory', cue: /kara & eric/i },
  { id: 'timeless-classic-navy', cue: /kara & eric/i },
] as const;

const stalePreviewTerms = [
  /JFK/i,
  /Newark/i,
  /Manhattan/i,
  /Park Avenue/i,
  /The Lowell/i,
  /Baccarat/i,
  /Benjamin/i,
  /Sonesta/i,
  /SMITH2025/i,
  /WEDDING25/i,
  /Cityline/i,
  /May 1(?:st)?, 2025/i,
  /Preview dataset/i,
  /Template:/i,
  /Date TBD/i,
  /will appear here/i,
  /Add a photo/i,
  /No hotels yet/i,
] as const;

const unsafePublicTerms = [
  /secure token/i,
  /database/i,
  /provider/i,
  /bucket/i,
  /metadata/i,
  /function/i,
] as const;

async function expectNoMeaningfulHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => {
    const doc = document.documentElement;
    return Math.max(0, doc.scrollWidth - doc.clientWidth);
  });
  expect(overflow).toBeLessThanOrEqual(8);
}

async function expectNoBrokenImages(page: Page) {
  const brokenImages = await page.evaluate(() => {
    return Array.from(document.images)
      .filter((image) => image.complete && image.naturalWidth === 0)
      .map((image) => image.currentSrc || image.src);
  });
  expect(brokenImages).toEqual([]);
}

async function expectHeroFirst(page: Page, templateId: string) {
  const state = await page.evaluate(() => {
    const first = document.querySelector('#template-scroll-root > [data-builder-section-id], #template-scroll-root > section');
    const hero = document.querySelector('[data-section-type="hero"], #hero');
    return {
      firstSectionType: first?.getAttribute('data-section-type') || first?.id || '',
      heroTop: hero?.getBoundingClientRect().top ?? null,
      bodyText: document.body.innerText,
    };
  });

  expect(state.firstSectionType, `${templateId} should start with the real wedding hero`).toBe('hero');
  expect(state.heroTop, `${templateId} hero should start in the first viewport`).not.toBeNull();
  expect(Math.abs(state.heroTop ?? 999), `${templateId} hero top`).toBeLessThanOrEqual(2);
  expect(state.bodyText).not.toMatch(/Preview dataset|Template:/i);
}

test.describe('launch flagship template visual proof', () => {
  for (const viewport of [
    { name: 'desktop', size: { width: 1440, height: 1200 } },
    { name: 'mobile', size: { width: 390, height: 844 } },
  ] as const) {
    test(`${viewport.name} flagship previews start with distinct public heroes`, async ({ page }) => {
      await page.setViewportSize(viewport.size);
      const consoleErrors: string[] = [];
      page.on('console', (message) => {
        if (message.type() === 'error') consoleErrors.push(message.text());
      });

      for (const template of flagshipTemplates) {
        await page.goto(`/template-scroll-capture?templateId=${template.id}&visualProof=flagship-${viewport.name}`, { waitUntil: 'networkidle' });
        await page.waitForSelector('#template-scroll-root[data-template-scroll-ready="true"]', { timeout: 15_000 });
        await expect(page.getByText(template.cue).first()).toBeVisible();
        await expectHeroFirst(page, template.id);
        await expectNoMeaningfulHorizontalOverflow(page);
        await expectNoBrokenImages(page);
      }

      expect(consoleErrors).toEqual([]);
    });
  }

  test('desktop and mobile launch template sections avoid stale placeholder logistics', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });

    for (const viewport of [
      { name: 'desktop', size: { width: 1440, height: 1200 } },
      { name: 'mobile', size: { width: 390, height: 844 } },
    ] as const) {
      await page.setViewportSize(viewport.size);
      for (const template of launchVisibleTemplates) {
        await page.goto(`/template-scroll-capture?templateId=${template.id}&visualProof=launch-sections-${viewport.name}`, { waitUntil: 'networkidle' });
        await page.waitForSelector('#template-scroll-root[data-template-scroll-ready="true"]', { timeout: 15_000 });
        await expect(page.getByText(template.cue).first()).toBeVisible();
        await expectNoMeaningfulHorizontalOverflow(page);
        await expectNoBrokenImages(page);

        const bodyText = await page.locator('body').innerText();
        for (const term of [...stalePreviewTerms, ...unsafePublicTerms]) {
          expect(bodyText, `${template.id} ${viewport.name} should not show ${term}`).not.toMatch(term);
        }
      }
    }

    expect(consoleErrors).toEqual([]);
  });
});
