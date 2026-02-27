import type { SetupDraft } from '../../lib/setupDraft';
import type { WeddingDataV1 } from '../../types/weddingData';

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
  const next = { ...source };

  const p1 = [draft.partnerOneFirstName, draft.partnerOneLastName].filter(Boolean).join(' ').trim();
  const p2 = [draft.partnerTwoFirstName, draft.partnerTwoLastName].filter(Boolean).join(' ').trim();

  if (p1) next.couple.partner1Name = p1;
  if (p2) next.couple.partner2Name = p2;

  if (draft.dateKnown && draft.weddingDate) {
    next.wedding.date = draft.weddingDate;
    next.countdown.targetDate = draft.weddingDate;
  }

  if (draft.weddingCity || draft.weddingRegion) {
    next.wedding.location = [draft.weddingCity, draft.weddingRegion].filter(Boolean).join(', ');
    next.venue.name = next.venue.name || [draft.weddingCity, draft.weddingRegion].filter(Boolean).join(', ');
  }

  if ((draft.stylePreferences?.length ?? 0) > 0) {
    next.metadata.tags = Array.from(new Set([...(next.metadata.tags || []), ...draft.stylePreferences]));
  }

  const hasNames = Boolean(next.couple.partner1Name || next.couple.partner2Name);
  const coupleLabel = hasNames
    ? [next.couple.partner1Name, next.couple.partner2Name].filter(Boolean).join(' & ')
    : 'We';

  if (!next.couple.story?.trim()) {
    next.couple.story = `${coupleLabel} are so excited to celebrate with our favorite people.`;
  }

  if (!next.wedding.message?.trim()) {
    const locationHint = [draft.weddingCity, draft.weddingRegion].filter(Boolean).join(', ');
    next.wedding.message = locationHint
      ? `Join us in ${locationHint} as we celebrate our wedding weekend.`
      : 'Join us as we celebrate our wedding weekend.';
  }

  if (!next.rsvp.message?.trim()) {
    next.rsvp.message = "Please RSVP when you can. We can't wait to celebrate together.";
  }

  if (!next.travel.notes?.trim()) {
    next.travel.notes = 'We will share nearby hotel and travel recommendations soon.';
  }

  return next;
};
