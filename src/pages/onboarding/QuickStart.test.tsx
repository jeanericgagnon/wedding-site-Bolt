import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QUICK_START_STORAGE_KEY } from '../../lib/quickStartStateTransfer';

const { navigateMock, clearAllOnboardingContinuationStateMock } = vi.hoisted(() => ({
  navigateMock: vi.fn(),
  clearAllOnboardingContinuationStateMock: vi.fn(),
}));
let authUser: { id: string } | null = null;
let weddingSiteRow: Record<string, unknown> | null = null;

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: new Proxy({}, {
    get: (_, key: string) => {
      const Component = ({
        children,
        ...props
      }: React.PropsWithChildren<Record<string, unknown>>) => React.createElement(key, props, children);
      Component.displayName = `motion.${key}`;
      return Component;
    },
  }),
}));

vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: () => Promise.resolve({ data: { user: authUser } }),
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          order: () => ({
            limit: () => ({
              maybeSingle: () => Promise.resolve({ data: weddingSiteRow }),
            }),
          }),
        }),
      }),
    }),
  },
}));

vi.mock('../../lib/onboardingContinuationCleanup', () => ({
  clearAllOnboardingContinuationState: clearAllOnboardingContinuationStateMock,
}));

import { QuickStart } from './QuickStart';

describe('QuickStart flow guards', () => {
  beforeEach(() => {
    navigateMock.mockReset();
    clearAllOnboardingContinuationStateMock.mockReset();
    authUser = null;
    weddingSiteRow = null;
    window.localStorage.clear();
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it('returns to the question view when backing out of follow-ups', async () => {
    window.localStorage.setItem(QUICK_START_STORAGE_KEY, JSON.stringify({
      currentIndex: 2,
      showFollowUps: true,
      viewState: 'followups',
      initialSetupAnswers: {
        partnerNames: 'Alex & Jordan',
        venueLocation: 'January 17, 2027 — Sayulita, Mexico',
      },
      followUpAnswers: {
        lodging: 'We will share hotel blocks soon.',
      },
      clarifyingState: {
        clarifying: {
          mode: 'ask',
          questions: [
            {
              id: 'lodging',
              category: 'travel',
              question: 'Where should guests stay?',
              expectedAnswerType: 'text',
              targetFields: ['travel.lodging'],
              affectedSections: ['travel'],
              skippable: true,
              round: 1,
              status: 'pending',
              answer: '',
            },
          ],
          history: [],
        },
        draftOutputs: {},
      },
    }));

    render(<QuickStart />);

    await screen.findByText('A few follow-ups before we build');
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));

    expect(await screen.findByText('Want to add your story? (totally optional)')).toBeInTheDocument();
    expect(screen.queryByText('A few follow-ups before we build')).not.toBeInTheDocument();
  });

  it('does not clobber a blank input when hydration lands after mount', async () => {
    window.localStorage.setItem(QUICK_START_STORAGE_KEY, JSON.stringify({
      currentIndex: 0,
      showFollowUps: false,
      viewState: 'question',
      initialSetupAnswers: {
        names: 'Local Couple',
        labelPreference: 'names-only',
        customLabelPartnerOne: '',
        customLabelPartnerTwo: '',
        whenWhere: '',
        venueNameOrTbd: '',
        style: '',
        guestFeel: '',
        weekendEventsRaw: '',
        ceremonyArrivalTime: '',
        guestCountBand: '',
        plusOnePolicy: '',
        childrenAllowed: '',
        rsvpDeadline: '',
        mealChoice: '',
        registryIntent: '',
        optionalStory: '',
      },
      followUpAnswers: {},
      clarifyingState: null,
    }));

    render(<QuickStart />);

    expect(await screen.findByDisplayValue('Local Couple')).toBeInTheDocument();
  });

  it('shows human-readable labels for prior choice answers', async () => {
    window.localStorage.setItem(QUICK_START_STORAGE_KEY, JSON.stringify({
      currentIndex: 9,
      showFollowUps: false,
      viewState: 'question',
      initialSetupAnswers: {
        names: 'Alex & Jordan',
        labelPreference: 'names-only',
        customLabelPartnerOne: '',
        customLabelPartnerTwo: '',
        whenWhere: 'January 17, 2027 — Sayulita, Mexico',
        venueNameOrTbd: 'Amor Boutique Hotel',
        style: 'Tropical, relaxed',
        guestFeel: 'Warm, excited, relaxed',
        weekendEventsRaw: 'Friday welcome drinks, Saturday wedding, Sunday brunch',
        ceremonyArrivalTime: '4:30 PM',
        guestCountBand: '100-150',
        plusOnePolicy: '',
        childrenAllowed: '',
        rsvpDeadline: '',
        mealChoice: '',
        registryIntent: '',
        optionalStory: '',
      },
      followUpAnswers: {},
      clarifyingState: null,
    }));

    render(<QuickStart />);

    expect(await screen.findByRole('button', { name: /About how many guests are you inviting: 100–150/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /About how many guests are you inviting: 100-150/i })).not.toBeInTheDocument();
  });

  it('keeps the AI helper copy framed as assisted draft help instead of a smart autopilot', async () => {
    window.localStorage.setItem(QUICK_START_STORAGE_KEY, JSON.stringify({
      currentIndex: 2,
      showFollowUps: true,
      viewState: 'followups',
      initialSetupAnswers: {
        partnerNames: 'Alex & Jordan',
        venueLocation: 'January 17, 2027 — Sayulita, Mexico',
      },
      followUpAnswers: {},
      clarifyingState: {
        clarifying: {
          mode: 'ask',
          questions: [
            {
              id: 'lodging',
              category: 'travel',
              question: 'Where should guests stay?',
              expectedAnswerType: 'text',
              targetFields: ['travel.lodging'],
              affectedSections: ['travel'],
              skippable: true,
              round: 1,
              status: 'pending',
              answer: '',
            },
          ],
          history: [],
        },
        draftOutputs: {},
      },
    }));

    render(<QuickStart />);

    expect(await screen.findByText('AI-assisted draft help, with the real product flow behind it')).toBeInTheDocument();
    expect(screen.getByText('A few follow-ups before we build')).toBeInTheDocument();
    expect(screen.getByText('We already have enough to draft. These are just the highest-leverage details the draft still needs.')).toBeInTheDocument();
    expect(screen.queryByText('A few smart follow-ups before we build')).not.toBeInTheDocument();
    expect(screen.queryByText('These are just the highest-leverage details the AI still wants.')).not.toBeInTheDocument();
  });

  it('sends switch-to-manual-setup into structured onboarding instead of the generic dashboard', async () => {
    window.localStorage.setItem(QUICK_START_STORAGE_KEY, JSON.stringify({
      currentIndex: 0,
      showFollowUps: false,
      viewState: 'question',
      initialSetupAnswers: {
        names: 'Alex & Jordan',
      },
      followUpAnswers: {},
      clarifyingState: null,
    }));

    render(<QuickStart />);

    expect(await screen.findByDisplayValue('Alex & Jordan')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Switch to manual setup' }));

    expect(clearAllOnboardingContinuationStateMock).toHaveBeenCalledTimes(1);
    expect(navigateMock).toHaveBeenCalledWith('/onboarding?bypassPayment=1');
    expect(navigateMock).not.toHaveBeenCalledWith('/dashboard?bypassPayment=1');
  });


  it('clamps oversized restored question indexes before rendering', async () => {
    window.localStorage.setItem(QUICK_START_STORAGE_KEY, JSON.stringify({
      currentIndex: Number.MAX_SAFE_INTEGER,
      showFollowUps: false,
      viewState: 'question',
      initialSetupAnswers: {
        names: 'Alex & Jordan',
        labelPreference: 'names-only',
        customLabelPartnerOne: '',
        customLabelPartnerTwo: '',
        whenWhere: 'January 17, 2027 — Sayulita, Mexico',
        venueNameOrTbd: 'Amor Boutique Hotel',
        style: 'Tropical, relaxed',
        guestFeel: 'Warm, excited, relaxed',
        weekendEventsRaw: 'Friday welcome drinks, Saturday wedding, Sunday brunch',
        ceremonyArrivalTime: '4:30 PM',
        guestCountBand: '100-150',
        plusOnePolicy: 'all',
        childrenAllowed: 'yes',
        rsvpDeadline: '2026-12-01',
        mealChoice: 'yes',
        registryIntent: 'both',
        optionalStory: '',
      },
      followUpAnswers: {},
      clarifyingState: null,
    }));

    render(<QuickStart />);

    expect(await screen.findByText('Want to add your story? (totally optional)')).toBeInTheDocument();
    expect(JSON.parse(window.localStorage.getItem(QUICK_START_STORAGE_KEY) || '{}').currentIndex).toBe(13);
  });

  it('sanitizes malformed onboarding answer seeds loaded from the saved wedding site', async () => {
    authUser = { id: 'user-1' };
    weddingSiteRow = {
      onboarding_answers: {
        names: ' Alex & Jordan ',
        guestCountBand: 'tons',
        plusOnePolicy: ['all'],
        mealChoice: ' yes ',
        venueNameOrTbd: ' La Valencia ',
      },
    };

    render(<QuickStart />);

    expect(await screen.findByDisplayValue('Alex & Jordan')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Just our names' }));
    fireEvent.change(screen.getByPlaceholderText('January 17, 2027 — Sayulita, Mexico'), {
      target: { value: 'January 17, 2027 — Sayulita, Mexico' },
    });
    fireEvent.click(await screen.findByRole('button', { name: 'Continue' }));

    expect(await screen.findByDisplayValue('La Valencia')).toBeInTheDocument();
    expect(screen.queryByDisplayValue('tons')).not.toBeInTheDocument();
  });

  it('keeps seeded couple names truthful when saved site partner names contain only whitespace', async () => {
    authUser = { id: 'user-1' };
    weddingSiteRow = {
      couple_name_1: '   ',
      couple_name_2: ' Alex ',
      wedding_date: null,
      venue_name: null,
      venue_location: null,
      onboarding_answers: null,
    };

    render(<QuickStart />);

    expect(await screen.findByDisplayValue('Alex')).toBeInTheDocument();
    expect(screen.queryByDisplayValue(/&/)).not.toBeInTheDocument();
  });
});
