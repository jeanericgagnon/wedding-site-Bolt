import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { mergeOnboardingSeedsIntoWeddingData } from './onboardingService';
import { makeSignupBaseSlug } from '../signupService';

describe('onboarding service boundaries', () => {
  it('merges generated event seeds without dropping existing wedding metadata', () => {
    expect(
      mergeOnboardingSeedsIntoWeddingData(
        {
          theme: 'garden',
          meta: { source: 'quick-start' },
        },
        [{ event_name: 'Welcome Drinks' }],
        [{ eventName: 'Ceremony' }],
      ),
    ).toEqual({
      theme: 'garden',
      meta: {
        source: 'quick-start',
        onboardingEventSeeds: [{ event_name: 'Welcome Drinks' }],
        rsvpEventSeeds: [{ eventName: 'Ceremony' }],
      },
    });
  });

  it('normalizes signup slugs without keeping email punctuation', () => {
    expect(makeSignupBaseSlug('Kara+Eric.Wedding@example.com')).toBe('karaericwedding');
    expect(makeSignupBaseSlug('@example.com')).toBe('ourwedding');
  });

  it('moves onboarding and signup database writes behind service modules', () => {
    const onboarding = readFileSync(join(process.cwd(), 'src/pages/Onboarding.tsx'), 'utf8');
    const guided = readFileSync(join(process.cwd(), 'src/pages/onboarding/GuidedSetup.tsx'), 'utf8');
    const quickStart = readFileSync(join(process.cwd(), 'src/pages/onboarding/QuickStart.tsx'), 'utf8');
    const weddingStatus = readFileSync(join(process.cwd(), 'src/pages/onboarding/WeddingStatus.tsx'), 'utf8');
    const signup = readFileSync(join(process.cwd(), 'src/pages/Signup.tsx'), 'utf8');
    const onboardingService = readFileSync(join(process.cwd(), 'src/pages/onboarding/onboardingService.ts'), 'utf8');
    const signupService = readFileSync(join(process.cwd(), 'src/pages/signupService.ts'), 'utf8');

    expect(onboarding).toContain('fetchExistingOnboardingSite(user.id)');
    expect(onboarding).toContain('createOnboardingWeddingSite({');
    expect(guided).toContain('upsertGuidedSetupGuestFromCsv(resolvedSiteId');
    expect(guided).toContain('fetchGuidedSetupSite(user.id)');
    expect(guided).toContain('updateGuidedSetupSite({ siteId: resolvedSiteId, userId: user.id, updateData })');
    expect(quickStart).toContain('fetchQuickStartSeedSite(user.id)');
    expect(quickStart).toContain('fetchQuickStartPersistSite(user.id)');
    expect(quickStart).toContain('updateQuickStartPersistSite({');
    expect(weddingStatus).toContain('updateWeddingPlanningStatus({ userId: user.id, updateData })');
    expect(signup).toContain('ensureMinimalWeddingSite');
    expect(signup).toContain('startSignupWithGoogle');
    expect(signup).toContain('createSignupAccount(formData.email, formData.password)');

    expect(onboarding).not.toContain("from '../lib/supabase'");
    expect(onboarding).not.toContain('supabase.from(');
    expect(guided).not.toContain("supabase.from('guests')");
    expect(guided).not.toMatch(/supabase\s*\n\s*\.from\('wedding_sites'\)/);
    expect(quickStart).not.toContain("from '../../lib/activeSite'");
    expect(quickStart).not.toMatch(/supabase\s*\n\s*\.from\('wedding_sites'\)/);
    expect(weddingStatus).not.toContain("from '../../lib/activeSite'");
    expect(weddingStatus).not.toMatch(/supabase\s*\n\s*\.from\('wedding_sites'\)/);
    expect(signup).not.toContain("supabase.from('wedding_sites')");
    expect(signup).not.toContain('supabase.auth.signInWithOAuth');
    expect(signup).not.toContain('supabase.auth.signUp');
    expect(signup).not.toContain('supabase.auth.signInWithPassword');

    expect(onboardingService).toContain('export const GUIDED_SETUP_SITE_SELECT = ');
    expect(onboardingService).toContain('export const QUICK_START_SEED_SITE_SELECT = ');
    expect(onboardingService).toContain('export const QUICK_START_PERSIST_SITE_SELECT = ');
    expect(onboardingService).toContain(".select('id, onboarding_answers, wedding_data')");
    expect(onboardingService).toContain(".select('event_name')");
    expect(onboardingService).toContain(".select('id')");
    expect(onboardingService).toContain('updateWeddingPlanningStatus');
    expect(signupService).toContain('export async function startSignupWithGoogle');
    expect(signupService).toContain('export async function createSignupAccount');
    expect(signupService).toContain('supabase.auth.signInWithOAuth');
    expect(signupService).toContain('supabase.auth.signUp');
    expect(signupService).toContain('supabase.auth.signInWithPassword');
    expect(signupService).toContain(".select('id')");
    expect(onboardingService).not.toContain(".select('*')");
    expect(signupService).not.toContain(".select('*')");
  });
});
