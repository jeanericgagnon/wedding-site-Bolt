import { getTemplate } from '../../templates/registry';
import { buildBuilderV2TemplateSeed } from '../../pages/builderV2TemplateSeed';
import { resolveBuilderVariant } from '../../lib/sectionVariantCompatibility';
import { getSectionVariants, getSectionComponent } from '../../sections/sectionRegistry';
import { resolveAndParse } from '../../sections/registry';
import type { SectionType } from '../../types/layoutConfig';

export interface TemplateCompatibilityVariantRow {
  type: string;
  sourceVariant: string;
  builderVariant: string;
  builderSupported: boolean;
  runtimeSupported: boolean;
  publicSupported: boolean;
  normalized: boolean;
}

export interface TemplateCompatibilityReport {
  templateId: string;
  templateName: string;
  sectionCount: number;
  normalizedVariantCount: number;
  builderSeedStatus: 'verified' | 'risk';
  runtimeStatus: 'verified' | 'risk';
  publicRuntimeStatus: 'verified' | 'risk';
  overallStatus: 'verified' | 'normalized' | 'risk';
  sectionRows: TemplateCompatibilityVariantRow[];
}

const toSectionType = (type: string) => type as SectionType;

export function getTemplateCompatibilityReport(templateId: string): TemplateCompatibilityReport {
  const template = getTemplate(templateId);
  const seed = buildBuilderV2TemplateSeed(template.id);
  const seededSections = seed.pages.flatMap((page) => page.sections);
  const sectionRows = template.defaultLayout.sections.map((section, index) => {
    const type = String(section.type);
    const sourceVariant = section.variant || 'default';
    const builderVariant = seededSections[index]?.variant ?? resolveBuilderVariant(toSectionType(type), sourceVariant);
    const builderSupported = getSectionVariants(toSectionType(type)).includes(builderVariant);
    const runtimeSupported = Boolean(resolveAndParse(type, sourceVariant, {}, { strictVariant: true }));

    let publicSupported = false;
    try {
      publicSupported = typeof getSectionComponent(toSectionType(type), builderVariant) === 'function';
    } catch {
      publicSupported = false;
    }

    return {
      type,
      sourceVariant,
      builderVariant,
      builderSupported,
      runtimeSupported,
      publicSupported,
      normalized: builderVariant !== sourceVariant,
    };
  });

  const normalizedVariantCount = sectionRows.filter((row) => row.normalized).length;
  const builderSeedStatus = sectionRows.every((row) => row.builderSupported) ? 'verified' : 'risk';
  const runtimeStatus = sectionRows.every((row) => row.runtimeSupported) ? 'verified' : 'risk';
  const publicRuntimeStatus = sectionRows.every((row) => row.publicSupported) ? 'verified' : 'risk';
  const overallStatus = builderSeedStatus === 'verified' && runtimeStatus === 'verified' && publicRuntimeStatus === 'verified'
    ? (normalizedVariantCount > 0 ? 'normalized' : 'verified')
    : 'risk';

  return {
    templateId: template.id,
    templateName: template.name,
    sectionCount: sectionRows.length,
    normalizedVariantCount,
    builderSeedStatus,
    runtimeStatus,
    publicRuntimeStatus,
    overallStatus,
    sectionRows,
  };
}
