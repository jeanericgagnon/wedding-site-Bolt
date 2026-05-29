#!/usr/bin/env node

import { chromium } from 'playwright';

const baseUrl = process.argv[2] || 'http://127.0.0.1:4178';
const email = process.argv[3] || 'test@gmail.com';
const password = process.argv[4] || '12345678';
const isLocalBaseUrl = /127\.0\.0\.1|localhost/i.test(baseUrl);

const result = {
  loginWorked: false,
  choiceHasGuided: false,
  choiceHasManual: false,
  guidedHasManualEscape: false,
  followUpHasManualEscape: false,
  completionHasCsvCta: false,
  notes: [],
};

async function assertLocalBaseUrlReady(url) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(1_500) });
    if (response.ok) return;
    throw new Error(`received HTTP ${response.status}`);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Onboarding audit browser proof requires a running preview/dev server at ${url}. Start the local runtime first, then rerun this proof. (${detail})`,
    );
  }
}

if (isLocalBaseUrl) {
  await assertLocalBaseUrlReady(baseUrl);
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1200 } });

try {
  await page.goto(`${baseUrl}/login`, { waitUntil: 'networkidle' });
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL(/dashboard\//, { timeout: 60000 });
  result.loginWorked = true;

  await page.goto(`${baseUrl}/onboarding`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  result.choiceHasGuided = await page.getByRole('button', { name: /start guided setup/i }).count() > 0;
  result.choiceHasManual = await page.getByRole('button', { name: /go to builder/i }).count() > 0;

  if (result.choiceHasGuided) {
    await page.getByRole('button', { name: /start guided setup/i }).click();
    await page.waitForTimeout(1000);
    result.guidedHasManualEscape = await page.getByRole('button', { name: /switch to manual setup/i }).count() > 0;

    const inputs = page.locator('input, textarea, select');
    const count = await inputs.count();
    if (count > 0) {
      const firstText = page.locator('input[type="text"], textarea').first();
      if (await firstText.count()) {
        await firstText.fill('Eric & Kara');
      }
    }

    const continueBtn = page.getByRole('button', { name: /continue|save brief|save draft anyway/i }).last();
    if (await continueBtn.count()) {
      await continueBtn.click().catch(() => {});
      await page.waitForTimeout(1000);
      result.followUpHasManualEscape = await page.getByRole('button', { name: /switch to manual setup/i }).count() > 0;
    }
  }

  result.notes.push(`final_url:${page.url()}`);
} catch (error) {
  result.notes.push(`error:${error.message}`);
} finally {
  await browser.close();
}

console.log(JSON.stringify(result, null, 2));
