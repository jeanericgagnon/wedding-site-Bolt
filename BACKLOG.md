# Production Hardening Backlog

This backlog is organized by launch priority and is meant to drive focused production hardening work. It is intentionally implementation-oriented: each item includes the problem, risk, likely inspection areas, acceptance criteria, and a suggested approach.

## P0 - Must fix before real users

### Public site access leaks private gate data

Problem:
The public site frontend appears to select sensitive fields like `site_password_hash`, `guest_access_token`, `privacy_mode`, and `hide_from_search`. Password hashes and invite tokens must never be sent to the browser.

Risk:
Private access controls can be reverse-engineered from client payloads, exposing password-gated or private wedding sites and undermining trust immediately.

Likely files/areas to inspect:
- `src/pages/SiteView.tsx`
- `src/lib/publicSiteProject.ts`
- `src/data/siteRepository.ts`
- `src/lib/activeSite.ts`
- Supabase queries touching `wedding_sites`
- Public site edge-function/RPC access paths

Acceptance criteria:
- Public site browser payloads never include password hashes, guest access tokens, or private gate configuration fields beyond the minimum needed for a safe public access decision.
- Public site UI still correctly handles public, password-protected, invite-only, and hidden/search-disabled modes.
- Regression tests prove sensitive fields are absent from public responses.

Suggested implementation approach:
Move public site reads behind a server-controlled safe projection, then update the frontend to consume only a public-safe shape instead of direct broad table reads.

### Public site privacy/password/invite gating must move server-side

Problem:
Privacy enforcement appears to be happening too much in the frontend instead of through a server-controlled access boundary.

Risk:
A malicious or curious user can bypass client logic, inspect hidden data, or hit data paths the UI was relying on for gating.

Likely files/areas to inspect:
- Public site route loaders/components
- Supabase client reads for wedding-site visibility
- Existing edge functions or RPCs related to access checks
- Password/invite entry flows

Acceptance criteria:
- Privacy/password/invite checks happen server-side through an edge function or RPC.
- The browser receives only the safe site payload for the access state it has earned.
- Failed access attempts return calm generic responses without leaking hidden fields or gate mechanics.

Suggested implementation approach:
Create a single server-side public-site resolver that validates password/invite access, returns a minimal safe view model, and centralizes all privacy-mode branching.

### RSVP lookup is too permissive

Problem:
The RSVP validation edge function appears to use service-role access and may allow guest lookup by name/token in ways that expose guest email, invite token, or other sensitive fields.

Risk:
Guest data could be enumerated or exposed through the RSVP flow, especially for common names or repeated probing.

Likely files/areas to inspect:
- `supabase/functions/validate-rsvp-token/`
- `supabase/functions/submit-rsvp/`
- RSVP lookup/frontend helper code
- Guest and invite-token query helpers

Acceptance criteria:
- RSVP lookup only returns the minimum guest/session state required for RSVP completion.
- Guest email, invite tokens, and unrelated guest records are never returned to the browser.
- Enumeration resistance is improved with stricter lookup semantics and rate limiting.

Suggested implementation approach:
Narrow the edge-function response shape, remove broad service-role projection patterns, and require server-issued scoped session state before exposing RSVP details.

### RSVP flow should not return invite tokens to the browser

Problem:
Current RSVP behavior appears to return invite tokens to the browser.

Risk:
Tokens can be copied, replayed, leaked via client logs/state, or reused outside intended scope.

Likely files/areas to inspect:
- RSVP validation and submit edge functions
- RSVP page/client state handling
- Token persistence or URL handling code

Acceptance criteria:
- Invite tokens are not returned to browser state after lookup.
- The browser uses a short-lived server-generated RSVP session or similarly scoped access artifact instead.
- Replay and cross-guest misuse are materially reduced.

Suggested implementation approach:
Replace raw invite-token return behavior with a short-lived RSVP session minted server-side and validated on subsequent RSVP actions.

### OpenAI API key exposure

Problem:
Any frontend use of `VITE_OPENAI_API_KEY` or direct browser OpenAI calls must be removed.

Risk:
The provider key can be extracted, abused, and used to run up cost or access AI capabilities outside intended controls.

Likely files/areas to inspect:
- Frontend env usage
- `src/lib/openai.ts`
- AI onboarding/generation/photo flows
- Edge functions handling AI requests

Acceptance criteria:
- No browser bundle path reads `VITE_OPENAI_API_KEY` or calls OpenAI directly.
- All model-backed calls run through Supabase edge functions or equivalent backend routes.
- Regression proof confirms no provider key is bundled or exposed.

Suggested implementation approach:
Delete browser-side provider usage entirely, route all AI work through server functions, and keep frontend AI code limited to calling internal endpoints.

### Service worker caches too broadly

Problem:
The service worker appears to cache responses too broadly, including Supabase/API/authenticated/dynamic JSON candidates.

Risk:
Sensitive or stale authenticated data can persist in caches and be served incorrectly across sessions or users.

Likely files/areas to inspect:
- Service worker registration and implementation
- `public/manifest.webmanifest`
- Any cache allowlist/denylist logic
- Build-time PWA config

Acceptance criteria:
- Only safe static same-origin assets are cached.
- Supabase, API, auth, dynamic JSON, and user-specific responses are explicitly excluded.
- Offline/static behavior still works for approved public assets.

Suggested implementation approach:
Tighten cache matching rules to an explicit allowlist for hashed static assets and same-origin shell resources, with hard excludes for API/auth/data paths.

### Email HTML interpolation needs centralized escaping

Problem:
Edge functions that compose email HTML may interpolate user-controlled values without centralized escaping/sanitization.

Risk:
Email HTML injection can break layout, create phishing-looking output, or expose downstream renderer quirks.

Likely files/areas to inspect:
- `supabase/functions/send-wedding-email/`
- `supabase/functions/send-bulk-message/`
- `supabase/functions/process-email-queue/`
- Shared email template helpers

Acceptance criteria:
- Every user-controlled string inserted into email HTML is escaped or sanitized centrally.
- Email templates render correctly with hostile input.
- Tests cover escaping behavior for representative fields.

Suggested implementation approach:
Create one shared escape/sanitize helper for HTML email composition and route all template interpolation through it.

### Registry preview fetcher needs SSRF hardening

Problem:
The registry preview edge function fetches user-provided URLs without sufficient SSRF protections.

Risk:
Attackers may target internal networks, metadata endpoints, oversized responses, redirect chains, or unsafe content types.

Likely files/areas to inspect:
- `supabase/functions/registry-preview/`
- `supabase/functions/registry-preview/urlNormalizer.ts`
- Any shared fetch helpers used by preview/import logic

Acceptance criteria:
- Only allowed protocols are fetched.
- Private IPs, localhost, and metadata endpoints are blocked.
- Redirect count, timeout, size, and content-type limits are enforced.
- Logging captures denied cases without exposing raw internal details to users.

Suggested implementation approach:
Add a hardened fetch wrapper for registry preview with protocol/host validation, DNS/IP rejection rules, strict budgets, and response validation before parse.

### Dashboard settings privacy fields may be read without being selected

Problem:
Dashboard settings code appears to use fields like `privacy_mode`, `hide_from_search`, `guest_access_token`, `default_language`, and `notification_prefs` without always selecting them explicitly.

Risk:
This causes inconsistent runtime behavior, accidental `undefined` logic, and may tempt broad over-selection later.

Likely files/areas to inspect:
- `src/pages/dashboard/Settings.tsx`
- Settings service/repository code
- Supabase selects for wedding-site settings state

Acceptance criteria:
- Every settings consumer only reads fields it explicitly selects.
- Sensitive settings fields are handled intentionally and minimally.
- Tests cover the settings payload contract.

Suggested implementation approach:
Move settings reads into a typed repository/service layer with a canonical selected field list and contract tests.

## P1 - Must fix before paid launch

### Replace or isolate xlsx dependency

Problem:
`npm audit` reports a production-relevant vulnerability around `xlsx`.

Risk:
A vulnerable spreadsheet parser increases attack surface for guest imports or document processing.

Likely files/areas to inspect:
- `package.json`
- Import/upload parsing flows
- Guest import utilities
- Any server-side spreadsheet handling

Acceptance criteria:
- `xlsx` is replaced, upgraded to a safe path, or isolated behind a safer server-side boundary with strict file constraints.
- Import behavior still works for approved formats.
- Security posture is improved and documented in the backlog/proof trail.

Suggested implementation approach:
Prefer replacing the dependency; if not feasible quickly, move parsing to a constrained server path and restrict accepted uploads until replacement is done.

### Fix failed smoke test

Problem:
`npm run smoke:registry` failed.

Risk:
A broken smoke path undermines confidence in registry launch readiness and weakens our regression gate.

Likely files/areas to inspect:
- `package.json` smoke scripts
- Registry smoke test files
- Registry page/service logic

Acceptance criteria:
- `npm run smoke:registry` passes reliably.
- The failure root cause is understood and covered by the correct test layer.

Suggested implementation approach:
Reproduce the failing assertion, decide whether the issue is product logic or test drift, fix the source of truth, then keep the smoke test lean and deterministic.

### Make typecheck, lint, and tests complete reliably

Problem:
`npm run typecheck`, `npm run lint`, and `npm test` timed out in review.

Risk:
Core release gates become too slow or flaky to trust, so regressions slip or team velocity collapses.

Likely files/areas to inspect:
- `package.json` scripts
- Vitest/ESLint/TypeScript config
- CI workflow config
- Oversized test suites or unbounded test discovery

Acceptance criteria:
- Typecheck, lint, and test commands complete in a reasonable and repeatable time locally and in CI.
- Test classes are split clearly enough that we can run focused gates without brute-force full-suite churn every time.

Suggested implementation approach:
Split gates by scope, reduce redundant work, and create a predictable default CI pipeline plus focused local commands.

### Split large dashboard files

Problem:
Large files such as `src/pages/dashboard/Guests.tsx` exceed healthy size and mix unrelated concerns.

Risk:
Changes become fragile, review quality drops, and bugs are easier to introduce in highly coupled files.

Likely files/areas to inspect:
- `src/pages/dashboard/Guests.tsx`
- Other oversized dashboard page files
- Adjacent components/hooks/services that could be extracted

Acceptance criteria:
- The largest dashboard pages are decomposed into feature modules with clearer ownership boundaries.
- Behavior remains unchanged except for intentionally fixed bugs.
- Tests continue to pass with more targeted coverage around extracted units.

Suggested implementation approach:
Extract feature slices incrementally by concern: UI panels, import logic, RSVP config, audit views, local state helpers, and Supabase access.

### Move direct Supabase calls out of page components

Problem:
Too many page components appear to call Supabase directly.

Risk:
Data access becomes inconsistent, hard to secure, and hard to test.

Likely files/areas to inspect:
- Dashboard pages
- Public site pages
- Existing service/repository modules

Acceptance criteria:
- Site, guest, RSVP, registry, messaging, and settings data access is routed through repository/service layers.
- Page components consume typed methods instead of ad hoc queries.

Suggested implementation approach:
Introduce domain repositories gradually and move the highest-risk or most-reused reads/writes first.

### Improve test structure

Problem:
Unit, integration, smoke, and e2e tests are not cleanly separated enough.

Risk:
Running the right proof for the right change is harder than it should be, increasing both missed regressions and wasted time.

Likely files/areas to inspect:
- `tests/`
- `src/**/*.test.*`
- `package.json`
- Playwright/Vitest config

Acceptance criteria:
- Test classes are clearly separated.
- Commands for each test class are documented and easy to run.
- CI can choose the right gate by change risk.

Suggested implementation approach:
Create explicit naming/folder conventions plus script aliases for unit, integration, smoke, and e2e layers.

## P2 - Important cleanup

### Shrink public asset footprint

Problem:
The build output appears very large because public preview GIFs/assets are copied into `dist`.

Risk:
Slower deploys, heavier downloads, and wasted asset shipping hurt product feel and ops efficiency.

Likely files/areas to inspect:
- `public/`
- Template/media preview assets
- Build output strategy
- Preview generation scripts

Acceptance criteria:
- Large preview/demo media is moved to CDN/object storage or replaced with optimized thumbnails.
- App bundle and deploy output size drop materially.

Suggested implementation approach:
Keep only minimal launch-critical preview assets in-app and move bulky demo/media artifacts to an external serving path.

### Add file-size/complexity guardrails

Problem:
There is no strong automated guard against new 2,000+ line page files.

Risk:
The codebase drifts back into the same maintainability trap even after we split the worst offenders.

Likely files/areas to inspect:
- ESLint config
- CI scripts
- Repo conventions docs

Acceptance criteria:
- Guardrails fail or warn when new files exceed agreed complexity/size thresholds.
- Exceptions are explicit rather than accidental.

Suggested implementation approach:
Add lint or CI checks for file length and optionally complexity, tuned to warn first and then enforce once the biggest files are reduced.

### Update stale audit/release docs

Problem:
Some docs appear more confident than actual local checks support.

Risk:
The team may make launch decisions from stale evidence instead of current proof.

Likely files/areas to inspect:
- Release docs
- Audit docs
- Launch backlog/proof files

Acceptance criteria:
- Launch/release docs only claim what current proof supports.
- Stale or superseded documents are marked clearly.

Suggested implementation approach:
Treat proof logs and generated proof boards as canonical, then refresh or demote older docs that overclaim certainty.

### Add security regression tests

Problem:
There are not enough explicit tests proving sensitive fields stay out of public site, RSVP lookup, registry preview, and settings flows.

Risk:
Security regressions can slip back in silently during fast product iteration.

Likely files/areas to inspect:
- Public site tests
- RSVP tests
- Registry preview tests
- Settings payload tests

Acceptance criteria:
- Tests fail if sensitive fields are returned where they should not be.
- Public-site, RSVP, registry-preview, and settings hardening each have regression coverage.

Suggested implementation approach:
Add targeted contract tests at the repository/edge-function boundary plus one browser-level proof where it matters.

### Add rate limiting/audit logging where missing

Problem:
Some risky endpoints still need stronger rate limiting and audit trails.

Risk:
Abuse, brute force, scraping, or expensive endpoint misuse becomes harder to detect and control.

Likely files/areas to inspect:
- RSVP lookup
- Password attempt flows
- Registry preview fetch
- AI generation routes
- Messaging endpoints

Acceptance criteria:
- High-risk endpoints have appropriate rate limiting and useful audit logging.
- Logging is safe and does not leak secrets or sensitive payloads.

Suggested implementation approach:
Standardize a shared rate-limit and audit helper for edge functions, then roll it out by risk priority.

## P3 - Nice to have

### Consider React Query or equivalent query/cache layer

Problem:
Repeated Supabase fetch logic creates inconsistent loading/error/cache behavior.

Risk:
The UI remains harder to reason about than necessary, especially as the app grows.

Likely files/areas to inspect:
- Data-heavy dashboard pages
- Existing local loading/error state patterns
- Service/repository access points

Acceptance criteria:
- Repeated client-fetch patterns are reduced behind a consistent query/cache layer.
- Loading and error states become more uniform.

Suggested implementation approach:
Evaluate introducing React Query or an equivalent layer only after the service/repository boundary is cleaner.

### Improve deployment asset strategy

Problem:
Heavy demo/template media is still shipped too directly in the app bundle/deploy output.

Risk:
This keeps build and deploy weight higher than necessary.

Likely files/areas to inspect:
- `public/`
- Build pipeline
- Preview media generation/storage

Acceptance criteria:
- Deployment strategy avoids bundling unnecessary heavy demo media.
- Preview media is served from a more appropriate asset path.

Suggested implementation approach:
Move media-heavy artifacts to object storage/CDN and keep the app bundle focused on runtime assets.

### Add architecture notes

Problem:
The intended boundaries between frontend, Supabase client, edge functions, service-role functions, and public data access are not documented clearly enough.

Risk:
Future changes can easily reintroduce unsafe patterns because the target architecture is implicit instead of explicit.

Likely files/areas to inspect:
- Root docs
- Security docs
- Data access/service layers

Acceptance criteria:
- There is a concise architecture note documenting which layers may access which data and where privileged logic belongs.
- New contributors can follow the intended boundaries without reverse-engineering them from code.

Suggested implementation approach:
Write a short architecture note after the highest-risk hardening lanes are implemented so it reflects the real target boundary.

## Execution Notes

- Do not start broad refactors from this file alone.
- Execute this backlog top-down by risk, beginning with the P0 public data, gating, RSVP, AI key, service worker, email escaping, SSRF, and settings contract issues.
- Update proof logs and launch docs only after concrete verification passes.
