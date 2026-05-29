#!/usr/bin/env node

import { chromium } from 'playwright';

const baseUrl = process.argv[2] || process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:4178';
const email = process.argv[3] || 'test@gmail.com';
const password = process.argv[4] || '12345678';
const siteSlug = process.argv[5] || 'testandkaras';
const isLocalBaseUrl = /127\.0\.0\.1|localhost/i.test(baseUrl);

const HERO_TEXT = 'HAND EDITED HERO TITLE';
const STORY_TEXT = 'HAND EDITED STORY BODY';
const FOOTER_TEXT = 'HAND EDITED FOOTER CTA';

async function assertLocalBaseUrlReady(url) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(1_500) });
    if (response.ok) return;
    throw new Error(`received HTTP ${response.status}`);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(
      `AI regression browser proof requires a running preview/dev server at ${url}. Start the local runtime first, then rerun this proof. (${detail})`,
    );
  }
}

if (isLocalBaseUrl) {
  await assertLocalBaseUrlReady(baseUrl);
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1200 } });

let sawSaveRequest = false;
let sawHeroEnvelope = false;
let sawStoryEnvelope = false;
let sawFooterEnvelope = false;

page.on('response', async (resp) => {
  const url = resp.url();
  if (url.includes('/rest/v1/wedding_sites')) {
    if (['PATCH', 'POST'].includes(resp.request().method())) sawSaveRequest = true;
    try {
      const text = await resp.text();
      if (text.includes(HERO_TEXT) && text.includes('user-edited')) sawHeroEnvelope = true;
      if (text.includes(STORY_TEXT) && text.includes('user-edited')) sawStoryEnvelope = true;
      if (text.includes(FOOTER_TEXT) && text.includes('user-edited')) sawFooterEnvelope = true;
    } catch {}
  }
});

const step = async (label, fn) => {
  try {
    return await fn();
  } catch (error) {
    console.error(`STEP_FAILED ${label}: ${error.message}`);
    throw error;
  }
};

try {
  await step('login', async () => {
    await page.goto(`${baseUrl}/login`, { waitUntil: 'networkidle' });
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/password/i).fill(password);
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForURL(/dashboard\//, { timeout: 60000 });
  });

  await step('builder edits', async () => {
    await page.goto(`${baseUrl}/dashboard/builder`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(4000);
    const closeBtn = page.getByRole('button', { name: /close for now/i });
    if (await closeBtn.count()) await closeBtn.click();
    await page.waitForTimeout(500);

    await page.getByRole('button', { name: 'Hero', exact: true }).last().click();
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: /edit text/i }).first().click();
    await page.waitForTimeout(1000);
    await page.getByLabel(/headline \(overrides couple names\)/i).first().fill(HERO_TEXT);
    await page.keyboard.press('Tab');
    await page.waitForTimeout(700);

    await page.getByRole('button', { name: /back to sections/i }).click();
    await page.waitForTimeout(700);

    await page.getByRole('button', { name: 'Our Story', exact: true }).last().click();
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: /edit text/i }).first().click();
    await page.waitForTimeout(1000);
    await page.locator('textarea[id*="storyText"]').first().fill(STORY_TEXT);
    await page.keyboard.press('Tab');
    await page.waitForTimeout(700);

    await page.getByRole('button', { name: /back to sections/i }).click();
    await page.waitForTimeout(700);

    await page.getByRole('button', { name: 'Footer / RSVP Push', exact: true }).last().click();
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: /edit text/i }).first().click();
    await page.waitForTimeout(1000);
    const textInputs = page.locator('input[type="text"]');
    const count = await textInputs.count();
    for (let i = 0; i < count; i++) {
      const val = await textInputs.nth(i).inputValue().catch(() => null);
      if (val === 'We hope to see you there') {
        await textInputs.nth(i).fill(FOOTER_TEXT);
        break;
      }
    }
    await page.keyboard.press('Tab');
    await page.waitForTimeout(700);

    await page.locator('body').click({ position: { x: 20, y: 20 } });
    await page.waitForTimeout(500);
    await page.keyboard.press('Meta+s').catch(async () => {
      await page.keyboard.press('Control+s');
    });
    await page.waitForTimeout(6000);
  });

  await step('refresh from brief', async () => {
    await page.goto(`${baseUrl}/dashboard/overview`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2500);
    const refresh = page.getByRole('button', { name: /refresh draft from brief/i });
    if (await refresh.count()) {
      await refresh.click();
      await page.waitForTimeout(5000);
    }
  });

  const publicBody = await step('public verify', async () => {
    await page.goto(`${baseUrl}/site/${siteSlug}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    return await page.locator('body').innerText();
  });

  const result = {
    sawSaveRequest,
    sawHeroEnvelope,
    sawStoryEnvelope,
    sawFooterEnvelope,
    hasHero: publicBody.includes(HERO_TEXT),
    hasStory: publicBody.includes(STORY_TEXT),
    hasFooter: publicBody.includes(FOOTER_TEXT),
  };

  console.log(JSON.stringify(result, null, 2));
} finally {
  await browser.close();
}
