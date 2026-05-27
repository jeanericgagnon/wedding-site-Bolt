import type { FlowStatus } from '../../lib/flowLabels';

export interface SiteAccessPlanStep {
  id: 'publish' | 'access' | 'share';
  status: FlowStatus;
  title: string;
  detail: string;
}

export interface SiteAccessPlanInput {
  isPublished: boolean;
  privacyMode: 'public' | 'password_protected' | 'invite_only';
  siteSlug: string;
  guestAccessToken?: string | null;
}

export function buildSiteAccessPlan(input: SiteAccessPlanInput): SiteAccessPlanStep[] {
  const hasLiveUrl = input.siteSlug.trim().length > 0;
  const hasInvitePath = input.privacyMode !== 'invite_only' || Boolean(input.guestAccessToken?.trim());

  if (!input.isPublished) {
    return [
      {
        id: 'publish',
        status: 'current',
        title: 'Make the guest-facing site live',
        detail: 'Finish the live publish first so the URL and access rules point to something guests can actually trust.',
      },
      {
        id: 'access',
        status: 'next',
        title: input.privacyMode === 'public'
          ? 'Confirm the public guest path'
          : input.privacyMode === 'password_protected'
            ? 'Confirm the password instructions'
            : 'Generate the invite-only path',
        detail: input.privacyMode === 'public'
          ? 'Once the live site is up, check that the public path is the one you want guests to see.'
          : input.privacyMode === 'password_protected'
            ? 'Once the site is live, make sure the password guests need is ready to travel with every reminder and print pack.'
            : 'Once the site is live, save settings so the invite-only path exists before you start sharing it.',
      },
      {
        id: 'share',
        status: 'then',
        title: 'Share one consistent guest path',
        detail: 'Only after the live site and access rules are steady should guest-facing handoff links, QR cards, and reminders fan out broadly.',
      },
    ];
  }

  if (!hasLiveUrl || !hasInvitePath) {
    return [
      {
        id: 'access',
        status: 'current',
        title: 'Finish the guest access setup',
        detail: !hasLiveUrl
          ? 'The site is live, but it still needs a stable guest-facing URL before your access guidance feels trustworthy.'
          : 'The site is live, but the invite-only guest path still needs to be generated before you share it.',
      },
      {
        id: 'share',
        status: 'next',
        title: 'Share only the working guest path',
        detail: 'Once the access setup is complete, make sure reminders and handoff assets all use that same path.',
      },
      {
        id: 'publish',
        status: 'then',
        title: 'Leave the live layer steady',
        detail: 'After that, the right move is usually restraint: let the guest-facing route stay stable unless something important changed.',
      },
    ];
  }

  if (input.privacyMode === 'public') {
    return [
      {
        id: 'share',
        status: 'current',
        title: 'Use the live public path consistently',
        detail: 'Your guest-facing route is open and stable, so the best move is reusing the same URL across reminders, QR cards, and planner handoffs.',
      },
      {
        id: 'publish',
        status: 'next',
        title: 'Only republish when clarity improves',
        detail: 'Preview changes first, then publish only when they materially help guests instead of just scratching an editing itch.',
      },
      {
        id: 'access',
        status: 'then',
        title: 'Keep access truth simple',
        detail: 'Because the site is public, the main job now is making sure no guest-facing copy accidentally suggests a hidden password or special route.',
      },
    ];
  }

  if (input.privacyMode === 'password_protected') {
    return [
      {
        id: 'access',
        status: 'current',
        title: 'Carry the password instructions everywhere',
        detail: 'The live site is ready, but guests still need the password. Make sure reminders, print packs, and planner handoffs all include it clearly.',
      },
      {
        id: 'share',
        status: 'next',
        title: 'Share the protected path intentionally',
        detail: 'Once the password guidance is clear, you can safely reuse the same guest-facing URL across RSVP, QR, and handoff materials.',
      },
      {
        id: 'publish',
        status: 'then',
        title: 'Keep the live layer steady',
        detail: 'After the access instructions are aligned, only republish when the guest-facing experience materially improves.',
      },
    ];
  }

  return [
    {
      id: 'access',
      status: 'current',
      title: 'Share the invite-only path, not a generic broad-share link',
      detail: 'The live site is ready, but guests still need the invite-only route. Make sure that exact path is what gets sent and printed.',
    },
    {
      id: 'share',
      status: 'next',
      title: 'Keep guest handoffs on the same route',
      detail: 'Once the invite-only path is confirmed, use it consistently across reminders, coordinator handoff notes, and QR-based materials.',
    },
    {
      id: 'publish',
      status: 'then',
      title: 'Leave the live experience stable',
      detail: 'After the route is aligned, the best move is usually to avoid extra churn unless a guest-facing improvement is clearly worth it.',
    },
  ];
}
