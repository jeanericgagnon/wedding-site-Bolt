import type { ClarifyingDraftOutputs, ClarifyingPersistenceEnvelope } from './aiClarifyingPersistence';

export type ClarifyingTemplateSeed = {
  heroSubtitle: string;
  scheduleIntro: string;
  scheduleSummary: string;
  faqGuidance: string[];
  travelIntro: string;
  storyIntro: string;
  dressCode: string;
  childrenPolicy: string;
  lodgingGuidance: string;
  transportGuidance: string;
  siteToneSummary: string;
};

const emptySeed = (): ClarifyingTemplateSeed => ({
  heroSubtitle: '',
  scheduleIntro: '',
  scheduleSummary: '',
  faqGuidance: [],
  travelIntro: '',
  storyIntro: '',
  dressCode: '',
  childrenPolicy: '',
  lodgingGuidance: '',
  transportGuidance: '',
  siteToneSummary: '',
});

export const mapDraftOutputsToTemplateSeed = (draftOutputs?: ClarifyingDraftOutputs): ClarifyingTemplateSeed => {
  const seed = emptySeed();
  if (!draftOutputs) return seed;

  seed.heroSubtitle = draftOutputs.hero?.subheadline || '';
  seed.scheduleIntro = draftOutputs.schedule?.intro || '';
  seed.scheduleSummary = draftOutputs.schedule?.eventSummary || '';
  seed.faqGuidance = draftOutputs.faq?.guidance || [];
  seed.travelIntro = draftOutputs.travel?.intro || '';
  seed.storyIntro = draftOutputs.story?.intro || '';
  seed.dressCode = draftOutputs.guestGuidance?.dressCode || '';
  seed.childrenPolicy = draftOutputs.guestGuidance?.children || '';
  seed.lodgingGuidance = draftOutputs.guestGuidance?.lodging || '';
  seed.transportGuidance = draftOutputs.guestGuidance?.transport || '';
  seed.siteToneSummary = draftOutputs.siteTone?.summary || '';

  return seed;
};

export const mapClarifyingPersistenceToTemplateSeed = (value: ClarifyingPersistenceEnvelope): ClarifyingTemplateSeed => {
  return mapDraftOutputsToTemplateSeed(value.draftOutputs);
};
