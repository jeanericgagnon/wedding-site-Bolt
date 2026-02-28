# Release Guardrails — Sprint A

Date: 2026-02-27

## Feature flags (recommended)
- `builder.templateSwitchSafety`
- `builder.previewViewportToggle`
- `builder.sectionHealthPills`
- `builder.publishPreflightV2`
- `builder.rsvpFlowHardened`

## Rollout plan
1. 10% internal cohort (team + test wedding ids)
2. 50% broader beta cohort
3. 100% rollout after 24h stable metrics

## Rollback plan
If blocker appears:
1. Disable affected feature flag(s)
2. Re-run smoke checks:
   - builder preview toggle
   - template apply + undo
   - RSVP submit
   - publish preflight
3. If necessary, redeploy previous known-good commit

## Monitoring alerts (24h post-release)
Track:
- RSVP submit failure rate
- Builder save failure rate
- Publish failure rate
- Template switch error rate

Suggested thresholds:
- RSVP failures > 2% over 15m
- Save failures > 1% over 15m
- Publish failures > 3% over 15m
- Any spike > 5x baseline for template switch failures

## On-call ownership
- Primary: PM/Eng owner
- Secondary: Backup engineer

## Incident response checklist
- Capture failing flow + repro path
- Tag incident severity
- Apply flag rollback if user impact is active
- Post incident summary with:
  - root cause
  - user impact
  - mitigation
  - permanent fix ticket

## Exit criteria for stable release
- No blocker incidents in 24h
- Metrics under thresholds
- Smoke + regression checks still passing
