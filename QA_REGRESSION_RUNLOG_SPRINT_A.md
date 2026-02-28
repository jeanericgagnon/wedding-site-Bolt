# QA Regression Runlog — Sprint A

Date: 2026-02-27
Owner: PM/QA

## Scope
Critical Sprint A workflows:
1. Template switch safety
2. Section rail reorder/show-hide/status
3. Preview fidelity (desktop/mobile)
4. RSVP open/closed/error/success flows
5. Publish preflight blocker routing + publish success path

## Automated checks (Run 1)
- `npm run test -- src/builder/utils/publishReadiness.test.ts src/builder/utils/publishNowFlow.test.ts src/builder/state/builderReducer.test.ts src/builder/utils/publishUiHints.test.ts`
- Result: PASS (42 tests)

- `npm run build`
- Result: PASS

- `npm run smoke:web`
- Result: PASS with expected deep-link 404 caveat on static host raw path checks; **all `oc_redirect` SPA fallback checks returned 200**

## Automated checks (Run 2)
- `npm run test -- src/builder/utils/publishReadiness.test.ts src/builder/utils/publishNowFlow.test.ts src/builder/state/builderReducer.test.ts src/builder/utils/publishUiHints.test.ts`
- Result: PASS

- `npm run build`
- Result: PASS

## Manual smoke checklist

### Template switching
- [x] Apply template A -> B -> C with populated content
- [x] Verify copy/settings preserved
- [x] Undo restores previous template state

### Section rail
- [x] Reorder section list and confirm canvas reorder
- [x] Toggle visibility and verify hidden section persistence
- [x] Confirm health pills render (empty/draft/ready)
- [x] Confirm locked section delete action disabled

### Preview fidelity
- [x] Toggle preview on/off
- [x] Toggle desktop/mobile viewport in preview
- [x] Confirm mobile viewport constrained and centered

### RSVP flow
- [x] Lookup flow with valid token
- [x] Validation block on missing required flow state
- [x] Success state after submit
- [x] Error state remains recoverable with field values retained

### Publish preflight
- [x] Block on missing partner names
- [x] Block on missing date
- [x] Block on missing venue
- [x] Block on RSVP disabled
- [x] Publish allowed when preconditions satisfied

## Outcome
- Sprint A regression suite: PASS
- No blocker defects found in this runlog
- Remaining platform caveat: static-host deep link raw HTTP behavior (non-blocking for SPA fallback mode)
