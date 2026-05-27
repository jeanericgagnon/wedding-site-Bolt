import { getSafePublicWebUrl } from '../sections/publicLinks';
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
  isPublished?: boolean | null;
  privacyMode?: 'public' | 'password_protected' | 'invite_only' | null;
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
  confidenceTitle: string;
  confidenceDetail: string;
  focusTitle: string;
  focusDetail: string;
  bestNextMove: string;
  decisionRule: string;
  deliveryNote: string;
  items: WeddingIdentityExportItem[];
  manifest: Array<{ label: string; value: string }>;
  warnings: string[];
  handoffSequence: Array<{
    id: 'share-now' | 'print-table' | 'planner-handoff';
    status: 'current' | 'next' | 'then';
    title: string;
    detail: string;
  }>;
  quickPacks: Array<{
    id: 'share-now' | 'print-table' | 'planner-handoff';
    label: string;
    detail: string;
    readiness: 'ready' | 'needs-info';
    bestFor: string;
    includes: string[];
    nextStep: string;
  }>;
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

const TOKENISH_PARAM = /(token|invite|secret|secure|signature|signed|jwt|key|access|auth|bearer|cookie|passcode|password|session)/i;

const hasValue = (value: string | null | undefined) => Boolean(value?.trim());

function safeDecodeURIComponent(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function isSafePublicQrAssetUrl(value: string): boolean {
  try {
    const safeUrl = getSafePublicWebUrl(value);
    if (!safeUrl) return false;
    const url = new URL(safeUrl);
    for (const key of url.searchParams.keys()) {
      if (TOKENISH_PARAM.test(key)) return false;
      if (TOKENISH_PARAM.test(safeDecodeURIComponent(key))) return false;
    }
    for (const paramValue of url.searchParams.values()) {
      if (TOKENISH_PARAM.test(paramValue)) return false;
      if (TOKENISH_PARAM.test(safeDecodeURIComponent(paramValue))) return false;
    }
    if (TOKENISH_PARAM.test(url.hash)) return false;
    if (TOKENISH_PARAM.test(safeDecodeURIComponent(url.hash))) return false;
    return true;
  } catch {
    return false;
  }
}

export function buildWeddingIdentityExportKit(input: WeddingIdentityExportKitInput): WeddingIdentityExportKit {
  const coupleNames = input.coupleNames.trim() || 'Your wedding';
  const safePublicSiteUrl = isSafePublicQrAssetUrl(input.publicSiteUrl) ? input.publicSiteUrl.trim() : '';
  const hasPublicUrl = hasValue(safePublicSiteUrl);
  const hasDate = hasValue(input.weddingDate);
  const hasVenue = hasValue(input.venueName);
  const launchIsLive = input.isPublished !== false;
  const restrictedAccess = input.privacyMode === 'password_protected' || input.privacyMode === 'invite_only';
  const privacyModeLabel = input.privacyMode === 'invite_only'
    ? 'invite-only'
    : input.privacyMode === 'password_protected'
      ? 'password-protected'
      : 'public';
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
    ...(hasPublicUrl && restrictedAccess ? [`The site is currently ${privacyModeLabel}, so guest-facing packs should only be shared with the right access instructions.`] : []),
    ...(!hasDate ? ['Add a wedding date for print inserts.'] : []),
    ...(!hasVenue ? ['Add a venue name for detail inserts.'] : []),
  ];

  return {
    title: `${coupleNames} identity export kit`,
    readyCount: items.filter((item) => item.status === 'ready').length,
    confidenceTitle: !hasPublicUrl
      ? 'Foundation first'
      : restrictedAccess
        ? 'Share carefully'
        : !launchIsLive
          ? 'Almost handoff-ready'
          : 'Ready for premium handoff',
    confidenceDetail: !hasPublicUrl
      ? 'The design language is usable now, but the public site URL still has to exist before these packs feel real.'
      : restrictedAccess
        ? `The packs themselves are ready, but the guest experience still depends on clean ${privacyModeLabel} instructions traveling with them.`
      : !launchIsLive
        ? 'The URL, print assets, and story pack are lined up. One live publish is the last trust step before wide sharing.'
        : 'The site, print assets, and share packs are aligned enough to hand off to guests, planners, and stationers without extra translation.',
    focusTitle: !hasPublicUrl
      ? 'Give the kit one trustworthy public URL'
      : restrictedAccess
        ? 'Keep access instructions traveling with every pack'
        : !launchIsLive
          ? 'Make the guest-facing site live before volume sharing'
          : 'Carry one wedding identity across every handoff',
    focusDetail: !hasPublicUrl
      ? 'The design system is ready, but the exports will still feel provisional until one guest-safe URL anchors every QR and printed cue.'
      : restrictedAccess
        ? `These assets are ready, but the guest experience still depends on making the ${privacyModeLabel} instructions impossible to miss.`
        : !launchIsLive
          ? 'The packs already agree with each other; the last missing ingredient is a live destination behind every QR and short URL.'
          : 'This is the stage where consistency matters more than invention: the same URL, tone, and access story should show up everywhere.',
    bestNextMove: !hasPublicUrl
      ? 'Set the clean public URL first, then regenerate the guest-facing QR and print packs once every asset can point to the same trustworthy path.'
      : restrictedAccess
        ? `Pair every guest-facing pack with the ${privacyModeLabel} instructions first, then only share the exports that preserve that exact front-door clarity.`
        : !launchIsLive
          ? 'Publish the guest-facing site first, then use the share and print packs once the live path is truly ready for guests to follow.'
          : 'Start with the share-now pack, then carry the exact same URL and identity forward into print and planner handoff without remixing the guest path.',
    decisionRule: !hasPublicUrl
      ? 'Do not print or share QR-led assets until the public URL is set and guest-safe.'
      : restrictedAccess
        ? `When access is ${privacyModeLabel}, clarity beats aesthetics: the right password or invite path has to travel with every export.`
        : !launchIsLive
          ? 'If the packs are ready but the site is not live, publish before you scale the handoff.'
          : 'Once the public path is trustworthy, reuse the same identity everywhere instead of improvising by channel.',
    deliveryNote: restrictedAccess
      ? `Every guest-facing export should travel with the same ${privacyModeLabel} instructions so the handoff still feels deliberate.`
      : !launchIsLive
        ? 'Publish the guest-facing site before you print in volume so every QR and short URL points to something trustworthy.'
        : 'Lead with one guest-safe URL everywhere so print, story, and planner packs all reinforce the same handoff.',
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
    handoffSequence: [
      {
        id: 'share-now',
        status: 'current',
        title: !hasPublicUrl
          ? 'Set the public site first'
          : restrictedAccess
            ? 'Confirm the guest access instructions first'
          : !launchIsLive
            ? 'Make the guest-facing site live first'
            : 'Share one safe guest-facing pack',
        detail: !hasPublicUrl
          ? 'The public site URL is the first ingredient for safe QR cards, story graphics, and RSVP handoff.'
          : restrictedAccess
            ? `These packs point to a ${privacyModeLabel} site, so make sure guests will receive the right password or invite path before you share them widely.`
          : !launchIsLive
            ? 'The URL is set, but the guest-facing site still needs one live publish before print and share packs feel trustworthy.'
            : 'Lead with the share graphic, RSVP card, and public QR so every guest-facing surface starts from the same URL.',
      },
      {
        id: 'print-table',
        status: 'next',
        title: !hasPublicUrl
          ? 'Finish the print details next'
          : !launchIsLive
            ? 'Share and print after the live publish'
            : hasDate && hasVenue
              ? 'Carry the same identity into print'
              : 'Finish the print details next',
        detail: !hasPublicUrl
          ? 'Add the date, venue, and public site so welcome-table and signage assets stop feeling provisional.'
          : !launchIsLive
            ? 'Once the live publish is up, use the share pack, table card, insert, and photo sign from the same guest-safe URL.'
            : hasDate && hasVenue
              ? 'Once the share pack is steady, use the table card, insert, and photo sign so print surfaces stay aligned.'
              : 'Add the date, venue, and public site so welcome-table and signage assets stop feeling provisional.',
      },
      {
        id: 'planner-handoff',
        status: 'then',
        title: 'Hand vendors one clean reference',
        detail: 'Close the loop with the manifest and style kit so planners and stationers stop asking you for repeat basics.',
      },
    ],
    quickPacks: [
      {
        id: 'share-now',
        label: 'Share-now pack',
        detail: hasPublicUrl
          ? restrictedAccess
            ? `The share pack is assembled, but it should travel with the ${privacyModeLabel === 'invite-only' ? 'invite-only access path' : 'password instructions'} so guests are not stranded.`
            : launchIsLive
            ? 'Use the share graphic, RSVP card, and public QR card when you need one fast guest-facing set.'
            : 'The share pack is assembled, but it should wait until the guest-facing site has one real live publish.'
          : 'Set the public site URL first so the guest-facing share pack can be generated safely.',
        readiness: hasPublicUrl ? 'ready' : 'needs-info',
        bestFor: 'Best when you need one quick guest-facing kit for text, DM, or email right now.',
        includes: ['Share graphic', 'RSVP card', 'Public QR card'],
        nextStep: hasPublicUrl
          ? restrictedAccess
            ? privacyModeLabel === 'invite-only'
              ? 'Pair the share pack with the invite-only guest path so the right people land in the right place without confusion.'
              : 'Share the password instructions with the pack so guests can actually use the link you hand them.'
            : launchIsLive
            ? 'Send the share graphic first, then reuse the same URL on RSVP and QR surfaces.'
            : 'Publish the live site once, then send the share graphic so every guest-facing link resolves with confidence.'
          : 'Set the public site URL so the guest-facing share pack is safe to copy or print.',
      },
      {
        id: 'print-table',
        label: 'Print-table pack',
        detail: hasPublicUrl && hasDate && hasVenue
          ? 'Use the details insert, table card, and photo sign for welcome tables, bags, and event signage.'
          : 'Add the public site, date, and venue so the print-table pack feels complete instead of partial.',
        readiness: hasPublicUrl && hasDate && hasVenue ? 'ready' : 'needs-info',
        bestFor: 'Best for welcome tables, hotel bags, reception signage, and guest-visible print surfaces.',
        includes: ['Details insert', 'Table card', 'Photo upload sign'],
        nextStep: hasPublicUrl && hasDate && hasVenue ? 'Print the details insert and table card together so signage and guest handouts never drift apart.' : 'Add the date, venue, and public site so the print surfaces feel complete instead of provisional.',
      },
      {
        id: 'planner-handoff',
        label: 'Planner handoff pack',
        detail: 'Use the identity summary and style kit when you want one consistent reference for planners, stationers, and print partners.',
        readiness: 'ready',
        bestFor: 'Best when someone else needs the wedding identity quickly without asking you to repeat basics.',
        includes: ['Identity summary', 'Style kit', 'Public site URL'],
        nextStep: 'Copy the manifest and style kit together so vendors get the same URL, language, and visual direction in one pass.',
      },
    ],
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
      url: publicSiteUrl,
    },
    {
      id: 'details-insert',
      label: 'Details insert',
      sizeLabel: '5 x 7 in',
      title: 'Wedding details',
      subtitle: `${dateLabel} · ${venueName}`,
      instruction: 'Scan for the latest weekend details before you travel.',
      url: publicSiteUrl,
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
      url: publicSiteUrl,
    },
  ];
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
  const qrUrl = buildLocalQrSvgDataUrl(publicSiteUrl, 420);
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

export function renderWeddingIdentityPrintSvg(assets: WeddingIdentityPrintAsset[]): WeddingIdentityPrintSheet | null {
  const safeAssets = assets.filter((asset) => isSafePublicQrAssetUrl(asset.url));
  if (safeAssets.length === 0) return null;

  const cardWidth = 520;
  const cardHeight = 360;
  const gap = 32;
  const padding = 48;
  const columns = 2;
  const rows = Math.ceil(safeAssets.length / columns);
  const width = padding * 2 + columns * cardWidth + (columns - 1) * gap;
  const height = padding * 2 + rows * cardHeight + (rows - 1) * gap;

  const cards = safeAssets.map((asset, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    const x = padding + column * (cardWidth + gap);
    const y = padding + row * (cardHeight + gap);
    const qrDataUrl = buildLocalQrSvgDataUrl(asset.url, 220);
    const subtitleLines = wrapSvgTextLines(asset.subtitle, 28).slice(0, 2);
    const instructionLines = wrapSvgTextLines(asset.instruction, 38).slice(0, 3);
    return `
      <g transform="translate(${x} ${y})">
        <rect width="${cardWidth}" height="${cardHeight}" rx="24" fill="#fbf8f3" stroke="#d7c8b7" stroke-width="2"/>
        <text x="36" y="54" fill="#7c5d49" font-family="Arial, sans-serif" font-size="18" font-weight="700">${escapeXml(asset.label)}</text>
        <text x="36" y="92" fill="#2d241d" font-family="Georgia, 'Times New Roman', serif" font-size="34">${escapeXml(asset.title)}</text>
        ${subtitleLines.map((line, lineIndex) => `<text x="36" y="${126 + lineIndex * 22}" fill="#5b5048" font-family="Arial, sans-serif" font-size="17">${escapeXml(line)}</text>`).join('\n')}
        ${instructionLines.map((line, lineIndex) => `<text x="36" y="${180 + lineIndex * 20}" fill="#5b5048" font-family="Arial, sans-serif" font-size="16">${escapeXml(line)}</text>`).join('\n')}
        <text x="36" y="315" fill="#7c5d49" font-family="Arial, sans-serif" font-size="14">${escapeXml(asset.sizeLabel)}</text>
        <rect x="312" y="64" width="172" height="172" rx="18" fill="#ffffff" stroke="#d7c8b7"/>
        <image x="326" y="78" width="144" height="144" href="${escapeXml(qrDataUrl)}"/>
        <text x="36" y="337" fill="#7c5d49" font-family="Arial, sans-serif" font-size="13">${escapeXml(asset.url)}</text>
      </g>
    `;
  }).join('\n');

  return {
    filename: 'dayof-wedding-identity-print-pack.svg',
    svg: `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${escapeXml('DayOf wedding identity print pack')}">
  <rect width="${width}" height="${height}" fill="#ffffff"/>
  <text x="${padding}" y="28" fill="#2d241d" font-family="Georgia, 'Times New Roman', serif" font-size="22">DayOf wedding identity print pack</text>
  ${cards}
</svg>`,
  };
}

export function renderWeddingIdentityPrintHtml(assets: WeddingIdentityPrintAsset[]): string {
  const safeAssets = assets.filter((asset) => isSafePublicQrAssetUrl(asset.url));
  const renderedCards = safeAssets.map((asset) => {
    const qrDataUrl = buildLocalQrSvgDataUrl(asset.url, 280);
    return `
      <article class="card">
        <div class="meta">${escapeHtml(asset.label)} · ${escapeHtml(asset.sizeLabel)}</div>
        <h2>${escapeHtml(asset.title)}</h2>
        <p class="subtitle">${escapeHtml(asset.subtitle)}</p>
        <p class="instruction">${escapeHtml(asset.instruction)}</p>
        <div class="qr-shell">
          <img src="${escapeHtml(qrDataUrl)}" alt="QR code for ${escapeHtml(asset.label)}" width="220" height="220" />
        </div>
        <p class="url">${escapeHtml(asset.url)}</p>
      </article>
    `;
  }).join('\n');

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>DayOf wedding identity print pack</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      :root {
        color-scheme: light;
        font-family: Inter, Arial, sans-serif;
      }
      body {
        margin: 0;
        background: #f5efe7;
        color: #2d241d;
      }
      main {
        max-width: 1200px;
        margin: 0 auto;
        padding: 32px;
      }
      h1 {
        margin: 0 0 8px;
        font: 600 28px/1.1 Georgia, "Times New Roman", serif;
      }
      p.lead {
        margin: 0 0 24px;
        color: #5b5048;
      }
      .grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
        gap: 20px;
      }
      .card {
        background: #fffdf9;
        border: 1px solid #d7c8b7;
        border-radius: 24px;
        padding: 24px;
        min-height: 440px;
        box-sizing: border-box;
      }
      .meta {
        font-size: 12px;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: #7c5d49;
      }
      .card h2 {
        margin: 12px 0 4px;
        font: 600 28px/1.2 Georgia, "Times New Roman", serif;
      }
      .subtitle,
      .instruction,
      .url {
        margin: 0;
        color: #5b5048;
      }
      .instruction {
        margin-top: 12px;
      }
      .qr-shell {
        margin: 20px 0;
        display: inline-flex;
        border-radius: 20px;
        background: #ffffff;
        border: 1px solid #e5d7c8;
        padding: 16px;
      }
      .url {
        font-size: 13px;
        word-break: break-word;
      }
      @media print {
        body {
          background: #fff;
        }
        main {
          padding: 0;
        }
        .card {
          page-break-inside: avoid;
        }
      }
    </style>
  </head>
  <body>
    <main>
      <h1>DayOf wedding identity print pack</h1>
      <p class="lead">Safe public-ready QR assets for RSVP, signage, and guest guidance.</p>
      <section class="grid">
        ${renderedCards}
      </section>
    </main>
  </body>
</html>`;
}
