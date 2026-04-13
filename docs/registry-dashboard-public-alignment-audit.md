# Registry Dashboard / Public Alignment Audit

Date: 2026-04-13

## Verification result
Dashboard and public registry behavior are **not fully aligned** right now.

## Grounded proof
### Dashboard side
Dashboard registry logic clearly uses:
- `purchase_status`
- `hide_when_purchased`
- quantity-based purchase tracking
- purchased / partial / available distinctions

### Public side
`publicFetchRegistryItems()` currently fetches all registry items for a site without filtering purchased or hidden items at the fetch layer.
The simple public `RegistrySection` is also mostly link-based and does not visibly expose the same purchased-state nuance.

## Conclusion
Current purchased-state behavior is richer and more explicit in the dashboard than in the public experience.
That means stronger “fully aligned guest-facing purchased-state behavior” claims are not safe yet.

## Safe product truth
Safe claim:
- DayOf tracks registry purchase state internally and supports hide-when-purchased settings, but public presentation behavior should be described carefully until runtime alignment is tightened.

## Recommended next moves
1. Decide whether public fetch should filter hidden purchased items
2. Decide whether public rendering should mark purchased state or simply hide configured items
3. Update docs only after runtime behavior is intentionally aligned
