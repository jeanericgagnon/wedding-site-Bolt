import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';
import path from 'node:path';

const baseUrl = process.argv[2] || process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:4178';
const ownerEmail = process.argv[3] || 'test@gmail.com';
const ownerPassword = process.argv[4] || '12345678';
const collaboratorEmail = process.argv[5] || 'test1@gmail.com';
const collaboratorPassword = process.argv[6] || '12345678';

const env = fs.readFileSync(path.join(process.cwd(), '.env.local'), 'utf8');
const getEnv = (k) => (env.match(new RegExp(`^${k}=(.*)$`, 'm')) || [])[1]?.replace(/^['\"]|['\"]$/g, '');
const adminSupabase = createClient(getEnv('VITE_SUPABASE_URL'), getEnv('VITE_SUPABASE_ANON_KEY'));

const browser = await chromium.launch({ headless: true });
const ownerContext = await browser.newContext();
const ownerPage = await ownerContext.newPage();
const collaboratorContext = await browser.newContext();
const collaboratorPage = await collaboratorContext.newPage();
const out = { steps: [] };

async function step(name, fn) {
  try {
    const result = await fn();
    out.steps.push({ name, ok: true, result });
    return result;
  } catch (error) {
    out.steps.push({ name, ok: false, error: String(error) });
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
    await ownerPage.getByRole('button', { name: /create db invite/i }).click();
    await ownerPage.waitForTimeout(1500);
    await ownerPage.locator(`text=${collaboratorEmail}`).first().waitFor({ state: 'visible', timeout: 15000 });
    const ownerSession = await ownerContext.storageState();
    const accessToken = ownerSession.cookies.find((cookie) => cookie.name.includes('access-token'))?.value;
    if (accessToken) {
      await adminSupabase.auth.setSession({ access_token: accessToken, refresh_token: accessToken });
    }
    const siteRow = await adminSupabase.from('wedding_sites').select('id').eq('site_slug', 'testandkaras').maybeSingle();
    if (siteRow.error) throw siteRow.error;
    const inviteRow = await adminSupabase
      .from('wedding_site_collaborator_invites')
      .select('invite_token')
      .eq('wedding_site_id', siteRow.data.id)
      .eq('invite_email', collaboratorEmail)
      .eq('status', 'pending')
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
      const createAccountTab = collaboratorPage.getByRole('button', { name: /create account/i });
      if (await createAccountTab.count()) {
        await createAccountTab.first().click().catch(async () => {
          await collaboratorPage.getByText(/create account/i).first().click();
        });
        await collaboratorPage.waitForTimeout(500);
      } else {
        await collaboratorPage.getByText(/create account/i).first().click().catch(() => {});
        await collaboratorPage.waitForTimeout(500);
      }
      const fullName = collaboratorPage.getByLabel(/full name/i);
      if (await fullName.isVisible().catch(() => false)) {
        await fullName.fill('Test One');
        await collaboratorPage.getByLabel(/invited email|email/i).fill(collaboratorEmail);
        await collaboratorPage.getByLabel(/create password/i).fill(collaboratorPassword);
        await collaboratorPage.getByLabel(/confirm password/i).fill(collaboratorPassword);
        await collaboratorPage.getByRole('button', { name: /create account and join team/i }).click();
      } else {
        await collaboratorPage.getByLabel(/invited email|email/i).fill(collaboratorEmail);
        await collaboratorPage.getByLabel(/password/i).fill(collaboratorPassword);
        await collaboratorPage.getByRole('button', { name: /sign in and join team/i }).click();
      }
      await collaboratorPage.waitForTimeout(8000);
      return {
        url: collaboratorPage.url(),
        body: (await collaboratorPage.locator('body').innerText()).slice(0, 4000),
      };
    });
  });
} finally {
  console.log(JSON.stringify(out, null, 2));
  await ownerContext.close();
  await collaboratorContext.close();
  await browser.close();
}
