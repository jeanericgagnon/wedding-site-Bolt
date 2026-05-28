import { BuilderPage } from '../../types/builder/project';
import { getBuilderPageIntegritySummary } from '../utils/pageMapIntegrity';

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
  const pageIntegrity = getBuilderPageIntegritySummary(projectPages);

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

  if (pageIntegrity.hiddenHomePageId) {
    const hiddenHomePage = projectPages.find((page) => page.id === pageIntegrity.hiddenHomePageId) ?? homePage ?? projectPages[0];

    return {
      focusTitle: `${hiddenHomePage.title} is acting like home but missing from navigation`,
      focusDetail: 'When the home page disappears from nav, the site map loses its clearest guest-facing entry point.',
      bestNextMove: `Open ${hiddenHomePage.title}, keep it visible, and make sure the first page guests hit still feels like the real front door.`,
      decisionRule: 'Protect the home page path before you optimize secondary pages or nav order.',
      watchout: 'A hidden home page makes the site feel coherent in the editor but confusing to guests.',
      currentStep: `Treat ${hiddenHomePage.title} as the page-map truth source again.`,
      nextStep: 'Restore its visible place in navigation and reread the opening sections.',
      thenStep: 'Only after home is trustworthy should you keep reshaping supporting pages.',
      primaryAction: {
        kind: 'open-page',
        label: `Fix ${hiddenHomePage.title}`,
        pageId: hiddenHomePage.id,
      },
      secondaryAction: {
        kind: 'open-page',
        label: `Open ${activePage?.title ?? hiddenHomePage.title}`,
        pageId: activePage?.id ?? hiddenHomePage.id,
      },
    };
  }

  if (pageIntegrity.duplicateSlugCount > 0) {
    const pageWithCollision = projectPages.find((page) => {
      const flags = pageIntegrity.flagsByPageId.get(page.id) ?? [];
      return flags.some((flag) => flag.kind === 'duplicate-slug');
    }) ?? activePage ?? homePage ?? projectPages[0];

    return {
      focusTitle: `Two pages are still fighting over /${pageWithCollision.slug}`,
      focusDetail: 'A slug collision makes the page map look fuller than the guest-facing paths really are.',
      bestNextMove: `Rename the conflicting slug for ${pageWithCollision.title} so every visible page owns one honest path.`,
      decisionRule: 'Fix path collisions before you add or duplicate more pages.',
      watchout: 'Duplicate slugs are quiet editor bugs that become loud guest confusion later.',
      currentStep: 'Review the pages sharing the same path.',
      nextStep: `Give ${pageWithCollision.title} a distinct guest-facing URL and reread the nav.`,
      thenStep: 'Once every page owns a unique path, continue the normal page-quality pass.',
      primaryAction: {
        kind: 'open-page',
        label: `Resolve /${pageWithCollision.slug}`,
        pageId: pageWithCollision.id,
      },
      secondaryAction: {
        kind: 'open-page',
        label: `Open ${activePage?.title ?? pageWithCollision.title}`,
        pageId: activePage?.id ?? pageWithCollision.id,
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
      decisionRule: 'Fill the emptiest visible gap in the site map before expanding breadth.',
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
      watchout: 'If hidden pages drift out of review, the site map quietly splits into visible pages and forgotten drafts.',
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
