import { getSafePublicWebUrl } from '../sections/publicLinks';

export type GuestHubQrAssetKind = 'welcome-sign' | 'table-card' | 'invite-insert' | 'photo-prompt';

export interface GuestHubQrAsset {
  kind: GuestHubQrAssetKind;
  title: string;
  subtitle: string;
  instruction: string;
  url: string;
}

export interface GuestHubQrAssetInput {
  hubUrl: string;
  coupleLabel: string;
  actionSummary: string;
  includePhotoPrompt?: boolean;
}

const TOKENISH_PARAM = /(token|invite|secret|secure|signature|signed|jwt|key|access|auth|bearer|cookie|passcode|password|session)/i;

export const buildQrImageUrl = (url: string, size = 512) =>
  isSafePublicQrAssetUrl(url)
    ? `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(url)}`
    : '';

function cleanText(value: string, fallback: string): string {
  const cleaned = value.replace(/\s+/g, ' ').trim();
  return cleaned || fallback;
}

export function isSafePublicQrAssetUrl(value: string): boolean {
  try {
    const safeUrl = getSafePublicWebUrl(value);
    if (!safeUrl) return false;
    const url = new URL(safeUrl);
    for (const key of url.searchParams.keys()) {
      if (TOKENISH_PARAM.test(key)) return false;
    }
    for (const [key, paramValue] of url.searchParams.entries()) {
      if (TOKENISH_PARAM.test(paramValue)) return false;
      if (TOKENISH_PARAM.test(safeDecodeURIComponent(key))) return false;
    }
    if (TOKENISH_PARAM.test(url.hash)) return false;
    if (TOKENISH_PARAM.test(safeDecodeURIComponent(url.hash))) return false;
    return true;
  } catch {
    return false;
  }
}

function safeDecodeURIComponent(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function buildGuestHubQrAssets(input: GuestHubQrAssetInput): GuestHubQrAsset[] {
  const hubUrl = input.hubUrl.trim();
  if (!isSafePublicQrAssetUrl(hubUrl)) return [];

  const coupleLabel = cleanText(input.coupleLabel, 'The wedding');
  const actionSummary = cleanText(input.actionSummary, 'the wedding details');
  const baseAssets: GuestHubQrAsset[] = [
    {
      kind: 'welcome-sign',
      title: `${coupleLabel}`,
      subtitle: 'Welcome to the wedding',
      instruction: `Scan for ${actionSummary}.`,
      url: hubUrl,
    },
    {
      kind: 'table-card',
      title: 'Find everything here',
      subtitle: coupleLabel,
      instruction: 'Scan for the wedding hub before dinner starts.',
      url: hubUrl,
    },
    {
      kind: 'invite-insert',
      title: 'Keep this link close',
      subtitle: coupleLabel,
      instruction: `The QR opens ${actionSummary}.`,
      url: hubUrl,
    },
  ];

  if (input.includePhotoPrompt !== false) {
    baseAssets.push({
      kind: 'photo-prompt',
      title: 'Share the moments you catch',
      subtitle: coupleLabel,
      instruction: 'Scan to upload photos or video without an app.',
      url: hubUrl,
    });
  }

  return baseAssets;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function renderGuestHubQrPrintHtml(assets: GuestHubQrAsset[]): string {
  const safeAssets = assets.filter((asset) => isSafePublicQrAssetUrl(asset.url));
  const cards = safeAssets.map((asset) => {
    const qrUrl = buildQrImageUrl(asset.url, 420);
    return `
      <section class="card ${escapeHtml(asset.kind)}">
        <p class="eyebrow">dayof wedding hub</p>
        <h1>${escapeHtml(asset.title)}</h1>
        <p class="subtitle">${escapeHtml(asset.subtitle)}</p>
        <img src="${escapeHtml(qrUrl)}" alt="${escapeHtml(asset.title)} QR code" />
        <p class="instruction">${escapeHtml(asset.instruction)}</p>
        <p class="url">${escapeHtml(asset.url)}</p>
      </section>
    `;
  }).join('\n');

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>DayOf guest hub QR print pack</title>
  <style>
    @page { size: letter; margin: 0.4in; }
    * { box-sizing: border-box; }
    body { margin: 0; color: #2f261d; font-family: Georgia, 'Times New Roman', serif; background: #fbf7f1; }
    .sheet { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.28in; }
    .card { min-height: 4.85in; break-inside: avoid; border: 1px solid #d8c8b7; border-radius: 8px; background: #fffaf3; padding: 0.34in; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center; }
    .eyebrow { margin: 0 0 0.12in; color: #8b6f53; font: 700 10px/1.3 Arial, sans-serif; letter-spacing: 0; text-transform: uppercase; }
    h1 { margin: 0; font-size: 28px; line-height: 1.12; font-weight: 500; }
    .subtitle { margin: 0.12in 0 0; color: #6f5843; font: 14px/1.45 Arial, sans-serif; }
    img { width: 1.75in; height: 1.75in; margin: 0.25in 0 0.16in; border: 1px solid #eadfd2; border-radius: 8px; padding: 0.08in; background: white; }
    .instruction { margin: 0; color: #4b3a2b; font: 700 14px/1.45 Arial, sans-serif; }
    .url { max-width: 100%; margin: 0.12in 0 0; color: #80664d; font: 10px/1.35 Arial, sans-serif; overflow-wrap: anywhere; }
  </style>
</head>
<body>
  <main class="sheet">
    ${cards}
  </main>
</body>
</html>`;
}
