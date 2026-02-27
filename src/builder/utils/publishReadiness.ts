import type { BuilderProject } from '../../types/builder/project';

export type PublishIssue =
  | { kind: 'no-pages'; message: string }
  | { kind: 'no-enabled-sections'; message: string; firstSectionId?: string; firstPageId?: string };

export const getPublishIssue = (project: BuilderProject): PublishIssue | null => {
  if (!project.pages.length) {
    return { kind: 'no-pages', message: 'Add at least one page before publishing.' };
  }

  const firstSection = project.pages.flatMap((p) => p.sections.map((s) => ({ pageId: p.id, sectionId: s.id })))[0];
  const hasEnabledSection = project.pages.some((page) => page.sections.some((section) => section.enabled));
  if (!hasEnabledSection) {
    return {
      kind: 'no-enabled-sections',
      message: 'Enable at least one section before publishing.',
      firstSectionId: firstSection?.sectionId,
      firstPageId: firstSection?.pageId,
    };
  }

  return null;
};

export const getPublishValidationError = (project: BuilderProject): string | null =>
  getPublishIssue(project)?.message ?? null;
