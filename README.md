# wedding-site-Bolt

DayOf wedding website + dashboard app.

## Core local commands

- `npm run dev` — local Vite dev server
- `npm run build` — production build
- `npm run test` — unit tests (Vitest)
- `npm run typecheck` — TypeScript checks

## Smoke / reliability commands

- `npm run smoke:rsvp:strict` — strict RSVP API behavior checks
- `npm run smoke:site <slug>` — site lookup smoke (slug/url)
- `npm run smoke:web` — production + QA route smoke checks
- `npm run smoke:csvmapper` — CSV mapper guardrail smoke (input wiring, mapper presence, name mapping guard)

## Single hard-pass gate for RSVP/CSV changes

- `npm run hardpass:rsvp`

This now runs:

1. `npm test`
2. `npm run build`
3. `npm run smoke:rsvp:strict`
4. `npm run smoke:csvmapper`

Use this as the default pre-release gate for guest import + RSVP reliability work.

## New backend rollout notes (RBAC + SMS inbound RSVP)

- Apply migrations in order, including:
  - `20260302073000_add_wedding_site_collaborator_rbac.sql`
  - `20260302080000_add_sms_inbound_rsvp_events.sql`
- Deploy edge function: `supabase/functions/sms-rsvp-inbound`
- Configure Twilio webhook to point to the deployed `sms-rsvp-inbound` endpoint.
- Post-rollout verify:
  - role-based access behavior in Guests/Messages/Planning/Coordinator
  - inbound SMS YES/NO updates guest RSVP and writes `sms_inbound_rsvp_events` audit rows
  - all smoke commands remain green (`typecheck`, `build`, RSVP strict, csvmapper, checkin, site/web)
- Full checklist: `docs/runbooks/rbac-sms-rollout-checklist.md`
