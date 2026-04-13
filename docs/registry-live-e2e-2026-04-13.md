# Registry Live-ish E2E Run

Date: 2026-04-13
Target: `https://dayof.love`
Script: `scripts/playwright-registry-e2e.mjs`
Account: test account

## Result
Partial pass, then failure.

## What passed
- open login
- sign in
- open registry
- open add item form

## What failed
### Import URL step
Failure:
- script timed out waiting for the `Item Name` field after clicking `Fetch details`

Observed error:
- `TimeoutError: locator.inputValue: Timeout 30000ms exceeded`
- waiting for `getByLabel(/Item Name/i)`

## What this means
The live-ish registry flow is **not fully proven** yet.
Either:
- the form labels no longer match the script
- the import flow did not populate as expected
- or the fetch/import UX stalled before the form became ready

## Safe conclusion
Phase 8.5.1 found a real E2E failure signal.
Do not claim full live registry flow proof yet.

## Recommended next move
- inspect the current registry item form against the Playwright selectors
- then determine whether the failure is:
  - selector drift
  - import UX break
  - real runtime fetch failure
