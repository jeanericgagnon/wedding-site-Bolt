# Hard Pass QA + Smoke Report

Date: 2026-02-28
Scope: RSVP reliability, household/group invite behavior, and release smoke stability.

## Automated gate run
Executed via:
- `scripts/run-hard-pass.sh`

Checks included:
1. `npm run -s test`
2. `npm run -s build`
3. `npm run -s smoke:web`

Status: ✅ PASS

---

## RSVP hard-pass checklist (manual + behavior)

### A) Lookup and identity
- [x] Token/name RSVP lookup path works
- [x] Ambiguous guest handling exists
- [x] Household-aware apply flow exists

### B) Submit flow guardrails
- [x] Deadline/closed-state blocking exists
- [x] Required field validation exists
- [x] Error fallback path exists

### C) Invite-scope hardening (current status)
- [~] Per-event invite enforcement: partially present, needs stronger submit-time enforcement across all edge cases
- [~] Plus-one/children strict rule enforcement: partially present, needs stricter server-backed validation layer
- [~] Conflict queue/admin highlighting: basic visibility exists, no dedicated conflict queue yet

### D) Data quality improvements already shipped
- [x] Stale registry autofill value cleanup (no carry-over price bleed)
- [x] Title+image baseline fallback for registry links
- [x] Interactive anti-spam cooldowns + duplicate guard

---

## Production smoke highlights
- SPA routes: healthy with Vercel rewrite fix
- Dashboard deep links: healthy
- Registry add/edit surface: healthy
- Interactive section baseline: healthy

---

## Next engineering pass to fully close RSVP hardening

1. **Submit-time invite scope enforcement**
   - Enforce invited-events whitelist for each guest/household at submit.
2. **Strict plus-one / child limit checks**
   - Block over-limit submissions and return clear guidance.
3. **Conflict queue in dashboard**
   - Flag and filter guests with invite-scope violations.
4. **Household role visibility**
   - Surface role tags (primary/family/plus-one) in guest admin rows.

These are now the remaining “production hardening” items for RSVP precision.
