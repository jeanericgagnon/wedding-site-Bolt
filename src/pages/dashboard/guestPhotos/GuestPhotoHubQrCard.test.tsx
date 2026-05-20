import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { GuestPhotoHubQrCard } from './GuestPhotoHubQrCard';

describe('GuestPhotoHubQrCard', () => {
  it('disables print-pack export when no guest hub qr assets are ready', () => {
    render(
      <GuestPhotoHubQrCard
        guestHubUrl="https://dayof.love/event/maya-and-leo"
        guestRecapUrl=""
        isPublished
        guestHubActionSummary="RSVP, photo upload, and guestbook"
        guestHubActions={[{ id: 'rsvp', titleKey: '', detailKey: '', href: '/site/maya-and-leo#rsvp' }]}
        copyNotice={null}
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
        isPublished
        guestHubActionSummary="RSVP, photo upload, and guestbook"
        guestHubActions={[
          { id: 'rsvp', titleKey: '', detailKey: '', href: '/site/maya-and-leo#rsvp' },
          { id: 'photos', titleKey: '', detailKey: '', href: '/photos/upload?site=maya-and-leo&hub=1' },
        ]}
        copyNotice={null}
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

  it('fires guest-hub and recap share actions once the site is published', () => {
    const onCopyText = vi.fn();
    const onOpenAppUrl = vi.fn();
    const onOpenSafePublicUrl = vi.fn();

    render(
      <GuestPhotoHubQrCard
        guestHubUrl="https://dayof.love/event/maya-and-leo"
        guestRecapUrl="https://dayof.love/event/maya-and-leo/recap"
        isPublished
        guestHubActionSummary="RSVP, photo upload, and guestbook"
        guestHubActions={[
          { id: 'rsvp', titleKey: '', detailKey: '', href: '/site/maya-and-leo#rsvp' },
          { id: 'photos', titleKey: '', detailKey: '', href: '/photos/upload?site=maya-and-leo&hub=1' },
        ]}
        copyNotice={null}
        guestHubQrAssetCount={4}
        getBucketQrUrl={() => 'https://api.qrserver.com/v1/create-qr-code/?size=512x512&data=https%3A%2F%2Fdayof.love%2Fevent%2Fmaya-and-leo'}
        onCopyText={onCopyText}
        onOpenAppUrl={onOpenAppUrl}
        onOpenSafePublicUrl={onOpenSafePublicUrl}
        onDownloadGuestHubPrintPack={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /copy guest hub link/i }));
    fireEvent.click(screen.getByRole('button', { name: /open hub/i }));
    fireEvent.click(screen.getByRole('button', { name: /open qr/i }));
    fireEvent.click(screen.getByRole('button', { name: /copy guest recap link/i }));
    fireEvent.click(screen.getByRole('button', { name: /open recap/i }));

    expect(onCopyText).toHaveBeenNthCalledWith(1, 'https://dayof.love/event/maya-and-leo', 'guest-hub');
    expect(onCopyText).toHaveBeenNthCalledWith(2, 'https://dayof.love/event/maya-and-leo/recap', 'guest-recap');
    expect(onOpenAppUrl).toHaveBeenNthCalledWith(1, 'https://dayof.love/event/maya-and-leo');
    expect(onOpenAppUrl).toHaveBeenNthCalledWith(2, 'https://dayof.love/event/maya-and-leo/recap');
    expect(onOpenSafePublicUrl).toHaveBeenCalledWith('https://api.qrserver.com/v1/create-qr-code/?size=512x512&data=https%3A%2F%2Fdayof.love%2Fevent%2Fmaya-and-leo');
  });

  it('keeps guest-hub share actions disabled until the site is published', () => {
    render(
      <GuestPhotoHubQrCard
        guestHubUrl="https://dayof.love/event/maya-and-leo"
        guestRecapUrl="https://dayof.love/event/maya-and-leo/recap"
        isPublished={false}
        guestHubActionSummary="RSVP, photo upload, and guestbook"
        guestHubActions={[{ id: 'rsvp', titleKey: '', detailKey: '', href: '/site/maya-and-leo#rsvp' }]}
        copyNotice={null}
        guestHubQrAssetCount={4}
        getBucketQrUrl={() => 'https://api.qrserver.com/v1/create-qr-code/?size=512x512&data=https%3A%2F%2Fdayof.love%2Fevent%2Fmaya-and-leo'}
        onCopyText={vi.fn()}
        onOpenAppUrl={vi.fn()}
        onOpenSafePublicUrl={vi.fn()}
        onDownloadGuestHubPrintPack={vi.fn()}
      />,
    );

    expect(screen.getByText('Publish the site before sharing the guest hub, recap, or QR print cards.')).toBeInTheDocument();
    expect(screen.getByText('Publish the site before sharing this guest hub QR.')).toBeInTheDocument();
    expect(screen.getByText('Publish the site before sharing this recap QR.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /copy guest hub link/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /open qr/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /save print cards/i })).toBeDisabled();
  });

  it('shows live share-ready QR descriptions once the guest hub is published', () => {
    render(
      <GuestPhotoHubQrCard
        guestHubUrl="https://dayof.love/event/maya-and-leo"
        guestRecapUrl="https://dayof.love/event/maya-and-leo/recap"
        isPublished
        guestHubActionSummary="RSVP, photo upload, and guestbook"
        guestHubActions={[
          { id: 'rsvp', titleKey: '', detailKey: '', href: '/site/maya-and-leo#rsvp' },
          { id: 'photos', titleKey: '', detailKey: '', href: '/photos/upload?site=maya-and-leo&hub=1' },
        ]}
        copyNotice={null}
        guestHubQrAssetCount={4}
        getBucketQrUrl={() => 'https://api.qrserver.com/v1/create-qr-code/?size=512x512&data=https%3A%2F%2Fdayof.love%2Fevent%2Fmaya-and-leo'}
        onCopyText={vi.fn()}
        onOpenAppUrl={vi.fn()}
        onOpenSafePublicUrl={vi.fn()}
        onDownloadGuestHubPrintPack={vi.fn()}
      />,
    );

    expect(screen.getByText('One QR for RSVP, photo upload, and guestbook.')).toBeInTheDocument();
    expect(screen.getByText('Share highlight moments, memory chapters, and opt-in capture after the event.')).toBeInTheDocument();
    expect(screen.queryByText('Publish the site before sharing this guest hub QR.')).not.toBeInTheDocument();
  });

  it('keeps hub sharing available without showing recap actions when no recap link exists yet', () => {
    const onCopyText = vi.fn();
    const onOpenAppUrl = vi.fn();

    render(
      <GuestPhotoHubQrCard
        guestHubUrl="https://dayof.love/event/maya-and-leo"
        guestRecapUrl=""
        isPublished
        guestHubActionSummary="RSVP and photo upload"
        guestHubActions={[
          { id: 'rsvp', titleKey: '', detailKey: '', href: '/site/maya-and-leo#rsvp' },
          { id: 'photos', titleKey: '', detailKey: '', href: '/photos/upload?site=maya-and-leo&hub=1' },
        ]}
        copyNotice={null}
        guestHubQrAssetCount={2}
        getBucketQrUrl={() => 'https://api.qrserver.com/v1/create-qr-code/?size=512x512&data=https%3A%2F%2Fdayof.love%2Fevent%2Fmaya-and-leo'}
        onCopyText={onCopyText}
        onOpenAppUrl={onOpenAppUrl}
        onOpenSafePublicUrl={vi.fn()}
        onDownloadGuestHubPrintPack={vi.fn()}
      />,
    );

    expect(screen.queryByRole('button', { name: /copy guest recap link/i })).not.toBeInTheDocument();
    expect(screen.queryByText('Photo recap QR')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /copy guest hub link/i }));
    fireEvent.click(screen.getByRole('button', { name: /open hub/i }));

    expect(onCopyText).toHaveBeenCalledWith('https://dayof.love/event/maya-and-leo', 'guest-hub');
    expect(onOpenAppUrl).toHaveBeenCalledWith('https://dayof.love/event/maya-and-leo');
  });

  it('surfaces copied state independently for the hub and recap share controls', () => {
    const { rerender } = render(
      <GuestPhotoHubQrCard
        guestHubUrl="https://dayof.love/event/maya-and-leo"
        guestRecapUrl="https://dayof.love/event/maya-and-leo/recap"
        isPublished
        guestHubActionSummary="RSVP, photo upload, and guestbook"
        guestHubActions={[
          { id: 'rsvp', titleKey: '', detailKey: '', href: '/site/maya-and-leo#rsvp' },
          { id: 'photos', titleKey: '', detailKey: '', href: '/photos/upload?site=maya-and-leo&hub=1' },
        ]}
        copyNotice={{ key: 'guest-hub', mode: 'copied' }}
        guestHubQrAssetCount={4}
        getBucketQrUrl={() => 'https://api.qrserver.com/v1/create-qr-code/?size=512x512&data=https%3A%2F%2Fdayof.love%2Fevent%2Fmaya-and-leo'}
        onCopyText={vi.fn()}
        onOpenAppUrl={vi.fn()}
        onOpenSafePublicUrl={vi.fn()}
        onDownloadGuestHubPrintPack={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: 'Copied guest hub link' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /copy guest recap link/i })).toBeInTheDocument();

    rerender(
      <GuestPhotoHubQrCard
        guestHubUrl="https://dayof.love/event/maya-and-leo"
        guestRecapUrl="https://dayof.love/event/maya-and-leo/recap"
        isPublished
        guestHubActionSummary="RSVP, photo upload, and guestbook"
        guestHubActions={[
          { id: 'rsvp', titleKey: '', detailKey: '', href: '/site/maya-and-leo#rsvp' },
          { id: 'photos', titleKey: '', detailKey: '', href: '/photos/upload?site=maya-and-leo&hub=1' },
        ]}
        copyNotice={{ key: 'guest-recap', mode: 'copied' }}
        guestHubQrAssetCount={4}
        getBucketQrUrl={() => 'https://api.qrserver.com/v1/create-qr-code/?size=512x512&data=https%3A%2F%2Fdayof.love%2Fevent%2Fmaya-and-leo'}
        onCopyText={vi.fn()}
        onOpenAppUrl={vi.fn()}
        onOpenSafePublicUrl={vi.fn()}
        onDownloadGuestHubPrintPack={vi.fn()}
      />,
    );

    expect(screen.getAllByRole('button', { name: 'Copied guest recap link' })).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Copied guest recap link' })).toHaveTextContent('Copied guest recap link');
    expect(screen.getByRole('button', { name: /copy guest hub link/i })).toBeInTheDocument();
  });
});
