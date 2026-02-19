import { z, ZodSchema } from 'zod';

export interface SectionInstance {
  id: string;
  type: string;
  variant: string;
  data: Record<string, unknown>;
  order: number;
  visible: boolean;
  schemaVersion: number;
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

export function parseSectionData<T>(
  schema: ZodSchema<T>,
  raw: Record<string, unknown>,
  defaultData: T
): T {
  const result = schema.safeParse({ ...defaultData, ...raw });
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
