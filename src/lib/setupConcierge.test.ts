import { describe, expect, it } from 'vitest';
import { emptySetupDraft } from './setupDraft';
import { buildBuilderConciergeModel, buildSetupReviewModel, buildSetupTemplateReason, deriveSetupUseCasePacks } from './setupConcierge';
import { templateCatalog } from '../builder/constants/templateCatalog';
import { createEmptyWeddingData } from '../types/weddingData';

describe('setupConcierge', () => {
  it('derives use-case packs from setup preferences', () => {
    const packs = deriveSetupUseCasePacks({
      stylePreferences: ['Destination', 'Bilingual'],
      guestEstimateBand: '50to100',
    });

    expect(packs).toEqual(['destination', 'bilingual']);
  });

  it('explains why a destination-friendly template fits', () => {
    const template = templateCatalog.find((item) => item.id === 'destination-minimal') ?? templateCatalog[0];
    const reason = buildSetupTemplateReason(template, {
      ...emptySetupDraft,
      stylePreferences: ['Destination'],
      guestEstimateBand: '200plus',
    });

    expect(reason).toMatch(/destination/i);
  });

  it('builds a destination-aware review model', () => {
    const template = templateCatalog.find((item) => item.id === 'destination-minimal') ?? templateCatalog[0];
    const review = buildSetupReviewModel({
      ...emptySetupDraft,
      stylePreferences: ['Destination'],
      guestEstimateBand: '200plus',
      selectedTemplateId: template.id,
    }, template);

    expect(review.heading).toMatch(/destination/i);
    expect(review.builderChecklist[1]?.detail).toMatch(/travel|weekend/i);
    expect(review.confidenceLabel).toMatch(/confidence|first draft/i);
    expect(review.nextBestMove).toMatch(/travel|weekend|guest/i);
    expect(review.decisionRule).toMatch(/guest|travel|weekend/i);
    expect(review.launchSequence.map((item) => item.status)).toEqual(['current', 'next', 'then']);
  });

  it('builds a first-draft builder plan from wedding data', () => {
    const data = createEmptyWeddingData();
    data.meta.useCasePacks = ['destination'];
    data.couple.partner1Name = 'Alex';
    data.couple.partner2Name = 'Jordan';
    data.travel.notes = '';
    data.schedule = [{ id: 'ceremony', label: 'Ceremony' }];

    const plan = buildBuilderConciergeModel(data, { templateName: 'Destination Minimal' });

    expect(plan.heading).toMatch(/first draft/i);
    expect(plan.summary).toMatch(/destination/i);
    expect(plan.checklist.map((item) => item.id)).toContain('travel');
    expect(plan.guestPromise).toMatch(/guests/i);
    expect(plan.confidenceLabel).toMatch(/guided|ready/i);
    expect(plan.decisionRule).toMatch(/guest|travel|polish/i);
    expect(plan.launchSequence[0]?.title).toMatch(/trustworthy|site/i);
  });
});
