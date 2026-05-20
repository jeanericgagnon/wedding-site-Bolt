import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Copy, ExternalLink, QrCode } from 'lucide-react';
import { Button } from './Button';
import { copyTextOrDownload, downloadTextFile } from '../../lib/copyText';
import { buildRenderableQrImageUrl, isSafePublicQrAssetUrl } from '../../lib/guestHubQrAssets';
import { isPrivateQrPayloadForThirdPartyQr } from '../../lib/qr/qrPayload';

interface ShareQrPanelProps {
  title: string;
  description?: string;
  url: string;
  copyLabel?: string;
  copiedLabel?: string;
  downloadedLabel?: string;
  openLabel?: string;
  downloadLabel?: string;
  privateCardLabel?: string;
  className?: string;
  allowPrivate?: boolean;
  disabled?: boolean;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function deriveCopyOutcomeLabel(copyLabel: string, verb: 'Copied' | 'Downloaded'): string {
  const trimmed = copyLabel.trim();
  if (/^copy\s+/iu.test(trimmed)) {
    return `${verb} ${trimmed.replace(/^copy\s+/iu, '')}`;
  }
  return verb;
}

export const ShareQrPanel: React.FC<ShareQrPanelProps> = ({
  title,
  description,
  url,
  copyLabel = 'Copy link',
  copiedLabel,
  downloadedLabel,
  openLabel = 'Open QR',
  downloadLabel = 'Download',
  privateCardLabel = 'Save private card',
  className = '',
  allowPrivate = false,
  disabled = false,
}) => {
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'downloaded' | 'error'>('idle');
  const [copying, setCopying] = useState(false);
  const [copyFallback, setCopyFallback] = useState(false);
  const copyStatusTimeoutRef = useRef<number | null>(null);
  const copyRequestIdRef = useRef(0);
  const mountedRef = useRef(true);
  const copyContextRef = useRef({ safeUrl: '', title: '' });
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
  const copiedNoticeLabel = useMemo(
    () => copiedLabel ?? deriveCopyOutcomeLabel(copyLabel, 'Copied'),
    [copiedLabel, copyLabel],
  );
  const downloadedNoticeLabel = useMemo(
    () => downloadedLabel ?? deriveCopyOutcomeLabel(copyLabel, 'Downloaded'),
    [downloadedLabel, copyLabel],
  );
  copyContextRef.current = { safeUrl, title };
  useEffect(() => () => {
    mountedRef.current = false;
    copyRequestIdRef.current += 1;
    if (copyStatusTimeoutRef.current) window.clearTimeout(copyStatusTimeoutRef.current);
  }, []);
  useEffect(() => {
    copyRequestIdRef.current += 1;
    setCopying(false);
    setCopyStatus('idle');
    if (copyStatusTimeoutRef.current) window.clearTimeout(copyStatusTimeoutRef.current);
  }, [safeUrl]);
  const privateCardHtml = useMemo(() => {
    if (!usesPrivateQr || !qrUrl) return '';
    const titleText = escapeHtml(title);
    const descriptionText = description ? `<p class="detail">${escapeHtml(description)}</p>` : '';
    return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${titleText}</title>
    <style>
      body { margin: 0; padding: 32px; font-family: Inter, Arial, sans-serif; background: #fbf7f1; color: #2f261d; }
      main { max-width: 480px; margin: 0 auto; border: 1px solid #eadfd2; border-radius: 18px; background: #fffdf9; padding: 28px; text-align: center; }
      .eyebrow { margin: 0 0 8px; font-size: 11px; font-weight: 700; text-transform: uppercase; color: #8b6f53; }
      h1 { margin: 0; font-size: 28px; }
      .detail { margin: 12px 0 0; line-height: 1.6; color: #6f5843; }
      img { width: 240px; height: 240px; margin: 20px auto; display: block; border: 1px solid #eadfd2; border-radius: 14px; background: white; padding: 12px; }
      .footer { margin: 0; font-size: 12px; color: #6f5843; }
    </style>
  </head>
  <body>
    <main>
      <p class="eyebrow">Private guest QR</p>
      <h1>${titleText}</h1>
      ${descriptionText}
      <img src="${escapeHtml(qrUrl)}" alt="${titleText} QR code" />
      <p class="footer">${escapeHtml(visibleUrl || 'Private guest link')}</p>
    </main>
  </body>
</html>`;
  }, [description, qrUrl, title, usesPrivateQr, visibleUrl]);

  const copyUrl = async () => {
    if (copying) return;
    const requestId = ++copyRequestIdRef.current;
    const requestSafeUrl = safeUrl;
    const isCurrentCopyRequest = () => (
      mountedRef.current &&
      requestId === copyRequestIdRef.current &&
      requestSafeUrl === copyContextRef.current.safeUrl
    );
    try {
      setCopying(true);
      setCopyStatus('idle');
      const result = await copyTextOrDownload(requestSafeUrl, `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'dayof'}-link.txt`);
      if (!isCurrentCopyRequest()) return;
      setCopyStatus(result === 'copied' ? 'copied' : 'downloaded');
      setCopyFallback(result === 'downloaded');
      if (copyStatusTimeoutRef.current) window.clearTimeout(copyStatusTimeoutRef.current);
      copyStatusTimeoutRef.current = window.setTimeout(() => setCopyStatus('idle'), 1500);
    } catch {
      if (!isCurrentCopyRequest()) return;
      setCopyFallback(true);
      setCopyStatus('error');
      if (copyStatusTimeoutRef.current) window.clearTimeout(copyStatusTimeoutRef.current);
      copyStatusTimeoutRef.current = window.setTimeout(() => setCopyStatus('idle'), 1800);
    } finally {
      if (isCurrentCopyRequest()) setCopying(false);
    }
  };

  const downloadPrivateCard = () => {
    if (!privateCardHtml) return;
    const filenameBase = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'dayof-private-guest-qr';
    downloadTextFile(`${filenameBase}-card.html`, privateCardHtml, 'text/html;charset=utf-8');
  };

  if (!safeUrl) return null;

  return (
    <div className={`rounded-xl border border-border-subtle bg-white p-4 ${className}`}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="flex h-28 w-28 shrink-0 items-center justify-center rounded-xl border border-border-subtle bg-surface-subtle p-2">
          <img src={qrUrl} alt={`${title} QR code`} className="h-full w-full rounded-xl" loading="lazy" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <QrCode className="h-4 w-4 text-primary" aria-hidden="true" />
            <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
          </div>
          {description && <p className="mt-1 text-xs text-text-secondary">{description}</p>}
          <p className="mt-2 truncate rounded-xl border border-border-subtle bg-surface-subtle px-2 py-1.5 text-xs text-text-secondary">
            {visibleUrl}
          </p>
          {copyFallback && !usesPrivateQr && (
            <input
              aria-label={`${title} share link`}
              className="mt-2 w-full rounded-xl border border-border bg-white px-2 py-1.5 text-xs text-text-primary"
              readOnly
              value={safeUrl}
              onFocus={(event) => event.currentTarget.select()}
            />
          )}
          {copyStatus === 'error' && (
            <p role="alert" className="mt-2 text-xs text-error">
              Couldn’t copy that link right now.
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => { void copyUrl(); }} disabled={disabled || copying}>
              <Copy className="mr-1 h-3.5 w-3.5" />
              {copying
                ? 'Copying...'
                : copyStatus === 'copied'
                  ? copiedNoticeLabel
                  : copyStatus === 'downloaded'
                    ? downloadedNoticeLabel
                    : copyStatus === 'error'
                      ? `Retry ${copyLabel.toLowerCase()}`
                      : copyLabel}
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => window.open(qrUrl, '_blank', 'noopener,noreferrer')} disabled={disabled}>
              <ExternalLink className="mr-1 h-3.5 w-3.5" />
              {openLabel}
            </Button>
            <a
              href={disabled ? undefined : qrUrl}
              download
              target="_blank"
              rel="noopener noreferrer"
              aria-disabled={disabled}
              onClick={disabled ? (event) => event.preventDefault() : undefined}
              className={`inline-flex items-center justify-center rounded-xl border border-border bg-white px-3 py-1.5 text-sm font-medium text-text-primary transition-colors hover:bg-surface-subtle ${disabled ? 'pointer-events-none opacity-60' : ''}`}
            >
              {downloadLabel}
            </a>
            {usesPrivateQr && (
              <Button type="button" size="sm" variant="outline" onClick={downloadPrivateCard} disabled={disabled}>
                {privateCardLabel}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
