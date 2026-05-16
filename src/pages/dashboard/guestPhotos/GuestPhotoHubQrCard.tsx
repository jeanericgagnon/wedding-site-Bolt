import { Copy, ExternalLink, QrCode, Sparkles } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { ShareQrPanel } from '../../../components/ui/ShareQrPanel';
import type { GuestHubAction } from '../../../lib/guestHubActions';

type GuestPhotoHubQrCardProps = {
  guestHubUrl: string;
  guestRecapUrl: string;
  isPublished: boolean;
  guestHubActionSummary: string;
  guestHubActions: GuestHubAction[];
  copied: string;
  guestHubQrAssetCount: number;
  getBucketQrUrl: (uploadUrl: string) => string;
  onCopyText: (text: string, key: string) => void;
  onOpenAppUrl: (url: string) => void;
  onOpenSafePublicUrl: (url: string | null | undefined) => void;
  onDownloadGuestHubPrintPack: () => void;
};

export function GuestPhotoHubQrCard({
  guestHubUrl,
  guestRecapUrl,
  isPublished,
  guestHubActionSummary,
  guestHubActions,
  copied,
  guestHubQrAssetCount,
  getBucketQrUrl,
  onCopyText,
  onOpenAppUrl,
  onOpenSafePublicUrl,
  onDownloadGuestHubPrintPack,
}: GuestPhotoHubQrCardProps) {
  const publicShareDisabled = !isPublished;

  return (
    <Card className="p-6 border border-neutral-200 bg-white">
      <div className="grid gap-5 lg:grid-cols-[1.2fr_0.85fr] lg:items-center">
        <div>
          <div className="flex items-center gap-2">
            <QrCode className="h-5 w-5 text-neutral-900" />
            <h2 className="text-xl font-semibold text-neutral-900">One QR guest hub</h2>
          </div>
          <p className="mt-2 text-sm leading-6 text-neutral-600">
            Print this single link on signage. Guests can RSVP, upload photos or video, leave a guestbook note, and find guest update flows without installing anything.
          </p>
          <p className="mt-2 text-sm text-neutral-500">Current hub includes {guestHubActionSummary}.</p>
          {publicShareDisabled && (
            <p className="mt-2 text-sm text-amber-700">
              Publish the site before sharing the guest hub, recap, or QR print cards.
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-1.5">
            {guestHubActions.map((action) => (
              <span key={action.id} className="rounded-lg border border-neutral-200 bg-neutral-50 px-2 py-1 text-[11px] font-medium text-neutral-600">
                {action.id === 'rsvp' ? 'RSVP' : action.id.replace(/^\w/, (char) => char.toUpperCase())}
              </span>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => onCopyText(guestHubUrl, 'guest-hub')} disabled={publicShareDisabled}>
              <Copy className="w-4 h-4 mr-2" /> {copied === 'guest-hub' ? 'Copied' : 'Copy hub link'}
            </Button>
            <Button variant="outline" onClick={() => onOpenAppUrl(guestHubUrl)} disabled={publicShareDisabled}>
              <ExternalLink className="w-4 h-4 mr-2" /> Open hub
            </Button>
            <Button variant="outline" onClick={() => onOpenSafePublicUrl(getBucketQrUrl(guestHubUrl))} disabled={publicShareDisabled}>
              <QrCode className="w-4 h-4 mr-2" /> Open QR
            </Button>
            <Button variant="outline" onClick={onDownloadGuestHubPrintPack} disabled={publicShareDisabled || guestHubQrAssetCount === 0}>
              <QrCode className="w-4 h-4 mr-2" /> Save print cards
            </Button>
            {guestRecapUrl && (
              <>
                <Button variant="outline" onClick={() => onCopyText(guestRecapUrl, 'guest-recap')} disabled={publicShareDisabled}>
                  <Sparkles className="w-4 h-4 mr-2" /> {copied === 'guest-recap' ? 'Copied' : 'Copy recap'}
                </Button>
                <Button variant="outline" onClick={() => onOpenAppUrl(guestRecapUrl)} disabled={publicShareDisabled}>
                  <ExternalLink className="w-4 h-4 mr-2" /> Open recap
                </Button>
              </>
            )}
          </div>
        </div>
        <div className="grid gap-3">
          <ShareQrPanel
            title="Guest hub QR"
            description={publicShareDisabled ? 'Publish the site before sharing this guest hub QR.' : `One QR for ${guestHubActionSummary}.`}
            url={guestHubUrl}
            copyLabel="Copy hub link"
            disabled={publicShareDisabled}
          />
          {guestRecapUrl && (
            <ShareQrPanel
              title="Photo recap QR"
              description={publicShareDisabled ? 'Publish the site before sharing this recap QR.' : 'Share highlight moments, memory chapters, and opt-in capture after the event.'}
              url={guestRecapUrl}
              copyLabel="Copy recap link"
              disabled={publicShareDisabled}
            />
          )}
        </div>
      </div>
    </Card>
  );
}
