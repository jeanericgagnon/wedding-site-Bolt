# V1 Opt-In Live Proof Schedule

Status: scheduled or explicitly accepted before market launch, not silently open.

Run rule: only run these against production when authenticated write/cleanup approval and the needed proof accounts are available. Do not print secrets. Do not run destructive/live write specs as part of a normal no-deploy hardening batch.

## Before Broad Market Push

| Proof | Spec | Current stance |
| --- | --- | --- |
| Seating write/read | `tests/e2e/seating-write-read.spec.ts` | Rerun before market push if seating source changes; otherwise accepted from prior authenticated production suite. |
| Quick Start onboarding write/read | `tests/e2e/quick-start-onboarding-write-read.spec.ts` | Rerun before market push or after onboarding/AI/setup changes. |
| Planner starter suite | `tests/e2e/planner-starter-suite-write-read.spec.ts` | Rerun before market push or after planner starter changes. |
| Site RSVP widget | `tests/e2e/site-rsvp-widget-write-read.spec.ts` | Rerun before market push or after public RSVP/render changes. |
| Settings team invite claim | `tests/e2e/settings-team-invite-claim.spec.ts` | Gated on disposable collaborator proof account env vars. |
| Vendor profile publish/inquiry | `tests/e2e/vendor-profile-publish-inquiry.spec.ts` | Run only if `VITE_ENABLE_VENDOR_PROFILE_CREATION=true`; otherwise creation stays intentionally paused. |
| Vendor templates smoke | `tests/e2e/vendor-templates-smoke.spec.ts` | Rerun before market push and after vendor-template changes; safe to keep even when generation is paused. |

## Optional Guest/RSVP Depth

| Proof | Spec | Current stance |
| --- | --- | --- |
| Guest import write | `tests/e2e/guest-import-write.spec.ts` | Rerun if guest import code changes. |
| RSVP write/read | `tests/e2e/rsvp-write-read.spec.ts` | Rerun if RSVP lookup/review/save changes. |
| Event RSVP write/read | `tests/e2e/event-rsvp-write-read.spec.ts` | Rerun if event-specific RSVP changes. |
| Guest hub write/read | `tests/e2e/guest-hub-write-read.spec.ts` | Rerun if hub opt-in/tracking changes. |
| Guest contact update | `tests/e2e/guest-contact-update-write-read.spec.ts` | Rerun if contact update or guest identity lookup changes. |

Exit bar: before a market push, each row is either freshly passed on the current production deploy, explicitly accepted from prior proof with no relevant source changes, or blocked by a named external setup item such as collaborator proof accounts or paused vendor generation.

