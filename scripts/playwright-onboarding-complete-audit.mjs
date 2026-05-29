#!/usr/bin/env node

import { chromium } from 'playwright';

const baseUrl = process.argv[2] || 'http://127.0.0.1:4178';
const email = process.argv[3] || 'test@gmail.com';
const password = process.argv[4] || '12345678';
const isLocalBaseUrl = /127\.0\.0\.1|localhost/i.test(baseUrl);

const values = [
  'Eric & Kara',
  'January 17, 2027 — Sayulita, Mexico',
  'Amor Boutique Hotel',
  'Tropical, relaxed',
  'Friday pickleball tournament, Friday welcome dinner, Saturday rehearsal dinner, Sunday wedding',
  '4:30 PM',
  '50-100',
  'some',
  '2026-10-17',
  'yes',
  'both',
  'We met on Hinge after I bought concert tickets.',
];

const result = {
  completed: false,
  sawCsvCta: false,
  sawReviewWebsite: false,
  finalUrl: '',
  error: null,
};

async function assertLocalBaseUrlReady(url) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(1_500) });
    if (response.ok) return;
    throw new Error(`received HTTP ${response.status}`);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Onboarding completion audit browser proof requires a running preview/dev server at ${url}. Start the local runtime first, then rerun this proof. (${detail})`,
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

  await page.goto(`${baseUrl}/onboarding`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /start guided setup/i }).click();

  let valueIndex = 0;
  for (let step = 0; step < 16; step += 1) {
    await page.waitForTimeout(400);

    const selectLocator = page.locator('select');
    const dateInput = page.locator('input[type="date"]').first();
    const textInput = page.locator('input[type="text"]').first();
    const textarea = page.locator('textarea').first();

    const selectCount = await selectLocator.count();
    if (selectCount > 0) {
      await selectLocator.nth(0).selectOption({ index: 1 }).catch(() => {});
      if (selectCount > 1) {
        await selectLocator.nth(1).selectOption({ index: 1 }).catch(() => {});
      }
    }

    if (await dateInput.count()) {
      await dateInput.fill('2026-10-17').catch(() => {});
    } else if (await textarea.count()) {
      await textarea.fill(values[Math.min(valueIndex, values.length - 1)]).catch(() => {});
      valueIndex += 1;
    } else if (await textInput.count()) {
      await textInput.fill(values[Math.min(valueIndex, values.length - 1)]).catch(() => {});
      valueIndex += 1;
    }

    const continueBtn = page.getByRole('button', {
      name: /continue|save brief|save draft anyway|skip these and build|use these answers and build/i,
    }).last();

    if (await continueBtn.count()) {
      await continueBtn.click().catch(() => {});
    }

    if (await page.getByRole('button', { name: /import guest csv/i }).count()) {
      break;
    }
  }

  await page.waitForTimeout(4000);
  const bodyText = await page.locator('body').innerText();
  result.sawCsvCta = /import guest csv/i.test(bodyText);
  result.sawReviewWebsite = /review website first/i.test(bodyText);
  result.finalUrl = page.url();
  result.completed = /your website is ready to shape/i.test(bodyText) && result.sawCsvCta && result.sawReviewWebsite;
} catch (error) {
  result.error = error instanceof Error ? error.message : String(error);
} finally {
  await browser.close();
}

console.log(JSON.stringify(result, null, 2));
