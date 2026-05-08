import type { ReactNode } from 'react';
import { Copy, ExternalLink, FolderTree, Link as LinkIcon, Mail } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { getSafePublicWebUrl } from '../../../sections/publicLinks';
import { makePhotoShareMessage, type PhotoBucketRow } from '../guestPhotoSharingUtils';

type GuestPhotoBucketCardProps = {
  bucket: PhotoBucketRow;
  parentBucket: PhotoBucketRow | null;
  childBuckets: PhotoBucketRow[];
  depth: number;
  uploadCount: number;
  rollupUploadCount: number;
  hiddenCount: number;
  flaggedCount: number;
  knownUploadLink: string;
  latestUploadUrl: string;
  workingBucketId: string;
  copied: string;
  children: ReactNode;
  bucketTone: (bucketName: string) => string;
  formatDateTime: (value: string | null | undefined) => string;
  getBucketQrUrl: (uploadUrl: string) => string;
  getChildUploadCount: (bucketId: string) => number;
  onOpenSafePublicUrl: (url: string | null | undefined) => void;
  onRegenerateLink: (bucketId: string) => void;
  onCopyText: (text: string, key: string) => void;
  onSetBucketActive: (bucketId: string, isActive: boolean) => void;
  onExportBucketCsv: (bucketId: string, bucketName: string) => void;
  onBucketSearchChange: (value: string) => void;
};

export function GuestPhotoBucketCard({
  bucket,
  parentBucket,
  childBuckets,
  depth,
  uploadCount,
  rollupUploadCount,
  hiddenCount,
  flaggedCount,
  knownUploadLink,
  latestUploadUrl,
  workingBucketId,
  copied,
  children,
  bucketTone,
  formatDateTime,
  getBucketQrUrl,
  getChildUploadCount,
  onOpenSafePublicUrl,
  onRegenerateLink,
  onCopyText,
  onSetBucketActive,
  onExportBucketCsv,
  onBucketSearchChange,
}: GuestPhotoBucketCardProps) {
  const hasLink = Boolean(knownUploadLink);
  const hasWindow = Boolean(bucket.opens_at || bucket.closes_at);
  const isWorking = workingBucketId === bucket.id;
  const backupUrl = getSafePublicWebUrl(bucket.drive_folder_url);

  return (
    <div className="overflow-hidden rounded-lg border border-border-subtle bg-white">
      <div className="border-b border-border-subtle bg-surface-subtle px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className={depth > 0 ? 'pl-4 border-l-2 border-border-subtle' : ''}>
            {parentBucket && (
              <p className="mb-1 inline-flex items-center rounded-lg bg-white px-2 py-0.5 text-xs font-medium text-text-secondary border border-border-subtle">
                <FolderTree className="mr-1 h-3 w-3" /> {parentBucket.name}
              </p>
            )}
            <p className="font-medium text-neutral-900">{bucket.name}</p>
            <p className="mt-1 text-sm text-neutral-600">{bucketTone(bucket.name)}</p>
            <p className="text-xs text-neutral-500">Created {formatDateTime(bucket.created_at)}</p>
            <div className="mt-1 text-xs text-neutral-500 flex items-center gap-2 flex-wrap">
              <span className={`inline-flex rounded px-2 py-0.5 ${bucket.is_active ? 'bg-surface-secondary text-text-primary border border-border-subtle' : 'bg-neutral-100 text-neutral-600'}`}>
                {bucket.is_active ? 'Active' : 'Paused'}
              </span>
              <span>{uploadCount} direct uploads</span>
              {childBuckets.length > 0 && <span>{rollupUploadCount} with sub-albums</span>}
              {!hasLink && <span className="text-primary">no saved link yet</span>}
              {!hasWindow && <span className="text-primary">no upload window yet</span>}
              {flaggedCount > 0 && <span className="text-primary">{flaggedCount} flagged</span>}
              {hiddenCount > 0 && <span className="text-neutral-600">{hiddenCount} hidden</span>}
              <span>Guest album label: {bucket.slug}</span>
              {hasLink && <span className="text-text-secondary">upload link ready</span>}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap justify-end">
            {backupUrl && (
              <Button size="sm" variant="outline" onClick={() => onOpenSafePublicUrl(bucket.drive_folder_url)}>
                <ExternalLink className="w-3 h-3 mr-1" /> Backup
              </Button>
            )}
            <Button size="sm" variant="outline" disabled={isWorking} onClick={() => onRegenerateLink(bucket.id)}>
              <LinkIcon className="w-3 h-3 mr-1" />
              {isWorking ? 'Working...' : 'Refresh upload link'}
            </Button>
            <Button size="sm" variant="outline" disabled={!knownUploadLink} onClick={() => onCopyText(knownUploadLink, `uplink-${bucket.id}`)}>
              <Copy className="w-3 h-3 mr-1" />
              {copied === `uplink-${bucket.id}` ? 'Copy ready' : 'Copy link'}
            </Button>
            <Button size="sm" variant="outline" disabled={!knownUploadLink} onClick={() => onOpenSafePublicUrl(getBucketQrUrl(knownUploadLink))}>
              QR code
            </Button>
            <Button size="sm" variant={bucket.is_active ? 'outline' : 'accent'} disabled={isWorking} onClick={() => onSetBucketActive(bucket.id, !bucket.is_active)}>
              {isWorking ? 'Working...' : bucket.is_active ? 'Pause' : 'Activate'}
            </Button>
            <Button size="sm" variant="outline" onClick={() => onExportBucketCsv(bucket.id, bucket.name)} disabled={uploadCount === 0}>
              Save photo list
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={!knownUploadLink}
              onClick={() => onCopyText(makePhotoShareMessage(bucket.name, knownUploadLink), `share-msg-${bucket.id}`)}
            >
              {copied === `share-msg-${bucket.id}` ? 'Copied share prompt' : 'Copy share prompt'}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                const shareUrl = knownUploadLink || latestUploadUrl || `${window.location.origin}/photos/upload`;
                const subject = encodeURIComponent(`${bucket.name} photos upload`);
                const body = encodeURIComponent(makePhotoShareMessage(bucket.name, shareUrl));
                window.location.href = `/dashboard/messages?prefillSubject=${subject}&prefillBody=${body}`;
              }}
            >
              <Mail className="w-3 h-3 mr-1" /> Send to messaging
            </Button>
          </div>
        </div>
      </div>

      <div className="px-5 py-4 space-y-4">
        {childBuckets.length > 0 && (
          <div className="rounded-lg border border-border-subtle bg-surface-subtle p-3">
            <p className="text-xs font-semibold text-text-primary">Sub-albums</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {childBuckets.map((child) => (
                <button
                  key={child.id}
                  type="button"
                  onClick={() => onBucketSearchChange(child.name)}
                  className="rounded-lg border border-border-subtle bg-white px-3 py-1 text-xs font-medium text-text-primary"
                >
                  {child.name} · {getChildUploadCount(child.id)}
                </button>
              ))}
            </div>
          </div>
        )}

        {hasLink && (
          <div className="rounded-lg border border-border-subtle bg-surface-subtle p-3">
            <p className="text-xs font-semibold text-text-primary">Upload link ready</p>
            <p className="mt-1 text-sm text-text-primary">Share one clean upload destination for this album.</p>
            <p className="mt-2 truncate text-xs text-text-secondary">{knownUploadLink}</p>
          </div>
        )}

        {children}
      </div>
    </div>
  );
}
