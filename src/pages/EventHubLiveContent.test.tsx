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
          ]}
          travelHubSpotlight={{
            summary: '3 travel details ready from the guest hub.',
            travelHref: '/site/alex-jordan-demo#travel',
            cards: [
              { id: 'hotel', label: 'Riverfront House', detail: 'Code THOMPSONRIVERA' },
              { id: 'shuttle', label: 'Ceremony shuttle', detail: 'Riverfront House to Sunset Gardens Estate · 3:45 PM' },
              { id: 'cultural-tip', label: 'Local tip', detail: 'Bring a light layer for the waterfront.' },
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
          dayOfHubStatusBoard={{ readyCount: 2, summary: 'Ready for guests.', items: [] }}
          dayOfModeReadiness={{ readyCount: 2, summary: 'Ready as a no-app guest hub.', signals: [] }}
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
    expect(screen.getByText('Riverfront House')).toBeInTheDocument();
    expect(screen.getByText('Travel plan copied.')).toBeInTheDocument();
    expect(screen.getByText('Latest update')).toBeInTheDocument();
    expect(screen.getByText('Ceremony doors open')).toBeInTheDocument();
    expect(screen.getByText('Your day-of status')).toBeInTheDocument();
    expect(screen.getByText('Alex Rivera')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Copy travel plan' }));
    expect(onCopyTravelPlan).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Save travel guide' }));
    expect(onDownloadTravelGuide).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('link', { name: 'Open travel page' }));
    expect(onTrackClick).toHaveBeenCalledWith('/site/alex-jordan-demo#travel');
  });
});
