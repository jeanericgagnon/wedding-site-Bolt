import { buildQrImageUrl, buildTrackedPublicQrPayloadUrl, isSafePublicQrAssetUrl } from './guestHubQrAssets';
import { buildLocalQrSvgDataUrl } from './qr/localQrImage';

export type WeddingIdentityExportId =
  | 'public-qr-card'
  | 'details-insert'
  | 'rsvp-card'
  | 'photo-upload-sign'
  | 'table-card'
  | 'share-graphic'
  | 'identity-summary';

export type WeddingIdentityExportStatus = 'ready' | 'needs-info' | 'planned';

export interface WeddingIdentityExportKitInput {
  coupleNames: string;
  publicSiteUrl: string;
  weddingDate?: string | null;
  venueName?: string | null;
  templateName?: string | null;
  templateId?: string | null;
  defaultLanguage?: string | null;
}

export interface WeddingIdentityExportItem {
  id: WeddingIdentityExportId;
  label: string;
  description: string;
  format: string;
  status: WeddingIdentityExportStatus;
  blockers: string[];
}

export interface WeddingIdentityExportKit {
  title: string;
  readyCount: number;
  items: WeddingIdentityExportItem[];
  manifest: Array<{ label: string; value: string }>;
  warnings: string[];
}

export interface WeddingIdentityPrintAsset {
  id: Extract<WeddingIdentityExportId, 'public-qr-card' | 'details-insert' | 'rsvp-card' | 'photo-upload-sign' | 'table-card'>;
  label: string;
  sizeLabel: string;
  title: string;
  subtitle: string;
  instruction: string;
  url: string;
}

export interface WeddingIdentityStoryGraphic {
  filename: string;
  svg: string;
}

export interface WeddingIdentityPrintSheet {
  filename: string;
  svg: string;
}

export interface WeddingIdentityStyleKit {
  filename: string;
  text: string;
}

type WeddingIdentityPalette = {
  background: string;
  foreground: string;
  accent: string;
  accentSoft: string;
  frame: string;
};

const hasValue = (value: string | null | undefined) => Boolean(value?.trim());

export function buildWeddingIdentityExportKit(input: WeddingIdentityExportKitInput): WeddingIdentityExportKit {
  const coupleNames = input.coupleNames.trim() || 'Your wedding';
  const safePublicSiteUrl = isSafePublicQrAssetUrl(input.publicSiteUrl) ? input.publicSiteUrl.trim() : '';
  const hasPublicUrl = hasValue(safePublicSiteUrl);
  const hasDate = hasValue(input.weddingDate);
  const hasVenue = hasValue(input.venueName);
  const templateName = input.templateName?.trim() || 'Current site theme';
  const defaultLanguage = input.defaultLanguage?.trim() || 'en';

  const items: WeddingIdentityExportItem[] = [
    {
      id: 'public-qr-card',
      label: 'Public site QR card',
      description: 'Small card for welcome bags, detail inserts, and planner handoff.',
      format: 'PNG/PDF target',
      status: hasPublicUrl ? 'ready' : 'needs-info',
      blockers: hasPublicUrl ? [] : ['Set a public site URL.'],
    },
    {
      id: 'details-insert',
      label: 'Details insert',
      description: 'Printable insert with site link, date, venue, and weekend details.',
      format: '5x7 print target',
      status: hasPublicUrl && hasDate && hasVenue ? 'ready' : 'needs-info',
      blockers: [
        ...(!hasPublicUrl ? ['Set a public site URL.'] : []),
        ...(!hasDate ? ['Add a wedding date.'] : []),
        ...(!hasVenue ? ['Add a venue name.'] : []),
      ],
    },
    {
      id: 'rsvp-card',
      label: 'RSVP card',
      description: 'Print-friendly card that points guests to the RSVP path.',
      format: 'A6 print target',
      status: hasPublicUrl ? 'ready' : 'needs-info',
      blockers: hasPublicUrl ? [] : ['Set a public site URL.'],
    },
    {
      id: 'photo-upload-sign',
      label: 'Photo upload sign',
      description: 'QR sign for cocktail hour, reception tables, and after-party memories.',
      format: '8.5x11 print target',
      status: hasPublicUrl ? 'ready' : 'needs-info',
      blockers: hasPublicUrl ? [] : ['Set a public site URL before generating photo signage.'],
    },
    {
      id: 'table-card',
      label: 'Table card',
      description: 'Small tabletop card with the guest hub QR and short instruction line.',
      format: '4x6 print target',
      status: hasPublicUrl ? 'ready' : 'needs-info',
      blockers: hasPublicUrl ? [] : ['Set a public site URL.'],
    },
    {
      id: 'share-graphic',
      label: 'Share graphic',
      description: 'Mobile story and text-message image using the same wedding identity.',
      format: '1080x1920 target',
      status: hasPublicUrl ? 'ready' : 'needs-info',
      blockers: hasPublicUrl ? [] : ['Set a public site URL before generating a share graphic.'],
    },
    {
      id: 'identity-summary',
      label: 'Identity summary',
      description: 'Theme, URL, date, venue, and language handoff for planners and stationers.',
      format: 'Text manifest',
      status: 'ready',
      blockers: [],
    },
  ];

  const warnings = [
    ...(!hasPublicUrl ? ['Set a public site URL before printing QR-based assets.'] : []),
    ...(!hasDate ? ['Add a wedding date for print inserts.'] : []),
    ...(!hasVenue ? ['Add a venue name for detail inserts.'] : []),
  ];

  return {
    title: `${coupleNames} identity export kit`,
    readyCount: items.filter((item) => item.status === 'ready').length,
    items,
    manifest: [
      { label: 'Couple', value: coupleNames },
      { label: 'Public site', value: safePublicSiteUrl || 'Not set' },
      { label: 'Wedding date', value: input.weddingDate || 'Not set' },
      { label: 'Venue', value: input.venueName || 'Not set' },
      { label: 'Theme', value: templateName },
      { label: 'Default language', value: defaultLanguage },
    ],
    warnings,
  };
}

export function buildWeddingIdentityManifestText(kit: WeddingIdentityExportKit): string {
  const manifestLines = kit.manifest.map((entry) => `${entry.label}: ${entry.value}`);
  const assetLines = kit.items.map((item) => {
    const blockerText = item.blockers.length > 0 ? ` (${item.blockers.join(' ')})` : '';
    return `- ${item.label}: ${item.status}${blockerText}`;
  });

  return [
    kit.title,
    '',
    'Identity',
    ...manifestLines,
    '',
    'Export readiness',
    ...assetLines,
  ].join('\n');
}

function cleanPrintText(value: string | null | undefined, fallback: string): string {
  const cleaned = value?.replace(/\s+/g, ' ').trim();
  return cleaned || fallback;
}

function buildWeddingMonogram(coupleNames: string): string {
  const initials = coupleNames
    .split(/[\s&+/,-]+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 3)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .filter(Boolean);

  if (initials.length >= 2) return initials.slice(0, 2).join(' · ');
  if (initials.length === 1) return initials[0]!;
  return 'D · O';
}

export function resolveWeddingIdentityPalette(input: WeddingIdentityExportKitInput): WeddingIdentityPalette {
  const key = `${input.templateId ?? ''} ${input.templateName ?? ''}`.toLowerCase();

  if (key.includes('editorial') || key.includes('luxury')) {
    return {
      background: '#171311',
      foreground: '#f7efe2',
      accent: '#cfb27a',
      accentSoft: '#2b221d',
      frame: '#8c7452',
    };
  }
  if (key.includes('coastal')) {
    return {
      background: '#eef6f7',
      foreground: '#14333d',
      accent: '#5d8ea0',
      accentSoft: '#d7e8ed',
      frame: '#9bbdc6',
    };
  }
  if (key.includes('garden') || key.includes('romantic')) {
    return {
      background: '#f8f2eb',
      foreground: '#45332d',
      accent: '#9b6d6d',
      accentSoft: '#ecd9d2',
      frame: '#d3b7a8',
    };
  }
  if (key.includes('playful')) {
    return {
      background: '#fff7ef',
      foreground: '#3d2a22',
      accent: '#f08a5d',
      accentSoft: '#ffe2d2',
      frame: '#e7b392',
    };
  }

  return {
    background: '#fbf8f3',
    foreground: '#2d241d',
    accent: '#7c5d49',
    accentSoft: '#ebe1d4',
    frame: '#d7c8b7',
  };
}

function hexChannelToNumber(value: string): number {
  return Number.parseInt(value, 16);
}

function normalizeHexColor(value: string): string {
  const trimmed = value.trim();
  if (/^#[\da-f]{6}$/i.test(trimmed)) return trimmed.toLowerCase();
  if (/^#[\da-f]{3}$/i.test(trimmed)) {
    const [, r, g, b] = trimmed;
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  return '#000000';
}

function toLinearChannel(value: number): number {
  const normalized = value / 255;
  return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
}

export function getHexContrastRatio(foreground: string, background: string): number {
  const foregroundHex = normalizeHexColor(foreground);
  const backgroundHex = normalizeHexColor(background);
  const [fr, fg, fb] = [foregroundHex.slice(1, 3), foregroundHex.slice(3, 5), foregroundHex.slice(5, 7)].map(hexChannelToNumber);
  const [br, bg, bb] = [backgroundHex.slice(1, 3), backgroundHex.slice(3, 5), backgroundHex.slice(5, 7)].map(hexChannelToNumber);
  const foregroundLuminance = 0.2126 * toLinearChannel(fr) + 0.7152 * toLinearChannel(fg) + 0.0722 * toLinearChannel(fb);
  const backgroundLuminance = 0.2126 * toLinearChannel(br) + 0.7152 * toLinearChannel(bg) + 0.0722 * toLinearChannel(bb);
  const lighter = Math.max(foregroundLuminance, backgroundLuminance);
  const darker = Math.min(foregroundLuminance, backgroundLuminance);
  return (lighter + 0.05) / (darker + 0.05);
}

function fitSvgFontSize(value: string, options: { max: number; min: number; threshold: number; step: number }): number {
  const text = value.trim();
  if (!text) return options.max;
  const overflow = Math.max(0, text.length - options.threshold);
  const reduction = Math.ceil(overflow / options.step) * 4;
  return Math.max(options.min, options.max - reduction);
}

function formatWeddingDate(value: string | null | undefined): string {
  const cleaned = value?.trim();
  if (!cleaned) return 'Wedding details';

  const date = new Date(`${cleaned}T00:00:00`);
  if (Number.isNaN(date.getTime())) return cleaned;
  return new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).format(date);
}

function withPath(publicSiteUrl: string, path: string): string {
  try {
    const url = new URL(publicSiteUrl);
    url.pathname = path;
    url.search = '';
    url.hash = '';
    return url.toString();
  } catch {
    return publicSiteUrl;
  }
}

export function buildWeddingIdentityPrintAssets(input: WeddingIdentityExportKitInput): WeddingIdentityPrintAsset[] {
  const publicSiteUrl = input.publicSiteUrl.trim();
  if (!isSafePublicQrAssetUrl(publicSiteUrl)) return [];

  const coupleNames = cleanPrintText(input.coupleNames, 'The wedding');
  const dateLabel = formatWeddingDate(input.weddingDate);
  const venueName = cleanPrintText(input.venueName, 'Wedding venue');
  const trackedPublicSiteUrl = buildTrackedPublicQrPayloadUrl(publicSiteUrl) || publicSiteUrl;
  const rsvpUrl = withPath(publicSiteUrl, '/rsvp');
  const photoUrl = withPath(publicSiteUrl, '/photos/upload');

  if (!isSafePublicQrAssetUrl(rsvpUrl) || !isSafePublicQrAssetUrl(photoUrl)) return [];

  return [
    {
      id: 'public-qr-card',
      label: 'Public site QR card',
      sizeLabel: '3.5 x 2 in',
      title: coupleNames,
      subtitle: 'Wedding website',
      instruction: 'Scan for schedule, travel, registry, photos, and RSVP details.',
      url: trackedPublicSiteUrl,
    },
    {
      id: 'details-insert',
      label: 'Details insert',
      sizeLabel: '5 x 7 in',
      title: 'Wedding details',
      subtitle: `${dateLabel} · ${venueName}`,
      instruction: 'Scan for the latest weekend details before you travel.',
      url: trackedPublicSiteUrl,
    },
    {
      id: 'rsvp-card',
      label: 'RSVP card',
      sizeLabel: 'A6',
      title: 'Reply online',
      subtitle: coupleNames,
      instruction: 'Scan to RSVP and answer meal or event questions.',
      url: rsvpUrl,
    },
    {
      id: 'photo-upload-sign',
      label: 'Photo upload sign',
      sizeLabel: '8.5 x 11 in',
      title: 'Share your photos',
      subtitle: coupleNames,
      instruction: 'Scan to upload photos or video without an app.',
      url: photoUrl,
    },
    {
      id: 'table-card',
      label: 'Table card',
      sizeLabel: '4 x 6 in',
      title: 'Everything in one place',
      subtitle: coupleNames,
      instruction: 'Scan for the wedding hub anytime today.',
      url: trackedPublicSiteUrl,
    },
  ];
}

export function buildWeddingIdentityStoryGraphic(input: WeddingIdentityExportKitInput): WeddingIdentityStoryGraphic | null {
  const publicSiteUrl = input.publicSiteUrl.trim();
  if (!isSafePublicQrAssetUrl(publicSiteUrl)) return null;

  const palette = resolveWeddingIdentityPalette(input);
  const coupleNames = cleanPrintText(input.coupleNames, 'Your wedding');
  const monogram = buildWeddingMonogram(coupleNames);
  const dateLabel = formatWeddingDate(input.weddingDate);
  const venueName = cleanPrintText(input.venueName, 'Wedding details');
  const monogramFontSize = fitSvgFontSize(monogram, { max: 128, min: 96, threshold: 5, step: 2 });
  const coupleFontSize = fitSvgFontSize(coupleNames, { max: 56, min: 38, threshold: 18, step: 4 });
  const venueFontSize = fitSvgFontSize(venueName, { max: 34, min: 24, threshold: 26, step: 6 });
  const qrUrl = buildLocalQrSvgDataUrl(buildTrackedPublicQrPayloadUrl(publicSiteUrl) || publicSiteUrl, 420);
  if (!qrUrl) return null;

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1080" height="1920" viewBox="0 0 1080 1920" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="1080" height="1920" fill="${palette.background}"/>
  <rect x="72" y="72" width="936" height="1776" rx="40" fill="${palette.background}" stroke="${palette.frame}" stroke-width="2"/>
  <rect x="132" y="132" width="816" height="360" rx="28" fill="${palette.accentSoft}"/>
  <text x="540" y="240" text-anchor="middle" fill="${palette.accent}" font-family="Georgia, 'Times New Roman', serif" font-size="44">dayof wedding weekend</text>
  <text x="540" y="360" text-anchor="middle" fill="${palette.foreground}" font-family="Georgia, 'Times New Roman', serif" font-size="${monogramFontSize}">${escapeXml(monogram)}</text>
  <text x="540" y="445" text-anchor="middle" fill="${palette.foreground}" font-family="Arial, sans-serif" font-size="${coupleFontSize}">${escapeXml(coupleNames)}</text>
  <text x="540" y="748" text-anchor="middle" fill="${palette.foreground}" font-family="Georgia, 'Times New Roman', serif" font-size="54">${escapeXml(dateLabel)}</text>
  <text x="540" y="812" text-anchor="middle" fill="${palette.foreground}" font-family="Arial, sans-serif" font-size="${venueFontSize}">${escapeXml(venueName)}</text>
  <rect x="300" y="892" width="480" height="480" rx="24" fill="#ffffff"/>
  <image x="330" y="922" width="420" height="420" href="${escapeXml(qrUrl)}"/>
  <text x="540" y="1470" text-anchor="middle" fill="${palette.foreground}" font-family="Arial, sans-serif" font-size="36">Scan for RSVP, schedule, registry, travel, and photo sharing.</text>
  <text x="540" y="1562" text-anchor="middle" fill="${palette.accent}" font-family="Arial, sans-serif" font-size="26">${escapeXml(publicSiteUrl)}</text>
</svg>`;

  return {
    filename: 'dayof-wedding-story-graphic.svg',
    svg,
  };
}

export function buildWeddingIdentityStyleKit(input: WeddingIdentityExportKitInput): WeddingIdentityStyleKit {
  const palette = resolveWeddingIdentityPalette(input);
  const coupleNames = cleanPrintText(input.coupleNames, 'Your wedding');
  const monogram = buildWeddingMonogram(coupleNames);
  const themeName = input.templateName?.trim() || 'Current site theme';
  const dateLabel = formatWeddingDate(input.weddingDate);
  const venueName = cleanPrintText(input.venueName, 'Not set');
  const safePublicSiteUrl = isSafePublicQrAssetUrl(input.publicSiteUrl) ? input.publicSiteUrl.trim() : 'Not set';
  const defaultLanguage = input.defaultLanguage?.trim() || 'en';

  return {
    filename: 'dayof-wedding-identity-style-kit.txt',
    text: [
      `${coupleNames} wedding identity kit`,
      '',
      'Identity',
      `Monogram: ${monogram}`,
      `Theme: ${themeName}`,
      `Public site: ${safePublicSiteUrl}`,
      `Wedding date: ${dateLabel}`,
      `Venue: ${venueName}`,
      `Default language: ${defaultLanguage}`,
      '',
      'Palette',
      `Background: ${palette.background}`,
      `Foreground: ${palette.foreground}`,
      `Accent: ${palette.accent}`,
      `Accent soft: ${palette.accentSoft}`,
      `Frame: ${palette.frame}`,
      '',
      'Typography',
      'Display: Georgia, Times New Roman, serif',
      'Support: Arial, sans-serif',
      '',
      'Usage notes',
      'Use the monogram for welcome signage, RSVP cards, and small story graphics.',
      'Keep QR exports on first-party public URLs only.',
      'Do not add guest-specific or private invite URLs to shared print assets.',
    ].join('\n'),
  };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeXml(value: string): string {
  return escapeHtml(value);
}

function wrapSvgTextLines(value: string, maxChars: number): string[] {
  const words = value.replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
  if (words.length === 0) return [];

  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxChars || !current) {
      current = candidate;
      continue;
    }
    lines.push(current);
    current = word;
  }
  if (current) lines.push(current);
  return lines;
}

export function renderWeddingIdentityPrintSvg(assets: WeddingIdentityPrintAsset[]): WeddingIdentityPrintSheet | null {
  const safeAssets = assets.filter((asset) => isSafePublicQrAssetUrl(asset.url));
  if (safeAssets.length === 0) return null;

  const cardWidth = 1080;
  const cardHeight = 720;
  const gap = 48;
  const columns = 2;
  const padding = 72;
  const rows = Math.max(1, Math.ceil(safeAssets.length / columns));
  const width = padding * 2 + columns * cardWidth + (columns - 1) * gap;
  const height = padding * 2 + rows * cardHeight + (rows - 1) * gap;

  const cards = safeAssets.map((asset, index) => {
    const qrUrl = buildLocalQrSvgDataUrl(asset.url, 420);
    const instructionLines = wrapSvgTextLines(asset.instruction, 34);
    const urlLines = wrapSvgTextLines(asset.url, 58);
    const column = index % columns;
    const row = Math.floor(index / columns);
    const x = padding + column * (cardWidth + gap);
    const y = padding + row * (cardHeight + gap);

    return `
  <g transform="translate(${x} ${y})">
    <rect width="${cardWidth}" height="${cardHeight}" rx="28" fill="#fffaf4" stroke="#d7c8b7" stroke-width="4"/>
    <text x="64" y="72" fill="#7d654d" font-family="Arial, sans-serif" font-size="24" font-weight="700">${escapeXml(asset.label)} · ${escapeXml(asset.sizeLabel)}</text>
    <text x="64" y="160" fill="#2d241d" font-family="Georgia, 'Times New Roman', serif" font-size="64">${escapeXml(asset.title)}</text>
    <text x="64" y="220" fill="#695540" font-family="Arial, sans-serif" font-size="28">${escapeXml(asset.subtitle)}</text>
    <rect x="648" y="108" width="300" height="300" rx="20" fill="#ffffff" stroke="#eadfd2" stroke-width="4"/>
    <image x="690" y="150" width="216" height="216" href="${escapeXml(qrUrl)}"/>
    <text x="64" y="340" fill="#403328" font-family="Arial, sans-serif" font-size="28" font-weight="700">
      ${instructionLines.map((line, lineIndex) => `<tspan x="64" dy="${lineIndex === 0 ? 0 : 38}">${escapeXml(line)}</tspan>`).join('')}
    </text>
    <text x="64" y="560" fill="#755f48" font-family="Arial, sans-serif" font-size="20">
      ${urlLines.map((line, lineIndex) => `<tspan x="64" dy="${lineIndex === 0 ? 0 : 28}">${escapeXml(line)}</tspan>`).join('')}
    </text>
  </g>`;
  }).join('\n');

  return {
    filename: 'dayof-wedding-identity-print-pack.svg',
    svg: `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="${width}" height="${height}" fill="#fbf8f3"/>
${cards}
</svg>`,
  };
}

export function renderWeddingIdentityPrintHtml(assets: WeddingIdentityPrintAsset[]): string {
  const safeAssets = assets.filter((asset) => isSafePublicQrAssetUrl(asset.url));
  const cards = safeAssets.map((asset) => {
    const qrUrl = buildQrImageUrl(asset.url, 440);
    return `
      <section class="asset ${escapeHtml(asset.id)}">
        <p class="eyebrow">${escapeHtml(asset.label)} · ${escapeHtml(asset.sizeLabel)}</p>
        <h1>${escapeHtml(asset.title)}</h1>
        <p class="subtitle">${escapeHtml(asset.subtitle)}</p>
        <img src="${escapeHtml(qrUrl)}" alt="${escapeHtml(asset.label)} QR code" />
        <p class="instruction">${escapeHtml(asset.instruction)}</p>
        <p class="url">${escapeHtml(asset.url)}</p>
      </section>
    `;
  }).join('\n');

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>DayOf wedding identity print pack</title>
  <style>
    @page { size: letter; margin: 0.42in; }
    * { box-sizing: border-box; }
    body { margin: 0; color: #28231f; font-family: Georgia, 'Times New Roman', serif; background: #fbf8f3; }
    .sheet { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.28in; }
    .asset { min-height: 4.85in; break-inside: avoid; border: 1px solid #d7c8b7; border-radius: 8px; background: #fffaf4; padding: 0.32in; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center; }
    .photo-upload-sign { grid-column: 1 / -1; min-height: 6.5in; }
    .eyebrow { margin: 0 0 0.12in; color: #7d654d; font: 700 10px/1.35 Arial, sans-serif; letter-spacing: 0; text-transform: uppercase; }
    h1 { margin: 0; max-width: 100%; font-size: 30px; line-height: 1.12; font-weight: 500; overflow-wrap: anywhere; }
    .subtitle { margin: 0.12in 0 0; max-width: 100%; color: #695540; font: 14px/1.45 Arial, sans-serif; overflow-wrap: anywhere; }
    img { width: 1.85in; height: 1.85in; margin: 0.25in 0 0.16in; border: 1px solid #eadfd2; border-radius: 8px; padding: 0.08in; background: white; }
    .photo-upload-sign img { width: 2.4in; height: 2.4in; }
    .instruction { margin: 0; max-width: 100%; color: #403328; font: 700 14px/1.45 Arial, sans-serif; overflow-wrap: anywhere; }
    .url { max-width: 100%; margin: 0.12in 0 0; color: #755f48; font: 10px/1.35 Arial, sans-serif; overflow-wrap: anywhere; }
  </style>
</head>
<body>
  <main class="sheet">
    ${cards}
  </main>
</body>
</html>`;
}
