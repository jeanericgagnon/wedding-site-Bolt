import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';
import path from 'node:path';

const baseUrl = process.argv[2] || process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:4178';
const ownerEmail = process.argv[3] || 'test@gmail.com';
const ownerPassword = process.argv[4] || '12345678';
const collaboratorEmail = process.argv[5] || 'test1@gmail.com';
const collaboratorPassword = process.argv[6] || '12345678';

const envFiles = ['.env', '.env.local', '.env.production', '.env.production.local', '.vercel/.env.production.local'];

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const parsed = {};
  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const index = trimmed.indexOf('=');
    const key = trimmed.slice(0, index).trim();
    let value = trimmed.slice(index + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    parsed[key] = value.replace(/\\n$/, '').trim();
  }
  return parsed;
}

const fileEnv = envFiles.reduce((merged, filePath) => ({ ...merged, ...parseEnvFile(path.join(process.cwd(), filePath)) }), {});
const getEnv = (key, fallback = '') => {
  const runtimeValue = process.env[key];
  if (runtimeValue && runtimeValue.trim()) return runtimeValue.trim();
  const fileValue = fileEnv[key];
  if (typeof fileValue === 'string' && fileValue.trim()) return fileValue.trim();
  return fallback;
};
const adminSupabase = createClient(getEnv('VITE_SUPABASE_URL'), getEnv('VITE_SUPABASE_ANON_KEY'));

const browser = await chromium.launch({ headless: true });
const ownerContext = await browser.newContext();
const ownerPage = await ownerContext.newPage();
const collaboratorContext = await browser.newContext();
const collaboratorPage = await collaboratorContext.newPage();
const out = { steps: [] };
const STEP_TIMEOUT_MS = 45_000;
const startedAt = new Date().toISOString();

function logProgress(message, detail = {}) {
  const payload = { scope: 'collaborator-runtime', at: new Date().toISOString(), message, ...detail };
  console.error(JSON.stringify(payload));
}

async function withStepTimeout(name, fn, timeoutMs = STEP_TIMEOUT_MS) {
  return await Promise.race([
    fn(),
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`${name} timed out after ${timeoutMs}ms`)), timeoutMs);
    }),
  ]);
}

async function step(name, fn) {
  try {
    logProgress('step:start', { step: name });
    const result = await withStepTimeout(name, fn);
    out.steps.push({ name, ok: true, result });
    logProgress('step:ok', { step: name });
    return result;
  } catch (error) {
    out.steps.push({ name, ok: false, error: String(error) });
    logProgress('step:failed', { step: name, error: String(error) });
    throw error;
  }
}

try {
  await step('owner login', async () => {
    await ownerPage.goto(`${baseUrl}/login`, { waitUntil: 'domcontentloaded' });
    await ownerPage.getByLabel('Email').fill(ownerEmail);
    await ownerPage.getByLabel('Password').fill(ownerPassword);
    await ownerPage.getByRole('button', { name: /^sign in$/i }).click();
    await ownerPage.waitForURL(/\/dashboard\//, { timeout: 60000 });
    return { url: ownerPage.url() };
  });

  await step('owner create collaborator invite', async () => {
    await ownerPage.goto(`${baseUrl}/dashboard/settings`, { waitUntil: 'domcontentloaded' });
    await ownerPage.waitForTimeout(2500);
    await ownerPage.getByRole('button', { name: /team access/i }).click();
    await ownerPage.waitForTimeout(1500);
    const body = await ownerPage.locator('body').innerText();
    const nameInput = ownerPage.getByLabel(/planner name/i);
    const emailInput = ownerPage.getByLabel(/planner email/i);
    if (!(await nameInput.count()) || !(await emailInput.count())) {
      throw new Error(`Planner invite inputs not found. Body: ${body.slice(0, 2500)}`);
    }
    await nameInput.fill('Test One');
    await emailInput.fill(collaboratorEmail);
    await ownerPage.getByRole('button', { name: /create (db )?invite( link)?/i }).click();
    await ownerPage.waitForTimeout(1500);
    await ownerPage.locator(`text=${collaboratorEmail}`).first().waitFor({ state: 'visible', timeout: 15000 });
    const ownerSession = await ownerContext.storageState();
    const accessToken = ownerSession.cookies.find((cookie) => cookie.name.includes('access-token'))?.value;
    if (accessToken) {
      await adminSupabase.auth.setSession({ access_token: accessToken, refresh_token: accessToken });
    }
    const inviteRow = await adminSupabase
      .from('wedding_site_collaborator_invites')
      .select('invite_token')
      .eq('invite_email', collaboratorEmail)
      .eq('status', 'pending')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (inviteRow.error) throw inviteRow.error;
    if (!inviteRow.data?.invite_token) throw new Error('Invite token not found after creation');
    const text = `${baseUrl}/accept-collaborator-invite?token=${inviteRow.data.invite_token}`;
    return { inviteLink: text };
  }).then(async ({ inviteLink }) => {
    await step('collaborator open invite', async () => {
      await collaboratorPage.goto(inviteLink, { waitUntil: 'domcontentloaded' });
      return { url: collaboratorPage.url() };
    });

    await step('collaborator create account or sign in', async () => {
      const fullName = collaboratorPage.getByLabel(/full name/i);
      const createPassword = collaboratorPage.getByLabel(/create password/i);
      await Promise.race([
        fullName.waitFor({ state: 'visible', timeout: 2_500 }).catch(() => {}),
        createPassword.waitFor({ state: 'visible', timeout: 2_500 }).catch(() => {}),
      ]);

      let hasCreateAccountFields = await fullName.isVisible().catch(() => false)
        && await createPassword.isVisible().catch(() => false);
      if (!hasCreateAccountFields) {
        const createAccountTab = collaboratorPage
          .locator('button, [role="button"], [role="tab"]')
          .filter({ hasText: /^create account$/i });
        if (await createAccountTab.count()) {
          await createAccountTab.first().click();
          await Promise.race([
            fullName.waitFor({ state: 'visible', timeout: 5_000 }).catch(() => {}),
            createPassword.waitFor({ state: 'visible', timeout: 5_000 }).catch(() => {}),
          ]);
        }
      }

      hasCreateAccountFields = await fullName.isVisible().catch(() => false)
        && await createPassword.isVisible().catch(() => false);
      if (hasCreateAccountFields) {
        await fullName.fill('Test One');
        await collaboratorPage.getByLabel(/invited email/i).fill(collaboratorEmail);
        await createPassword.fill(collaboratorPassword);
        const confirmPassword = collaboratorPage.getByLabel(/confirm password/i);
        await confirmPassword.fill(collaboratorPassword);
        await confirmPassword.press('Enter');
      } else {
        await collaboratorPage.getByLabel(/invited email|email/i).fill(collaboratorEmail);
        await collaboratorPage.getByLabel(/password/i).fill(collaboratorPassword);
        const signInJoinButton = collaboratorPage.getByRole('button', { name: /sign in and join team/i });
        await signInJoinButton.scrollIntoViewIfNeeded();
        await signInJoinButton.click({ noWaitAfter: true });
      }
      await collaboratorPage.waitForTimeout(8000);
      return {
        url: collaboratorPage.url(),
        body: (await collaboratorPage.locator('body').innerText()).slice(0, 4000),
      };
    });
  });
} finally {
  console.log(JSON.stringify({ startedAt, finishedAt: new Date().toISOString(), ...out }, null, 2));
  await ownerContext.close();
  await collaboratorContext.close();
  await browser.close();
}
