import { describe, expect, it } from 'vitest';

import {
  buildBuilderV2TemplateSeed,
  getBuilderV2TemplateSectionSubtitle,
  getBuilderV2TemplateSectionTitle,
} from './builderV2TemplateSeed';

describe('builderV2TemplateSeed', () => {
  it('builds a real V2 page spine directly from a template id', () => {
    const seed = buildBuilderV2TemplateSeed('destination-adventure');

    expect(seed.templateId).toBe('destination-adventure');
    expect(seed.templateName).toBe('Destination Adventure');
    expect(seed.pages).toHaveLength(1);
    expect(seed.pages[0]?.sections.map((section) => section.type)).toEqual([
      'hero',
      'travel',
      'story',
      'venue',
      'accommodations',
      'schedule',
      'gallery',
      'rsvp',
      'faq',
      'footer-cta',
    ]);
    expect(seed.selectedSectionId).toBe('hero-1');
  });

  it('supports customized section copy and density when a caller needs richer context', () => {
    const seed = buildBuilderV2TemplateSeed('modern-clean', {
      density: 'compact',
      sectionTitle: (type) => `Seeded ${type}`,
      sectionSubtitle: (type) => `About ${type}`,
    });

    expect(seed.pages[0]?.sections[0]).toMatchObject({
      title: 'Seeded hero',
      subtitle: 'About hero',
      density: 'compact',
    });
  });

  it('provides sensible default section copy for long-tail template sections', () => {
    expect(getBuilderV2TemplateSectionTitle('footer-cta')).toBe('Closing CTA');
    expect(getBuilderV2TemplateSectionSubtitle('wedding-party')).toBe('The people standing with us');
    expect(getBuilderV2TemplateSectionSubtitle('video')).toBe('Films + clips');
  });
});
