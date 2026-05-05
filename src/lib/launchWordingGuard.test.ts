import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const projectRoot = resolve(__dirname, '../..');

const criticalCustomerSurfaces = [
  'index.html',
  'public/manifest.webmanifest',
  'src/pages/onboarding/Celebration.tsx',
  'src/pages/onboarding/QuickStart.tsx',
  'src/pages/onboarding/GuidedSetup.tsx',
  'src/pages/onboarding/WeddingStatus.tsx',
  'src/pages/Onboarding.tsx',
  'src/pages/AcceptCollaboratorInvite.tsx',
  'src/pages/EventHub.tsx',
  'src/pages/EventRecap.tsx',
  'src/pages/EventRSVP.tsx',
  'src/pages/GuestbookSubmit.tsx',
  'src/pages/GuestContactUpdate.tsx',
  'src/pages/PaymentRequired.tsx',
  'src/pages/PaymentSuccess.tsx',
  'src/pages/Refund.tsx',
  'src/pages/PhotoUpload.tsx',
  'src/pages/Product.tsx',
  'src/pages/RSVP.tsx',
  'src/pages/SiteView.tsx',
  'src/pages/Support.tsx',
  'src/pages/Templates.tsx',
  'src/pages/TemplateDetail.tsx',
  'src/pages/TemplateScrollCapture.tsx',
  'src/pages/Trust.tsx',
  'src/pages/VendorProfileCreate.tsx',
  'src/pages/setup/SetupShell.tsx',
  'src/pages/VendorProfile.tsx',
  'src/pages/VaultContribute.tsx',
  'src/components/billing/BillingModal.tsx',
  'src/pages/dashboard/Overview.tsx',
  'src/pages/dashboard/Guests.tsx',
  'src/pages/dashboard/GuestPhotoSharing.tsx',
  'src/pages/dashboard/Messages.tsx',
  'src/pages/dashboard/Registry.tsx',
  'src/pages/dashboard/Planning.tsx',
  'src/pages/dashboard/RsvpBoard.tsx',
  'src/pages/dashboard/Seating.tsx',
  'src/lib/plannerAccess.ts',
  'src/lib/aiPlanningAssistant.ts',
  'src/pages/dashboard/planning/planningService.ts',
  'src/pages/dashboard/analyticsBaseline.ts',
  'src/builder/constants/templateSupportManifest.ts',
];

const bannedLaunchPathPhrases = [
  /AI setup/i,
  /AI-guided/i,
  /AI-led/i,
  /AI-assisted setup/i,
  /the AI still wants/i,
  /real product brain/i,
  /site is ready/i,
  /ready to launch/i,
  /launch-ready/i,
  /starter wedding site is ready/i,
  /everything you need for a beautiful wedding website/i,
  /spending tokens/i,
  /AI spend/i,
  /token spend/i,
  /token counts?/i,
  /raw model/i,
  /model names?/i,
  /OPENAI_API_KEY/i,
  /sk-proj/i,
  /sbp_/i,
  /service role/i,
  /command center/i,
  /engagement dashboard/i,
  /launch score/i,
  /launch core/i,
  /launch path/i,
  /Website launch/i,
  /Manual Setup/i,
  /Switch to manual setup/i,
  /add guests manually/i,
  /Add tables manually/i,
  /Manual Follow-up/i,
  /Handled Manually/i,
  /Focus manual-handled/i,
  /manual decision/i,
  /manual handling/i,
  /Save manual RSVP/i,
  /Existing RSVP link ID/i,
  /not found in your itinerary/i,
  /pending no-email/i,
  /site visibility/i,
  /dashboard sludge/i,
  /Open your dashboard/i,
  /Continue to Dashboard/i,
  /unlock the rest of the dashboard/i,
  /AI helps draft/i,
  /Vendor profile v1/i,
  /control room/i,
  /ops tools/i,
  /RSVP Ops/i,
  /nuclear delete/i,
  /invite token/i,
  /secure token/i,
  /Invite Code/i,
  /Private RSVP Link Key/i,
  /page configuration/i,
  /wedding site data found/i,
  /Error rendering/i,
  /metadata fetch/i,
  /catalog metadata/i,
  /alert load/i,
  /contact coverage/i,
  /provider-grade/i,
  /provider message/i,
  /provider failures/i,
  /provider actions/i,
  /vision analysis/i,
  /vision suggestion/i,
  /photo intelligence/i,
  /Attempted sends/i,
  /Delivery failed/i,
  /sent rate across attempted/i,
  /Skipped before send/i,
  /ruthless v1/i,
  /Needs one more pass/i,
  /Needs reliability pass/i,
  /Still missing:/i,
  /Template not found/i,
  /Vault not found/i,
  /Vendor page not found/i,
  /Missing vendor page/i,
  /Wedding site not found/i,
  /Use this template/i,
  /Template support/i,
  /Template ID/i,
  /Choose a different template/i,
  /No coding required/i,
  /First use-case/i,
  /Fallback preview/i,
  /Preview verified/i,
  /verified badge/i,
  /builder pack/i,
  /starter catalog/i,
  /fake placeholders/i,
  /inviteState=/i,
  /Step: \{/i,
];

describe('launch wording guard', () => {
  it('keeps critical launch-path copy calm, review-first, and free of AI/provider hype', () => {
    const offenders: string[] = [];

    for (const relativePath of criticalCustomerSurfaces) {
      const source = readFileSync(resolve(projectRoot, relativePath), 'utf8');
      for (const phrase of bannedLaunchPathPhrases) {
        if (phrase.test(source)) {
          offenders.push(`${relativePath}: ${phrase}`);
        }
      }
    }

    expect(offenders).toEqual([]);
  });

  it('keeps auth entry surfaces from rendering raw provider errors directly', () => {
    const authEntrySources = [
      'src/pages/Login.tsx',
      'src/pages/Signup.tsx',
      'src/pages/AcceptCollaboratorInvite.tsx',
    ].map((relativePath) => readFileSync(resolve(projectRoot, relativePath), 'utf8')).join('\n');

    expect(authEntrySources).toContain('safeAuthError');
    expect(authEntrySources).not.toMatch(/setError\(\(err as Error\)\.message/);
    expect(authEntrySources).not.toMatch(/setAuthError\(err instanceof Error \? err\.message/);
    expect(authEntrySources).not.toMatch(/setClaimError\(err instanceof Error \? err\.message/);
  });
});
