import { SECTION_MANIFESTS } from '../builder/registry/sectionManifests';
import { manifestToCanonicalSectionDefinition } from './canonicalSectionRegistry';
import { layoutConfigToCanonicalPageDocument } from './canonicalPageAdapters';
import { validateCanonicalPageDocument } from './canonicalTemplateValidation';
import type { LayoutConfigV1 } from '../types/layoutConfig';

const registry = Object.fromEntries(
  Object.values(SECTION_MANIFESTS).map((manifest) => [manifest.type, manifestToCanonicalSectionDefinition(manifest)])
);

export const assertCanonicalTemplateLayout = (layout: LayoutConfigV1, context: string): void => {
  const issues = validateCanonicalPageDocument(layoutConfigToCanonicalPageDocument(layout), registry);
  if (issues.length === 0) return;

  const message = `${context} failed canonical template validation:\n${issues
    .map((issue) => `- ${issue.message} (${issue.pageId}/${issue.sectionId})`)
    .join('\n')}`;

  throw new Error(message);
};
