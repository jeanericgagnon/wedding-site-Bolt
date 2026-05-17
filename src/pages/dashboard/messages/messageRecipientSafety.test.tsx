import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { buildMessageDashboardDerivedState } from './buildMessageDashboardDerivedState';
import { MessageComposerRecipientPreviewPanel } from './MessageDashboardComponents';
import type { Guest } from './messageDashboardTypes';

describe('message recipient safety', () => {
  it('drops malformed guests before deriving preview recipients', () => {
    const validGuest: Guest = {
      id: 'guest-1',
      name: 'Ava Stone',
      first_name: 'Ava',
      last_name: 'Stone',
      email: 'ava@example.com',
      phone: null,
      sms_consent: null,
      preferred_language: 'en',
      rsvp_status: 'pending',
      invitation_sent_at: null,
      reminder_last_sent_at: null,
      mailing_address_line1: null,
      mailing_city: null,
      mailing_state: null,
      mailing_postal_code: null,
      meal_choice: null,
    };

    const derived = buildMessageDashboardDerivedState({
      audienceOptions: [{ value: 'all', label: 'All Guests', count: 2, detail: 'Everyone' }],
      deliveries: [],
      eventGuestIds: {},
      formData: {
        audience: 'all',
        body: 'Hello there',
        channel: 'email',
        scheduleDate: '',
        scheduleTime: '',
      },
      guests: [validGuest, undefined as unknown as Guest],
      hardEmailCap: 1000,
      historyAudienceFilter: 'all',
      historyCampaignFilter: '',
      historyChannelFilter: 'all',
      historyDeliveryFilter: 'all',
      historySearch: '',
      historyStatusFilter: 'all',
      itineraryAudienceOptions: [],
      messages: [],
      weddingSiteSmsCredits: 0,
    });

    expect(derived.activeRecipients).toBe(1);
    expect(derived.previewRecipients).toHaveLength(1);
    expect(derived.previewRecipients[0]?.email).toBe('ava@example.com');
  });

  it('renders the recipient preview even when a malformed guest sneaks through', () => {
    render(
      <MessageComposerRecipientPreviewPanel
        activeRecipients={1}
        formData={{
          campaignName: '',
          templateKey: 'blank',
          subject: '',
          body: '',
          audience: 'all',
          channel: 'email',
          scheduleType: 'now',
          scheduleDate: '',
          scheduleTime: '',
        }}
        onTogglePreview={vi.fn()}
        previewRecipients={[
          undefined as unknown as Guest,
          {
            id: 'guest-1',
            name: 'Ava Stone',
            first_name: 'Ava',
            last_name: 'Stone',
            email: 'ava@example.com',
            phone: null,
            sms_consent: null,
            preferred_language: 'en',
            rsvp_status: 'pending',
            invitation_sent_at: null,
            reminder_last_sent_at: null,
            mailing_address_line1: null,
            mailing_city: null,
            mailing_state: null,
            mailing_postal_code: null,
            meal_choice: null,
          },
        ]}
        showRecipientPreview
      />,
    );

    expect(screen.getByText('Ava Stone')).toBeInTheDocument();
    expect(screen.getByText('ava@example.com')).toBeInTheDocument();
  });
});
