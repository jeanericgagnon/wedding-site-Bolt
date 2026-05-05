#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const ownerEmail = process.env.V1_OWNER_EMAIL;
const ownerPassword = process.env.V1_OWNER_PASSWORD;
const targetSlug = process.argv[2] || process.env.V1_PROOF_SITE_SLUG || 'ericandkaras';

const fail = (step, message, extra = {}) => {
  console.log(JSON.stringify({ ok: false, step, message, ...extra }, null, 2));
  process.exit(1);
};

if (!supabaseUrl || !supabaseAnonKey || !ownerEmail || !ownerPassword) {
  fail('env_missing', 'Supabase URL/key and V1 owner credentials are required.');
}

const client = createClient(supabaseUrl, supabaseAnonKey);

const { data: authData, error: authError } = await client.auth.signInWithPassword({
  email: ownerEmail,
  password: ownerPassword,
});

if (authError || !authData.user) {
  fail('auth_failed', authError?.message || 'Owner sign-in failed.');
}

const { data: site, error: siteError } = await client
  .from('wedding_sites')
  .select('id, site_slug, site_url, site_json, wedding_data')
  .eq('user_id', authData.user.id)
  .eq('site_slug', targetSlug)
  .single();

if (siteError || !site) {
  fail('site_missing', siteError?.message || `No test-owner site found for slug ${targetSlug}.`, { targetSlug });
}

const now = new Date().toISOString();
const weddingDateISO = '2027-01-17T23:00:00.000Z';
const rsvpDeadlineISO = '2026-12-15T23:59:00.000Z';
const heroImageUrl = 'https://images.pexels.com/photos/1444442/pexels-photo-1444442.jpeg';

const proofWeddingData = {
  ...(site.wedding_data && typeof site.wedding_data === 'object' ? site.wedding_data : {}),
  version: '1',
  couple: {
    partner1Name: 'Eric',
    partner2Name: 'Kara',
    displayName: 'Eric & Kara',
    story:
      'A coast-to-coast kind of love story, now headed for a joyful weekend in Sayulita with the people who made the journey feel like home.',
    lastNameDisplay: 'The Gagnons',
  },
  event: {
    weddingDateISO,
    timezone: 'America/Mexico_City',
  },
  venues: [
    {
      id: 'ceremony-terrace',
      orderIndex: 0,
      name: 'Villa Amor Ocean Terrace',
      address: 'Calle Pescadores S/N, Sayulita, Nayarit, Mexico',
      notes: 'Ceremony, cocktails, dinner, and dancing all happen on the terrace. Please wear shoes that can handle stone paths.',
    },
    {
      id: 'welcome-cantina',
      orderIndex: 1,
      name: 'Don Pedro’s Palapa',
      address: 'Av. del Palmar 2, Sayulita, Nayarit, Mexico',
      notes: 'Friday welcome drinks and tacos by the beach.',
    },
  ],
  schedule: [
    {
      id: 'welcome-drinks',
      label: 'Welcome Drinks',
      startTimeISO: '2027-01-16T01:00:00.000Z',
      endTimeISO: '2027-01-16T03:00:00.000Z',
      venueId: 'welcome-cantina',
      notes: 'Drop in for tacos, margaritas, and first hugs of the weekend.',
    },
    {
      id: 'ceremony',
      label: 'Ceremony',
      startTimeISO: weddingDateISO,
      endTimeISO: '2027-01-17T23:30:00.000Z',
      venueId: 'ceremony-terrace',
      notes: 'Please arrive 20 minutes early so everyone is seated before the processional.',
    },
    {
      id: 'cocktail-hour',
      label: 'Cocktail Hour',
      startTimeISO: '2027-01-17T23:45:00.000Z',
      endTimeISO: '2027-01-18T00:45:00.000Z',
      venueId: 'ceremony-terrace',
      notes: 'Aperitivos, family photos, and sunset on the terrace.',
    },
    {
      id: 'reception',
      label: 'Dinner & Dancing',
      startTimeISO: '2027-01-18T01:00:00.000Z',
      endTimeISO: '2027-01-18T06:00:00.000Z',
      venueId: 'ceremony-terrace',
      notes: 'Dinner, speeches, and a dance floor that is absolutely not optional.',
    },
    {
      id: 'farewell-brunch',
      label: 'Farewell Brunch',
      startTimeISO: '2027-01-18T17:00:00.000Z',
      endTimeISO: '2027-01-18T19:00:00.000Z',
      venueId: 'welcome-cantina',
      notes: 'Coffee, chilaquiles, and one more round of goodbye hugs.',
    },
  ],
  rsvp: {
    enabled: true,
    deadlineISO: rsvpDeadlineISO,
    note: 'Please RSVP by December 15 so the team can finalize weekend counts.',
  },
  travel: {
    notes:
      'Fly into Puerto Vallarta, then plan for a 60-90 minute transfer to Sayulita. We recommend arriving by Friday afternoon.',
    hotelInfo:
      'A room block is available at Villa Amor for wedding guests. Additional boutique hotels are walkable in town.',
    parkingInfo:
      'Most guests will not need cars. Shuttles and taxis are easier than parking near the venue.',
    flightInfo: 'Puerto Vallarta International Airport (PVR) is the recommended airport.',
  },
  registry: {
    links: [
      { id: 'zola-fund', label: 'Honeymoon Fund', url: 'https://www.zola.com/' },
      { id: 'williamssonoma', label: 'Home Favorites', url: 'https://www.williams-sonoma.com/' },
    ],
  },
  faq: [
    {
      id: 'dress-code',
      q: 'What should I wear?',
      a: 'Beach formal. Linen, color, and comfortable shoes are encouraged; stilettos are not.',
    },
    {
      id: 'kids',
      q: 'Can we bring kids?',
      a: 'Children listed on your invitation are warmly invited. If you are unsure, check your RSVP page or message us.',
    },
    {
      id: 'transportation',
      q: 'Will transportation be provided?',
      a: 'Yes. Shuttle timing will be shared closer to the wedding weekend and posted here.',
    },
    {
      id: 'plus-ones',
      q: 'Can I bring a plus-one?',
      a: 'Please check your invitation. The RSVP form will show exactly who is included.',
    },
  ],
  theme: {
    preset: 'coastal-editorial',
    primaryColor: '#245b57',
    accentColor: '#d9a441',
  },
  media: {
    heroImageUrl,
    gallery: [
      {
        id: 'sayulita-sunset',
        url: 'https://images.pexels.com/photos/169198/pexels-photo-169198.jpeg',
        caption: 'A golden hour preview of the weekend.',
      },
      {
        id: 'terrace-table',
        url: 'https://images.pexels.com/photos/265947/pexels-photo-265947.jpeg',
        caption: 'Long tables, candlelight, and ocean air.',
      },
      {
        id: 'beach-path',
        url: 'https://images.pexels.com/photos/1024960/pexels-photo-1024960.jpeg',
        caption: 'Sayulita is best enjoyed slowly.',
      },
    ],
  },
  meta: {
    createdAtISO:
      site.wedding_data && typeof site.wedding_data === 'object' && site.wedding_data.meta?.createdAtISO
        ? site.wedding_data.meta.createdAtISO
        : now,
    updatedAtISO: now,
    useCasePacks: ['public-site', 'rsvp', 'travel', 'registry', 'day-of-proof'],
  },
};

const proofSiteJson = {
  ...(site.site_json && typeof site.site_json === 'object' ? site.site_json : {}),
  publishStatus: 'published',
  lastPublishedAt: now,
  publishedVersion: now,
  weddingDate: weddingDateISO,
  weddingData: proofWeddingData,
  weddingDataSnapshot: proofWeddingData,
  pages: Array.isArray(site.site_json?.pages)
    ? site.site_json.pages.map((page) => ({
        ...page,
        sections: Array.isArray(page.sections)
          ? page.sections.map((section) => {
              const settings = section.settings && typeof section.settings === 'object' ? section.settings : {};
              const base = { ...settings, showTitle: settings.showTitle ?? true };

              switch (section.type) {
                case 'hero':
                  return {
                    ...section,
                    settings: {
                      ...base,
                      title: 'Eric & Kara',
                      headline: 'Eric & Kara',
                      subtitle: 'Sunday, January 17, 2027 · Sayulita, Mexico',
                      backgroundImage: heroImageUrl,
                      heroImageUrl,
                      overlayOpacity: 0.35,
                    },
                  };
                case 'story':
                  return {
                    ...section,
                    settings: {
                      ...base,
                      title: 'Our Story',
                      storyText: proofWeddingData.couple.story,
                    },
                  };
                case 'venue':
                  return {
                    ...section,
                    settings: {
                      ...base,
                      title: 'Villa Amor Ocean Terrace',
                      showMap: false,
                      images: [{ id: 'proof-venue', url: heroImageUrl }],
                    },
                  };
                case 'schedule':
                  return { ...section, settings: { ...base, title: 'Weekend Schedule' } };
                case 'travel':
                  return { ...section, settings: { ...base, title: 'Travel & Stay' } };
                case 'rsvp':
                  return { ...section, settings: { ...base, title: 'RSVP', subtitle: 'Please reply by December 15.' } };
                case 'faq':
                  return { ...section, settings: { ...base, title: 'Questions' } };
                case 'gallery':
                  return {
                    ...section,
                    settings: {
                      ...base,
                      title: 'Weekend Preview',
                      images: proofWeddingData.media.gallery.map((image) => ({
                        id: image.id,
                        url: image.url,
                        alt: image.caption,
                        caption: image.caption,
                      })),
                      showCaptions: true,
                      enableLightbox: true,
                    },
                  };
                case 'registry':
                  return { ...section, settings: { ...base, title: 'Registry' } };
                default:
                  return section;
              }
            })
          : page.sections,
      }))
    : site.site_json?.pages,
  meta: {
    ...(site.site_json?.meta && typeof site.site_json.meta === 'object' ? site.site_json.meta : {}),
    updatedAtISO: now,
  },
};

const proofSiteUrl = site.site_url || `${targetSlug}.dayof.love`;

const { error: updateError } = await client
  .from('wedding_sites')
  .update({
    couple_name_1: 'Eric',
    couple_name_2: 'Kara',
    wedding_date: '2027-01-17',
    venue_name: 'Villa Amor Ocean Terrace',
    venue_location: 'Sayulita, Nayarit, Mexico',
    site_url: proofSiteUrl,
    hero_image_url: heroImageUrl,
    is_published: true,
    published_at: now,
    wedding_data: proofWeddingData,
    site_json: proofSiteJson,
    updated_at: now,
  })
  .eq('id', site.id)
  .eq('user_id', authData.user.id);

if (updateError) {
  fail('update_failed', updateError.message, { targetSlug });
}

console.log(
  JSON.stringify(
    {
      ok: true,
      slug: targetSlug,
      siteUrl: proofSiteUrl,
      siteId: `${site.id.slice(0, 8)}...`,
      updatedFields: [
        'public wedding_data',
        'site_json publish metadata',
        'couple/date/venue summary columns',
        'hero_image_url',
      ],
      note: 'Only the authenticated test owner site was updated.',
    },
    null,
    2,
  ),
);
