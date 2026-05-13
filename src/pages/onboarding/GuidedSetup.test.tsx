import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GUIDED_SETUP_STORAGE_KEY } from '../../lib/guidedSetupPersistence';
import { supabase } from '../../lib/supabase';
import { resolvePrimaryWeddingSiteId } from '../../lib/guidedSetupSiteResolver';
import { resolveActiveSiteForUser } from '../../lib/activeSite';

const navigateMock = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

vi.mock('../../components/ui', () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  Card: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  Input: (props: any) => <input {...props} />,
  Textarea: (props: any) => <textarea {...props} />,
}));

vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(async () => ({ data: { user: null } })),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(async () => ({ data: null })),
        })),
      })),
    })),
  },
}));

vi.mock('../../lib/buildOnboardingUpdateWithClarifying', () => ({ buildOnboardingUpdateWithClarifying: vi.fn(() => '') }));
vi.mock('../../lib/faqDraftHelper', () => ({ buildSuggestedFaqDrafts: vi.fn(() => []) }));
vi.mock('../../lib/welcomeNoteHelper', () => ({ buildWelcomeNoteDraft: vi.fn(() => '') }));
vi.mock('../../lib/csvHeaderMatcher', () => ({ findCsvHeaderIndex: vi.fn(() => -1), normalizeCsvHeader: vi.fn((v: string) => v) }));
vi.mock('../../lib/onboardingContinuationCleanup', () => ({ clearAllOnboardingContinuationState: vi.fn() }));
vi.mock('../../lib/guidedSetupSiteResolver', () => ({ resolvePrimaryWeddingSiteId: vi.fn(async () => null) }));
vi.mock('../../lib/activeSite', () => ({ resolveActiveSiteForUser: vi.fn(async () => null) }));
vi.mock('../../lib/signupContinuation', () => ({ writeSignupReturnPath: vi.fn() }));
vi.mock('../../lib/onboardingEntryCleanup', () => ({ clearOnboardingEntryReturnPath: vi.fn() }));
vi.mock('../../lib/guidedSetupErrorCopy', () => ({
  buildGuidedSetupHydrationErrorMessage: vi.fn(() => 'hydrate failed'),
  buildGuidedSetupSaveErrorMessage: vi.fn(() => 'save failed'),
}));
import { GuidedSetup, safeGuidedSetupCsvError } from './GuidedSetup';

describe('GuidedSetup starter draft wording truth', () => {
  beforeEach(() => {
    navigateMock.mockReset();
    window.localStorage.clear();
    vi.mocked(supabase.auth.getUser).mockResolvedValue({ data: { user: null } } as any);
    vi.mocked(resolvePrimaryWeddingSiteId).mockResolvedValue(null);
    vi.mocked(resolveActiveSiteForUser).mockResolvedValue(null);
  });

  it('keeps the completion state framed as a starter draft that still needs review before publish', async () => {
    window.localStorage.setItem(GUIDED_SETUP_STORAGE_KEY, JSON.stringify({
      currentStep: 'complete',
      coupleNames: { name1: 'Alex', name2: 'Jordan' },
      formData: {
        weddingDate: '',
        venue: '',
        city: '',
        ourStory: '',
        ceremonyTime: '',
        receptionTime: '',
        attire: '',
        hotelRecommendations: '',
        parking: '',
        rsvpDeadline: '',
        mealOptions: '',
        registryLinks: '',
        customFaqs: '',
        template: 'modern',
        colorScheme: 'romantic',
      },
    }));

    render(<GuidedSetup />);

    await waitFor(() => {
      expect(screen.getByText('Your starter draft is ready to review')).toBeInTheDocument();
    });

    expect(screen.getByText("We drafted the core pages from what you shared. Review the starter draft in your wedding home, tighten the details, and only publish once you're ready to share it with guests.")).toBeInTheDocument();
    expect(screen.queryByText(/you'?re all set/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/starter wedding site is ready/i)).not.toBeInTheDocument();
  });

  it('ignores invalid persisted wedding dates when hydrating from the saved site record', async () => {
    vi.mocked(supabase.auth.getUser).mockResolvedValue({ data: { user: { id: 'user-1' } } } as any);
    vi.mocked(resolvePrimaryWeddingSiteId).mockResolvedValue('site-1');
    vi.mocked(resolveActiveSiteForUser).mockResolvedValue({ id: 'site-1', role: 'owner', permissions: null });

    const maybeSingle = vi.fn(async () => ({
      data: {
        id: 'site-1',
        couple_name_1: 'Alex',
        couple_name_2: 'Jordan',
        wedding_date: 'not-a-date',
        venue_date: '2026-02-30',
        venue_name: 'Sunset Gardens',
        venue_address: '123 Ocean Ave, San Diego, CA 92101',
        wedding_location: 'San Diego',
      },
    }));
    const eq = vi.fn(() => ({ maybeSingle }));
    const select = vi.fn(() => ({ eq }));
    vi.mocked((supabase as any).from).mockReturnValue({ select });

    render(<GuidedSetup />);

    await waitFor(() => {
      expect(maybeSingle).toHaveBeenCalled();
    });

    await waitFor(() => {
      const saved = JSON.parse(window.localStorage.getItem(GUIDED_SETUP_STORAGE_KEY) || '{}');
      expect(saved.formData?.weddingDate).toBe('');
    });
  });
});

describe('safeGuidedSetupCsvError', () => {
  it('keeps spreadsheet format guidance visible', () => {
    expect(safeGuidedSetupCsvError(new Error('Please export your spreadsheet as CSV before importing.'))).toBe(
      'Please export your spreadsheet as CSV before importing.'
    );
  });

  it('hides technical import failures from setup copy', () => {
    expect(safeGuidedSetupCsvError(new Error('Supabase policy rejected insert into guests table'))).toBe(
      'Couldn’t import that guest file. Please check the CSV and try again.'
    );
    expect(safeGuidedSetupCsvError(new Error('duplicate key value violates unique constraint "guests_email_key"'))).toBe(
      'Couldn’t import that guest file. Please check the CSV and try again.'
    );
  });
});
