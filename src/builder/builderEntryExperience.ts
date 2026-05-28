import { templateCatalog } from './constants/templateCatalog';
import { SetupDraft, emptySetupDraft, setupDraftProgress } from '../lib/setupDraft';

type BuilderEntryMode = 'loading' | 'no-site' | 'error';

export interface BuilderEntryExperienceInput {
  mode: BuilderEntryMode;
  isDemoMode?: boolean;
  errorMessage?: string | null;
  draft?: SetupDraft;
}

export interface BuilderEntryExperience {
  title: string;
  detail: string;
  focusTitle: string;
  focusDetail: string;
  bestNextMove: string;
  decisionRule: string;
  watchout: string;
  currentStep: string;
  nextStep: string;
  thenStep: string;
  primaryActionLabel: string;
  secondaryActionLabel: string;
}

const getDraftTemplateName = (draft: SetupDraft): string =>
  templateCatalog.find((template) => template.id === draft.selectedTemplateId)?.name
  ?? (
    draft.selectedTemplateId
      .split('-')
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ')
    || 'your selected template'
  );

const getDraftCoupleLabel = (draft: SetupDraft): string => {
  const names = [draft.partnerOneFirstName.trim(), draft.partnerTwoFirstName.trim()].filter(Boolean);
  if (names.length === 2) return `${names[0]} & ${names[1]}`;
  if (names.length === 1) return names[0];
  return 'your wedding';
};

const normalizeErrorMessage = (errorMessage?: string | null): string => {
  if (!errorMessage?.trim()) return 'Unable to load your project right now.';
  return errorMessage.trim();
};

export function getBuilderEntryExperience({
  mode,
  isDemoMode = false,
  errorMessage,
  draft = emptySetupDraft,
}: BuilderEntryExperienceInput): BuilderEntryExperience {
  const progress = setupDraftProgress(draft);
  const templateName = getDraftTemplateName(draft);
  const coupleLabel = getDraftCoupleLabel(draft);
  const normalizedError = normalizeErrorMessage(errorMessage);
  const lowerError = normalizedError.toLowerCase();
  const hasMeaningfulDraft = progress > 0;

  if (mode === 'loading') {
    if (isDemoMode) {
      return {
        title: 'Opening the demo builder',
        detail: 'We are loading a sample wedding site so you can explore the editor without touching live data.',
        focusTitle: 'Use this run to learn the editing rhythm, not to polish every detail.',
        focusDetail: 'The goal here is to understand page flow, section editing, and publish readiness before you move back to your real draft.',
        bestNextMove: 'Scan one page, open one section, and test one publish-related action so the Builder feels legible fast.',
        decisionRule: 'Use the demo to learn the system path, not to make perfect design choices.',
        watchout: 'Do not treat demo content like your real site truth. It is only a safe rehearsal space.',
        currentStep: 'Load the sample site and get oriented.',
        nextStep: 'Open one page and one section so the editing pattern becomes obvious.',
        thenStep: 'Carry that same pattern back into your real wedding draft.',
        primaryActionLabel: 'Keep opening demo',
        secondaryActionLabel: 'Back to dashboard overview',
      };
    }

    if (hasMeaningfulDraft) {
      return {
        title: 'Opening your starter draft',
        detail: `We are loading ${coupleLabel} into the Builder and checking whether ${templateName} is ready to become your first real editing surface.`,
        focusTitle: 'Start from the strongest draft truth you already gave setup.',
        focusDetail: 'This handoff should feel like opening a real starting point, not like beginning from zero again.',
        bestNextMove: 'Let the builder load fully, then check whether the first page actually reflects the names, date, and template direction you chose.',
        decisionRule: 'Confirm the starting structure before you branch into section-by-section edits.',
        watchout: 'If the first page feels off, do not brute-force polish it immediately. Confirm that the draft handoff landed correctly first.',
        currentStep: 'Restore the setup draft into a usable editing surface.',
        nextStep: 'Check the first page for names, date, and template fit.',
        thenStep: 'Once that handoff looks right, keep refining inside the Builder.',
        primaryActionLabel: 'Keep opening builder',
        secondaryActionLabel: 'Resume setup',
      };
    }

    return {
      title: 'Opening your site editor',
      detail: 'We are loading your wedding site so you can keep shaping pages, sections, and publishing details from one place.',
      focusTitle: 'Get back to a real draft quickly.',
      focusDetail: 'The Builder should reopen with enough continuity that you can keep moving instead of reorienting from scratch.',
      bestNextMove: 'Once the editor appears, confirm the active page and keep your next edit close to the main guest path.',
      decisionRule: 'Reopen the page that changes guest understanding first.',
      watchout: 'Do not let the first visible page decide your next move if a more important page needs attention.',
      currentStep: 'Reload the editor state.',
      nextStep: 'Confirm the page and section you actually need to work on.',
      thenStep: 'Make the smallest edit that improves the guest path.',
      primaryActionLabel: 'Keep opening builder',
      secondaryActionLabel: 'Back to dashboard overview',
    };
  }

  if (mode === 'no-site') {
    if (hasMeaningfulDraft) {
      return {
        title: 'Your site has not been created yet',
        detail: `Setup already has enough signal to start a first draft with ${templateName}. Finish that handoff and the Builder will have something real for ${coupleLabel}.`,
        focusTitle: 'Finish the setup handoff, then edit from a real starting point.',
        focusDetail: 'You are no longer choosing from scratch. You are one clean handoff away from a site draft that can actually be shaped.',
        bestNextMove: 'Resume setup and finish the missing details so Dayof can generate the first builder-ready version of your site.',
        decisionRule: 'Complete setup when there is still no site record, even if you already know the design direction.',
        watchout: 'Opening the Builder again before setup finishes will just send you back into the same dead-end state.',
        currentStep: 'You have a partial setup draft but no live site yet.',
        nextStep: 'Finish setup and let Dayof create the first site draft.',
        thenStep: 'Return here once the site exists and refine from the generated starting point.',
        primaryActionLabel: 'Resume setup',
        secondaryActionLabel: 'Back to dashboard overview',
      };
    }

    return {
      title: 'No website yet',
      detail: 'Finish setup first and Dayof will create a strong first version of your website for you.',
      focusTitle: 'Do setup first so the Builder has a real draft to open.',
      focusDetail: 'The Builder works best when it is shaping a first version, not asking you to create everything from nothing.',
      bestNextMove: 'Start setup and give Dayof the names, date, and style direction it needs to create your first working draft.',
      decisionRule: 'Use setup to establish the baseline before you enter the editor.',
      watchout: 'Jumping straight into the Builder before setup finishes leads to a blank handoff and weaker first decisions.',
      currentStep: 'There is no site draft yet.',
      nextStep: 'Complete setup so the first site version can be generated.',
      thenStep: 'Open the Builder once that starting version exists.',
      primaryActionLabel: 'Start setup',
      secondaryActionLabel: 'Back to dashboard overview',
    };
  }

  if (lowerError.includes('fetch') || lowerError.includes('network') || lowerError.includes('timed out')) {
    return {
      title: 'Builder connection interrupted',
      detail: normalizedError,
      focusTitle: 'Treat this like a connection recovery, not a broken draft.',
      focusDetail: 'Your next move is to reconnect cleanly so you can verify the project state before changing anything.',
      bestNextMove: 'Retry the Builder load once, then fall back to the dashboard if the connection still does not settle.',
      decisionRule: 'Retry transient connection problems before you assume the draft itself is damaged.',
      watchout: 'Do not start debugging content decisions from a page that never fully loaded.',
      currentStep: 'The editor load was interrupted.',
      nextStep: 'Retry the connection and wait for a full load.',
      thenStep: 'Once the draft opens cleanly, continue editing where you left off.',
      primaryActionLabel: 'Try again',
      secondaryActionLabel: 'Back to dashboard overview',
    };
  }

  if (lowerError.includes('auth') || lowerError.includes('jwt') || lowerError.includes('permission')) {
    return {
      title: 'Builder access needs to be refreshed',
      detail: normalizedError,
      focusTitle: 'Re-enter the Builder from a clean account state.',
      focusDetail: 'This looks more like an access handoff issue than a content or design issue.',
      bestNextMove: 'Go back to the dashboard, reopen the Builder, and make sure you are still in the right account and wedding workspace.',
      decisionRule: 'Refresh access context before you make assumptions about missing data.',
      watchout: 'Trying the same broken entry path repeatedly can hide whether this is an account issue or a real editor issue.',
      currentStep: 'The editor could not confirm access.',
      nextStep: 'Return to the dashboard and reopen from a clean account state.',
      thenStep: 'If access is still blocked, resolve the account issue before editing again.',
      primaryActionLabel: 'Back to dashboard overview',
      secondaryActionLabel: 'Try again',
    };
  }

  return {
    title: 'Site editor unavailable',
    detail: normalizedError,
    focusTitle: 'Recover the editor calmly and keep the next step small.',
    focusDetail: 'This is a recovery moment, not a sign that you need to rethink the whole draft.',
    bestNextMove: 'Retry the Builder once, and if it still fails, return to the dashboard so you can reopen it from a stable route.',
    decisionRule: 'Use the fastest path back to a stable editing surface before doing anything else.',
    watchout: 'Do not confuse a Builder load failure with a problem in the wedding content itself.',
    currentStep: 'The editor did not load cleanly.',
    nextStep: 'Retry from this screen once.',
    thenStep: 'If it still fails, reopen from the dashboard and continue from the cleanest route.',
    primaryActionLabel: 'Try again',
    secondaryActionLabel: 'Back to dashboard overview',
  };
}
