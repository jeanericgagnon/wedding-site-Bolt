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
