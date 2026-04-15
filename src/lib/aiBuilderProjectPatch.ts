import { DraftGenerationResult } from './aiDraftGenerator';

export const mergeGeneratedDraftIntoBuilderProject = (
  existingSiteJson: Record<string, unknown> | null,
  generatedDraft: DraftGenerationResult
) => {
  const project = (existingSiteJson ?? {}) as Record<string, unknown>;
  const pages = Array.isArray(project.pages) ? (project.pages as Array<Record<string, unknown>>) : [];

  const nextPages = pages.map((page) => {
    const sections = Array.isArray(page.sections) ? (page.sections as Array<Record<string, unknown>>) : [];
    const nextSections = sections.map((section) => {
      const type = section.type;
      const settings = ((section.settings as Record<string, unknown> | undefined) ?? {});

      if (type === 'hero') {
        return {
          ...section,
          settings: {
            ...settings,
            headline: generatedDraft.heroTitle,
            subtitle: generatedDraft.heroSubtitle,
          },
        };
      }

      if (type === 'story') {
        return {
          ...section,
          settings: {
            ...settings,
            title: generatedDraft.storyTitle,
            storyText: generatedDraft.storyBody,
          },
        };
      }

      if (type === 'footer-cta') {
        return {
          ...section,
          settings: {
            ...settings,
            headline: generatedDraft.rsvpCallToAction,
            subtext: generatedDraft.eventHeadline,
          },
        };
      }

      return section;
    });

    return {
      ...page,
      sections: nextSections,
    };
  });

  return {
    ...project,
    pages: nextPages,
  };
};
