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
        { type: 'registry', settings: {} },
        { type: 'faq', settings: {} },
        { type: 'travel', settings: {} },
        { type: 'accommodations', settings: {} },
        { type: 'dress-code', settings: {} },
        { type: 'contact', settings: {} },
        { type: 'directions', settings: {} },
        { type: 'weddingParty', settings: {} },
      ],
    },
  ],
};

describe('aiBuilderProjectPatch', () => {
  it('patches visible builder sections with generated draft content', async () => {
    const generated = await generateDraftFromWeddingProfile(profile);
    const next = mergeGeneratedDraftIntoBuilderProject(project, generated) as { pages: Array<{ sections: Array<{ type: string; settings: Record<string, unknown> }> }> };
    const sections = next.pages[0].sections;
    const heroHeadline = sections.find((section) => section.type === 'hero')?.settings.headline as { value: string; source: string };
    const storyText = sections.find((section) => section.type === 'story')?.settings.storyText as { value: string; source: string };
    const registryMessage = sections.find((section) => section.type === 'registry')?.settings.message as { value: string; source: string };
    const faqHeadline = sections.find((section) => section.type === 'faq')?.settings.headline as { value: string; source: string };
    const travelIntro = sections.find((section) => section.type === 'travel')?.settings.intro as { value: string; source: string };
    const accommodationsNote = sections.find((section) => section.type === 'accommodations')?.settings.generalNote as { value: string; source: string };
    const dressCodeDescription = sections.find((section) => section.type === 'dress-code')?.settings.description as { value: string; source: string };
    const contactIntro = sections.find((section) => section.type === 'contact')?.settings.introText as { value: string; source: string };
    const directionsTitle = sections.find((section) => section.type === 'directions')?.settings.title as { value: string; source: string };
    const weddingPartyIntro = sections.find((section) => section.type === 'weddingParty')?.settings.subheadline as { value: string; source: string };
    expect(heroHeadline.value).toBe('Alex & Jordan');
    expect(heroHeadline.source).toBe('concierge-brief');
    expect(storyText.value).toContain('We met in college');
    expect(registryMessage.value).toContain('presence is gift enough');
    expect(faqHeadline.value).toBe('Frequently Asked Questions');
    expect(travelIntro.value).toContain('San Diego, CA');
    expect(accommodationsNote.value).toContain('stay');
    expect(dressCodeDescription.value).toContain('choose something that feels right');
    expect(contactIntro.value).toContain('happy to help');
    expect(directionsTitle.value).toBe('Location & Directions');
    expect(weddingPartyIntro.value).toContain('part of our story');
  });

  it('patches drifted registry section types with generated registry copy', async () => {
    const generated = await generateDraftFromWeddingProfile(profile);
    const driftedProject = {
      pages: [
        {
          id: 'home',
          sections: [
            { type: 'Registry', settings: {} },
          ],
        },
      ],
    };

    const next = mergeGeneratedDraftIntoBuilderProject(driftedProject, generated) as { pages: Array<{ sections: Array<{ settings: Record<string, unknown> }> }> };
    const registryMessage = next.pages[0].sections[0].settings.message as { value: string; source: string };
    expect(registryMessage.value).toContain('presence is gift enough');
    expect(registryMessage.source).toBe('concierge-brief');
  });
});


it('preserves user-edited hero headline values', async () => {
  const generated = await generateDraftFromWeddingProfile(profile);
  const protectedProject = {
    pages: [
      {
        id: 'home',
        sections: [
          { type: 'hero', settings: { headline: { value: 'HAND EDITED HERO TITLE', source: 'user-edited' } } },
        ],
      },
    ],
  };
  const next = mergeGeneratedDraftIntoBuilderProject(protectedProject, generated) as { pages: Array<{ sections: Array<{ settings: Record<string, unknown> }> }> };
  const heroHeadline = next.pages[0].sections[0].settings.headline as { value: string; source: string };
  expect(heroHeadline.value).toBe('HAND EDITED HERO TITLE');
  expect(heroHeadline.source).toBe('user-edited');
});
