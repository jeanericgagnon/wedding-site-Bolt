import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

function readSource(path: string) {
  return readFileSync(join(process.cwd(), path), 'utf8');
}

describe('dashboard stored link safety', () => {
  it('sanitizes planning vendor and payment document links before rendering anchors', () => {
    const vendors = readSource('src/pages/dashboard/planning/VendorsTab.tsx');
    const payments = readSource('src/pages/dashboard/planning/PaymentsTab.tsx');

    expect(vendors).toContain('getSafePublicWebUrl');
    expect(vendors).toContain('getSafePublicEmailHref');
    expect(vendors).toContain('getSafePublicTelHref');
    expect(vendors).toContain('const safeEmailHref = getSafePublicEmailHref(vendor.email)');
    expect(vendors).toContain('const safePhoneHref = getSafePublicTelHref(vendor.phone)');
    expect(vendors).toContain('const safeWebsiteUrl = getSafePublicWebUrl(vendor.website)');
    expect(vendors).toContain('const safeDocumentUrl = getSafePublicWebUrl(vendor.document_url)');
    expect(vendors).not.toContain('href={`mailto:${vendor.email}`}');
    expect(vendors).not.toContain('href={`tel:${vendor.phone}`}');
    expect(vendors).not.toContain('href={vendor.website}');
    expect(vendors).not.toContain('href={vendor.document_url}');

    expect(payments).toContain('const safeDocumentUrl = getSafePublicWebUrl(row.documentUrl)');
    expect(payments).not.toContain('href={row.documentUrl}');
  });

  it('sanitizes dashboard playlist links before rendering or opening them', () => {
    const songRequests = readSource('src/pages/dashboard/planning/SongRequestsTab.tsx');
    const settingsSupport = readSource('src/pages/dashboard/settings/useSettingsDashboardRouteSupport.ts');
    const settingsContent = readSource('src/pages/dashboard/settings/SettingsDashboardRouteContent.tsx');

    expect(songRequests).toContain('const safePlaylistUrl = getSafePublicWebUrl(playlistUrl)');
    expect(songRequests).not.toContain('href={playlistUrl}');

    expect(settingsSupport).toContain('const safeMusicPlaylistUrl = getSafePublicWebUrl(musicPlaylistUrl)');
    expect(settingsContent).toContain("window.open(props.safeMusicPlaylistUrl, '_blank', 'noopener,noreferrer')");
    expect(settingsContent).not.toContain("window.open(musicPlaylistUrl, '_blank')");
  });

  it('sanitizes photo dashboard external opens for backup folders and QR links', () => {
    const photos = readSource('src/pages/dashboard/guestPhotos/guestPhotoDashboardPresentation.ts');
    const bucketCard = readSource('src/pages/dashboard/guestPhotos/GuestPhotoBucketCard.tsx');

    expect(photos).toContain('getSafePublicWebUrl');
    expect(photos).toContain('buildQrImageUrl');
    expect(photos).toContain('export function openGuestPhotoSafePublicUrl(url: string | null | undefined)');
    expect(photos).toContain("return isSafePublicQrAssetUrl(uploadUrl) ? buildQrImageUrl(uploadUrl) : '';");
    expect(photos).toContain("window.open(safeUrl, '_blank', 'noopener,noreferrer')");
    expect(photos).toContain("window.open(url, '_blank', 'noopener,noreferrer')");
    expect(bucketCard).toContain('getSafePublicWebUrl(bucket.drive_folder_url)');
    expect(bucketCard).toContain('onOpenSafePublicUrl(bucket.drive_folder_url)');
    expect(bucketCard).toContain('onOpenSafePublicUrl(getBucketQrUrl(knownUploadLink))');
    expect(bucketCard).not.toContain("window.open(bucket.drive_folder_url!, '_blank')");
    expect(bucketCard).not.toContain("window.open(getBucketQrUrl(knownUploadLink), '_blank')");
    expect(bucketCard).not.toContain("window.open(latestUploadUrl, '_blank')");
  });

  it('sanitizes vault attachment links returned to the dashboard before rendering media or anchors', () => {
    const vault = readSource('src/pages/dashboard/VaultCard.tsx');

    expect(vault).toContain('getSafePublicWebUrl');
    expect(vault).toContain('const safeUrl = getSafePublicWebUrl(await resolveVaultEntryLink(entry.id));');
    expect(vault).toContain('setResolvedEntryLinks((prev) => ({ ...prev, [entry.id]: safeUrl }))');
    expect(vault).toContain('const attachmentUrl = getSafePublicWebUrl(resolvedEntryLinks[entry.id]) || null');
    expect(vault).not.toContain('const attachmentUrl = resolvedEntryLinks[entry.id] || null');
  });
});
