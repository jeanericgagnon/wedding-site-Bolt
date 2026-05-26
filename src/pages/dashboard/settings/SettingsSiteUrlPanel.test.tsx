import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SettingsSiteUrlPanel } from './SettingsSiteUrlPanel';

describe('SettingsSiteUrlPanel', () => {
  it('keeps draft sites from advertising the public link as guest-ready', () => {
    render(
      <SettingsSiteUrlPanel
        canEditSettings
        hideFromSearch={false}
        isGuestFacingReady={false}
        isPublished={false}
        onDownloadIdentityPrintPack={vi.fn()}
        onSiteSlugChange={vi.fn()}
        onSubmit={vi.fn((event) => event.preventDefault())}
        privacyMode="public"
        publicSiteUrl="https://maya-leo.dayof.love"
        siteSlug="maya-leo"
        slugError={null}
        slugSaving={false}
        slugSuccess={null}
      />,
    );

    expect(screen.getByText('This URL is reserved for your site, but guests cannot open it yet.')).toBeInTheDocument();
    expect(screen.queryByText('Public site QR')).not.toBeInTheDocument();
    expect(screen.queryByText('Your site is accessible at')).not.toBeInTheDocument();
  });

  it('shows the public link and qr panel once the site is live', () => {
    render(
      <SettingsSiteUrlPanel
        canEditSettings
        hideFromSearch={false}
        isGuestFacingReady
        isPublished
        onDownloadIdentityPrintPack={vi.fn()}
        onSiteSlugChange={vi.fn()}
        onSubmit={vi.fn((event) => event.preventDefault())}
        privacyMode="invite_only"
        publicSiteUrl="https://maya-leo.dayof.love"
        siteSlug="maya-leo"
        slugError={null}
        slugSaving={false}
        slugSuccess={null}
      />,
    );

    expect(screen.getByText('Guests can reach your live site at this address.')).toBeInTheDocument();
    expect(screen.getByText('Public site QR')).toBeInTheDocument();
  });

  it('keeps draft invite-only sites on the reserved-url warning instead of hinting they are already guest-live', () => {
    render(
      <SettingsSiteUrlPanel
        canEditSettings
        hideFromSearch={false}
        isGuestFacingReady={false}
        isPublished={false}
        onDownloadIdentityPrintPack={vi.fn()}
        onSiteSlugChange={vi.fn()}
        onSubmit={vi.fn((event) => event.preventDefault())}
        privacyMode="invite_only"
        publicSiteUrl="https://maya-leo.dayof.love"
        siteSlug="maya-leo"
        slugError={null}
        slugSaving={false}
        slugSuccess={null}
      />,
    );

    expect(screen.getByText('This URL is reserved for your site, but guests cannot open it yet.')).toBeInTheDocument();
    expect(screen.getByText(/Draft means only you can see the site while editing\./i)).toBeInTheDocument();
    expect(screen.queryByText(/Only guests with the link can open the live site\./i)).not.toBeInTheDocument();
    expect(screen.queryByText('Public site QR')).not.toBeInTheDocument();
  });

  it('does not advertise guest-facing access before a site slug exists at all', () => {
    render(
      <SettingsSiteUrlPanel
        canEditSettings
        hideFromSearch={false}
        isGuestFacingReady
        isPublished
        onDownloadIdentityPrintPack={vi.fn()}
        onSiteSlugChange={vi.fn()}
        onSubmit={vi.fn((event) => event.preventDefault())}
        privacyMode="public"
        publicSiteUrl=""
        siteSlug=""
        slugError={null}
        slugSaving={false}
        slugSuccess={null}
      />,
    );

    expect(screen.queryByText('Your site is accessible at')).not.toBeInTheDocument();
    expect(screen.queryByText('Public site QR')).not.toBeInTheDocument();
  });
});
