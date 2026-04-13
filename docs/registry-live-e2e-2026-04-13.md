# Registry Live-ish E2E Run

Date: 2026-04-13
Target: `https://dayof.love`
Script: `scripts/playwright-registry-e2e.mjs`
Account: test account

## First run
Partial pass, then failure.

### What failed first
- import URL step timed out waiting for the `Item Name` field via label-based selector lookup

### Root cause
This appears to have been **script selector drift**, not a proven product/runtime import failure.
The registry form uses visible label text, but the script was relying on label helpers that did not match the rendered structure robustly enough.

## Fix
Updated the E2E script to read fields by visible label blocks in the current form structure.

## Re-run result
Full pass.

### Passed
- open login
- sign in
- open registry
- open add item form
- import URL
- close browser

### Import result
- item name: `Amazon Echo Dot (3rd Gen)`
- merchant: `Amazon`
- image URL present: `true`

## Safe conclusion
The current live-ish registry flow is now **proven at this smoke level** for:
- login
- registry entry
- URL import trigger
- autofill of item name / merchant / image presence

This does **not** yet prove deeper multi-merchant reliability, save behavior across merchants, or public purchased-state behavior.
