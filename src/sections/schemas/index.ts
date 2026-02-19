import { z } from 'zod';

export const SectionTypeSchema = z.enum([
  'hero',
  'story',
  'venue',
  'schedule',
  'travel',
  'registry',
  'faq',
  'rsvp',
  'gallery',
  'countdown',
  'weddingParty',
  'dressCode',
  'accommodations',
  'contact',
  'footerCta',
  'wedding-party',
  'dress-code',
  'footer-cta',
]);

export type SectionTypeValue = z.infer<typeof SectionTypeSchema>;

export const StyleOverridesSchema = z.object({
  backgroundColor: z.string().optional(),
  textColor: z.string().optional(),
  paddingTop: z.string().optional(),
  paddingBottom: z.string().optional(),
  fontFamily: z.string().optional(),
  customCss: z.string().optional(),
}).default({});

export const SectionBindingsSchema = z.object({
  venueIds: z.array(z.string()).optional(),
  scheduleItemIds: z.array(z.string()).optional(),
  linkIds: z.array(z.string()).optional(),
  faqIds: z.array(z.string()).optional(),
  mediaAssetIds: z.array(z.string()).optional(),
}).default({});

export const PersistedSectionSchema = z.object({
  id: z.string(),
  site_id: z.string(),
  type: z.string(),
  variant: z.string().default('default'),
  data: z.record(z.string(), z.unknown()).default({}),
  order: z.number().int().nonnegative().default(0),
  visible: z.boolean().default(true),
  schema_version: z.number().int().positive().default(1),
  style_overrides: StyleOverridesSchema,
  bindings: SectionBindingsSchema,
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

export type PersistedSection = z.infer<typeof PersistedSectionSchema>;

export function parseSection(raw: unknown): PersistedSection | null {
  const result = PersistedSectionSchema.safeParse(raw);
  return result.success ? result.data : null;
}

export function parseSections(raw: unknown[]): PersistedSection[] {
  return raw.map(r => parseSection(r)).filter((s): s is PersistedSection => s !== null);
}
