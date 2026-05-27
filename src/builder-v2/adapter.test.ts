import { describe, it, expect } from 'vitest';
import type { SectionInstance } from '../types/layoutConfig';
import {
  builderV2DocumentToBuilderProject,
  builderProjectToBuilderV2Document,
  layoutConfigToBuilderV2Document,
  looksLikeBuilderProject,
  looksLikeBuilderV2Document,
  looksLikeLayoutConfigV1,
  toBuilderV2Document,
  toBuilderV2Section,
} from './adapter';

describe('toBuilderV2Document', () => {
  it('maps section instances into a v2 document without inventing guest content', () => {
    const instances: SectionInstance[] = [
      {
        id: 'hero-1',
        type: 'hero',
        variant: 'default',
        enabled: true,
        bindings: {},
        settings: { title: 'Welcome', subtitle: 'Join us' },
      },
      {
        id: 'faq-1',
        type: 'faq',
        variant: 'iconGrid',
        enabled: false,
        bindings: {},
        settings: { title: 'FAQ' },
      },
    ];

    const out = toBuilderV2Document(instances);
    const homePage = out.pages?.[0];
    const sections = homePage?.sections ?? [];

    expect(out.version).toBe('v2');
    expect(sections).toHaveLength(2);
    expect(homePage).toMatchObject({ id: 'home', title: 'Home', slug: 'home', isHome: true });
    expect(sections[0]).toMatchObject({
      id: 'hero-1',
      type: 'hero',
      variant: 'default',
      enabled: true,
      title: 'Welcome',
      subtitle: 'Join us',
    });
    expect(sections[0]?.blocks).toMatchObject([
      { type: 'title', data: { text: 'Welcome' } },
      { type: 'text', data: { text: 'Join us' } },
    ]);
    expect(sections[1]?.blocks).toEqual([]);
    expect(typeof out.updatedAtISO).toBe('string');
  });

  it('normalizes drifted registry section types without fabricating registry items', () => {
    const section = toBuilderV2Section({
      id: 'registry-1',
      type: 'registry-section' as never,
      variant: 'default',
      enabled: true,
      bindings: {},
      settings: { title: 'Registry' },
    });

    expect(section.type).toBe('registry');
    expect(section.blocks).toEqual([]);
  });

  it('normalizes extended registrysection drift without fabricating registry items', () => {
    const section = toBuilderV2Section({
      id: 'registry-2',
      type: 'registry-section-preview' as never,
      variant: 'default',
      enabled: true,
      bindings: {},
      settings: { title: 'Registry' },
    });

    expect(section.type).toBe('registry');
    expect(section.blocks).toEqual([]);
  });

  it('keeps real legacy descriptive text while leaving structured sections otherwise empty', () => {
    const travelSection = toBuilderV2Section({
      id: 'travel-1',
      type: 'travel',
      variant: 'default',
      enabled: true,
      bindings: {},
      settings: { title: 'Travel', description: 'Stay nearby and book your room early.' },
    });

    const scheduleSection = toBuilderV2Section({
      id: 'schedule-1',
      type: 'schedule',
      variant: 'default',
      enabled: true,
      bindings: {},
      settings: { title: 'Schedule' },
    });

    expect(travelSection.blocks).toMatchObject([
      { type: 'text', data: { text: 'Stay nearby and book your room early.' } },
    ]);
    expect(scheduleSection.blocks).toEqual([]);
  });

  it('preserves authored countdown, footer cta, dress code, accommodations, and contact copy when migrating legacy sections into v2', () => {
    const countdownSection = toBuilderV2Section({
      id: 'countdown-1',
      type: 'countdown',
      variant: 'default',
      enabled: true,
      bindings: {},
      settings: { title: 'Counting down', subtitle: 'Almost time', message: 'Join us for the full weekend.' },
    });

    const footerSection = toBuilderV2Section({
      id: 'footer-cta-1',
      type: 'footer-cta',
      variant: 'default',
      enabled: true,
      bindings: {},
      settings: { title: 'See you soon', subtext: 'Please RSVP when you can.', footerNote: 'Travel details keep evolving.' },
    });

    const dressCodeSection = toBuilderV2Section({
      id: 'dress-code-1',
      type: 'dress-code',
      variant: 'default',
      enabled: true,
      bindings: {},
      settings: {
        title: 'Cocktail Attire',
        description: 'Dressy, easy, and outdoor-friendly.',
        suggestions: ['Block heels work well', 'Please skip denim'],
        additionalNote: 'Bring a layer for the evening.',
      },
    });

    const accommodationsSection = toBuilderV2Section({
      id: 'stay-1',
      type: 'accommodations',
      variant: 'default',
      enabled: true,
      bindings: {},
      settings: {
        title: 'Where to stay',
        generalNote: 'We reserved a small room block.',
        hotels: [
          {
            name: 'The Archer',
            address: 'Main Street',
            phone: '+1 (415) 555-0111',
            notes: 'Walkable to dinner.',
            url: 'https://example.com/archer',
            blockCode: 'ARCHER-WED',
            blockDeadline: '2026-08-01',
            priceRange: '$289-$349',
            distance: '0.3 miles from venue',
          },
        ],
      },
    });

    const contactSection = toBuilderV2Section({
      id: 'contact-1',
      type: 'contact',
      variant: 'default',
      enabled: true,
      bindings: {},
      settings: {
        title: 'Questions?',
        introText: 'Reach out if you need anything before the weekend.',
        closingNote: 'We are so glad you will be there.',
      },
    });

    expect(countdownSection.blocks).toMatchObject([
      { type: 'text', data: { text: 'Almost time' } },
      { type: 'story', data: { text: 'Join us for the full weekend.' } },
    ]);
    expect(footerSection.blocks).toMatchObject([
      { type: 'text', data: { text: 'Please RSVP when you can.' } },
      { type: 'story', data: { text: 'Travel details keep evolving.' } },
    ]);
    expect(dressCodeSection.blocks).toMatchObject([
      { type: 'text', data: { text: 'Dressy, easy, and outdoor-friendly.' } },
      { type: 'qna', data: { answer: 'Block heels work well' } },
      { type: 'qna', data: { answer: 'Please skip denim' } },
      { type: 'story', data: { text: 'Bring a layer for the evening.' } },
    ]);
    expect(accommodationsSection.blocks).toMatchObject([
      { type: 'text', data: { text: 'We reserved a small room block.' } },
      {
        type: 'hotelCard',
        data: {
          title: 'The Archer',
          note: 'Walkable to dinner.',
          url: 'https://example.com/archer',
          location: 'Main Street',
          phone: '+1 (415) 555-0111',
          bookingCode: 'ARCHER-WED',
          blockDeadline: '2026-08-01',
          priceRange: '$289-$349',
          distance: '0.3 miles from venue',
        },
      },
    ]);
    expect(contactSection.blocks).toMatchObject([
      { type: 'text', data: { text: 'Reach out if you need anything before the weekend.' } },
      { type: 'story', data: { text: 'We are so glad you will be there.' } },
    ]);
  });

  it('preserves structured faq, schedule, travel, registry, and rsvp content when migrating legacy sections into v2', () => {
    const faqSection = toBuilderV2Section({
      id: 'faq-1',
      type: 'faq',
      variant: 'default',
      enabled: true,
      bindings: {},
      settings: {
        title: 'FAQ',
        faqItems: [
          { q: 'Is there parking?', a: 'Yes, valet is available.' },
          { question: 'Can I bring kids?', answer: 'Please follow your invitation.' },
        ],
      },
    });

    const scheduleSection = toBuilderV2Section({
      id: 'schedule-1',
      type: 'schedule',
      variant: 'default',
      enabled: true,
      bindings: {},
      settings: {
        title: 'Weekend schedule',
        timelineItems: [
          { title: 'Welcome drinks', time: 'Friday 6:00 PM', location: 'River House', note: 'Casual attire.' },
          { label: 'Ceremony', time: 'Saturday 4:00 PM', location: 'Sunset Gardens', text: 'Guests seated by 3:45 PM.' },
        ],
      },
    });

    const travelSection = toBuilderV2Section({
      id: 'travel-1',
      type: 'travel',
      variant: 'default',
      enabled: true,
      bindings: {},
      settings: {
        title: 'Travel',
        description: 'Plan ahead for the holiday weekend.',
        travelTips: [
          { title: 'Shuttle', note: 'Shuttle departs from the hotel lobby every 30 minutes.', url: 'https://example.com/shuttle' },
        ],
        hotels: [
          { name: 'River Inn', notes: 'Use our room block.', url: 'https://example.com/river-inn', address: '1 River Rd' },
        ],
        flightInfo: 'Fly into SFO for the easiest drive.',
      },
    });

    const registrySection = toBuilderV2Section({
      id: 'registry-1',
      type: 'registry',
      variant: 'default',
      enabled: true,
      bindings: {},
      settings: {
        title: 'Registry',
        registryItems: [
          { title: 'Stand mixer', note: 'Kitchen wish list item', url: 'https://example.com/mixer' },
        ],
        links: [
          { label: 'Crate & Barrel', url: 'https://example.com/crate' },
        ],
      },
    });

    const rsvpSection = toBuilderV2Section({
      id: 'rsvp-1',
      type: 'rsvp',
      variant: 'default',
      enabled: true,
      bindings: {},
      settings: {
        title: 'RSVP',
        rsvpNote: 'Please reply by August 1 so we can finalize seating.',
      },
    });

    expect(faqSection.blocks).toMatchObject([
      { type: 'faqItem', data: { question: 'Is there parking?', answer: 'Yes, valet is available.' } },
      { type: 'faqItem', data: { question: 'Can I bring kids?', answer: 'Please follow your invitation.' } },
    ]);
    expect(scheduleSection.blocks).toMatchObject([
      { type: 'event', data: { title: 'Welcome drinks', time: 'Friday 6:00 PM', location: 'River House', note: 'Casual attire.' } },
      { type: 'event', data: { title: 'Ceremony', time: 'Saturday 4:00 PM', location: 'Sunset Gardens', note: 'Guests seated by 3:45 PM.' } },
    ]);
    expect(travelSection.blocks).toMatchObject([
      { type: 'text', data: { text: 'Plan ahead for the holiday weekend.' } },
      { type: 'travelTip', data: { title: 'Shuttle', note: 'Shuttle departs from the hotel lobby every 30 minutes.', url: 'https://example.com/shuttle' } },
      { type: 'hotelCard', data: { title: 'River Inn', note: 'Use our room block.', url: 'https://example.com/river-inn', location: '1 River Rd' } },
      { type: 'travelTip', data: { title: 'Getting here', note: 'Fly into SFO for the easiest drive.' } },
    ]);
    expect(registrySection.blocks).toMatchObject([
      { type: 'registryItem', data: { title: 'Stand mixer', note: 'Kitchen wish list item', url: 'https://example.com/mixer' } },
      { type: 'registryItem', data: { title: 'Crate & Barrel', url: 'https://example.com/crate' } },
    ]);
    expect(rsvpSection.blocks).toMatchObject([
      { type: 'rsvpNote', data: { note: 'Please reply by August 1 so we can finalize seating.' } },
    ]);
  });

  it('preserves directions structure when migrating into and back out of builder v2', () => {
    const directionsSection = toBuilderV2Section({
      id: 'directions-1',
      type: 'directions',
      variant: 'pin',
      enabled: true,
      bindings: {},
      settings: {
        headline: 'Directions & Parking',
        venueName: 'The Grand Ballroom',
        address: '123 Celebration Lane',
        city: 'San Francisco, CA 94102',
        phone: '(415) 555-0123',
        mapUrl: 'https://example.com/maps',
        parkingNote: 'Complimentary valet parking is available at the main entrance.',
        rideshareNote: 'Uber and Lyft drop-off at the north entrance.',
        shuttleNote: 'Shuttles leave the hotel every 30 minutes starting at 4pm.',
        transport: [
          { label: 'By Car', description: 'Take I-80 West to Exit 3B.' },
          { label: 'By Transit', description: 'BART to Civic Center Station.' },
        ],
      },
    });

    expect(directionsSection.title).toBe('Directions & Parking');
    expect(directionsSection.blocks).toMatchObject([
      { type: 'text', data: { text: 'Venue: The Grand Ballroom\nAddress: 123 Celebration Lane\nCity: San Francisco, CA 94102\nPhone: (415) 555-0123' } },
      { type: 'text', data: { text: 'Parking: Complimentary valet parking is available at the main entrance.' } },
      { type: 'text', data: { text: 'Rideshare: Uber and Lyft drop-off at the north entrance.' } },
      { type: 'text', data: { text: 'Shuttle: Shuttles leave the hotel every 30 minutes starting at 4pm.' } },
      { type: 'travelTip', data: { title: 'Map', note: 'Open directions', url: 'https://example.com/maps' } },
      { type: 'travelTip', data: { title: 'By Car', note: 'Take I-80 West to Exit 3B.' } },
      { type: 'travelTip', data: { title: 'By Transit', note: 'BART to Civic Center Station.' } },
    ]);

    const project = builderV2DocumentToBuilderProject({
      version: 'v2',
      updatedAtISO: '2026-05-27T21:00:00.000Z',
      pages: [
        {
          id: 'directions',
          title: 'Directions',
          slug: 'directions',
          isHome: true,
          hidden: false,
          sections: [directionsSection],
        },
      ],
    });

    expect(project.pages[0]?.sections[0]?.settings).toMatchObject({
      headline: 'Directions & Parking',
      venueName: 'The Grand Ballroom',
      address: '123 Celebration Lane',
      city: 'San Francisco, CA 94102',
      phone: '(415) 555-0123',
      mapUrl: 'https://example.com/maps',
      parkingNote: 'Complimentary valet parking is available at the main entrance.',
      rideshareNote: 'Uber and Lyft drop-off at the north entrance.',
      shuttleNote: 'Shuttles leave the hotel every 30 minutes starting at 4pm.',
      transport: [
        { id: 'directions-1-transport-0', label: 'By Car', description: 'Take I-80 West to Exit 3B.' },
        { id: 'directions-1-transport-1', label: 'By Transit', description: 'BART to Civic Center Station.' },
      ],
    });
  });

  it('preserves legacy hero, story, gallery, and venue anchors when migrating into v2', () => {
    const heroSection = toBuilderV2Section({
      id: 'hero-1',
      type: 'hero',
      variant: 'default',
      enabled: true,
      bindings: {},
      settings: {
        title: 'Celebrate with us',
        subtitle: 'September 21, 2026',
        heroImageUrl: 'https://example.com/hero.jpg',
      },
    });

    const storySection = toBuilderV2Section({
      id: 'story-1',
      type: 'story',
      variant: 'default',
      enabled: true,
      bindings: {},
      settings: {
        title: 'Our Story',
        storyText: 'We met by chance and stayed out talking for hours.',
        photo: 'https://example.com/story.jpg',
      },
    });

    const gallerySection = toBuilderV2Section({
      id: 'gallery-1',
      type: 'gallery',
      variant: 'default',
      enabled: true,
      bindings: {},
      settings: {
        images: [
          { url: 'https://example.com/gallery-1.jpg', caption: 'Welcome drinks' },
          { image: 'https://example.com/gallery-2.jpg', title: 'Sunset dinner' },
        ],
      },
    });

    const venueSection = toBuilderV2Section({
      id: 'venue-1',
      type: 'venue',
      variant: 'default',
      enabled: true,
      bindings: {},
      settings: {
        title: 'Venue Details',
        subtitle: 'Ceremony on the bluff, dinner under the trees.',
        photo: { value: 'https://example.com/venue.jpg' },
      },
    });

    expect(heroSection.blocks).toMatchObject([
      { type: 'title', data: { text: 'Celebrate with us' } },
      { type: 'text', data: { text: 'September 21, 2026' } },
      { type: 'photo', data: { imageUrl: 'https://example.com/hero.jpg' } },
    ]);
    expect(storySection.blocks).toMatchObject([
      { type: 'story', data: { text: 'We met by chance and stayed out talking for hours.' } },
      { type: 'photo', data: { imageUrl: 'https://example.com/story.jpg' } },
    ]);
    expect(gallerySection.blocks).toMatchObject([
      { type: 'photo', data: { imageUrl: 'https://example.com/gallery-1.jpg', caption: 'Welcome drinks', title: 'Welcome drinks' } },
      { type: 'photo', data: { imageUrl: 'https://example.com/gallery-2.jpg', caption: 'Sunset dinner', title: 'Sunset dinner' } },
    ]);
    expect(venueSection.blocks).toMatchObject([
      { type: 'text', data: { text: 'Ceremony on the bluff, dinner under the trees.' } },
      { type: 'photo', data: { imageUrl: 'https://example.com/venue.jpg' } },
    ]);
  });
});

describe('legacy adapters', () => {
  it('maps layout config pages into multi-page builder v2 documents', () => {
    const doc = layoutConfigToBuilderV2Document({
      version: '1',
      templateId: 'modern-luxe',
      pages: [
        {
          id: 'home',
          title: 'Home',
          sections: [
            { id: 'hero', type: 'hero', variant: 'default', enabled: true, bindings: {}, settings: { title: 'Welcome', subtitle: 'Join us' } },
          ],
        },
        {
          id: 'travel',
          title: 'Travel & Stay',
          sections: [
            { id: 'travel-section', type: 'travel', variant: 'default', enabled: true, bindings: {}, settings: { title: 'Travel', description: 'Hotels and flights' } },
          ],
        },
      ],
      meta: {
        createdAtISO: '2026-05-27T18:00:00.000Z',
        updatedAtISO: '2026-05-27T19:00:00.000Z',
      },
    });

    expect(doc.updatedAtISO).toBe('2026-05-27T19:00:00.000Z');
    expect(doc.pages).toMatchObject([
      { id: 'home', slug: 'home', isHome: true, hidden: false },
      { id: 'travel', slug: 'travel-stay', isHome: false, hidden: false },
    ]);
    expect(doc.pages?.[1]?.sections[0]).toMatchObject({
      type: 'travel',
      title: 'Travel',
      subtitle: 'Hotels and flights',
    });
  });

  it('maps builder project pages into multi-page builder v2 documents', () => {
    const doc = builderProjectToBuilderV2Document({
      id: 'project-1',
      weddingId: 'w1',
      templateId: 'modern-luxe',
      themeId: 'romantic',
      pages: [
        {
          id: 'home',
          title: 'Home',
          slug: 'home',
          orderIndex: 0,
          sections: [
            {
              id: 'hero',
              displayName: 'Hero lead',
              type: 'hero',
              variant: 'default',
              enabled: true,
              locked: false,
              orderIndex: 0,
              settings: { headline: 'Welcome home', subheadline: 'See you in September' },
              bindings: {},
              styleOverrides: {},
              meta: { createdAtISO: '2026-05-27T18:00:00.000Z', updatedAtISO: '2026-05-27T18:00:00.000Z' },
            },
          ],
          meta: { isHome: true, isHidden: false },
        },
        {
          id: 'weekend',
          title: 'Weekend',
          slug: 'weekend',
          orderIndex: 1,
          sections: [
            {
              id: 'travel',
              type: 'travel',
              variant: 'default',
              enabled: true,
              locked: false,
              orderIndex: 0,
              settings: { title: 'Travel', intro: 'Stay nearby' },
              bindings: {},
              styleOverrides: {},
              meta: { createdAtISO: '2026-05-27T18:00:00.000Z', updatedAtISO: '2026-05-27T18:00:00.000Z' },
            },
          ],
          meta: { isHome: false, isHidden: true },
        },
      ],
      draftVersion: 2,
      publishedVersion: 1,
      publishStatus: 'draft',
      lastPublishedAt: null,
      meta: { createdAtISO: '2026-05-27T18:00:00.000Z', updatedAtISO: '2026-05-27T20:00:00.000Z' },
    });

    expect(doc.updatedAtISO).toBe('2026-05-27T20:00:00.000Z');
    expect(doc.pages).toMatchObject([
      { id: 'home', slug: 'home', isHome: true, hidden: false },
      { id: 'weekend', slug: 'weekend', isHome: false, hidden: true },
    ]);
    expect(doc.pages?.[0]?.sections[0]).toMatchObject({
      title: 'Hero lead',
      subtitle: 'See you in September',
    });
  });

  it('preserves legacy builder section bindings when migrating into builder v2', () => {
    const doc = builderProjectToBuilderV2Document({
      id: 'project-1',
      weddingId: 'w1',
      templateId: 'modern-luxe',
      themeId: 'romantic',
      pages: [
        {
          id: 'travel',
          title: 'Travel',
          slug: 'travel',
          orderIndex: 0,
          sections: [
            {
              id: 'travel-section',
              type: 'travel',
              variant: 'default',
              enabled: true,
              locked: false,
              orderIndex: 0,
              settings: { title: 'Travel' },
              bindings: {
                venueIds: ['venue-1'],
                scheduleItemIds: ['event-1'],
                linkIds: ['link-1'],
                faqIds: ['faq-1'],
                mediaAssetIds: ['asset-1'],
              },
              styleOverrides: {},
              meta: { createdAtISO: '2026-05-27T18:00:00.000Z', updatedAtISO: '2026-05-27T18:00:00.000Z' },
            },
          ],
          meta: { isHome: true, isHidden: false },
        },
      ],
      draftVersion: 2,
      publishedVersion: 1,
      publishStatus: 'draft',
      lastPublishedAt: null,
      meta: { createdAtISO: '2026-05-27T18:00:00.000Z', updatedAtISO: '2026-05-27T20:00:00.000Z' },
    });

    expect(doc.pages?.[0]?.sections[0]?.bindings).toEqual({
      venueIds: ['venue-1'],
      scheduleItemIds: ['event-1'],
      linkIds: ['link-1'],
      faqIds: ['faq-1'],
      mediaAssetIds: ['asset-1'],
    });
  });

  it('maps builder v2 pages back into legacy builder projects for public runtime', () => {
    const project = builderV2DocumentToBuilderProject({
      version: 'v2',
      updatedAtISO: '2026-05-27T21:00:00.000Z',
      pages: [
        {
          id: 'home',
          title: 'Home',
          slug: 'home',
          isHome: true,
          hidden: false,
          sections: [
            {
              id: 'hero',
              type: 'hero',
              variant: 'default',
              enabled: true,
              title: 'Welcome to our weekend',
              subtitle: 'Join us in Napa',
              blocks: [
                { id: 'b1', type: 'title', data: { text: 'Welcome to our weekend' } },
                { id: 'b2', type: 'text', data: { text: 'Join us in Napa' } },
                { id: 'b3', type: 'photo', data: { imageUrl: 'https://example.com/hero.jpg' } },
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
              subtitle: 'Things to know',
              blocks: [
                { id: 'b4', type: 'faqItem', data: { question: 'Is there parking?', answer: 'Yes, valet is available.' } },
              ],
            },
          ],
        },
      ],
    }, {
      id: 'project-1',
      weddingId: 'w1',
      templateId: 'modern-luxe',
      themeId: 'romantic',
      draftVersion: 4,
      publishedVersion: 3,
      publishStatus: 'published',
      lastPublishedAt: '2026-05-27T21:00:00.000Z',
      meta: {
        createdAtISO: '2026-05-27T18:00:00.000Z',
        updatedAtISO: '2026-05-27T20:00:00.000Z',
      },
    });

    expect(project).toMatchObject({
      id: 'project-1',
      weddingId: 'w1',
      templateId: 'modern-luxe',
      themeId: 'romantic',
      draftVersion: 4,
      publishedVersion: 3,
      publishStatus: 'published',
      pages: [
        {
          id: 'home',
          slug: 'home',
          meta: { isHome: true, isHidden: false },
        },
        {
          id: 'faq',
          slug: 'faq',
          meta: { isHome: false, isHidden: true },
        },
      ],
    });
    expect(project.pages[0].sections[0].settings.headline).toBe('Welcome to our weekend');
    expect(project.pages[0].sections[0].settings.heroImage).toBe('https://example.com/hero.jpg');
    expect(project.pages[1].sections[0].settings.faqItems).toEqual([
      { id: 'faq-1-faq-0', q: 'Is there parking?', a: 'Yes, valet is available.' },
    ]);
  });

  it('preserves builder v2 section bindings when mapping back into legacy builder projects', () => {
    const project = builderV2DocumentToBuilderProject({
      version: 'v2',
      updatedAtISO: '2026-05-27T21:00:00.000Z',
      pages: [
        {
          id: 'travel',
          title: 'Travel',
          slug: 'travel',
          isHome: true,
          hidden: false,
          sections: [
            {
              id: 'travel-section',
              type: 'travel',
              variant: 'default',
              enabled: true,
              title: 'Travel',
              bindings: {
                venueIds: ['venue-1'],
                scheduleItemIds: ['event-1'],
                linkIds: ['link-1'],
                faqIds: ['faq-1'],
                mediaAssetIds: ['asset-1'],
              },
              blocks: [],
            },
          ],
        },
      ],
    });

    expect(project.pages[0]?.sections[0]?.bindings).toEqual({
      venueIds: ['venue-1'],
      scheduleItemIds: ['event-1'],
      linkIds: ['link-1'],
      faqIds: ['faq-1'],
      mediaAssetIds: ['asset-1'],
    });
  });

  it('keeps story, gallery, and accommodations content legible in the legacy public runtime bridge', () => {
    const project = builderV2DocumentToBuilderProject({
      version: 'v2',
      updatedAtISO: '2026-05-27T22:00:00.000Z',
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
              subtitle: 'How it began',
              blocks: [
                { id: 'story-text-1', type: 'story', data: { text: 'We met on a rainy Tuesday.' } },
                { id: 'story-text-2', type: 'text', data: { text: 'Then we kept finding reasons to stay out longer.' } },
                { id: 'story-photo', type: 'photo', data: { imageUrl: 'https://example.com/story.jpg', caption: 'Downtown, where it started' } },
              ],
            },
            {
              id: 'gallery-1',
              type: 'gallery',
              variant: 'default',
              enabled: true,
              title: 'Weekend memories',
              blocks: [
                { id: 'gallery-photo-1', type: 'photo', data: { imageUrl: 'https://example.com/gallery-1.jpg', caption: 'Sunset dinner' } },
                { id: 'gallery-photo-2', type: 'photo', data: { imageUrl: 'https://example.com/gallery-2.jpg', title: 'Welcome drinks' } },
              ],
            },
            {
              id: 'stay-1',
              type: 'accommodations',
              variant: 'default',
              enabled: true,
              title: 'Where to stay',
              subtitle: 'A couple of easy options nearby',
              blocks: [
                {
                  id: 'hotel-1',
                  type: 'hotelCard',
                  data: {
                    title: 'The Archer',
                    note: 'Walkable to dinner.',
                    url: 'https://example.com/archer',
                    location: 'Main Street',
                    phone: '+1 (415) 555-0111',
                    bookingCode: 'ARCHER-WED',
                    blockDeadline: '2026-08-01',
                    priceRange: '$289-$349',
                    distance: '0.3 miles from venue',
                  },
                },
                { id: 'hotel-2', type: 'travelTip', data: { title: 'Book early', note: 'Rooms go fastest on Friday night.' } },
              ],
            },
          ],
        },
      ],
    }, null);

    expect(project.pages[0].sections[0].settings.storyText).toBe(
      'We met on a rainy Tuesday.\n\nThen we kept finding reasons to stay out longer.',
    );
    expect(project.pages[0].sections[0].settings.heroImage).toBe('https://example.com/story.jpg');
    expect(project.pages[0].sections[1].settings.images).toEqual([
      {
        id: 'gallery-1-photo-0',
        url: 'https://example.com/gallery-1.jpg',
        image: 'https://example.com/gallery-1.jpg',
        caption: 'Sunset dinner',
        title: 'Sunset dinner',
        alt: 'Sunset dinner',
      },
      {
        id: 'gallery-1-photo-1',
        url: 'https://example.com/gallery-2.jpg',
        image: 'https://example.com/gallery-2.jpg',
        caption: 'Welcome drinks',
        title: 'Welcome drinks',
        alt: 'Welcome drinks',
      },
    ]);
    expect(project.pages[0].sections[2].settings).toMatchObject({
      generalNote: 'A couple of easy options nearby',
      hotels: [
        {
          name: 'The Archer',
          notes: 'Walkable to dinner.',
          url: 'https://example.com/archer',
          address: 'Main Street',
          phone: '+1 (415) 555-0111',
          blockCode: 'ARCHER-WED',
          blockDeadline: '2026-08-01',
          priceRange: '$289-$349',
          distance: '0.3 miles from venue',
        },
      ],
      travelTips: [
        {
          id: 'stay-1-card-0',
          title: 'Book early',
          note: 'Rooms go fastest on Friday night.',
          url: '',
        },
      ],
      hotelInfo: 'Book early: Rooms go fastest on Friday night.',
    });
  });

  it('keeps builder v2 travel cards separated when mapping back to legacy runtime settings', () => {
    const project = builderV2DocumentToBuilderProject({
      version: 'v2',
      updatedAtISO: '2026-05-27T21:00:00.000Z',
      pages: [
        {
          id: 'travel',
          title: 'Travel',
          slug: 'travel',
          isHome: true,
          hidden: false,
          sections: [
            {
              id: 'travel-1',
              type: 'travel',
              variant: 'default',
              enabled: true,
              title: 'Travel',
              subtitle: 'Plan ahead for the holiday weekend.',
              blocks: [
                { id: 'travel-note', type: 'text', data: { text: 'Use the shuttle if you do not want to drive after dinner.' } },
                { id: 'travel-flight', type: 'travelTip', data: { title: 'Getting here', note: 'Fly into SFO for the easiest drive.' } },
                { id: 'travel-parking', type: 'travelTip', data: { title: 'Parking', note: 'Valet is available at the venue.' } },
                { id: 'travel-hotel-tip', type: 'travelTip', data: { title: 'Room block', note: 'Book River Inn before August 1.' } },
                { id: 'travel-hotel-card', type: 'hotelCard', data: { title: 'River Inn', note: 'Use our room block.', url: 'https://example.com/river', location: '1 River Rd' } },
              ],
            },
          ],
        },
      ],
    });

    expect(project.pages[0].sections[0].settings).toMatchObject({
      generalNote: 'Plan ahead for the holiday weekend.',
      description: 'Plan ahead for the holiday weekend.',
      hotels: [
        {
          name: 'River Inn',
          notes: 'Use our room block.',
          url: 'https://example.com/river',
          address: '1 River Rd',
        },
      ],
      travelTips: [
        {
          id: 'travel-1-card-0',
          title: 'Getting here',
          note: 'Fly into SFO for the easiest drive.',
          url: '',
        },
        {
          id: 'travel-1-card-1',
          title: 'Parking',
          note: 'Valet is available at the venue.',
          url: '',
        },
        {
          id: 'travel-1-card-2',
          title: 'Room block',
          note: 'Book River Inn before August 1.',
          url: '',
        },
      ],
      flightInfo: 'Getting here: Fly into SFO for the easiest drive.',
      parkingInfo: 'Parking: Valet is available at the venue.',
      hotelInfo: 'Room block: Book River Inn before August 1.',
    });
  });

  it('maps builder v2 dress-code sections into legacy public runtime settings without inventing extras', () => {
    const project = builderV2DocumentToBuilderProject({
      version: 'v2',
      updatedAtISO: '2026-05-27T21:00:00.000Z',
      pages: [
        {
          id: 'home',
          title: 'Home',
          slug: 'home',
          isHome: true,
          hidden: false,
          sections: [
            {
              id: 'dress-code-1',
              type: 'dress-code',
              variant: 'default',
              enabled: true,
              title: 'Cocktail Attire',
              subtitle: 'Dressy, comfortable, and ready for an outdoor evening.',
              blocks: [
                { id: 'dress-note', type: 'text', data: { text: 'Think polished looks with layers for a cool night.' } },
                { id: 'dress-tip-1', type: 'qna', data: { answer: 'Block heels and loafers work well on the lawn.' } },
                { id: 'dress-tip-2', type: 'faqItem', data: { answer: 'Please skip denim and athletic wear.' } },
              ],
            },
          ],
        },
      ],
    });

    expect(project.pages[0].sections[0].settings).toMatchObject({
      dressCodeLabel: 'Cocktail Attire',
      description: 'Think polished looks with layers for a cool night.',
      suggestions: [
        'Block heels and loafers work well on the lawn.',
        'Please skip denim and athletic wear.',
      ],
    });
    expect(project.pages[0].sections[0].settings.additionalNote).toBe('');
  });

  it('keeps builder v2 dress-code sections sparse when the source is sparse', () => {
    const project = builderV2DocumentToBuilderProject({
      version: 'v2',
      updatedAtISO: '2026-05-27T21:00:00.000Z',
      pages: [
        {
          id: 'home',
          title: 'Home',
          slug: 'home',
          isHome: true,
          hidden: false,
          sections: [
            {
              id: 'dress-code-2',
              type: 'dress-code',
              variant: 'default',
              enabled: true,
              title: 'Dress Code',
              blocks: [],
            },
          ],
        },
      ],
    });

    expect(project.pages[0].sections[0].settings).toMatchObject({
      dressCodeLabel: 'Dress Code',
      description: '',
      suggestions: [],
    });
  });

  it('maps builder v2 countdown sections into legacy runtime settings with authored copy', () => {
    const project = builderV2DocumentToBuilderProject({
      version: 'v2',
      updatedAtISO: '2026-05-27T21:00:00.000Z',
      pages: [
        {
          id: 'home',
          title: 'Home',
          slug: 'home',
          isHome: true,
          hidden: false,
          sections: [
            {
              id: 'countdown-1',
              type: 'countdown',
              variant: 'default',
              enabled: true,
              title: 'Counting down to Napa',
              subtitle: 'Almost time',
              blocks: [
                { id: 'countdown-note', type: 'text', data: { text: 'Join us for a full wedding weekend in wine country.' } },
              ],
            },
          ],
        },
      ],
    });

    expect(project.pages[0].sections[0].settings).toMatchObject({
      title: 'Counting down to Napa',
      eyebrow: 'Almost time',
      message: 'Join us for a full wedding weekend in wine country.',
    });
  });

  it('maps builder v2 footer cta sections into legacy runtime settings with ordered authored copy', () => {
    const project = builderV2DocumentToBuilderProject({
      version: 'v2',
      updatedAtISO: '2026-05-27T21:00:00.000Z',
      pages: [
        {
          id: 'home',
          title: 'Home',
          slug: 'home',
          isHome: true,
          hidden: false,
          sections: [
            {
              id: 'footer-cta-1',
              type: 'footer-cta',
              variant: 'default',
              enabled: true,
              title: 'We hope to celebrate with you',
              subtitle: 'Please send your RSVP when you can.',
              blocks: [
                { id: 'footer-note-1', type: 'text', data: { text: 'Weekend details will keep getting sharper as we get closer.' } },
                { id: 'footer-note-2', type: 'story', data: { text: 'Thank you for being part of it.' } },
              ],
            },
          ],
        },
      ],
    });

    expect(project.pages[0].sections[0].settings).toMatchObject({
      headline: 'We hope to celebrate with you',
      subtext: 'Please send your RSVP when you can.',
      footerNote: 'Weekend details will keep getting sharper as we get closer.',
    });
  });

  it('detects legacy input shapes safely', () => {
    expect(looksLikeLayoutConfigV1({ version: '1', templateId: 'modern-luxe', pages: [] })).toBe(true);
    expect(looksLikeBuilderProject({ weddingId: 'w1', templateId: 'modern-luxe', themeId: 'romantic', pages: [] })).toBe(true);
    expect(looksLikeBuilderV2Document({ version: 'v2', pages: [] })).toBe(true);
    expect(looksLikeLayoutConfigV1({ version: 'v2', pages: [] })).toBe(false);
    expect(looksLikeBuilderProject({ version: '1', pages: [] })).toBe(false);
  });
});
