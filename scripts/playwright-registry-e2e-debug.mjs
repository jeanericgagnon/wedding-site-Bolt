import { chromium } from 'playwright';

const baseUrl = process.argv[2] || 'https://dayof.love';
const email = process.argv[3] || 'test@gmail.com';
const password = process.argv[4] || '12345678';
const productUrl = process.argv[5] || 'https://www.amazon.com/dp/B07FZ8S74R?tag=test';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

try {
  await page.goto(`${baseUrl}/login`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign In' }).click();
  await page.waitForURL(/\/dashboard\//, { timeout: 60000 });

  await page.goto(`${baseUrl}/dashboard/registry`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.getByRole('heading', { name: 'Gift Registry' }).waitFor({ timeout: 30000 });
  await page.getByRole('button', { name: /Add Item/i }).click();
  await page.getByRole('heading', { name: /Add Registry Item/i }).waitFor({ timeout: 10000 });

  const input = page.getByPlaceholder(/https:\/\/amazon.com\/product/i);
  await input.fill(productUrl);
  await page.getByRole('button', { name: /Fetch details/i }).click();
  await page.waitForTimeout(5000);

  const labels = await page.locator('label').allInnerTexts();
  const headings = await page.locator('h1,h2,h3').allInnerTexts();
  const buttons = await page.locator('button').allInnerTexts();
  const inputs = await page.locator('input,textarea').evaluateAll(nodes => nodes.map(n => ({
    tag: n.tagName,
    type: n.getAttribute('type'),
    placeholder: n.getAttribute('placeholder'),
    value: n.value,
    name: n.getAttribute('name'),
    aria: n.getAttribute('aria-label')
  })));
  const body = await page.locator('body').innerText();

  console.log(JSON.stringify({ headings, labels, buttons, inputs, bodySnippet: body.slice(0, 4000) }, null, 2));
} finally {
  await browser.close();
}
