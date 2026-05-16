import { z, ZodSchema } from 'zod';

export interface SectionInstance {
  id: string;
  type: string;
  variant: string;
  data?: Record<string, unknown>;
  order?: number;
  visible?: boolean;
  schemaVersion?: number;
  enabled?: boolean;
  settings?: Record<string, unknown>;
  bindings?: {
    venueIds?: string[];
    scheduleItemIds?: string[];
    linkIds?: string[];
    faqIds?: string[];
  };
}

export interface SectionDefinition<T = Record<string, unknown>> {
  type: string;
  variant: string;
  schema: ZodSchema<T>;
  defaultData: T;
  Component: React.FC<SectionComponentProps<T>>;
}

export interface SectionComponentProps<T = Record<string, unknown>> {
  data: T;
  siteSlug?: string;
}

const HEADING_FALLBACK_KEYS = new Set([
  'headline',
  'title',
  'dressCodeLabel',
  'bridalTitle',
  'groomTitle',
]);

function shouldRestoreDefaultStringForKey(key: string, value: unknown, defaultValue: unknown): boolean {
  return HEADING_FALLBACK_KEYS.has(key)
    && typeof value === 'string'
    && value.trim().length === 0
    && typeof defaultValue === 'string'
    && defaultValue.trim().length > 0;
}

function normalizeSectionRawData<T>(raw: Record<string, unknown>, defaultData: T): Record<string, unknown> {
  const normalized = { ...raw };
  if (!defaultData || typeof defaultData !== 'object' || Array.isArray(defaultData)) return normalized;

  Object.entries(defaultData as Record<string, unknown>).forEach(([key, defaultValue]) => {
    if (shouldRestoreDefaultStringForKey(key, normalized[key], defaultValue)) {
      delete normalized[key];
    }
  });

  return normalized;
}

export function parseSectionData<T>(
  schema: ZodSchema<T>,
  raw: Record<string, unknown>,
  defaultData: T
): T {
  const result = schema.safeParse({ ...defaultData, ...normalizeSectionRawData(raw, defaultData) });
  return result.success ? result.data : defaultData;
}

export const SectionInstanceSchema = z.object({
  id: z.string(),
  type: z.string(),
  variant: z.string().default('default'),
  data: z.record(z.string(), z.unknown()).default({}),
  order: z.number().int().nonnegative().default(0),
  visible: z.boolean().default(true),
  schemaVersion: z.number().int().positive().default(1),
});
