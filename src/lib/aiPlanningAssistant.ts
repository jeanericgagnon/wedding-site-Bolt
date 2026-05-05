import type { LaunchReadinessInput, LaunchReadinessModel } from './launchReadiness';

export type PlanningAssistantActionTone = 'urgent' | 'important' | 'polish';

export interface PlanningAssistantAction {
  id: string;
  title: string;
  detail: string;
  href: string;
  cta: string;
  tone: PlanningAssistantActionTone;
}

export interface PlanningAssistantModel {
  headline: string;
  actions: PlanningAssistantAction[];
  generatedBy: 'deterministic';
}

const pushUnique = (actions: PlanningAssistantAction[], action: PlanningAssistantAction) => {
  if (!actions.some((existing) => existing.id === action.id)) actions.push(action);
};

export function buildPlanningAssistantModel(
  stats: LaunchReadinessInput,
  readiness: LaunchReadinessModel,
): PlanningAssistantModel {
  const actions: PlanningAssistantAction[] = [];
  const pendingContactCount = Math.max(0, stats.totalGuests - stats.contactableGuestCount);

  if (!stats.isPublished || !stats.siteSlug) {
    pushUnique(actions, {
      id: 'publish-site',
      title: 'Make the public site real',
      detail: stats.siteSlug
        ? 'The site has a guest URL. Review and publish it before inviting guests.'
        : 'Choose a clean site URL and publish once so every guest-facing link has a stable home.',
      href: '/dashboard/builder?publishNow=1',
      cta: 'Open publish checklist',
      tone: 'urgent',
    });
  }

  if (stats.totalGuests === 0) {
    pushUnique(actions, {
      id: 'import-guests',
      title: 'Import the guest list',
      detail: 'Guest import unlocks RSVP, address collection, seating, messages, and event-specific access.',
      href: '/dashboard/guests',
      cta: 'Import guests',
      tone: 'urgent',
    });
  } else if (stats.pendingGuests > 0) {
    pushUnique(actions, {
      id: 'rsvp-followup',
      title: 'Close the RSVP loop',
      detail: `${stats.pendingGuests} guest${stats.pendingGuests === 1 ? '' : 's'} still need a reply. Prioritize contactable households first.`,
      href: '/dashboard/guests',
      cta: 'Review pending guests',
      tone: 'important',
    });
  }

  if (pendingContactCount > 0) {
    pushUnique(actions, {
      id: 'address-wrangler',
      title: 'Collect missing contact info',
      detail: `${pendingContactCount} guest${pendingContactCount === 1 ? '' : 's'} need email or phone coverage before reminders, address collection, and recap sends are dependable.`,
      href: '/dashboard/planning?tab=addresses',
      cta: 'Open address collection',
      tone: 'important',
    });
  }

  if (stats.activePhotoAlbumCount === 0) {
    pushUnique(actions, {
      id: 'photo-hub',
      title: 'Turn on the photo loop',
      detail: 'Create at least one active upload album so the event QR can collect photos, recap opt-ins, and future-couple interest.',
      href: '/dashboard/photos',
      cta: 'Create photo albums',
      tone: 'urgent',
    });
  }

  if (stats.registryItemCount === 0) {
    pushUnique(actions, {
      id: 'registry-proof',
      title: 'Decide registry visibility',
      detail: 'Add registry items with images and store details, or intentionally hide the registry so guests do not hit an empty section.',
      href: '/dashboard/registry',
      cta: 'Review registry',
      tone: 'important',
    });
  }

  if (!stats.weddingDate || (!stats.venueName && !stats.venueLocation)) {
    pushUnique(actions, {
      id: 'planner-context',
      title: 'Ground the planner',
      detail: 'Date and venue context make timeline, checklist, photo albums, and travel guidance smarter.',
      href: '/dashboard/planning',
      cta: 'Open planner',
      tone: 'important',
    });
  }

  if (actions.length === 0 && readiness.nextItem) {
    pushUnique(actions, {
      id: `readiness-${readiness.nextItem.id}`,
      title: readiness.nextItem.label,
      detail: readiness.nextItem.detail,
      href: readiness.nextItem.href,
      cta: readiness.nextItem.nextAction,
      tone: readiness.nextItem.status === 'ready' ? 'polish' : 'important',
    });
  }

  return {
    headline: actions.some((action) => action.tone === 'urgent')
      ? 'Do these first before more polish.'
      : actions.some((action) => action.tone === 'important')
        ? 'The main setup is mostly clear. These are the next moves worth checking.'
        : 'The core pieces look steady. Use this pass for polish and a quick review.',
    actions: actions.slice(0, 4),
    generatedBy: 'deterministic',
  };
}
