import { chromium } from 'playwright';

const inviteUrl = process.argv[2];
const email = process.argv[3];
const password = process.argv[4];

if (!inviteUrl || !email || !password) {
  console.error('Usage: node scripts/playwright-invite-claim-debug.mjs <inviteUrl> <email> <password>');
  process.exit(1);
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const out = { inviteUrl, steps: [] };

async function step(name, fn) {
  try {
    const result = await fn();
    out.steps.push({ name, ok: true, result });
  } catch (error) {
    out.steps.push({ name, ok: false, error: String(error) });
    throw error;
  }
}

try {
  await step('open invite page', async () => {
    await page.goto(inviteUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    return {
      url: page.url(),
      title: await page.title(),
      body: (await page.locator('body').innerText()).slice(0, 1200),
    };
  });

  await step('fill sign in form', async () => {
    await page.getByLabel(/invited email|email/i).fill(email);
    await page.getByLabel(/password/i).fill(password);
    return { filled: true };
  });

  await step('submit claim flow', async () => {
    await page.getByRole('button', { name: /sign in and join team|sign in and accept invite|sign in/i }).click();
    await page.waitForTimeout(5000);
    return {
      url: page.url(),
      body: (await page.locator('body').innerText()).slice(0, 2000),
    };
  });
} finally {
  console.log(JSON.stringify(out, null, 2));
  await browser.close();
}
