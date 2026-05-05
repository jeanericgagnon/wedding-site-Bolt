import type { BuilderSectionType } from '../../types/builder/section';
import type { VariantMeta } from '../registry/sectionManifests';
import { getVariantPreviewSource } from '../registry/variantPreviewSource';

export type VariantQualityFlag =
  | 'shared-preview'
  | 'mobile-risk'
  | 'generic-name'
  | 'thin-description'
  | 'missing-guidance'
  | 'low-variety-section';

export interface VariantQualityScore {
  score: number;
  status: 'strong' | 'review' | 'needs-work';
  flags: VariantQualityFlag[];
  previewSource: string;
}

const GENERIC_VARIANT_IDS = new Set([
  'default',
  'minimal',
  'simple',
  'card',
  'cards',
  'grid',
  'inline',
  'full',
]);

const MOBILE_RISK_TERMS = [
  'background',
  'carousel',
  'film',
  'fullbleed',
  'horizontal',
  'map',
  'masonry',
  'mosaic',
  'multi',
  'reel',
  'split',
  'timeline',
  'transport',
  'video',
];

export function getVariantQualityScore(
  sectionType: BuilderSectionType,
  variant: VariantMeta,
  sectionVariantCount: number,
): VariantQualityScore {
  const flags: VariantQualityFlag[] = [];
  const previewSource = getVariantPreviewSource(sectionType, variant.id);
  const searchable = `${variant.id} ${variant.label} ${variant.description}`.toLowerCase();

  if (previewSource !== variant.id) flags.push('shared-preview');
  if (MOBILE_RISK_TERMS.some((term) => searchable.includes(term))) flags.push('mobile-risk');
  if (GENERIC_VARIANT_IDS.has(variant.id) || GENERIC_VARIANT_IDS.has(variant.label.toLowerCase())) flags.push('generic-name');
  if (variant.description.trim().length < 44) flags.push('thin-description');
  if (!variant.bestFor?.trim() || !variant.effort) flags.push('missing-guidance');
  if (sectionVariantCount < 6) flags.push('low-variety-section');

  let score = 100;
  for (const flag of flags) {
    if (flag === 'shared-preview') score -= 22;
    if (flag === 'mobile-risk') score -= 10;
    if (flag === 'generic-name') score -= 8;
    if (flag === 'thin-description') score -= 8;
    if (flag === 'missing-guidance') score -= 10;
    if (flag === 'low-variety-section') score -= 14;
  }

  const normalizedScore = Math.max(0, Math.min(100, score));
  const status = normalizedScore >= 86 ? 'strong' : normalizedScore >= 70 ? 'review' : 'needs-work';

  return { score: normalizedScore, status, flags, previewSource };
}

export function getVariantQualityLabel(flag: VariantQualityFlag): string {
  switch (flag) {
    case 'shared-preview':
      return 'Shared preview';
    case 'mobile-risk':
      return 'Mobile risk';
    case 'generic-name':
      return 'Generic naming';
    case 'thin-description':
      return 'Thin notes';
    case 'missing-guidance':
      return 'Missing guidance';
    case 'low-variety-section':
      return 'Low variety';
  }
}
