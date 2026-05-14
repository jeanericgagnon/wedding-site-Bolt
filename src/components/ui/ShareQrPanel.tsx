import React, { useMemo, useState } from 'react';
import { Copy, ExternalLink, QrCode } from 'lucide-react';
import { Button } from './Button';
import { copyTextOrDownload } from '../../lib/copyText';
import { buildRenderableQrImageUrl, isSafePublicQrAssetUrl } from '../../lib/guestHubQrAssets';
import { isPrivateQrPayloadForThirdPartyQr } from '../../lib/qr/qrPayload';

interface ShareQrPanelProps {
  title: string;
  description?: string;
  url: string;
  copyLabel?: string;
  className?: string;
  allowPrivate?: boolean;
}

export const ShareQrPanel: React.FC<ShareQrPanelProps> = ({
  title,
  description,
  url,
  copyLabel = 'Copy link',
  className = '',
  allowPrivate = false,
}) => {
  const [copied, setCopied] = useState(false);
  const [copyFallback, setCopyFallback] = useState(false);
  const normalizedUrl = useMemo(() => url.trim(), [url]);
  const usesPrivateQr = useMemo(
    () => allowPrivate && isPrivateQrPayloadForThirdPartyQr(normalizedUrl),
    [allowPrivate, normalizedUrl],
  );
  const safeUrl = useMemo(() => {
    if (isSafePublicQrAssetUrl(normalizedUrl)) return normalizedUrl;
    if (usesPrivateQr) return normalizedUrl;
    return '';
  }, [normalizedUrl, usesPrivateQr]);
  const qrUrl = useMemo(
    () => buildRenderableQrImageUrl(safeUrl, 512, { allowPrivate }),
    [allowPrivate, safeUrl],
  );
  const visibleUrl = useMemo(() => {
    if (!safeUrl) return '';
    if (!usesPrivateQr) return safeUrl;
    try {
      const baseOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://dayof.love';
      const urlObject = new URL(safeUrl, baseOrigin);
      return `${urlObject.origin}${urlObject.pathname} · private guest link`;
    } catch {
      return 'Private guest link';
    }
  }, [safeUrl, usesPrivateQr]);

  const copyUrl = async () => {
    try {
      const result = await copyTextOrDownload(safeUrl, `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'dayof'}-link.txt`);
      setCopied(true);
      setCopyFallback(result === 'downloaded');
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopyFallback(true);
    }
  };

  if (!safeUrl) return null;

  return (
    <div className={`rounded-lg border border-border-subtle bg-white p-4 ${className}`}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="flex h-28 w-28 shrink-0 items-center justify-center rounded-lg border border-border-subtle bg-surface-subtle p-2">
          <img src={qrUrl} alt={`${title} QR code`} className="h-full w-full rounded-lg" loading="lazy" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <QrCode className="h-4 w-4 text-primary" aria-hidden="true" />
            <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
          </div>
          {description && <p className="mt-1 text-xs text-text-secondary">{description}</p>}
          <p className="mt-2 truncate rounded-lg border border-border-subtle bg-surface-subtle px-2 py-1.5 text-xs text-text-secondary">
            {visibleUrl}
          </p>
          {copyFallback && !usesPrivateQr && (
            <input
              aria-label={`${title} share link`}
              className="mt-2 w-full rounded-lg border border-border bg-white px-2 py-1.5 text-xs text-text-primary"
              readOnly
              value={safeUrl}
              onFocus={(event) => event.currentTarget.select()}
            />
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" onClick={copyUrl}>
              <Copy className="mr-1 h-3.5 w-3.5" />
              {copied ? 'Copied' : copyLabel}
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => window.open(qrUrl, '_blank', 'noopener,noreferrer')}>
              <ExternalLink className="mr-1 h-3.5 w-3.5" />
              Open QR
            </Button>
            <a
              href={qrUrl}
              download
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-lg border border-border bg-white px-3 py-1.5 text-sm font-medium text-text-primary transition-colors hover:bg-surface-subtle"
            >
              Download
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
