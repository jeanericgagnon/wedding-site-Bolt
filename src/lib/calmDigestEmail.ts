import type { CalmDigestDeliveryPreview } from './calmOwnerDigest';

export interface CalmDigestEmailRender {
  subject: string;
  text: string;
  html: string;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function renderCalmDigestEmail(preview: CalmDigestDeliveryPreview): CalmDigestEmailRender {
  const headerLine = `${preview.cadenceLabel} · ${preview.audienceLabel} · ${preview.statusLabel}`;
  const text = [
    preview.subject,
    headerLine,
    '',
    ...preview.previewLines.map((line) => `- ${line}`),
    '',
    ...preview.safetyNotes,
    '',
    `Review preferences: ${preview.reviewHref}`,
  ].join('\n');

  const html = [
    '<!doctype html>',
    '<html lang="en">',
    '<body style="margin:0;padding:24px;background:#f7f4ef;color:#1f2937;font-family:Inter,Arial,sans-serif;">',
    '<div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:16px;padding:24px;">',
    `<p style="margin:0 0 8px;font-size:12px;letter-spacing:0;text-transform:uppercase;color:#6b7280;">${escapeHtml(preview.cadenceLabel)}</p>`,
    `<h1 style="margin:0 0 8px;font-size:24px;line-height:1.3;color:#111827;">${escapeHtml(preview.subject)}</h1>`,
    `<p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#4b5563;">${escapeHtml(headerLine)}</p>`,
    '<div style="display:grid;gap:10px;">',
    ...preview.previewLines.map((line) => `<div style="border:1px solid #e5e7eb;border-radius:12px;padding:12px 14px;font-size:14px;line-height:1.6;color:#374151;">${escapeHtml(line)}</div>`),
    '</div>',
    `<p style="margin:20px 0 0;font-size:12px;line-height:1.6;color:#6b7280;">${escapeHtml(preview.safetyNotes.join(' '))}</p>`,
    '</div>',
    '</body>',
    '</html>',
  ].join('');

  return {
    subject: preview.subject,
    text,
    html,
  };
}
