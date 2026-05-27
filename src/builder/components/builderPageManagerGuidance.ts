import { BuilderPage } from '../../types/builder/project';

export type BuilderPageManagerAction =
  | {
      kind: 'add-page';
      label: string;
    }
  | {
      kind: 'open-page';
      label: string;
      pageId: string;
    }
  | {
      kind: 'fill-empty-page';
      label: string;
      pageId: string;
      pageTitle: string;
    };

export interface BuilderPageManagerGuidance {
  focusTitle: string;
  focusDetail: string;
  bestNextMove: string;
  decisionRule: string;
  watchout: string;
  currentStep: string;
  nextStep: string;
  thenStep: string;
  primaryAction: BuilderPageManagerAction;
  secondaryAction: BuilderPageManagerAction;
}

export function getBuilderPageManagerGuidance(
  projectPages: BuilderPage[],
  activePageId: string | null,
): BuilderPageManagerGuidance {
  const homePage = projectPages.find((page) => page.meta.isHome) ?? projectPages[0] ?? null;
  const activePage = projectPages.find((page) => page.id === activePageId) ?? homePage;
  const firstEmptyPage = projectPages.find((page) => page.sections.length === 0) ?? null;
  const firstHiddenPage = projectPages.find((page) => page.meta.isHidden) ?? null;
  const visiblePages = projectPages.filter((page) => !page.meta.isHidden);

  if (projectPages.length === 0) {
    return {
      focusTitle: 'The site map still needs a first page',
      focusDetail: 'Until there is at least one page, the builder has nowhere trustworthy to anchor the guest journey.',
      bestNextMove: 'Create the first page, then give it one real anchor section before you branch into secondary pages.',
      decisionRule: 'Build the first page that explains the wedding before you create supporting pages for travel, registry, or FAQs.',
      watchout: 'Do not create a long nav before the first page actually tells guests what this site is for.',
      currentStep: 'Create the first page guests should land on.',
      nextStep: 'Add a hero or another anchor section so the page feels real.',
      thenStep: 'Once the first page holds together, add only the supporting pages the weekend truly needs.',
      primaryAction: {
        kind: 'add-page',
        label: 'Create first page',
      },
      secondaryAction: {
        kind: 'add-page',
        label: 'Start with home page',
      },
    };
  }

  if (firstEmptyPage) {
    const targetPage = activePage?.sections.length === 0 ? activePage : firstEmptyPage;
    const fallbackPage = targetPage ?? firstEmptyPage;

    return {
      focusTitle: `${fallbackPage.title} needs an anchor before the map grows`,
      focusDetail: 'An empty page creates navigation without substance. Give it one clear section so guests know why the page exists.',
      bestNextMove: `Add a hero or other anchor section to ${fallbackPage.title} before you spend energy on more pages or polish.`,
      decisionRule: 'Fill the emptiest live gap in the site map before expanding breadth.',
      watchout: 'A page list can look complete even while guests still hit dead ends.',
      currentStep: `Treat ${fallbackPage.title} as the next page that needs a real first impression.`,
      nextStep: `Add the first section and read the page in the canvas before touching the rest of the map.`,
      thenStep: 'Only after the empty page has an anchor should you rename, reorder, or expand the rest of the site map.',
      primaryAction: {
        kind: 'fill-empty-page',
        label: `Add first section to ${fallbackPage.title}`,
        pageId: fallbackPage.id,
        pageTitle: fallbackPage.title,
      },
      secondaryAction: {
        kind: 'open-page',
        label: `Open ${fallbackPage.title}`,
        pageId: fallbackPage.id,
      },
    };
  }

  if (firstHiddenPage && visiblePages.length > 0) {
    return {
      focusTitle: `${firstHiddenPage.title} is already built but still offstage`,
      focusDetail: 'Hidden pages are useful when they are intentional. Review them before adding replacements or duplicating structure elsewhere.',
      bestNextMove: `Open ${firstHiddenPage.title} and decide whether it belongs back in navigation or should stay hidden on purpose.`,
      decisionRule: 'Reuse and refine hidden structure before inventing a second version of the same page.',
      watchout: 'If hidden pages drift out of review, the site map quietly splits into live pages and forgotten drafts.',
      currentStep: 'Audit the strongest hidden page first.',
      nextStep: `Choose whether ${firstHiddenPage.title} should come back, stay hidden, or be simplified.`,
      thenStep: 'Once hidden pages are intentional, the navigation will feel much calmer and easier to trust.',
      primaryAction: {
        kind: 'open-page',
        label: `Review hidden ${firstHiddenPage.title}`,
        pageId: firstHiddenPage.id,
      },
      secondaryAction: {
        kind: 'open-page',
        label: `Open ${activePage?.title ?? homePage?.title ?? 'current page'}`,
        pageId: activePage?.id ?? homePage?.id ?? firstHiddenPage.id,
      },
    };
  }

  const targetPage = activePage ?? homePage ?? projectPages[0];

  return {
    focusTitle: `${targetPage.title} can lead the next page-quality pass`,
    focusDetail: 'The site map has its basic shape now. The highest-value move is to strengthen the page guests are most likely to read next.',
    bestNextMove: `Open ${targetPage.title} and tighten the first-read sections there before you create another page.`,
    decisionRule: 'Refine the page carrying the guest journey, not the page that is simply easiest to rename or reorder.',
    watchout: 'Page management can turn into busywork if it outruns page quality.',
    currentStep: `Use ${targetPage.title} as the page-quality anchor.`,
    nextStep: 'Refine the section order and lead content until the page reads cleanly.',
    thenStep: 'After the key page feels settled, adjust the rest of the site map with smaller, calmer changes.',
    primaryAction: {
      kind: 'open-page',
      label: `Open ${targetPage.title}`,
      pageId: targetPage.id,
    },
    secondaryAction: {
      kind: 'add-page',
      label: 'Add supporting page',
    },
  };
}
