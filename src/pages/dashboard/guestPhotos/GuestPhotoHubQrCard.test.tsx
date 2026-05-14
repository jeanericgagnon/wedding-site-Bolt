import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { GuestPhotoHubQrCard } from './GuestPhotoHubQrCard';

describe('GuestPhotoHubQrCard', () => {
  it('disables print-pack export when no guest hub qr assets are ready', () => {
    render(
      <GuestPhotoHubQrCard
        guestHubUrl="https://dayof.love/event/maya-and-leo"
        guestRecapUrl=""
        guestHubActionSummary="RSVP, photo upload, and guestbook"
        guestHubActions={[{ id: 'rsvp', titleKey: '', detailKey: '', href: '/site/maya-and-leo#rsvp' }]}
        copied=""
        guestHubQrAssetCount={0}
        getBucketQrUrl={() => 'https://api.qrserver.com/v1/create-qr-code/?size=512x512&data=https%3A%2F%2Fdayof.love%2Fevent%2Fmaya-and-leo'}
        onCopyText={vi.fn()}
        onOpenAppUrl={vi.fn()}
        onOpenSafePublicUrl={vi.fn()}
        onDownloadGuestHubPrintPack={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: /save print cards/i })).toBeDisabled();
  });

  it('fires print-pack export when guest hub qr assets are ready', () => {
    const onDownloadGuestHubPrintPack = vi.fn();

    render(
      <GuestPhotoHubQrCard
        guestHubUrl="https://dayof.love/event/maya-and-leo"
        guestRecapUrl="https://dayof.love/event/maya-and-leo/recap"
        guestHubActionSummary="RSVP, photo upload, and guestbook"
        guestHubActions={[
          { id: 'rsvp', titleKey: '', detailKey: '', href: '/site/maya-and-leo#rsvp' },
          { id: 'photos', titleKey: '', detailKey: '', href: '/photos/upload?site=maya-and-leo&hub=1' },
        ]}
        copied=""
        guestHubQrAssetCount={4}
        getBucketQrUrl={() => 'https://api.qrserver.com/v1/create-qr-code/?size=512x512&data=https%3A%2F%2Fdayof.love%2Fevent%2Fmaya-and-leo'}
        onCopyText={vi.fn()}
        onOpenAppUrl={vi.fn()}
        onOpenSafePublicUrl={vi.fn()}
        onDownloadGuestHubPrintPack={onDownloadGuestHubPrintPack}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /save print cards/i }));

    expect(onDownloadGuestHubPrintPack).toHaveBeenCalledTimes(1);
  });
});
