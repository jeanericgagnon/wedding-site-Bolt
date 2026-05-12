import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mergeOnboardingSeedsIntoWeddingData, requireAuthenticatedOnboardingUser } from './onboardingService';
import { makeSignupBaseSlug } from '../signupService';

const { getUserMock } = vi.hoisted(() => ({
  getUserMock: vi.fn(),
}));

vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: getUserMock,
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(async () => ({ data: null })),
          order: vi.fn(() => ({
            limit: vi.fn(() => ({
              maybeSingle: vi.fn(async () => ({ data: null })),
            })),
          })),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(async () => ({ error: null })),
        })),
      })),
      insert: vi.fn(async () => ({ data: null, error: null })),
    })),
  },
}));

describe('onboarding service boundaries', () => {
  beforeEach(() => {
    getUserMock.mockReset();
  });

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
    expect(guided).toContain('requireAuthenticatedOnboardingUser()');
    expect(quickStart).toContain('fetchQuickStartSeedSite(user.id)');
    expect(quickStart).toContain('fetchQuickStartPersistSite(user.id)');
    expect(quickStart).toContain('updateQuickStartPersistSite({');
    expect(quickStart).toContain('requireAuthenticatedOnboardingUser()');
    expect(weddingStatus).toContain('requireAuthenticatedOnboardingUser()');
    expect(weddingStatus).toContain('updateWeddingPlanningStatus({ userId: user.id, updateData })');
    expect(signup).toContain('ensureMinimalWeddingSite');
    expect(signup).toContain('startSignupWithGoogle');
    expect(signup).toContain('createSignupAccount(formData.email, formData.password)');

    expect(onboarding).not.toContain("from '../lib/supabase'");
    expect(onboarding).not.toContain('supabase.from(');
    expect(guided).not.toContain("supabase.from('guests')");
    expect(guided).not.toContain('supabase.auth.getUser');
    expect(guided).not.toMatch(/supabase\s*\n\s*\.from\('wedding_sites'\)/);
    expect(quickStart).not.toContain("from '../../lib/activeSite'");
    expect(quickStart).not.toContain('supabase.auth.getUser');
    expect(quickStart).not.toMatch(/supabase\s*\n\s*\.from\('wedding_sites'\)/);
    expect(weddingStatus).not.toContain("from '../../lib/activeSite'");
    expect(weddingStatus).not.toContain('supabase.auth.getUser');
    expect(weddingStatus).not.toMatch(/supabase\s*\n\s*\.from\('wedding_sites'\)/);
    expect(signup).not.toContain("supabase.from('wedding_sites')");
    expect(signup).not.toContain('supabase.auth.signInWithOAuth');
    expect(signup).not.toContain('supabase.auth.signUp');
    expect(signup).not.toContain('supabase.auth.signInWithPassword');

    expect(onboardingService).toContain('export const GUIDED_SETUP_SITE_SELECT = ');
    expect(onboardingService).toContain('export const QUICK_START_SEED_SITE_SELECT = ');
    expect(onboardingService).toContain('export const QUICK_START_PERSIST_SITE_SELECT = ');
    expect(onboardingService).toContain('export async function requireAuthenticatedOnboardingUser()');
    expect(onboardingService).toContain('supabase.auth.getUser()');
    expect(onboardingService).toContain(".select('id, onboarding_answers, wedding_data')");
    expect(onboardingService).toContain(".select('event_name')");
    expect(onboardingService).toContain("supabase.rpc('wedding_site_settings_patch'");
    expect(onboardingService).toContain("supabase.rpc('wedding_site_bootstrap_write'");
    expect(onboardingService).toContain("supabase.rpc('onboarding_event_seed_insert_many'");
    expect(onboardingService).toContain("supabase.rpc('guest_dashboard_guest_write'");
    expect(onboardingService).toContain('updateWeddingPlanningStatus');
    expect(signupService).toContain('export async function startSignupWithGoogle');
    expect(signupService).toContain('export async function createSignupAccount');
    expect(signupService).toContain('supabase.auth.signInWithOAuth');
    expect(signupService).toContain('supabase.auth.signUp');
    expect(signupService).toContain('supabase.auth.signInWithPassword');
    expect(signupService).toContain("supabase.rpc('wedding_site_bootstrap_write'");
    expect(signupService).toContain(".select('id')");
    expect(onboardingService).not.toContain(".select('*')");
    expect(signupService).not.toContain(".select('*')");
    expect(onboardingService).not.toContain(".from('wedding_sites')\n    .update(");
    expect(onboardingService).not.toContain(".from('itinerary_events').insert(");
    expect(onboardingService).not.toContain(".from('guests').update(");
    expect(onboardingService).not.toContain(".from('guests').insert(");
    expect(signupService).not.toContain(".from('wedding_sites').insert(");
  });

  it('loads the authenticated onboarding user through the service helper', async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: 'user-123' } } });

    await expect(requireAuthenticatedOnboardingUser()).resolves.toEqual({ id: 'user-123' });
  });
});
