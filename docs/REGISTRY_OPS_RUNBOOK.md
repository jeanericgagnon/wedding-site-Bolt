# Registry Ops Runbook

## Live-ish E2E smoke
Use this to verify the current registry import path against production-like runtime behavior.

```bash
node scripts/playwright-registry-e2e.mjs https://dayof.love test@gmail.com 12345678
```

## What this smoke currently proves
- login works
- dashboard registry route loads
- add item form opens
- URL import can autofill item name / merchant / image presence for the test URL

## What it does not prove yet
- multi-merchant reliability across all supported stores
- item save/write correctness across merchants
- public purchased-state alignment
- repair/re-import behavior for broken cards

## Notes
- Current script selectors were updated on 2026-04-13 to match the visible label structure of the registry form.
- If this test fails again, first distinguish selector drift from a real runtime import break.
