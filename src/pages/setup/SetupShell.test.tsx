import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { emptySetupDraft, readSetupDraft, SELECTED_TEMPLATE_KEY, writeSetupDraft } from '../../lib/setupDraft';
import { getBuilderV2Route } from '../builderCutoverRoute';
import { readBuilderV2SetupBridge } from '../builderV2SetupBridge';

const navigateMock = vi.fn();
const invokeFunctionOrThrowMock = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
    useParams: () => ({}),
  };
});

vi.mock('../../lib/invokeFunctionOrThrow', () => ({
  invokeFunctionOrThrow: (...args: unknown[]) => invokeFunctionOrThrowMock(...args),
}));

vi.mock('../../lib/supabase', () => ({
  supabase: {},
}));

import SetupShell from './SetupShell';

describe('SetupShell', () => {
  beforeEach(() => {
    navigateMock.mockReset();
    invokeFunctionOrThrowMock.mockReset();
    invokeFunctionOrThrowMock.mockResolvedValue({});
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it('bridges saved setup truth into the first Builder V2 draft handoff', async () => {
    writeSetupDraft({
      ...emptySetupDraft,
      migrationSource: 'zola',
      partnerOneFirstName: 'Alex',
      partnerTwoFirstName: 'Jordan',
      weddingDate: '2026-09-18',
      weddingCity: 'Napa',
      weddingRegion: 'CA',
      guestEstimateBand: '100to200',
      stylePreferences: ['Destination', 'Weekend'],
      selectedTemplateId: 'coastal-breeze',
    });

    render(
      <MemoryRouter>
        <SetupShell step="review" />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Save and open Builder V2 draft' }));

    await waitFor(() => {
      expect(invokeFunctionOrThrowMock).toHaveBeenCalled();
    });

    expect(readBuilderV2SetupBridge()).toMatchObject({
      partnerOneFirstName: 'Alex',
      partnerTwoFirstName: 'Jordan',
      weddingCity: 'Napa',
      selectedTemplateId: 'coastal-breeze',
    });
    expect(readSetupDraft()).toEqual({
      ...emptySetupDraft,
      selectedTemplateId: 'coastal-breeze',
    });
    expect(window.localStorage.getItem(SELECTED_TEMPLATE_KEY)).toBe('coastal-breeze');
    expect(navigateMock).toHaveBeenCalledWith(getBuilderV2Route());
  });

  it('keeps the review handoff framed as draft truth instead of launch-ready copy', () => {
    writeSetupDraft({
      ...emptySetupDraft,
      migrationSource: 'other',
      partnerOneFirstName: 'Alex',
      partnerTwoFirstName: 'Jordan',
      weddingDate: '2026-09-18',
      weddingCity: 'Napa',
      weddingRegion: 'CA',
      guestEstimateBand: '100to200',
      stylePreferences: ['Romantic'],
      selectedTemplateId: 'modern-luxe',
    });

    render(
      <MemoryRouter>
        <SetupShell step="review" />
      </MemoryRouter>,
    );

    expect(screen.getByText(/finish the main event details, RSVP settings, and guest list before you treat the draft as ready to share with guests\./i)).toBeInTheDocument();
    expect(screen.queryByText(/launch-ready/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/ready to publish/i)).not.toBeInTheDocument();
  });
});
