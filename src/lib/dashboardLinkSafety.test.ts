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
    const settings = readSource('src/pages/dashboard/Settings.tsx');

    expect(songRequests).toContain('const safePlaylistUrl = getSafePublicWebUrl(playlistUrl)');
    expect(songRequests).not.toContain('href={playlistUrl}');

    expect(settings).toContain('const safeMusicPlaylistUrl = getSafePublicWebUrl(musicPlaylistUrl)');
    expect(settings).toContain("window.open(safeMusicPlaylistUrl, '_blank', 'noopener,noreferrer')");
    expect(settings).not.toContain("window.open(musicPlaylistUrl, '_blank')");
  });

  it('sanitizes photo dashboard external opens for backup folders and QR links', () => {
    const photos = readSource('src/pages/dashboard/GuestPhotoSharing.tsx');
    const bucketCard = readSource('src/pages/dashboard/guestPhotos/GuestPhotoBucketCard.tsx');

    expect(photos).toContain('getSafePublicWebUrl');
    expect(photos).toContain('buildQrImageUrl');
    expect(photos).toContain('isSafePublicQrAssetUrl');
    expect(photos).toContain('const openSafePublicUrl = (url: string | null | undefined)');
    expect(photos).toContain("const getBucketQrUrl = (uploadUrl: string) => (isSafePublicQrAssetUrl(uploadUrl) ? buildQrImageUrl(uploadUrl) : '')");
    expect(photos).not.toContain('api.qrserver.com/v1/create-qr-code/?size=512x512&data=${encodeURIComponent(uploadUrl)}');
    expect(photos).toContain("window.open(safeUrl, '_blank', 'noopener,noreferrer')");
    expect(photos).toContain("const openAppUrl = (url: string) => window.open(url, '_blank', 'noopener,noreferrer')");
    expect(bucketCard).toContain('getSafePublicWebUrl(bucket.drive_folder_url)');
    expect(bucketCard).toContain('onOpenSafePublicUrl(bucket.drive_folder_url)');
    expect(bucketCard).toContain('onOpenSafePublicUrl(getBucketQrUrl(knownUploadLink))');
    expect(photos).not.toContain("window.open(bucket.drive_folder_url!, '_blank')");
    expect(photos).not.toContain("window.open(getBucketQrUrl(knownUploadLink), '_blank')");
    expect(photos).not.toContain("window.open(latestUploadUrl, '_blank')");
    expect(bucketCard).not.toContain("window.open(bucket.drive_folder_url!, '_blank')");
    expect(bucketCard).not.toContain("window.open(getBucketQrUrl(knownUploadLink), '_blank')");
    expect(bucketCard).not.toContain("window.open(latestUploadUrl, '_blank')");
  });

  it('sanitizes vault attachment links returned to the dashboard before rendering media or anchors', () => {
    const vault = readSource('src/pages/dashboard/Vault.tsx');

    expect(vault).toContain('getSafePublicWebUrl');
    expect(vault).toContain('const safeUrl = getSafePublicWebUrl(url)');
    expect(vault).toContain('setResolvedEntryLinks((prev) => ({ ...prev, [entry.id]: safeUrl }))');
    expect(vault).toContain('const attachmentUrl = getSafePublicWebUrl(resolvedEntryLinks[entry.id]) || null');
    expect(vault).not.toContain('const attachmentUrl = resolvedEntryLinks[entry.id] || null');
  });
});
