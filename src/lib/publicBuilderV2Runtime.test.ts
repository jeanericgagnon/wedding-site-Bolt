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
});
