import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { GuestPhotoMemoryFlowCard } from './GuestPhotoMemoryFlowCard';

describe('GuestPhotoMemoryFlowCard', () => {
  it('renders lane summaries before the detailed memory-flow checklist', () => {
    render(
      <GuestPhotoMemoryFlowCard
        memoryFlowReadiness={{
          readyCount: 5,
          summaryBadges: ['4 of 4 memory lanes ready', '89% step coverage', '8 of 9 memory steps ready', '12 uploads live across 1 active album', 'Private recap link', '33% story coverage', 'Handoff ready', '1 opt-in captured'],
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
    expect(screen.getByText('4 of 4 memory lanes ready')).toBeInTheDocument();
    expect(screen.getByText('89% step coverage')).toBeInTheDocument();
    expect(screen.getByText('8 of 9 memory steps ready')).toBeInTheDocument();
    expect(screen.getByText('12 uploads live across 1 active album')).toBeInTheDocument();
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
          summaryBadges: ['11% step coverage', '1 of 9 memory steps ready', 'No live upload lane', 'Recap not shareable', 'No story curation yet', 'No handoff yet', 'No follow-up opt-ins', '1 memory step still needs action', '4 memory lanes still empty', '6 memory steps still empty'],
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
    expect(screen.getByText('11% step coverage')).toBeInTheDocument();
    expect(screen.getByText('1 of 9 memory steps ready')).toBeInTheDocument();
    expect(screen.getByText('1 memory step still needs action')).toBeInTheDocument();
    expect(screen.getByText('4 memory lanes still empty')).toBeInTheDocument();
    expect(screen.getByText('6 memory steps still empty')).toBeInTheDocument();
  });

  it('shows the first blocker in the top badge row when the lane needs action', () => {
    render(
      <GuestPhotoMemoryFlowCard
        memoryFlowReadiness={{
          readyCount: 3,
          summaryBadges: ['0 of 4 memory lanes ready', '0% step coverage', '3 of 9 memory steps ready', 'Upload lane needs setup', 'Recap saved, not shareable', 'No story picks yet', '5 review items need attention', 'No follow-up opt-ins', '4 memory lanes still need action', '6 memory steps still need action', '2 memory steps still empty', 'First blocker: No-app guest hub'],
          mainGapLabel: 'Main gap: Collection',
          lanes: [
            { id: 'collection', label: 'Collection', detail: 'Albums exist, but guest uploads still need at least one active album.', status: 'needs-action' },
            { id: 'curation', label: 'Curation', detail: '2 flagged uploads and 3 review items still need review before the story is clean.', status: 'needs-action' },
            { id: 'sharing', label: 'Sharing', detail: '1 curated pick saved, but the recap is not shareable yet.', status: 'needs-action' },
            { id: 'handoff', label: 'Handoff', detail: 'Review flagged uploads before relying on owner handoff exports or full-resolution jobs.', status: 'needs-action' },
          ],
          steps: [
            { id: 'guest-hub', label: 'No-app guest hub', detail: 'Turn on at least one guest action before printing the hub QR.', status: 'needs-action' },
            { id: 'album-links', label: 'Photo upload links', detail: 'Albums exist, but none are active for guest uploads.', status: 'needs-action' },
            { id: 'guestbook', label: 'Guestbook notes', detail: 'Guestbook notes are optional and currently off in the guest hub controls.', status: 'planned' },
            { id: 'video-capture', label: 'Video memories', detail: 'Video upload is supported, but live video capture still needs a proof pass.', status: 'planned' },
            { id: 'moderation', label: 'Moderation queue', detail: '2 flagged uploads and 3 review items need a look.', status: 'needs-action' },
            { id: 'slideshow', label: 'Slideshow draft', detail: 'Needs at least three visible, unflagged uploads in an active album.', status: 'needs-action' },
            { id: 'recap', label: 'Guest recap', detail: 'Curated picks exist, but the recap is not shareable yet.', status: 'needs-action' },
            { id: 'follow-up', label: 'Guest follow-up', detail: 'No guest follow-up opt-ins captured yet.', status: 'empty' },
            { id: 'export', label: 'Photo handoff export', detail: 'Review flagged uploads before relying on photo handoff exports.', status: 'needs-action' },
          ],
          blockers: [
            'Turn on at least one guest action before printing the hub QR.',
            'Albums exist, but none are active for guest uploads.',
          ],
        }}
      />,
    );

    expect(screen.getByText('0 of 4 memory lanes ready')).toBeInTheDocument();
    expect(screen.getByText('0% step coverage')).toBeInTheDocument();
    expect(screen.getByText('3 of 9 memory steps ready')).toBeInTheDocument();
    expect(screen.getByText('4 memory lanes still need action')).toBeInTheDocument();
    expect(screen.getByText('6 memory steps still need action')).toBeInTheDocument();
    expect(screen.getByText('2 memory steps still empty')).toBeInTheDocument();
    expect(screen.getByText('First blocker: No-app guest hub')).toBeInTheDocument();
    expect(screen.queryByText('memory lanes still empty')).not.toBeInTheDocument();
  });
});
