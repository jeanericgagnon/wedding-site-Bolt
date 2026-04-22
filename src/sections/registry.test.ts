import { describe, expect, it } from 'vitest';
import { getAllSectionManifests, getSectionManifest } from '../builder/registry/sectionManifests';
import { resolveAndParse } from './registry';
import { getAllTemplates, getTemplate, TEMPLATE_REGISTRY } from '../templates/registry';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { getSectionComponent, getSectionVariants } from './sectionRegistry';
import { RegistryFundHighlight, RegistryGrid, RegistrySection } from './components/RegistrySection';

const EXPECTED_ALIAS_TARGETS: Array<{ type: string; variant: string; expectedResolvedVariant: string }> = [
  { type: 'venue', variant: 'banner', expectedResolvedVariant: 'splitMap' },
  { type: 'venue', variant: 'stacked', expectedResolvedVariant: 'detailsFirst' },
  { type: 'venue', variant: 'minimal', expectedResolvedVariant: 'card' },
  { type: 'directions', variant: 'illustrated', expectedResolvedVariant: 'split' },
  { type: 'directions', variant: 'multiVenue', expectedResolvedVariant: 'split' },
  { type: 'directions', variant: 'transport', expectedResolvedVariant: 'pin' },
  { type: 'directions', variant: 'fromHotel', expectedResolvedVariant: 'pin' },
  { type: 'registry', variant: 'fundHighlight', expectedResolvedVariant: 'featured' },
  { type: 'registry', variant: 'honeymoon', expectedResolvedVariant: 'featured' },
  { type: 'registry', variant: 'tabs', expectedResolvedVariant: 'cards' },
  { type: 'registry', variant: 'illustrated', expectedResolvedVariant: 'cards' },
  { type: 'registry', variant: 'minimal', expectedResolvedVariant: 'cards' },
  { type: 'registry', variant: 'experiences', expectedResolvedVariant: 'featured' },
  { type: 'registry', variant: 'luxury', expectedResolvedVariant: 'featured' },
];

describe('sections registry resolution', () => {
  it('resolves all supported variants for high-risk section types touched by recent fixes', () => {
    const guardedTypes = new Set(['gallery', 'venue', 'directions', 'registry']);
    const manifests = getAllSectionManifests().filter((m) => guardedTypes.has(m.type));

    for (const manifest of manifests) {
      for (const variant of manifest.supportedVariants) {
        const resolved = resolveAndParse(manifest.type, variant, {});
        expect(resolved, `unresolved ${manifest.type}:${variant}`).not.toBeNull();
      }
    }
  });

  it('keeps explicit alias fallback mappings stable for critical variants', () => {
    for (const { type, variant, expectedResolvedVariant } of EXPECTED_ALIAS_TARGETS) {
      const resolved = resolveAndParse(type, variant, {});
      expect(resolved, `unresolved alias ${type}:${variant}`).not.toBeNull();
      expect(resolved?.def.variant).toBe(expectedResolvedVariant);
    }
  });

  it('keeps strict variant rendering compatible with registry template aliases', () => {
    for (const { type, variant, expectedResolvedVariant } of EXPECTED_ALIAS_TARGETS.filter((entry) => entry.type === 'registry')) {
      const resolved = resolveAndParse(type, variant, {}, { strictVariant: true });
      expect(resolved, `strict unresolved alias ${type}:${variant}`).not.toBeNull();
      expect(resolved?.def.variant).toBe(expectedResolvedVariant);
    }
  });

  it('keeps registry owner and guest renders aligned when persisted registry variants drift in casing or punctuation', () => {
    expect(resolveAndParse('registry', ' Luxury ', {}, { strictVariant: true })?.def.variant).toBe('featured');
    expect(resolveAndParse('registry', 'fund-highlight', {}, { strictVariant: true })?.def.variant).toBe('featured');
    expect(resolveAndParse('registry', 'FUND.HIGHLIGHT', {}, { strictVariant: true })?.def.variant).toBe('featured');
    expect(resolveAndParse('registry', 'Playful', {}, { strictVariant: true })?.def.variant).toBe('cards');
  });

  it('keeps registry runtime resolution from crashing on malformed persisted variants', () => {
    expect(resolveAndParse('registry', undefined as never, {}, { strictVariant: true })?.def.variant).toBe('cards');
    expect(resolveAndParse('registry', null as never, {}, { strictVariant: true })?.def.variant).toBe('cards');
    expect(resolveAndParse('registry', { variant: 'featured' } as never, {}, { strictVariant: true })?.def.variant).toBe('cards');
  });

  it('exposes template-backed registry aliases to the builder manifest', () => {
    const registryManifest = getSectionManifest('registry');
    expect(registryManifest?.supportedVariants).toEqual(expect.arrayContaining(['default', 'grid', 'classic', 'luxury', 'experiences', 'modern', 'playful']));
    expect(registryManifest?.variantMeta.map((variant) => variant.id)).toEqual(expect.arrayContaining(['default', 'grid']));
    expect(registryManifest?.variantMeta[0]?.id).toBe('cards');
  });

  it('supports every registry variant used by shipped templates', () => {
    const registryManifest = getSectionManifest('registry');
    const templateVariants = Array.from(new Set(
      getAllTemplates()
        .flatMap((template) => template.defaultLayout.sections)
        .filter((section) => section.type === 'registry')
        .map((section) => section.variant)
    ));

    expect(registryManifest?.supportedVariants).toEqual(expect.arrayContaining(templateVariants));
  });

  it('keeps template registry imports isolated from later owner edits', () => {
    const importedTemplate = getTemplate('timeless-classic');
    const allTemplates = getAllTemplates();
    const importedRegistrySection = importedTemplate.defaultLayout.sections.find((section) => section.type === 'registry');
    const listedRegistrySection = allTemplates
      .find((template) => template.id === 'timeless-classic')
      ?.defaultLayout.sections.find((section) => section.type === 'registry');

    expect(importedRegistrySection).toBeDefined();
    expect(listedRegistrySection).toBeDefined();
    expect(importedRegistrySection).not.toBe(listedRegistrySection);

    importedRegistrySection!.variant = 'featured';
    importedRegistrySection!.settings = { title: 'Edited after import' };

    expect(getTemplate('timeless-classic').defaultLayout.sections.find((section) => section.type === 'registry')?.variant).toBe('cards');
    expect(getAllTemplates()
      .find((template) => template.id === 'timeless-classic')
      ?.defaultLayout.sections.find((section) => section.type === 'registry')?.settings).toEqual({});
  });

  it('keeps imported registry template variants normalized onto guest-visible layouts', () => {
    const importedTemplate = getTemplate('luxury-opulent');
    const importedRegistrySection = importedTemplate.defaultLayout.sections.find((section) => section.type === 'registry');

    expect(importedRegistrySection?.variant).toBe('featured');
    expect(TEMPLATE_REGISTRY['luxury-opulent']?.defaultLayout.sections.find((section) => section.type === 'registry')?.variant).toBe('featured');
    expect(getAllTemplates()
      .find((template) => template.id === 'timeless-classic')
      ?.defaultLayout.sections.find((section) => section.type === 'registry')?.variant).toBe('cards');
  });

  it('keeps imported registry template bindings and overrides isolated from later edits', () => {
    const importedTemplate = getTemplate('registry-wish-focused');
    const importedRegistrySection = importedTemplate.defaultLayout.sections.find((section) => section.type === 'registry');

    expect(importedRegistrySection).toBeDefined();

    importedRegistrySection!.bindings = { linkIds: ['gift-1'] };
    importedRegistrySection!.settings = { nested: { title: 'Edited title' } };
    importedRegistrySection!.overrides = { cards: [{ id: 'gift-1' }] };

    const freshRegistrySection = getTemplate('registry-wish-focused').defaultLayout.sections.find((section) => section.type === 'registry');
    expect(freshRegistrySection?.bindings).toEqual({});
    expect(freshRegistrySection?.settings).toEqual({});
    expect(freshRegistrySection?.overrides).toBeUndefined();
  });

  it('keeps template registry aliases isolated from each other during import edits', () => {
    TEMPLATE_REGISTRY.classic.defaultLayout.sections.find((section) => section.type === 'registry')!.settings = { title: 'Mutated alias' };

    expect(TEMPLATE_REGISTRY.base.defaultLayout.sections.find((section) => section.type === 'registry')?.settings).toEqual({});
    expect(TEMPLATE_REGISTRY['timeless-classic'].defaultLayout.sections.find((section) => section.type === 'registry')?.settings).toEqual({});
  });

  it('keeps every shipped template registry variant renderable in the legacy runtime', () => {
    const templateVariants = Array.from(new Set(
      getAllTemplates()
        .flatMap((template) => template.defaultLayout.sections)
        .filter((section) => section.type === 'registry')
        .map((section) => section.variant)
    ));

    for (const variant of templateVariants) {
      expect(getSectionVariants('registry')).toContain(variant);
      expect(getSectionComponent('registry', variant)).toBeTypeOf('function');
    }
  });

  it('keeps the builder lab registry variant picker aligned with shipped template aliases', () => {
    const builderLab = readFileSync(resolve(__dirname, '../pages/BuilderV2Lab.tsx'), 'utf8');
    expect(builderLab).toContain("registry: ['default', 'cards', 'grid', 'fundHighlight', 'featured', 'minimal', 'honeymoon', 'tabs', 'illustrated', 'classic', 'luxury', 'experiences', 'modern', 'playful']");
  });

  it('keeps the builder lab variant commands aligned with shipped registry aliases', () => {
    const builderLab = readFileSync(resolve(__dirname, '../pages/BuilderV2Lab.tsx'), 'utf8');
    expect(builderLab).toContain("['default', 'countdown', 'timeline', 'dayTabs', 'localGuide', 'iconGrid', 'cards', 'grid', 'fundHighlight', 'featured', 'minimal', 'honeymoon', 'tabs', 'illustrated', 'classic', 'luxury', 'experiences', 'modern', 'playful']");
  });

  it('keeps legacy section registry aligned with public registry aliases', () => {
    expect(getSectionVariants('registry')).toEqual(expect.arrayContaining(['cards', 'featured', 'minimal', 'honeymoon', 'tabs', 'illustrated', 'classic', 'luxury', 'experiences', 'modern', 'playful', 'default', 'grid', 'fundHighlight']));
    expect(getSectionVariants('registry')[0]).toBe('cards');
    expect(getSectionComponent('registry', 'default')).toBe(RegistryGrid);
    expect(getSectionComponent('registry', 'classic')).toBe(RegistryGrid);
    expect(getSectionComponent('registry', 'luxury')).toBe(RegistryFundHighlight);
    expect(getSectionComponent('registry', 'cards')).toBe(RegistryGrid);
    expect(getSectionComponent('registry', 'minimal')).toBe(RegistryGrid);
    expect(getSectionComponent('registry', 'tabs')).toBe(RegistryGrid);
    expect(getSectionComponent('registry', 'illustrated')).toBe(RegistryGrid);
    expect(getSectionComponent('registry', 'featured')).toBe(RegistryFundHighlight);
  });

  it('keeps every builder-supported registry variant renderable in the legacy runtime', () => {
    const registryManifest = getSectionManifest('registry');

    for (const variant of registryManifest?.supportedVariants ?? []) {
      expect(getSectionVariants('registry')).toContain(variant);
      expect(getSectionComponent('registry', variant)).toBeTypeOf('function');
    }
  });

  it('keeps legacy registry variant ordering aligned with builder-first public layouts', () => {
    const registryManifest = getSectionManifest('registry');
    const publicVariantOrder = (registryManifest?.variantMeta ?? []).map((variant) => variant.id);

    expect(getSectionVariants('registry').slice(0, publicVariantOrder.length)).toEqual(publicVariantOrder);
  });

  it('keeps site view registry fallback normalization aligned with public registry aliases', () => {
    const siteView = readFileSync(resolve(__dirname, '../pages/SiteView.tsx'), 'utf8');
    expect(siteView).toContain("registry: {");
    expect(siteView).toContain("default: 'cards'");
    expect(siteView).toContain("fundHighlight: 'featured'");
    expect(siteView).toContain("luxury: 'featured'");
    expect(siteView).toContain("modern: 'cards'");
    expect(siteView).toContain("const nextVariant = fallbackMap[section.type]?.[section.variant] ?? supported[0] ?? 'default';");
  });

  it('keeps registry proof output explicit about remaining runtime truth work', () => {
    const registryProof = readFileSync(resolve(__dirname, '../../scripts/v1-proof-registry.mjs'), 'utf8');
    expect(registryProof).toContain("status: 'manual-proof-pending'");
    expect(registryProof).toContain("highestRiskTrustGap: 'runtime_registry_truth_after_real_edits'");
    expect(registryProof).toContain("secondaryTrustGap: 'registry_repair_and_import_persistence_manual_verification_missing'");
    expect(registryProof).toContain('manualProofRequired: true');
    expect(registryProof).toContain("truthGateSummary: 'automation_green_manual_truth_red'");
    expect(registryProof).toContain('manualProofRequirements: [');
    expect(registryProof).toContain("'owner_manage_import_persistence_runtime_pass'");
    expect(registryProof).toContain("'owner_repair_cleanup_runtime_pass'");
    expect(registryProof).toContain("'guest_visible_purchase_truth_runtime_pass'");
  });

  it('keeps builder registry compatibility tolerant of persisted trim casing and punctuation drift', () => {
    const compatibility = readFileSync(resolve(__dirname, '../lib/sectionVariantCompatibility.ts'), 'utf8');
    const compatibilityTest = readFileSync(resolve(__dirname, '../lib/sectionVariantCompatibility.test.ts'), 'utf8');
    expect(compatibility).toContain('export function resolveBuilderVariant(type: SectionType, variant: unknown): string {');
    expect(compatibility).toContain("const normalizeVariantKey = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '');");
    expect(compatibility).toContain("const normalizedVariant = typeof variant === 'string' ? variant.trim() : '';");
    expect(compatibility).toContain('const supportedByKey = new Map');
    expect(compatibility).toContain('const canonicalVariant = supportedByKey.get(normalizedVariantKey) ?? normalizedVariant;');
    expect(compatibility).toContain("Object.entries(aliases).find(([aliasVariant]) => normalizeVariantKey(aliasVariant) === normalizedVariantKey)?.[1]");
    expect(compatibility).toContain("function getPreferredBuilderFallbackVariant(type: SectionType, supported: string[]): string {");
    expect(compatibility).toContain("if (type === 'registry') return supported.includes('cards') ? 'cards' : supported[0] ?? 'default';");
    expect(compatibilityTest).toContain("expect(resolveBuilderVariant('registry', '   ')).toBe('cards');");
    expect(compatibilityTest).toContain("expect(resolveBuilderVariant('registry', 'not-a-real-variant')).toBe('cards');");
    expect(compatibilityTest).toContain("expect(resolveBuilderVariant('registry', undefined as never)).toBe('cards');");
    expect(compatibilityTest).toContain("expect(resolveBuilderVariant('travel', { variant: 'localGuide' } as never)).toBe('default');");
    expect(compatibilityTest).toContain("expect(resolveBuilderVariant('registry', ' FEATURED ')).toBe('featured');");
    expect(compatibilityTest).toContain("expect(resolveBuilderVariant('registry', 'Experiences')).toBe('experiences');");
    expect(compatibilityTest).toContain("expect(resolveBuilderVariant('registry', 'fund-highlight')).toBe('fundHighlight');");
    expect(compatibilityTest).toContain("expect(resolveBuilderVariant('registry', 'fund.highlight')).toBe('fundHighlight');");
  });

  it('keeps runtime registry resolution tolerant of persisted trim casing and punctuation drift', () => {
    const sectionRegistry = readFileSync(resolve(__dirname, './registry.ts'), 'utf8');
    expect(sectionRegistry).toContain("function normalizeRegistryVariantKey(variant: unknown): string {");
    expect(sectionRegistry).toContain("return typeof variant === 'string'");
    expect(sectionRegistry).toContain("const normalizedVariant = resolveRegistryVariant(type, variant);");
    expect(sectionRegistry).toContain("normalizeRegistryVariantKey(aliasVariant) === normalizedVariantKey");
  });

  it('keeps legacy public registry surfaces from falling back to stale links after live loads', () => {
    const registrySectionComponent = readFileSync(resolve(__dirname, './components/RegistrySection.tsx'), 'utf8');
    expect(registrySectionComponent).toContain('export function shouldUseLiveRegistryItems(items: RegistryItem[] | null): items is RegistryItem[] {');
    expect(registrySectionComponent).toContain('if (shouldUseLiveRegistryItems(items)) {');
  });

  it('keeps public purchaser status aligned with owner purchase state truth', () => {
    const registrySectionComponent = readFileSync(resolve(__dirname, './components/RegistrySection.tsx'), 'utf8');
    expect(registrySectionComponent).toContain("export function getRegistryPurchaserStatusLabel(item: Pick<RegistryItem, 'purchase_status' | 'purchaser_name'>): string | null {");
    expect(registrySectionComponent).toContain("if (!item.purchaser_name || item.purchase_status === 'available') return null;");
    expect(registrySectionComponent).toContain("? `Purchased by ${item.purchaser_name}`");
  });

  it('keeps template registry definitions cloned before import/edit flows mutate them', () => {
    const templateRegistrySource = readFileSync(resolve(__dirname, '../templates/registry.ts'), 'utf8');
    expect(templateRegistrySource).toContain('const REGISTRY_VARIANT_ALIASES: Record<string, string> = {');
    expect(templateRegistrySource).toContain('function cloneTemplateValue<T>(value: T): T {');
    expect(templateRegistrySource).toContain("templateRegistry.map((template) => [template.id, cloneTemplateDefinition(template)])");
    expect(templateRegistrySource).toContain("base: cloneTemplateDefinition(templateById['timeless-classic'] ?? templateRegistry[0]),");
    expect(templateRegistrySource).toContain("variant: section.type === 'registry' && typeof section.variant === 'string'");
    expect(templateRegistrySource).toContain('bindings: cloneTemplateValue(section.bindings ?? {}),');
    expect(templateRegistrySource).toContain('settings: cloneTemplateValue(section.settings ?? {}),');
    expect(templateRegistrySource).toContain('overrides: cloneTemplateValue(section.overrides ?? undefined),');
    expect(templateRegistrySource).toContain('function cloneTemplateDefinition(template: TemplateDefinition): TemplateDefinition {');
    expect(templateRegistrySource).toContain('return cloneTemplateDefinition(TEMPLATE_REGISTRY[templateId] || TEMPLATE_REGISTRY.base || templateRegistry[0]);');
    expect(templateRegistrySource).toContain('return templateRegistry.map(cloneTemplateDefinition);');
  });
});
