import { describe, expect, it } from 'vitest';
import { mergeGeneratedDraftIntoBuilderProject } from './aiBuilderProjectPatch';
import { generateDraftFromWeddingProfile } from './aiDraftGenerator';
import { createEmptyWeddingProfile } from './weddingProfile';

const profile = {
  ...createEmptyWeddingProfile(),
  couple: { ...createEmptyWeddingProfile().couple, displayNames: 'Alex & Jordan', partnerOne: 'Alex', partnerTwo: 'Jordan' },
  event: { ...createEmptyWeddingProfile().event, date: '2027-06-12', venueLocation: 'San Diego, CA', rsvpDeadline: '2027-05-01' },
  story: { ...createEmptyWeddingProfile().story, summary: 'We met in college.' },
};

const project = {
  pages: [
    {
      id: 'home',
      sections: [
        { type: 'hero', settings: {} },
        { type: 'story', settings: {} },
        { type: 'footer-cta', settings: {} },
      ],
    },
  ],
};

describe('aiBuilderProjectPatch', () => {
  it('patches visible builder sections with generated draft content', () => {
    const generated = generateDraftFromWeddingProfile(profile);
    const next = mergeGeneratedDraftIntoBuilderProject(project, generated) as { pages: Array<{ sections: Array<{ type: string; settings: Record<string, unknown> }> }> };
    const sections = next.pages[0].sections;
    expect(sections.find((section) => section.type === 'hero')?.settings.headline).toBe('Alex & Jordan');
    expect(sections.find((section) => section.type === 'story')?.settings.storyText).toContain('We met in college');
    expect(sections.find((section) => section.type === 'footer-cta')?.settings.headline).toContain('2027-05-01');
  });
});
