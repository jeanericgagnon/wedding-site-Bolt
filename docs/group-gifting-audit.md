# Group gifting audit

Date: 2026-04-13

## Current registry reality
The current registry system already supports:
- quantity-based purchases for product gifts
- partial progress states (`available` / `partial` / `purchased`)
- cash fund progress via `fund_goal_amount` and `fund_received_amount`
- public purchase increment RPC

## What this means
There is already a **proto-group-gifting shape** in the system.

### Product side
For product gifts with `quantity_needed > 1`, multiple guests can contribute toward completion indirectly through purchase increments.
That is not framed as "group gifting," but functionally it is close.

### Fund side
Cash/honeymoon funds already behave like group contribution buckets.
That is also close to group gifting, especially for experience-style gifts.

## What is still missing for true group gifting
- explicit guest-facing group gift language
- contributor list / names for a shared gift
- contribution history per item/fund
- dedicated UI saying "X of Y contributed" instead of only quantity/progress

## Honest conclusion
Group gifting is **not fully missing**.
The system already has underlying mechanics that are adjacent to it.
What is missing is the **product framing + contributor visibility layer**.

## Best next move
Do not build a giant new backend system first.
Instead:
1. treat cash funds + partial quantity purchases as group-gift-capable
2. add clearer product framing
3. optionally add contributor-history UI later

## Next step
- 5.3.2 decide whether this is enough to mark group gifting partial/done enough, or whether contributor visibility must be added first
