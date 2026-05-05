import { expect, test, type Page } from '@playwright/test';

const bannedRenderedPhrases = [
  /AI setup/i,
  /AI-guided/i,
  /AI-led/i,
  /AI-assisted setup/i,
  /the AI still wants/i,
  /real product brain/i,
  /starter wedding site is ready/i,
  /everything you need for a beautiful wedding website/i,
  /inviteState=/i,
  /Invite diagnostics:/i,
  /Claim stage:/i,
  /AI spend/i,
  /token counts?/i,
  /raw model/i,
  /provider names?/i,
  /Template not found/i,
  /Use this template/i,
  /Template support/i,
  /No coding required/i,
  /First use-case/i,
  /Fallback preview/i,
  /Preview verified/i,
  /verified badge/i,
  /OPENAI_API_KEY/i,
  /sk-proj/i,
  /sbp_/i,
  /service role/i,
];

async function expectCalmLaunchCopy(page: Page) {
  const bodyText = await page.locator('body').innerText();
  for (const phrase of bannedRenderedPhrases) {
    expect(bodyText, `Unexpected launch-path phrase: ${phrase}`).not.toMatch(phrase);
  }
}

test.describe('launch wording truth', () => {
  test('public marketing pages avoid AI hype and overclaim language', async ({ page }) => {
    for (const path of ['/', '/product', '/trust', '/templates', '/templates/modern-luxe', '/template-scroll-capture?templateId=missing']) {
      await page.goto(path, { waitUntil: 'domcontentloaded' });
      await expectCalmLaunchCopy(page);
    }
  });

  test('quick-start bypass preview is framed as a reviewable starter draft when enabled', async ({ page }) => {
    await page.goto('/onboarding/quick-start?bypassPayment=1&launchWordingSmoke=1', { waitUntil: 'domcontentloaded' });

    await page.waitForLoadState('networkidle').catch(() => undefined);
    const quickStartHeading = page.getByRole('heading', { name: /who’s getting married\?/i });
    const loginHeading = page.getByRole('heading', { name: /welcome back/i });
    const redirectedToLogin = new URL(page.url()).pathname === '/login'
      || await loginHeading.isVisible().catch(() => false);
    if (redirectedToLogin) {
      test.skip(true, 'Quick-start public bypass is disabled for this runtime.');
    }

    await expect(quickStartHeading).toBeVisible();
    await expect(page.getByText(/starter draft/i).first()).toBeVisible();
    await expectCalmLaunchCopy(page);
  });

  test('collaborator invite page does not expose diagnostics by default', async ({ page }) => {
    await page.goto('/accept-collaborator-invite?launchWordingSmoke=1', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /join this wedding team/i })).toBeVisible();
    await expect(page.getByText(/This invite link is incomplete/i)).toBeVisible();
    await expectCalmLaunchCopy(page);
  });
});
