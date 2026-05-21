import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  VENDOR_ACCENT_OPTIONS,
  VENDOR_GALLERY_LAYOUT_OPTIONS,
  VENDOR_SECTION_IDS,
  createVendorProfile,
  generateVendorProfileDraft,
  normalizeVendorProfileCustomization,
  normalizeVendorTemplateId,
  type VendorAccentId,
  type VendorProfileCategoryFact,
  type VendorGalleryLayoutId,
  type VendorProfile,
  type VendorProfileDraft,
  type VendorSectionId,
  type VendorTemplateId,
} from '../lib/vendorProfiles';
import { useToast } from '../components/ui/Toast';
import { copyTextOrDownload } from '../lib/copyText';
import { getSafePublicEmailHref, getSafePublicImageUrl, getSafePublicInstagramUrl, getSafePublicWebUrl } from '../sections/publicLinks';
import { isVendorProfileCreationEnabled } from '../lib/vendorProfileLaunch';

function normalizeImageLines(input: string): string[] {
  return input
    .split(/\n|,/)
    .map((item) => getSafePublicImageUrl(item))
    .filter(Boolean)
    .filter((item, index, arr) => arr.indexOf(item) === index)
    .slice(0, 12);
}

function draftLinks(draft: VendorProfileDraft) {
  const instagramUrl = getSafePublicInstagramUrl(draft.instagram_url);
  const websiteUrl = getSafePublicWebUrl(draft.website_url);
  const pinterestUrl = typeof draft.source_payload?.pinterest_url === 'string' ? getSafePublicWebUrl(draft.source_payload.pinterest_url) : '';
  const tiktokUrl = typeof draft.source_payload?.tiktok_url === 'string' ? getSafePublicWebUrl(draft.source_payload.tiktok_url) : '';
  const facebookUrl = typeof draft.source_payload?.facebook_url === 'string' ? getSafePublicWebUrl(draft.source_payload.facebook_url) : '';
  const youtubeUrl = typeof draft.source_payload?.youtube_url === 'string' ? getSafePublicWebUrl(draft.source_payload.youtube_url) : '';

  return [
    instagramUrl ? { label: 'Instagram', href: instagramUrl } : null,
    websiteUrl ? { label: 'Website', href: websiteUrl } : null,
    pinterestUrl ? { label: 'Pinterest', href: pinterestUrl } : null,
    tiktokUrl ? { label: 'TikTok', href: tiktokUrl } : null,
    facebookUrl ? { label: 'Facebook', href: facebookUrl } : null,
    youtubeUrl ? { label: 'YouTube', href: youtubeUrl } : null,
  ].filter((item): item is { label: string; href: string } => Boolean(item));
}

const vendorTemplateOptions: Array<{ id: VendorTemplateId; name: string; detail: string }> = [
  { id: 'photography', name: 'Photography', detail: 'Photos, work samples, and clear ways to reply for photo and video teams.' },
  { id: 'floral', name: 'Florals and decor', detail: 'Texture, palette, setup moments, and notes for florists and decor studios.' },
  { id: 'venue', name: 'Venue', detail: 'Location photos, guest flow, capacity notes, and tour notes.' },
  { id: 'food', name: 'Food and drinks', detail: 'Menu notes, dinner style, tasting plan, and notes for food teams.' },
  { id: 'beauty', name: 'Beauty and getting ready', detail: 'Work photos, trial notes, and prep schedule for salons, beauty teams, and jewelry.' },
  { id: 'music', name: 'Music and sound', detail: 'Music samples, reception schedule, sound needs, and notes for bands, DJs, and performers.' },
  { id: 'planner', name: 'Planning help', detail: 'Planning notes, trust notes, schedule, and next steps.' },
  { id: 'travel', name: 'Travel and guest movement', detail: 'Routes, room blocks, shuttles, and guest movement notes for travel teams.' },
  { id: 'service', name: 'General help', detail: 'Simple notes for officiants, rentals, specialty teams, and wedding-day help.' },
];

const vendorSectionLabels: Record<VendorSectionId, string> = {
  proof: 'Notes',
  facts: 'Details',
  fit: 'Where + note',
  gallery: 'Photos',
  about: 'About',
  packages: 'What to know',
  testimonials: 'Couple notes',
  faq: 'Common questions',
  links: 'Links',
  inquiry: 'Send note',
};

type TemplateStarterCustomization = {
  cta_label?: string;
  service_area?: string;
  pricing_note?: string;
  proof_points?: string[];
  category_facts?: VendorProfileCategoryFact[];
  packages?: Array<{ title: string; detail: string; price?: string | null }>;
  faqs?: Array<{ question: string; answer: string }>;
  inquiry_questions?: string[];
};

const vendorTemplateStarterCustomizations: Partial<Record<VendorTemplateId, TemplateStarterCustomization>> = {
  photography: {
    cta_label: 'Send note about the date',
    service_area: 'Local and destination wedding days',
    pricing_note: 'Add time, events, travel, and final file notes.',
    proof_points: ['Documentary eye', 'Schedule calm', 'Early photos'],
    category_facts: [
      { label: 'Style', value: 'Documentary photos with a clean finish', group: 'style' },
      { label: 'Day plan', value: 'Wedding day and weekend events', group: 'service' },
      { label: 'Final files', value: 'Online gallery, print rights, and early photos', group: 'service' },
      { label: 'Second photographer', value: 'Helpful for larger wedding days', group: 'logistics' },
      { label: 'Turnaround', value: 'Early photos first, full gallery after editing', group: 'service' },
      { label: 'Travel', value: 'Local and destination weddings', group: 'logistics' },
    ],
    packages: [
      { title: 'Wedding day photos', detail: 'Photo time, schedule help, early photos, and an online gallery.', price: 'Start' },
      { title: 'Weekend story', detail: 'Welcome party, rehearsal, wedding day, and next morning photos.', price: 'Event count' },
    ],
    faqs: [
      { question: 'Do you help with the photo schedule?', answer: 'Yes. Schedule notes and family photo pacing can be planned before the wedding day.' },
      { question: 'Can we add an engagement session?', answer: 'Engagement sessions are possible when the schedule and location make sense.' },
    ],
    inquiry_questions: ['Wedding date', 'Venue or location', 'Photo needs'],
  },
  floral: {
    cta_label: 'Send note about florals',
    service_area: 'Ceremony, reception, and installation floral design',
    pricing_note: 'Add season, install, rental, and wrap up notes.',
    proof_points: ['Seasonal palette', 'Install plan', 'Rental plan'],
    category_facts: [
      { label: 'Install plan', value: 'Personal flowers, ceremony pieces, bars, lounges, and tables', group: 'service' },
      { label: 'Palette', value: 'Seasonal color direction built from venue and attire', group: 'style' },
      { label: 'Repurposing', value: 'Ceremony flowers can be planned for reception reuse', group: 'logistics' },
      { label: 'Rentals', value: 'Vessels, candles, and tabletop details can be planned', group: 'service' },
      { label: 'Wrap up', value: 'Breakdown and rental returns can be part of the plan', group: 'logistics' },
      { label: 'Good when', value: 'A clear visual direction is already forming', group: 'overview' },
    ],
    packages: [
      { title: 'Ceremony flowers', detail: 'Aisle, altar, personal flowers, wrap up notes, and repurpose plan.', price: 'Start' },
      { title: 'Reception design', detail: 'Tablescape flowers, candles, bars, lounges, and delivery schedule.', price: 'Guest count' },
    ],
    faqs: [
      { question: 'Can you work from a color palette?', answer: 'Yes. Inspiration, venue photos, seasonality, and attire can shape the floral direction.' },
      { question: 'Do you handle setup and breakdown?', answer: 'Setup, wrap up, and rental planning can be part of the floral details.' },
    ],
    inquiry_questions: ['Guest count', 'Color palette', 'Install moments'],
  },
  venue: {
    cta_label: 'Send note about a tour',
    service_area: 'Ceremony, cocktail hour, reception, and rain plan flow',
    pricing_note: 'Add season, guest count, and weekend plan notes.',
    proof_points: ['Guest flow', 'Rain plan notes', 'Setup plan'],
    category_facts: [
      { label: 'Capacity', value: 'Add seated and standing guest count', group: 'overview' },
      { label: 'Ceremony', value: 'Outdoor setting with indoor backup option', group: 'service' },
      { label: 'Reception', value: 'Indoor room, tented lawn, or flexible layout', group: 'service' },
      { label: 'Rain plan', value: 'Backup flow to talk through early', group: 'logistics' },
      { label: 'Parking', value: 'Guest parking and setup plan', group: 'logistics' },
      { label: 'House notes', value: 'Curfew, catering, and decor notes to confirm', group: 'policy' },
    ],
    packages: [
      { title: 'Site walkthrough', detail: 'Walk ceremony, cocktail, dinner, and rain plan spaces with the venue team.', price: 'Tour' },
      { title: 'Wedding weekend plans', detail: 'Site use, setup windows, guest flow, and property schedule planned together.', price: 'Season' },
    ],
    faqs: [
      { question: 'Is there an indoor backup plan?', answer: 'Talk through the backup flow by guest count, season, and ceremony location.' },
      { question: 'Can teams set up early?', answer: 'Setup windows should be planned with the venue team by event notes.' },
    ],
    inquiry_questions: ['Guest count', 'Preferred season', 'Indoor or outdoor priorities'],
  },
  food: {
    cta_label: 'Send note about tasting',
    service_area: 'Cocktail hour, dinner, dessert, bar, and late night plans',
    pricing_note: 'Add guest count, dinner style, rental, and team notes.',
    proof_points: ['Seasonal menu', 'Dinner team', 'Bar plan'],
    category_facts: [
      { label: 'Dinner style', value: 'Plated, family style, stations, or cocktail reception', group: 'service' },
      { label: 'Tastings', value: 'Tasting can follow the first message', group: 'service' },
      { label: 'Bar', value: 'Bar team and batch cocktails', group: 'service' },
      { label: 'Dietary needs', value: 'Vegetarian, vegan, gluten-free, and allergy notes', group: 'policy' },
      { label: 'Rentals', value: 'Tabletop rentals can be planned', group: 'logistics' },
      { label: 'Late night', value: 'Snack, coffee, and dessert options', group: 'service' },
    ],
    packages: [
      { title: 'Cocktail and dinner', detail: 'Passed bites, dinner, dessert schedule, and team plan.', price: 'Guest count' },
      { title: 'Bar and late night', detail: 'Bar team, batch cocktails, coffee, and late night snacks.', price: 'Add later' },
    ],
    faqs: [
      { question: 'Can you handle dietary notes?', answer: 'Dietary notes are collected during menu planning and checked before counts are final.' },
      { question: 'Do you handle rentals?', answer: 'Rental planning can be included alongside menu and team needs.' },
    ],
    inquiry_questions: ['Guest count', 'Dinner style', 'Dietary needs'],
  },
  beauty: {
    cta_label: 'Send note about the morning',
    service_area: 'On-site wedding hair, makeup, trials, and touchups',
    pricing_note: 'Add party size, start time, travel, and touchup notes.',
    proof_points: ['Trial plan', 'Wedding morning', 'Party schedule'],
    category_facts: [
      { label: 'Trial', value: 'Trial appointment can be scheduled before final look', group: 'service' },
      { label: 'Party size', value: 'Add number of looks and artists needed', group: 'logistics' },
      { label: 'Travel', value: 'On-site prep location and parking needed', group: 'logistics' },
      { label: 'Schedule', value: 'Start time depends on party size and photo schedule', group: 'logistics' },
      { label: 'Touchups', value: 'Optional ceremony or reception touchups', group: 'service' },
      { label: 'Good when', value: 'The wedding morning needs a clear schedule', group: 'overview' },
    ],
    packages: [
      { title: 'Wedding morning', detail: 'Hair, makeup, schedule planning, and on site setup for the wedding party.', price: 'Party size' },
      { title: 'Trial and touchups', detail: 'Pre wedding trial plus optional ceremony or reception touchups.', price: 'Add later' },
    ],
    faqs: [
      { question: 'Do you travel on site?', answer: 'Share prep address, parking, setup space, and start time before deciding.' },
      { question: 'How many artists do we need?', answer: 'Artist count depends on party size, hair and makeup needs, and the photo schedule.' },
    ],
    inquiry_questions: ['Party size', 'Prep location', 'Trial schedule'],
  },
  music: {
    cta_label: 'Hear a set',
    service_area: 'Ceremony, cocktail hour, reception, and after party sound',
    pricing_note: 'Add set length, sound, lighting, and announcement notes.',
    proof_points: ['Ceremony cues', 'Reception energy', 'Clean transitions'],
    category_facts: [
      { label: 'Event moments', value: 'Ceremony, cocktail hour, reception, or after party', group: 'service' },
      { label: 'Emcee', value: 'Announcements and reception flow', group: 'service' },
      { label: 'Sound', value: 'Plan power, setup access, ceremony audio, and backup needs', group: 'logistics' },
      { label: 'Lighting', value: 'Dance floor lighting is available when needed', group: 'service' },
      { label: 'Playlist', value: 'Must play and do not play notes welcome', group: 'style' },
      { label: 'Insurance', value: 'Venue insurance notes should be confirmed', group: 'policy' },
    ],
    packages: [
      { title: 'Reception set', detail: 'Dinner, dancing, announcements, and reception sound.', price: 'Start' },
      { title: 'Ceremony and cocktail hour', detail: 'Ceremony cues, microphones, cocktail music, and transition schedule.', price: 'Add later' },
    ],
    faqs: [
      { question: 'Can we share do not play songs?', answer: 'Yes. Must play and do not play notes can be part of planning.' },
      { question: 'Do you provide ceremony sound?', answer: 'Ceremony audio can be part of the plan when power, location, and mic needs are clear.' },
    ],
    inquiry_questions: ['Event spaces', 'Music style', 'Sound needs'],
  },
  planner: {
    cta_label: 'Send note about planning',
    service_area: 'Planning, visual direction, schedules, team notes, and wedding week help',
    pricing_note: 'Add event count, guest count, moving pieces, and planning stage.',
    proof_points: ['Weekend flow', 'Team notes', 'Guest calm'],
    category_facts: [
      { label: 'Planning help', value: 'Full planning, partial planning, or wedding management', group: 'service' },
      { label: 'Design', value: 'Visual direction, rentals, stationery, and guest experience', group: 'style' },
      { label: 'Team map', value: 'Search, schedules, team notes, and handoffs', group: 'logistics' },
      { label: 'Wedding week', value: 'Final notes and final schedule', group: 'service' },
      { label: 'Good when', value: 'Planning help, team notes, and wedding week handoffs matter', group: 'overview' },
      { label: 'Planning stage', value: 'Share what is already decided before the first message', group: 'logistics' },
    ],
    packages: [
      { title: 'Planning call', detail: 'Talk through planning stage, team map, guest count, and weekend moving pieces.', price: 'Start' },
      { title: 'Wedding management', detail: 'Schedule, team communication, rehearsal, and wedding day help.', price: 'Scope' },
    ],
    faqs: [
      { question: 'Can you join midway through planning?', answer: 'Yes. Share booked teams, contracts, guest count, and open decisions.' },
      { question: 'Do you help with visual direction?', answer: 'Visual direction can be planned with rentals, stationery, floor plans, and guest flow.' },
    ],
    inquiry_questions: ['Planning stage', 'Guest count', 'Confirmed teams'],
  },
  travel: {
    cta_label: 'Plan transportation',
    service_area: 'Guest shuttles, room blocks, pickup windows, and weekend movement',
    pricing_note: 'Add guest count, routes, schedule, and vehicle needs.',
    proof_points: ['Pickup windows', 'Guest movement', 'Day of contact'],
    category_facts: [
      { label: 'Routes', value: 'Hotel, ceremony, reception, after party, or airport routes', group: 'service' },
      { label: 'Vehicles', value: 'Shuttles, sprinters, cars, or accessible vehicles', group: 'service' },
      { label: 'Schedule', value: 'Pickup windows tied to ceremony and reception flow', group: 'logistics' },
      { label: 'Guest count', value: 'Passenger count and lodging map help', group: 'logistics' },
      { label: 'Day-of contact', value: 'A point person is helpful', group: 'logistics' },
      { label: 'Accessibility', value: 'Note accessible vehicle needs early', group: 'policy' },
    ],
    packages: [
      { title: 'Guest shuttle plan', detail: 'Hotel pickup, ceremony/reception movement, return trips, and schedule notes.', price: 'Route' },
      { title: 'Weekend travel plan', detail: 'Airport, welcome event, after party, and next day guest movement.', price: 'Add later' },
    ],
    faqs: [
      { question: 'What should we send first?', answer: 'Guest count, hotel list, ceremony time, reception end time, and pickup locations.' },
      { question: 'Can you handle accessible transportation?', answer: 'Accessible vehicle needs should be shared early so the right fleet can be planned.' },
    ],
    inquiry_questions: ['Guest count', 'Hotel map', 'Pickup windows'],
  },
  service: {
    cta_label: 'Send note about the date',
    service_area: 'Specialty wedding help, rentals, officiants, and practical day-of needs',
    pricing_note: 'Add date, location, setup notes, and moving pieces.',
    proof_points: ['Clear ways to reply', 'Setup needs', 'Day-of help'],
    category_facts: [
      { label: 'Date and schedule', value: 'Share date, location, and schedule notes', group: 'overview' },
      { label: 'Setup', value: 'Power, access, schedule, and setup notes', group: 'logistics' },
      { label: 'Schedule', value: 'Arrival, main time, wrap up, and backup plan', group: 'service' },
      { label: 'Venue notes', value: 'Insurance, power, access, and placement notes to confirm', group: 'policy' },
      { label: 'Good when', value: 'The need is clear and schedule or setup notes are known', group: 'overview' },
      { label: 'Ways to reply', value: 'Share date, venue, guest count, and what you need', group: 'service' },
    ],
    packages: [
      { title: 'Date and schedule', detail: 'Share date, location, setup notes, and schedule.', price: 'Note' },
      { title: 'Wedding day help', detail: 'Arrival time, setup, main time, and wrap up plan.', price: 'Need' },
    ],
    faqs: [
      { question: 'What should we send first?', answer: 'Share the date, venue, schedule, guest count, and what you need.' },
      { question: 'Do you work with the venue?', answer: 'Venue access, setup, insurance, and power notes should be confirmed before final plans.' },
    ],
    inquiry_questions: ['Wedding date', 'Venue', 'Schedule needs'],
  },
};

const vendorTemplateStarterCustomizationValues = Object.values(vendorTemplateStarterCustomizations)
  .filter((starter): starter is TemplateStarterCustomization => Boolean(starter));

type StarterTextKey = 'cta_label' | 'service_area' | 'pricing_note';
type StarterArrayKey = 'proof_points' | 'category_facts' | 'packages' | 'faqs' | 'inquiry_questions';
type NormalizedVendorCustomization = ReturnType<typeof normalizeVendorProfileCustomization>;

function sameStarterValue(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function isEmptyOrStarterText(value: string | null, key: StarterTextKey): boolean {
  if (!value) return true;
  return vendorTemplateStarterCustomizationValues.some((starter) => starter[key] === value);
}

function isEmptyOrStarterArray(value: unknown[], key: StarterArrayKey): boolean {
  if (value.length === 0) return true;
  return vendorTemplateStarterCustomizationValues.some((starter) => sameStarterValue(value, starter[key] ?? []));
}

function normalizeCreateTemplateId(value: unknown): VendorTemplateId {
  const templateId = normalizeVendorTemplateId(value);
  return vendorTemplateOptions.some((option) => option.id === templateId) ? templateId : 'photography';
}

function applyTemplateStarterCustomization(draft: VendorProfileDraft, templateId: VendorTemplateId): VendorProfileDraft {
  const starter = vendorTemplateStarterCustomizations[templateId] ?? {};
  const current = normalizeVendorProfileCustomization({
    ...draft.source_payload,
    template_id: templateId,
  });

  return {
    ...draft,
    source_payload: {
      ...draft.source_payload,
      template_id: templateId,
      vendor_customization: {
        ...current,
        cta_label: isEmptyOrStarterText(current.cta_label, 'cta_label') ? starter.cta_label ?? null : current.cta_label,
        service_area: isEmptyOrStarterText(current.service_area, 'service_area') ? starter.service_area ?? null : current.service_area,
        pricing_note: isEmptyOrStarterText(current.pricing_note, 'pricing_note') ? starter.pricing_note ?? null : current.pricing_note,
        proof_points: isEmptyOrStarterArray(current.proof_points, 'proof_points') ? starter.proof_points ?? [] : current.proof_points,
        category_facts: isEmptyOrStarterArray(current.category_facts, 'category_facts') ? starter.category_facts ?? [] : current.category_facts,
        packages: isEmptyOrStarterArray(current.packages, 'packages') ? starter.packages ?? [] : current.packages,
        faqs: isEmptyOrStarterArray(current.faqs, 'faqs') ? starter.faqs ?? [] : current.faqs,
        inquiry_questions: isEmptyOrStarterArray(current.inquiry_questions, 'inquiry_questions') ? starter.inquiry_questions ?? [] : current.inquiry_questions,
        rating: current.rating,
        external_credibility: current.external_credibility,
      },
    },
  };
}

function getDraftTemplateId(draft: VendorProfileDraft): VendorTemplateId {
  return normalizeVendorTemplateId(draft.source_payload?.template_id);
}

function getStarterDetailLabels(
  customization: NormalizedVendorCustomization,
  templateId: VendorTemplateId,
): string[] {
  const starter = vendorTemplateStarterCustomizations[templateId];
  if (!starter) return [];

  const labels: string[] = [];
  if (starter.cta_label && customization.cta_label === starter.cta_label) labels.push('send button');
  if (starter.service_area && customization.service_area === starter.service_area) labels.push('where they work');
  if (starter.pricing_note && customization.pricing_note === starter.pricing_note) labels.push('note');
  if (sameStarterValue(customization.proof_points, starter.proof_points ?? [])) labels.push('notes');
  if (sameStarterValue(customization.category_facts, starter.category_facts ?? [])) labels.push('details');
  if (sameStarterValue(customization.packages, starter.packages ?? [])) labels.push('what to know');
  if (sameStarterValue(customization.faqs, starter.faqs ?? [])) labels.push('common questions');
  if (sameStarterValue(customization.inquiry_questions, starter.inquiry_questions ?? [])) labels.push('questions for couples');

  return labels;
}

function withTemplateId(draft: VendorProfileDraft, templateId: VendorTemplateId): VendorProfileDraft {
  return applyTemplateStarterCustomization(draft, templateId);
}

function updateDraftCustomization(
  draft: VendorProfileDraft,
  patch: Partial<{
    accent_id: VendorAccentId;
    gallery_layout: VendorGalleryLayoutId;
    logo_text: string;
    cta_label: string;
    service_area: string;
    pricing_note: string;
    proof_points: string[];
    category_facts: VendorProfileCategoryFact[];
    section_order: VendorSectionId[];
    hidden_sections: VendorSectionId[];
    packages: Array<{ title: string; detail: string; price?: string | null }>;
    faqs: Array<{ question: string; answer: string }>;
    testimonials: Array<{ quote: string; attribution?: string | null }>;
    inquiry_questions: string[];
    external_credibility: {
      enabled?: boolean;
      source_label?: string | null;
      rating?: number | string | null;
      review_count?: number | string | null;
      profile_url?: string | null;
      place_id?: string | null;
      last_synced_at?: string | null;
    };
    rating: {
      enabled?: boolean;
      overall_score?: number | string | null;
      summary?: string | null;
      categories?: Array<{ label: string; score: number | string }>;
    };
  }>,
): VendorProfileDraft {
  const current = normalizeVendorProfileCustomization(draft.source_payload);
  return {
    ...draft,
    source_payload: {
      ...draft.source_payload,
      vendor_customization: {
        ...current,
        ...patch,
      },
    },
  };
}

function updateArrayItem<T>(items: T[], index: number, patch: Partial<T>, fallback: T): T[] {
  const next = [...items];
  next[index] = { ...(next[index] ?? fallback), ...patch };
  return next;
}

function readRawCustomizationArray<T>(draft: VendorProfileDraft, key: string): T[] {
  const rawCustomization = draft.source_payload.vendor_customization;
  if (!rawCustomization || typeof rawCustomization !== 'object' || Array.isArray(rawCustomization)) return [];
  const value = (rawCustomization as Record<string, unknown>)[key];
  return Array.isArray(value) ? value as T[] : [];
}

function sanitizeDraftForPublish(draft: VendorProfileDraft): VendorProfileDraft {
  const customization = normalizeVendorProfileCustomization(draft.source_payload);
  return {
    ...draft,
    hero_image_url: getSafePublicImageUrl(draft.hero_image_url) || null,
    image_urls: draft.image_urls.map((image) => getSafePublicImageUrl(image)).filter(Boolean),
    instagram_url: getSafePublicInstagramUrl(draft.instagram_url) || null,
    website_url: getSafePublicWebUrl(draft.website_url) || null,
    contact_email: getSafePublicEmailHref(draft.contact_email) ? draft.contact_email : null,
    source_payload: {
      ...draft.source_payload,
      vendor_customization: customization,
      pinterest_url: typeof draft.source_payload?.pinterest_url === 'string' ? getSafePublicWebUrl(draft.source_payload.pinterest_url) || null : null,
      tiktok_url: typeof draft.source_payload?.tiktok_url === 'string' ? getSafePublicWebUrl(draft.source_payload.tiktok_url) || null : null,
      facebook_url: typeof draft.source_payload?.facebook_url === 'string' ? getSafePublicWebUrl(draft.source_payload.facebook_url) || null : null,
      youtube_url: typeof draft.source_payload?.youtube_url === 'string' ? getSafePublicWebUrl(draft.source_payload.youtube_url) || null : null,
    },
  };
}

function buildInitialVendorProfileCreateForm(searchParams: URLSearchParams) {
  return {
    vendorName: searchParams.get('vendorName') ?? '',
    instagramUrl: searchParams.get('instagramUrl') ?? '',
    websiteUrl: searchParams.get('websiteUrl') ?? '',
    pinterestUrl: searchParams.get('pinterestUrl') ?? '',
    tiktokUrl: searchParams.get('tiktokUrl') ?? '',
    facebookUrl: searchParams.get('facebookUrl') ?? '',
    youtubeUrl: searchParams.get('youtubeUrl') ?? '',
    contactEmail: searchParams.get('contactEmail') ?? '',
    templateId: normalizeCreateTemplateId(searchParams.get('template')),
  };
}

function buildDraftReviewItems(
  draft: VendorProfileDraft,
  customization: ReturnType<typeof normalizeVendorProfileCustomization>,
  safeImages: string[],
): Array<{ label: string; detail: string; ready: boolean }> {
  const links = draftLinks(draft);
  const hasContactPath = links.length > 0 || Boolean(draft.contact_email);
  const hasUsefulDetails = customization.proof_points.length > 0
    || customization.category_facts.length > 0
    || customization.packages.length > 0
    || customization.faqs.length > 0
    || customization.inquiry_questions.length > 0;

  return [
    {
      label: 'Name and link',
      detail: draft.vendor_name.trim() && draft.slug.trim() ? `/${draft.slug}` : 'Add the name and page link.',
      ready: Boolean(draft.vendor_name.trim() && draft.slug.trim()),
    },
    {
      label: 'Photos',
      detail: safeImages.length > 0 ? `${safeImages.length} photo${safeImages.length === 1 ? '' : 's'} ready.` : 'Add at least one photo when you have one.',
      ready: safeImages.length > 0,
    },
    {
      label: 'About',
      detail: draft.about.trim().length >= 40 ? 'Description ready.' : 'Add a short plain description.',
      ready: draft.about.trim().length >= 40,
    },
    {
      label: 'Ways to reply',
      detail: hasContactPath ? 'Ways to reply ready.' : 'Add a website, social link, or email.',
      ready: hasContactPath,
    },
    {
      label: 'Notes',
      detail: hasUsefulDetails ? 'Details, what to know, questions, or notes ready.' : 'Add at least one detail, note, or thing to know.',
      ready: hasUsefulDetails,
    },
  ];
}

export const VendorProfileCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const creationEnabled = isVendorProfileCreationEnabled();
  const [form, setForm] = useState(() => buildInitialVendorProfileCreateForm(searchParams));
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState<VendorProfileDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [copyingLiveUrl, setCopyingLiveUrl] = useState(false);
  const [liveUrlNotice, setLiveUrlNotice] = useState<'copied' | 'downloaded' | null>(null);
  const [imageEditor, setImageEditor] = useState('');
  const [createdProfile, setCreatedProfile] = useState<VendorProfile | null>(null);
  const draftCustomization = draft ? normalizeVendorProfileCustomization(draft.source_payload) : null;
  const draftSafeImages = draft
    ? [draft.hero_image_url, ...(draft.image_urls || [])].map((image) => getSafePublicImageUrl(image)).filter((image): image is string => Boolean(image))
    : [];
  const draftExtraImageCount = Math.max(0, draftSafeImages.length - 6);
  const draftSectionEnabled = (sectionId: VendorSectionId) => !draftCustomization?.hidden_sections.includes(sectionId);
  const draftReviewItems = draft && draftCustomization ? buildDraftReviewItems(draft, draftCustomization, draftSafeImages) : [];
  const draftReviewReadyCount = draftReviewItems.filter((item) => item.ready).length;
  const draftMissingReviewItems = draftReviewItems.filter((item) => !item.ready);
  const draftStarterDetailLabels = draft && draftCustomization ? getStarterDetailLabels(draftCustomization, getDraftTemplateId(draft)) : [];
  const liveUrlNoticeTimeoutRef = useRef<number | null>(null);
  const liveUrlCopyRequestIdRef = useRef(0);

  useEffect(() => {
    const nextForm = buildInitialVendorProfileCreateForm(searchParams);
    setForm(nextForm);
    setLoading(false);
    setDraft(null);
    setSaving(false);
    setCopyingLiveUrl(false);
    setLiveUrlNotice(null);
    setImageEditor('');
    setCreatedProfile(null);
    liveUrlCopyRequestIdRef.current += 1;
    if (liveUrlNoticeTimeoutRef.current) window.clearTimeout(liveUrlNoticeTimeoutRef.current);
  }, [searchParams]);

  useEffect(() => {
    if (!createdProfile && !liveUrlNotice) return;
    setCreatedProfile(null);
    setLiveUrlNotice(null);
    liveUrlCopyRequestIdRef.current += 1;
  }, [form, draft]);

  useEffect(() => () => {
    liveUrlCopyRequestIdRef.current += 1;
    if (liveUrlNoticeTimeoutRef.current) window.clearTimeout(liveUrlNoticeTimeoutRef.current);
  }, []);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const nextDraft = await generateVendorProfileDraft(form);
      const next = withTemplateId({ ...nextDraft, contact_email: form.contactEmail.trim() || nextDraft.contact_email }, form.templateId);
      setDraft(next);
      setCreatedProfile(null);
      setImageEditor([next.hero_image_url, ...next.image_urls].filter(Boolean).join('\n'));
      toast('Page made.', 'success');
    } catch {
      toast('Couldn’t make that page yet.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async () => {
    if (!draft) return;
    try {
      setSaving(true);
      const created = await createVendorProfile(sanitizeDraftForPublish(draft));
      setCreatedProfile(created);
      toast('Saved.', 'success');
    } catch {
      toast('Couldn’t save that page yet.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleCopyLiveUrl = async () => {
    if (!createdProfile || copyingLiveUrl) return;
    const requestId = ++liveUrlCopyRequestIdRef.current;
    const requestSlug = createdProfile.slug;
    const isCurrentLiveUrlCopy = () => (
      requestId === liveUrlCopyRequestIdRef.current &&
      createdProfile?.slug === requestSlug
    );
    const url = `${window.location.origin}/vendor/${createdProfile.slug}`;
    try {
      setCopyingLiveUrl(true);
      setLiveUrlNotice(null);
      const result = await copyTextOrDownload(url, 'dayof-vendor-page-url.txt');
      if (!isCurrentLiveUrlCopy()) return;
      if (result === 'copied') {
        setLiveUrlNotice('copied');
        toast('Link copied.', 'success');
      } else {
        setLiveUrlNotice('downloaded');
        toast('The link was saved.', 'success');
      }
      if (liveUrlNoticeTimeoutRef.current) window.clearTimeout(liveUrlNoticeTimeoutRef.current);
      liveUrlNoticeTimeoutRef.current = window.setTimeout(() => setLiveUrlNotice((current) => (current === result ? null : current)), 1800);
    } catch {
      if (!isCurrentLiveUrlCopy()) return;
      toast('Couldn’t copy the link right now.', 'error');
    } finally {
      if (isCurrentLiveUrlCopy()) {
        setCopyingLiveUrl(false);
      }
    }
  };

  if (!creationEnabled) {
    return (
      <div className="min-h-screen bg-[#f6f1ea] px-4 py-8 text-[#2f261d] sm:px-6">
        <div className="mx-auto max-w-3xl space-y-5 rounded-xl bg-white p-6 shadow-sm sm:p-8">
          <p className="text-xs font-semibold text-[#8b6f53]">Vendor page</p>
          <h1 className="text-3xl font-semibold">Editing is off for now</h1>
          <p className="text-sm leading-6 text-[#6f5843]">
            Example pages are still here. Keep sharing off until the page feels right.
          </p>
          <Link to="/vendor-templates" className="inline-flex rounded-xl bg-[#2f261d] px-4 py-2 text-sm font-semibold text-white">
            See example pages
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f6f1ea] text-[#2f261d] px-4 py-8 sm:px-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="space-y-2">
          <p className="text-xs font-semibold text-[#8b6f53]">Vendor page</p>
          <h1 className="text-3xl sm:text-5xl font-semibold">Start a page</h1>
          <p className="text-[#6f5843] max-w-2xl">Add a name, ways to reply, and notes before you save.</p>
          <Link to="/vendor-templates" className="inline-flex text-sm font-semibold text-[#6f5843] underline underline-offset-4">
            See example pages
          </Link>
        </div>

        <form onSubmit={handleGenerate} className="rounded-xl bg-white p-6 sm:p-8 shadow-sm space-y-4" aria-busy={loading}>
          <div>
            <label htmlFor="vendor-create-name" className="mb-1 block text-sm font-semibold text-[#4b3a2c]">Name</label>
            <input id="vendor-create-name" value={form.vendorName} onChange={(e) => setForm((prev) => ({ ...prev, vendorName: e.target.value }))} placeholder="Name" className="w-full rounded-xl border border-[#eadfce] px-4 py-3 outline-none" required />
          </div>
          <div>
            <label htmlFor="vendor-create-instagram" className="mb-1 block text-sm font-semibold text-[#4b3a2c]">Instagram link</label>
            <input id="vendor-create-instagram" value={form.instagramUrl} onChange={(e) => setForm((prev) => ({ ...prev, instagramUrl: e.target.value }))} placeholder="Instagram link" className="w-full rounded-xl border border-[#eadfce] px-4 py-3 outline-none" />
          </div>
          <div>
            <label htmlFor="vendor-create-website" className="mb-1 block text-sm font-semibold text-[#4b3a2c]">Website link</label>
            <input id="vendor-create-website" value={form.websiteUrl} onChange={(e) => setForm((prev) => ({ ...prev, websiteUrl: e.target.value }))} placeholder="Website link" className="w-full rounded-xl border border-[#eadfce] px-4 py-3 outline-none" />
          </div>
          <details className="rounded-xl border border-[#eadfce] bg-[#fffaf3] p-4">
            <summary className="cursor-pointer text-sm font-semibold text-[#4b3a2c]">More places</summary>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="vendor-create-pinterest" className="mb-1 block text-sm font-semibold text-[#4b3a2c]">Pinterest link</label>
                <input id="vendor-create-pinterest" value={form.pinterestUrl} onChange={(e) => setForm((prev) => ({ ...prev, pinterestUrl: e.target.value }))} placeholder="Pinterest link" className="w-full rounded-xl border border-[#eadfce] px-4 py-3 outline-none" />
              </div>
              <div>
                <label htmlFor="vendor-create-tiktok" className="mb-1 block text-sm font-semibold text-[#4b3a2c]">TikTok link</label>
                <input id="vendor-create-tiktok" value={form.tiktokUrl} onChange={(e) => setForm((prev) => ({ ...prev, tiktokUrl: e.target.value }))} placeholder="TikTok link" className="w-full rounded-xl border border-[#eadfce] px-4 py-3 outline-none" />
              </div>
              <div>
                <label htmlFor="vendor-create-facebook" className="mb-1 block text-sm font-semibold text-[#4b3a2c]">Facebook link</label>
                <input id="vendor-create-facebook" value={form.facebookUrl} onChange={(e) => setForm((prev) => ({ ...prev, facebookUrl: e.target.value }))} placeholder="Facebook link" className="w-full rounded-xl border border-[#eadfce] px-4 py-3 outline-none" />
              </div>
              <div>
                <label htmlFor="vendor-create-youtube" className="mb-1 block text-sm font-semibold text-[#4b3a2c]">YouTube link</label>
                <input id="vendor-create-youtube" value={form.youtubeUrl} onChange={(e) => setForm((prev) => ({ ...prev, youtubeUrl: e.target.value }))} placeholder="YouTube link" className="w-full rounded-xl border border-[#eadfce] px-4 py-3 outline-none" />
              </div>
            </div>
          </details>
          <div>
            <label htmlFor="vendor-create-contact-email" className="mb-1 block text-sm font-semibold text-[#4b3a2c]">Email</label>
            <input id="vendor-create-contact-email" type="email" value={form.contactEmail} onChange={(e) => setForm((prev) => ({ ...prev, contactEmail: e.target.value }))} placeholder="Email" className="w-full rounded-xl border border-[#eadfce] px-4 py-3 outline-none" />
          </div>
          <div>
            <label htmlFor="vendor-create-template" className="mb-2 block text-sm font-semibold text-[#4b3a2c]">Page style</label>
            <select
              id="vendor-create-template"
              value={form.templateId}
              onChange={(e) => setForm((prev) => ({ ...prev, templateId: normalizeVendorTemplateId(e.target.value) }))}
              className="w-full rounded-xl border border-[#eadfce] bg-white px-4 py-3 outline-none"
            >
              {vendorTemplateOptions.map((option) => (
                <option key={option.id} value={option.id}>{option.name}</option>
              ))}
            </select>
            <p className="mt-2 text-xs text-[#8b6f53]">
              {vendorTemplateOptions.find((option) => option.id === form.templateId)?.detail}
            </p>
          </div>
          <button disabled={loading} className="rounded-xl bg-[#2f261d] px-5 py-3 text-sm font-semibold text-white disabled:opacity-60">
            {loading ? 'Starting...' : 'Start'}
          </button>
        </form>

        {draft && (
          <div className="space-y-6">
          <div className="rounded-xl bg-white p-6 sm:p-8 shadow-sm space-y-4">
            <div>
              <p className="text-xs font-semibold text-[#8b6f53]">Working page</p>
              <h2 className="mt-2 text-2xl font-semibold">Edit</h2>
              <p className="mt-2 text-sm text-[#6f5843]">Edit the words, links, photos, and ways to reply before you save.</p>
              {typeof draft.source_payload?.sourceLabel === 'string' && (
                <p className="mt-3 text-xs font-medium text-[#8b6f53]">Started with: {draft.source_payload.sourceLabel}</p>
              )}
            </div>
            <div className="rounded-xl border border-[#eadfce] p-4 sm:p-5 space-y-3">
              <p className="text-xs font-semibold text-[#8b6f53]">Page style</p>
              <div className="grid gap-3 sm:grid-cols-3">
                {vendorTemplateOptions.map((option) => {
                  const selected = getDraftTemplateId(draft) === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setDraft((prev) => prev ? withTemplateId(prev, option.id) : prev)}
                      className={`rounded-xl border px-4 py-3 text-left transition ${selected ? 'border-[#2f261d] bg-[#2f261d] text-white' : 'border-[#eadfce] bg-white text-[#4b3a2c] hover:border-[#cbb395]'}`}
                    >
                      <span className="block text-sm font-semibold">{option.name}</span>
                      <span className={`mt-1 block text-xs leading-5 ${selected ? 'text-[#efe4d8]' : 'text-[#8b6f53]'}`}>{option.detail}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            {draftCustomization && (
              <div className="rounded-xl border border-[#eadfce] bg-[#fbf8f3] p-4 sm:p-5 space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold text-[#8b6f53]">Notes</p>
                    <h3 className="mt-2 text-xl font-semibold">{draft.vendor_name}</h3>
                    {draft.descriptor && <p className="mt-1 text-sm text-[#6f5843]">{draft.descriptor}</p>}
                  </div>
                  <span className="rounded-xl bg-[#2f261d] px-4 py-2 text-sm font-semibold text-white">
                    {draftCustomization.cta_label || 'Send note'}
                  </span>
                </div>
                {draftReviewItems.length > 0 && (
                  <div className="rounded-xl bg-white p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-[#8b6f53]">Details</p>
                      <span className="rounded-xl bg-[#f5e9db] px-3 py-1 text-xs font-semibold text-[#8b6f53]">
                        {draftReviewReadyCount}/{draftReviewItems.length} ready
                      </span>
                    </div>
                    {draftMissingReviewItems.length > 0 ? (
                      <p className="mt-2 text-xs leading-5 text-[#8b6f53]">
                        Add {draftMissingReviewItems.map((item) => item.label).join(', ')}
                      </p>
                    ) : (
                      <p className="mt-2 text-xs leading-5 text-[#8b6f53]">Details ready.</p>
                    )}
                    {draftStarterDetailLabels.length > 0 && (
                      <p className="mt-2 text-xs leading-5 text-[#8b6f53]">
                        Starter notes: {draftStarterDetailLabels.join(', ')}
                      </p>
                    )}
                  </div>
                )}
                {draftSectionEnabled('fit') && (draftCustomization.service_area || draftCustomization.pricing_note) && (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {draftCustomization.service_area && (
                      <div className="rounded-xl bg-white p-3">
                        <p className="text-xs font-semibold text-[#8b6f53]">Where they work</p>
                        <p className="mt-1 text-sm font-semibold text-[#4b3a2c]">{draftCustomization.service_area}</p>
                      </div>
                    )}
                    {draftCustomization.pricing_note && (
                      <div className="rounded-xl bg-white p-3">
                        <p className="text-xs font-semibold text-[#8b6f53]">Note</p>
                        <p className="mt-1 text-sm font-semibold text-[#4b3a2c]">{draftCustomization.pricing_note}</p>
                      </div>
                    )}
                  </div>
                )}
                {draftSectionEnabled('facts') && draftCustomization.category_facts.length > 0 && (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {draftCustomization.category_facts.slice(0, 4).map((fact) => (
                      <div key={`${fact.label}-${fact.value}`} className="rounded-xl bg-white p-3">
                        <p className="text-xs font-semibold text-[#8b6f53]">{fact.label}</p>
                        <p className="mt-1 text-sm text-[#4b3a2c]">{fact.value}</p>
                      </div>
                    ))}
                  </div>
                )}
                {draftSectionEnabled('packages') && draftCustomization.packages.length > 0 && (
                  <div className="rounded-xl bg-white p-3">
                    <p className="text-xs font-semibold text-[#8b6f53]">What to know</p>
                    <div className="mt-2 grid gap-2">
                      {draftCustomization.packages.slice(0, 2).map((item) => (
                        <p key={`${item.title}-${item.detail}`} className="text-sm text-[#4b3a2c]">
                          <span className="font-semibold">{item.title}</span>
                          {item.price ? ` - ${item.price}` : ''}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
                {draftSectionEnabled('inquiry') && draftCustomization.inquiry_questions.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {draftCustomization.inquiry_questions.map((item) => (
                      <span key={item} className="rounded-xl bg-white px-3 py-1 text-xs font-semibold text-[#8b6f53]">{item}</span>
                    ))}
                  </div>
                )}
              </div>
            )}
            {draftCustomization && (
              <div className="rounded-xl border border-[#eadfce] bg-[#fffaf3] p-4 sm:p-5 space-y-4">
                <div>
                  <p className="text-xs font-semibold text-[#8b6f53]">Notes</p>
                  <h3 className="mt-2 text-lg font-semibold">Edit notes</h3>
                  <p className="mt-1 text-sm text-[#6f5843]">Keep notes short and useful. The page should feel calm.</p>
                </div>
                <div>
                  <label htmlFor="vendor-draft-accent" className="mb-2 block text-sm font-semibold text-[#4b3a2c]">Color</label>
                  <select
                    id="vendor-draft-accent"
                    value={draftCustomization.accent_id}
                    onChange={(e) => setDraft((prev) => prev ? updateDraftCustomization(prev, { accent_id: e.target.value as VendorAccentId }) : prev)}
                    className="w-full rounded-xl border border-[#eadfce] bg-white px-4 py-3 outline-none"
                  >
                    {VENDOR_ACCENT_OPTIONS.map((option) => (
                      <option key={option.id} value={option.id}>{option.name}</option>
                    ))}
                  </select>
                  <p className="mt-2 text-xs text-[#8b6f53]">
                    {VENDOR_ACCENT_OPTIONS.find((option) => option.id === draftCustomization.accent_id)?.detail}
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label htmlFor="vendor-draft-logo" className="mb-1 block text-sm font-semibold text-[#4b3a2c]">Initials</label>
                    <input
                      id="vendor-draft-logo"
                      value={draftCustomization.logo_text ?? ''}
                      onChange={(e) => setDraft((prev) => prev ? updateDraftCustomization(prev, { logo_text: e.target.value }) : prev)}
                      placeholder="MFH"
                      className="w-full rounded-xl border border-[#eadfce] bg-white px-4 py-3 text-sm outline-none"
                    />
                  </div>
                  <div>
                    <label htmlFor="vendor-draft-gallery-layout" className="mb-1 block text-sm font-semibold text-[#4b3a2c]">Photo style</label>
                    <select
                      id="vendor-draft-gallery-layout"
                      value={draftCustomization.gallery_layout}
                      onChange={(e) => setDraft((prev) => prev ? updateDraftCustomization(prev, { gallery_layout: e.target.value as VendorGalleryLayoutId }) : prev)}
                      className="w-full rounded-xl border border-[#eadfce] bg-white px-4 py-3 text-sm outline-none"
                    >
                      {VENDOR_GALLERY_LAYOUT_OPTIONS.map((option) => (
                        <option key={option.id} value={option.id}>{option.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label htmlFor="vendor-draft-cta-label" className="mb-1 block text-sm font-semibold text-[#4b3a2c]">Send button</label>
                    <input
                      id="vendor-draft-cta-label"
                      value={draftCustomization.cta_label ?? ''}
                      onChange={(e) => setDraft((prev) => prev ? updateDraftCustomization(prev, { cta_label: e.target.value }) : prev)}
                      placeholder="Send note about the date"
                      className="w-full rounded-xl border border-[#eadfce] bg-white px-4 py-3 text-sm outline-none"
                    />
                  </div>
                  <div>
                    <label htmlFor="vendor-draft-service-area" className="mb-1 block text-sm font-semibold text-[#4b3a2c]">Where they work</label>
                    <input
                      id="vendor-draft-service-area"
                      value={draftCustomization.service_area ?? ''}
                      onChange={(e) => setDraft((prev) => prev ? updateDraftCustomization(prev, { service_area: e.target.value }) : prev)}
                      placeholder="Hudson Valley, NYC, and destination weekends"
                      className="w-full rounded-xl border border-[#eadfce] bg-white px-4 py-3 text-sm outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="vendor-draft-pricing-note" className="mb-1 block text-sm font-semibold text-[#4b3a2c]">Note</label>
                  <input
                    id="vendor-draft-pricing-note"
                    value={draftCustomization.pricing_note ?? ''}
                    onChange={(e) => setDraft((prev) => prev ? updateDraftCustomization(prev, { pricing_note: e.target.value }) : prev)}
                    placeholder="Wedding weekends and planning notes."
                    className="w-full rounded-xl border border-[#eadfce] bg-white px-4 py-3 text-sm outline-none"
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  {[0, 1, 2].map((index) => (
                    <div key={index}>
                      <label htmlFor={`vendor-draft-proof-${index}`} className="mb-1 block text-sm font-semibold text-[#4b3a2c]">Note {index + 1}</label>
                      <input
                        id={`vendor-draft-proof-${index}`}
                        value={draftCustomization.proof_points[index] ?? ''}
                        onChange={(e) => {
                          const nextProofPoints = [...draftCustomization.proof_points];
                          nextProofPoints[index] = e.target.value;
                          setDraft((prev) => prev ? updateDraftCustomization(prev, { proof_points: nextProofPoints }) : prev);
                        }}
                        placeholder={index === 0 ? 'Early photos' : index === 1 ? 'Rain plan notes' : 'Schedule help'}
                        className="w-full rounded-xl border border-[#eadfce] bg-white px-4 py-3 text-sm outline-none"
                      />
                    </div>
                  ))}
                </div>
                <details className="rounded-xl border border-[#eadfce] bg-white p-4">
                  <summary className="cursor-pointer text-sm font-semibold text-[#4b3a2c]">Details</summary>
                  <p className="mt-2 text-xs text-[#8b6f53]">Add the details couples usually look for first.</p>
                  <div className="mt-4 space-y-4">
                <div className="rounded-xl border border-[#eadfce] bg-white p-4 space-y-3">
                  <div>
                    <p className="text-sm font-semibold text-[#4b3a2c]">Details</p>
                    <p className="mt-1 text-xs text-[#8b6f53]">Short details couples look for first.</p>
                  </div>
                  <div className="grid gap-2">
                    {[0, 1, 2, 3, 4, 5].map((index) => {
                      const item = draftCustomization.category_facts[index] ?? { label: '', value: '', group: null };
                      return (
                        <div key={index} className="grid gap-2 rounded-xl bg-[#fffaf3] p-3 sm:grid-cols-[0.45fr_1fr]">
                          <input
                            value={item.label}
                            onChange={(e) => setDraft((prev) => {
                              if (!prev) return prev;
                              const currentFacts = readRawCustomizationArray<VendorProfileCategoryFact>(prev, 'category_facts');
                              return updateDraftCustomization(prev, {
                                category_facts: updateArrayItem(currentFacts, index, { label: e.target.value }, { label: '', value: '', group: null }),
                              });
                            })}
                            placeholder={index === 0 ? 'Capacity' : index === 1 ? 'Rain plan' : index === 2 ? 'Style' : 'Detail label'}
                            className="w-full rounded-xl border border-[#eadfce] px-3 py-2 text-sm outline-none"
                          />
                          <input
                            value={item.value}
                            onChange={(e) => setDraft((prev) => {
                              if (!prev) return prev;
                              const currentFacts = readRawCustomizationArray<VendorProfileCategoryFact>(prev, 'category_facts');
                              return updateDraftCustomization(prev, {
                                category_facts: updateArrayItem(currentFacts, index, { value: e.target.value }, { label: '', value: '', group: null }),
                              });
                            })}
                            placeholder={index === 0 ? 'Up to 180 seated guests' : index === 1 ? 'Indoor backup included' : index === 2 ? 'Documentary with a clean finish' : 'Short answer'}
                            className="w-full rounded-xl border border-[#eadfce] px-3 py-2 text-sm outline-none"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="rounded-xl border border-[#eadfce] bg-white p-4 space-y-3">
                  <p className="text-sm font-semibold text-[#4b3a2c]">Sections</p>
                  <p className="text-xs text-[#8b6f53]">Pick the sections to show.</p>
                  <div className="grid gap-2 sm:grid-cols-3">
                    {VENDOR_SECTION_IDS.map((sectionId) => {
                      const enabled = !draftCustomization.hidden_sections.includes(sectionId);
                      return (
                        <label key={sectionId} className="flex items-center gap-2 rounded-xl border border-[#eadfce] px-3 py-2 text-sm text-[#4b3a2c]">
                          <input
                            type="checkbox"
                            checked={enabled}
                            onChange={(e) => {
                              const hidden = e.target.checked
                                ? draftCustomization.hidden_sections.filter((item) => item !== sectionId)
                                : [...draftCustomization.hidden_sections, sectionId];
                              setDraft((prev) => prev ? updateDraftCustomization(prev, { hidden_sections: hidden }) : prev);
                            }}
                          />
                          <span>{vendorSectionLabels[sectionId]}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
                <div className="rounded-xl border border-[#eadfce] bg-white p-4 space-y-3">
                  <p className="text-sm font-semibold text-[#4b3a2c]">What to know</p>
                  {[0, 1, 2].map((index) => {
                    const item = draftCustomization.packages[index] ?? { title: '', detail: '', price: '' };
                    return (
                      <div key={index} className="grid gap-2 rounded-xl bg-[#fffaf3] p-3">
                        <input
                          value={item.title}
                          onChange={(e) => setDraft((prev) => {
                            if (!prev) return prev;
                            const currentPackages = readRawCustomizationArray<{ title: string; detail: string; price?: string | null }>(prev, 'packages');
                            return updateDraftCustomization(prev, { packages: updateArrayItem(currentPackages, index, { title: e.target.value }, { title: '', detail: '', price: '' }) });
                          })}
                          placeholder={`Item ${index + 1} title`}
                          className="w-full rounded-xl border border-[#eadfce] px-3 py-2 text-sm outline-none"
                        />
                        <input
                          value={item.detail}
                          onChange={(e) => setDraft((prev) => {
                            if (!prev) return prev;
                            const currentPackages = readRawCustomizationArray<{ title: string; detail: string; price?: string | null }>(prev, 'packages');
                            return updateDraftCustomization(prev, { packages: updateArrayItem(currentPackages, index, { detail: e.target.value }, { title: '', detail: '', price: '' }) });
                          })}
                          placeholder="Item note"
                          className="w-full rounded-xl border border-[#eadfce] px-3 py-2 text-sm outline-none"
                        />
                        <input
                          value={item.price ?? ''}
                          onChange={(e) => setDraft((prev) => {
                            if (!prev) return prev;
                            const currentPackages = readRawCustomizationArray<{ title: string; detail: string; price?: string | null }>(prev, 'packages');
                            return updateDraftCustomization(prev, { packages: updateArrayItem(currentPackages, index, { price: e.target.value }, { title: '', detail: '', price: '' }) });
                          })}
                          placeholder="Range or note"
                          className="w-full rounded-xl border border-[#eadfce] px-3 py-2 text-sm outline-none"
                        />
                      </div>
                    );
                  })}
                </div>
                  </div>
                </details>
                <details className="rounded-xl border border-[#eadfce] bg-white p-4">
                  <summary className="cursor-pointer text-sm font-semibold text-[#4b3a2c]">Shared notes</summary>
                  <p className="mt-2 text-xs text-[#8b6f53]">Add shared notes only when they help.</p>
                  <div className="mt-4 grid gap-4 lg:grid-cols-2">
                    <div className="rounded-xl bg-[#fffaf3] p-3 space-y-3">
                      <p className="text-xs font-semibold text-[#8b6f53]">Shared notes</p>
                      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
                        <label className="grid gap-1 text-xs font-semibold text-[#8b6f53]">
                          Notes from
                          <input
                            value={draftCustomization.external_credibility.source_label}
                            onChange={(e) => setDraft((prev) => prev ? updateDraftCustomization(prev, { external_credibility: { ...draftCustomization.external_credibility, enabled: true, source_label: e.target.value } }) : prev)}
                            placeholder="Google"
                            className="w-full rounded-xl border border-[#eadfce] px-3 py-2 text-sm font-normal text-[#4b3a2c] outline-none"
                          />
                        </label>
                        <label className="grid gap-1 text-xs font-semibold text-[#8b6f53]">
                          How many notes
                          <input
                            value={draftCustomization.external_credibility.review_count ?? ''}
                            onChange={(e) => setDraft((prev) => prev ? updateDraftCustomization(prev, { external_credibility: { ...draftCustomization.external_credibility, enabled: true, review_count: e.target.value } }) : prev)}
                            placeholder="126"
                            className="w-full rounded-xl border border-[#eadfce] px-3 py-2 text-sm font-normal text-[#4b3a2c] outline-none"
                          />
                        </label>
                      </div>
                      <label className="grid gap-1 text-xs font-semibold text-[#8b6f53]">
                        Source link
                        <input
                          value={draftCustomization.external_credibility.profile_url ?? ''}
                          onChange={(e) => setDraft((prev) => prev ? updateDraftCustomization(prev, { external_credibility: { ...draftCustomization.external_credibility, enabled: true, profile_url: e.target.value } }) : prev)}
                          placeholder="Google or source link"
                          className="w-full rounded-xl border border-[#eadfce] px-3 py-2 text-sm font-normal text-[#4b3a2c] outline-none"
                        />
                      </label>
                    </div>
                    <div className="rounded-xl bg-[#fffaf3] p-3 space-y-3">
                      <p className="text-xs font-semibold text-[#8b6f53]">Notes</p>
                      <label className="grid gap-1 text-xs font-semibold text-[#8b6f53]">
                        Note
                        <input
                          value={draftCustomization.rating.summary ?? ''}
                          onChange={(e) => setDraft((prev) => prev ? updateDraftCustomization(prev, { rating: { ...draftCustomization.rating, enabled: true, summary: e.target.value } }) : prev)}
                          placeholder="Note on schedule, style, or limits"
                          className="w-full rounded-xl border border-[#eadfce] px-3 py-2 text-sm font-normal text-[#4b3a2c] outline-none"
                        />
                      </label>
                      <div className="grid gap-2">
                        {[0, 1, 2, 3].map((index) => {
                          const item = draftCustomization.rating.categories[index] ?? { label: '', score: '' };
                          return (
                            <label key={index} className="grid gap-1 text-xs font-semibold text-[#8b6f53]">
                              Topic {index + 1}
                              <input
                              key={index}
                              value={item.label}
                              onChange={(e) => {
                                const categories = updateArrayItem<Array<{ label: string; score: number | string }>[number]>(
                                  draftCustomization.rating.categories,
                                  index,
                                  { label: e.target.value, score: item.score || 0 },
                                  { label: '', score: 0 },
                                );
                                setDraft((prev) => prev ? updateDraftCustomization(prev, { rating: { ...draftCustomization.rating, enabled: true, categories } }) : prev);
                              }}
                              placeholder={index === 0 ? 'Visual style' : index === 1 ? 'Schedule' : index === 2 ? 'Reply time' : 'Budget notes'}
                              className="w-full rounded-xl border border-[#eadfce] px-3 py-2 text-sm font-normal text-[#4b3a2c] outline-none"
                              />
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </details>
                <details className="rounded-xl border border-[#eadfce] bg-white p-4">
                  <summary className="cursor-pointer text-sm font-semibold text-[#4b3a2c]">Notes and questions</summary>
                  <p className="mt-2 text-xs text-[#8b6f53]">Add couple notes and common questions when they are already known.</p>
                  <div className="mt-4 space-y-4">
                <div className="rounded-xl border border-[#eadfce] bg-white p-4 space-y-3">
                  <p className="text-sm font-semibold text-[#4b3a2c]">Couple notes</p>
                  {[0, 1].map((index) => {
                    const item = draftCustomization.testimonials[index] ?? { quote: '', attribution: '' };
                    return (
                      <div key={index} className="grid gap-2 rounded-xl bg-[#fffaf3] p-3">
                        <input
                          value={item.quote}
                          onChange={(e) => setDraft((prev) => {
                            if (!prev) return prev;
                            const currentTestimonials = readRawCustomizationArray<{ quote: string; attribution?: string | null }>(prev, 'testimonials');
                            return updateDraftCustomization(prev, { testimonials: updateArrayItem(currentTestimonials, index, { quote: e.target.value }, { quote: '', attribution: '' }) });
                          })}
                          placeholder="Note"
                          className="w-full rounded-xl border border-[#eadfce] px-3 py-2 text-sm outline-none"
                        />
                        <input
                          value={item.attribution ?? ''}
                          onChange={(e) => setDraft((prev) => {
                            if (!prev) return prev;
                            const currentTestimonials = readRawCustomizationArray<{ quote: string; attribution?: string | null }>(prev, 'testimonials');
                            return updateDraftCustomization(prev, { testimonials: updateArrayItem(currentTestimonials, index, { attribution: e.target.value }, { quote: '', attribution: '' }) });
                          })}
                          placeholder="Who said it"
                          className="w-full rounded-xl border border-[#eadfce] px-3 py-2 text-sm outline-none"
                        />
                      </div>
                    );
                  })}
                </div>
                <div className="rounded-xl border border-[#eadfce] bg-white p-4 space-y-3">
                  <p className="text-sm font-semibold text-[#4b3a2c]">Common questions</p>
                  {[0, 1, 2].map((index) => {
                    const item = draftCustomization.faqs[index] ?? { question: '', answer: '' };
                    return (
                      <div key={index} className="grid gap-2 rounded-xl bg-[#fffaf3] p-3">
                        <input
                          value={item.question}
                          onChange={(e) => setDraft((prev) => {
                            if (!prev) return prev;
                            const currentFaqs = readRawCustomizationArray<{ question: string; answer: string }>(prev, 'faqs');
                            return updateDraftCustomization(prev, { faqs: updateArrayItem(currentFaqs, index, { question: e.target.value }, { question: '', answer: '' }) });
                          })}
                          placeholder={`Question ${index + 1}`}
                          className="w-full rounded-xl border border-[#eadfce] px-3 py-2 text-sm outline-none"
                        />
                        <input
                          value={item.answer}
                          onChange={(e) => setDraft((prev) => {
                            if (!prev) return prev;
                            const currentFaqs = readRawCustomizationArray<{ question: string; answer: string }>(prev, 'faqs');
                            return updateDraftCustomization(prev, { faqs: updateArrayItem(currentFaqs, index, { answer: e.target.value }, { question: '', answer: '' }) });
                          })}
                          placeholder="Answer"
                          className="w-full rounded-xl border border-[#eadfce] px-3 py-2 text-sm outline-none"
                        />
                      </div>
                    );
                  })}
                </div>
                <div className="rounded-xl border border-[#eadfce] bg-white p-4 space-y-3">
                  <p className="text-sm font-semibold text-[#4b3a2c]">Questions for couples</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {[0, 1, 2, 3].map((index) => (
                      <input
                        key={index}
                        value={draftCustomization.inquiry_questions[index] ?? ''}
                        onChange={(e) => {
                          setDraft((prev) => {
                            if (!prev) return prev;
                            const currentQuestions = readRawCustomizationArray<string>(prev, 'inquiry_questions');
                            const nextQuestions = [...currentQuestions];
                            nextQuestions[index] = e.target.value;
                            return updateDraftCustomization(prev, { inquiry_questions: nextQuestions });
                          });
                        }}
                        placeholder={index === 0 ? 'Guest count' : index === 1 ? 'Budget note' : index === 2 ? 'Style inspiration' : 'Schedule needs'}
                        className="w-full rounded-xl border border-[#eadfce] px-3 py-2 text-sm outline-none"
                      />
                    ))}
                  </div>
                </div>
                  </div>
                </details>
              </div>
            )}
            {draft && draftCustomization && (
              <div className="rounded-xl border border-[#eadfce] bg-white p-4 sm:p-5 space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold text-[#8b6f53]">Quick check</p>
                    <h3 className="mt-2 text-lg font-semibold text-[#2f261d]">Quick check</h3>
                  </div>
                  <span className="rounded-xl bg-[#f5e9db] px-3 py-1 text-xs font-semibold text-[#8b6f53]">
                    {draftReviewReadyCount}/{draftReviewItems.length} ready
                  </span>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {draftStarterDetailLabels.length > 0 && (
                    <div className="rounded-xl bg-[#fffaf3] px-3 py-3">
                      <p className="text-sm font-semibold text-[#4b3a2c]">Starter notes</p>
                      <p className="mt-1 text-xs leading-5 text-[#8b6f53]">
                        Look over {draftStarterDetailLabels.join(', ')} before you save.
                      </p>
                    </div>
                  )}
                  {draftReviewItems.map((item) => (
                    <div key={item.label} className="rounded-xl bg-[#fffaf3] px-3 py-3">
                      <p className="text-sm font-semibold text-[#4b3a2c]">
                        {item.ready ? 'Ready' : 'Add'} {item.label}
                      </p>
                      <p className="mt-1 text-xs leading-5 text-[#8b6f53]">{item.detail}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="rounded-xl border border-[#eadfce] p-4 sm:p-5 space-y-3">
              <p className="text-xs font-semibold text-[#8b6f53]">Details</p>
              <div>
                <label htmlFor="vendor-draft-name" className="mb-1 block text-sm font-semibold text-[#4b3a2c]">Name</label>
                <input id="vendor-draft-name" value={draft.vendor_name} onChange={(e) => setDraft((prev) => prev ? { ...prev, vendor_name: e.target.value } : prev)} className="w-full rounded-xl border border-[#eadfce] px-4 py-3 text-2xl font-semibold outline-none" placeholder="Name" />
              </div>
              <div>
                <label htmlFor="vendor-draft-descriptor" className="mb-1 block text-sm font-semibold text-[#4b3a2c]">Description</label>
                <input id="vendor-draft-descriptor" value={draft.descriptor ?? ''} onChange={(e) => setDraft((prev) => prev ? { ...prev, descriptor: e.target.value || null } : prev)} placeholder="One short description" className="w-full rounded-xl border border-[#eadfce] px-4 py-3 text-[#6f5843] outline-none" />
              </div>
              <div>
                <label htmlFor="vendor-draft-slug" className="mb-1 block text-sm font-semibold text-[#4b3a2c]">Link</label>
                <input id="vendor-draft-slug" value={draft.slug} onChange={(e) => setDraft((prev) => prev ? { ...prev, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') } : prev)} placeholder="page-link" className="w-full rounded-xl border border-[#eadfce] px-4 py-3 text-sm outline-none" />
              </div>
            </div>
            <div className="rounded-xl border border-[#eadfce] p-4 sm:p-5 space-y-3">
              <label htmlFor="vendor-draft-about" className="block text-xs font-semibold text-[#8b6f53]">About</label>
              <textarea id="vendor-draft-about" value={draft.about} onChange={(e) => setDraft((prev) => prev ? { ...prev, about: e.target.value } : prev)} className="min-h-[132px] w-full rounded-xl border border-[#eadfce] px-4 py-3 text-[#4b3a2c] leading-7 outline-none" placeholder="Plain 2-3 sentence description" />
            </div>
            <div className="rounded-xl border border-[#eadfce] p-4 sm:p-5 space-y-3">
              <p className="text-xs font-semibold text-[#8b6f53]">Links and email</p>
              <input value={draft.instagram_url ?? ''} onChange={(e) => setDraft((prev) => prev ? { ...prev, instagram_url: e.target.value || null } : prev)} placeholder="Instagram link" className="w-full rounded-xl border border-[#eadfce] px-4 py-3 text-sm outline-none" />
              <input value={draft.website_url ?? ''} onChange={(e) => setDraft((prev) => prev ? { ...prev, website_url: e.target.value || null } : prev)} placeholder="Website link" className="w-full rounded-xl border border-[#eadfce] px-4 py-3 text-sm outline-none" />
              <details className="rounded-xl border border-[#eadfce] bg-[#fffaf3] p-4">
                <summary className="cursor-pointer text-sm font-semibold text-[#4b3a2c]">More places</summary>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <input value={typeof draft.source_payload?.pinterest_url === 'string' ? draft.source_payload.pinterest_url : ''} onChange={(e) => setDraft((prev) => prev ? { ...prev, source_payload: { ...prev.source_payload, pinterest_url: e.target.value || null } } : prev)} placeholder="Pinterest link" className="w-full rounded-xl border border-[#eadfce] px-4 py-3 text-sm outline-none" />
                  <input value={typeof draft.source_payload?.tiktok_url === 'string' ? draft.source_payload.tiktok_url : ''} onChange={(e) => setDraft((prev) => prev ? { ...prev, source_payload: { ...prev.source_payload, tiktok_url: e.target.value || null } } : prev)} placeholder="TikTok link" className="w-full rounded-xl border border-[#eadfce] px-4 py-3 text-sm outline-none" />
                  <input value={typeof draft.source_payload?.facebook_url === 'string' ? draft.source_payload.facebook_url : ''} onChange={(e) => setDraft((prev) => prev ? { ...prev, source_payload: { ...prev.source_payload, facebook_url: e.target.value || null } } : prev)} placeholder="Facebook link" className="w-full rounded-xl border border-[#eadfce] px-4 py-3 text-sm outline-none" />
                  <input value={typeof draft.source_payload?.youtube_url === 'string' ? draft.source_payload.youtube_url : ''} onChange={(e) => setDraft((prev) => prev ? { ...prev, source_payload: { ...prev.source_payload, youtube_url: e.target.value || null } } : prev)} placeholder="YouTube link" className="w-full rounded-xl border border-[#eadfce] px-4 py-3 text-sm outline-none" />
                </div>
              </details>
              <input type="email" value={draft.contact_email ?? ''} onChange={(e) => setDraft((prev) => prev ? { ...prev, contact_email: e.target.value || null } : prev)} placeholder="Email" className="w-full rounded-xl border border-[#eadfce] px-4 py-3 text-sm outline-none" />
            </div>
            <div className="rounded-xl border border-[#eadfce] p-4 sm:p-5 space-y-3">
              <label htmlFor="vendor-draft-images" className="block text-xs font-semibold text-[#8b6f53]">Photos</label>
              <p id="vendor-draft-images-help" className="text-xs text-[#8b6f53]">Put the main photo first. Add up to 11 more; the page opens with six.</p>
              <textarea
                id="vendor-draft-images"
                value={imageEditor}
                onChange={(e) => {
                  const nextValue = e.target.value;
                  setImageEditor(nextValue);
                  const images = normalizeImageLines(nextValue);
                  setDraft((prev) => prev ? {
                    ...prev,
                    hero_image_url: images[0] ?? null,
                    image_urls: images.slice(1),
                  } : prev);
                }}
                placeholder="One photo link per line"
                aria-describedby="vendor-draft-images-help"
                className="min-h-[120px] w-full rounded-xl border border-[#eadfce] px-4 py-3 text-sm outline-none"
              />
              {getSafePublicImageUrl(draft.hero_image_url) && <p className="text-xs text-[#8b6f53]">Main photo ready.</p>}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {draftSafeImages.slice(0, 6).map((image) => (
                <img key={image} src={image} alt={draft.vendor_name} className="aspect-square w-full rounded-xl object-cover bg-[#f3eadf]" />
              ))}
            </div>
            {draftExtraImageCount > 0 && (
              <p className="text-xs text-[#8b6f53]">First 6 shown here. The page can show {draftExtraImageCount} more.</p>
            )}
            <div className="flex flex-wrap gap-3">
              {draftLinks(draft).map((link) => (
                <a key={link.label} href={link.href} target="_blank" rel="noopener noreferrer" className="text-sm text-[#6f5843] underline">{link.label}</a>
              ))}
            </div>
            <p className="text-xs text-[#8b6f53]">Social links can help when the website is light.</p>
            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={handlePublish} disabled={saving} className="rounded-xl bg-[#2f261d] px-5 py-3 text-sm font-semibold text-white disabled:opacity-60">
                {saving ? 'Saving...' : 'Save page'}
              </button>
              <div className="text-sm text-[#8b6f53] self-center">/vendor/{draft.slug}</div>
            </div>
            <p className="text-xs text-[#8b6f53]">If that link is taken, DayOf will pick the next clean one.</p>
          </div>

          </div>
        )}

        {createdProfile && (
          <div role="status" className="rounded-xl bg-[#2f261d] p-6 sm:p-8 text-white shadow-sm space-y-4">
            <div>
              <p className="text-xs font-semibold text-[#d8c4ad]">Saved</p>
              <h2 className="mt-2 text-2xl font-semibold">/{`vendor/${createdProfile.slug}`}</h2>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link to={`/vendor/${createdProfile.slug}`} className="rounded-xl bg-[#f5e9db] px-5 py-3 text-sm font-semibold text-[#2f261d]">
                Open page
              </Link>
              <button
                type="button"
                onClick={() => void handleCopyLiveUrl()}
                disabled={copyingLiveUrl}
                className="rounded-xl border border-white/20 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
              >
                {copyingLiveUrl
                  ? 'Copying link...'
                  : liveUrlNotice === 'copied'
                    ? 'Link copied'
                    : liveUrlNotice === 'downloaded'
                      ? 'Link saved'
                      : 'Copy page link'}
              </button>
              <button type="button" onClick={() => navigate(0)} className="rounded-xl border border-white/20 px-5 py-3 text-sm font-semibold text-white/80">
                New page
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VendorProfileCreatePage;
