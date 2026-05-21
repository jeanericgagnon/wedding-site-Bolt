#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (file) => readFileSync(resolve(process.cwd(), file), 'utf8');
const hasAll = (source, fragments) => fragments.every((fragment) => source.includes(fragment));

const files = {
  registryPage: read('src/pages/dashboard/Registry.tsx'),
  registryTypes: read('src/pages/dashboard/registry/registryTypes.ts'),
  repairState: read('src/pages/dashboard/registry/repairState.ts'),
  duplicateRegistryItems: read('src/pages/dashboard/registry/duplicateRegistryItems.ts'),
  registryItemCard: read('src/pages/dashboard/registry/RegistryItemCard.tsx'),
  registryItemForm: read('src/pages/dashboard/registry/RegistryItemForm.tsx'),
  sectionRegistry: read('src/sections/registry.ts'),
  canonicalSectionRegistry: read('src/lib/canonicalSectionRegistry.ts'),
  registryCardsSection: read('src/sections/variants/registry/cards.tsx'),
  registryFeaturedSection: read('src/sections/variants/registry/featured.tsx'),
  registrySectionComponent: read('src/sections/components/RegistrySection.tsx'),
  sectionManifests: read('src/builder/registry/sectionManifests.ts'),
  templateRegistry: read('src/templates/registry.ts'),
  initialLayout: read('src/lib/generateInitialLayout.ts'),
  siteGenerator: read('src/lib/siteGenerator.ts'),
  aiBuilderProjectPatch: read('src/lib/aiBuilderProjectPatch.ts'),
  weddingDataAdapter: read('src/builder/adapters/weddingDataAdapter.ts'),
  canonicalContentMapper: read('src/lib/aiCanonicalContentMapper.ts'),
  registryLinkCarryover: read('src/lib/registryLinkCarryover.ts'),
  onboardingMapper: read('src/lib/onboardingMapper.ts'),
  generateWeddingData: read('src/lib/generateWeddingData.ts'),
  weddingDataBindings: read('src/render/weddingDataBindings.ts'),
  guidedBuilderModules: read('src/components/dashboard/GuidedBuilderModules.tsx'),
  builderV2Adapter: read('src/builder-v2/adapter.ts'),
  sectionVariantCompatibility: read('src/lib/sectionVariantCompatibility.ts'),
  builderInspectorPanel: read('src/builder/components/BuilderInspectorPanel.tsx'),
  builderSectionRail: read('src/builder/components/BuilderSectionRail.tsx'),
  builderSidebarLibrary: read('src/builder/components/BuilderSidebarLibrary.tsx'),
  variantPreviewSource: read('src/builder/registry/variantPreviewSource.ts'),
  siteView: read('src/pages/SiteView.tsx'),
  registryProof: read('scripts/v1-proof-registry.mjs'),
};

const checks = [
  {
    name: 'dashboard normalizes registry purchase truth before owner summaries',
    ok: hasAll(files.registryPage, [
      'function normalizeOwnerDashboardRegistryItem(item: RegistryItem): RegistryItem {',
      'sanitizeRegistryQuantityState(item.quantity_purchased ?? 0, item.quantity_needed ?? 1)',
      'purchase_status: quantityState.purchaseStatus,',
      "purchaser_name: quantityState.purchaseStatus === 'available' ? null : item.purchaser_name,",
      'const normalizedItems = items.map(normalizeOwnerDashboardRegistryItem);',
      'const duplicateGroups = findDuplicateRegistryGroups(normalizedItems);',
      'setItems(data.map(normalizeOwnerDashboardRegistryItem));',
      'normalizeOwnerDashboardRegistryItem(updated)',
      'normalizeOwnerDashboardRegistryItem(created)',
      'const filtered = normalizedItems.filter(item => {',
    ]),
  },
  {
    name: 'dashboard repair and import counts use normalized registry truth',
    ok: hasAll(files.registryPage, [
      'badImports: normalizedItems.filter((i) => getRegistryItemMetadataState(i).hasBadImportTitle).length,',
      'const actionableBadImportCount = normalizedItems.filter((item) => getRegistryItemMetadataState(item).hasBadImportTitle && !!(item.item_url || item.canonical_url)).length;',
      'repair: actionableBadImportCount,',
      'Repair states: {normalizedItems.filter((item) => getRegistryRepairStates(item).length > 0).length}',
      'findDuplicateRegistryGroups',
      'fields.store_name = (preview.merchant ?? preview.brand)!;',
    ]) && files.registryTypes.includes('product unavailable'),
  },
  {
    name: 'section registry clones definitions and resolves registry aliases safely',
    ok: hasAll(files.sectionRegistry, [
      'function cloneSectionDefinitionValue<T>(value: T): T {',
      'function cloneSectionDefinition(definition: SectionDefinition): SectionDefinition {',
      'function getCanonicalSectionDefinition(type: string, variant: string): SectionDefinition | null {',
      'export function getDefinition(type: string, variant: unknown): SectionDefinition | null {',
      'return definition ? cloneSectionDefinition(definition) : null;',
      'export function getAllDefinitions(): SectionDefinition[] {',
      'return Array.from(SECTION_REGISTRY.values()).map(cloneSectionDefinition);',
      'export function getVariantsForType(type: string): SectionDefinition[] {',
      'const strictVariant = options?.strictVariant === true;',
      'const fallbackVariant = getCanonicalSectionFallbackVariant(canonicalSection.type, normalizedType, normalizedVariant);',
      'const defaultVariant = getDefaultVariantForType(normalizedType);',
    ]),
  },
  {
    name: 'section registry normalizes malformed registry section type and variant drift',
    ok: hasAll(files.sectionRegistry, [
      'function normalizeRegistryVariantKey(variant: unknown): string {',
      'function isRegistrySectionType(type: unknown): boolean {',
      "return normalizedType === 'registry' || normalizedType.startsWith('registrysection');",
      'function normalizeRegistrySectionType(type: unknown): string {',
      'export function resolveCanonicalRegistrySectionType(type: unknown): string {',
      'export function resolveCanonicalRegistryVariant(variant: unknown): string {',
      'function getVariantFallbacksForType(type: string, inputType?: string): Record<string, string> {',
      'function getCanonicalSectionFallbackVariant(type: string, inputType: string, variant: string): string | null {',
      'function resolveCanonicalSectionVariantForType(type: string, inputType: string, variant: unknown): string {',
      'export function resolveCanonicalRegistrySectionInput(type: unknown, variant: unknown): { type: string; variant: string } {',
      "'registry-section': 'registry',",
      "default: 'cards'",
      "grid: 'cards'",
    ]),
  },
  {
    name: 'builder and shipped templates expose registry aliases consistently',
    ok: hasAll(files.sectionManifests, [
      "'classic'",
      "'luxury'",
      "'experiences'",
      "'modern'",
      "'playful'",
    ]) && hasAll(files.templateRegistry, [
      "variant: 'classic'",
      "variant: 'luxury'",
      "variant: 'experiences'",
    ]) && hasAll(files.canonicalSectionRegistry, [
      "luxury: 'featured'",
      "experiences: 'featured'",
      "classic: 'cards'",
    ]),
  },
  {
    name: 'template registry deep-clones and canonicalizes registry template sections',
    ok: hasAll(files.templateRegistry, [
      "import { resolveCanonicalRegistrySectionInput } from '../sections/registry';",
      'function normalizeTemplateIdKey(templateId: unknown): string {',
      'function cloneTemplateValue<T>(value: T): T {',
      'function deepFreezeTemplateValue<T>(value: T): T {',
      'function cloneTemplateSection(section: TemplateSection): TemplateSection {',
      'const canonicalRegistrySection = resolveCanonicalRegistrySectionInput(section.type, section.variant);',
      "const isRegistryTemplateSection = canonicalRegistrySection.type === 'registry';",
      'function cloneTemplateDefinition(template: TemplateDefinition): TemplateDefinition {',
      'const clonedTemplate = cloneTemplateValue(template);',
      'const TEMPLATE_ALIAS_TARGETS: Record<string, string> = {',
      'export const TEMPLATE_REGISTRY: Record<string, TemplateDefinition> = deepFreezeTemplateValue({',
      'const templateIdAliases = new Map<string, string>(',
      'export function resolveCanonicalTemplateId(templateId: unknown): string {',
      'export function getTemplate(templateId: unknown): TemplateDefinition {',
      'return cloneTemplateDefinition(getCanonicalTemplateDefinition(templateId));',
    ]) && hasAll(files.initialLayout, [
      'function normalizeSectionTypeKey(type: unknown): string {',
      'function isRegistrySectionType(type: unknown): boolean {',
      'if (isRegistrySectionType(type)) return !hasRealRegistryContent;',
      'currentSectionsByType.set(normalizeSectionTypeKey(section.type), section);',
    ]) && files.siteGenerator.includes("import { getTemplate } from '../templates/registry';") && files.aiBuilderProjectPatch.includes("if (normalizeBuilderSectionTypeKey(type) === 'registry') {"),
  },
  {
    name: 'registry link carryover preserves source labels through parsing, dedupe, and merge',
    ok: hasAll(files.registryLinkCarryover, [
      'interface CarryoverRegistryToken {',
      "sourceLabelMode?: 'explicit' | 'inferred';",
      'function inferSourceLabel(url: string): string | undefined {',
      'function isWeakExplicitTokenLabel(url: string, label: string | undefined): boolean {',
      'function isWeakInferredSourceLabel(url: string, label: string | undefined): boolean {',
      'function extractExplicitSourceLabelFragment(text: string): string | undefined {',
      'function extractExplicitSourceLabelFromTokenText(text: string): string | undefined {',
      'function dedupeNormalizedRegistryLinks(links: CarryoverRegistryLink[]): CarryoverRegistryLink[] {',
      'const existingInferredLabel = inferSourceLabel(existing.url);',
      'export function parsePersistedRegistryLinks(raw: string | null | undefined): CarryoverRegistryLink[] {',
      'export function mergeRegistrySourceLabels(',
      'const existingNormalized = dedupeNormalizedRegistryLinks(existing',
      'const inferredMergedLabel = inferSourceLabel(existingMerged.url);',
      'let pendingSourceLabel: string | undefined;',
      "if (lower.includes('crateandbarrel.com')) return 'Crate & Barrel';",
      "if (lower.includes('zola.com')) return 'Zola';",
    ]),
  },
  {
    name: 'onboarding and generation preserve carried registry source labels',
    ok: files.onboardingMapper.includes('mergeRegistrySourceLabels(carriedRegistryLinks, parsePersistedRegistryLinks(input.registryLinks ?? \'\'))')
      && files.generateWeddingData.includes('mergeRegistrySourceLabels(')
      && files.generateWeddingData.includes('carryOverRegistryLinks(formData.registryLinksRaw || formData.registryLinks || formData.registryLink)')
      && files.generateWeddingData.includes('parsePersistedRegistryLinks(formData.registryLinks || formData.registryLink)'),
  },
  {
    name: 'builder and render bindings tolerate drifted registry section types',
    ok: hasAll(files.weddingDataAdapter, [
      "function normalizeBuilderBindingSectionType(type: BuilderSectionInstance['type']): BuilderSectionInstance['type'] {",
      "return (normalizedType === 'registrysection' ? 'registry' : type) as BuilderSectionInstance['type'];",
    ]) && hasAll(files.canonicalContentMapper, [
      "case 'registrysection':",
    ]) && hasAll(files.weddingDataBindings, [
      'function normalizeBindableSectionType(type: string): string {',
      "case 'registrysection':",
      "return 'registry';",
    ]) && hasAll(files.guidedBuilderModules, [
      'const normalizeModuleSectionType = (type: string) => type.trim().toLowerCase().replace(/[^a-z0-9]/g, \'\');',
      'normalizeModuleSectionType(s.type) === normalizeModuleSectionType(sectionType)',
    ]) && hasAll(files.builderV2Adapter, [
      'const normalizeBuilderV2SectionType = (type: string) => {',
      "return normalizedType.startsWith('registrysection') ? 'registry' : type;",
    ]),
  },
  {
    name: 'public registry sections use live canonical links and partial purchase truth',
    ok: hasAll(files.registryCardsSection, [
      'return item.item_url ?? item.canonical_url ?? null;',
      'export function normalizeRegistryStoreGroupItems(items: RegistryItem[]): RegistryItem[] {',
      'const shouldUseLiveStoreGroups = shouldUseLiveRegistryStoreGroups(liveItems);',
      "partial: existing.partial + (item.purchase_status === 'partial' ? 1 : 0)",
    ]) && hasAll(files.registryFeaturedSection, [
      "return item.item_url ?? item.canonical_url ?? '';",
      'export function normalizeRegistryFeaturedItems(items: RegistryItem[]): RegistryItem[] {',
      'const shouldUseLiveData = shouldUseLiveRegistryFeaturedData(liveItems);',
      "isPartiallyClaimed: normalizedItem.purchase_status === 'partial'",
      "heroGift.isPartiallyClaimed ? 'View remaining gift' : 'View gift'",
    ]) && hasAll(files.registrySectionComponent, [
      'export function shouldUseLiveRegistryItems(items: RegistryItem[] | null): items is RegistryItem[] {',
      'export function normalizePublicRegistryItemState(item: RegistryItem): RegistryItem {',
      'purchase_status: quantityState.purchaseStatus,',
      "return item.purchase_status === 'partial' ? 'Buy remaining' : 'Mark as purchasing';",
      "title: 'Buy remaining gift'",
      "return 'No items match this filter right now.';",
    ]),
  },
  {
    name: 'owner registry item cards and forms preserve canonical links and purchase labels',
    ok: hasAll(files.registryItemCard, [
      'const pagePreviewSourceUrl = normalizedItem.item_url ?? normalizedItem.canonical_url ?? null;',
      "export function getOwnerRegistryPurchaserLabel(item: Pick<RegistryItem, 'purchase_status' | 'purchaser_name'>): string | null {",
      'export function normalizeOwnerRegistryItemState(item: RegistryItem): RegistryItem {',
      '? `Purchased by ${item.purchaser_name}`',
    ]) && hasAll(files.registryItemForm, [
      "const [urlInput, setUrlInput] = useState(initial?.item_url ?? initial?.canonical_url ?? '');",
      'canonical_url: nextUrl,',
    ]),
  },
  {
    name: 'registry repair/types expose launch-critical helpers',
    ok: hasAll(files.registryTypes, [
      'export function itemNeedsAttention',
      'export function sanitizeRegistryQuantityState',
      'export function normalizeRegistryComparisonUrl',
      'export function normalizeRegistryTitleForComparison',
      'Amazon blocks automated product lookups',
    ]) && files.repairState.includes('export function getRegistryRepairStates') && files.duplicateRegistryItems.includes('normalizeRegistryTitleForComparison'),
  },
  {
    name: 'registry proof still marks runtime truth as manual-proof pending',
    ok: hasAll(files.registryProof, [
      "status: 'manual-proof-pending'",
      "highestRiskTrustGap: 'runtime_registry_truth_after_real_edits'",
      "secondaryTrustGap: 'registry_repair_and_import_persistence_manual_verification_missing'",
      'manualProofRequired: true',
      "truthGateSummary: 'automation_green_manual_truth_red'",
      "'owner_manage_import_persistence_runtime_pass'",
      "'owner_repair_cleanup_runtime_pass'",
      "'guest_visible_purchase_truth_runtime_pass'",
    ]),
  },
  {
    name: 'builder registry previews map aliases onto guest-visible layouts',
    ok: hasAll(files.variantPreviewSource, [
      'function isRegistryPreviewSectionType(type: string): boolean {',
      "return normalizedType === 'registry' || normalizedType.startsWith('registrysection');",
      "case 'classic':",
      "return 'cards';",
      "case 'luxury':",
      "return 'featured';",
    ]) && files.builderInspectorPanel.includes('getVariantPreviewSource(selectedSection.type, v.id)')
      && files.builderSectionRail.includes('getVariantPreviewSource(addTypeManifest.type, v.id)')
      && files.builderSidebarLibrary.includes('PREVIEW_FIXTURES_BY_VARIANT[`${sectionType}:${previewVariantId}`]'),
  },
  {
    name: 'site view registry fallback normalization stays aligned with public registry aliases',
    ok: hasAll(files.siteView, [
      'registry: {',
      "default: 'cards'",
      "fundHighlight: 'featured'",
      "luxury: 'featured'",
      "modern: 'cards'",
      "const nextVariant = fallbackMap[section.type]?.[section.variant] ?? supported[0] ?? 'default';",
    ]),
  },
];

const failures = checks.filter((check) => !check.ok);
if (failures.length) {
  console.error('registry guard failed');
  failures.forEach((failure) => console.error(`- ${failure.name}`));
  process.exit(1);
}

console.log(JSON.stringify({ ok: true, checks: checks.map((check) => check.name) }, null, 2));
