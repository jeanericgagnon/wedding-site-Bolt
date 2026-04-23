import type { SetupDraft } from '../../lib/setupDraft';
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

  const p1 = [draft.partnerOneFirstName, draft.partnerOneLastName].filter(Boolean).join(' ').trim();
  const p2 = [draft.partnerTwoFirstName, draft.partnerTwoLastName].filter(Boolean).join(' ').trim();

  if (p1) next.couple.partner1Name = p1;
  if (p2) next.couple.partner2Name = p2;

  const hasNames = Boolean(next.couple.partner1Name || next.couple.partner2Name);
  if (hasNames) {
    next.couple.displayName = [next.couple.partner1Name, next.couple.partner2Name].filter(Boolean).join(' & ');
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

  const coupleLabel = hasNames
    ? [next.couple.partner1Name, next.couple.partner2Name].filter(Boolean).join(' & ')
    : 'We';

  const existingStory = unwrapGeneratedFieldValue<string>(next.couple.story, '');
  if (!existingStory.trim()) {
    next.couple.story = `${coupleLabel} are so excited to celebrate with our favorite people.`;
  } else {
    next.couple.story = existingStory;
  }

  if (!next.travel.notes?.trim()) {
    next.travel.notes = 'We will share nearby hotel and travel recommendations soon.';
  }

  next.meta.updatedAtISO = new Date().toISOString();
  return next;
};
