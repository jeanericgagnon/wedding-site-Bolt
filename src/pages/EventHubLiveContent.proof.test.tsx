import { MemoryRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Camera } from 'lucide-react';
import { EventHubLiveContent } from './EventHubLiveContent';

vi.mock('../components/site/OwnerPreviewBanner', () => ({
  OwnerPreviewBanner: () => null,
}));

vi.mock('../components/ui/LanguageSwitcher', () => ({
  LanguageSwitcher: () => <div>Language switcher</div>,
}));

vi.mock('./EventHubConfigStatusCard', () => ({
  EventHubConfigStatusCard: () => null,
}));

describe('EventHubLiveContent proof slice', () => {
  it('renders the core guest-hub travel and readiness surfaces with invite-scoped readback', () => {
    render(
      <MemoryRouter>
        <EventHubLiveContent
          t={(key) => key}
          coupleLabel="Alex & Jordan"
          weddingDateLabel="June 15, 2026"
          customMessage={null}
          actionSummary="RSVP, travel, and photos"
          hubConfigStatus="ready"
          onRetryConfig={() => {}}
          actions={[
            {
              id: 'updates',
              title: 'Latest update',
              description: 'Jump to the latest day-of guidance.',
              href: '/event/alex-jordan-demo#day-of-updates',
              icon: Camera,
            },
          ]}
          onTrackClick={() => {}}
          travelGuestJourney={[
            { id: 'travel', label: 'Travel details', detail: 'Open the travel section.', href: '/site/alex-jordan-demo#travel', status: 'ready' },
            { id: 'rsvp', label: 'Reply', detail: 'Confirm attendance from the same hub.', href: '', status: 'needs-info' },
          ]}
          travelHubSpotlight={{
            summary: '4 travel details ready from the guest hub, including 1 visible event window for this invitation.',
            travelHref: '/site/alex-jordan-demo#travel',
            badges: ['Invite-scoped', '1 event window'],
            mainGapLabel: null,
            cards: [
              { id: 'hotel', label: 'Riverfront House', detail: 'Code THOMPSONRIVERA', href: 'https://riverfront.example.com/stay' },
            ],
            shareText: 'DayOf travel quick plan',
            htmlDocument: '<!doctype html><html><body>Travel guide</body></html>',
            filename: 'alex-jordan-demo-travel-guide.html',
          }}
          travelShareStatus="Travel plan copied."
          onCopyTravelPlan={() => {}}
          onDownloadTravelGuide={() => {}}
          hubUrl="https://dayof.love/event/alex-jordan-demo"
          searchParams={new URLSearchParams('')}
          shouldOpenHubDetailsByDefault={() => false}
          dayOfHubStatusBoard={{
            readyCount: 2,
            summary: 'Ready for guests.',
            items: [
              { id: 'photos', label: 'Photo upload', detail: 'Uploads are live from this guest hub.', state: 'ready' },
              { id: 'schedule', label: 'Schedule detail', detail: 'A few timing notes still need guest-safe copy.', state: 'needs-content' },
            ],
          }}
          dayOfModeReadiness={{
            readyCount: 2,
            summary: 'Ready as a no-app guest hub.',
            signals: [
              { id: 'hub', label: 'Guest hub', detail: 'The live guest hub can already be shared.', state: 'ready' },
              { id: 'copy', label: 'Guest-safe copy', detail: 'A few help-desk notes still need guest-safe wording.', state: 'needs-content' },
            ],
          }}
          announcementCard={{
            title: 'Ceremony doors open',
            detail: 'Shuttle leaves the hotel at 3:00 PM.',
            stateLabel: 'Scheduled',
            stateExplainer: 'This message is scheduled for later and has not gone out yet.',
            timingLabel: 'Scheduled for May 14, 3:00 PM',
          }}
          guestStateCard={{
            guestLabel: 'Alex Rivera',
            rsvpLabel: 'RSVP confirmed',
            checkInLabel: 'Not checked in yet',
            summary: 'RSVP confirmed · Use this page for the latest day-of status.',
          }}
          coordinatorHandoffCard={{
            eventLabel: 'Ceremony',
            statusLabel: 'Staffed',
            staffLabel: 'Morgan · Avery',
            noteLabel: 'Use the hotel porte-cochere if the main drive is full.',
            updatedLabel: 'Updated May 14, 2:40 PM',
            summary: 'Ceremony · Staffed',
          }}
          linkAccessCard={{
            title: 'Guest-specific link',
            badgeLabel: 'Guest-specific',
            detail: 'This link includes invite-only event details plus RSVP and check-in readback for Alex Rivera.',
            summary: 'This link is ready for guest-specific RSVP and check-in readback.',
            actionCountLabel: '4 guest actions are ready from this link.',
            actionSummaryLabel: 'RSVP, latest updates, travel details, and photo upload',
            readyCoreActionCountLabel: '3 of 4 core day-of actions are ready from this link.',
            coreActionCoverageLabel: '75% core day-of coverage is ready from this link (3 of 4).',
            coreActionSummaryLabel: '1 of 4 core day-of actions is still missing from this link: schedule.',
            mainGapLabel: 'Main gap: Add schedule to this link.',
          }}
          guestName=""
          guestContact=""
          wantsOwnEventInfo={false}
          savingOptIn={false}
          optInStatus={null}
          onGuestNameChange={() => {}}
          onGuestContactChange={() => {}}
          onToggleOwnEventInfo={() => {}}
          onSubmitOptIn={(event) => event.preventDefault()}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText('Travel plan from this link')).toBeInTheDocument();
    expect(screen.getByText('Ready from this link: Travel details.')).toBeInTheDocument();
    expect(screen.getByText('Still missing from this link: Reply.')).toBeInTheDocument();
    expect(screen.getByText('Live guest-hub readiness')).toBeInTheDocument();
    expect(screen.getByText('No-app guest-hub readiness')).toBeInTheDocument();
    expect(screen.getByText('Guest-specific link')).toBeInTheDocument();
    expect(screen.getByText('This link is ready for guest-specific RSVP and check-in readback.')).toBeInTheDocument();
    expect(screen.getByText('4 guest actions are ready from this link.')).toBeInTheDocument();
    expect(screen.getByText('3 of 4 core day-of actions are ready from this link.')).toBeInTheDocument();
    expect(screen.getByText('Main gap: Add schedule to this link.')).toBeInTheDocument();
  });
});
