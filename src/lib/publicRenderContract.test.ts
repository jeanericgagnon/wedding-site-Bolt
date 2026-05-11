import { describe, expect, it } from 'vitest';
import { SECTION_MANIFESTS } from '../builder/registry/sectionManifests';
import {
  PUBLIC_SECTION_SETTING_ALIAS_EXCEPTIONS,
  PUBLIC_SECTION_SETTINGS_ALLOWLIST,
  sanitizePublicSectionSettings,
} from './publicRenderContract';

describe('publicRenderContract', () => {
  it('keeps every public settings allowlist key anchored to a manifest field or explicit alias exception', () => {
    for (const [type, keys] of Object.entries(PUBLIC_SECTION_SETTINGS_ALLOWLIST)) {
      const manifest = SECTION_MANIFESTS[type as keyof typeof SECTION_MANIFESTS];
      expect(manifest, `${type} should map to a section manifest`).toBeDefined();

      const manifestKeys = new Set(manifest.settingsSchema.fields.map((field) => field.key));
      const aliasKeys = new Set(PUBLIC_SECTION_SETTING_ALIAS_EXCEPTIONS[type as keyof typeof PUBLIC_SECTION_SETTING_ALIAS_EXCEPTIONS] ?? []);

      for (const key of keys) {
        expect(
          manifestKeys.has(key) || aliasKeys.has(key),
          `${type}.${key} must be a real manifest field or documented public alias`,
        ).toBe(true);
      }
    }
  });

  it('normalizes footer CTA aliases into the strict public DTO without leaking the raw alias keys', () => {
    const settings = sanitizePublicSectionSettings('footer-cta', 'default', {
      ctaLabel: 'RSVP now',
      ctaHref: '#rsvp',
      adminEmail: 'private@example.com',
      monogram: 'K&E',
    });

    expect(settings).toEqual({
      headline: 'We hope to see you there',
      buttonLabel: 'RSVP now',
      rsvpUrl: '#rsvp',
    });
    expect(settings).not.toHaveProperty('ctaLabel');
    expect(settings).not.toHaveProperty('ctaHref');
    expect(settings).not.toHaveProperty('adminEmail');
    expect(settings).not.toHaveProperty('monogram');
  });

  it('normalizes hero legacy title/subtitle fields into the resolved public hero renderer contract', () => {
    const settings = sanitizePublicSectionSettings('hero', 'fullBleed', {
      title: 'We are getting married',
      subtitle: 'June 14, 2025 · The Grand Pavilion, New York',
      headline: 'Kara & Eric',
      ctaLabel: 'Send RSVP',
      ctaHref: '#rsvp',
      privateToken: 'secret',
    });

    expect(settings).toEqual({
      headline: 'Kara & Eric',
      eyebrow: 'We are getting married',
      subheadline: 'June 14, 2025 · The Grand Pavilion, New York',
      overlayOpacity: 40,
      ctaLabel: 'Send RSVP',
      ctaHref: '#rsvp',
    });
    expect(settings).not.toHaveProperty('title');
    expect(settings).not.toHaveProperty('subtitle');
    expect(settings).not.toHaveProperty('showTitle');
    expect(settings).not.toHaveProperty('privateToken');
  });

  it('normalizes story legacy fields into the resolved public story renderer contract', () => {
    const settings = sanitizePublicSectionSettings('story', 'timeline', {
      title: 'How we met',
      storyText: 'We met on a rainy Tuesday.',
      photo: 'https://example.com/couple.jpg',
      showTitle: false,
      plannerNotes: 'private',
    });

    expect(settings).toEqual({
      headline: 'How we met',
      body: 'We met on a rainy Tuesday.',
      image: 'https://example.com/couple.jpg',
      showDivider: false,
    });
    expect(settings).not.toHaveProperty('title');
    expect(settings).not.toHaveProperty('storyText');
    expect(settings).not.toHaveProperty('photo');
    expect(settings).not.toHaveProperty('showTitle');
    expect(settings).not.toHaveProperty('plannerNotes');
  });

  it('normalizes contact form title aliases into the resolved public renderer fields', () => {
    const settings = sanitizePublicSectionSettings('contact', 'form', {
      title: 'Questions for us?',
      subtitle: 'We are happy to help.',
      introText: 'Reach out any time.',
      contacts: [{
        id: 'planner-1',
        name: 'Avery Planner',
        role: 'Planner',
        email: 'avery@example.com',
        phone: '+1 212 555 1111',
        instagram: '@averyplans',
        adminEmail: 'private@example.com',
        billingStatus: 'past_due',
      }],
      poll: { id: 'poll-secret' },
    });

    expect(settings).toEqual({
      showTitle: true,
      eyebrow: 'Need help?',
      emailSubject: 'Wedding Question',
      headline: 'Questions for us?',
      subheadline: 'We are happy to help.',
      introText: 'Reach out any time.',
      contacts: [{
        id: 'planner-1',
        name: 'Avery Planner',
        role: 'Planner',
        email: 'avery@example.com',
        phone: '+1 212 555 1111',
        instagram: '@averyplans',
      }],
    });
    expect(settings).not.toHaveProperty('title');
    expect(settings).not.toHaveProperty('subtitle');
    expect(settings).not.toHaveProperty('poll');
  });

  it('normalizes travel title aliases and allowlists nested travel list entries', () => {
    const settings = sanitizePublicSectionSettings('travel', 'list', {
      title: 'Travel & Accommodations',
      showTitle: true,
      showTimezoneBadge: true,
      showIcsButton: true,
      showParking: true,
      flightInfo: 'Fly into SFO.',
      generalNote: 'Book early.',
      hotels: [{
        id: 'hotel-1',
        name: 'Harbor Hotel',
        distance: '0.3 miles',
        price: '$250',
        bookingCode: 'MAYALEO',
        phone: '+1 555 0101',
        url: 'https://example.com/stay',
        notes: 'Shuttle leaves at 4pm.',
        adminEmail: 'private@example.com',
        queueTargets: ['hide-me'],
      }],
      plannerNotes: 'private',
    });

    expect(settings).toEqual({
      headline: 'Travel & Accommodations',
      flightInfo: 'Fly into SFO.',
      generalNote: 'Book early.',
      hotels: [{
        id: 'hotel-1',
        name: 'Harbor Hotel',
        distance: '0.3 miles',
        price: '$250',
        bookingCode: 'MAYALEO',
        phone: '+1 555 0101',
        url: 'https://example.com/stay',
        notes: 'Shuttle leaves at 4pm.',
      }],
    });
    expect(settings).not.toHaveProperty('title');
    expect(settings).not.toHaveProperty('showTitle');
    expect(settings).not.toHaveProperty('showTimezoneBadge');
    expect(settings).not.toHaveProperty('showIcsButton');
    expect(settings).not.toHaveProperty('showParking');
    expect(JSON.stringify(settings)).not.toContain('adminEmail');
    expect(JSON.stringify(settings)).not.toContain('queueTargets');
    expect(JSON.stringify(settings)).not.toContain('plannerNotes');
  });

  it('normalizes gallery aliases and allowlists nested image entries', () => {
    const settings = sanitizePublicSectionSettings('gallery', 'masonry', {
      title: 'Weekend photos',
      showTitle: true,
      galleryImages: [
        {
          id: 'img-1',
          url: 'https://example.com/photo.jpg',
          caption: 'Ceremony',
          alt: 'Ceremony flowers',
          span: '2',
          adminEmail: 'hide@example.com',
        },
      ],
      autoplay: true,
      backgroundColor: '#fef9f0',
      providerSecret: 'hide-me',
    });

    expect(settings).toEqual({
      eyebrow: 'Our moments',
      headline: 'Weekend photos',
      animation: 'fade',
      showCaptions: true,
      enableLightbox: true,
      autoScroll: false,
      continuousGlide: true,
      glideSpeed: 42,
      images: [{
        id: 'img-1',
        url: 'https://example.com/photo.jpg',
        caption: 'Ceremony',
        alt: 'Ceremony flowers',
        span: '2',
      }],
      autoplay: true,
      backgroundColor: '#fef9f0',
    });
    expect(settings).not.toHaveProperty('title');
    expect(settings).not.toHaveProperty('showTitle');
    expect(settings).not.toHaveProperty('galleryImages');
    expect(JSON.stringify(settings)).not.toContain('adminEmail');
    expect(JSON.stringify(settings)).not.toContain('providerSecret');
  });

  it('normalizes countdown legacy title fields into the resolved public countdown contract', () => {
    const settings = sanitizePublicSectionSettings('countdown', 'photo', {
      title: 'Kara & Eric',
      showTitle: true,
      eyebrow: 'Counting down to',
      targetDate: '2026-06-14',
      message: 'Join us soon.',
      messageAfter: 'Today is the day!',
      showSeconds: false,
      background: 'dark',
      layoutStyle: 'photo',
      imageUrl: 'https://example.com/countdown.jpg',
      internalNotes: 'private',
    });

    expect(settings).toEqual({
      eyebrow: 'Counting down to',
      headline: 'Kara & Eric',
      targetDate: '2026-06-14',
      message: 'Join us soon.',
      messageAfter: 'Today is the day!',
      showSeconds: false,
      background: 'dark',
      layoutStyle: 'photo',
      imageUrl: 'https://example.com/countdown.jpg',
    });
    expect(settings).not.toHaveProperty('title');
    expect(settings).not.toHaveProperty('showTitle');
    expect(JSON.stringify(settings)).not.toContain('internalNotes');
  });

  it('normalizes RSVP legacy title fields into the resolved public RSVP contract and allowlists nested events', () => {
    const settings = sanitizePublicSectionSettings('rsvp', 'multiEvent', {
      title: 'Please reply',
      showTitle: true,
      eyebrow: 'Kindly reply by',
      deadlineText: 'August 1, 2026',
      deadline: '2026-08-01',
      events: [{
        id: 'event-1',
        label: 'Ceremony',
        description: 'Main celebration',
        date: '2026-09-12',
        location: 'Garden Hall',
        adminEmail: 'hide@example.com',
        visibilityRules: ['staff-only'],
      }],
      confirmationMessage: 'Thanks for celebrating with us.',
      declineMessage: 'We will miss you.',
      guestNote: 'Please share any dietary needs.',
      mode: 'embed',
      embedUrl: 'https://example.com/rsvp',
      embedHeight: 820,
      layoutStyle: 'illustrated',
      imageUrl: 'https://example.com/rsvp-hero.jpg',
      plannerNotes: 'private',
    });

    expect(settings).toEqual({
      eyebrow: 'Kindly reply by',
      headline: 'Please reply',
      deadlineText: 'August 1, 2026',
      deadline: '2026-08-01',
      events: [{
        id: 'event-1',
        label: 'Ceremony',
        description: 'Main celebration',
        date: '2026-09-12',
        location: 'Garden Hall',
      }],
      confirmationMessage: 'Thanks for celebrating with us.',
      declineMessage: 'We will miss you.',
      guestNote: 'Please share any dietary needs.',
      mode: 'embed',
      embedUrl: 'https://example.com/rsvp',
      embedHeight: 820,
      layoutStyle: 'illustrated',
      imageUrl: 'https://example.com/rsvp-hero.jpg',
    });
    expect(settings).not.toHaveProperty('title');
    expect(settings).not.toHaveProperty('showTitle');
    expect(JSON.stringify(settings)).not.toContain('adminEmail');
    expect(JSON.stringify(settings)).not.toContain('visibilityRules');
    expect(JSON.stringify(settings)).not.toContain('plannerNotes');
  });

  it('normalizes wedding-party legacy fields into the resolved public wedding-party contract and allowlists nested members', () => {
    const settings = sanitizePublicSectionSettings('wedding-party', 'storyBios', {
      title: 'Meet our people',
      subtitle: 'The friends and family who mean the world to us.',
      bridalTitle: 'Team Maya',
      groomTitle: 'Team Leo',
      showTitle: true,
      eyebrow: 'Our people',
      groupBySide: true,
      members: [{
        id: 'member-1',
        name: 'Avery Planner',
        role: 'Maid of Honor',
        photo: 'https://example.com/avery.jpg',
        note: 'Always first on the dance floor.',
        side: 'partner1',
        collaboratorAccess: ['owner'],
      }],
      hiddenGallery: true,
    });

    expect(settings).toEqual({
      eyebrow: 'Our people',
      headline: 'Meet our people',
      subheadline: 'The friends and family who mean the world to us.',
      groupBySide: true,
      partner1Label: 'Team Maya',
      partner2Label: 'Team Leo',
      members: [{
        id: 'member-1',
        name: 'Avery Planner',
        role: 'Maid of Honor',
        photo: 'https://example.com/avery.jpg',
        note: 'Always first on the dance floor.',
        side: 'partner1',
      }],
    });
    expect(settings).not.toHaveProperty('title');
    expect(settings).not.toHaveProperty('subtitle');
    expect(settings).not.toHaveProperty('bridalTitle');
    expect(settings).not.toHaveProperty('groomTitle');
    expect(JSON.stringify(settings)).not.toContain('collaboratorAccess');
    expect(JSON.stringify(settings)).not.toContain('hiddenGallery');
  });

  it('normalizes dress-code legacy fields into the resolved public dress-code contract and allowlists nested arrays', () => {
    const settings = sanitizePublicSectionSettings('dress-code', 'moodBoard', {
      title: 'What to wear',
      showTitle: true,
      eyebrow: 'Dress your best',
      presetCode: 'cocktail',
      dressCodeLabel: 'Cocktail Attire',
      dressCode: 'Cocktail',
      description: 'Elegant and comfortable.',
      colorPalette: [{
        id: 'swatch-1',
        color: '#d4c5a9',
        label: 'Sand',
        providerSecret: 'hide-me',
      }],
      moodImages: [{
        id: 'img-1',
        url: 'https://example.com/look.jpg',
        alt: 'Style inspiration',
        adminEmail: 'hide@example.com',
      }],
      colorNote: 'Avoid white.',
      additionalNote: 'Grass lawn ceremony.',
      avoidNote: 'No denim.',
      layoutStyle: 'moodBoard',
      formalityLevel: 3,
      plannerNotes: 'private',
    });

    expect(settings).toEqual({
      eyebrow: 'Dress your best',
      headline: 'What to wear',
      presetCode: 'cocktail',
      dressCodeLabel: 'Cocktail Attire',
      dressCode: 'Cocktail',
      description: 'Elegant and comfortable.',
      colorPalette: [{
        id: 'swatch-1',
        color: '#d4c5a9',
        label: 'Sand',
      }],
      moodImages: [{
        id: 'img-1',
        url: 'https://example.com/look.jpg',
        alt: 'Style inspiration',
      }],
      colorNote: 'Avoid white.',
      additionalNote: 'Grass lawn ceremony.',
      avoidNote: 'No denim.',
      layoutStyle: 'moodBoard',
      formalityLevel: 3,
    });
    expect(settings).not.toHaveProperty('title');
    expect(settings).not.toHaveProperty('showTitle');
    expect(JSON.stringify(settings)).not.toContain('providerSecret');
    expect(JSON.stringify(settings)).not.toContain('adminEmail');
    expect(JSON.stringify(settings)).not.toContain('plannerNotes');
  });

  it('allowlists accommodations hotel entries per public variant without leaking nested private fields', () => {
    const settings = sanitizePublicSectionSettings('accommodations', 'cards', {
      title: 'Places to stay',
      headline: 'Stay nearby',
      eyebrow: 'Book early',
      generalNote: 'We reserved a block.',
      blockNote: 'Discount ends May 1.',
      shuttleNote: 'Shuttle leaves at 4pm.',
      layoutStyle: 'featured',
      mapImage: 'https://example.com/map.jpg',
      hotels: [{
        id: 'hotel-1',
        name: 'Harbor Hotel',
        stars: 4,
        distance: '0.3 miles',
        priceRange: '$250-$300',
        bookingCode: 'MAYALEO',
        bookingDeadline: 'May 20',
        phone: '+1 555 0101',
        url: 'https://example.com/stay',
        image: 'https://example.com/stay.jpg',
        notes: 'Walkable.',
        recommended: true,
        adminEmail: 'hide@example.com',
        billingStatus: 'past_due',
      }],
      internalQueueConfig: { id: 'hide-me' },
    });

    expect(settings).toEqual({
      showTitle: true,
      title: 'Places to stay',
      headline: 'Stay nearby',
      eyebrow: 'Book early',
      generalNote: 'We reserved a block.',
      blockNote: 'Discount ends May 1.',
      shuttleNote: 'Shuttle leaves at 4pm.',
      mapImage: 'https://example.com/map.jpg',
      layoutStyle: 'featured',
      hotels: [{
        id: 'hotel-1',
        name: 'Harbor Hotel',
        stars: 4,
        distance: '0.3 miles',
        priceRange: '$250-$300',
        bookingCode: 'MAYALEO',
        bookingDeadline: 'May 20',
        phone: '+1 555 0101',
        url: 'https://example.com/stay',
        image: 'https://example.com/stay.jpg',
        notes: 'Walkable.',
        recommended: true,
      }],
    });
    expect(JSON.stringify(settings)).not.toContain('adminEmail');
    expect(JSON.stringify(settings)).not.toContain('billingStatus');
    expect(JSON.stringify(settings)).not.toContain('internalQueueConfig');
  });

  it('allowlists directions transport entries without leaking nested private fields', () => {
    const settings = sanitizePublicSectionSettings('directions', 'pin', {
      eyebrow: 'Getting here',
      headline: 'Directions & Parking',
      venueName: 'Garden Hall',
      address: '123 Celebration Lane',
      city: 'Portland, OR',
      mapUrl: 'https://maps.example.com/venue',
      parkingNote: 'Valet available.',
      shuttleNote: 'Hotel shuttle every 30 min.',
      showTransport: true,
      transport: [{
        id: 'transport-1',
        icon: 'train',
        label: 'By train',
        description: 'Red line to Oak Station.',
        ownerPreview: true,
        internalSchema: { secret: true },
      }],
      background: 'soft',
      providerSecret: 'hide-me',
    });

    expect(settings).toEqual({
      eyebrow: 'Getting here',
      headline: 'Directions & Parking',
      venueName: 'Garden Hall',
      address: '123 Celebration Lane',
      city: 'Portland, OR',
      mapUrl: 'https://maps.example.com/venue',
      parkingNote: 'Valet available.',
      shuttleNote: 'Hotel shuttle every 30 min.',
      showTransport: true,
      drivingTimeFrom: 'downtown',
      transport: [{
        id: 'transport-1',
        icon: 'train',
        label: 'By train',
        description: 'Red line to Oak Station.',
      }],
      background: 'soft',
    });
    expect(JSON.stringify(settings)).not.toContain('ownerPreview');
    expect(JSON.stringify(settings)).not.toContain('internalSchema');
    expect(JSON.stringify(settings)).not.toContain('providerSecret');
  });

  it('allowlists music playlist entries without leaking nested private fields', () => {
    const settings = sanitizePublicSectionSettings('music', 'playlist', {
      eyebrow: 'The soundtrack',
      headline: 'Music for our day',
      playlists: [{
        id: 'playlist-1',
        label: 'Reception',
        spotifyUrl: 'https://open.spotify.com/playlist/dayof',
        appleMusicUrl: 'https://music.apple.com/us/playlist/wedding',
        tracks: [{
          id: 'track-1',
          title: 'September',
          artist: 'Earth, Wind & Fire',
          moment: 'Reception',
          ownerPreview: true,
        }],
        adminEmail: 'hide@example.com',
      }],
      queueTargets: ['hide-me'],
    });

    expect(settings).toEqual({
      eyebrow: 'The soundtrack',
      headline: 'Music for our day',
      showRequestNote: true,
      playlists: [{
        id: 'playlist-1',
        label: 'Reception',
        spotifyUrl: 'https://open.spotify.com/playlist/dayof',
        appleMusicUrl: 'https://music.apple.com/us/playlist/wedding',
        tracks: [{
          id: 'track-1',
          title: 'September',
          artist: 'Earth, Wind & Fire',
          moment: 'Reception',
        }],
      }],
    });
    expect(JSON.stringify(settings)).not.toContain('ownerPreview');
    expect(JSON.stringify(settings)).not.toContain('adminEmail');
    expect(JSON.stringify(settings)).not.toContain('queueTargets');
  });

  it('allowlists video card entries without leaking nested private fields', () => {
    const settings = sanitizePublicSectionSettings('video', 'card', {
      eyebrow: 'Moments on film',
      headline: 'Our videos',
      background: 'soft',
      videos: [{
        id: 'video-1',
        title: 'Save the date',
        description: 'A little sneak peek.',
        videoUrl: 'https://vimeo.com/123456789',
        thumbnailUrl: 'https://example.com/poster.jpg',
        videoType: 'vimeo',
        providerSecret: 'hide-me',
      }],
      moderationQueue: 'hide-me',
    });

    expect(settings).toEqual({
      eyebrow: 'Moments on film',
      headline: 'Our videos',
      background: 'soft',
      videos: [{
        id: 'video-1',
        title: 'Save the date',
        description: 'A little sneak peek.',
        videoUrl: 'https://vimeo.com/123456789',
        thumbnailUrl: 'https://example.com/poster.jpg',
      }],
    });
    expect(JSON.stringify(settings)).not.toContain('providerSecret');
    expect(JSON.stringify(settings)).not.toContain('moderationQueue');
  });
});
