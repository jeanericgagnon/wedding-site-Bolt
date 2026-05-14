import { describe, expect, it } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

function serviceRoleFunctionNames(): string[] {
  const root = join(process.cwd(), 'supabase', 'functions');
  return readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) => {
      const filePath = join(root, name, 'index.ts');
      return existsSync(filePath) && readFileSync(filePath, 'utf8').includes('SUPABASE_SERVICE_ROLE_KEY');
    })
    .sort();
}

function extractCategory(disposition: string, heading: string): string[] {
  const section = disposition.match(new RegExp(`## ${heading}\\n\\n([\\s\\S]*?)(?=\\n## |\\n$)`))?.[1] ?? '';
  return Array.from(section.matchAll(/^- `([^`]+)`/gm), (match) => match[1]).sort();
}

describe('service-role authorization disposition', () => {
  it('documents every service-role Edge Function before launch claim', () => {
    const disposition = readFileSync('docs/service-role-authorization-disposition-2026-05-05.md', 'utf8');
    const missing = serviceRoleFunctionNames().filter((name) => !disposition.includes(`\`${name}\``));

    expect(missing).toEqual([]);
    expect(disposition).toContain('Still Needs Expanded Live Proof');
    expect(disposition).toContain('process-email-queue` now rejects non-service-role callers');
    expect(disposition).toContain('LIVE_GUEST_DASHBOARD_SETTINGS_RPCS=1 npm run proof:v1:client-rls-matrix');
    expect(disposition).toContain('public.apply_public_rsvp_capacity_decision(...)');
    expect(disposition).not.toContain('Deploy the guest-dashboard settings RPC batch');
  });

  it('keeps every service-role Edge Function in exactly one authorization category', () => {
    const disposition = readFileSync('docs/service-role-authorization-disposition-2026-05-05.md', 'utf8');
    const categories = {
      ownerCollaborator: extractCategory(disposition, 'Owner / Collaborator Auth Required'),
      publicSubmission: extractCategory(disposition, 'Public Token / Public Submission Scoped'),
      publicOptionalAuth: extractCategory(disposition, 'Public Or Optional-Auth Rate-Limited Helpers'),
      internalProvider: extractCategory(disposition, 'Internal / Scheduler / Provider Scoped'),
    };
    const categorized = Object.values(categories).flat().sort();
    const duplicates = categorized.filter((name, index) => categorized.indexOf(name) !== index);

    expect(duplicates).toEqual([]);
    expect(categorized).toEqual(serviceRoleFunctionNames());
    expect(categories.ownerCollaborator).toEqual([
      'generate-token',
      'google-drive-auth-callback',
      'google-drive-auth-start',
      'google-drive-health',
      'photo-album-create',
      'photo-album-manage',
      'photo-analyze-batch',
      'photo-export-manifest',
      'photo-upload-moderate',
      'queue-guest-followups',
      'registry-preview',
      'send-bulk-message',
      'send-wedding-email',
      'setup-bootstrap',
      'stripe-create-checkout',
      'stripe-create-sms-credits',
      'stripe-create-subscription',
      'stripe-verify-checkout-session',
      'translate-site-content',
      'vault-resolve-entry-link',
    ]);
    expect(categories.publicSubmission).toEqual([
      'guest-contact-lookup',
      'guest-contact-submit',
      'guest-hub-config',
      'guest-hub-track',
      'guest-prospect-submit',
      'guest-recap-config',
      'guestbook-submit',
      'interactive-section-public',
      'photo-upload',
      'public-itinerary-by-slug',
      'public-registry-items',
      'public-site-access',
      'public-site-rsvp-submit',
      'registry-barcode-lookup',
      'submit-contact-request',
      'submit-rsvp',
      'validate-rsvp-token',
      'vault-contribution-public',
      'vault-entry-submit',
      'vault-upload-google-drive',
      'vendor-profile-inquiry-submit',
    ]);
    expect(categories.publicOptionalAuth).toEqual([
      'log-client-error',
      'onboarding-ai-orchestrate',
      'vendor-profile-preview',
    ]);
    expect(categories.internalProvider).toEqual([
      'process-email-queue',
      'sms-rsvp-inbound',
      'stripe-webhook',
    ]);
  });
});
