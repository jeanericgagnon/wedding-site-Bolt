import type { SetupDraft } from '../../lib/setupDraft';
import { buildCoupleDisplayName } from '../../lib/coupleDisplayName';
import { buildSuggestedFaqDrafts } from '../../lib/faqDraftHelper';
import { deriveSetupUseCasePacks } from '../../lib/setupConcierge';
import { buildWelcomeNoteDraft } from '../../lib/welcomeNoteHelper';
import { unwrapGeneratedFieldValue } from '../../lib/weddingProfile';
import type { WeddingDataV1 } from '../../types/weddingData';

const toIsoDateOrUndefined = (value?: string | null): string | undefined => {
  if (!value?.trim()) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
};

export const hasMeaningfulSetupDraft = (draft: SetupDraft): boolean => {
  return Boolean(
    draft.partnerOneFirstName?.trim() ||
      draft.partnerTwoFirstName?.trim() ||
      draft.weddingDate ||
      draft.weddingCity?.trim() ||
      draft.guestEstimateBand ||
      draft.stylePreferences?.length
  );
};

export const applySetupDraftToWeddingData = (source: WeddingDataV1, draft: SetupDraft): WeddingDataV1 => {
  const next: WeddingDataV1 = structuredClone(source);
  const useCasePacks = deriveSetupUseCasePacks(draft);

  const p1 = [draft.partnerOneFirstName, draft.partnerOneLastName].filter(Boolean).join(' ').trim();
  const p2 = [draft.partnerTwoFirstName, draft.partnerTwoLastName].filter(Boolean).join(' ').trim();

  if (p1) next.couple.partner1Name = p1;
  if (p2) next.couple.partner2Name = p2;

  const hasNames = Boolean(next.couple.partner1Name || next.couple.partner2Name);
  if (hasNames) {
    next.couple.displayName = buildCoupleDisplayName(next.couple.partner1Name, next.couple.partner2Name);
  }

  if (draft.dateKnown && draft.weddingDate) {
    next.event.weddingDateISO = toIsoDateOrUndefined(draft.weddingDate);
  }

  if (draft.weddingCity || draft.weddingRegion) {
    const location = [draft.weddingCity, draft.weddingRegion].filter(Boolean).join(', ');
    if (next.venues.length === 0) {
      next.venues.push({ id: 'primary', name: location || 'Main Venue', address: location || undefined });
    } else {
      next.venues[0] = {
        ...next.venues[0],
        address: next.venues[0].address || location,
        name: next.venues[0].name || location || 'Main Venue',
      };
    }
  }

  if ((draft.stylePreferences?.length ?? 0) > 0) {
    next.theme = {
      ...next.theme,
      tokens: {
        ...(next.theme.tokens ?? {}),
        style_preferences: draft.stylePreferences.join(','),
      },
    };
  }

  const existingStory = unwrapGeneratedFieldValue<string>(next.couple.story, '');
  if (!existingStory.trim()) {
    next.couple.story = buildWelcomeNoteDraft({
      partner1Name: next.couple.partner1Name,
      partner2Name: next.couple.partner2Name,
      city: draft.weddingCity?.trim() || undefined,
      venue: next.venues[0]?.name?.trim() || draft.weddingCity?.trim() || undefined,
      useCasePacks,
    });
  } else {
    next.couple.story = existingStory;
  }

  if (!next.travel.notes?.trim()) {
    next.travel.notes = useCasePacks.includes('destination')
      ? 'We will share nearby hotel, airport, and arrival guidance soon so the full weekend feels easy to navigate.'
      : 'We will share nearby hotel and travel recommendations soon.';
  }

  if (useCasePacks.includes('destination') && !next.travel.hotelInfo?.trim()) {
    next.travel.hotelInfo = 'Hotel recommendations and room-block details will be shared here soon.';
  }

  if (useCasePacks.includes('destination') && !next.travel.flightInfo?.trim()) {
    next.travel.flightInfo = draft.weddingCity?.trim()
      ? `Airport guidance and the easiest way into ${draft.weddingCity.trim()} will be shared here soon.`
      : 'Airport guidance and the easiest way in will be shared here soon.';
  }

  if (next.rsvp.enabled && draft.dateKnown && draft.weddingDate && !next.rsvp.deadlineISO) {
    const weddingDate = new Date(draft.weddingDate);
    if (!Number.isNaN(weddingDate.getTime())) {
      const deadline = new Date(weddingDate);
      deadline.setDate(deadline.getDate() - 30);
      next.rsvp.deadlineISO = deadline.toISOString();
    }
  }

  if (next.schedule.length === 0 && draft.dateKnown && draft.weddingDate) {
    next.schedule = [
      ...(useCasePacks.includes('destination')
        ? [{ id: 'welcome-gathering', label: 'Welcome gathering', notes: 'A softer arrival moment for traveling guests before the main celebration.' }]
        : []),
      { id: 'ceremony', label: 'Ceremony' },
      ...(useCasePacks.includes('interfaith')
        ? [{ id: 'ceremony-note', label: 'Ceremony note', notes: 'A short guide to the traditions being honored during the ceremony.' }]
        : []),
    ];
  }

  if (next.faq.length === 0) {
    const faqDrafts = buildSuggestedFaqDrafts({
      weddingCity: draft.weddingCity?.trim() || undefined,
      venue: next.venues[0]?.name?.trim() || undefined,
      hotelRecommendations: next.travel.hotelInfo?.trim() || undefined,
      rsvpDeadline: next.rsvp.deadlineISO?.slice(0, 10),
      useCasePacks,
    });
    next.faq = faqDrafts.map((item, index) => ({
      id: `setup-faq-${index + 1}`,
      q: item.question,
      a: item.answer,
    }));
  }

  next.meta.useCasePacks = useCasePacks;
  next.meta.updatedAtISO = new Date().toISOString();
  return next;
};
