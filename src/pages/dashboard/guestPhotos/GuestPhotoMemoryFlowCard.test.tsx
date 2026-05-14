import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { GuestPhotoMemoryFlowCard } from './GuestPhotoMemoryFlowCard';

describe('GuestPhotoMemoryFlowCard', () => {
  it('renders lane summaries before the detailed memory-flow checklist', () => {
    render(
      <GuestPhotoMemoryFlowCard
        memoryFlowReadiness={{
          readyCount: 5,
          summaryBadges: ['12 uploads live', 'Private recap link', '33% story coverage', 'Handoff ready', '1 opt-in captured'],
          mainGapLabel: null,
          lanes: [
            { id: 'collection', label: 'Collection', detail: '12 uploads across 1 active album, including 1 video.', status: 'ready' },
            { id: 'curation', label: 'Curation', detail: '3 curated picks and 6 slideshow frames are ready for recap review.', status: 'ready' },
            { id: 'sharing', label: 'Sharing', detail: 'Recap is private-link ready with 3 curated picks, including 1 story pick (33% story coverage).', status: 'ready' },
            { id: 'handoff', label: 'Handoff', detail: 'Owner handoff export and full-resolution download are ready from 12 reviewed uploads.', status: 'ready' },
          ],
          steps: [
            { id: 'guest-hub', label: 'No-app guest hub', detail: '4 guest actions enabled from the QR hub.', status: 'ready' },
            { id: 'album-links', label: 'Photo upload links', detail: '1 active album can receive uploads.', status: 'ready' },
            { id: 'guestbook', label: 'Guestbook notes', detail: 'Guestbook notes are optional and currently off in the guest hub controls.', status: 'planned' },
            { id: 'video-capture', label: 'Video memories', detail: '1 video captured for the memory flow.', status: 'ready' },
            { id: 'moderation', label: 'Moderation queue', detail: 'No flagged uploads or review items are blocking the current recap.', status: 'ready' },
            { id: 'slideshow', label: 'Slideshow draft', detail: '6 slides ready from 1 album.', status: 'ready' },
            { id: 'recap', label: 'Guest recap', detail: 'Recap is private-link ready with curated picks and 1 story pick.', status: 'ready' },
            { id: 'follow-up', label: 'Guest follow-up', detail: '1 guest opt-in available for recap or future-event follow-up.', status: 'ready' },
            { id: 'export', label: 'Photo handoff export', detail: 'Owner handoff sheets and full-resolution download jobs can be saved from reviewed guest uploads.', status: 'ready' },
          ],
          blockers: [],
        }}
      />,
    );

    expect(screen.getByText('Collection')).toBeInTheDocument();
    expect(screen.getByText('Sharing')).toBeInTheDocument();
    expect(screen.getByText('12 uploads live')).toBeInTheDocument();
    expect(screen.getByText('Private recap link')).toBeInTheDocument();
    expect(screen.getByText('33% story coverage')).toBeInTheDocument();
    expect(screen.getByText('Handoff ready')).toBeInTheDocument();
    expect(screen.getByText('1 opt-in captured')).toBeInTheDocument();
    expect(screen.getByText('12 uploads across 1 active album, including 1 video.')).toBeInTheDocument();
    expect(screen.getByText('Recap is private-link ready with 3 curated picks, including 1 story pick (33% story coverage).')).toBeInTheDocument();
    expect(screen.getByText('Owner handoff export and full-resolution download are ready from 12 reviewed uploads.')).toBeInTheDocument();
    expect(screen.getByText('Photo upload links')).toBeInTheDocument();
    expect(screen.getByText('Guest recap')).toBeInTheDocument();
  });

  it('shows the main gap when the memory flow still needs work', () => {
    render(
      <GuestPhotoMemoryFlowCard
        memoryFlowReadiness={{
          readyCount: 1,
          summaryBadges: ['No live upload lane', 'Recap not shareable', 'No story curation yet', 'No handoff yet', 'No follow-up opt-ins'],
          mainGapLabel: 'Main gap: Collection',
          lanes: [
            { id: 'collection', label: 'Collection', detail: 'Create an active album and leave uploads on before sharing the memory-flow QR.', status: 'empty' },
            { id: 'curation', label: 'Curation', detail: 'Guest uploads will unlock curation and story-building.', status: 'empty' },
            { id: 'sharing', label: 'Sharing', detail: 'Guest recap sharing will unlock after uploads and curation are in place.', status: 'empty' },
            { id: 'handoff', label: 'Handoff', detail: 'Owner handoff exports will appear after guests start uploading moments.', status: 'empty' },
          ],
          steps: [
            { id: 'guest-hub', label: 'No-app guest hub', detail: 'Turn on at least one guest action before printing the hub QR.', status: 'needs-action' },
            { id: 'album-links', label: 'Photo upload links', detail: 'Create an album before sharing photo upload links.', status: 'empty' },
            { id: 'guestbook', label: 'Guestbook notes', detail: 'Guestbook notes are optional and currently off in the guest hub controls.', status: 'planned' },
            { id: 'video-capture', label: 'Video memories', detail: 'Video upload is supported, but live video capture still needs a proof pass.', status: 'planned' },
            { id: 'moderation', label: 'Moderation queue', detail: 'No uploads to moderate yet.', status: 'empty' },
            { id: 'slideshow', label: 'Slideshow draft', detail: 'Guest uploads will unlock the slideshow draft.', status: 'empty' },
            { id: 'recap', label: 'Guest recap', detail: 'Feature photos or mark story picks before sharing the recap.', status: 'empty' },
            { id: 'follow-up', label: 'Guest follow-up', detail: 'No guest follow-up opt-ins captured yet.', status: 'empty' },
            { id: 'export', label: 'Photo handoff export', detail: 'Guest uploads will unlock owner handoff exports and full-resolution download jobs.', status: 'empty' },
          ],
          blockers: ['Turn on at least one guest action before printing the hub QR.'],
        }}
      />,
    );

    expect(screen.getByText('Main gap: Collection')).toBeInTheDocument();
  });
});
