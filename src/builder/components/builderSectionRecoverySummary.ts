import { BuilderSectionInstance, BuilderSectionType } from '../../types/builder/section';
import { getSectionManifest } from '../registry/sectionManifests';

export type SectionHealth = 'empty' | 'draft' | 'ready';
export interface BuilderSectionLike {
  id: string;
  type: BuilderSectionType;
  variant?: string;
  enabled?: boolean;
  locked?: boolean;
  settings?: BuilderSectionInstance['settings'];
  bindings?: BuilderSectionInstance['bindings'];
  styleOverrides?: BuilderSectionInstance['styleOverrides'] | Record<string, unknown>;
}

interface BuilderSectionRecoveryAction {
  kind: 'add-essential' | 'review-hidden' | 'start-empty' | 'review-draft';
  label: string;
  sectionType?: BuilderSectionType;
  sectionId?: string;
}

export interface BuilderSectionRecoverySummary {
  total: number;
  visible: number;
  hidden: number;
  locked: number;
  empty: number;
  draft: number;
  ready: number;
  missingEssentialLabels: string[];
  focusTitle: string;
  focusDetail: string;
  bestNextMove: string;
  decisionRule: string;
  watchout: string;
  currentStep: string;
  nextStep: string;
  thenStep: string;
  primaryAction: BuilderSectionRecoveryAction;
  secondaryAction: BuilderSectionRecoveryAction;
}

const ESSENTIAL_SECTION_TYPES = ['hero', 'venue', 'schedule', 'travel', 'rsvp', 'faq', 'registry'] as const;

export function getBuilderSectionHealth(section: BuilderSectionLike): SectionHealth {
  if (!section.enabled) return 'draft';

  const bindingCount = Object.values(section.bindings ?? {}).reduce<number>((sum, value) => {
    if (Array.isArray(value)) return sum + value.filter(Boolean).length;
    return sum;
  }, 0);

  const meaningfulSettingEntries = Object.entries(section.settings ?? {}).filter(([key, value]) => {
    if (key === 'showTitle') return false;
    if (typeof value === 'string') return value.trim().length > 0;
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === 'number') return true;
    if (typeof value === 'boolean') return value;
    if (value && typeof value === 'object') return Object.keys(value as Record<string, unknown>).length > 0;
    return false;
  }).length;

  const styleCount = Object.values(section.styleOverrides ?? {}).filter((value) => value !== undefined && value !== '').length;
  const signalScore = bindingCount + meaningfulSettingEntries + styleCount;

  if (signalScore === 0) return 'empty';
  if (signalScore >= 3) return 'ready';
  return 'draft';
}

export function getBuilderStarterContentPatch(section: BuilderSectionInstance): Partial<BuilderSectionInstance> {
  const now = new Date().toISOString();
  const starterByType: Partial<Record<BuilderSectionType, Record<string, unknown>>> = {
    hero: { title: 'We are getting married', headline: 'Alex & Sam', subtitle: 'January 17, 2027 · Rosewood Estate' },
    story: { title: 'Our Story', content: 'From first coffee to forever — we cannot wait to celebrate with you.' },
    schedule: { title: 'Weekend Schedule' },
    travel: { title: 'Travel & Stay', notes: 'Use the recommended hotels for easiest shuttle access.' },
    registry: { title: 'Registry', message: 'Your presence is the best gift, but here are a few ideas if you wish.' },
    faq: { title: 'FAQ' },
    rsvp: { title: 'RSVP' },
    venue: { title: 'Venue Details' },
    contact: { title: 'Questions?' },
    'footer-cta': { headline: 'Join us for our big day', buttonLabel: 'RSVP' },
  };

  return {
    settings: {
      ...section.settings,
      showTitle: true,
      ...(starterByType[section.type] ?? {}),
    },
    meta: {
      ...section.meta,
      updatedAtISO: now,
    },
  };
}

export function getBuilderSectionRecoverySummary(sections: BuilderSectionLike[]): BuilderSectionRecoverySummary {
  const presentTypes = new Set(sections.map((section) => section.type));
  const missingEssentialTypes = ESSENTIAL_SECTION_TYPES.filter((type) => !presentTypes.has(type));
  const missingEssentialLabels = missingEssentialTypes.map((type) => getSectionManifest(type).label);
  const hiddenSections = sections.filter((section) => section.enabled === false);
  const healthBySection = sections.map((section) => ({ section, health: getBuilderSectionHealth(section) }));
  const emptySections = healthBySection.filter(({ health }) => health === 'empty').map(({ section }) => section);
  const draftSections = healthBySection.filter(({ health }) => health === 'draft').map(({ section }) => section);
  const readySections = healthBySection.filter(({ health }) => health === 'ready').map(({ section }) => section);

  const base = {
    total: sections.length,
    visible: sections.filter((section) => section.enabled !== false).length,
    hidden: hiddenSections.length,
    locked: sections.filter((section) => section.locked).length,
    empty: emptySections.length,
    draft: draftSections.length,
    ready: readySections.length,
    missingEssentialLabels,
  };

  if (sections.length === 0) {
    return {
      ...base,
      focusTitle: 'This page still needs its first real section',
      focusDetail: 'There is no visible structure yet, so the page cannot tell guests what it is for or where to look first.',
      bestNextMove: 'Add the first anchor section before you think about extras or styling.',
      decisionRule: 'Start with the section that gives guests orientation fastest. A page without an anchor is harder to rescue later.',
      watchout: 'Adding lots of secondary sections before the first anchor usually creates a page map that looks busy but still feels unfinished.',
      currentStep: 'Add the first essential section this page needs to function.',
      nextStep: 'Fill in the real content so the page says something useful immediately.',
      thenStep: 'Only after the first section holds together should you add supporting sections.',
      primaryAction: { kind: 'add-essential', label: 'Add Hero', sectionType: 'hero' },
      secondaryAction: { kind: 'add-essential', label: 'Add Schedule', sectionType: 'schedule' },
    };
  }

  if (base.visible === 0 && hiddenSections.length > 0) {
    const firstHidden = hiddenSections[0];
    return {
      ...base,
      focusTitle: 'This page has structure, but it is all hidden',
      focusDetail: 'Guests would still hit a blank page right now because every section is sitting in draft-only visibility.',
      bestNextMove: 'Review the hidden sections first and bring back the strongest one before adding anything new.',
      decisionRule: 'Recover the best hidden work before creating more structure. The page may already have the right answer, just not visible yet.',
      watchout: 'If you keep adding sections instead of recovering the hidden ones, the page quietly splits into visible work and abandoned work.',
      currentStep: 'Open the most promising hidden section and decide whether it belongs back on the page.',
      nextStep: 'Show the section that gives guests the clearest first impression or next piece of orientation.',
      thenStep: 'Delete the hidden sections that no longer fit so the page does not stay cluttered behind the scenes.',
      primaryAction: { kind: 'review-hidden', label: `Review hidden ${getSectionManifest(firstHidden.type).label}`, sectionId: firstHidden.id },
      secondaryAction: { kind: 'add-essential', label: 'Add Hero', sectionType: 'hero' },
    };
  }

  if (emptySections.length > 0) {
    const firstEmpty = emptySections[0];
    return {
      ...base,
      focusTitle: `${getSectionManifest(firstEmpty.type).label} still needs its first real pass`,
      focusDetail: 'The section shell is already here, but it has not been given enough content or structure to earn its place on the page.',
      bestNextMove: 'Finish the emptiest section before adding more page structure.',
      decisionRule: 'When a section already exists but is still empty, tighten that gap first. Recovery beats expansion.',
      watchout: 'Adding more sections around an empty one makes the page feel busier without making it more useful.',
      currentStep: `Start the empty ${getSectionManifest(firstEmpty.type).label} section so the page has fewer dead spots.`,
      nextStep: 'Reassess whether the page still needs another missing essential after that section starts carrying real weight.',
      thenStep: 'Only once the existing structure feels alive should you add more sections.',
      primaryAction: { kind: 'start-empty', label: `Start ${getSectionManifest(firstEmpty.type).label}`, sectionId: firstEmpty.id },
      secondaryAction: missingEssentialTypes[0]
        ? { kind: 'add-essential', label: `Add ${getSectionManifest(missingEssentialTypes[0]).label}`, sectionType: missingEssentialTypes[0] }
        : { kind: 'review-draft', label: `Review ${getSectionManifest(draftSections[0]?.type ?? firstEmpty.type).label}`, sectionId: (draftSections[0] ?? firstEmpty).id },
    };
  }

  if (missingEssentialTypes.length > 0) {
    const firstMissing = missingEssentialTypes[0];
    return {
      ...base,
      focusTitle: 'The page still needs one of its core guest sections',
      focusDetail: 'The structure is moving, but one of the essential lanes guests usually need is still missing entirely.',
      bestNextMove: `Add ${getSectionManifest(firstMissing).label} before you spend time on lower-priority extras.`,
      decisionRule: 'Fill the biggest guest-information gap first. A page becomes trustworthy when the essentials are present, not when the extras are plentiful.',
      watchout: 'Decorative or niche sections will not compensate for a missing essentials lane like venue, schedule, travel, RSVP, or FAQ.',
      currentStep: `Add ${getSectionManifest(firstMissing).label} to cover the next major guest need.`,
      nextStep: 'Give that section just enough real content to make it useful.',
      thenStep: 'After the essentials are covered, choose extras that deepen the page instead of distracting from it.',
      primaryAction: { kind: 'add-essential', label: `Add ${getSectionManifest(firstMissing).label}`, sectionType: firstMissing },
      secondaryAction: hiddenSections[0]
        ? { kind: 'review-hidden', label: `Review hidden ${getSectionManifest(hiddenSections[0].type).label}`, sectionId: hiddenSections[0].id }
        : { kind: 'review-draft', label: `Review ${getSectionManifest(draftSections[0]?.type ?? sections[0].type).label}`, sectionId: (draftSections[0] ?? sections[0]).id },
    };
  }

  if (hiddenSections.length > 0) {
    const firstHidden = hiddenSections[0];
    return {
      ...base,
      focusTitle: 'The page is working, but hidden sections still need a decision',
      focusDetail: 'The visible structure is decent, yet the draft still carries hidden work that can quietly create confusion later.',
      bestNextMove: 'Review the hidden sections before you add more optional content.',
      decisionRule: 'Recover or remove hidden work while the page logic is still fresh. Old hidden sections age into clutter fast.',
      watchout: 'If hidden sections never get resolved, the page becomes harder to trust because the visible story and the draft story drift apart.',
      currentStep: 'Decide whether each hidden section still belongs.',
      nextStep: 'Show the useful ones again or remove the obsolete ones cleanly.',
      thenStep: 'Once the hidden backlog is resolved, add extras only if the visible page still needs them.',
      primaryAction: { kind: 'review-hidden', label: `Review hidden ${getSectionManifest(firstHidden.type).label}`, sectionId: firstHidden.id },
      secondaryAction: { kind: 'review-draft', label: `Review ${getSectionManifest(draftSections[0]?.type ?? readySections[0]?.type ?? sections[0].type).label}`, sectionId: (draftSections[0] ?? readySections[0] ?? sections[0]).id },
    };
  }

  return {
    ...base,
    focusTitle: 'This page structure is in a healthy place',
    focusDetail: 'The essentials are present and the current sections are doing real work, so the page no longer needs rescue-level changes.',
    bestNextMove: 'Refine the sections that still feel drafty before you add anything purely optional.',
    decisionRule: 'When the page already has coverage, improve weak structure before expanding breadth.',
    watchout: 'A page that is already functional can still drift if you keep adding sections instead of strengthening the ones that matter most.',
    currentStep: 'Check which visible section still feels weakest or most provisional.',
    nextStep: 'Tighten that section until the page reads smoothly from top to bottom.',
    thenStep: 'Only after the current structure feels strong should you add optional sections or alternate layouts.',
    primaryAction: { kind: 'review-draft', label: `Review ${getSectionManifest(draftSections[0]?.type ?? sections[0].type).label}`, sectionId: (draftSections[0] ?? sections[0]).id },
    secondaryAction: { kind: 'add-essential', label: 'Add optional section', sectionType: 'gallery' },
  };
}
