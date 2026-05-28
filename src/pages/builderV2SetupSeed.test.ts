import { describe, expect, it } from 'vitest';
import { emptySetupDraft } from '../lib/setupDraft';
import { buildBuilderV2SetupSeed, hasMeaningfulSetupDraftForBuilderV2 } from './builderV2SetupSeed';
import { buildBuilderV2SetupIntake } from './builderV2SetupIntake';

describe('builderV2SetupSeed', () => {
  it('ignores empty setup drafts', () => {
    expect(hasMeaningfulSetupDraftForBuilderV2(emptySetupDraft)).toBe(false);
    expect(buildBuilderV2SetupSeed(emptySetupDraft)).toBeNull();
  });

  it('builds V2 pages and preview fields directly from setup draft truth', () => {
    const seed = buildBuilderV2SetupSeed({
      ...emptySetupDraft,
      partnerOneFirstName: 'Alex',
      partnerTwoFirstName: 'Jordan',
      weddingDate: '2026-09-18',
      weddingCity: 'Napa',
      weddingRegion: 'CA',
      stylePreferences: ['Destination', 'Weekend'],
      guestEstimateBand: '100to200',
      selectedTemplateId: 'coastal-breeze',
    });

    expect(seed).not.toBeNull();
    expect(seed?.templateId).toBe('coastal-breeze');
    expect(seed?.templateName).toBe('Coastal Breeze');
    expect(seed?.pages[0]?.sections[0]).toMatchObject({
      type: 'hero',
      title: 'Hero',
      subtitle: expect.stringContaining('Alex & Jordan'),
    });
    expect(seed?.pages[0]?.sections.some((section) => section.type === 'travel')).toBe(true);
    expect(seed?.previewFields).toMatchObject({
      coupleDisplayName: 'Alex & Jordan',
      eventDateISO: '2026-09-18T16:00:00',
      scheduleTitle: 'Wedding weekend',
      scheduleNote: 'Napa, CA',
      travelFlights: 'Plan arrival into the nearest airport for Napa, CA.',
      registryTitle: 'Travel fund',
      rsvpTitle: 'Tell us your plan',
    });
    expect(seed?.hydratedFields).toEqual(expect.arrayContaining([
      'Couple names',
      'Wedding date',
      'Wedding location',
      'Style preferences',
      'Selected template',
    ]));
  });

  it('builds a clear setup intake summary for the V2 lab', () => {
    const seed = buildBuilderV2SetupSeed({
      ...emptySetupDraft,
      partnerOneFirstName: 'Alex',
      partnerTwoFirstName: 'Jordan',
      weddingCity: 'Napa',
      weddingRegion: 'CA',
      selectedTemplateId: 'modern-clean',
    });

    expect(seed).not.toBeNull();
    const intake = buildBuilderV2SetupIntake(seed!);

    expect(intake.title).toContain('Modern Clean');
    expect(intake.detail).toContain('setup draft');
    expect(intake.keyStats).toEqual(expect.arrayContaining(['Modern Clean', 'Couple names', 'Wedding location']));
    expect(intake.steps[0]?.detail).toContain('seeded');
    expect(intake.watchout).toContain('ready to share with guests');
    expect(intake.watchout).not.toContain('publish-ready');
  });
});
