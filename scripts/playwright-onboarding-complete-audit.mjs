import { chromium } from 'playwright';

const baseUrl = process.argv[2] || 'http://127.0.0.1:4178';
const email = process.argv[3] || 'test@gmail.com';
const password = process.argv[4] || '12345678';

const textAnswers = [
  'Eric & Kara',
  'January 17, 2027 — Sayulita, Mexico',
  'Amor Boutique Hotel',
  'Tropical, relaxed',
  'Friday pickleball tournament, Friday welcome dinner, Saturday rehearsal dinner, Sunday wedding',
  '4:30 PM',
  'We met on Hinge and finally met in person after a concert idea turned into an actual plan.',
];
const selectAnswers = ['bride-groom', '50-100', 'some', 'yes', 'both'];

const result = {
  completed: false,
  sawCsvCta: false,
  sawReviewWebsite: false,
  finalUrl: '',
  error: null,
};

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
  await page.waitForTimeout(1000);

  let answerIndex = 0;
  let selectIndex = 0;
  for (let step = 0; step < 12; step += 1) {
    const textInput = page.locator('input[type="text"]').first();
    const dateInput = page.locator('input[type="date"]').first();
    const textarea = page.locator('textarea').first();
    const select = page.locator('select').first();

    if (await select.count()) {
      const value = selectAnswers[Math.min(selectIndex, selectAnswers.length - 1)];
      await select.selectOption(value).catch(() => {});
      if (value === 'bride-groom') {
        const second = page.locator('select').nth(1);
        if (await second.count()) await second.selectOption('bride-groom').catch(() => {});
      }
      selectIndex += 1;
    } else if (await dateInput.count()) {
      await dateInput.fill('2026-10-17').catch(() => {});
    } else if (await textarea.count()) {
      await textarea.fill(textAnswers[Math.min(answerIndex, textAnswers.length - 1)]).catch(() => {});
      answerIndex += 1;
    } else if (await textInput.count()) {
      await textInput.fill(textAnswers[Math.min(answerIndex, textAnswers.length - 1)]).catch(() => {});
      answerIndex += 1;
    }

    const continueBtn = page.getByRole('button', { name: /continue|save brief|save draft anyway|skip these and build|use these answers and build/i }).last();
    if (await continueBtn.count()) {
      await continueBtn.click().catch(() => {});
      await page.waitForTimeout(1500);
    }

    if (await page.getByRole('button', { name: /import guest csv/i }).count()) {
      break;
    }
  }

  await page.waitForTimeout(2000);
  result.sawCsvCta = await page.getByRole('button', { name: /import guest csv/i }).count() > 0;
  result.sawReviewWebsite = await page.getByRole('button', { name: /review website first/i }).count() > 0;
  result.finalUrl = page.url();
  const bodyText = await page.locator('body').innerText();
  result.completed = result.sawCsvCta && /your website is ready to shape/i.test(bodyText);
} catch (error) {
  result.error = error.message;
} finally {
  await browser.close();
}

console.log(JSON.stringify(result, null, 2));
