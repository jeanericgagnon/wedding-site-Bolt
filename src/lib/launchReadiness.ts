export type LaunchReadinessStatus = 'ready' | 'needs_attention' | 'not_started';

export interface LaunchReadinessInput {
  isPublished: boolean;
  siteSlug: string | null;
  weddingDate: string | null;
  coupleName1: string | null;
  coupleName2: string | null;
  venueName: string | null;
  venueLocation: string | null;
  totalGuests: number;
  confirmedGuests: number;
  declinedGuests: number;
  pendingGuests: number;
  contactableGuestCount: number;
  registryItemCount: number;
  photoAlbumCount: number;
  activePhotoAlbumCount: number;
}

export interface LaunchReadinessItem {
  id: string;
  label: string;
  status: LaunchReadinessStatus;
  score: number;
  href: string;
  nextAction: string;
  detail: string;
}

export interface LaunchReadinessModel {
  score: number;
  status: LaunchReadinessStatus;
  headline: string;
  nextItem: LaunchReadinessItem | null;
  items: LaunchReadinessItem[];
}

const clampScore = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

const statusFromScore = (score: number): LaunchReadinessStatus => {
  if (score >= 85) return 'ready';
  if (score >= 35) return 'needs_attention';
  return 'not_started';
};

const makeItem = (
  id: string,
  label: string,
  score: number,
  href: string,
  nextAction: string,
  detail: string
): LaunchReadinessItem => ({
  id,
  label,
  score: clampScore(score),
  status: statusFromScore(score),
  href,
  nextAction,
  detail,
});

export function buildLaunchReadiness(input: LaunchReadinessInput): LaunchReadinessModel {
  const coupleComplete = Boolean(input.coupleName1 && input.coupleName2);
  const dateComplete = Boolean(input.weddingDate);
  const venueComplete = Boolean(input.venueName || input.venueLocation);
  const websiteScore =
    (coupleComplete ? 20 : 0) +
    (dateComplete ? 20 : 0) +
    (venueComplete ? 20 : 0) +
    (input.siteSlug ? 15 : 0) +
    (input.isPublished ? 25 : 0);

  const responded = input.confirmedGuests + input.declinedGuests;
  const responseRate = input.totalGuests > 0 ? responded / input.totalGuests : 0;
  const contactRate = input.totalGuests > 0 ? input.contactableGuestCount / input.totalGuests : 0;
  const guestScore =
    input.totalGuests > 0
      ? 30 + responseRate * 40 + contactRate * 30
      : 0;

  const photosScore =
    input.photoAlbumCount === 0
      ? 0
      : 35 + Math.min(input.activePhotoAlbumCount, 3) * 20 + (input.activePhotoAlbumCount > 0 ? 5 : 0);

  const registryScore =
    input.registryItemCount === 0
      ? 0
      : input.registryItemCount >= 3
        ? 100
        : 55 + input.registryItemCount * 15;

  const plannerScore = dateComplete && venueComplete ? 70 : dateComplete || venueComplete ? 45 : 15;

  const items: LaunchReadinessItem[] = [
    makeItem(
      'website',
      'Wedding site',
      websiteScore,
      input.isPublished ? '/dashboard/builder' : '/dashboard/builder?publishNow=1',
      input.isPublished ? 'Review live site' : 'Finish publish checklist',
      input.isPublished ? 'The public site has gone live at least once.' : 'Core site details still need one final review.'
    ),
    makeItem(
      'guests',
      'Guest list and RSVP',
      guestScore,
      '/dashboard/guests',
      input.totalGuests > 0 ? 'Follow up with pending guests' : 'Import guests',
      input.totalGuests > 0
        ? `${responded} of ${input.totalGuests} guests have replied and ${input.contactableGuestCount} are contactable.`
        : 'Add or import guests so RSVP, address collection, and messages have real recipients.'
    ),
    makeItem(
      'photos',
      'Photo hub',
      photosScore,
      '/dashboard/photos',
      input.activePhotoAlbumCount > 0 ? 'Review upload hub' : 'Create photo albums',
      input.photoAlbumCount > 0
        ? `${input.activePhotoAlbumCount} active photo album${input.activePhotoAlbumCount === 1 ? '' : 's'} are ready for guest uploads.`
        : 'Create guest upload albums and one QR hub before sharing signage.'
    ),
    makeItem(
      'registry',
      'Registry',
      registryScore,
      '/dashboard/registry',
      input.registryItemCount > 0 ? 'Review registry' : 'Add first item',
      input.registryItemCount > 0
        ? `${input.registryItemCount} registry item${input.registryItemCount === 1 ? '' : 's'} are guest-facing.`
        : 'Add registry links or mark registry hidden if you are not using it.'
    ),
    makeItem(
      'planner',
      'Planner essentials',
      plannerScore,
      '/dashboard/planning',
      'Open planner suite',
      dateComplete && venueComplete
        ? 'Planner modules have enough event context to be useful.'
        : 'Set date and venue details so timeline, vendors, and checklist stay grounded.'
    ),
  ];

  const score = clampScore(items.reduce((sum, item) => sum + item.score, 0) / Math.max(items.length, 1));
  const nextItem = [...items].sort((a, b) => a.score - b.score)[0] ?? null;

  return {
    score,
    status: statusFromScore(score),
    headline:
      score >= 85
        ? 'The main setup is in strong shape.'
        : score >= 55
          ? 'The main setup is close, with a few pieces left.'
          : 'The site needs a focused setup pass.',
    nextItem,
    items,
  };
}
