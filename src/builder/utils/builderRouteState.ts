import type { BuilderProject } from '../../types/builder/project';
import type { BuilderSectionType } from '../../types/builder/section';

export type BuilderSectionTarget = {
  pageId: string;
  sectionId: string;
};

export const shouldFocusTravelSectionFromSearch = (search: string): boolean => {
  const params = new URLSearchParams(search);
  const tool = params.get('tool');
  return tool === 'travel' || tool === 'hotel-block';
};

export const findBuilderSectionTargetByType = (
  project: BuilderProject | null,
  sectionType: BuilderSectionType
): BuilderSectionTarget | null => {
  if (!project) return null;

  for (const page of project.pages) {
    const match = page.sections.find((section) => section.type === sectionType);
    if (match) {
      return {
        pageId: page.id,
        sectionId: match.id,
      };
    }
  }

  return null;
};
