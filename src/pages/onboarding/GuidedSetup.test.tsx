import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GUIDED_SETUP_STORAGE_KEY } from '../../lib/guidedSetupPersistence';

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
  },
}));

vi.mock('../../lib/buildOnboardingUpdateWithClarifying', () => ({ buildOnboardingUpdateWithClarifying: vi.fn(() => '') }));
vi.mock('../../lib/faqDraftHelper', () => ({ buildSuggestedFaqDrafts: vi.fn(() => []) }));
vi.mock('../../lib/welcomeNoteHelper', () => ({ buildWelcomeNoteDraft: vi.fn(() => '') }));
vi.mock('../../lib/csvHeaderMatcher', () => ({ findCsvHeaderIndex: vi.fn(() => -1), normalizeCsvHeader: vi.fn((v: string) => v) }));
vi.mock('../../lib/onboardingContinuationCleanup', () => ({ clearAllOnboardingContinuationState: vi.fn() }));
vi.mock('../../lib/guidedSetupSiteResolver', () => ({ resolvePrimaryWeddingSiteId: vi.fn(async () => null) }));
vi.mock('../../lib/signupContinuation', () => ({ writeSignupReturnPath: vi.fn() }));
vi.mock('../../lib/onboardingEntryCleanup', () => ({ clearOnboardingEntryReturnPath: vi.fn() }));
vi.mock('../../lib/guidedSetupErrorCopy', () => ({
  buildGuidedSetupHydrationErrorMessage: vi.fn(() => 'hydrate failed'),
  buildGuidedSetupSaveErrorMessage: vi.fn(() => 'save failed'),
}));
vi.mock('xlsx', () => ({}));

import { GuidedSetup } from './GuidedSetup';

describe('GuidedSetup starter draft wording truth', () => {
  beforeEach(() => {
    navigateMock.mockReset();
    window.localStorage.clear();
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

    expect(screen.getByText("We drafted the core pages from what you shared. Review the starter draft in your dashboard, tighten the details, and only publish once you're ready to share it with guests.")).toBeInTheDocument();
    expect(screen.queryByText(/you'?re all set/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/starter wedding site is ready/i)).not.toBeInTheDocument();
  });
});
