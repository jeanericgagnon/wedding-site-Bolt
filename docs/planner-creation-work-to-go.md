# Planner creation work to go

## Goal
Finish the planner/collaborator system so a planner can be invited cleanly, create an account or sign in, claim access, work across client weddings, and only see the permissions they were granted — while billing stays strictly on the couple/owner side.

## Product rules
- One paid membership per couple / wedding site.
- Owner/couple can create an auth account, but owner product access is payment-gated.
- Collaborators do not pay.
- Billing belongs to the site/owner context, not the collaborator account.
- A planner can work across multiple wedding sites with one login.
- Invite links only work when:
  - token exists
  - status is pending
  - token is not expired
  - token is not revoked
  - signed-in email matches invite email

## What is already done

### Invite + onboarding foundation
- Dedicated collaborator invite page exists.
- Invite lookup works.
- Inline sign-in/create-account UI exists on the collaborator page.
- Invite diagnostics were added and used to debug live flows.
- Duplicate claim attempts were reduced.
- Claim flow was moved into an RPC.
- Fresh pending invites can be inserted and tested.

### Collaborator architecture
- Collaborator invite table exists.
- Collaborator membership table exists.
- Active site groundwork exists.
- Multi-site dashboard switching groundwork exists.
- Core dashboard pages were updated away from owner-only site lookup in multiple places.
- Billing separation groundwork exists so collaborators are not supposed to be treated like billable owners.

### Permission system groundwork
- Invite permission selector UI exists.
- Role presets exist for planner / coordinator / viewer.
- Permission groups exist and are preselected by role preset.
- Invite permissions now persist to the invite row.
- Collaborator permissions now persist to the collaborator row on claim.
- Initial role-derivation from permissions is wired into some gating surfaces:
  - Guests
  - Messages
  - Planning
  - Coordinator Mode

### Browser testing groundwork
- Playwright live smoke harness exists in the app repo.
- Invite claim debug runner exists.
- Local testing against real Supabase is now possible using `.env.local`.

## Current known truth
The biggest unresolved runtime area is still end-to-end collaborator onboarding + permission QA with real collaborator account creation and final page behavior checks.

## Known issues / unresolved items

### 1. Collaborator create-account runtime QA still needs completion
What we proved:
- invite lookup works
- invite creation works
- sign-in path can fail simply because the collaborator account does not exist yet

What still needs proof:
- fresh invite -> create account -> claim -> redirect -> dashboard access

### 2. Invite page had overly strict gating
A real frontend gating bug existed on `AcceptCollaboratorInvite.tsx`.
Some of that was loosened/fixed, but this area still deserves a final cleanup pass and a simpler state model.

### 3. Permission gating is only partially enforced
Permissions now persist and start to affect some role gating, but not all pages/components/backend policies are permission-aware yet.

### 4. Multi-site planner UX is still groundwork, not finished product
There is active-site groundwork and switcher groundwork, but not a polished planner home / client list / fully verified multi-client workflow yet.

## Work to go

## Phase 1 — Finish planner account creation and claim flow

### 1.1 Finalize create-account invite path
- Verify a fresh collaborator invite for a brand-new email.
- Use the invite page `Create account` path.
- Confirm:
  - account is created
  - invite is claimed
  - collaborator row exists
  - permissions persist to collaborator row
  - redirect lands successfully

### 1.2 Clean up invite page state machine
- Simplify `AcceptCollaboratorInvite.tsx` state handling.
- Remove any leftover contradictory disable logic.
- Make the invite page clearly separate:
  - lookup state
  - auth state
  - claim state
  - redirect state
- Keep visible diagnostics until the flow is proven stable.

### 1.3 Add one happy-path automated browser test
Add a real Playwright path for:
- fresh invite
- create account
- claim invite
- land in dashboard

That becomes the regression test for collaborator onboarding.

## Phase 2 — Make permissions actually matter everywhere

### 2.1 Expand permission-aware gating across dashboard pages
Audit and wire permissions for:
- Settings
- Vault
- Registry
- Itinerary
- Seating
- Audit logs
- Photo sharing
- other remaining dashboard pages

### 2.2 Replace broad role approximation where needed
Right now some pages infer role from permission sets.
Add more direct permission checks so the system can support:
- role preset defaults
- owner customization per invite
without collapsing back into only three coarse roles.

### 2.3 Add permission helper layer
Create shared helpers like:
- `canAccessGuests`
- `canAccessMessages`
- `canAccessPlanning`
- `canAccessBudget`
- `canAccessVendors`
- `canAccessCoordinator`
- `canAccessSettings`

Then use those helpers in UI gating instead of duplicating rough logic.

## Phase 3 — Finish planner multi-client product shape

### 3.1 Verify multi-site switching with real accounts
Test one planner invited to 2+ sites.
Confirm:
- switcher appears
- site context changes
- page data updates correctly
- no cross-site bleed

### 3.2 Add planner/client home state
If collaborator has multiple sites, show:
- Your weddings / clients
- role per site
- quick jump into each site

### 3.3 Persist active site cleanly across sessions
Groundwork exists; final QA and polish still needed.

## Phase 4 — Owner-side invite UX polish

### 4.1 Improve invite creation surface
- show role preset clearly
- show permission groups clearly
- show selected permission summary before send
- reduce clutter in Settings

### 4.2 Improve invite list readability
- separate pending invites vs active collaborators
- show permission summary in a cleaner way
- add joined/claimed status clearly

### 4.3 Make it feel less provisional
Current Settings copy still reflects transitional implementation.
Tighten toward final product language.

## Phase 5 — Billing and access cleanup

### 5.1 Verify owner payment gating remains hard
Owner path should remain:
- auth account allowed
- owner access/payment-gated until paid

### 5.2 Verify collaborators never hit owner billing prompts
Check:
- dashboard header
- upgrade CTA
- billing tab behavior
- payment-required route behavior

### 5.3 Make owner/collaborator separation obvious in code
Keep billing decisions based on:
- active site
- active site role
not just generic signed-in user state.

## Recommended next exact move
If continuing now, the best next single task is:

### Next task
**Complete fresh invite -> create account -> claim -> redirect runtime QA and stabilize `AcceptCollaboratorInvite.tsx` until that path is reliable.**

Why:
- it is the remaining highest-risk path
- it unlocks real collaborator onboarding confidence
- it stops the planner system from being “almost there”

## Good enough done criteria for planner creation v1
This is done enough for v1 when all of the following are true:
- owner can create invite
- owner can choose role preset
- owner can tweak simple permissions
- invite persists permissions
- collaborator can create account from invite
- collaborator can claim access reliably
- collaborator never hits billing wall
- collaborator lands in dashboard
- collaborator only sees allowed surfaces
- one collaborator can belong to multiple sites
- site switching works reliably
- owner remains the only billable account
