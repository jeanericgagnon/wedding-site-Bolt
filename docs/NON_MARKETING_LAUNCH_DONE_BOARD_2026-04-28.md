# DayOf Non-Marketing Launch Done Board

Date: 2026-04-28
Source: `DayOf_Feature_Audit_Full_Accounting.docx`
Scope: Product/runtime launch work only. Marketing acceleration is intentionally skipped.

## Historical status note

This board is an archived 2026-04-28 launch snapshot.

It still contains rows that say things like collaborator runtime is blocked, production deploy confirmation is pending, or core proof is still waiting on environment setup. Those statements were accurate for that date, but they are not the current canonical launch call.

For current launch truth, use:
- [BACKLOG.md](/Users/ericgagnon/Documents/DayOfLove/wedding-site-Bolt/BACKLOG.md)
- [docs/PRODUCTION_HARDENING_REPORT.md](/Users/ericgagnon/Documents/DayOfLove/wedding-site-Bolt/docs/PRODUCTION_HARDENING_REPORT.md)
- [docs/v1-smoke-proof-log.md](/Users/ericgagnon/Documents/DayOfLove/wedding-site-Bolt/docs/v1-smoke-proof-log.md)

Treat this file as historical decision context, not the current readiness board.

## Operating Rule

Every feature gets one outcome:

- **Proven:** Runtime flow works, persists, handles errors/empty states, respects roles, and has proof.
- **Narrow:** Useful enough to expose, but public/product copy must stay constrained.
- **Deferred/hidden:** Exists in repo or docs, but should not be launch-claimed.

The launch spine is:

`site -> guests -> households -> events -> RSVP -> meals -> seating -> messages -> coordinator/day-of -> audit logs`

## Current Hard Gates

| Gate | Current State | Done Bar | Next Action |
| --- | --- | --- | --- |
| Static health | `lint`, `typecheck`, `build`, `test`, and `audit` pass locally | CI blocks broken builds and dependency vulnerabilities | Keep green while patching |
| Proof prerequisites | `proof:v1:prereqs` exists and now detects local Playwright Chromium correctly | Fresh checkout fails early with clear blockers | Collect Supabase/Stripe/Twilio/proof accounts |
| Runtime proof | Non-marketing local bundles now pass or are correctly classified as blocked | Core flows pass against real Supabase/provider config | Run blocked bundles again after env/accounts are available |
| Manual QA | Not complete | Desktop/mobile route notes for launch spine | Capture after env is available |

## 2026-04-28 Execution Update

Local product/runtime proof is now materially cleaner:

- `npm run lint`: PASS with 0 errors. Warnings remain as known codebase debt.
- `npm run typecheck -- --pretty false`: PASS.
- `npm run build`: PASS.
- `npm run test -- --run`: PASS, 371 files and 2,388 tests.
- `npm run proof:v1:collaborator-access`: PASS.
- `npm run proof:v1:comms-center`: PASS when run sequentially.
- `npm run proof:v1:seating-continuity`: PASS when run sequentially.
- `npm run proof:v1:registry`: PASS.
- `npm run proof:v1:coordinator-dayof`: PASS.
- `npm run test:e2e:live` against local preview: PASS, 31 Playwright checks.
- `npm run proof:v1:guests-rsvp-ops`: PASS after linked Supabase env and `validate-rsvp-token` deploy.
- `npm run proof:v1:collaborator-runtime`: BLOCKED on missing disposable proof accounts.
- `npm run proof:v1:canonical-smoke`: PASS, including Supabase-backed site lookup.

The app no longer blank-crashes when Supabase env vars are absent. Public/static routes can render locally while Supabase-backed data calls still fail honestly until `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` exist.

Payment bypass remains available for testing and is intentionally env-gated with `VITE_ALLOW_PAYMENT_BYPASS`.

Current launch blockers are external runtime proof gates, not hidden marketing work:

- Manual couple-path and runtime wording proof.
- Collaborator runtime proof account.
- Stripe price/webhook proof and Twilio SMS secrets.
- Production deployment confirmation after the final code pass.

## Launch-Core Feature Board

| Feature | Current Surface | Done Looks Like | Current Proof | Missing / Risk | Claim Status |
| --- | --- | --- | --- | --- | --- |
| Builder production path | `/builder`, `/dashboard/builder`, builder shell/canvas/rail/inspector/services | One production path; edits match public site; autosave/dirty state visible; undo/redo safe; DnD/delete/previews do not corrupt output | Build/tests exist around builder utilities and publish readiness | Need browser proof that builder output equals public site; Builder V2 must stay internal or become explicit production | Narrow until runtime proof |
| Builder V2 lab | `/builder-v2-lab`, builder-v2 contracts/sanitize/validate | Hidden/internal unless it is the production builder; no user-facing split-brain | Unit tests exist | Verify route exposure/nav; ensure no public claim | Deferred/internal |
| Public wedding site | `/site/:slug`, subdomain support, `SiteView`, section renderers, slug utilities | Slug/subdomain load; missing slug 404; unpublished Coming Soon; published current version; fail-closed privacy; mobile clean | `SiteView` tests, site lookup smoke, canonical proof bundle | Needs Supabase env and browser proof for real slug/privacy modes | Launch core, blocked on env proof |
| Visibility/privacy | `siteVisibilityState`, copy/trust utilities, settings surfaces | draft/unpublished/public/password/invite-only/search-hidden are distinct; password/invite-only fail closed | Utility tests/docs exist | Need direct URL proof; no stale public fallback | Launch core |
| Auth/access | signup/login/protected routes/active site/collaborator invite | Return paths survive; no auth/payment loops; collaborators not owner-paywalled; direct URL access blocked | Login/signup/protected utility tests, collaborator access proof | Target-env collaborator runtime proof needs proof accounts | Launch core, blocked on proof accounts |
| Onboarding/setup | onboarding, quick start, guided setup, setup routes, AI fallback | User reaches usable dashboard; leave/resume works; no fake completeness; setup maps to site/RSVP config | Many unit tests; build passes | Needs browser proof from zero -> dashboard -> public draft | Launch core |
| AI setup | draft generator, follow-up planner, clarifying flow, OpenAI wrapper | Useful editable draft; no invented facts; failure fallback; generated sections validate | Unit tests use deterministic fallback | Provider proof optional; copy must remain "assist" not autonomous planner | Narrow |
| Dashboard shell | dashboard layout/nav/active site/role filtering | Permission-aware nav and direct route access; mobile nav works; active site switch avoids stale data | Role tests, build | Need mobile/browser QA and direct URL permission proof | Launch core |
| Overview | `/dashboard`, overview utils | Calm command center with publish, RSVP, guest, task, event, message, seating, photo, registry repair truth; no fake metrics | Overview tests/build | Need live data QA; cards must link to useful actions | Launch core |
| Guests dashboard | `/dashboard/guests`, guest ops utilities | Add/edit/delete/import/group/plus-one/event invites/RSVP/meal/diet/contact/export; filters and bulk actions safe; handler permissions | CSV/check-in smoke, tests | CSV import lacks preview/map/rollback; Excel removed for security; need target-env guest proof | Launch core, narrow import claim |
| CSV import | header matcher, CSV mapper smoke | Upload, detect/map, preview, errors, dedupe, partial import, rollback/undo; common platform formats | CSV mapper smoke passes | Current import is CSV-only and simpler than done bar; no preview/rollback | Narrow |
| Households/plus-ones | guests/RSVP utilities/docs | split household, children, named/unnamed plus-one, counts feed RSVP/seating/meals/messages | Utility coverage exists | Need end-to-end proof through RSVP -> seating/messages | Launch core |
| Public RSVP | `/rsvp`, RSVP tests/utilities | Safe lookup/token; mobile; existing RSVP loads; stale state clears; deadline enforced in handler; meals/custom questions/plus-one/contact | Strong test suite; RSVP smoke bundle exists | Strict smoke blocked on Supabase anon/env; manual mobile proof needed | Launch core, blocked on env proof |
| Event RSVP | `/events`, event RSVP tests/utilities | Event invite scope respected; global/event RSVP do not conflict; timestamps feed dashboard/seating/messages/coordinator | EventRSVP tests pass | Need target-env proof of event invite lifecycle and downstream counts | Launch core |
| RSVP board | `/dashboard/rsvp-board` | Attending/declined/pending/partial/missing meals/contact/plus-one/event gaps; counts match Guests/Seating | Filter tests | Need runtime consistency proof | Launch core |
| Guest contact update | `/guest-contact/:token` and Supabase functions | Secure scoped token; clean expired/invalid states; updates audited | Function code exists | Need token proof and audit proof | Launch core |
| Itinerary/events | `/dashboard/itinerary`, event utilities | Events drive public schedule, RSVP, seating, coordinator timeline; time zones correct | Date/time tests | Need full event -> RSVP -> seating/coordinator proof | Launch core |
| Travel/maps | travel sections/pages, Google Maps docs/loader | Hotel/airport/shuttle/parking/local recs; map fallback if key missing | Build | Need missing-key visual proof; no broken blank map | Narrow |
| Messaging | `/dashboard/messages`, email service, message utilities/smoke | Draft/segment/preview/schedule/send/retry/cancel/history; no fake success; handler permissions | `proof:v1:comms-center`, message tests/smoke | Provider keys/webhooks and SMS compliance proof missing | Launch core for email/basic; SMS narrow until provider proof |
| Segmentation/lifecycle | guest communication/lifecycle/invite helpers | Segments match current guest/RSVP truth; lifecycle history and suggested actions clear | Utility tests | Need target-env send/history proof | Launch core |
| Seating | `/dashboard/seating`, service, DnD, continuity proof | Create/size tables; assign/unassign/drag/drop; eligible guests only; declined/uninvited/over-capacity warnings; reliable unseated list | `proof:v1:seating-continuity` passes | Need browser/DnD/mobile proof; export truth proof | Launch core |
| Seating lookup/export/drift | lookup route, CSV/table-summary export, drift helpers | Fast staff search; shows table/meal/diet/event/check-in; exports match RSVP/event state; drift warnings actionable | Service tests/proof | PDF/cards later; table summary is CSV, not Excel | Launch core, narrow export claim |
| Coordinator/day-of | `/dashboard/coordinator`, coordinator modules | Mobile-first command center; weak Wi-Fi tolerant; next event/arrivals/issues/seating/check-in/timeline/Q&A/alerts/messages; no owner controls for restricted users | `proof:v1:coordinator-dayof` passes | Needs mobile runtime QA and target-env state proof | Launch core |
| Check-in | check-in smoke/modules | Mark/undo; expected arrivals; flags not-on-list/wrong-event/plus-one/seating/diet/access notes; feeds dashboard/audit | Check-in smoke/proof | Need audit-log proof | Launch core |
| Alerts/timeline/Q&A/command deck | coordinator alert/timeline/Q&A/priority modules | Create/resolve alerts; timeline tied to itinerary; Q&A uses real data and escalates unknowns; next action explainable | Many utility tests | Need full browser route proof under coordinator role | Launch core |
| Registry | `/dashboard/registry`, public registry sections, service/smoke | Add URL/manual, import/edit image/title/price/store, mark/hide purchased, repair/delete; polished public registry | `proof:v1:registry` passes | Merchant workers/refresh/purchased parity need target proof | Launch core, narrow merchant/purchased claims |
| Registry import/refresh/repair | Supabase functions/adapters, refresh budgets, repair utils | URL paste best-effort; failure fallback; worker budgets; weak imports repairable; no perfect merchant claim | Tests/smoke | Scheduled worker/provider proof missing | Narrow |
| Photos/upload | `/dashboard/photos`, `/photos/upload`, photo buckets | Buckets/QR/upload links; guest accountless upload; moderation; visibility/upload limits/errors/export | Some tests/docs | Storage/provider and abuse controls need proof | Narrow or deferred from core |
| Vault/archive | `/dashboard/vault`, `/vault/:siteSlug`, archive utilities | Locked vaults no leaks; unlock works; export/download; Drive issues visible | Tests/docs | Google Drive OAuth/provider proof missing | Deferred/narrow |
| Planning | `/dashboard/planning` tasks/budget/vendors/name-change | Useful support workspace; persists; roles respected; no marketplace/accounting/legal overclaim | Planning tests | Need persistence/browser proof; keep non-core | Narrow |
| Name-change | planning tab + extensive engine/docs | Legal-safe guidance/workspace; rules clear; no legal-service overclaim; sensitive data handled carefully | Large test suite | Not core wedding v1; official link verification/provider proof absent | Deferred/narrow |
| Collaborators/RBAC | invite route, planner access utils, docs/RLS matrix | Invite/revoke/expire; roles enforced nav/route/component/handler/backend/RLS; no self-escalation | `proof:v1:collaborator-access` passes | Runtime invite proof blocked on proof accounts; RLS SQL proof needed | Launch core |
| Billing/payment | billing modal, Stripe service, payment routes/gate | Checkout/session/webhook entitlement; failure/cancel recovery; owner gated; collaborators not paywalled; price truth | Payment gate tests/build; bypass env-gated | Stripe test keys/webhook proof missing | Launch core, blocked on provider proof |
| Settings | `/dashboard/settings`, config validation | Names/date/venue/slug/publish/privacy/password/invite RSVP deadline/meals/questions/collabs/billing/export/delete/notifications if supported; no fake settings | Validation tests | Need each setting mapped to downstream runtime | Launch core |
| Analytics/audit/error logs | overview aggregates, audit route, admin errors | Only measured data; durable audit of publish/RSVP/guest/collab/message/seating/check-in/privacy/billing; admin-only error logs | Time/util tests | Need server-side durability and access proof | Launch core for audit; analytics narrow |
| Vendor profiles | `/vendor/:slug`, `/vendor-profile-v1` | Public profile and constrained creation only; no marketplace/search promise | Utility code exists | Marketplace/deep moderation not proven | Narrow/deferred |
| i18n | en/es files, language switcher | Guest-facing text translated; RSVP translated; dates localized; no mixed-language public UI | Build | Full app translation not proven | Narrow |
| Save-the-date/invitations/song/thank-you | lifecycle helpers/audit docs | Works through messaging/custom questions/export only; no stationery/DJ/full CRM claim | Partial utilities | Not core unless proven | Deferred/narrow |
| Infrastructure | Supabase, RLS, edge functions, providers, CI/proof scripts | Schema matches frontend; RLS protects tables; functions validate/log; envs documented; proof scripts realistic | Many scripts/docs | Supabase/provider env and SQL/RLS proof missing locally | Launch blocker |

## Immediate Execution Order

1. Close local proof prerequisites that do not require product decisions: Playwright browser install and proof-run hygiene.
2. Run all non-marketing proof bundles and classify each as pass, blocked, or product-fail.
3. Patch any product-fail in the launch spine before side surfaces.
4. For env-blocked items, document exact env/secrets/accounts needed and keep the feature in blocked state.
5. After env is available, run target proof in this order:
   - public site visibility/privacy
   - onboarding/setup -> builder -> publish
   - guests/households -> RSVP/event RSVP -> meals
   - seating -> messaging -> coordinator/check-in -> audit logs
   - collaborator runtime permissions
   - Stripe/SMS/email provider proof
