import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QUICK_START_STORAGE_KEY } from '../../lib/quickStartStateTransfer';

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
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
      getUser: () => Promise.resolve({ data: { user: null } }),
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          order: () => ({
            limit: () => ({
              maybeSingle: () => Promise.resolve({ data: null }),
            }),
          }),
        }),
      }),
    }),
  },
}));

import { QuickStart } from './QuickStart';

describe('QuickStart follow-up navigation', () => {
  beforeEach(() => {
    window.localStorage.clear();
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
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it('returns to the question view when backing out of follow-ups', async () => {
    render(<QuickStart />);

    await screen.findByText('A few smart follow-ups before we build');

    fireEvent.click(screen.getByRole('button', { name: 'Back' }));

    expect(await screen.findByText('When and where are you getting married?')).toBeInTheDocument();
    expect(screen.queryByText('A few smart follow-ups before we build')).not.toBeInTheDocument();
  });
});
