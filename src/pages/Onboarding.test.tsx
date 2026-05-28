import React, { type ComponentPropsWithoutRef, type ReactNode } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const navigateMock = vi.fn();
const authState = { user: null as { id: string; email?: string | null } | null, isDemoMode: false };

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
    useSearchParams: () => [new URLSearchParams(''), vi.fn()],
  };
});

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => authState,
}));

vi.mock('../lib/supabase', () => ({
  supabase: {},
}));

type ChildrenProps = {
  children?: ReactNode;
};

vi.mock('../components/ui', () => ({
  Button: ({
    children,
    variant,
    size,
    fullWidth,
    ...props
  }: ChildrenProps & ComponentPropsWithoutRef<'button'> & {
    variant?: string;
    size?: string;
    fullWidth?: boolean;
  }) => {
    void variant;
    void size;
    void fullWidth;
    return <button {...props}>{children}</button>;
  },
  Input: (props: ComponentPropsWithoutRef<'input'>) => <input {...props} />,
  Textarea: (props: ComponentPropsWithoutRef<'textarea'>) => <textarea {...props} />,
  Select: ({
    children,
    variant,
    size,
    ...props
  }: ChildrenProps & ComponentPropsWithoutRef<'select'> & {
    variant?: string;
    size?: string;
  }) => {
    void variant;
    void size;
    return <select {...props}>{children}</select>;
  },
  Card: ({
    children,
    variant,
    padding,
    ...props
  }: ChildrenProps & ComponentPropsWithoutRef<'div'> & {
    variant?: string;
    padding?: string;
  }) => {
    void variant;
    void padding;
    return <div {...props}>{children}</div>;
  },
}));

import { Onboarding, getCreateSiteRsvpDeadline, getDemoPartnerNamesFallback, getOnboardingCompletionFallbackRoute, getOnboardingSubdomain, parsePartnerNames } from './Onboarding';
import { buildOnboardingUpdateWithClarifying } from '../lib/buildOnboardingUpdateWithClarifying';

describe('Onboarding partner name truth helpers', () => {
  it('keeps a single partner name truthful instead of inventing a second partner', () => {
    expect(parsePartnerNames('Alex')).toEqual(['Alex']);
  });

  it('builds a clean completion subdomain when only one partner name exists', () => {
    expect(getOnboardingSubdomain('Alex')).toBe('alex.dayof.love');
  });

  it('uses the shared demo fallback without leaving broken ampersands', () => {
    expect(getDemoPartnerNamesFallback()).toBeTruthy();
    expect(getDemoPartnerNamesFallback()).not.toMatch(/&\s*$/);
  });

  it('prefers the normalized onboarding RSVP deadline over raw create-site input', () => {
    const onboardingUpdate = buildOnboardingUpdateWithClarifying({
      coupleNames: { name1: 'Alex', name2: 'Jordan' },
      planningStatus: 'guided_setup_complete',
      template: 'generated-modern-luxe',
      rsvpDeadline: '2026-05-15',
    }) as Record<string, unknown>;

    expect(getCreateSiteRsvpDeadline(onboardingUpdate, { rsvp_deadline: 'not-a-date' })).toBe('2026-05-15');
  });

  it('keeps the completion fallback route anchored to the overview workspace', () => {
    expect(getOnboardingCompletionFallbackRoute()).toBe('/dashboard/overview');
  });
});

describe('Onboarding starter draft wording truth', () => {
  const writeDraft = (draft: Record<string, unknown>) => {
    window.localStorage.setItem('dayoflove:onboarding-draft', JSON.stringify(draft));
  };

  beforeEach(() => {
    navigateMock.mockReset();
    authState.user = null;
    authState.isDemoMode = false;
    window.localStorage.clear();
  });



  it('clears malformed onboarding continuation state on restore failure', async () => {
    window.localStorage.setItem('dayoflove:onboarding-draft', '{bad json');
    window.localStorage.setItem('dayoflove:onboarding-resume-hint', 'first-incomplete');
    window.localStorage.setItem('dayoflove:onboarding-resume-index', '9');
    window.localStorage.setItem('dayoflove:signup-return-path', '/onboarding/quick-start');

    render(<Onboarding />);

    await waitFor(() => {
      const restoredDraft = JSON.parse(window.localStorage.getItem('dayoflove:onboarding-draft') || '{}');
      expect(restoredDraft.step).toBe('choice');
      expect(restoredDraft.conversationIndex).toBe(0);
      expect(window.localStorage.getItem('dayoflove:onboarding-resume-hint')).toBeNull();
      expect(window.localStorage.getItem('dayoflove:onboarding-resume-index')).toBeNull();
      expect(window.localStorage.getItem('dayoflove:signup-return-path')).toBeNull();
    });
  });



  it('ignores malformed onboarding resume indexes while keeping the chooser stable', async () => {
    window.localStorage.setItem('dayoflove:onboarding-draft', JSON.stringify({ step: 'choice', conversationIndex: 0 }));
    window.localStorage.setItem('dayoflove:onboarding-resume-hint', 'question');
    window.localStorage.setItem('dayoflove:onboarding-resume-index', '9.5');

    render(<Onboarding />);

    await waitFor(() => {
      expect(screen.getByText('Start with the essentials')).toBeInTheDocument();
      expect(window.localStorage.getItem('dayoflove:onboarding-resume-index')).toBeNull();
    });
  });

  it('frames quick setup as a starter draft that still needs dashboard refinement before publish', () => {
    render(<Onboarding />);

    expect(screen.getByText('Starter draft only (fastest)')).toBeInTheDocument();
    expect(screen.getByText('Answer a few questions and we will generate a strong starting draft. You can keep refining it in the dashboard before you decide to publish.')).toBeInTheDocument();
    expect(screen.queryByText(/ready to publish/i)).not.toBeInTheDocument();
  });

  it('restores follow-up review copy as draft help instead of smart AI build language', async () => {
    writeDraft({
      step: 'quick-3',
      conversationIndex: 8,
      initialSetupAnswers: {
        names: 'Alex & Jordan',
        whenWhere: '2027-01-17 — Beach Town',
        venueNameOrTbd: 'Ocean House',
        style: 'Coastal',
        weekendEventsRaw: 'Welcome dinner and wedding',
        guestCountBand: '50-100',
        plusOnePolicy: 'some',
        rsvpDeadline: '2026-12-01',
      },
      followUpAnswers: {
        'story-detail': 'We met on a rainy Tuesday.',
      },
      showFollowUpReview: true,
    });

    render(<Onboarding />);

    expect(await screen.findByText('A few follow-ups before we build')).toBeInTheDocument();
    expect(screen.getByText('We already have enough to generate a strong baseline draft. These are the highest-leverage details that would make it feel more personal.')).toBeInTheDocument();
    expect(screen.queryByText('A few smart follow-ups before we build')).not.toBeInTheDocument();
  });

  it('restores theme guidance with draft-safe labels instead of AI-led defaults', async () => {
    render(<Onboarding />);

    fireEvent.click(screen.getByRole('button', { name: /start guided setup/i }));
    fireEvent.change(screen.getByPlaceholderText('Alex & Jordan'), {
      target: { name: 'partnerNames', value: 'Alex & Jordan' },
    });
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));
    fireEvent.change(screen.getByPlaceholderText('January 17, 2027 — Sayulita, Mexico'), {
      target: { name: 'venueLocation', value: '2027-01-17 — Beach Town' },
    });
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));
    fireEvent.click(screen.getByRole('button', { name: /skip for now/i }));

    expect(await screen.findByText('Draft guidance state')).toBeInTheDocument();
    expect(screen.getByText('Suggested starting point')).toBeInTheDocument();
    expect(screen.queryByText('AI guidance state')).not.toBeInTheDocument();
    expect(screen.queryByText('Smart default')).not.toBeInTheDocument();
  });

  it('sends manual setup straight to the builder after creating the starter site shell', async () => {
    authState.user = { id: 'user-1', email: 'alex@example.com' };

    const single = vi.fn(async () => ({ data: { id: 'site-1' }, error: null }));
    const insertSelect = vi.fn(() => ({ single }));
    const insert = vi.fn(() => ({ select: insertSelect }));
    const maybeSingle = vi.fn(async () => ({ data: null }));
    const existingSiteEq = vi.fn(() => ({ maybeSingle }));
    const existingSiteSelect = vi.fn(() => ({ eq: existingSiteEq }));

    const fromMock = vi.fn((table: string) => {
      if (table === 'wedding_sites') {
        return {
          insert,
          select: existingSiteSelect,
        };
      }
      if (table === 'itinerary_events') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(async () => ({ data: [], error: null })),
          })),
        };
      }
      throw new Error(`Unexpected table: ${table}`);
    });

    const { supabase } = await import('../lib/supabase');
    ((supabase as unknown) as { from: typeof fromMock }).from = fromMock;

    render(<Onboarding />);

    fireEvent.click(screen.getByRole('button', { name: 'Go to Builder' }));

    await waitFor(() => {
      expect(insert).toHaveBeenCalled();
      expect(navigateMock).toHaveBeenCalledWith('/dashboard/builder');
    });
  });

});
