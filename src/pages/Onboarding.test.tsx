import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useSearchParams: () => [new URLSearchParams(''), vi.fn()],
  };
});

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({ user: null, isDemoMode: false }),
}));

vi.mock('../lib/supabase', () => ({
  supabase: {},
}));

vi.mock('../components/ui', () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  Input: (props: any) => <input {...props} />,
  Textarea: (props: any) => <textarea {...props} />,
  Select: ({ children, ...props }: any) => <select {...props}>{children}</select>,
  Card: ({ children, ...props }: any) => <div {...props}>{children}</div>,
}));

vi.mock('../components/ui/Toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

import { Onboarding, getCreateSiteRsvpDeadline, getDemoPartnerNamesFallback, getOnboardingSubdomain, parsePartnerNames } from './Onboarding';
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
});

describe('Onboarding starter draft wording truth', () => {
  beforeEach(() => {
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
    expect(screen.getByText('Answer a few questions and we will generate a strong starting draft. You can keep refining it in your wedding home before you decide to publish.')).toBeInTheDocument();
    expect(screen.queryByText(/ready to publish/i)).not.toBeInTheDocument();
  });
});
