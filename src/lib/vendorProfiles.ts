import { supabase } from './supabase';
import { DEMO_MODE } from '../config/env';
import { resolveActiveSiteForUser } from './activeSite';
import { demoWeddingSite } from './demoData';
import { isVendorProfileCreationEnabled } from './vendorProfileLaunch';
import {
  getSafePublicEmailHref,
  getSafePublicImageUrl,
  getSafePublicInstagramUrl,
  getSafePublicWebUrl,
} from '../sections/publicLinks';

export interface VendorProfile {
  id: string;
  slug: string;
  vendor_name: string;
  descriptor: string | null;
  about: string;
  hero_image_url: string | null;
  image_urls: string[];
  instagram_url: string | null;
  website_url: string | null;
  contact_email: string | null;
  source_payload: Record<string, unknown> | null;
}

export type VendorTemplateId =
  | 'editorial'
  | 'portfolio'
  | 'minimal'
  | 'magazine'
  | 'booking'
  | 'photography'
  | 'floral'
  | 'venue'
  | 'planner'
  | 'service'
  | 'food'
  | 'beauty'
  | 'music'
  | 'travel';

export const VENDOR_TEMPLATE_IDS: VendorTemplateId[] = [
  'editorial',
  'portfolio',
  'minimal',
  'magazine',
  'booking',
  'photography',
  'floral',
  'venue',
  'planner',
  'service',
  'food',
  'beauty',
  'music',
  'travel',
];

export function normalizeVendorTemplateId(value: unknown): VendorTemplateId {
  return VENDOR_TEMPLATE_IDS.includes(value as VendorTemplateId) ? value as VendorTemplateId : 'editorial';
}

export interface VendorProfileInquiryInput {
  vendor_profile_id: string;
  name: string;
  email: string;
  message: string;
  wedding_date?: string;
  venue_name?: string;
  venue_location?: string;
  couple_names?: string;
  site_slug?: string;
  inquiry_context?: string;
}

export interface VendorProfileInquiry {
  id: string;
  vendor_profile_id: string;
  vendor_name: string;
  vendor_slug: string;
  name: string;
  email: string;
  message: string;
  wedding_date?: string | null;
  venue_name?: string | null;
  venue_location?: string | null;
  created_at: string;
}

export interface VendorProfileDraft {
  slug: string;
  vendor_name: string;
  descriptor: string | null;
  about: string;
  hero_image_url: string | null;
  image_urls: string[];
  instagram_url: string | null;
  website_url: string | null;
  contact_email: string | null;
  source_payload: Record<string, unknown>;
}

export interface VendorInquiryContext {
  couple_names: string;
  wedding_date: string;
  venue_name: string;
  venue_location: string;
  site_slug: string;
  sender_name: string;
  sender_email: string;
  summary: string;
}

const VENDOR_PROFILE_SELECT = 'id, slug, vendor_name, descriptor, about, hero_image_url, image_urls, instagram_url, website_url, contact_email, source_payload' as const;
export const MAX_VENDOR_PROFILE_INQUIRIES = 50;

export type VendorAccentId = 'champagne' | 'sage' | 'rose' | 'ink';
export type VendorGalleryLayoutId = 'editorial-grid' | 'stacked' | 'mosaic';
export type VendorSectionId = 'proof' | 'fit' | 'gallery' | 'about' | 'packages' | 'testimonials' | 'faq' | 'links' | 'inquiry';

export interface VendorProfilePackage {
  title: string;
  detail: string;
  price: string | null;
}

export interface VendorProfileFaq {
  question: string;
  answer: string;
}

export interface VendorProfileTestimonial {
  quote: string;
  attribution: string | null;
}

export interface VendorProfileRatingCategory {
  label: string;
  score: number;
}

export interface VendorProfileRating {
  enabled: boolean;
  overall_score: number | null;
  summary: string | null;
  categories: VendorProfileRatingCategory[];
}

export interface VendorExternalCredibility {
  enabled: boolean;
  source_label: string;
  rating: number | null;
  review_count: number | null;
  profile_url: string | null;
  place_id: string | null;
  last_synced_at: string | null;
}

export interface VendorProfileCustomization {
  accent_id: VendorAccentId;
  gallery_layout: VendorGalleryLayoutId;
  logo_text: string | null;
  cta_label: string | null;
  service_area: string | null;
  pricing_note: string | null;
  proof_points: string[];
  section_order: VendorSectionId[];
  hidden_sections: VendorSectionId[];
  packages: VendorProfilePackage[];
  faqs: VendorProfileFaq[];
  testimonials: VendorProfileTestimonial[];
  inquiry_questions: string[];
  rating: VendorProfileRating;
  external_credibility: VendorExternalCredibility;
}

export const VENDOR_ACCENT_IDS: VendorAccentId[] = ['champagne', 'sage', 'rose', 'ink'];
export const VENDOR_GALLERY_LAYOUT_IDS: VendorGalleryLayoutId[] = ['editorial-grid', 'stacked', 'mosaic'];
export const VENDOR_SECTION_IDS: VendorSectionId[] = ['proof', 'fit', 'gallery', 'about', 'packages', 'testimonials', 'faq', 'links', 'inquiry'];

export const VENDOR_ACCENT_OPTIONS: Array<{ id: VendorAccentId; name: string; detail: string }> = [
  { id: 'champagne', name: 'Champagne', detail: 'Warm, editorial, and broad-fit for premium vendors.' },
  { id: 'sage', name: 'Sage', detail: 'Calm, botanical, and ideal for floral, venues, and planners.' },
  { id: 'rose', name: 'Rose', detail: 'Soft, romantic, and polished for beauty, attire, and photo teams.' },
  { id: 'ink', name: 'Ink', detail: 'High-contrast, modern, and strong for photo, music, and luxury services.' },
];

export const VENDOR_GALLERY_LAYOUT_OPTIONS: Array<{ id: VendorGalleryLayoutId; name: string }> = [
  { id: 'editorial-grid', name: 'Editorial grid' },
  { id: 'stacked', name: 'Stacked story' },
  { id: 'mosaic', name: 'Mosaic board' },
];

function normalizeVendorAccentId(value: unknown, templateId?: VendorTemplateId): VendorAccentId {
  if (VENDOR_ACCENT_IDS.includes(value as VendorAccentId)) return value as VendorAccentId;
  if (templateId === 'floral' || templateId === 'venue' || templateId === 'planner' || templateId === 'travel') return 'sage';
  if (templateId === 'beauty') return 'rose';
  if (templateId === 'photography' || templateId === 'portfolio' || templateId === 'music') return 'ink';
  return 'champagne';
}

function normalizeCustomizationText(value: unknown, maxLength = 96): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.replace(/\s+/g, ' ').trim();
  return normalized ? normalized.slice(0, maxLength) : null;
}

function normalizeVendorGalleryLayoutId(value: unknown, templateId?: VendorTemplateId): VendorGalleryLayoutId {
  if (VENDOR_GALLERY_LAYOUT_IDS.includes(value as VendorGalleryLayoutId)) return value as VendorGalleryLayoutId;
  if (templateId === 'planner' || templateId === 'service' || templateId === 'travel') return 'stacked';
  if (templateId === 'floral' || templateId === 'food' || templateId === 'beauty') return 'mosaic';
  return 'editorial-grid';
}

function normalizeSectionOrder(value: unknown): VendorSectionId[] {
  const requested = Array.isArray(value) ? value : [];
  const ordered = requested.filter((item): item is VendorSectionId => VENDOR_SECTION_IDS.includes(item as VendorSectionId));
  return [...ordered, ...VENDOR_SECTION_IDS.filter((item) => !ordered.includes(item))];
}

function normalizeHiddenSections(value: unknown): VendorSectionId[] {
  return Array.isArray(value)
    ? value.filter((item, index, arr): item is VendorSectionId => VENDOR_SECTION_IDS.includes(item as VendorSectionId) && arr.indexOf(item) === index)
    : [];
}

function normalizePackages(value: unknown): VendorProfilePackage[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return null;
    const row = item as Record<string, unknown>;
    const title = normalizeCustomizationText(row.title, 64);
    const detail = normalizeCustomizationText(row.detail, 180);
    if (!title || !detail) return null;
    return {
      title,
      detail,
      price: normalizeCustomizationText(row.price, 48),
    };
  }).filter((item): item is VendorProfilePackage => Boolean(item)).slice(0, 4);
}

function normalizeFaqs(value: unknown): VendorProfileFaq[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return null;
    const row = item as Record<string, unknown>;
    const question = normalizeCustomizationText(row.question, 96);
    const answer = normalizeCustomizationText(row.answer, 220);
    if (!question || !answer) return null;
    return { question, answer };
  }).filter((item): item is VendorProfileFaq => Boolean(item)).slice(0, 5);
}

function normalizeTestimonials(value: unknown): VendorProfileTestimonial[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return null;
    const row = item as Record<string, unknown>;
    const quote = normalizeCustomizationText(row.quote, 220);
    if (!quote) return null;
    return {
      quote,
      attribution: normalizeCustomizationText(row.attribution, 64),
    };
  }).filter((item): item is VendorProfileTestimonial => Boolean(item)).slice(0, 3);
}

function normalizeRatingScore(value: unknown): number | null {
  const numeric = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
  if (!Number.isFinite(numeric)) return null;
  return Math.max(0, Math.min(10, Math.round(numeric * 10) / 10));
}

function normalizeExternalRatingScore(value: unknown): number | null {
  const numeric = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
  if (!Number.isFinite(numeric)) return null;
  return Math.max(0, Math.min(5, Math.round(numeric * 10) / 10));
}

function normalizeReviewCount(value: unknown): number | null {
  const numeric = typeof value === 'number' ? value : typeof value === 'string' ? Number(value.replace(/,/g, '')) : NaN;
  if (!Number.isFinite(numeric) || numeric < 0) return null;
  return Math.min(999999, Math.floor(numeric));
}

function normalizeExternalCredibility(value: unknown): VendorExternalCredibility {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {
      enabled: false,
      source_label: 'Google',
      rating: null,
      review_count: null,
      profile_url: null,
      place_id: null,
      last_synced_at: null,
    };
  }

  const row = value as Record<string, unknown>;
  const rating = normalizeExternalRatingScore(row.rating);
  const reviewCount = normalizeReviewCount(row.review_count);
  const profileUrl = typeof row.profile_url === 'string' ? normalizeUrl(row.profile_url) : null;
  const sourceLabel = normalizeCustomizationText(row.source_label, 36) ?? 'Google';
  const placeId = normalizeCustomizationText(row.place_id, 140);
  const lastSyncedAt = normalizeCustomizationText(row.last_synced_at, 32);

  return {
    enabled: row.enabled === true || rating !== null || reviewCount !== null || Boolean(profileUrl),
    source_label: sourceLabel,
    rating,
    review_count: reviewCount,
    profile_url: profileUrl,
    place_id: placeId,
    last_synced_at: lastSyncedAt,
  };
}

function normalizeRating(value: unknown): VendorProfileRating {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {
      enabled: false,
      overall_score: null,
      summary: null,
      categories: [],
    };
  }

  const row = value as Record<string, unknown>;
  const categories = Array.isArray(row.categories)
    ? row.categories.map((item) => {
        if (!item || typeof item !== 'object' || Array.isArray(item)) return null;
        const category = item as Record<string, unknown>;
        const label = normalizeCustomizationText(category.label, 42);
        const score = normalizeRatingScore(category.score);
        if (!label || score === null) return null;
        return { label, score };
      }).filter((item): item is VendorProfileRatingCategory => Boolean(item)).slice(0, 4)
    : [];

  const overallScore = normalizeRatingScore(row.overall_score);
  return {
    enabled: row.enabled === true || overallScore !== null || categories.length > 0,
    overall_score: overallScore,
    summary: normalizeCustomizationText(row.summary, 140),
    categories,
  };
}

export function normalizeVendorProfileCustomization(sourcePayload: Record<string, unknown> | null | undefined): VendorProfileCustomization {
  const payload = sourcePayload ?? {};
  const templateId = normalizeVendorTemplateId(payload.template_id);
  const rawCustomization = payload.vendor_customization;
  const customization = rawCustomization && typeof rawCustomization === 'object' && !Array.isArray(rawCustomization)
    ? rawCustomization as Record<string, unknown>
    : {};
  const proofPoints = Array.isArray(customization.proof_points)
    ? customization.proof_points
        .map((item) => normalizeCustomizationText(item, 44))
        .filter((item): item is string => Boolean(item))
        .slice(0, 3)
    : [];

  return {
    accent_id: normalizeVendorAccentId(customization.accent_id, templateId),
    gallery_layout: normalizeVendorGalleryLayoutId(customization.gallery_layout, templateId),
    logo_text: normalizeCustomizationText(customization.logo_text, 24),
    cta_label: normalizeCustomizationText(customization.cta_label, 34),
    service_area: normalizeCustomizationText(customization.service_area, 72),
    pricing_note: normalizeCustomizationText(customization.pricing_note, 86),
    proof_points: proofPoints,
    section_order: normalizeSectionOrder(customization.section_order),
    hidden_sections: normalizeHiddenSections(customization.hidden_sections),
    packages: normalizePackages(customization.packages),
    faqs: normalizeFaqs(customization.faqs),
    testimonials: normalizeTestimonials(customization.testimonials),
    inquiry_questions: Array.isArray(customization.inquiry_questions)
      ? customization.inquiry_questions
          .map((item) => normalizeCustomizationText(item, 72))
          .filter((item): item is string => Boolean(item))
          .slice(0, 4)
      : [],
    rating: normalizeRating(customization.rating),
    external_credibility: normalizeExternalCredibility(customization.external_credibility),
  };
}

const SAMPLE_VENDOR_PROFILES: Record<string, VendorProfile> = {
  everlight: {
    id: 'sample-everlight',
    slug: 'everlight',
    vendor_name: 'Everlight Studio',
    descriptor: 'Documentary wedding photography with an editorial finish',
    about: 'Everlight Studio photographs weddings with a calm, observant style built around real emotion, clean composition, and the small in-between moments couples actually remember.',
    hero_image_url: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1400&q=80',
    image_urls: [
      'https://images.unsplash.com/photo-1520854221256-17451cc331bf?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1523438885200-e635ba2c371e?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=900&q=80',
    ],
    instagram_url: 'https://instagram.com/everlight',
    website_url: 'https://example.com/everlight',
    contact_email: 'hello@everlight.example',
    source_payload: {
      template_id: 'photography',
      sampleProfile: true,
      vendor_customization: {
        accent_id: 'ink',
        cta_label: 'Check date availability',
        service_area: 'New York, Hudson Valley, and destination weekends',
        pricing_note: 'Full-weekend collections begin with planning and timeline support.',
        proof_points: ['Film-toned edits', 'Calm timeline presence', 'Fast preview gallery'],
      },
    },
  },
  'dayof-sample-photography': {
    id: 'sample-photography',
    slug: 'dayof-sample-photography',
    vendor_name: 'Everlight Studio',
    descriptor: 'Documentary wedding photography with an editorial finish',
    about: 'Everlight Studio photographs weddings with a calm, observant style built around real emotion, clean composition, and the small in-between moments couples actually remember.',
    hero_image_url: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1400&q=80',
    image_urls: [
      'https://images.unsplash.com/photo-1520854221256-17451cc331bf?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1523438885200-e635ba2c371e?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=900&q=80',
    ],
    instagram_url: 'https://instagram.com/everlight',
    website_url: 'https://example.com/everlight',
    contact_email: 'hello@everlight.example',
    source_payload: {
      template_id: 'photography',
      sampleProfile: true,
      vendor_customization: {
        accent_id: 'ink',
        cta_label: 'Check date availability',
        service_area: 'New York, Hudson Valley, and destination weekends',
        pricing_note: 'Full-weekend collections begin with planning and timeline support.',
        proof_points: ['Film-toned edits', 'Calm timeline presence', 'Fast preview gallery'],
      },
    },
  },
  'dayof-sample-floral': {
    id: 'sample-floral',
    slug: 'dayof-sample-floral',
    vendor_name: 'Marigold Floral House',
    descriptor: 'Sculptural florals for warm, high-texture celebrations',
    about: 'Marigold Floral House designs wedding flowers that feel garden-gathered, seasonal, and dimensional, from ceremony installations to reception tablescapes.',
    hero_image_url: 'https://images.unsplash.com/photo-1526047932273-341f2a7631f9?auto=format&fit=crop&w=1400&q=80',
    image_urls: [
      'https://images.unsplash.com/photo-1509223197845-458d87318791?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1504196606672-aef5c9cefc92?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1460978812857-470ed1c77af0?auto=format&fit=crop&w=900&q=80',
    ],
    instagram_url: 'https://instagram.com/marigoldfloral',
    website_url: 'https://example.com/marigold',
    contact_email: 'studio@marigold.example',
    source_payload: {
      template_id: 'floral',
      sampleProfile: true,
      vendor_customization: {
        accent_id: 'sage',
        cta_label: 'Ask about floral availability',
        gallery_layout: 'mosaic',
        logo_text: 'MFH',
        service_area: 'Garden, tented, and estate celebrations across the Northeast',
        pricing_note: 'Best fit for ceremony installs, reception flowers, and full visual direction.',
        proof_points: ['Seasonal palette', 'Large-scale installs', 'Rental coordination'],
        external_credibility: {
          enabled: true,
          source_label: 'Google',
          rating: 4.9,
          review_count: 86,
          profile_url: 'https://www.google.com/maps',
          place_id: 'sample-google-place-marigold',
          last_synced_at: 'sample data',
        },
        rating: {
          enabled: true,
          overall_score: 9.4,
          summary: 'Best fit for couples who want seasonal color, installation presence, and a floral team that can coordinate rentals calmly.',
          categories: [
            { label: 'Style match', score: 9.7 },
            { label: 'Logistics', score: 9.2 },
            { label: 'Responsiveness', score: 9.1 },
            { label: 'Guest impact', score: 9.5 },
          ],
        },
        packages: [
          { title: 'Ceremony install', detail: 'Statement aisle flowers, altar moment, strike plan, and repurpose notes.', price: 'Custom quote' },
          { title: 'Reception flowers', detail: 'Tablescape florals, candles, personal flowers, and delivery coordination.', price: 'Scoped by guest count' },
        ],
        testimonials: [
          { quote: 'The florals felt abundant, personal, and perfectly in season.', attribution: 'Sample couple note' },
        ],
        faqs: [
          { question: 'Can you work from a color palette?', answer: 'Yes. Share inspiration, venue photos, and seasonality notes and the studio will translate them into a floral direction.' },
          { question: 'Do you handle setup and breakdown?', answer: 'Installation, strike, and rental coordination can be included in the floral scope.' },
        ],
        inquiry_questions: ['Estimated guest count', 'Color palette or inspiration', 'Install moments you care about'],
      },
    },
  },
  'dayof-sample-venue': {
    id: 'sample-venue',
    slug: 'dayof-sample-venue',
    vendor_name: 'Stonehouse Estate',
    descriptor: 'Historic estate venue with gardens, tented lawns, and guest flow',
    about: 'Stonehouse Estate hosts wedding weekends with a ceremony garden, indoor dinner space, and enough property detail to make logistics feel organized from arrival to sendoff.',
    hero_image_url: 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=1400&q=80',
    image_urls: [
      'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=900&q=80',
    ],
    instagram_url: null,
    website_url: 'https://example.com/stonehouse',
    contact_email: 'events@stonehouse.example',
    source_payload: {
      template_id: 'venue',
      sampleProfile: true,
      vendor_customization: {
        accent_id: 'sage',
        cta_label: 'Request a private tour',
        service_area: 'Full-property wedding weekends with indoor and outdoor rain plans',
        pricing_note: 'Site fee varies by season, guest count, and weekend scope.',
        proof_points: ['Ceremony garden', 'Rain plan ready', 'Guest parking'],
      },
    },
  },
  'dayof-sample-catering': {
    id: 'sample-catering',
    slug: 'dayof-sample-catering',
    vendor_name: 'Sage Table Catering',
    descriptor: 'Seasonal wedding menus, passed bites, late-night snacks, and polished bar support',
    about: 'Sage Table builds menus around regional ingredients, guest flow, and service timing, from welcome cocktails to family-style dinners and cake service coordination.',
    hero_image_url: 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=1400&q=80',
    image_urls: [
      'https://images.unsplash.com/photo-1555244162-803834f70033?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1551024506-0bccd828d307?auto=format&fit=crop&w=900&q=80',
    ],
    instagram_url: null,
    website_url: 'https://example.com/sage-table',
    contact_email: 'events@sagetable.example',
    source_payload: {
      template_id: 'food',
      sampleProfile: true,
      vendor_customization: {
        accent_id: 'champagne',
        cta_label: 'Request a tasting path',
        service_area: 'Cocktail hour, dinner service, dessert, bar, and late-night support',
        pricing_note: 'Menus are scoped by guest count, service style, rentals, and staffing.',
        proof_points: ['Seasonal menu', 'Service staffing', 'Bar coordination'],
      },
    },
  },
  'modern-events': {
    id: 'sample-modern-events',
    slug: 'modern-events',
    vendor_name: 'Modern Events',
    descriptor: 'Wedding planning, production calm, and polished event design',
    about: 'Modern Events pairs planning structure with a warm guest experience, covering logistics, vendor coordination, design direction, and wedding-weekend flow from kickoff through sendoff.',
    hero_image_url: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=1400&q=80',
    image_urls: [
      'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1520854221256-17451cc331bf?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1522673607200-164d1b6ce486?auto=format&fit=crop&w=900&q=80',
    ],
    instagram_url: 'https://instagram.com/modernevents',
    website_url: 'https://example.com/modern-events',
    contact_email: 'hello@modernevents.example',
    source_payload: {
      template_id: 'planner',
      sampleProfile: true,
      vendor_customization: {
        accent_id: 'sage',
        cta_label: 'Ask about your date',
        service_area: 'Weekend planning, production, and day-of support for modern celebrations',
        pricing_note: 'Planning scopes are tailored to guest count, event count, and logistics complexity.',
        proof_points: ['Weekend flow', 'Vendor coordination', 'Guest calm'],
      },
    },
  },
};

function canShowSampleVendorProfiles(): boolean {
  return import.meta.env.DEV || isVendorProfileCreationEnabled();
}

export function getSampleVendorProfileBySlug(slug: string): VendorProfile | null {
  if (!canShowSampleVendorProfiles()) return null;
  return SAMPLE_VENDOR_PROFILES[slug] ?? null;
}

function normalizeUrl(value: string | undefined): string | null {
  if (!value?.trim()) return null;
  const raw = value.trim();
  try {
    return new URL(raw.startsWith('http') ? raw : `https://${raw}`).toString();
  } catch {
    return null;
  }
}

function normalizeSlugPart(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

type VendorProfileRow = {
  id: string;
  slug: string;
  vendor_name: string;
  descriptor: string | null;
  about: string;
  hero_image_url: string | null;
  image_urls: unknown;
  instagram_url: string | null;
  website_url: string | null;
  contact_email: string | null;
  source_payload: Record<string, unknown> | null;
};

type VendorProfileInquiryRow = {
  id: string;
  vendor_profile_id: string;
  name: string;
  email: string;
  message: string;
  created_at: string;
  vendor_profiles?: {
    vendor_name?: string | null;
    slug?: string | null;
  } | null;
};

function normalizeVendorProfile(row: VendorProfileRow): VendorProfile {
  return {
    id: row.id,
    slug: row.slug,
    vendor_name: row.vendor_name,
    descriptor: row.descriptor ?? null,
    about: row.about,
    hero_image_url: row.hero_image_url ?? null,
    image_urls: Array.isArray(row.image_urls) ? row.image_urls.filter((item: unknown): item is string => typeof item === 'string') : [],
    instagram_url: row.instagram_url ?? null,
    website_url: row.website_url ?? null,
    contact_email: row.contact_email ?? null,
    source_payload: row.source_payload ?? null,
  };
}

function sanitizeVendorWebsiteUrl(value: unknown): string | null {
  const safeUrl = getSafePublicWebUrl(typeof value === 'string' ? value : '');
  if (!safeUrl) return null;

  try {
    const parsed = new URL(safeUrl);
    parsed.hash = '';
    return parsed.toString();
  } catch {
    return null;
  }
}

function sanitizeVendorInstagramUrl(value: unknown): string | null {
  const safeUrl = getSafePublicInstagramUrl(typeof value === 'string' ? value : '');
  return safeUrl || null;
}

function sanitizeVendorImageUrls(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  return value
    .map((item) => getSafePublicImageUrl(typeof item === 'string' ? item : ''))
    .filter((item) => {
      if (!item || seen.has(item)) return false;
      seen.add(item);
      return true;
    });
}

function sanitizeVendorContactEmail(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return getSafePublicEmailHref(trimmed) ? trimmed : null;
}

function sanitizeVendorProfileDraft(draft: VendorProfileDraft): VendorProfileDraft {
  return {
    ...draft,
    hero_image_url: getSafePublicImageUrl(draft.hero_image_url) || null,
    image_urls: sanitizeVendorImageUrls(draft.image_urls),
    instagram_url: sanitizeVendorInstagramUrl(draft.instagram_url),
    website_url: sanitizeVendorWebsiteUrl(draft.website_url),
    contact_email: sanitizeVendorContactEmail(draft.contact_email),
  };
}

function titleCaseWords(input: string): string {
  return input
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(' ');
}

function buildFallbackVendorProfileDraft(input: { vendorName: string; instagramUrl?: string; websiteUrl?: string }): VendorProfileDraft {
  const vendorName = titleCaseWords(input.vendorName.trim());
  const websiteUrl = sanitizeVendorWebsiteUrl(normalizeUrl(input.websiteUrl));
  const instagramUrl = sanitizeVendorInstagramUrl(input.instagramUrl);
  const websiteLabel = websiteUrl ? new URL(websiteUrl).hostname.replace(/^www\./, '') : null;

  return {
    slug: normalizeSlugPart(vendorName),
    vendor_name: vendorName,
    descriptor: websiteLabel ? `${websiteLabel} wedding vendor profile` : 'Wedding vendor profile',
    about: `${vendorName} is ready for a clean public vendor page with core links, a direct inquiry path, and room for polished images as the profile is refined.`,
    hero_image_url: null,
    image_urls: [],
    instagram_url: instagramUrl,
    website_url: websiteUrl,
    contact_email: null,
    source_payload: {
      sourceLabel: websiteLabel ?? 'manual entry',
      fallbackGenerated: true,
      websiteLabel,
    },
  };
}

export async function generateVendorProfileDraft(input: { vendorName: string; instagramUrl?: string; websiteUrl?: string }) {
  try {
    const { data, error } = await supabase.functions.invoke('vendor-profile-preview', {
      body: input,
    });
    if (error) throw error;
    return data as VendorProfileDraft;
  } catch (error) {
    if (!input.vendorName.trim() || (!input.instagramUrl?.trim() && !input.websiteUrl?.trim())) {
      throw error;
    }
    return buildFallbackVendorProfileDraft(input);
  }
}

export async function createVendorProfile(draft: VendorProfileDraft): Promise<VendorProfile> {
  const sanitizedDraft = sanitizeVendorProfileDraft(draft);
  const baseSlug = normalizeSlugPart(sanitizedDraft.slug || sanitizedDraft.vendor_name) || `vendor-${Date.now()}`;
  const { data, error } = await supabase.rpc('vendor_profile_write', {
    p_payload: { ...sanitizedDraft, slug: baseSlug },
  });

  if (error) throw error;
  return normalizeVendorProfile(data);
}

export async function getVendorProfileBySlug(slug: string): Promise<VendorProfile | null> {
  const sampleProfile = getSampleVendorProfileBySlug(slug);
  if (sampleProfile) return sampleProfile;

  const { data, error } = await supabase
    .from('vendor_profiles')
    .select(VENDOR_PROFILE_SELECT)
    .eq('slug', slug)
    .maybeSingle();
  if (error) throw error;
  return data ? normalizeVendorProfile(data as VendorProfileRow) : null;
}

export async function submitVendorInquiry(input: VendorProfileInquiryInput): Promise<void> {
  const { error } = await supabase.functions.invoke('vendor-profile-inquiry-submit', {
    body: input,
  });
  if (error) throw error;
}

function compactParts(parts: Array<string | null | undefined>, separator = ' & ') {
  return parts.map((item) => item?.trim()).filter(Boolean).join(separator);
}

function buildInquiryContextSummary(input: Omit<VendorInquiryContext, 'summary'>): string {
  const lines = [
    input.couple_names ? `Couple: ${input.couple_names}` : '',
    input.wedding_date ? `Wedding date: ${input.wedding_date}` : '',
    input.venue_name ? `Venue: ${input.venue_name}` : '',
    input.venue_location ? `Location: ${input.venue_location}` : '',
    input.site_slug ? `DayOf site: /${input.site_slug}` : '',
  ].filter(Boolean);
  return lines.join('\n');
}

export async function getMyVendorInquiryContext(): Promise<VendorInquiryContext | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  if (DEMO_MODE && user.id === 'demo-local-user') {
    const coupleNames = compactParts([demoWeddingSite.couple_name_1, demoWeddingSite.couple_name_2]);
    const context = {
      couple_names: coupleNames,
      wedding_date: demoWeddingSite.wedding_date ?? '',
      venue_name: demoWeddingSite.venue_name ?? '',
      venue_location: demoWeddingSite.venue_location ?? '',
      site_slug: demoWeddingSite.site_url ?? '',
      sender_name: coupleNames || user.user_metadata?.name || user.email || '',
      sender_email: user.email || '',
    };
    return { ...context, summary: buildInquiryContextSummary(context) };
  }

  const activeSite = await resolveActiveSiteForUser(user.id);
  if (!activeSite?.id) return null;

  const { data, error } = await supabase
    .from('wedding_sites')
    .select('couple_name_1, couple_name_2, wedding_date, venue_name, wedding_location, venue_address, site_slug')
    .eq('id', activeSite.id)
    .maybeSingle();
  if (error || !data) return null;

  const coupleNames = compactParts([data.couple_name_1 as string | null, data.couple_name_2 as string | null]);
  const context = {
    couple_names: coupleNames,
    wedding_date: (data.wedding_date as string | null) ?? '',
    venue_name: (data.venue_name as string | null) ?? '',
    venue_location: ((data.wedding_location as string | null) || (data.venue_address as string | null) || ''),
    site_slug: (data.site_slug as string | null) ?? '',
    sender_name: coupleNames || user.user_metadata?.name || user.email || '',
    sender_email: user.email || '',
  };
  return { ...context, summary: buildInquiryContextSummary(context) };
}

export async function listMyVendorProfileInquiries(limit = 8): Promise<VendorProfileInquiry[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const boundedLimit = Math.max(1, Math.min(Math.floor(limit), MAX_VENDOR_PROFILE_INQUIRIES));

  const { data, error } = await supabase
    .from('vendor_profile_inquiries')
    .select('id, vendor_profile_id, name, email, message, created_at, vendor_profiles!inner(vendor_name, slug, created_by)')
    .eq('vendor_profiles.created_by', user.id)
    .order('created_at', { ascending: false })
    .limit(boundedLimit);

  if (error) throw error;

  return ((data ?? []) as VendorProfileInquiryRow[]).map((row) => ({
    id: row.id,
    vendor_profile_id: row.vendor_profile_id,
    vendor_name: row.vendor_profiles?.vendor_name ?? 'Vendor',
    vendor_slug: row.vendor_profiles?.slug ?? '',
    name: row.name,
    email: row.email,
    message: row.message,
    created_at: row.created_at,
  }));
}
