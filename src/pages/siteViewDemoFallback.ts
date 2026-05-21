import { getTemplatePack } from '../builder/constants/builderTemplatePacks';
import { buildTemplatePageInstances } from '../builder/utils/templatePages';
import type { BuilderPage } from '../types/builder/project';
import type { WeddingDataV1 } from '../types/weddingData';
import { createAlexJordanDemoWeddingData } from './siteViewHelpers';

function titleCaseSlugPart(value: string): string {
  return value
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

function hasText(value: string): boolean {
  return value.trim().length > 0;
}

export function deriveCoupleNamesFromPublicSlug(siteSlug: string): { partner1Name: string; partner2Name: string; displayName: string } | null {
  const normalized = siteSlug.trim().toLowerCase();
  const match = normalized.match(/^(.+?)(?:-and-|and)(.+)$/);
  if (!match) return null;

  const partner1Name = titleCaseSlugPart(match[1] ?? '');
  const partner2Name = titleCaseSlugPart(match[2] ?? '');
  if (!hasText(partner1Name) || !hasText(partner2Name)) return null;

  return {
    partner1Name,
    partner2Name,
    displayName: `${partner1Name} and ${partner2Name}`,
  };
}

export function createDemoFallbackPages(templateId = 'modern-luxe'): BuilderPage[] {
  const template = getTemplatePack(templateId);
  if (!template) return [];
  return buildTemplatePageInstances(template, 'multi');
}

export function createDemoWeddingDataForSlug(siteSlug: string): WeddingDataV1 {
  const demoData = createAlexJordanDemoWeddingData();
  const derived = deriveCoupleNamesFromPublicSlug(siteSlug);
  if (!derived) return demoData;

  return {
    ...demoData,
    couple: {
      ...demoData.couple,
      partner1Name: derived.partner1Name,
      partner2Name: derived.partner2Name,
      displayName: derived.displayName,
    },
  };
}
