export type BuilderV2ReviewSectionSnapshot = {
  id: string;
  title: string;
  type: string;
  enabled: boolean;
  blockCount: number;
  warningCount: number;
};

export type BuilderV2ReviewPageSnapshot = {
  id: string;
  title: string;
  slug: string;
  hidden: boolean;
  isHome: boolean;
  sections: BuilderV2ReviewSectionSnapshot[];
};

export const getBuilderV2VisibleSectionTitles = (pages: BuilderV2ReviewPageSnapshot[]) => (
  pages.flatMap((page) => page.hidden
    ? []
    : page.sections.filter((section) => section.enabled).map((section) => section.title))
);

export const getBuilderV2HiddenSectionTitles = (pages: BuilderV2ReviewPageSnapshot[]) => (
  pages.flatMap((page) => page.hidden
    ? page.sections.map((section) => section.title)
    : page.sections.filter((section) => !section.enabled).map((section) => section.title))
);

export const getBuilderV2FlattenedSections = (pages: BuilderV2ReviewPageSnapshot[]) => (
  pages.flatMap((page) => page.sections.map((section) => ({
    ...section,
    enabled: page.hidden ? false : section.enabled,
  })))
);
