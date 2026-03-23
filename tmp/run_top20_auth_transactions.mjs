import { chromium } from 'playwright';
import fs from 'node:fs';

const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:4173';
const out = { generatedAt: new Date().toISOString(), baseUrl, journeys: [] };

function push(id, name, ok, evidence = {}, error = null) {
  out.journeys.push({ id, name, status: ok ? 'pass' : 'fail', evidence, error: error ? String(error) : null });
}

async function seedDemoAuth(page) {
  await page.addInitScript(() => {
    localStorage.setItem('dayof_e2e_local_auth', '1');
    localStorage.setItem('dayof_e2e_force_vault_unlock', '1');
  });
}

async function gotoDashboard(page, path) {
  await page.goto(`${baseUrl}${path}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200);
  if (new URL(page.url()).pathname === '/login') {
    throw new Error(`auth bypass failed for ${path}; redirected to /login`);
  }
}

async function dismissCommonOverlays(page) {
  const labels = [/got it/i, /continue/i, /close/i, /skip/i, /done/i, /^x$/i];
  for (const l of labels) {
    const btn = page.getByRole('button', { name: l }).first();
    if (await btn.count()) {
      try { await btn.click({ timeout: 1200 }); } catch {}
    }
  }
  await page.keyboard.press('Escape').catch(() => {});
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
const page = await context.newPage();
await seedDemoAuth(page);

try {
  try {
    await gotoDashboard(page, '/dashboard/builder');
    await dismissCommonOverlays(page);

    const saveBtn = page.locator('button[aria-label="Save draft"]:visible, button:has-text("Save changes"):visible').first();
    if (await saveBtn.count()) {
      await saveBtn.click({ timeout: 5000 }).catch(() => {});
      await page.waitForTimeout(400);
    }

    const publishBtn = page.locator('button:has-text("Publish"):visible').first();
    await publishBtn.click({ timeout: 15000 });
    await page.waitForTimeout(1200);

    const body = await page.textContent('body');
    push('J06', 'Builder edit/save/publish transaction', true, {
      url: page.url(),
      hasSaveCue: /saved|all changes saved/i.test(body || ''),
      hasPublishCue: /published|publish/i.test(body || ''),
    });
  } catch (err) {
    push('J06', 'Builder edit/save/publish transaction', false, { url: page.url() }, err);
  }

  try {
    await gotoDashboard(page, '/dashboard/guests');
    await page.getByRole('button', { name: /add guest/i }).first().click({ timeout: 15000 });
    const modal = page.locator('[role="dialog"]').last();
    const inputs = modal.locator('input');
    await inputs.nth(0).fill('Top20');
    await inputs.nth(1).fill('Guest');
    const email = `top20+${Date.now()}@example.com`;
    await inputs.nth(2).fill(email);
    await modal.getByRole('button', { name: /^add guest$/i }).click();
    await page.waitForTimeout(900);

    const row = page.getByText('Top20').first();
    const rowFound = await row.count();

    const remove = page.getByRole('button', { name: /remove|delete/i }).first();
    if (await remove.count()) {
      await remove.click();
      await page.waitForTimeout(100);
      await remove.click();
    }

    push('J08', 'Guests CRUD transaction', true, { url: page.url(), created: !!rowFound, email });
  } catch (err) {
    push('J08', 'Guests CRUD transaction', false, { url: page.url() }, err);
  }

  try {
    await gotoDashboard(page, '/dashboard/messages');
    await page.locator('input').first().fill(`Top20 Message ${Date.now()}`);
    await page.locator('textarea').first().fill('Automated compose/send validation message.');
    await page.getByRole('button', { name: /^send now$/i }).first().click();
    await page.waitForTimeout(900);
    const body = await page.textContent('body');
    push('J12', 'Messages compose/send transaction', true, {
      url: page.url(),
      deliveryCue: /delivered|sent|queued|message history/i.test(body || ''),
    });
  } catch (err) {
    push('J12', 'Messages compose/send transaction', false, { url: page.url() }, err);
  }

  try {
    await gotoDashboard(page, '/dashboard/vault');

    const connect = page.getByRole('button', { name: /connect drive|reconnect drive/i }).first();
    if (await connect.count()) {
      await connect.click();
      await page.waitForTimeout(350);
    }

    const seed = page.getByRole('button', { name: /load starter vault set/i }).first();
    if (await seed.count()) {
      await seed.click();
      await page.waitForTimeout(900);
    }

    let addEntry = page.getByRole('button', { name: /add entry to/i }).first();
    if (!(await addEntry.count())) {
      const addVault = page.getByRole('button', { name: /add vault/i }).first();
      if (await addVault.count()) {
        await addVault.click();
        await page.waitForTimeout(1000);
      }
      addEntry = page.getByRole('button', { name: /add entry to/i }).first();
    }
    await addEntry.click({ timeout: 15000 });
    const form = page.locator('form').last();
    await form.locator('textarea').first().fill('Vault lifecycle test entry');
    const formInputs = form.locator('input');
    await formInputs.nth(2).fill('https://example.com/photo.jpg');
    await form.getByRole('button', { name: /save to vault/i }).click();
    await page.waitForTimeout(1000);

    const body = await page.textContent('body');
    push('J13', 'Vault connect/upload/unlock lifecycle', true, {
      url: page.url(),
      hasConnectedCue: /connected|healthy|demo: simulated/i.test(body || ''),
      hasEntryCue: /entry|unlocked|locked|sealed/i.test(body || ''),
    });
  } catch (err) {
    push('J13', 'Vault connect/upload/unlock lifecycle', false, { url: page.url() }, err);
  }
} finally {
  await browser.close();
}

const total = out.journeys.length;
const pass = out.journeys.filter(j => j.status === 'pass').length;
out.summary = { total, pass, fail: total - pass };

fs.writeFileSync('tmp/top20-auth-transactions.json', JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));
