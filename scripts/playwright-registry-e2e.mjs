import { chromium } from 'playwright';

const baseUrl = process.argv[2] || 'https://dayof.love';
const email = process.argv[3] || 'test@gmail.com';
const password = process.argv[4] || '12345678';
const productUrl = process.argv[5] || 'https://www.amazon.com/dp/B07FZ8S74R?tag=test';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const out = { steps: [] };

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
  await step('open login', async () => {
    await page.goto(`${baseUrl}/login`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    return { url: page.url(), title: await page.title() };
  });

  await step('sign in', async () => {
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password').fill(password);
    await page.getByRole('button', { name: 'Sign In' }).click();
    await page.waitForURL(/\/dashboard\//, { timeout: 60000 });
    return { url: page.url() };
  });

  await step('open registry', async () => {
    await page.goto(`${baseUrl}/dashboard/registry`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.getByRole('heading', { name: 'Gift Registry' }).waitFor({ timeout: 30000 });
    return { url: page.url() };
  });

  await step('open add item form', async () => {
    await page.getByRole('button', { name: /Add Item/i }).click();
    await page.getByRole('heading', { name: /Add Registry Item/i }).waitFor({ timeout: 10000 });
    return { opened: true };
  });

  await step('import url', async () => {
    const input = page.getByPlaceholder(/https:\/\/amazon.com\/product/i);
    await input.fill(productUrl);
    await page.getByRole('button', { name: /Fetch details/i }).click();
    await page.waitForTimeout(3000);
    const itemName = await page.locator('label:has-text("Item Name")').locator('..').locator('input').inputValue();
    const merchant = await page.locator('label:has-text("Store / Merchant")').locator('..').locator('input').inputValue();
    const imageUrl = await page.locator('label:has-text("Image URL")').locator('..').locator('input').inputValue();
    return { itemName, merchant, imageUrlPresent: Boolean(imageUrl) };
  });

  await step('close browser', async () => ({ done: true }));
} finally {
  console.log(JSON.stringify(out, null, 2));
  await browser.close();
}
