import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildQuickStartDraftStorageKey, QUICK_START_STORAGE_KEY } from '../../lib/quickStartStateTransfer';

const navigateMock = vi.fn();
let authUser: { id: string; email?: string | null } | null = null;
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

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({
    user: authUser
      ? {
          id: authUser.id,
          email: authUser.email ?? '',
          name: authUser.email ?? authUser.id,
        }
      : null,
    loading: false,
    isDemoMode: false,
    signIn: vi.fn(),
    signOut: vi.fn(),
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
          maybeSingle: () => Promise.resolve({ data: weddingSiteRow }),
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

vi.mock('../../lib/activeSite', () => ({
  resolveActiveSiteForUser: () => Promise.resolve({ id: 'site-1', role: 'owner', permissions: null }),
}));

import { QuickStart } from './QuickStart';

function renderQuickStart() {
  return render(
    <MemoryRouter initialEntries={['/quick-start']}>
      <QuickStart />
    </MemoryRouter>,
  );
}

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
        venueLocation: 'January 17, 2027 in Sayulita, Mexico',
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

    renderQuickStart();

    await screen.findByText('A few useful follow-ups before we build');
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));

    expect(await screen.findByText('When and where are you getting married?')).toBeInTheDocument();
    expect(screen.queryByText('A few useful follow-ups before we build')).not.toBeInTheDocument();
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

    renderQuickStart();

    expect(await screen.findByDisplayValue('Local Couple')).toBeInTheDocument();
  });

  it('migrates email-scoped quick-start drafts into the authenticated user scope', async () => {
    authUser = { id: 'user-1', email: 'alex@example.com' };
    window.localStorage.setItem(buildQuickStartDraftStorageKey('alex@example.com'), JSON.stringify({
      currentIndex: 0,
      showFollowUps: false,
      viewState: 'question',
      initialSetupAnswers: {
        names: 'Scoped Couple',
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

    renderQuickStart();

    expect(await screen.findByDisplayValue('Scoped Couple')).toBeInTheDocument();
    expect(window.localStorage.getItem(buildQuickStartDraftStorageKey('alex@example.com'))).toBeNull();
    expect(window.localStorage.getItem(buildQuickStartDraftStorageKey('user-1'))).toContain('Scoped Couple');
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
        whenWhere: 'January 17, 2027 in Sayulita, Mexico',
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

    renderQuickStart();

    expect(await screen.findByRole('button', { name: /About how many guests are you inviting: 100-150/i })).toBeInTheDocument();
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
        whenWhere: 'January 17, 2027 in Sayulita, Mexico',
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

    renderQuickStart();

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

    renderQuickStart();

    expect(await screen.findByDisplayValue('Alex & Jordan')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Just our names' }));
    fireEvent.change(screen.getByPlaceholderText('January 17, 2027 in Sayulita, Mexico'), {
      target: { value: 'January 17, 2027 in Sayulita, Mexico' },
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

    renderQuickStart();

    expect(await screen.findByDisplayValue('Alex')).toBeInTheDocument();
    expect(screen.queryByDisplayValue(/&/)).not.toBeInTheDocument();
  });
});
