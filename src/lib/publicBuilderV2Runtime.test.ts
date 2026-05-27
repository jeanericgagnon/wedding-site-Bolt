import { describe, expect, it } from 'vitest';
import { getPublicBuilderPagesFromV2Document } from './publicBuilderV2Runtime';

describe('publicBuilderV2Runtime', () => {
  it('maps a multi-page builder v2 document into public builder pages in order', () => {
    const pages = getPublicBuilderPagesFromV2Document({
      version: 'v2',
      updatedAtISO: '2026-05-27T23:00:00.000Z',
      pages: [
        {
          id: 'home',
          title: 'Home',
          slug: 'home',
          isHome: true,
          hidden: false,
          sections: [
            {
              id: 'hero-1',
              type: 'hero',
              variant: 'default',
              enabled: true,
              title: 'Alex & Jordan',
              subtitle: 'Join us in Napa',
              blocks: [
                { id: 'b1', type: 'title', data: { text: 'Alex & Jordan' } },
                { id: 'b2', type: 'photo', data: { imageUrl: 'https://example.com/hero.jpg' } },
              ],
            },
          ],
        },
        {
          id: 'faq',
          title: 'FAQ',
          slug: 'faq',
          isHome: false,
          hidden: true,
          sections: [
            {
              id: 'faq-1',
              type: 'faq',
              variant: 'default',
              enabled: true,
              title: 'FAQ',
              subtitle: 'Questions',
              blocks: [
                { id: 'b3', type: 'faqItem', data: { question: 'Parking?', answer: 'Yes.' } },
              ],
            },
          ],
        },
      ],
    });

    expect(pages).toHaveLength(2);
    expect(pages[0]).toMatchObject({
      id: 'home',
      slug: 'home',
      orderIndex: 0,
      meta: { isHome: true, isHidden: false },
    });
    expect(pages[1]).toMatchObject({
      id: 'faq',
      slug: 'faq',
      orderIndex: 1,
      meta: { isHome: false, isHidden: true },
    });
    expect(pages[0].sections[0].settings.headline).toBe('Alex & Jordan');
    expect(pages[0].sections[0].settings.heroImage).toBe('https://example.com/hero.jpg');
    expect(pages[1].sections[0].settings.faqItems).toEqual([
      { id: 'faq-1-faq-0', q: 'Parking?', a: 'Yes.' },
    ]);
  });

  it('preserves gallery and story settings that the public builder runtime can render directly', () => {
    const pages = getPublicBuilderPagesFromV2Document({
      version: 'v2',
      updatedAtISO: '2026-05-27T23:00:00.000Z',
      pages: [
        {
          id: 'home',
          title: 'Home',
          slug: 'home',
          isHome: true,
          hidden: false,
          sections: [
            {
              id: 'story-1',
              type: 'story',
              variant: 'default',
              enabled: true,
              title: 'Our Story',
              blocks: [
                { id: 'story-line-1', type: 'story', data: { text: 'We met by chance.' } },
                { id: 'story-line-2', type: 'text', data: { text: 'Now we get to celebrate on purpose.' } },
                { id: 'story-photo', type: 'photo', data: { imageUrl: 'https://example.com/story.jpg', caption: 'At the lake' } },
              ],
            },
            {
              id: 'gallery-1',
              type: 'gallery',
              variant: 'default',
              enabled: true,
              title: 'Photos',
              blocks: [
                { id: 'photo-1', type: 'photo', data: { imageUrl: 'https://example.com/gallery.jpg', caption: 'Engagement session' } },
              ],
            },
          ],
        },
      ],
    });

    expect(pages[0].sections[0].settings.storyText).toBe('We met by chance.\n\nNow we get to celebrate on purpose.');
    expect(pages[0].sections[0].settings.heroImageUrl).toBe('https://example.com/story.jpg');
    expect(pages[0].sections[1].settings.galleryImages).toEqual([
      {
        id: 'gallery-1-photo-0',
        url: 'https://example.com/gallery.jpg',
        image: 'https://example.com/gallery.jpg',
        caption: 'Engagement session',
        title: 'Engagement session',
        alt: 'Engagement session',
      },
    ]);
  });
});
