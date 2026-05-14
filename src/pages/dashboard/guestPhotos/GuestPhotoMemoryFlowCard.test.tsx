import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { GuestPhotoMemoryFlowCard } from './GuestPhotoMemoryFlowCard';

describe('GuestPhotoMemoryFlowCard', () => {
  it('renders lane summaries before the detailed memory-flow checklist', () => {
    render(
      <GuestPhotoMemoryFlowCard
        memoryFlowReadiness={{
          readyCount: 5,
          lanes: [
            { id: 'collection', label: 'Collection', detail: '12 uploads across 1 active album, including 1 video.', status: 'ready' },
            { id: 'curation', label: 'Curation', detail: '3 curated picks and 6 slideshow frames are ready for recap review.', status: 'ready' },
            { id: 'sharing', label: 'Sharing', detail: 'Recap is private-link ready with 3 curated picks, including 1 story pick.', status: 'ready' },
            { id: 'handoff', label: 'Handoff', detail: 'Owner handoff export and full-resolution download are ready from 12 reviewed uploads.', status: 'ready' },
          ],
          steps: [
            { id: 'guest-hub', label: 'No-app guest hub', detail: '4 guest actions enabled from the QR hub.', status: 'ready' },
            { id: 'album-links', label: 'Photo upload links', detail: '1 active album can receive uploads.', status: 'ready' },
            { id: 'guestbook', label: 'Guestbook notes', detail: 'Guestbook notes are optional and currently off in the guest hub controls.', status: 'planned' },
            { id: 'video-capture', label: 'Video memories', detail: '1 video captured for the memory flow.', status: 'ready' },
            { id: 'moderation', label: 'Moderation queue', detail: 'No flagged uploads or review items are blocking the current recap.', status: 'ready' },
            { id: 'slideshow', label: 'Slideshow draft', detail: '6 slides ready from 1 album.', status: 'ready' },
            { id: 'recap', label: 'Guest recap', detail: 'Recap is private-link ready with curated picks.', status: 'ready' },
            { id: 'follow-up', label: 'Guest follow-up', detail: '1 guest opt-in available for recap or future-event follow-up.', status: 'ready' },
            { id: 'export', label: 'Photo handoff export', detail: 'Owner handoff sheets and full-resolution download jobs can be saved from reviewed guest uploads.', status: 'ready' },
          ],
          blockers: [],
        }}
      />,
    );

    expect(screen.getByText('Collection')).toBeInTheDocument();
    expect(screen.getByText('Sharing')).toBeInTheDocument();
    expect(screen.getByText('12 uploads across 1 active album, including 1 video.')).toBeInTheDocument();
    expect(screen.getByText('Recap is private-link ready with 3 curated picks, including 1 story pick.')).toBeInTheDocument();
    expect(screen.getByText('Owner handoff export and full-resolution download are ready from 12 reviewed uploads.')).toBeInTheDocument();
    expect(screen.getByText('Photo upload links')).toBeInTheDocument();
    expect(screen.getByText('Guest recap')).toBeInTheDocument();
  });
});
