import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { GuestCampaignReminderPanel, type GuestCampaignReminderPanelProps } from './GuestCampaignReminderPanel';

const baseProps: GuestCampaignReminderPanelProps = {
  campaignPreset: 'pending',
  campaignReadiness: 80,
  canEditGuests: true,
  contactNoContactCount: 2,
  daysToWedding: 20,
  manualFollowUpCount: 1,
  manualHandledCount: 3,
  reminderCandidates: [{ id: 'guest-1', name: 'Maya Lee', email: 'maya@example.com' }],
  rsvpOps: {
    ceremonyNo: 0,
    missingMeal: 2,
    noResponse: 4,
    pendingNoEmail: 1,
    plusOneMissingName: 1,
    receptionNo: 0,
  },
  segmentLabel: 'Pending',
  showCampaignModal: true,
  showRecipientPreview: false,
  skipRecentlyInvited: true,
  onApplyCampaignPreset: vi.fn(),
  onCloseCampaignModal: vi.fn(),
  onFocusHandledPersonally: vi.fn(),
  onFocusHighRiskFirst: vi.fn(),
  onFocusMissingContact: vi.fn(),
  onFocusMissingMeal: vi.fn(),
  onFocusPending: vi.fn(),
  onFocusPendingNoEmail: vi.fn(),
  onFocusPlusOneNames: vi.fn(),
  onOpenCampaignModal: vi.fn(),
  onSetShowRecipientPreview: vi.fn(),
  onSetSkipRecentlyInvited: vi.fn(),
};

describe('GuestCampaignReminderPanel', () => {
  it('keeps campaign write-prep controls disabled for read-only collaborators', () => {
    render(<GuestCampaignReminderPanel {...baseProps} canEditGuests={false} />);

    expect(screen.getByRole('button', { name: /^open$/i })).toBeDisabled();
    expect(screen.getByRole('checkbox', { name: /skip guests invited/i })).toBeDisabled();
    expect(screen.getByRole('combobox')).toBeDisabled();
  });
});
