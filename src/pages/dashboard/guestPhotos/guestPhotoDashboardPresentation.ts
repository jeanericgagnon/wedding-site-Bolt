import { getSafePublicWebUrl } from '../../../sections/publicLinks';
import type { SlideshowTheme } from '../guestPhotoSharingUtils';

export const GUEST_PHOTO_SLIDESHOW_THEME_META: Record<
  SlideshowTheme,
  { label: string; cardClass: string; chipClass: string; helper: string }
> = {
  classic: {
    label: 'Classic',
    cardClass: 'bg-white border-border-subtle',
    chipClass: 'bg-neutral-100 text-neutral-700',
    helper: 'Clean, neutral presentation focused on the photos.',
  },
  editorial: {
    label: 'Editorial',
    cardClass: 'bg-stone-50 border-stone-200',
    chipClass: 'bg-stone-200 text-stone-800',
    helper: 'Softer gallery feel with a more polished keepsake vibe.',
  },
  party: {
    label: 'Party',
    cardClass: 'bg-surface-subtle border-border-subtle',
    chipClass: 'bg-surface-subtle text-text-primary border border-border-subtle',
    helper: 'More energetic framing for reception and dance-floor moments.',
  },
};

export function getGuestPhotoBucketTone(bucketName: string) {
  const name = bucketName.toLowerCase();
  if (/ceremony|vows|aisle/.test(name)) return 'Save the quiet, meaningful moments.';
  if (/welcome|party|cocktail/.test(name)) return 'Capture the energy before everyone settles in.';
  if (/dance|after party|after-party/.test(name)) return 'This is for the blurry, loud, great stuff.';
  if (/brunch|recovery|farewell/.test(name)) return 'Keep the softer next-day memories here.';
  return 'A clean album for one specific moment guests can easily understand.';
}

export function getGuestPhotoBucketQrUrl(uploadUrl: string) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=512x512&data=${encodeURIComponent(uploadUrl)}`;
}

export function openGuestPhotoSafePublicUrl(url: string | null | undefined) {
  const safeUrl = getSafePublicWebUrl(url);
  if (safeUrl) window.open(safeUrl, '_blank', 'noopener,noreferrer');
}

export function openGuestPhotoAppUrl(url: string) {
  window.open(url, '_blank', 'noopener,noreferrer');
}
