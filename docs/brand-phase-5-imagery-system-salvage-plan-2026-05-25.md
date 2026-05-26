# Brand Phase 5 Imagery System Salvage Plan - 2026-05-25

This note captures the current recommendation for `origin/brand-phase-5-imagery-system`.

## Verdict

Do not delete this branch as cleanup residue.

Also do not treat it as a practical merge branch.

Best next move:

1. preserve it as a mostly-shared history branch with a smaller distinct tip
2. salvage only the tip-level collaborator, privacy, QR, and deploy-readiness ideas if they are still useful
3. avoid replaying the full branch as a single feature effort

## Why It Is Worth Preserving

- still has `906` unique patch-visible commits beyond `origin/main`
- much of its broad history overlaps the same later hardening and extraction era as `origin/codex/non-registry-live-fixes`
- but it also has a distinct tip-level cluster worth preserving separately

Distinct branch-side tip commits versus `origin/codex/non-registry-live-fixes`:

- `2ff86038a` `fix clean deploy spreadsheet import`
- `cd062a3c1` `stabilize name-change runtime proof and local deploy gate`
- `dd7e69fd3` `harden p0 launch gates and live collaborator proofs`
- `6f6b545d9` `p0 lock down rsvp lookup and enforce production email senders`
- `ba8f5dd5c` `harden collaborator invites, privacy summary, and qr defaults`

## Why It Is Not A Revival Branch

- merge-base diff against `origin/main` is still enormous and branch-wide history is very mixed
- most of the branch is not uniquely "imagery system" work anymore
- the useful distinct value is concentrated near the tip, not across the whole lineage
- current `main` and the preserved non-registry branches have moved too far for wholesale replay to make sense

Important nuance:

- this branch is best understood as a preserved broad history branch plus a smaller distinct tip
- that makes it more salvageable than some giant history branches, but only at the tip layer

## Salvage Buckets

### 1. Strongest distinct salvage bucket

Commit:

- `ba8f5dd5c` `harden collaborator invites, privacy summary, and qr defaults`

Touched areas:

- settings dashboard framing
- team access panel behavior
- site access actions
- privacy summary data
- guest hub QR defaults
- migration `20260521123000_harden_settings_collaborator_invites.sql`

Why this is attractive:

- compact relative to the rest of the branch
- clearly distinct from the shared giant-history base
- focused on current-feeling collaborator/settings concerns

Recommended approach:

- re-read the current settings and collaborator access surfaces on `main`
- port only the still-desired invite/privacy/QR behaviors
- treat the migration as a fresh schema review, not a direct replay target

### 2. Medium-confidence hardening bucket

Commits:

- `6f6b545d9` `p0 lock down rsvp lookup and enforce production email senders`
- `dd7e69fd3` `harden p0 launch gates and live collaborator proofs`
- `cd062a3c1` `stabilize name-change runtime proof and local deploy gate`
- `2ff86038a` `fix clean deploy spreadsheet import`

Why these need care:

- they touch deploy, proof, sender, RSVP, collaborator, and import surfaces together
- they are likely useful as idea sources, but not as clean cherry-pick targets

Recommended approach:

- salvage only one narrow concern at a time
- prefer re-implementation on fresh `main`

### 3. Shared-history bucket

Everything below the distinct tip overlaps heavily with the same broad hardening and extraction era as `origin/codex/non-registry-live-fixes`.

Recommended approach:

- use the other preservation notes for the big-history interpretation
- use this branch only when the tip-level collaborator/privacy/QR/deploy angle matters

## Files And Areas Worth Revisiting First

If someone needs to mine this branch, start here:

- `src/pages/dashboard/settings/SettingsTeamAccessPanel.tsx`
- `src/pages/dashboard/settings/useSettingsSiteAccessActions.ts`
- `src/pages/dashboard/settings/settingsSiteData.ts`
- `src/pages/dashboard/settings/SettingsDashboardRouteContent.tsx`
- `src/lib/guestHubQrAssets.ts`
- `supabase/functions/_shared/emailSender.ts`
- `supabase/functions/validate-rsvp-token/index.ts`
- `supabase/migrations/20260521123000_harden_settings_collaborator_invites.sql`

## Suggested Revival Path

1. create a fresh branch from `main`
2. decide whether the collaborator invite and privacy-summary changes are still desired
3. port the smallest useful settings/team-access pieces first
4. review any sender or RSVP gate hardening as separate follow-up slices
5. leave the broad shared history preserved instead of replaying it

## Summary

`origin/brand-phase-5-imagery-system` belongs in the "preserve broad history, salvage the distinct tip carefully" bucket.

Preserve the branch.
Do not merge it directly.
Use it mainly as a source for the smaller collaborator/privacy/QR/deploy-readiness tip work.
