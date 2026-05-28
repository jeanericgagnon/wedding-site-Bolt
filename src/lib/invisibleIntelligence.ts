import { getBuilderLaunchChecklistRoute } from '../pages/builderCutoverRoute';

export type IntelligenceArea =
  | 'builder'
  | 'timeline'
  | 'guests'
  | 'photos'
  | 'registry'
  | 'budget'
  | 'messages'
  | 'vault'
  | 'post-wedding';

export type IntelligencePriority = 'now' | 'next' | 'polish';
export type IntelligenceSource = 'deterministic' | 'openai' | 'vision' | 'user';

export interface IntelligenceSuggestion {
  id: string;
  area: IntelligenceArea;
  priority: IntelligencePriority;
  title: string;
  detail: string;
  actionLabel: string;
  href?: string;
  action?: string;
  dismissed?: boolean;
  source: IntelligenceSource;
  confidence: number;
}

export interface BuilderCopyHealth {
  score: number;
  flags: string[];
  missingDetails: string[];
  duplicateSignals: string[];
  suggestedRewrite: string | null;
}

export type BuilderRewriteTone = 'rewrite' | 'warmer' | 'simpler' | 'formal' | 'shorten';

const normalizeText = (value: unknown) => String(value ?? '').trim();
const lower = (value: unknown) => normalizeText(value).toLowerCase();

const clampConfidence = (value: number) => Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));

export function cleanBuilderCopy(value: string): string {
  return value
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.!?])/g, '$1')
    .replace(/([.!?])([A-Za-z])/g, '$1 $2')
    .trim()
    .replace(/^([a-z])/, (match) => match.toUpperCase());
}

export function rewriteBuilderCopy(value: string, tone: BuilderRewriteTone): string {
  const cleaned = cleanBuilderCopy(value);
  if (!cleaned) return '';

  const withoutHype = cleaned
    .replace(/\bmagical\b/gi, 'meaningful')
    .replace(/\bunforgettable\b/gi, 'special')
    .replace(/\bjoin us as we celebrate\b/gi, 'celebrate with us');

  if (tone === 'shorten') {
    const sentence = withoutHype.split(/(?<=[.!?])\s+/)[0] ?? withoutHype;
    return sentence.length > 140 ? `${sentence.slice(0, 137).trim()}...` : sentence;
  }

  if (tone === 'simpler') {
    return cleanBuilderCopy(withoutHype
      .replace(/\bkindly\b/gi, 'please')
      .replace(/\bin order to\b/gi, 'to')
      .replace(/\butilize\b/gi, 'use'));
  }

  if (tone === 'formal') {
    return cleanBuilderCopy(withoutHype
      .replace(/\bcan't\b/gi, 'cannot')
      .replace(/\bwe're\b/gi, 'we are')
      .replace(/\byou're\b/gi, 'you are'));
  }

  if (tone === 'warmer') {
    return /thank|grateful|excited|love/i.test(withoutHype)
      ? withoutHype
      : `${withoutHype} We are so grateful to celebrate with you.`;
  }

  return withoutHype;
}

export function analyzeBuilderCopy(input: {
  sectionType: string;
  settings: Record<string, unknown>;
  siblingSections?: Array<{ id?: string; type: string; settings?: Record<string, unknown> }>;
}): BuilderCopyHealth {
  const searchable = Object.values(input.settings)
    .map((value) => {
      if (typeof value === 'string') return value;
      if (value && typeof value === 'object' && 'value' in value) return String((value as { value?: unknown }).value ?? '');
      return '';
    })
    .join(' ');
  const text = lower(searchable);
  const flags: string[] = [];
  const missingDetails: string[] = [];
  const duplicateSignals: string[] = [];

  if (!searchable.trim()) flags.push('Add real section copy');
  if (/\blorem ipsum\b|your .* here|coming soon|tbd\b|to be decided/i.test(searchable)) flags.push('Replace placeholder copy');
  if (searchable.length > 650) flags.push('Shorten for easier scanning');
  if (/(magical|unforgettable|special day|dream come true)/i.test(searchable)) flags.push('Make the tone more specific');

  if (input.sectionType === 'faq') {
    if (!/(park|parking|rideshare|shuttle|transport)/.test(text)) missingDetails.push('parking or transportation');
    if (!/(dress|attire|wear|black tie|cocktail)/.test(text)) missingDetails.push('dress code');
    if (!/(plus one|\+1|guest|children|kids)/.test(text)) missingDetails.push('plus-one or children rules');
  }
  if (input.sectionType === 'venue' && !/(address|map|parking|arrival|entrance)/.test(text)) missingDetails.push('arrival details');
  if (input.sectionType === 'rsvp' && !/(deadline|by |reply|dietary|meal)/.test(text)) missingDetails.push('RSVP deadline or meal note');
  if (input.sectionType === 'travel' && !/(hotel|shuttle|airport|parking|transport)/.test(text)) missingDetails.push('hotel or travel guidance');

  const sameTypeCount = (input.siblingSections ?? []).filter((section) => section.type === input.sectionType).length;
  if (sameTypeCount > 1) duplicateSignals.push(`There are ${sameTypeCount} ${input.sectionType} sections on this page`);

  const score = Math.max(0, 100 - flags.length * 18 - missingDetails.length * 10 - duplicateSignals.length * 12);
  const suggestedRewrite = searchable.trim() ? rewriteBuilderCopy(searchable, score < 80 ? 'simpler' : 'rewrite') : null;

  return { score, flags, missingDetails, duplicateSignals, suggestedRewrite };
}

export interface TimelineEventInput {
  id: string;
  name: string;
  eventDate?: string | null;
  startTime: string;
  endTime?: string | null;
  durationMinutes?: number | null;
}

export interface TimelineInsight {
  eventId: string;
  kind: 'duration' | 'gap' | 'overlap' | 'buffer';
  title: string;
  detail: string;
  suggestedMinutes?: number;
}

const durationByEventType: Array<{ match: RegExp; minutes: number }> = [
  { match: /ceremony|vow|processional/i, minutes: 30 },
  { match: /cocktail/i, minutes: 60 },
  { match: /dinner|meal/i, minutes: 90 },
  { match: /toast|speech/i, minutes: 15 },
  { match: /dance|party|reception/i, minutes: 180 },
  { match: /photo|portrait/i, minutes: 45 },
  { match: /first look/i, minutes: 30 },
  { match: /getting ready/i, minutes: 120 },
];

export function suggestTimelineDuration(name: string): number {
  return durationByEventType.find((entry) => entry.match.test(name))?.minutes ?? 45;
}

const minutesFromTime = (value: string): number | null => {
  const match = value.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  return hours * 60 + minutes;
};

export function analyzeTimeline(events: TimelineEventInput[]): TimelineInsight[] {
  const ordered = events
    .map((event) => {
      const start = minutesFromTime(event.startTime);
      const explicitDuration = event.durationMinutes ?? null;
      const duration = explicitDuration ?? suggestTimelineDuration(event.name);
      const end = event.endTime ? minutesFromTime(event.endTime) : start !== null ? start + duration : null;
      return { event, start, end, duration, explicitDuration };
    })
    .filter((item) => item.start !== null)
    .sort((a, b) => `${a.event.eventDate ?? ''}T${a.event.startTime}`.localeCompare(`${b.event.eventDate ?? ''}T${b.event.startTime}`));

  const insights: TimelineInsight[] = [];
  ordered.forEach((item, index) => {
    const suggested = suggestTimelineDuration(item.event.name);
    if (item.explicitDuration === null && !item.event.endTime) {
      insights.push({
        eventId: item.event.id,
        kind: 'duration',
        title: 'Suggested duration ready',
        detail: `${item.event.name} usually works well at about ${suggested} minutes.`,
        suggestedMinutes: suggested,
      });
    }

    const next = ordered[index + 1];
    if (!next || item.end === null || next.start === null) return;
    if ((item.event.eventDate ?? '') !== (next.event.eventDate ?? '')) return;
    const gap = next.start - item.end;
    if (gap < 0) {
      insights.push({
        eventId: next.event.id,
        kind: 'overlap',
        title: 'Timing overlap worth checking',
        detail: `${next.event.name} starts before ${item.event.name} appears to end.`,
      });
    } else if (gap > 120) {
      insights.push({
        eventId: item.event.id,
        kind: 'gap',
        title: 'Long gap worth checking',
        detail: `There is about ${gap} minutes before ${next.event.name}.`,
      });
    } else if (gap < 10) {
      insights.push({
        eventId: item.event.id,
        kind: 'buffer',
        title: 'Small buffer',
        detail: `Most couples add a little cushion before ${next.event.name}.`,
      });
    }
  });
  return insights;
}

export function shiftTimelineCascade(events: TimelineEventInput[], changedEventId: string, minuteDelta: number): TimelineEventInput[] {
  let shouldShift = false;
  return events.map((event) => {
    if (event.id === changedEventId) shouldShift = true;
    if (!shouldShift || !event.startTime) return event;
    const start = minutesFromTime(event.startTime);
    if (start === null) return event;
    const nextStart = Math.max(0, start + minuteDelta);
    const end = event.endTime ? minutesFromTime(event.endTime) : null;
    const nextEnd = end === null ? null : Math.max(0, end + minuteDelta);
    const hours = String(Math.floor(nextStart / 60)).padStart(2, '0');
    const minutes = String(nextStart % 60).padStart(2, '0');
    const shifted: TimelineEventInput = { ...event, startTime: `${hours}:${minutes}` };
    if (nextEnd !== null) {
      const endHours = String(Math.floor(nextEnd / 60)).padStart(2, '0');
      const endMinutes = String(nextEnd % 60).padStart(2, '0');
      shifted.endTime = `${endHours}:${endMinutes}`;
    }
    return shifted;
  });
}

export function buildRegistryInsights(items: Array<{
  category?: string | null;
  store_name?: string | null;
  item_name?: string | null;
  image_url?: string | null;
  price?: number | null;
  contributionMethodCount?: number | null;
  goalAmount?: number | null;
  receivedAmount?: number | null;
  purchaseStatus?: string | null;
  purchaserName?: string | null;
  quantityPurchased?: number | null;
}>): IntelligenceSuggestion[] {
  if (items.length === 0) {
    return [{
      id: 'registry-empty',
      area: 'registry',
      priority: 'next',
      title: 'Decide registry visibility',
      detail: 'Add a few gifts or hide the section so guests never land on an empty registry.',
      actionLabel: 'Review registry',
      href: '/dashboard/registry',
      source: 'deterministic',
      confidence: 0.9,
    }];
  }
  const categoryCounts = items.reduce<Record<string, number>>((acc, item) => {
    const category = lower(item.category || item.store_name || 'general') || 'general';
    acc[category] = (acc[category] ?? 0) + 1;
    return acc;
  }, {});
  const top = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0];
  const missingImages = items.filter((item) => !item.image_url).length;
  const fundItems = items.filter((item) => lower(item.category).includes('cash fund'));
  const fundsMissingSetup = fundItems.filter((item) => Number(item.contributionMethodCount ?? 0) <= 0).length;
  const fundsMissingGoal = fundItems.filter((item) => Number(item.goalAmount ?? 0) <= 0).length;
  const purchasedItemsMissingAttribution = items.filter((item) => {
    const purchasedCount = Math.max(0, Number(item.quantityPurchased ?? 0));
    const status = lower(item.purchaseStatus);
    const hasPurchase = purchasedCount > 0 || status === 'partial' || status === 'purchased';
    return hasPurchase && !normalizeText(item.purchaserName);
  }).length;
  const suggestions: IntelligenceSuggestion[] = [];
  if (top && top[1] >= Math.max(3, items.length * 0.6)) {
    suggestions.push({
      id: 'registry-category-balance',
      area: 'registry',
      priority: 'polish',
      title: 'Common addition',
      detail: `Most items are clustered around ${top[0].replace(/\b\w/g, (char) => char.toUpperCase())}. You may want one more option in a different category.`,
      actionLabel: 'Review categories',
      href: '/dashboard/registry',
      source: 'deterministic',
      confidence: 0.72,
    });
  }
  if (missingImages > 0) {
    suggestions.push({
      id: 'registry-metadata-images',
      area: 'registry',
      priority: 'polish',
      title: 'Worth checking',
      detail: `${missingImages} registry item${missingImages === 1 ? '' : 's'} could use a cleaner photo or updated gift details.`,
      actionLabel: 'Clean up imported gifts',
      href: '/dashboard/registry',
      source: 'deterministic',
      confidence: 0.82,
    });
  }
  if (fundsMissingSetup > 0) {
    suggestions.push({
      id: 'registry-fund-setup',
      area: 'registry',
      priority: 'next',
      title: 'Cash fund setup',
      detail: `${fundsMissingSetup} cash fund${fundsMissingSetup === 1 ? '' : 's'} still need a guest-ready payment path before they are easy to share.`,
      actionLabel: 'Review cash funds',
      href: '/dashboard/registry',
      source: 'deterministic',
      confidence: 0.88,
    });
  }
  if (fundItems.length > 0 && fundsMissingGoal > 0) {
    suggestions.push({
      id: 'registry-fund-goals',
      area: 'registry',
      priority: 'polish',
      title: 'Track one simple goal',
      detail: `${fundsMissingGoal} cash fund${fundsMissingGoal === 1 ? '' : 's'} could use a simple goal so progress reads clearly for you and your guests.`,
      actionLabel: 'Add fund goals',
      href: '/dashboard/registry',
      source: 'deterministic',
      confidence: 0.76,
    });
  }
  if (purchasedItemsMissingAttribution > 0) {
    suggestions.push({
      id: 'registry-purchaser-attribution',
      area: 'registry',
      priority: 'next',
      title: 'Purchaser names missing',
      detail: `${purchasedItemsMissingAttribution} purchased gift${purchasedItemsMissingAttribution === 1 ? '' : 's'} still need a purchaser name before thank-you follow-up is fully ready.`,
      actionLabel: 'Review purchased gifts',
      href: '/dashboard/registry',
      source: 'deterministic',
      confidence: 0.84,
    });
  }
  return suggestions;
}

export function buildBudgetQuickCheck(input: { totalBudget?: number | null; estimated: number; actual: number; paid: number; categoryCount: number }): IntelligenceSuggestion[] {
  const suggestions: IntelligenceSuggestion[] = [];
  if (input.estimated === 0) {
    suggestions.push({
      id: 'budget-first-lines',
      area: 'budget',
      priority: 'next',
      title: 'Quick check',
      detail: 'Add a few estimated costs so the budget can summarize the plan without pressure.',
      actionLabel: 'Open budget',
      href: '/dashboard/planning?tab=budget',
      source: 'deterministic',
      confidence: 0.86,
    });
  }
  if (input.categoryCount > 0 && input.paid < input.actual) {
    suggestions.push({
      id: 'budget-payment-coverage',
      area: 'budget',
      priority: 'polish',
      title: 'Payment check',
      detail: 'A few paid amounts may still need updating so the payment view stays useful.',
      actionLabel: 'Review payments',
      href: '/dashboard/planning?tab=payments',
      source: 'deterministic',
      confidence: 0.76,
    });
  }
  return suggestions;
}

export function buildMessagingActions(input: { pendingGuests: number; contactableGuestCount: number; totalGuests: number; activePhotoAlbumCount: number; postWedding: boolean }): IntelligenceSuggestion[] {
  const suggestions: IntelligenceSuggestion[] = [];
  if (input.pendingGuests > 0 && input.contactableGuestCount > 0) {
    suggestions.push({
      id: 'message-rsvp-reminder',
      area: 'messages',
      priority: 'now',
      title: 'Ready to send',
      detail: `${input.pendingGuests} guest${input.pendingGuests === 1 ? '' : 's'} still need a reply. A reminder draft is ready to review.`,
      actionLabel: 'Draft reminder',
      href: '/dashboard/messages?template=rsvp-reminder&audience=pending',
      source: 'deterministic',
      confidence: 0.9,
    });
  }
  if (input.activePhotoAlbumCount > 0 && input.postWedding) {
    suggestions.push({
      id: 'message-photo-recap',
      area: 'post-wedding',
      priority: 'next',
      title: 'Ready to share',
      detail: 'The photo loop can become a recap email once the best uploads are selected.',
      actionLabel: 'Draft recap',
      href: '/dashboard/messages?template=photo-request',
      source: 'deterministic',
      confidence: 0.78,
    });
  }
  return suggestions;
}

export function buildVaultPrompts(input: { weddingDate: string | null; vaultCount: number; enabledVaultCount: number }): IntelligenceSuggestion[] {
  const weddingTime = input.weddingDate ? new Date(input.weddingDate).getTime() : NaN;
  const daysUntil = Number.isFinite(weddingTime) ? Math.ceil((weddingTime - Date.now()) / 86400000) : null;
  if (input.vaultCount === 0) {
    return [{
      id: 'vault-starter',
      area: 'vault',
      priority: 'next',
      title: 'Private keepsake',
      detail: 'Start with one first-anniversary vault and keep it personal.',
      actionLabel: 'Create vault',
      href: '/dashboard/vault',
      source: 'deterministic',
      confidence: 0.82,
    }];
  }
  if (input.enabledVaultCount > 0 && daysUntil !== null && daysUntil <= 14 && daysUntil >= -7) {
    return [{
      id: 'vault-contribution-nudge',
      area: 'vault',
      priority: 'polish',
      title: 'A quiet note',
      detail: 'Ask close family or friends to leave a private message before the vault window closes.',
      actionLabel: 'Copy vault link',
      href: '/dashboard/vault',
      source: 'deterministic',
      confidence: 0.74,
    }];
  }
  return [];
}

export function buildInvisibleIntelligenceSuggestions(input: {
  isPublished: boolean;
  siteSlug: string | null;
  weddingDate: string | null;
  totalGuests: number;
  pendingGuests: number;
  contactableGuestCount: number;
  registryItemCount: number;
  activePhotoAlbumCount: number;
  photoAlbumCount: number;
  vaultCount?: number;
  enabledVaultCount?: number;
}): IntelligenceSuggestion[] {
  const postWedding = input.weddingDate ? new Date(input.weddingDate).getTime() < Date.now() : false;
  const suggestions: IntelligenceSuggestion[] = [];
  if (!input.isPublished || !input.siteSlug) {
    suggestions.push({
      id: 'site-publish',
      area: 'builder',
      priority: 'now',
      title: 'Worth checking',
      detail: 'The public site should have one clean launch review before guests see it.',
      actionLabel: 'Open launch review',
      href: getBuilderLaunchChecklistRoute(),
      source: 'deterministic',
      confidence: 0.95,
    });
  }
  if (input.totalGuests === 0) {
    suggestions.push({
      id: 'guest-import',
      area: 'guests',
      priority: 'now',
      title: 'Next clean step',
      detail: 'Import guests once so RSVP, messaging, seating, and address collection can work together.',
      actionLabel: 'Import guests',
      href: '/dashboard/guests',
      source: 'deterministic',
      confidence: 0.94,
    });
  }
  suggestions.push(...buildMessagingActions({
    pendingGuests: input.pendingGuests,
    contactableGuestCount: input.contactableGuestCount,
    totalGuests: input.totalGuests,
    activePhotoAlbumCount: input.activePhotoAlbumCount,
    postWedding,
  }));
  if (input.photoAlbumCount === 0) {
    suggestions.push({
      id: 'photo-hub',
      area: 'photos',
      priority: 'next',
      title: 'Guest photo loop',
      detail: 'Create one upload album and QR link before the wedding so guests have a zero-friction path.',
      actionLabel: 'Create photo album',
      href: '/dashboard/photos',
      source: 'deterministic',
      confidence: 0.88,
    });
  }
  if (input.registryItemCount === 0) {
    suggestions.push(...buildRegistryInsights([]));
  }
  suggestions.push(...buildVaultPrompts({
    weddingDate: input.weddingDate,
    vaultCount: input.vaultCount ?? 0,
    enabledVaultCount: input.enabledVaultCount ?? 0,
  }));
  return suggestions
    .map((suggestion) => ({ ...suggestion, confidence: clampConfidence(suggestion.confidence) }))
    .sort((a, b) => {
      const priorityWeight = { now: 0, next: 1, polish: 2 };
      return priorityWeight[a.priority] - priorityWeight[b.priority] || b.confidence - a.confidence;
    })
    .slice(0, 8);
}
