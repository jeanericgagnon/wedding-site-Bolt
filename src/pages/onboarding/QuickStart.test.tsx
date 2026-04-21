import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QUICK_START_STORAGE_KEY } from '../../lib/quickStartStateTransfer';

const navigateMock = vi.fn();
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
      const Component = ({ children, ...props }: any) => React.createElement(key, props, children);
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

import { QuickStart } from './QuickStart';

describe('QuickStart flow guards', () => {
  beforeEach(() => {
    navigateMock.mockReset();
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

    await screen.findByText('A few smart follow-ups before we build');
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));

    expect(await screen.findByText('When and where are you getting married?')).toBeInTheDocument();
    expect(screen.queryByText('A few smart follow-ups before we build')).not.toBeInTheDocument();
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
});
