import { describe, expect, it } from 'vitest';

import { buildBuilderV2UpgradeGuidance } from './builderV2UpgradeGuidance';
import { createEmptyBuilderProject } from '../../types/builder/project';
import { createDefaultSectionInstance } from '../../types/builder/section';
import { createEmptyWeddingData } from '../../types/weddingData';

describe('builderV2UpgradeGuidance', () => {
  it('frames stronger structural review when the draft basics are already healthy', () => {
    const project = createEmptyBuilderProject('site-1', 'modern-luxe');
    project.pages[0].sections = [
      createDefaultSectionInstance('hero', 'default', 0),
      createDefaultSectionInstance('story', 'default', 1),
    ];

    const weddingData = createEmptyWeddingData();
    weddingData.couple.partner1Name = 'Alex';
    weddingData.couple.partner2Name = 'Jordan';
    weddingData.event.weddingDateISO = '2026-09-14T16:00:00.000Z';
    weddingData.venues = [{ id: 'venue-1', name: 'Sunset Gardens' }];

    const guidance = buildBuilderV2UpgradeGuidance(project, weddingData, { isDirty: false });
    expect(guidance.title).toContain('page flow');
    expect(guidance.keyStats).toContain('Builder draft already saved');
  });

  it('keeps missing launch basics visible when upgrading a rougher draft', () => {
    const project = createEmptyBuilderProject('site-2', 'modern-luxe');
    project.pages[0].sections = [createDefaultSectionInstance('hero', 'default', 0)];

    const guidance = buildBuilderV2UpgradeGuidance(project, createEmptyWeddingData(), { isDirty: true });
    expect(guidance.detail).toContain('missing launch basics');
    expect(guidance.keyStats).toContain('Unsaved Builder edits included');
    expect(guidance.steps[1]?.detail).toContain('launch basic');
  });
});
