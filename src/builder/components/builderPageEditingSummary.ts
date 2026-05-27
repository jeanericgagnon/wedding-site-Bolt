import { getAllSectionManifests, getSectionManifest } from '../registry/sectionManifests';
import { BuilderSectionInstance, BuilderSectionType } from '../../types/builder/section';
import { getBuilderSectionLibrarySummary } from './builderSectionLibrarySummary';

export type BuilderPageEditingAction =
  | {
      kind: 'add-section';
      label: string;
      sectionType: BuilderSectionType;
    }
  | {
      kind: 'add-essential-kit';
      label: string;
      sectionTypes: BuilderSectionType[];
    }
  | {
      kind: 'select-section';
      label: string;
      sectionId: string;
    }
  | {
      kind: 'open-template-gallery';
      label: string;
    };

export interface BuilderPageEditingSummary {
  totalCount: number;
  visibleCount: number;
  hiddenCount: number;
  lockedCount: number;
  customCount: number;
  missingEssentialLabels: string[];
  focusTitle: string;
  focusDetail: string;
  bestNextMove: string;
  decisionRule: string;
  watchout: string;
  currentStep: string;
  nextStep: string;
  thenStep: string;
  primaryAction: BuilderPageEditingAction;
  secondaryAction: BuilderPageEditingAction;
}

export function getBuilderPageEditingSummary(
  pageTitle: string,
  sections: BuilderSectionInstance[]
): BuilderPageEditingSummary {
  const manifests = getAllSectionManifests();
  const librarySummary = getBuilderSectionLibrarySummary({
    manifests,
    sections,
    searchQuery: '',
  });

  const visibleSections = sections.filter((section) => section.enabled);
  const hiddenSections = sections.filter((section) => !section.enabled);
  const lockedCount = sections.filter((section) => section.locked).length;
  const customCount = sections.filter((section) => section.type === 'custom').length;
  const firstVisibleSection = visibleSections[0] ?? sections[0] ?? null;
  const firstHiddenSection = hiddenSections[0] ?? null;
  const firstMissingEssentialLabel = librarySummary.missingEssentialLabels[0];
  const firstMissingEssentialType = firstMissingEssentialLabel
    ? manifests.find((manifest) => manifest.label === firstMissingEssentialLabel)?.type
    : undefined;

  if (sections.length === 0) {
    return {
      totalCount: 0,
      visibleCount: 0,
      hiddenCount: 0,
      lockedCount,
      customCount,
      missingEssentialLabels: librarySummary.missingEssentialLabels,
      focusTitle: `${pageTitle} still needs its first real section`,
      focusDetail: 'A blank page is still a draft idea. Give this page one anchor section so guests immediately understand what belongs here.',
      bestNextMove: 'Add a hero first, or switch templates if the page needs a stronger starting structure.',
      decisionRule: 'Choose the section that explains the page purpose before you add decorative or supporting blocks.',
      watchout: 'Do not try to rescue an empty page with small extras. It will still read like an unfinished draft.',
      currentStep: 'Pick the section that gives this page a job.',
      nextStep: 'Add the first anchor section and read it in the canvas before touching styling.',
      thenStep: 'Once the anchor feels right, layer in only the sections that answer the next guest question.',
      primaryAction: {
        kind: 'add-section',
        label: 'Add hero section',
        sectionType: 'hero',
      },
      secondaryAction: {
        kind: 'add-essential-kit',
        label: 'Add essential page kit',
        sectionTypes: librarySummary.missingEssentialTypes,
      },
    };
  }

  if (firstMissingEssentialLabel && firstMissingEssentialType) {
    return {
      totalCount: sections.length,
      visibleCount: visibleSections.length,
      hiddenCount: hiddenSections.length,
      lockedCount,
      customCount,
      missingEssentialLabels: librarySummary.missingEssentialLabels,
      focusTitle: `${pageTitle} still needs core guest guidance`,
      focusDetail: `This page has structure, but guests are still missing ${librarySummary.missingEssentialLabels.slice(0, 3).join(', ')} before extras really pay off.`,
      bestNextMove: `Add ${firstMissingEssentialLabel} before you spend time refining optional sections.`,
      decisionRule: 'Fill the missing section that removes the biggest guest question first.',
      watchout: 'More photos or decorative blocks will not fix a page that is still missing the basics.',
      currentStep: `Keep the page centered on missing essentials like ${firstMissingEssentialLabel}.`,
      nextStep: `Add ${firstMissingEssentialLabel} and make sure it answers the guest question cleanly.`,
      thenStep: 'After the essentials are in place, tighten the order and hide anything repetitive.',
      primaryAction: {
        kind: 'add-essential-kit',
        label: `Add missing essentials (${librarySummary.missingEssentialTypes.length})`,
        sectionTypes: librarySummary.missingEssentialTypes,
      },
      secondaryAction: {
        kind: 'add-section',
        label: `Add ${firstMissingEssentialLabel}`,
        sectionType: firstMissingEssentialType,
      },
    };
  }

  if (firstHiddenSection) {
    const hiddenManifest = getSectionManifest(firstHiddenSection.type);
    return {
      totalCount: sections.length,
      visibleCount: visibleSections.length,
      hiddenCount: hiddenSections.length,
      lockedCount,
      customCount,
      missingEssentialLabels: [],
      focusTitle: `${pageTitle} already has the structure. Some of it is just hidden.`,
      focusDetail: `You have ${visibleSections.length} visible sections and ${hiddenSections.length} hidden ones. Review what is already here before adding more blocks.`,
      bestNextMove: `Review the hidden ${hiddenManifest.label} section and decide whether it should come back or stay out.`,
      decisionRule: 'Reuse or unhide good structure before you duplicate it with a new section.',
      watchout: 'If you add a replacement before checking hidden sections, this page will drift into duplicate content.',
      currentStep: 'Audit what the page already contains.',
      nextStep: `Open the hidden ${hiddenManifest.label} section and either refine it or leave it hidden on purpose.`,
      thenStep: 'Only add a new section if the existing hidden one cannot do the job.',
      primaryAction: {
        kind: 'select-section',
        label: `Review hidden ${hiddenManifest.label}`,
        sectionId: firstHiddenSection.id,
      },
      secondaryAction: {
        kind: 'add-section',
        label: 'Add optional section',
        sectionType: 'gallery',
      },
    };
  }

  const firstVisibleManifest = firstVisibleSection ? getSectionManifest(firstVisibleSection.type) : null;

  return {
    totalCount: sections.length,
    visibleCount: visibleSections.length,
    hiddenCount: hiddenSections.length,
    lockedCount,
    customCount,
    missingEssentialLabels: [],
    focusTitle: `${pageTitle} is ready for refinement, not more sprawl`,
    focusDetail: `This page already has its core structure. Tighten the sections guests read first before you add anything else.`,
    bestNextMove: firstVisibleManifest
      ? `Open ${firstVisibleManifest.label} and make that first-read section feel settled before branching out.`
      : 'Open the first visible section and make that primary read feel settled before branching out.',
    decisionRule: 'Refine the section guests notice first, not the easiest section to tweak.',
    watchout: 'Changing too many sections at once makes it hard to tell whether the page is actually improving.',
    currentStep: 'Choose the section carrying the page headline or guest decision.',
    nextStep: 'Refine that section until the page reads clearly from top to bottom.',
    thenStep: 'Once the lead section feels stable, adjust supporting sections one at a time.',
    primaryAction: firstVisibleSection
      ? {
          kind: 'select-section',
          label: `Open ${firstVisibleManifest?.label ?? 'first section'}`,
          sectionId: firstVisibleSection.id,
        }
      : {
          kind: 'open-template-gallery',
          label: 'Compare templates',
        },
    secondaryAction: {
      kind: 'open-template-gallery',
      label: 'Compare templates',
    },
  };
}
