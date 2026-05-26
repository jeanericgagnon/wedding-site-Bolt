import { describe, expect, it } from 'vitest';
import { getAllSectionManifests, getSectionManifest } from '../builder/registry/sectionManifests';
import { getDefinition, getDefinitionOrThrow, getVariantsForType, resolveAndParse, resolveCanonicalRegistrySectionInput, resolveCanonicalRegistrySectionType, resolveCanonicalRegistryVariant } from './registry';
import { getAllTemplates, getCanonicalTemplateSourceId, getTemplate, resolveCanonicalTemplateId, TEMPLATE_REGISTRY } from '../templates/registry';
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
    expect(getDefinition(' Hero ' as never, 'fullBleed' as never)?.type).toBe('hero');
    expect(getDefinition('footer-cta' as never, 'rsvpPush' as never)?.type).toBe('footerCta');
    expect(resolveCanonicalRegistrySectionInput('Footer Cta', undefined)).toEqual({ type: 'footerCta', variant: 'rsvpPush' });
    expect(resolveCanonicalRegistrySectionInput('footer-cta', 'Luxury')).toEqual({ type: 'footerCta', variant: 'rsvpPush' });
    expect(resolveCanonicalRegistrySectionInput('Footer Cta', 'Luxury')).toEqual({ type: 'footerCta', variant: 'rsvpPush' });
    expect(resolveCanonicalRegistrySectionInput('Footer Cta', 'legacy-default')).toEqual({ type: 'footerCta', variant: 'rsvpPush' });
    expect(resolveAndParse('Footer Cta' as never, 'Luxury' as never, {}, { strictVariant: true })?.def.variant).toBe('rsvpPush');
    expect(resolveAndParse('Footer Cta' as never, 'Luxury' as never, {}, { strictVariant: false })?.def.variant).toBe('rsvpPush');
    expect(resolveAndParse('Footer Cta' as never, 'luxury' as never, {}, { strictVariant: true })?.def.variant).toBe('rsvpPush');
    expect(resolveCanonicalRegistrySectionInput(' Hero ', 'FULL.BLEED')).toEqual({ type: 'hero', variant: 'fullBleed' });
    expect(resolveAndParse('Hero' as never, 'legacy-default' as never, {}, { strictVariant: false })?.def.variant).toBe('fullBleed');
    expect(getDefinitionOrThrow('RegistrySection' as never, ' Luxury ' as never).variant).toBe('featured');
    expect(getDefinition('RegistrySection' as never, ' Luxury ' as never)?.variant).toBe('featured');
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
    expect(resolveAndParse('RegistrySection' as never, 'Luxury' as never, {}, { strictVariant: true })?.def.variant).toBe('featured');
    expect(resolveCanonicalRegistryVariant('Experiences')).toBe('featured');
    expect(resolveCanonicalRegistryVariant(undefined)).toBe('cards');
    expect(resolveCanonicalRegistryVariant(' Luxury ')).toBe('featured');
    expect(resolveCanonicalRegistryVariant('fund-highlight')).toBe('featured');
    expect(resolveCanonicalRegistryVariant('legacy-default')).toBe('cards');
    expect(resolveCanonicalRegistrySectionType('RegistrySection')).toBe('registry');
    expect(resolveCanonicalRegistrySectionType('registry-section')).toBe('registry');
    expect(resolveCanonicalRegistrySectionInput('RegistrySection', ' Luxury ')).toEqual({ type: 'registry', variant: 'featured' });
    expect(resolveCanonicalRegistrySectionInput(' Hero ', 'fullBleed')).toEqual({ type: 'hero', variant: 'fullBleed' });
  });

  it('keeps registry runtime resolution from crashing on malformed persisted variants', () => {
    expect(resolveAndParse('registry', undefined as never, {}, { strictVariant: true })?.def.variant).toBe('cards');
    expect(resolveAndParse('registry', null as never, {}, { strictVariant: true })?.def.variant).toBe('cards');
    expect(resolveAndParse('registry', { variant: 'featured' } as never, {}, { strictVariant: true })?.def.variant).toBe('cards');
    expect(resolveAndParse('registry', 'legacy-default', {}, { strictVariant: true })?.def.variant).toBe('cards');
    expect(getDefinition('registry', undefined as never)?.variant).toBe('cards');
    expect(getDefinitionOrThrow('registry', undefined as never).variant).toBe('cards');
    expect(getDefinition(undefined as never, 'cards')).toBeNull();
  });

  it('clones section definitions before owner edits can mutate shared registry runtime defaults', () => {
    const firstDefinition = getDefinitionOrThrow('registry', 'cards');
    (firstDefinition.defaultData as Record<string, unknown>).title = 'Mutated registry defaults';

    expect(getDefinitionOrThrow('registry', 'cards').defaultData).not.toMatchObject({
      title: 'Mutated registry defaults',
    });
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
    const importedTemplate = getTemplate('base');
    const baseRegistrySection = importedTemplate.defaultLayout.sections.find((section) => section.type === 'registry');
    expect(baseRegistrySection).toBeDefined();

    baseRegistrySection!.variant = undefined as never;

    expect(getTemplate('base').defaultLayout.sections.find((section) => section.type === 'registry')?.variant).toBe('cards');
  });

  it('keeps unknown imported registry template variants from leaking past cards fallback', () => {
    const importedTemplate = getTemplate('base');
    const baseRegistrySection = importedTemplate.defaultLayout.sections.find((section) => section.type === 'registry');
    expect(baseRegistrySection).toBeDefined();

    baseRegistrySection!.variant = 'legacy-default';

    expect(getTemplate('base').defaultLayout.sections.find((section) => section.type === 'registry')?.variant).toBe('cards');
  });

  it('keeps drifted registry template section types normalized for guest-visible imports', () => {
    const importedTemplate = getTemplate('base');
    const baseRegistrySection = importedTemplate.defaultLayout.sections.find((section) => section.type === 'registry');
    expect(baseRegistrySection).toBeDefined();

    baseRegistrySection!.type = 'Registry' as never;

    const importedRegistrySection = getTemplate('base').defaultLayout.sections.find((section) => section.type === 'registry');
    expect(importedRegistrySection?.type).toBe('registry');
    expect(importedRegistrySection?.variant).toBe('cards');
  });

  it('keeps drifted registry-section template types normalized for guest-visible imports', () => {
    const importedTemplate = getTemplate('base');
    const baseRegistrySection = importedTemplate.defaultLayout.sections.find((section) => section.type === 'registry');
    expect(baseRegistrySection).toBeDefined();

    baseRegistrySection!.type = 'registry-section' as never;

    const importedRegistrySection = getTemplate('base').defaultLayout.sections.find((section) => section.type === 'registry');
    expect(importedRegistrySection?.type).toBe('registry');
    expect(importedRegistrySection?.variant).toBe('cards');
  });

  it('keeps legacy registry template variants normalized onto guest-visible cards', () => {
    const importedTemplate = getTemplate('base');
    const baseRegistrySection = importedTemplate.defaultLayout.sections.find((section) => section.type === 'registry');
    expect(baseRegistrySection).toBeDefined();

    baseRegistrySection!.variant = 'grid';

    expect(getTemplate('base').defaultLayout.sections.find((section) => section.type === 'registry')?.variant).toBe('cards');
  });

  it('keeps persisted template ids resolving cleanly through import edits', () => {
    expect(getTemplate(' Base ').id).toBe('timeless-classic');
    expect(getTemplate('base').id).toBe('timeless-classic');
    expect(getTemplate('TIMELESS_CLASSIC').id).toBe('timeless-classic');
    expect(getTemplate('Playful Celebration').id).toBe('playful-celebration');
    expect(getTemplate('EDITORIAL').id).toBe('editorial-impact');
    expect(getTemplate(undefined as never).id).toBe('timeless-classic');
    expect(getTemplate({ templateId: 'base' } as never).id).toBe('timeless-classic');
    expect(resolveCanonicalTemplateId(' Base ')).toBe('timeless-classic');
    expect(resolveCanonicalTemplateId('base')).toBe('timeless-classic');
    expect(resolveCanonicalTemplateId('classic')).toBe('timeless-classic');
    expect(getCanonicalTemplateSourceId('base')).toBe('timeless-classic');
    expect(getCanonicalTemplateSourceId('classic')).toBe('timeless-classic');
    expect(getCanonicalTemplateSourceId('Playful Celebration')).toBe('playful-celebration');
    expect(resolveCanonicalTemplateId('Playful Celebration')).toBe('playful-celebration');
    expect(getTemplate('modern').id).toBe('modern-clean');
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
    const importedClassicTemplate = getTemplate('classic');
    importedClassicTemplate.defaultLayout.sections.find((section) => section.type === 'registry')!.settings = { title: 'Mutated alias' };

    expect(TEMPLATE_REGISTRY.base.defaultLayout.sections.find((section) => section.type === 'registry')?.settings).toEqual({});
    expect(TEMPLATE_REGISTRY['timeless-classic'].defaultLayout.sections.find((section) => section.type === 'registry')?.settings).toEqual({});
    expect(getTemplate('classic').defaultLayout.sections.find((section) => section.type === 'registry')?.settings).toEqual({});
  });

  it('keeps template catalogs on canonical registry template definitions', () => {
    const registryTemplateVariants = getAllTemplates()
      .flatMap((template) => template.defaultLayout.sections)
      .filter((section) => section.type === 'registry')
      .map((section) => section.variant);

    expect(registryTemplateVariants.length).toBeGreaterThan(0);
    expect(registryTemplateVariants.every((variant) => variant === 'cards' || variant === 'featured')).toBe(true);
  });

  it('keeps exported template registry aliases locked to canonical sources', () => {
    expect(Object.isFrozen(TEMPLATE_REGISTRY)).toBe(true);
    expect(Object.isFrozen(TEMPLATE_REGISTRY.base.defaultLayout.sections)).toBe(true);
    expect(getTemplate('base').id).toBe('timeless-classic');
    expect(getTemplate('classic').id).toBe('timeless-classic');
  });

  it('clones full template definitions before import edits can mutate template metadata', () => {
    const importedTemplate = getTemplate('base');
    (importedTemplate.defaultLayout as Record<string, unknown>).title = 'Mutated import layout';

    expect((getTemplate('base').defaultLayout as Record<string, unknown>).title).not.toBe('Mutated import layout');
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
    expect(getSectionVariants('registry-section' as never)).toContain('featured');
    expect(getSectionComponent('registry', 'default')).toBe(RegistryGrid);
    expect(getSectionComponent('registry-section' as never, 'default')).toBe(RegistryGrid);
    expect(getSectionComponent('registry-section' as never, 'fund-highlight' as never)).toBe(RegistryFundHighlight);
    expect(getSectionComponent('RegistrySection' as never, 'Luxury' as never)).toBe(RegistryFundHighlight);
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

  it('keeps legacy section registry runtime tolerant of registrysection type drift', () => {
    const legacyRegistry = readFileSync(resolve(__dirname, './sectionRegistry.tsx'), 'utf8');
    expect(legacyRegistry).toContain("function normalizeLegacySectionType(type: SectionType): SectionType {");
    expect(legacyRegistry).toContain("return (normalizedType === 'registrysection' ? 'registry' : normalizedType) as SectionType;");
    expect(legacyRegistry).toContain("function normalizeLegacyRegistryVariant(variant: string): string {");
    expect(legacyRegistry).toContain("const normalizedVariant = normalizedType === 'registry' ? normalizeLegacyRegistryVariant(variant) : variant;");
  });

  it('keeps registry proof output explicit about remaining runtime truth work', () => {
    const registryProof = readFileSync(resolve(__dirname, '../../scripts/v1-proof-registry.mjs'), 'utf8');
    expect(registryProof).toContain("status: liveEnabled ? 'live-proof-green' : 'local-proof-green-live-proof-pending'");
    expect(registryProof).toContain("highestRiskTrustGap: liveEnabled ? null : 'runtime_registry_truth_after_real_edits'");
    expect(registryProof).toContain("secondaryTrustGap: liveEnabled ? null : 'barcode_lookup_runtime_truth_after_deploy'");
    expect(registryProof).toContain('manualProofRequired: !liveEnabled,');
    expect(registryProof).toContain("truthGateSummary: liveEnabled ? 'automation_green_live_truth_green' : 'automation_green_live_truth_pending'");
    expect(registryProof).toContain("evidenceLogPath: 'docs/v1-smoke-proof-log.md'");
    expect(registryProof).toContain("manualProofStatus: liveEnabled ? 'closed' : 'pending_live_registry_write_read'");
    expect(registryProof).toContain('manualProofRequirements: liveEnabled ? [] : [');
    expect(registryProof).toContain("'owner_manage_import_persistence_runtime_pass'");
    expect(registryProof).toContain("'owner_duplicate_merge_runtime_pass'");
    expect(registryProof).toContain("'owner_barcode_lookup_save_runtime_pass'");
    expect(registryProof).toContain("'guest_visible_registry_endpoint_runtime_pass'");
    expect(registryProof).toContain('manualProofBlockingReasons: liveEnabled ? {} : {');
    expect(registryProof).toContain("owner_manage_import_persistence_runtime_pass: 'run the authenticated live registry add/edit proof'");
    expect(registryProof).toContain("owner_duplicate_merge_runtime_pass: 'run the live duplicate-merge proof against deployed runtime'");
    expect(registryProof).toContain("guest_visible_registry_endpoint_runtime_pass: 'confirm the public registry endpoint stays readable after runtime edits'");
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
    const registryLinkCarryover = readFileSync(resolve(__dirname, '../lib/registryLinkCarryover.ts'), 'utf8');
    const onboardingMapper = readFileSync(resolve(__dirname, '../lib/onboardingMapper.ts'), 'utf8');
    const generateWeddingData = readFileSync(resolve(__dirname, '../lib/generateWeddingData.ts'), 'utf8');
    const weddingDataBindings = readFileSync(resolve(__dirname, '../render/weddingDataBindings.ts'), 'utf8');
    const guidedBuilderModules = readFileSync(resolve(__dirname, '../components/dashboard/GuidedBuilderModules.tsx'), 'utf8');
    const builderV2Adapter = readFileSync(resolve(__dirname, '../builder-v2/adapter.ts'), 'utf8');
    expect(sectionRegistry).toContain("function normalizeRegistryVariantKey(variant: unknown): string {");
    expect(sectionRegistry).toContain("function isRegistrySectionType(type: unknown): boolean {");
    expect(sectionRegistry).toContain("function normalizeRegistrySectionType(type: unknown): string {");
    expect(sectionRegistry).toContain("return normalizedType === 'registry' || normalizedType.startsWith('registrysection');");
    expect(sectionRegistry).toContain("const canonicalSection = resolveCanonicalRegistrySectionInput(type, variant);");
    expect(sectionRegistry).toContain('const directSectionType = getAllDefinitions().find((definition) => normalizeRegistryVariantKey(definition.type) === normalizedTypeKey)?.type;');
    expect(sectionRegistry).toContain("const normalizedInputType = typeof type === 'string' ? type.trim().toLowerCase() : '';");
    expect(sectionRegistry).toContain('function resolveCanonicalSectionVariantForType(type: string, inputType: string, variant: unknown): string {');
    expect(sectionRegistry).toContain("return defaultVariant ?? (typeof variant === 'string' ? variant : '');");
    expect(sectionRegistry).toContain('function getVariantFallbacksForType(type: string, inputType?: string): Record<string, string> {');
    expect(sectionRegistry).toContain('function getCanonicalSectionFallbackVariant(type: string, inputType: string, variant: string): string | null {');
    expect(sectionRegistry).toContain('function getDefaultVariantForType(type: string): string | undefined {');
    expect(sectionRegistry).toContain('function getCanonicalSectionDefinition(type: string, variant: string): SectionDefinition | null {');
    expect(sectionRegistry).toContain('function cloneSectionDefinitionValue<T>(value: T): T {');
    expect(sectionRegistry).toContain('const defaultVariant = getDefaultVariantForType(type);');
    expect(sectionRegistry).toContain('const defaultVariant = getDefaultVariantForType(normalizedType);');
    expect(sectionRegistry).toContain("const canonicalVariant = resolveCanonicalSectionVariantForType('registry', 'registry', variant);");
    expect(sectionRegistry).toContain('export function getDefinition(type: string, variant: unknown): SectionDefinition | null {');
    expect(sectionRegistry).toContain('const definition = getCanonicalSectionDefinition(canonicalSection.type, canonicalSection.variant);');
    expect(sectionRegistry).toContain('export function getDefinitionOrThrow(type: string, variant: unknown): SectionDefinition {');
    expect(sectionRegistry).toContain("? canonicalVariant");
    expect(sectionRegistry).toContain('return getCanonicalSectionFallbackVariant(type, inputType, normalizedVariantKey)');
    expect(sectionRegistry).toContain('const fallbackVariant = getCanonicalSectionFallbackVariant(canonicalSection.type, normalizedType, normalizedVariant);');
    expect(sectionRegistry).toContain('.filter((definition) => definition.type === type)');
    expect(sectionRegistry).toContain('variant: resolveCanonicalSectionVariantForType(normalizedType, normalizedInputType, variant),');
    expect(sectionRegistry).toContain('return definition ? cloneSectionDefinition(definition) : null;');
    expect(sectionRegistry).toContain('export function getDefinition(type: string, variant: unknown): SectionDefinition | null {');
    expect(sectionRegistry).toContain('export function getDefinitionOrThrow(type: string, variant: unknown): SectionDefinition {');
    expect(sectionRegistry).toContain("return typeof variant === 'string'");
    expect(sectionRegistry).toContain("const normalizedType = resolveCanonicalRegistrySectionInput(type, undefined).type || normalizeRegistrySectionType(type);");
    expect(sectionRegistry).toContain("const normalizedTypeKey = normalizeRegistrySectionType(canonicalSection.type);");
    expect(sectionRegistry).toContain("const normalizedVariant = canonicalSection.variant;");
    expect(sectionRegistry).toContain("'registry-section': 'registry',");
    expect(sectionRegistry).toContain("default: 'cards'");
    expect(sectionRegistry).toContain("grid: 'cards'");
    expect(sectionRegistry).toContain("const canonicalVariant = resolveCanonicalSectionVariantForType('registry', 'registry', variant);");
    expect(sectionRegistry).toContain("? canonicalVariant");
    expect(sectionRegistry).toContain('return Object.entries(getVariantFallbacksForType(type, inputType)).find(([alias]) => normalizeRegistryVariantKey(alias) === normalizeRegistryVariantKey(variant))?.[1] ?? null;');
    expect(previewSource).toContain('function isRegistryPreviewSectionType(type: string): boolean {');
    expect(previewSource).toContain("return normalizedType === 'registry' || normalizedType.startsWith('registrysection');");
    expect(weddingDataAdapter).toContain("function normalizeBuilderBindingSectionType(type: BuilderSectionInstance['type']): BuilderSectionInstance['type'] {");
    expect(weddingDataAdapter).toContain("return (normalizedType === 'registrysection' ? 'registry' : type) as BuilderSectionInstance['type'];");
    expect(canonicalMapper).toContain("const normalizedType = type.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');");
    expect(canonicalMapper).toContain("case 'registrysection':");
    expect(registryLinkCarryover).toContain('function extractRegistryUrlTokens(line: string): CarryoverRegistryToken[] {');
    expect(registryLinkCarryover).toContain('/\\[[^\\]]+\\]\\((https?:\\/\\/[^)]+|www\\.[^)]+)\\)/gi');
    expect(registryLinkCarryover).toContain('/<(https?:\\/\\/[^>]+|www\\.[^>]+)>/gi');
    expect(registryLinkCarryover).toContain('/[\"\'](https?:\\/\\/[^\"\']+|www\\.[^\"\']+)[\"\']/gi');
    expect(registryLinkCarryover).toContain('.matchAll(pattern)');
    expect(registryLinkCarryover).toContain(".split('\\n')");
    expect(registryLinkCarryover).toContain("let pendingSourceLabel: string | undefined;");
    expect(registryLinkCarryover).toContain('interface CarryoverRegistryToken {');
    expect(registryLinkCarryover).toContain('function inferSourceLabelFromText(text: string): string | undefined {');
    expect(registryLinkCarryover).toContain('function extractExplicitSourceLabelFromTokenText(text: string): string | undefined {');
    expect(registryLinkCarryover).toContain('claimed|claiming|reserved|reserving|booked|booking)\\s+by\\s+[a-z]');
    expect(registryLinkCarryover).toContain('purchasing|buying|already|claimed|partially|partial|pending|done|complete|later');
    expect(registryLinkCarryover).toContain('function normalizeExplicitSourceLabel(label: string | undefined): string | undefined {');
    expect(registryLinkCarryover).toContain('const inferredSourceLabel = inferSourceLabel(url);');
    expect(registryLinkCarryover).toContain('sourceLabel: sourceLabel ?? inferredSourceLabel');
    expect(registryLinkCarryover).toContain("sourceLabelMode?: 'explicit' | 'inferred';");
    expect(registryLinkCarryover).toContain("next.sourceLabelMode === 'explicit'");
    expect(registryLinkCarryover).toContain('function finalizeCarryoverRegistryLink(');
    expect(registryLinkCarryover).toContain('export function parsePersistedRegistryLinks(raw: string | null | undefined): CarryoverRegistryLink[] {');
    expect(registryLinkCarryover).toContain('export function mergeRegistrySourceLabels(');
    expect(registryLinkCarryover).toContain('const parsedLinks = carryOverRegistryLinks(candidateUrl);');
    expect(registryLinkCarryover).toContain('sourceLabel: index === 0 ? (explicitSourceLabel ?? parsedLink.sourceLabel) : parsedLink.sourceLabel,');
    expect(registryLinkCarryover).toContain('const deduped = new Map<string, CarryoverRegistryLink>();');
    expect(registryLinkCarryover).toContain('const existingInferredLabel = inferSourceLabel(existing.url);');
    expect(registryLinkCarryover).toContain("if (lower.includes('anthropologie.com')) return 'Anthropologie';");
    expect(registryLinkCarryover).toContain("if (lower.includes('bloomingdales.com')) return \"Bloomingdale's\";");
    expect(registryLinkCarryover).toContain("if (lower.includes('macys.com')) return \"Macy's\";");
    expect(registryLinkCarryover).toContain("if (lower.includes('crateandbarrel.com')) return 'Crate & Barrel';");
    expect(registryLinkCarryover).toContain("if (lower.includes('cb2.com')) return 'CB2';");
    expect(registryLinkCarryover).toContain("if (lower.includes('potterybarn.com')) return 'Pottery Barn';");
    expect(registryLinkCarryover).toContain("if (lower.includes('westelm.com')) return 'West Elm';");
    expect(registryLinkCarryover).toContain("if (lower.includes('williams-sonoma.com')) return 'Williams Sonoma';");
    expect(registryLinkCarryover).toContain("if (lower.includes('zola.com')) return 'Zola';");
    expect(registryLinkCarryover).toContain("existing.sourceLabelMode !== 'explicit'");
    expect(registryLinkCarryover).toContain('(!existing.sourceLabel && next.sourceLabel)');
    expect(registryLinkCarryover).toContain('.map((token) => {');
    expect(registryLinkCarryover).toContain("function cleanRegistryUrlToken(token: string): string {");
    expect(onboardingMapper).toContain('mergeRegistrySourceLabels(carriedRegistryLinks, parsePersistedRegistryLinks(input.registryLinks ?? \'\'))');
    expect(onboardingMapper).toContain(".map((link) => link.sourceLabel ? `${link.sourceLabel} | ${link.url}` : link.url)");
    expect(generateWeddingData).toContain('mergeRegistrySourceLabels(');
    expect(generateWeddingData).toContain('parsePersistedRegistryLinks(formData.registryLinks || formData.registryLink)');
    expect(weddingDataBindings).toContain('function normalizeBindableSectionType(type: string): string {');
    expect(weddingDataBindings).toContain("case 'registrysection':");
    expect(weddingDataBindings).toContain("return 'registry';");
    expect(guidedBuilderModules).toContain("const normalizeModuleSectionType = (type: string) => type.trim().toLowerCase().replace(/[^a-z0-9]/g, '');");
    expect(guidedBuilderModules).toContain("normalizeModuleSectionType(s.type) === normalizeModuleSectionType(sectionType)");
    expect(guidedBuilderModules).toContain("switch (normalizeModuleSectionType(moduleId)) {");
    expect(builderV2Adapter).toContain("const normalizeBuilderV2SectionType = (type: string) => {");
    expect(builderV2Adapter).toContain("return normalizedType.startsWith('registrysection') ? 'registry' : type;");
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
    const registryDerivedState = readFileSync(resolve(__dirname, '../pages/dashboard/registry/buildRegistryDashboardDerivedState.ts'), 'utf8');
    const registryRouteContent = readFileSync(resolve(__dirname, '../pages/dashboard/registry/RegistryDashboardRouteContent.tsx'), 'utf8');
    expect(registrySectionComponent).toContain("export function getRegistryPurchaserStatusLabel(item: Pick<RegistryItem, 'purchase_status' | 'purchaser_name'>): string | null {");
    expect(registrySectionComponent).toContain("if (!item.purchaser_name || item.purchase_status === 'available') return null;");
    expect(registrySectionComponent).toContain("? `Purchased by ${item.purchaser_name}`");
    expect(registryOwnerCard).toContain("export function getOwnerRegistryPurchaserLabel(item: Pick<RegistryItem, 'purchase_status' | 'purchaser_name'>): string | null {");
    expect(registryOwnerCard).toContain('export function normalizeOwnerRegistryItemState(item: RegistryItem): RegistryItem {');
    expect(registryOwnerCard).toContain("? `Purchased by ${item.purchaser_name}`");
    expect(registryOwnerCard).toContain('await onMarkPurchased(normalizedItem, qty);');
    expect(registryOwnerCard).toContain('await onRefetchMetadata(normalizedItem);');
    expect(registryOwnerCard).toContain('onClick={() => onEdit(normalizedItem)}');
    expect(registryItemForm).toContain('canonical_url: nextUrl,');
    expect(registryDashboard).toContain('const normalizedItems = useMemo(');
    expect(registryDashboard).toContain('() => items.map(normalizeOwnerDashboardRegistryItem),');
    expect(registryDashboard).toContain("import { normalizeOwnerDashboardRegistryItem, useRegistryDashboardData } from './registry/useRegistryDashboardData';");
    expect(registryDashboard).toContain('} = buildRegistryDashboardDerivedState({');
    expect(registryDerivedState).toContain('const duplicateGroups = buildRegistryDuplicateGroups(items);');
    expect(registryDerivedState).toContain('const {');
    expect(registryDerivedState).toContain('actionableBadImportCount,');
    expect(registryDashboard).toContain('setItems,');
    expect(registryDashboard).toContain('normalizeOwnerDashboardRegistryItem,');
    expect(registryDashboard).toContain('const hasStale = normalizedItems.some((item) => !item.metadata_last_checked_at || ageExceedsMs(item.metadata_last_checked_at, WEEKLY_REFRESH_MS));');
    expect(registryDerivedState).toContain('badImports: items.filter((item) => {');
    expect(registryDerivedState).toContain('repair: repairQueue.length,');
    expect(registryDerivedState).toContain("imageIssues: items.filter((item) => hasImageIssue(item)).length,");
    expect(registryRouteContent).toContain('Gifts needing detail touchup: {props.normalizedItems.filter((item) => getRegistryRepairStates(item).length > 0).length}');
    expect(registryRouteContent).toContain('Clean up imported gifts');
    expect(registryRouteContent).toContain('{props.actionableBadImportCount > 0 && (');
  });

  it('keeps template registry definitions cloned before import/edit flows mutate them', () => {
    const sectionRegistrySource = readFileSync(resolve(__dirname, './registry.ts'), 'utf8');
    const templateRegistrySource = readFileSync(resolve(__dirname, '../templates/registry.ts'), 'utf8');
    const initialLayoutSource = readFileSync(resolve(__dirname, '../lib/generateInitialLayout.ts'), 'utf8');
    const siteGeneratorSource = readFileSync(resolve(__dirname, '../lib/siteGenerator.ts'), 'utf8');
    expect(templateRegistrySource).toContain("import { resolveCanonicalRegistrySectionInput } from '../sections/registry';");
    expect(templateRegistrySource).toContain('function normalizeTemplateIdKey(templateId: unknown): string {');
    expect(templateRegistrySource).toContain('const templateIdAliases = new Map<string, string>(');
    expect(templateRegistrySource).toContain('Object.entries(templateById).flatMap(([templateId, template]) => {');
    expect(templateRegistrySource).toContain('Object.entries(TEMPLATE_ALIAS_TARGETS).map(([aliasId, canonicalId]): [string, string] => [normalizeTemplateIdKey(aliasId), canonicalId])');
    expect(templateRegistrySource).toContain('normalizeTemplateIdKey(template.name)');
    expect(templateRegistrySource).toContain('export function resolveCanonicalTemplateId(templateId: unknown): string {');
    expect(templateRegistrySource).toContain('export function getCanonicalTemplateSourceId(templateId: unknown): string {');
    expect(templateRegistrySource).toContain('export function getTemplate(templateId: unknown): TemplateDefinition {');
    expect(templateRegistrySource).toContain("const templateIdValue = typeof templateId === 'string' ? templateId : '';");
    expect(templateRegistrySource).toContain('const resolvedTemplateId = templateById[templateIdValue]');
    expect(templateRegistrySource).toContain("templateIdAliases.get(normalizeTemplateIdKey(templateId)) ?? 'base'");
    expect(templateRegistrySource).toContain('return TEMPLATE_ALIAS_TARGETS[resolvedTemplateId] ?? resolvedTemplateId;');
    expect(templateRegistrySource).toContain('function getCanonicalTemplateSourceId(templateId: unknown): string {');
    expect(templateRegistrySource).toContain('const canonicalTemplateId = resolveCanonicalTemplateId(templateId);');
    expect(templateRegistrySource).toContain('return TEMPLATE_ALIAS_TARGETS[canonicalTemplateId] ?? canonicalTemplateId;');
    expect(templateRegistrySource).toContain('function cloneTemplateValue<T>(value: T): T {');
    expect(templateRegistrySource).toContain("templateRegistry.map((template) => [template.id, cloneTemplateDefinition(template)])");
    expect(templateRegistrySource).toContain('const TEMPLATE_ALIAS_TARGETS: Record<string, string> = {');
    expect(templateRegistrySource).toContain('export const TEMPLATE_REGISTRY: Record<string, TemplateDefinition> = deepFreezeTemplateValue({');
    expect(templateRegistrySource).toContain('function deepFreezeTemplateValue<T>(value: T): T {');
    expect(templateRegistrySource).toContain('function getCanonicalTemplateSource(templateId: string | undefined): TemplateDefinition {');
    expect(templateRegistrySource).toContain('function getCanonicalTemplateDefinition(templateId: unknown): TemplateDefinition {');
    expect(templateRegistrySource).toContain('return getCanonicalTemplateSource(getCanonicalTemplateSourceId(templateId));');
    expect(templateRegistrySource).toContain("base: cloneTemplateDefinition(getCanonicalTemplateDefinition('base')),");
    expect(templateRegistrySource).toContain("variant: isRegistryTemplateSection");
    expect(templateRegistrySource).toContain("variant: isRegistryTemplateSection");
    expect(templateRegistrySource).toContain('? canonicalRegistrySection.variant');
    expect(templateRegistrySource).toContain("return resolveCanonicalRegistrySectionInput('registry', variant).variant;");
    expect(templateRegistrySource).toContain('const canonicalRegistrySection = resolveCanonicalRegistrySectionInput(section.type, section.variant);');
    expect(templateRegistrySource).toContain("const isRegistryTemplateSection = canonicalRegistrySection.type === 'registry';");
    expect(templateRegistrySource).toContain("type: isRegistryTemplateSection ? canonicalRegistrySection.type : section.type,");
    expect(templateRegistrySource).toContain('bindings: cloneTemplateValue(section.bindings ?? {}),');
    expect(templateRegistrySource).toContain('settings: cloneTemplateValue(section.settings ?? {}),');
    expect(templateRegistrySource).toContain('overrides: cloneTemplateValue(section.overrides ?? undefined),');
    expect(templateRegistrySource).toContain('function cloneTemplateDefinition(template: TemplateDefinition): TemplateDefinition {');
    expect(templateRegistrySource).toContain('const clonedTemplate = cloneTemplateValue(template);');
    expect(templateRegistrySource).toContain('return cloneTemplateDefinition(getCanonicalTemplateDefinition(templateId));');
    expect(templateRegistrySource).toContain('return templateRegistry.map((template) => cloneTemplateDefinition(getCanonicalTemplateDefinition(template.id)));');
    expect(sectionRegistrySource).toContain('export function resolveCanonicalRegistrySectionInput(type: unknown, variant: unknown): { type: string; variant: string } {');
    expect(sectionRegistrySource).toContain('export function resolveCanonicalRegistrySectionType(type: unknown): string {');
    expect(sectionRegistrySource).toContain('export function resolveCanonicalRegistryVariant(variant: unknown): string {');
    expect(sectionRegistrySource).toContain('const canonicalSection = resolveCanonicalRegistrySectionInput(type, variant);');
    expect(sectionRegistrySource).toContain('throw new Error(`No section definition for ${canonicalSection.type}::${canonicalSection.variant}`);');
    expect(sectionRegistrySource).toContain('const fallbackVariant = getCanonicalSectionFallbackVariant(canonicalSection.type, normalizedType, normalizedVariant);');
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
