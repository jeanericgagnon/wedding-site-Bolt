import { MemoryRouter } from 'react-router-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Camera } from 'lucide-react';
import { EventHubLiveContent } from './EventHubLiveContent';

describe('EventHubLiveContent', () => {
  it('renders the travel quick plan spotlight when structured travel details are available', () => {
    const onTrackClick = vi.fn();
    const onCopyTravelPlan = vi.fn();
    const onDownloadTravelGuide = vi.fn();

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
            {
              id: 'photos',
              title: 'Upload photos',
              description: 'Share the weekend',
              href: '/photos/upload?site=alex-jordan-demo',
              icon: Camera,
            },
          ]}
          onTrackClick={onTrackClick}
          travelGuestJourney={[
            { id: 'travel', label: 'Travel details', detail: 'Open the travel section.', href: '/site/alex-jordan-demo#travel', status: 'ready' },
            { id: 'rsvp', label: 'Reply', detail: 'Confirm attendance and any event-specific details from the same hub.', href: '', status: 'needs-info' },
          ]}
          travelHubSpotlight={{
            summary: '4 travel details ready from the guest hub, including 1 visible event window for this invitation.',
            travelHref: '/site/alex-jordan-demo#travel',
            badges: ['Invite-scoped', '1 event window', '1 route card', '1 booking link', 'Stay ready', 'Weekend timing ready', 'Arrival ready'],
            mainGapLabel: null,
            cards: [
              { id: 'hotel', label: 'Riverfront House', detail: 'Code THOMPSONRIVERA', href: 'https://riverfront.example.com/stay' },
              { id: 'flight-info', label: 'Arrival guidance', detail: 'Fly into OAK or SFO and leave time for bridge traffic.' },
              { id: 'shuttle', label: 'Ceremony shuttle', detail: 'Riverfront House to Sunset Gardens Estate · 3:45 PM' },
              { id: 'venue-route-0', label: 'Directions · Sunset Gardens Estate', detail: '100 Harbor Road, Sausalito, CA', href: 'https://maps.google.com/?q=Sunset%20Gardens%20Estate%20100%20Harbor%20Road%2C%20Sausalito%2C%20CA' },
            ],
            shareText: 'DayOf travel quick plan',
            htmlDocument: '<!doctype html><html><body>Travel guide</body></html>',
            filename: 'alex-jordan-demo-travel-guide.html',
          }}
          travelShareStatus="Travel plan copied."
          onCopyTravelPlan={onCopyTravelPlan}
          onDownloadTravelGuide={onDownloadTravelGuide}
          hubUrl="https://dayof.love/event/alex-jordan-demo"
          searchParams={new URLSearchParams('')}
          shouldOpenHubDetailsByDefault={() => false}
          dayOfHubStatusBoard={{
            readyCount: 2,
            summary: 'Ready for guests.',
            items: [
              { id: 'photos', label: 'Photo upload', detail: 'Uploads are live from this guest hub.', state: 'ready' },
              { id: 'schedule', label: 'Schedule detail', detail: 'A few timing notes still need guest-safe copy.', state: 'needs-content' },
              { id: 'transport', label: 'Transport reminder', detail: 'Shuttle reminders stay planned until the final route is locked.', state: 'planned' },
            ],
          }}
          dayOfModeReadiness={{
            readyCount: 2,
            summary: 'Ready as a no-app guest hub.',
            signals: [
              { id: 'hub', label: 'Guest hub', detail: 'The live guest hub can already be shared.', state: 'ready' },
              { id: 'copy', label: 'Guest-safe copy', detail: 'A few help-desk notes still need guest-safe wording.', state: 'needs-content' },
              { id: 'fallback', label: 'Printed fallback', detail: 'Printed fallback cards stay planned until export is finalized.', state: 'planned' },
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
            title: 'Private guest link',
            badgeLabel: 'Guest-specific',
            detail: 'This link includes invite-only event details plus RSVP and check-in readback for Alex Rivera.',
            summary: 'Guest-specific access is active for this link, including RSVP and check-in readback.',
            actionCountLabel: '4 guest actions are ready from this link.',
            actionSummaryLabel: 'RSVP, day-of updates, travel, and photo upload',
            readyCoreActionCountLabel: '3 of 4 core day-of actions are already ready from this link.',
            coreActionCoverageLabel: '75% core day-of coverage is ready from this link (3 of 4).',
            coreActionSummaryLabel: 'Still missing from this link: schedule.',
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

    expect(screen.getByText('Travel quick plan')).toBeInTheDocument();
    expect(screen.getByText('1 ready · 1 needs setup')).toBeInTheDocument();
    expect(screen.getByText('1 step still need setup before this path feels complete.')).toBeInTheDocument();
    expect(screen.getByText('Ready now: Travel details.')).toBeInTheDocument();
    expect(screen.getByText('Still missing: Reply.')).toBeInTheDocument();
    expect(screen.getByText('Travel step ready')).toBeInTheDocument();
    expect(screen.getByText('Travel step needs setup')).toBeInTheDocument();
    expect(screen.getByText('Mode ready')).toBeInTheDocument();
    expect(screen.getByText('Mode needs info')).toBeInTheDocument();
    expect(screen.getByText('Mode planned')).toBeInTheDocument();
    expect(screen.getByText('2 mode items ready')).toBeInTheDocument();
    expect(screen.getByText('Hub item ready')).toBeInTheDocument();
    expect(screen.getByText('Hub item needs info')).toBeInTheDocument();
    expect(screen.getByText('Hub item planned')).toBeInTheDocument();
    expect(screen.getByText('2 hub items ready')).toBeInTheDocument();
    expect(screen.getByText('Invite-scoped')).toBeInTheDocument();
    expect(screen.getByText('1 event window')).toBeInTheDocument();
    expect(screen.getByText('1 route card')).toBeInTheDocument();
    expect(screen.getByText('Stay ready')).toBeInTheDocument();
    expect(screen.getByText('Weekend timing ready')).toBeInTheDocument();
    expect(screen.getByText('Arrival ready')).toBeInTheDocument();
    expect(screen.queryByText(/Main gap: Stay details/i)).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Riverfront House/i })).toHaveAttribute('href', 'https://riverfront.example.com/stay');
    expect(screen.getByText('Arrival guidance')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Directions · Sunset Gardens Estate/i })).toHaveAttribute('href', 'https://maps.google.com/?q=Sunset%20Gardens%20Estate%20100%20Harbor%20Road%2C%20Sausalito%2C%20CA');
    expect(screen.getByText('Travel plan copied.')).toBeInTheDocument();
    expect(screen.getAllByText('Latest update')).toHaveLength(2);
    expect(screen.getByText('Ceremony doors open')).toBeInTheDocument();
    expect(screen.getByText('Your day-of status')).toBeInTheDocument();
    expect(screen.getByText('Alex Rivera')).toBeInTheDocument();
    expect(screen.getByText('Coordinator handoff')).toBeInTheDocument();
    expect(screen.getByText('Morgan · Avery')).toBeInTheDocument();
    expect(screen.getByText('Link access')).toBeInTheDocument();
    expect(screen.getByText('Private guest link')).toBeInTheDocument();
    expect(screen.getByText('Guest-specific access is active for this link, including RSVP and check-in readback.')).toBeInTheDocument();
    expect(screen.getByText('Available from this link')).toBeInTheDocument();
    expect(screen.getByText('4 guest actions are ready from this link.')).toBeInTheDocument();
    expect(screen.getByText('RSVP, day-of updates, travel, and photo upload')).toBeInTheDocument();
    expect(screen.getByText('Core day-of actions')).toBeInTheDocument();
    expect(screen.getByText('3 of 4 core day-of actions are ready from this link.')).toBeInTheDocument();
    expect(screen.getByText('Still missing from this link: schedule.')).toBeInTheDocument();
    expect(screen.getByText('Main gap: Add schedule to this link.')).toBeInTheDocument();
    expect(screen.getByText('Hub readiness details')).toBeInTheDocument();
    expect(document.getElementById('day-of-updates')).not.toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Copy travel plan' }));
    expect(onCopyTravelPlan).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Save travel guide' }));
    expect(onDownloadTravelGuide).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('link', { name: 'Open travel page' }));
    expect(onTrackClick).toHaveBeenCalledWith('/site/alex-jordan-demo#travel');

    fireEvent.click(screen.getByRole('link', { name: /Latest update/i }));
    expect(onTrackClick).toHaveBeenCalledWith('/event/alex-jordan-demo#day-of-updates');

    fireEvent.click(screen.getByRole('link', { name: /Directions · Sunset Gardens Estate/i }));
    expect(onTrackClick).toHaveBeenCalledWith('https://maps.google.com/?q=Sunset%20Gardens%20Estate%20100%20Harbor%20Road%2C%20Sausalito%2C%20CA');
  });
});
