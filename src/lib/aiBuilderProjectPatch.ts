import { DraftGenerationResult } from './aiDraftGenerator';


const shouldReplaceSectionSetting = (value: unknown) => {
  if (!value || typeof value !== 'object') return true;
  const record = value as Record<string, unknown>;
  return !record.source || record.source === 'concierge-brief';
};

const toGeneratedSetting = (value: string) => ({
  value,
  source: 'concierge-brief',
  updatedAt: new Date().toISOString(),
});

const mergeGeneratedSetting = (current: unknown, nextValue: string) => {
  if (!shouldReplaceSectionSetting(current)) return current;
  return toGeneratedSetting(nextValue);
};


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
            headline: mergeGeneratedSetting(settings.headline, generatedDraft.heroTitle),
            subtitle: mergeGeneratedSetting(settings.subtitle, generatedDraft.heroSubtitle),
            title: mergeGeneratedSetting(settings.title, 'We are getting married'),
          },
        };
      }

      if (type === 'story') {
        return {
          ...section,
          settings: {
            ...settings,
            title: mergeGeneratedSetting(settings.title, generatedDraft.storyTitle),
            storyText: mergeGeneratedSetting(settings.storyText, generatedDraft.storyBody),
          },
        };
      }

      if (type === 'footer-cta') {
        return {
          ...section,
          settings: {
            ...settings,
            headline: mergeGeneratedSetting(settings.headline, generatedDraft.rsvpCallToAction),
            subtext: mergeGeneratedSetting(settings.subtext, generatedDraft.eventHeadline),
          },
        };
      }

      if (type === 'countdown') {
        return {
          ...section,
          settings: {
            ...settings,
            title: mergeGeneratedSetting(settings.title, generatedDraft.countdownTitle),
            message: mergeGeneratedSetting(settings.message, generatedDraft.countdownMessage),
          },
        };
      }

      if (type === 'venue') {
        return {
          ...section,
          settings: {
            ...settings,
            title: mergeGeneratedSetting(settings.title, generatedDraft.venueTitle),
            subtitle: mergeGeneratedSetting(settings.subtitle, generatedDraft.venueIntro),
          },
        };
      }

      if (type === 'schedule') {
        return {
          ...section,
          settings: {
            ...settings,
            title: mergeGeneratedSetting(settings.title, generatedDraft.scheduleTitle),
            subtitle: mergeGeneratedSetting(settings.subtitle, generatedDraft.scheduleIntro),
          },
        };
      }

      if (type === 'gallery') {
        return {
          ...section,
          settings: {
            ...settings,
            title: mergeGeneratedSetting(settings.title, generatedDraft.galleryTitle),
            subtitle: mergeGeneratedSetting(settings.subtitle, generatedDraft.galleryIntro),
          },
        };
      }

      if (type === 'rsvp') {
        return {
          ...section,
          settings: {
            ...settings,
            title: mergeGeneratedSetting(settings.title, generatedDraft.rsvpTitle),
            subtitle: mergeGeneratedSetting(settings.subtitle, generatedDraft.rsvpIntro),
          },
        };
      }

      if (type === 'registry') {
        return {
          ...section,
          settings: {
            ...settings,
            title: mergeGeneratedSetting(settings.title, generatedDraft.registryTitle),
          },
        };
      }

      if (type === 'faq') {
        return {
          ...section,
          settings: {
            ...settings,
            headline: mergeGeneratedSetting(settings.headline, generatedDraft.faqHeadline),
            subheadline: mergeGeneratedSetting(settings.subheadline, generatedDraft.faqIntro),
          },
        };
      }

      if (type === 'travel') {
        return {
          ...section,
          settings: {
            ...settings,
            headline: mergeGeneratedSetting(settings.headline, generatedDraft.travelTitle),
            intro: mergeGeneratedSetting(settings.intro, generatedDraft.travelIntro),
          },
        };
      }

      if (type === 'accommodations') {
        return {
          ...section,
          settings: {
            ...settings,
            headline: mergeGeneratedSetting(settings.headline, generatedDraft.accommodationsTitle),
            generalNote: mergeGeneratedSetting(settings.generalNote, generatedDraft.accommodationsIntro),
          },
        };
      }

      if (type === 'weddingParty') {
        return {
          ...section,
          settings: {
            ...settings,
            headline: mergeGeneratedSetting(settings.headline, generatedDraft.weddingPartyTitle),
            subheadline: mergeGeneratedSetting(settings.subheadline, generatedDraft.weddingPartyIntro),
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
