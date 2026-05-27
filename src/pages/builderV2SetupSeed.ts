import { getTemplate } from '../templates/registry';
import { deriveSetupMode } from '../lib/setupDraftRecommendations';
import type { SetupDraft } from '../lib/setupDraft';
import { buildCoupleDisplayName } from '../lib/coupleDisplayName';
import { createInitialBuilderV2Pages, type LabPage, type LabSection } from './builderV2PageState';
import { getInitialBuilderV2LabPreviewFields, type BuilderV2LabPreviewFields } from './builderV2LabPreview';

export type BuilderV2SetupSeed = {
  sourceName: string;
  templateId: string;
  templateName: string;
  pages: LabPage[];
  selectedPageId: string;
  selectedSectionId: string;
  previewFields: BuilderV2LabPreviewFields;
  hydratedFields: string[];
  setupFacts: string[];
};

const titleCaseWords = (value: string) => value
  .split(/[-\s]+/)
  .filter(Boolean)
  .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
  .join(' ');

const formatWeddingDateLabel = (weddingDate: string) => {
  const parsed = new Date(`${weddingDate}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
};

const buildLocationLabel = (draft: SetupDraft) => {
  const parts = [draft.weddingCity.trim(), draft.weddingRegion.trim()].filter(Boolean);
  return parts.join(', ');
};

const buildStorySeed = (draft: SetupDraft, fallback: string) => {
  const location = buildLocationLabel(draft);
  const styles = draft.stylePreferences.slice(0, 2).join(' and ').toLowerCase();
  if (location && styles) {
    return `A ${styles} celebration is taking shape in ${location}.`;
  }
  if (location) return `A wedding weekend is taking shape in ${location}.`;
  return fallback;
};

const buildTravelSeed = (draft: SetupDraft, fallback: BuilderV2LabPreviewFields) => {
  const location = buildLocationLabel(draft);
  if (!location) {
    return {
      flights: fallback.travelFlights,
      parking: fallback.travelParking,
      hotels: fallback.travelHotels,
      tips: fallback.travelTips,
    };
  }
  return {
    flights: `Plan arrival into the nearest airport for ${location}.`,
    parking: `Parking and arrival notes for ${location} will be shared closer to the weekend.`,
    hotels: `Stay recommendations for ${location} will be added here.`,
    tips: `Travel details for ${location} are still being shaped.`,
  };
};

const buildSectionSubtitle = (
  type: string,
  draft: SetupDraft,
  displayName: string,
  dateLabel: string,
) => {
  const location = buildLocationLabel(draft);
  switch (type) {
    case 'hero':
      return [displayName, dateLabel].filter(Boolean).join(' · ') || 'The couple · Wedding day';
    case 'story':
      return 'How it all started';
    case 'schedule':
      return draft.guestEstimateBand === '200plus' ? 'Big-weekend flow' : 'Weekend events';
    case 'travel':
    case 'accommodations':
      return location ? `Stay + transport for ${location}` : 'Stay + transport';
    case 'registry':
      return 'Gift options';
    case 'rsvp':
      return 'Let us know';
    case 'faq':
      return 'Helpful details';
    case 'venue':
      return location || 'Where we are gathering';
    case 'countdown':
      return dateLabel || 'Save the date';
    case 'wedding-party':
      return 'The people standing with us';
    case 'dress-code':
      return 'What to wear';
    case 'contact':
      return 'Questions before the weekend';
    case 'directions':
      return location ? `Getting to ${location}` : 'Getting there';
    case 'footer-cta':
      return 'Final planning nudge';
    case 'gallery':
      return 'Favorite moments';
    case 'quotes':
      return 'Words from the people we love';
    case 'menu':
      return 'Celebration menu';
    case 'music':
      return 'Weekend soundtrack';
    case 'video':
      return 'Films + clips';
    default:
      return titleCaseWords(type);
  }
};

const buildSectionTitle = (type: string) => {
  switch (type) {
    case 'footer-cta':
      return 'Closing CTA';
    case 'rsvp':
      return 'RSVP';
    case 'faq':
      return 'FAQ';
    default:
      return titleCaseWords(type);
  }
};

export const hasMeaningfulSetupDraftForBuilderV2 = (draft: SetupDraft) => (
  Boolean(
    draft.partnerOneFirstName.trim()
    || draft.partnerTwoFirstName.trim()
    || draft.weddingCity.trim()
    || draft.weddingRegion.trim()
    || draft.weddingDate.trim()
    || draft.stylePreferences.length > 0
    || draft.guestEstimateBand,
  )
);

export const buildBuilderV2SetupSeed = (
  draft: SetupDraft,
  fallbackPreview = getInitialBuilderV2LabPreviewFields(),
): BuilderV2SetupSeed | null => {
  if (!hasMeaningfulSetupDraftForBuilderV2(draft)) return null;

  const template = getTemplate(draft.selectedTemplateId);
  const dateLabel = draft.dateKnown ? formatWeddingDateLabel(draft.weddingDate) : '';
  const displayName = buildCoupleDisplayName(
    `${draft.partnerOneFirstName} ${draft.partnerOneLastName}`.trim(),
    `${draft.partnerTwoFirstName} ${draft.partnerTwoLastName}`.trim(),
    fallbackPreview.coupleDisplayName,
  );
  const setupMode = deriveSetupMode(draft);

  const sections: LabSection[] = template.defaultLayout.sections.map((section, index) => ({
    id: `${String(section.type).replace(/[^a-z0-9-]/gi, '').toLowerCase() || 'section'}-${index + 1}`,
    type: String(section.type),
    title: buildSectionTitle(String(section.type)),
    subtitle: buildSectionSubtitle(String(section.type), draft, displayName, dateLabel),
    variant: section.variant || 'default',
    enabled: section.enabled !== false,
    density: setupMode.destination || setupMode.weekend ? 'comfortable' : 'compact',
  }));

  const pages = createInitialBuilderV2Pages(sections);
  const travelSeed = buildTravelSeed(draft, fallbackPreview);
  const previewFields: BuilderV2LabPreviewFields = {
    ...fallbackPreview,
    coupleDisplayName: displayName,
    eventDateISO: draft.dateKnown && draft.weddingDate ? `${draft.weddingDate}T16:00:00` : fallbackPreview.eventDateISO,
    storyText: buildStorySeed(draft, fallbackPreview.storyText),
    scheduleTitle: setupMode.weekend ? 'Wedding weekend' : fallbackPreview.scheduleTitle,
    scheduleNote: buildLocationLabel(draft) || fallbackPreview.scheduleNote,
    travelFlights: travelSeed.flights,
    travelParking: travelSeed.parking,
    travelHotels: travelSeed.hotels,
    travelTips: travelSeed.tips,
    registryTitle: setupMode.destination ? 'Travel fund' : fallbackPreview.registryTitle,
    registryNote: 'Your presence is already the heart of it.',
    rsvpTitle: 'Tell us your plan',
    rsvpDeadlineISO: draft.dateKnown && draft.weddingDate ? `${draft.weddingDate}T00:00:00` : fallbackPreview.rsvpDeadlineISO,
  };

  const hydratedFields = [
    displayName !== fallbackPreview.coupleDisplayName ? 'Couple names' : '',
    draft.dateKnown && draft.weddingDate ? 'Wedding date' : '',
    buildLocationLabel(draft) ? 'Wedding location' : '',
    draft.stylePreferences.length > 0 ? 'Style preferences' : '',
    draft.selectedTemplateId ? 'Selected template' : '',
  ].filter(Boolean);

  const setupFacts = [
    template.name,
    draft.dateKnown && dateLabel ? dateLabel : draft.dateKnown ? '' : 'Date still flexible',
    buildLocationLabel(draft),
    draft.stylePreferences.length > 0 ? draft.stylePreferences.join(', ') : '',
    draft.guestEstimateBand ? `Guest band: ${draft.guestEstimateBand}` : '',
  ].filter(Boolean);

  return {
    sourceName: 'Setup draft',
    templateId: template.id,
    templateName: template.name,
    pages,
    selectedPageId: pages[0]?.id ?? 'home',
    selectedSectionId: sections[0]?.id ?? 'hero-1',
    previewFields,
    hydratedFields,
    setupFacts,
  };
};
