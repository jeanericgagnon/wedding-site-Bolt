export type CanonicalSectionVariantDefinition = {
  componentKey: string;
  schemaKey?: string;
  defaults?: Record<string, unknown>;
  label?: string;
  description?: string;
};

export type CanonicalSectionDefinition = {
  type: string;
  defaultVariant: string;
  variants: Record<string, CanonicalSectionVariantDefinition>;
};

const LEGACY_VARIANT_ALIASES: Record<string, Record<string, string>> = {
  venue: { default: 'card' },
  schedule: { default: 'timeline', classic: 'timeline', cards: 'agendaCards' },
  gallery: { default: 'masonry', grid: 'masonry' },
  travel: { cards: 'list', default: 'list' },
  registry: { grid: 'cards', default: 'cards' },
};

export type BuilderManifestLike = {
  type: string;
  defaultVariant: string;
  supportedVariants: string[];
  variantMeta?: Array<{ id: string; label?: string; description?: string }>;
  settingsSchema?: { fields?: Array<{ key: string; defaultValue?: unknown }> };
};

export const manifestToCanonicalSectionDefinition = (
  manifest: BuilderManifestLike
): CanonicalSectionDefinition => {
  const defaults = Object.fromEntries(
    (manifest.settingsSchema?.fields ?? [])
      .filter((field) => field.defaultValue !== undefined)
      .map((field) => [field.key, field.defaultValue])
  );

  const declaredVariants = Object.fromEntries(
    manifest.supportedVariants.map((variantId) => {
      const meta = manifest.variantMeta?.find((item) => item.id === variantId);
      return [
        variantId,
        {
          componentKey: `${manifest.type}:${variantId}`,
          schemaKey: `${manifest.type}:settings`,
          defaults,
          label: meta?.label,
          description: meta?.description,
        },
      ];
    })
  );

  const aliasVariants = Object.fromEntries(
    Object.entries(LEGACY_VARIANT_ALIASES[manifest.type] ?? {})
      .filter(([, target]) => Boolean(declaredVariants[target]))
      .map(([alias, target]) => [alias, declaredVariants[target]])
  );

  return {
    type: manifest.type,
    defaultVariant: manifest.defaultVariant,
    variants: { ...declaredVariants, ...aliasVariants },
  };
};
