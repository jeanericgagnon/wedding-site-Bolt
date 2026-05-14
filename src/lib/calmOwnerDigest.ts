import type { PlannerAccessRole, PlannerPermissionKey } from './plannerAccess';
import { hasPlannerPermission } from './plannerAccess';

export type CalmDigestPriority = 'now' | 'soon' | 'watch' | 'quiet';
export type CalmDigestItemId =
  | 'rsvp-replies'
  | 'missing-contact'
  | 'message-review'
  | 'photo-memory'
  | 'seating'
  | 'tasks'
  | 'payments'
  | 'registry'
  | 'site-publish';

export interface CalmOwnerDigestInput {
  role: PlannerAccessRole;
  permissions?: PlannerPermissionKey[] | null;
  newRsvpCount?: number;
  pendingRsvpCount?: number;
  missingMealCount?: number;
  missingContactCount?: number;
  messageFailureCount?: number;
  upcomingTaskCount?: number;
  upcomingPaymentCount?: number;
  newPhotoUploadCount?: number;
  activePhotoAlbumCount?: number;
  seatingGapCount?: number;
  registryItemCount?: number;
  isPublished?: boolean;
  publishBlockerCount?: number;
}

export interface CalmDigestItem {
  id: CalmDigestItemId;
  label: string;
  detail: string;
  count: number;
  href: string;
  cta: string;
  priority: CalmDigestPriority;
}

export interface CalmOwnerDigest {
  title: string;
  summary: string;
  attentionCount: number;
  items: CalmDigestItem[];
}

export type CalmDigestCadence = 'daily' | 'weekly' | 'paused';

export interface CalmDigestDeliveryPreviewInput {
  digest: CalmOwnerDigest;
  cadence: CalmDigestCadence;
  includePlanner: boolean;
  quietUntilLabel?: string | null;
  nextDeliveryAt?: string | null;
  lastReviewedAt?: string | null;
  lastDeliveredAt?: string | null;
  emailDeliveryEnabled?: boolean;
}

export interface CalmDigestDeliveryPreview {
  subject: string;
  audienceLabel: string;
  cadenceLabel: string;
  statusLabel: string;
  canSendNow: boolean;
  nextDeliveryLabel: string | null;
  lastReviewedLabel: string | null;
  lastDeliveredLabel: string | null;
  previewLines: string[];
  reviewHref: string;
  safetyNotes: string[];
}

function cleanCount(value: number | undefined): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.floor(value ?? 0));
}

function plural(count: number, singular: string, pluralLabel = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : pluralLabel}`;
}

function canSee(
  role: PlannerAccessRole,
  permissions: PlannerPermissionKey[] | null | undefined,
  permission: PlannerPermissionKey,
): boolean {
  return hasPlannerPermission(role, permissions, permission);
}

function visibleForRole(item: CalmDigestItem, input: CalmOwnerDigestInput): boolean {
  const role = input.role;
  const permissions = input.permissions;
  if (role === 'owner') return true;
  if (item.id === 'payments') return canSee(role, permissions, 'budget') || canSee(role, permissions, 'vendors');
  if (item.id === 'tasks') return canSee(role, permissions, 'planning');
  if (item.id === 'registry') return canSee(role, permissions, 'registry');
  if (item.id === 'message-review') return canSee(role, permissions, 'messages');
  if (item.id === 'photo-memory') return canSee(role, permissions, 'photos');
  if (item.id === 'seating') return canSee(role, permissions, 'seating');
  if (item.id === 'site-publish') return canSee(role, permissions, 'settings');
  return canSee(role, permissions, 'guests');
}

function priorityFor(count: number, fallback: CalmDigestPriority = 'quiet'): CalmDigestPriority {
  if (count >= 5) return 'now';
  if (count > 0) return 'soon';
  return fallback;
}

function formatDigestTimestamp(value: string | null | undefined, label: string): string | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return `${label} ${new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'UTC',
    timeZoneName: 'short',
  }).format(parsed)}`;
}

export function buildCalmOwnerDigest(input: CalmOwnerDigestInput): CalmOwnerDigest {
  const newRsvps = cleanCount(input.newRsvpCount);
  const pendingRsvps = cleanCount(input.pendingRsvpCount);
  const missingMeals = cleanCount(input.missingMealCount);
  const missingContacts = cleanCount(input.missingContactCount);
  const messageFailures = cleanCount(input.messageFailureCount);
  const tasks = cleanCount(input.upcomingTaskCount);
  const payments = cleanCount(input.upcomingPaymentCount);
  const photoUploads = cleanCount(input.newPhotoUploadCount);
  const activePhotoAlbums = cleanCount(input.activePhotoAlbumCount);
  const seatingGaps = cleanCount(input.seatingGapCount);
  const registryItems = cleanCount(input.registryItemCount);
  const publishBlockers = cleanCount(input.publishBlockerCount);

  const rsvpCount = newRsvps + pendingRsvps + missingMeals;
  const items: CalmDigestItem[] = [
    {
      id: 'rsvp-replies',
      label: 'RSVPs',
      count: rsvpCount,
      detail: rsvpCount > 0
        ? [
            newRsvps > 0 ? plural(newRsvps, 'new reply', 'new replies') : null,
            pendingRsvps > 0 ? plural(pendingRsvps, 'pending guest') : null,
            missingMeals > 0 ? plural(missingMeals, 'meal choice') : null,
          ].filter(Boolean).join(' · ')
        : 'RSVPs are quiet right now.',
      href: '/dashboard/rsvp-board',
      cta: rsvpCount > 0 ? 'Review RSVPs' : 'Open RSVP board',
      priority: priorityFor(rsvpCount, 'quiet'),
    },
    {
      id: 'missing-contact',
      label: 'Guest details',
      count: missingContacts,
      detail: missingContacts > 0 ? `${plural(missingContacts, 'guest')} still need email or phone details.` : 'Guest contact details look steady.',
      href: '/dashboard/guests',
      cta: missingContacts > 0 ? 'Fill guest details' : 'Open guests',
      priority: priorityFor(missingContacts, 'quiet'),
    },
    {
      id: 'message-review',
      label: 'Messages',
      count: messageFailures,
      detail: messageFailures > 0 ? `${plural(messageFailures, 'guest update')} needs review before sending again.` : 'No message issues need review.',
      href: '/dashboard/messages',
      cta: messageFailures > 0 ? 'Review messages' : 'Open messaging',
      priority: priorityFor(messageFailures, 'quiet'),
    },
    {
      id: 'photo-memory',
      label: 'Photos and memories',
      count: photoUploads || activePhotoAlbums,
      detail: photoUploads > 0
        ? `${plural(photoUploads, 'new upload')} ready to review.`
        : activePhotoAlbums > 0
          ? `${plural(activePhotoAlbums, 'active album')} ready for guests.`
          : 'Photo sharing is ready when you want to invite uploads.',
      href: '/dashboard/photos',
      cta: photoUploads > 0 ? 'Review uploads' : 'Open memories',
      priority: photoUploads > 0 ? priorityFor(photoUploads) : 'watch',
    },
    {
      id: 'seating',
      label: 'Seating',
      count: seatingGaps,
      detail: seatingGaps > 0 ? `${plural(seatingGaps, 'guest')} still need a clear seating plan.` : 'No seating gaps are flagged here.',
      href: '/dashboard/seating',
      cta: seatingGaps > 0 ? 'Open seating' : 'Review seating',
      priority: priorityFor(seatingGaps, 'watch'),
    },
    {
      id: 'tasks',
      label: 'Planning tasks',
      count: tasks,
      detail: tasks > 0 ? `${plural(tasks, 'planning task')} could use a quick look.` : 'Planning tasks are quiet here.',
      href: '/dashboard/planning?tab=tasks',
      cta: tasks > 0 ? 'Review tasks' : 'Open tasks',
      priority: priorityFor(tasks, 'quiet'),
    },
    {
      id: 'payments',
      label: 'Payments and vendors',
      count: payments,
      detail: payments > 0 ? `${plural(payments, 'payment or vendor follow-up')} is coming up.` : 'No vendor payment follow-ups are flagged here.',
      href: '/dashboard/planning?tab=payments',
      cta: payments > 0 ? 'Review payments' : 'Open payments',
      priority: priorityFor(payments, 'quiet'),
    },
    {
      id: 'registry',
      label: 'Registry',
      count: registryItems,
      detail: registryItems > 0 ? `${plural(registryItems, 'registry item')} ready for guests.` : 'Registry links can be added when you are ready.',
      href: '/dashboard/registry',
      cta: registryItems > 0 ? 'Review registry' : 'Add registry',
      priority: registryItems > 0 ? 'watch' : 'soon',
    },
    {
      id: 'site-publish',
      label: 'Site readiness',
      count: publishBlockers,
      detail: input.isPublished
        ? publishBlockers > 0
          ? `${plural(publishBlockers, 'setup item')} should be checked before the next share.`
          : 'Published site details look ready from this overview.'
        : publishBlockers > 0
          ? `${plural(publishBlockers, 'setup item')} before sharing the site.`
          : 'The site is ready for a publishing review.',
      href: input.isPublished ? '/dashboard/builder' : '/dashboard/builder?publishNow=1',
      cta: input.isPublished ? 'Open builder' : 'Review and publish',
      priority: input.isPublished ? priorityFor(publishBlockers, 'watch') : 'soon',
    },
  ];

  const visibleItems = items.filter((item) => visibleForRole(item, input));
  const attentionCount = visibleItems.filter((item) => item.priority === 'now' || item.priority === 'soon').length;
  const title = input.role === 'owner' ? 'Owner digest' : `${input.role.charAt(0).toUpperCase()}${input.role.slice(1)} digest`;
  const summary = attentionCount > 0
    ? `${plural(attentionCount, 'area')} worth reviewing before the next guest update.`
    : 'Everything is quiet from this digest right now.';

  return {
    title,
    summary,
    attentionCount,
    items: visibleItems,
  };
}

export function buildCalmDigestDeliveryPreview(input: CalmDigestDeliveryPreviewInput): CalmDigestDeliveryPreview {
  const visibleItems = input.digest.items.filter((item) => item.count > 0 || item.priority === 'soon' || item.priority === 'now');
  const topItems = (visibleItems.length > 0 ? visibleItems : input.digest.items).slice(0, 4);
  const cadenceLabel = input.cadence === 'daily'
    ? 'Daily digest'
    : input.cadence === 'weekly'
      ? 'Weekly digest'
      : 'Paused';
  const quietLabel = input.quietUntilLabel?.trim();
  const nextDeliveryLabel = formatDigestTimestamp(input.nextDeliveryAt ?? null, 'Scheduled for');
  const lastReviewedLabel = formatDigestTimestamp(input.lastReviewedAt ?? null, 'Last review saved');
  const lastDeliveredLabel = formatDigestTimestamp(input.lastDeliveredAt ?? null, 'Last delivered');
  const emailReady = Boolean(input.emailDeliveryEnabled && input.cadence !== 'paused' && !quietLabel && topItems.length > 0);
  const statusLabel = quietLabel
    ? `Quiet until ${quietLabel}`
    : input.cadence === 'paused'
      ? 'Paused by preference'
      : nextDeliveryLabel
        ? nextDeliveryLabel
        : emailReady
          ? 'Ready for delivery review'
          : 'Preview only until delivery is connected';

  return {
    subject: input.digest.attentionCount > 0
      ? `${plural(input.digest.attentionCount, 'area')} to review for the wedding`
      : 'Wedding digest is quiet today',
    audienceLabel: input.includePlanner ? 'Owners and planners' : 'Owners only',
    cadenceLabel,
    statusLabel,
    canSendNow: emailReady,
    nextDeliveryLabel,
    lastReviewedLabel,
    lastDeliveredLabel,
    previewLines: topItems.map((item) => `${item.label}: ${item.detail}`),
    reviewHref: '/dashboard/settings?tab=notifications#digest',
    safetyNotes: [
      'Review before any digest is sent.',
      input.includePlanner ? 'Planner access follows role permissions.' : 'Planner recipients are off for this preview.',
      'Only calm owner-facing planning details are included.',
    ],
  };
}
