import type { CanonicalPageDocument, CanonicalSectionDefinition } from './canonicalPageContract';

export type CanonicalTemplateValidationIssue = {
  message: string;
  pageId: string;
  sectionId: string;
};

export const validateCanonicalPageDocument = (
  document: CanonicalPageDocument,
  registry: Record<string, CanonicalSectionDefinition>,
): CanonicalTemplateValidationIssue[] => {
  const issues: CanonicalTemplateValidationIssue[] = [];

  for (const page of document.pages) {
    for (const section of page.sections) {
      const definition = registry[section.type];
      if (!definition) {
        issues.push({
          message: `Unknown section type ${section.type}`,
          pageId: page.id,
          sectionId: section.id,
        });
        continue;
      }

      if (section.variant && definition.variants && !definition.variants.includes(section.variant)) {
        issues.push({
          message: `Unsupported variant ${section.variant} for ${section.type}`,
          pageId: page.id,
          sectionId: section.id,
        });
      }
    }
  }

  return issues;
};
