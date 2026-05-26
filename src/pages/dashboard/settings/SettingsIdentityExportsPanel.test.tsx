import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SettingsIdentityExportsPanel } from './SettingsIdentityExportsPanel';
import { buildWeddingIdentityExportKit, buildWeddingIdentityPrintAssets } from '../../../lib/weddingIdentityExports';

describe('SettingsIdentityExportsPanel', () => {
  it('shows ready export actions when story and print assets exist', () => {
    const weddingIdentityExportKit = buildWeddingIdentityExportKit({
      coupleNames: 'Maya & Leo',
      publicSiteUrl: 'https://maya-leo.dayof.love',
      weddingDate: '2026-09-12',
      venueName: 'Garden House',
      templateName: 'Editorial Garden',
    });
    const weddingIdentityPrintAssets = buildWeddingIdentityPrintAssets({
      coupleNames: 'Maya & Leo',
      publicSiteUrl: 'https://maya-leo.dayof.love',
      weddingDate: '2026-09-12',
      venueName: 'Garden House',
    });

    const onCopyIdentityManifest = vi.fn();
    const onCopyIdentityStyleKit = vi.fn();
    const onDownloadIdentityPrintPack = vi.fn();
    const onDownloadIdentityStoryGraphic = vi.fn();

    render(
      <SettingsIdentityExportsPanel
        isPublished
        onCopyIdentityManifest={onCopyIdentityManifest}
        onCopyIdentityStyleKit={onCopyIdentityStyleKit}
        onDownloadIdentityStoryGraphic={onDownloadIdentityStoryGraphic}
        onDownloadIdentityPrintPack={onDownloadIdentityPrintPack}
        weddingIdentityExportKit={weddingIdentityExportKit}
        weddingIdentityPrintAssets={weddingIdentityPrintAssets}
        hasStoryGraphic
      />,
    );

    expect(screen.getByText('7 of 7 ready')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save print pack/i })).toBeEnabled();
    expect(screen.getByRole('button', { name: /save story graphic/i })).toBeEnabled();

    fireEvent.click(screen.getByRole('button', { name: /copy manifest/i }));
    fireEvent.click(screen.getByRole('button', { name: /copy style kit/i }));
    fireEvent.click(screen.getByRole('button', { name: /save print pack/i }));
    fireEvent.click(screen.getByRole('button', { name: /save story graphic/i }));

    expect(onCopyIdentityManifest).toHaveBeenCalledTimes(1);
    expect(onCopyIdentityStyleKit).toHaveBeenCalledTimes(1);
    expect(onDownloadIdentityPrintPack).toHaveBeenCalledTimes(1);
    expect(onDownloadIdentityStoryGraphic).toHaveBeenCalledTimes(1);
  });

  it('disables print and story actions when export prerequisites are missing', () => {
    const weddingIdentityExportKit = buildWeddingIdentityExportKit({
      coupleNames: '',
      publicSiteUrl: '',
      weddingDate: null,
      venueName: '',
    });

    render(
      <SettingsIdentityExportsPanel
        isPublished={false}
        onCopyIdentityManifest={vi.fn()}
        onCopyIdentityStyleKit={vi.fn()}
        onDownloadIdentityStoryGraphic={vi.fn()}
        onDownloadIdentityPrintPack={vi.fn()}
        weddingIdentityExportKit={weddingIdentityExportKit}
        weddingIdentityPrintAssets={[]}
        hasStoryGraphic={false}
      />,
    );

    expect(screen.getByText('1 of 7 ready')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /copy manifest/i })).toBeEnabled();
    expect(screen.getByRole('button', { name: /copy style kit/i })).toBeEnabled();
    expect(screen.getByRole('button', { name: /save print pack/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /save story graphic/i })).toBeDisabled();
    expect(screen.getByText('Set a public site URL before printing QR-based assets.')).toBeInTheDocument();
    expect(screen.getByText('Publish the site before saving QR-based print assets or the story graphic so guests do not get draft-only links.')).toBeInTheDocument();
  });

  it('keeps internal prep actions available while draft-only guest share assets stay locked', () => {
    const onCopyIdentityManifest = vi.fn();
    const onCopyIdentityStyleKit = vi.fn();

    render(
      <SettingsIdentityExportsPanel
        isPublished={false}
        onCopyIdentityManifest={onCopyIdentityManifest}
        onCopyIdentityStyleKit={onCopyIdentityStyleKit}
        onDownloadIdentityStoryGraphic={vi.fn()}
        onDownloadIdentityPrintPack={vi.fn()}
        weddingIdentityExportKit={buildWeddingIdentityExportKit({
          coupleNames: 'Maya & Leo',
          publicSiteUrl: '',
          weddingDate: '2026-09-12',
          venueName: 'Garden House',
          templateName: 'Editorial Garden',
        })}
        weddingIdentityPrintAssets={[]}
        hasStoryGraphic={false}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /copy manifest/i }));
    fireEvent.click(screen.getByRole('button', { name: /copy style kit/i }));

    expect(onCopyIdentityManifest).toHaveBeenCalledTimes(1);
    expect(onCopyIdentityStyleKit).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: /save print pack/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /save story graphic/i })).toBeDisabled();
  });

  it('keeps published sites honest about missing share assets without falling back to draft-only warnings', () => {
    render(
      <SettingsIdentityExportsPanel
        isPublished
        onCopyIdentityManifest={vi.fn()}
        onCopyIdentityStyleKit={vi.fn()}
        onDownloadIdentityStoryGraphic={vi.fn()}
        onDownloadIdentityPrintPack={vi.fn()}
        weddingIdentityExportKit={buildWeddingIdentityExportKit({
          coupleNames: 'Maya & Leo',
          publicSiteUrl: 'https://maya-leo.dayof.love',
          weddingDate: '2026-09-12',
          venueName: '',
          templateName: 'Editorial Garden',
        })}
        weddingIdentityPrintAssets={[]}
        hasStoryGraphic={false}
      />,
    );

    expect(screen.queryByText(/Publish the site before saving QR-based print assets/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Add a venue name for detail inserts\./i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save print pack/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /save story graphic/i })).toBeDisabled();
  });

  it('keeps published export surfaces fully share-ready once every guest-facing asset exists', () => {
    render(
      <SettingsIdentityExportsPanel
        isPublished
        onCopyIdentityManifest={vi.fn()}
        onCopyIdentityStyleKit={vi.fn()}
        onDownloadIdentityStoryGraphic={vi.fn()}
        onDownloadIdentityPrintPack={vi.fn()}
        weddingIdentityExportKit={buildWeddingIdentityExportKit({
          coupleNames: 'Maya & Leo',
          publicSiteUrl: 'https://maya-leo.dayof.love',
          weddingDate: '2026-09-12',
          venueName: 'Garden House',
          templateName: 'Editorial Garden',
        })}
        weddingIdentityPrintAssets={buildWeddingIdentityPrintAssets({
          coupleNames: 'Maya & Leo',
          publicSiteUrl: 'https://maya-leo.dayof.love',
          weddingDate: '2026-09-12',
          venueName: 'Garden House',
        })}
        hasStoryGraphic
      />,
    );

    expect(screen.queryByText(/Publish the site before saving QR-based print assets/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /copy manifest/i })).toBeEnabled();
    expect(screen.getByRole('button', { name: /copy style kit/i })).toBeEnabled();
    expect(screen.getByRole('button', { name: /save print pack/i })).toBeEnabled();
    expect(screen.getByRole('button', { name: /save story graphic/i })).toBeEnabled();
  });
});
