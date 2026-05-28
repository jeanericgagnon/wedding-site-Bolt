import React from 'react';
import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GUIDED_SETUP_STORAGE_KEY } from '../../lib/guidedSetupPersistence';
import { supabase } from '../../lib/supabase';
import { resolvePrimaryWeddingSiteId } from '../../lib/guidedSetupSiteResolver';
import { buildOnboardingUpdateWithClarifying } from '../../lib/buildOnboardingUpdateWithClarifying';

type TestChildrenProps = {
  children?: ReactNode;
};

const createGetUserResponse = (userId: string | null): Awaited<ReturnType<typeof supabase.auth.getUser>> => (
  {
    data: {
      user: userId ? ({ id: userId } as unknown) : null,
    },
    error: null,
  } as unknown as Awaited<ReturnType<typeof supabase.auth.getUser>>
);

const navigateMock = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

vi.mock('../../components/ui', () => ({
  Button: ({ children, ...props }: TestChildrenProps & ComponentPropsWithoutRef<'button'> & { fullWidth?: boolean }) => {
    const { fullWidth, ...buttonProps } = props;
    void fullWidth;
    return <button {...buttonProps}>{children}</button>;
  },
  Card: ({ children, ...props }: TestChildrenProps & ComponentPropsWithoutRef<'div'>) => <div {...props}>{children}</div>,
  Input: (props: ComponentPropsWithoutRef<'input'>) => <input {...props} />,
  Textarea: (props: ComponentPropsWithoutRef<'textarea'>) => <textarea {...props} />,
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

vi.mock('../../lib/buildOnboardingUpdateWithClarifying', () => ({ buildOnboardingUpdateWithClarifying: vi.fn(() => ({})) }));
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
    vi.mocked(supabase.auth.getUser).mockResolvedValue(createGetUserResponse(null));
    vi.mocked(resolvePrimaryWeddingSiteId).mockResolvedValue(null);
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
    expect(screen.getByText('Refine access, preview, and share when ready')).toBeInTheDocument();
    expect(screen.getByText('Set the guest-facing access you want, then share once the draft feels solid')).toBeInTheDocument();
    expect(screen.queryByText(/you'?re all set/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/starter wedding site is ready/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/go live when ready/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Import guest CSV' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Review editor options' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Go to dashboard overview' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Go to dashboard' })).not.toBeInTheDocument();
  });

  it('routes the completion primary action straight into guest import continuity', async () => {
    vi.mocked(supabase.auth.getUser).mockResolvedValue(createGetUserResponse('user-1'));
    vi.mocked(resolvePrimaryWeddingSiteId).mockResolvedValue('site-1');
    vi.mocked(buildOnboardingUpdateWithClarifying).mockReturnValue({ planning_status: 'guided_setup_complete' } as never);

    const eqUser = vi.fn(async () => ({ error: null }));
    const eqId = vi.fn(() => ({ eq: eqUser }));
    const update = vi.fn(() => ({ eq: eqId }));
    vi.mocked(supabase.from).mockReturnValue({ update } as never);

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

    fireEvent.click(await screen.findByRole('button', { name: 'Import guest CSV' }));

    await waitFor(() => {
      expect(update).toHaveBeenCalledWith(expect.objectContaining({
        planning_status: 'guided_setup_complete',
      }));
      expect(navigateMock).toHaveBeenCalledWith('/dashboard/guests', {
        state: {
          showWelcome: true,
          nextStep: 'guest-import',
        },
      });
    });
  });

  it('ignores invalid persisted wedding dates when hydrating from the saved site record', async () => {
    vi.mocked(supabase.auth.getUser).mockResolvedValue(createGetUserResponse('user-1'));
    vi.mocked(resolvePrimaryWeddingSiteId).mockResolvedValue('site-1');

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
    vi.mocked(supabase.from).mockReturnValue({ select } as never);

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
