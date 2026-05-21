export type TemplateLaunchTier = 'flagship' | 'secondary' | 'hidden';

export const LAUNCH_FLAGSHIP_TEMPLATE_IDS = [
  'modern-luxe',
  'editorial-romance',
  'timeless-classic',
  'destination-minimal',
  'bold-contemporary',
  'photo-storytelling',
  'floral-garden',
] as const;

export const LAUNCH_SECONDARY_TEMPLATE_IDS = [
  'editorial-romance-ivory',
  'editorial-romance-midnight',
  'floral-garden-sage',
  'floral-garden-rose',
  'modern-luxe-ivory',
  'timeless-classic-navy',
  'coastal-weekend',
  'black-tie-ballroom',
  'rustic-vineyard',
  'playful-color',
] as const;

const FLAGSHIP_IDS = new Set<string>(LAUNCH_FLAGSHIP_TEMPLATE_IDS);
const SECONDARY_IDS = new Set<string>(LAUNCH_SECONDARY_TEMPLATE_IDS);
const LAUNCH_ORDER = new Map<string, number>(
  [...LAUNCH_FLAGSHIP_TEMPLATE_IDS, ...LAUNCH_SECONDARY_TEMPLATE_IDS].map((id, index) => [id, index])
);

export function getTemplateLaunchTier(templateId: string): TemplateLaunchTier {
  if (FLAGSHIP_IDS.has(templateId)) return 'flagship';
  if (SECONDARY_IDS.has(templateId)) return 'secondary';
  return 'hidden';
}

export function isLaunchVisibleTemplateId(templateId: string): boolean {
  return getTemplateLaunchTier(templateId) !== 'hidden';
}

export function getTemplateLaunchOrder(templateId: string): number {
  return LAUNCH_ORDER.get(templateId) ?? Number.MAX_SAFE_INTEGER;
}
