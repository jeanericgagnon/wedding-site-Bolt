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
    expect(screen.getByRole('button', { name: /save print pack/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /save story graphic/i })).toBeDisabled();
    expect(screen.getByText('Set a public site URL before printing QR-based assets.')).toBeInTheDocument();
  });
});
