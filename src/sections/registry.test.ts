import { describe, expect, it } from 'vitest';
import { getAllSectionManifests, getSectionManifest } from '../builder/registry/sectionManifests';
import { getDefinition, getVariantsForType, resolveAndParse } from './registry';
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
    expect(resolveAndParse('Registry', 'luxury', {}, { strictVariant: true })?.def.variant).toBe('featured');
    expect(resolveAndParse('registry-section' as never, 'default', {}, { strictVariant: true })?.def.variant).toBe('cards');
    expect(resolveAndParse('RegistrySection' as never, 'default', {}, { strictVariant: true })?.def.variant).toBe('cards');
    expect(getDefinition('RegistrySection' as never, 'cards')?.variant).toBe('cards');
    expect(getDefinition('registry-section' as never, 'default' as never)?.variant).toBe('cards');
    expect(getDefinition('Registry' as never, 'luxury' as never)?.variant).toBe('featured');
    expect(getVariantsForType('registry-section' as never).map((definition) => definition.variant)).toEqual(expect.arrayContaining(['cards', 'featured']));
    expect(resolveAndParse('registry', 'default', {}, { strictVariant: true })?.def.variant).toBe('cards');
    expect(resolveAndParse('registry', 'grid', {}, { strictVariant: true })?.def.variant).toBe('cards');
    expect(resolveAndParse('registry', ' Luxury ', {}, { strictVariant: true })?.def.variant).toBe('featured');
    expect(resolveAndParse('registry', 'fund-highlight', {}, { strictVariant: true })?.def.variant).toBe('featured');
    expect(resolveAndParse('registry', 'FUND.HIGHLIGHT', {}, { strictVariant: true })?.def.variant).toBe('featured');
    expect(resolveAndParse('registry', 'Playful', {}, { strictVariant: true })?.def.variant).toBe('cards');
  });

  it('keeps registry runtime resolution from crashing on malformed persisted variants', () => {
    expect(resolveAndParse('registry', undefined as never, {}, { strictVariant: true })?.def.variant).toBe('cards');
    expect(resolveAndParse('registry', null as never, {}, { strictVariant: true })?.def.variant).toBe('cards');
    expect(resolveAndParse('registry', { variant: 'featured' } as never, {}, { strictVariant: true })?.def.variant).toBe('cards');
    expect(resolveAndParse('registry', 'legacy-default', {}, { strictVariant: true })?.def.variant).toBe('cards');
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

  it('keeps malformed imported registry template variants from leaking past cards fallback', () => {
    const baseRegistrySection = TEMPLATE_REGISTRY.base.defaultLayout.sections.find((section) => section.type === 'registry');
    expect(baseRegistrySection).toBeDefined();

    const originalVariant = baseRegistrySection?.variant;
    TEMPLATE_REGISTRY.base.defaultLayout.sections.find((section) => section.type === 'registry')!.variant = undefined as never;

    expect(getTemplate('base').defaultLayout.sections.find((section) => section.type === 'registry')?.variant).toBe('cards');

    TEMPLATE_REGISTRY.base.defaultLayout.sections.find((section) => section.type === 'registry')!.variant = originalVariant;
  });

  it('keeps unknown imported registry template variants from leaking past cards fallback', () => {
    const baseRegistrySection = TEMPLATE_REGISTRY.base.defaultLayout.sections.find((section) => section.type === 'registry');
    expect(baseRegistrySection).toBeDefined();

    const originalVariant = baseRegistrySection?.variant;
    TEMPLATE_REGISTRY.base.defaultLayout.sections.find((section) => section.type === 'registry')!.variant = 'legacy-default';

    expect(getTemplate('base').defaultLayout.sections.find((section) => section.type === 'registry')?.variant).toBe('cards');

    TEMPLATE_REGISTRY.base.defaultLayout.sections.find((section) => section.type === 'registry')!.variant = originalVariant;
  });

  it('keeps drifted registry template section types normalized for guest-visible imports', () => {
    const baseRegistrySection = TEMPLATE_REGISTRY.base.defaultLayout.sections.find((section) => section.type === 'registry');
    expect(baseRegistrySection).toBeDefined();

    const originalType = baseRegistrySection?.type;
    TEMPLATE_REGISTRY.base.defaultLayout.sections.find((section) => section.type === 'registry')!.type = 'Registry' as never;

    const importedRegistrySection = getTemplate('base').defaultLayout.sections.find((section) => section.type === 'registry');
    expect(importedRegistrySection?.type).toBe('registry');
    expect(importedRegistrySection?.variant).toBe('cards');

    TEMPLATE_REGISTRY.base.defaultLayout.sections.find((section) => section.type === 'Registry')!.type = originalType as never;
  });

  it('keeps drifted registry-section template types normalized for guest-visible imports', () => {
    const baseRegistrySection = TEMPLATE_REGISTRY.base.defaultLayout.sections.find((section) => section.type === 'registry');
    expect(baseRegistrySection).toBeDefined();

    const originalType = baseRegistrySection?.type;
    TEMPLATE_REGISTRY.base.defaultLayout.sections.find((section) => section.type === 'registry')!.type = 'registry-section' as never;

    const importedRegistrySection = getTemplate('base').defaultLayout.sections.find((section) => section.type === 'registry');
    expect(importedRegistrySection?.type).toBe('registry');
    expect(importedRegistrySection?.variant).toBe('cards');

    TEMPLATE_REGISTRY.base.defaultLayout.sections.find((section) => section.type === 'registry-section')!.type = originalType as never;
  });

  it('keeps legacy registry template variants normalized onto guest-visible cards', () => {
    const baseRegistrySection = TEMPLATE_REGISTRY.base.defaultLayout.sections.find((section) => section.type === 'registry');
    expect(baseRegistrySection).toBeDefined();

    const originalVariant = baseRegistrySection?.variant ?? 'cards';
    TEMPLATE_REGISTRY.base.defaultLayout.sections.find((section) => section.type === 'registry')!.variant = 'grid';

    expect(getTemplate('base').defaultLayout.sections.find((section) => section.type === 'registry')?.variant).toBe('cards');

    TEMPLATE_REGISTRY.base.defaultLayout.sections.find((section) => section.type === 'registry')!.variant = originalVariant;
  });

  it('keeps persisted template ids resolving cleanly through import edits', () => {
    expect(getTemplate(' Base ').id).toBe('timeless-classic');
    expect(getTemplate('TIMELESS_CLASSIC').id).toBe('timeless-classic');
    expect(getTemplate('Playful Celebration').id).toBe('playful-celebration');
    expect(getTemplate('EDITORIAL').id).toBe('editorial-impact');
    expect(getTemplate(undefined as never).id).toBe('timeless-classic');
    expect(getTemplate({ templateId: 'base' } as never).id).toBe('timeless-classic');
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
    expect(builderLab).toContain("const isRegistryBuilderSectionType = (type: string) => {");
    expect(builderLab).toContain("return normalizedType === 'registry' || normalizedType.startsWith('registrysection');");
    expect(builderLab).toContain("{isRegistryBuilderSectionType(selected.type) && (");
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
    expect(registryProof).toContain("evidenceLogPath: 'docs/v1-smoke-proof-log.md'");
    expect(registryProof).toContain("manualProofStatus: 'pending_runtime_registry_notes'");
    expect(registryProof).toContain('manualProofRequirements: [');
    expect(registryProof).toContain("'owner_manage_import_persistence_runtime_pass'");
    expect(registryProof).toContain("'owner_repair_cleanup_runtime_pass'");
    expect(registryProof).toContain("'guest_visible_purchase_truth_runtime_pass'");
    expect(registryProof).toContain('manualProofBlockingReasons: {');
    expect(registryProof).toContain("owner_manage_import_persistence_runtime_pass: 'real owner add/import/edit persistence notes are not logged yet'");
    expect(registryProof).toContain("owner_repair_cleanup_runtime_pass: 'repair or cleanup runtime notes are not logged yet'");
    expect(registryProof).toContain("guest_visible_purchase_truth_runtime_pass: 'guest-visible purchase-state notes after owner edits are not logged yet'");
  });

  it('keeps builder registry compatibility tolerant of persisted trim casing and punctuation drift', () => {
    const compatibility = readFileSync(resolve(__dirname, '../lib/sectionVariantCompatibility.ts'), 'utf8');
    const compatibilityTest = readFileSync(resolve(__dirname, '../lib/sectionVariantCompatibility.test.ts'), 'utf8');
    expect(compatibility).toContain('export function resolveBuilderVariant(type: SectionType, variant: unknown): string {');
    expect(compatibility).toContain("const normalizeVariantKey = (value: unknown) => typeof value === 'string'");
    expect(compatibility).toContain("const normalizedVariant = typeof variant === 'string' ? variant.trim() : '';");
    expect(compatibility).toContain('const supportedByKey = new Map');
    expect(compatibility).toContain('const canonicalVariant = supportedByKey.get(normalizedVariantKey) ?? normalizedVariant;');
    expect(compatibility).toContain("Object.entries(aliases).find(([aliasVariant]) => normalizeVariantKey(aliasVariant) === normalizedVariantKey)?.[1]");
    expect(compatibility).toContain("function getPreferredBuilderFallbackVariant(type: SectionType, supported: string[]): string {");
    expect(compatibility).toContain("function normalizeBuilderSectionType(type: SectionType): SectionType {");
    expect(compatibility).toContain("const normalizedType = normalizeBuilderSectionType(type);");
    expect(compatibility).toContain("if (normalizedType === 'registry') return supported.includes('cards') ? 'cards' : supported[0] ?? 'default';");
    expect(compatibilityTest).toContain("expect(resolveBuilderVariant('registry', '   ')).toBe('cards');");
    expect(compatibilityTest).toContain("expect(resolveBuilderVariant('registry', 'not-a-real-variant')).toBe('cards');");
    expect(compatibilityTest).toContain("expect(resolveBuilderVariant('registry', undefined as never)).toBe('cards');");
    expect(compatibilityTest).toContain("expect(resolveBuilderVariant('registry', ['featured'] as never)).toBe('cards');");
    expect(compatibilityTest).toContain("expect(resolveBuilderVariant('registry-section' as never, 'luxury')).toBe('luxury');");
    expect(compatibilityTest).toContain("expect(resolveBuilderVariant('registry-section' as never, 'not-a-real-variant')).toBe('cards');");
    expect(compatibilityTest).toContain("expect(resolveBuilderVariant('travel', { variant: 'localGuide' } as never)).toBe('default');");
    expect(compatibilityTest).toContain("expect(resolveBuilderVariant('registry', ' FEATURED ')).toBe('featured');");
    expect(compatibilityTest).toContain("expect(resolveBuilderVariant('registry', 'Experiences')).toBe('experiences');");
    expect(compatibilityTest).toContain("expect(resolveBuilderVariant('registry', 'fund-highlight')).toBe('fundHighlight');");
    expect(compatibilityTest).toContain("expect(resolveBuilderVariant('registry', 'fund.highlight')).toBe('fundHighlight');");
  });

  it('keeps runtime registry resolution tolerant of persisted trim casing and punctuation drift', () => {
    const sectionRegistry = readFileSync(resolve(__dirname, './registry.ts'), 'utf8');
    const previewSource = readFileSync(resolve(__dirname, '../builder/registry/variantPreviewSource.ts'), 'utf8');
    const weddingDataAdapter = readFileSync(resolve(__dirname, '../builder/adapters/weddingDataAdapter.ts'), 'utf8');
    const canonicalMapper = readFileSync(resolve(__dirname, '../lib/aiCanonicalContentMapper.ts'), 'utf8');
    const weddingDataBindings = readFileSync(resolve(__dirname, '../render/weddingDataBindings.ts'), 'utf8');
    const guidedBuilderModules = readFileSync(resolve(__dirname, '../components/dashboard/GuidedBuilderModules.tsx'), 'utf8');
    expect(sectionRegistry).toContain("function normalizeRegistryVariantKey(variant: unknown): string {");
    expect(sectionRegistry).toContain("function isRegistrySectionType(type: unknown): boolean {");
    expect(sectionRegistry).toContain("function normalizeRegistrySectionType(type: unknown): string {");
    expect(sectionRegistry).toContain("return normalizedType === 'registry' || normalizedType.startsWith('registrysection');");
    expect(sectionRegistry).toContain("return SECTION_REGISTRY.get(makeKey(normalizeRegistrySectionType(type), resolveRegistryVariant(type, variant))) ?? null;");
    expect(sectionRegistry).toContain("return typeof variant === 'string'");
    expect(sectionRegistry).toContain("const normalizedType = normalizeRegistrySectionType(type);");
    expect(sectionRegistry).toContain("const normalizedTypeKey = normalizeRegistrySectionType(type);");
    expect(sectionRegistry).toContain("const normalizedVariant = resolveRegistryVariant(type, variant);");
    expect(sectionRegistry).toContain("'registry-section': 'registry',");
    expect(sectionRegistry).toContain("default: 'cards'");
    expect(sectionRegistry).toContain("grid: 'cards'");
    expect(sectionRegistry).toContain("return registryAliasTarget ?? 'cards';");
    expect(sectionRegistry).toContain("normalizeRegistryVariantKey(aliasVariant) === normalizedVariantKey)?.[1]");
    expect(previewSource).toContain('function isRegistryPreviewSectionType(type: string): boolean {');
    expect(previewSource).toContain("return normalizedType === 'registry' || normalizedType.startsWith('registrysection');");
    expect(weddingDataAdapter).toContain("function normalizeBuilderBindingSectionType(type: BuilderSectionInstance['type']): BuilderSectionInstance['type'] {");
    expect(weddingDataAdapter).toContain("return (normalizedType === 'registrysection' ? 'registry' : type) as BuilderSectionInstance['type'];");
    expect(canonicalMapper).toContain("const normalizedType = type.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');");
    expect(canonicalMapper).toContain("case 'registrysection':");
    expect(weddingDataBindings).toContain('function normalizeBindableSectionType(type: string): string {');
    expect(weddingDataBindings).toContain("return normalizedType === 'registrysection' ? 'registry' : type;");
    expect(guidedBuilderModules).toContain("const normalizeModuleSectionType = (type: string) => type.trim().toLowerCase().replace(/[^a-z0-9]/g, '');");
    expect(guidedBuilderModules).toContain("normalizeModuleSectionType(s.type) === normalizeModuleSectionType(sectionType)");
  });

  it('keeps legacy public registry surfaces from falling back to stale links after live loads', () => {
    const registrySectionComponent = readFileSync(resolve(__dirname, './components/RegistrySection.tsx'), 'utf8');
    const registryCards = readFileSync(resolve(__dirname, './variants/registry/cards.tsx'), 'utf8');
    const registryFeatured = readFileSync(resolve(__dirname, './variants/registry/featured.tsx'), 'utf8');
    expect(registrySectionComponent).toContain('export function shouldUseLiveRegistryItems(items: RegistryItem[] | null): items is RegistryItem[] {');
    expect(registrySectionComponent).toContain('if (shouldUseLiveRegistryItems(items)) {');
    expect(registrySectionComponent).toContain('export function normalizePublicRegistryItemState(item: RegistryItem): RegistryItem {');
    expect(registrySectionComponent).toContain('purchase_status: quantityState.purchaseStatus,');
    expect(registrySectionComponent).toContain("purchaser_name: quantityState.purchaseStatus === 'available' ? null : item.purchaser_name,");
    expect(registrySectionComponent).toContain('getRegistryEmptyStateMessage(normalizedItems, groupMode)');
    expect(registryCards).toContain('export function normalizeRegistryStoreGroupItems(items: RegistryItem[]): RegistryItem[] {');
    expect(registryFeatured).toContain('export function normalizeRegistryFeaturedItems(items: RegistryItem[]): RegistryItem[] {');
    expect(registryFeatured).toContain('for (const item of normalizeRegistryFeaturedItems(items)) {');
    expect(registryCards).toContain('for (const item of normalizeRegistryStoreGroupItems(items)) {');
  });

  it('keeps public purchaser status aligned with owner purchase state truth', () => {
    const registrySectionComponent = readFileSync(resolve(__dirname, './components/RegistrySection.tsx'), 'utf8');
    const registryOwnerCard = readFileSync(resolve(__dirname, '../pages/dashboard/registry/RegistryItemCard.tsx'), 'utf8');
    const registryItemForm = readFileSync(resolve(__dirname, '../pages/dashboard/registry/RegistryItemForm.tsx'), 'utf8');
    const registryDashboard = readFileSync(resolve(__dirname, '../pages/dashboard/Registry.tsx'), 'utf8');
    expect(registrySectionComponent).toContain("export function getRegistryPurchaserStatusLabel(item: Pick<RegistryItem, 'purchase_status' | 'purchaser_name'>): string | null {");
    expect(registrySectionComponent).toContain("if (!item.purchaser_name || item.purchase_status === 'available') return null;");
    expect(registrySectionComponent).toContain("? `Purchased by ${item.purchaser_name}`");
    expect(registryOwnerCard).toContain("export function getOwnerRegistryPurchaserLabel(item: Pick<RegistryItem, 'purchase_status' | 'purchaser_name'>): string | null {");
    expect(registryOwnerCard).toContain('export function normalizeOwnerRegistryItemState(item: RegistryItem): RegistryItem {');
    expect(registryOwnerCard).toContain("? `Purchased by ${item.purchaser_name}`");
    expect(registryItemForm).toContain('canonical_url: nextUrl,');
    expect(registryDashboard).toContain('const normalizedItems = items.map(normalizeOwnerDashboardRegistryItem);');
    expect(registryDashboard).toContain('function normalizeOwnerDashboardRegistryItem(item: RegistryItem): RegistryItem {');
    expect(registryDashboard).toContain('const duplicateGroups = findDuplicateRegistryGroups(normalizedItems);');
    expect(registryDashboard).toContain('const actionableBadImportCount = normalizedItems.filter((item) => getRegistryItemMetadataState(item).hasBadImportTitle && !!(item.item_url || item.canonical_url)).length;');
    expect(registryDashboard).toContain('setItems(data.map(normalizeOwnerDashboardRegistryItem));');
    expect(registryDashboard).toContain('normalizeOwnerDashboardRegistryItem({ ...i, ...fields, updated_at: new Date().toISOString() })');
    expect(registryDashboard).toContain('normalizeOwnerDashboardRegistryItem(updated)');
    expect(registryDashboard).toContain('normalizeOwnerDashboardRegistryItem(created)');
    expect(registryDashboard).toContain('const filtered = normalizedItems.filter(item => {');
    expect(registryDashboard).toContain('const hasStale = normalizedItems.some((item) => !item.metadata_last_checked_at || (Date.now() - new Date(item.metadata_last_checked_at).getTime()) > WEEKLY_REFRESH_MS);');
    expect(registryDashboard).toContain('purchaser_name: quantityState.purchaseStatus === \'available\' ? null : item.purchaser_name,');
    expect(registryDashboard).toContain('badImports: normalizedItems.filter((i) => getRegistryItemMetadataState(i).hasBadImportTitle).length,');
    expect(registryDashboard).toContain('repair: actionableBadImportCount,');
    expect(registryDashboard).toContain('filter((i) => getRegistryItemMetadataState(i).hasBadImportTitle)');
    expect(registryDashboard).toContain('repair: actionableBadImportCount,');
    expect(registryDashboard).toContain("imageIssues: normalizedItems.filter((item) => !item.image_url || item.image_url.includes('thum.io') || item.image_url.includes('weserv.nl')).length,");
    expect(registryDashboard).toContain('Repair states: {normalizedItems.filter((item) => getRegistryRepairStates(item).length > 0).length}');
    expect(registryDashboard).toContain('Imported gifts to fix: {actionableBadImportCount}');
    expect(registryDashboard).toContain('{actionableBadImportCount > 0 && (');
  });

  it('keeps template registry definitions cloned before import/edit flows mutate them', () => {
    const templateRegistrySource = readFileSync(resolve(__dirname, '../templates/registry.ts'), 'utf8');
    const initialLayoutSource = readFileSync(resolve(__dirname, '../lib/generateInitialLayout.ts'), 'utf8');
    const siteGeneratorSource = readFileSync(resolve(__dirname, '../lib/siteGenerator.ts'), 'utf8');
    expect(templateRegistrySource).toContain('const REGISTRY_VARIANT_ALIASES: Record<string, string> = {');
    expect(templateRegistrySource).toContain("default: 'cards'");
    expect(templateRegistrySource).toContain("grid: 'cards'");
    expect(templateRegistrySource).toContain('function normalizeTemplateIdKey(templateId: unknown): string {');
    expect(templateRegistrySource).toContain('const templateIdAliases = new Map<string, string>(');
    expect(templateRegistrySource).toContain('Object.entries(TEMPLATE_REGISTRY).flatMap(([templateId, template]) => {');
    expect(templateRegistrySource).toContain('normalizeTemplateIdKey(template.name)');
    expect(templateRegistrySource).toContain('export function getTemplate(templateId: unknown): TemplateDefinition {');
    expect(templateRegistrySource).toContain("const templateIdValue = typeof templateId === 'string' ? templateId : '';");
    expect(templateRegistrySource).toContain("templateIdAliases.get(normalizeTemplateIdKey(templateId)) ?? 'base'");
    expect(templateRegistrySource).toContain('function cloneTemplateValue<T>(value: T): T {');
    expect(templateRegistrySource).toContain("templateRegistry.map((template) => [template.id, cloneTemplateDefinition(template)])");
    expect(templateRegistrySource).toContain("base: cloneTemplateDefinition(templateById['timeless-classic'] ?? templateRegistry[0]),");
    expect(templateRegistrySource).toContain("variant: isRegistryTemplateSectionType(section.type)");
    expect(templateRegistrySource).toContain("? (typeof section.variant === 'string' ? normalizeRegistryTemplateVariant(section.variant) : 'cards')");
    expect(templateRegistrySource).toContain("return REGISTRY_VARIANT_ALIASES[normalizedVariant] ?? 'cards';");
    expect(templateRegistrySource).toContain("function isRegistryTemplateSectionType(type: unknown): boolean {");
    expect(templateRegistrySource).toContain("return normalizedType === 'registry' || normalizedType.startsWith('registrysection');");
    expect(templateRegistrySource).toContain("type: isRegistryTemplateSectionType(section.type) ? 'registry' : section.type,");
    expect(templateRegistrySource).toContain('bindings: cloneTemplateValue(section.bindings ?? {}),');
    expect(templateRegistrySource).toContain('settings: cloneTemplateValue(section.settings ?? {}),');
    expect(templateRegistrySource).toContain('overrides: cloneTemplateValue(section.overrides ?? undefined),');
    expect(templateRegistrySource).toContain('function cloneTemplateDefinition(template: TemplateDefinition): TemplateDefinition {');
    expect(templateRegistrySource).toContain('return cloneTemplateDefinition(TEMPLATE_REGISTRY[canonicalTemplateId] || TEMPLATE_REGISTRY.base || templateRegistry[0]);');
    expect(templateRegistrySource).toContain('return templateRegistry.map(cloneTemplateDefinition);');
    expect(initialLayoutSource).toContain('overrides: sectionDef.overrides ? { ...sectionDef.overrides } : undefined,');
    expect(initialLayoutSource).toContain('locked: sectionDef.locked,');
    expect(initialLayoutSource).toContain('function normalizeSectionTypeKey(type: unknown): string {');
    expect(initialLayoutSource).toContain('function isRegistrySectionType(type: unknown): boolean {');
    expect(initialLayoutSource).toContain('if (isRegistrySectionType(type)) return !hasRealRegistryContent;');
    expect(initialLayoutSource).toContain('currentSectionsByType.set(normalizeSectionTypeKey(section.type), section);');
    expect(initialLayoutSource).toContain('id: existing.id,');
    expect(initialLayoutSource).toContain('variant: existing.variant,');
    expect(initialLayoutSource).toContain('const existing = currentSectionsByType.get(normalizeSectionTypeKey(newSection.type));');
    expect(initialLayoutSource).toContain('if (isRegistrySectionType(sectionDef.type) && hasRealRegistryContent) {');
    expect(initialLayoutSource).toContain('overrides: existing.overrides ?? newSection.overrides,');
    expect(initialLayoutSource).toContain('locked: existing.locked ?? newSection.locked,');
    expect(siteGeneratorSource).toContain("import { getTemplate } from '../templates/registry';");
    expect(siteGeneratorSource).toContain('const template = getTemplate(data.template);');
    const aiBuilderPatchSource = readFileSync(resolve(__dirname, '../lib/aiBuilderProjectPatch.ts'), 'utf8');
    expect(aiBuilderPatchSource).toContain('const normalizeBuilderSectionTypeKey = (type: unknown) => {');
    expect(aiBuilderPatchSource).toContain("if (normalizeBuilderSectionTypeKey(type) === 'registry') {");
  });
});
