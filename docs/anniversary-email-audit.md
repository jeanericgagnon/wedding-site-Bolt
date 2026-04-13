# Anniversary email flow audit

Date: 2026-04-13

## Current reality

### What exists
- anniversary vault model exists
- vault unlock logic exists in `src/pages/dashboard/Vault.tsx`
- archive-mode framing exists
- public vault contribution flow exists
- email service exists in `src/lib/emailService.ts`
- current email types include:
  - RSVP notification
  - RSVP confirmation
  - signup welcome
  - wedding invitation

### What does NOT exist yet
- no anniversary email type in `emailService.ts`
- no anniversary reminder/send flow wired to vault unlocks
- no background trigger / scheduler for anniversary send events
- current vault unlock behavior is local UI toast only

## Real conclusion
Anniversary emails are **not done**.
Right now the product has anniversary vaults, but not anniversary email delivery.
That means the memory layer exists, but the lifecycle loop is incomplete.

## Recommended v1 anniversary email behavior
Keep v1 narrow.

### Trigger moments
- upcoming unlock reminder
- unlock day email
- optional couple reminder to add a note before unlock

### Minimum recipients
- couple first
- maybe selected guest contributors later

### Minimum payload
- couple names
- vault label
- anniversary year
- unlock date
- vault URL
- short prompt / CTA

## Best implementation order
1. add anniversary email type to `emailService.ts`
2. define a simple send function
3. create a planner-side trigger surface first
4. add real scheduled automation later

## Safe conclusion
The next smart move is not full automation first.
The next smart move is:
- **8.2.2 add anniversary reminder/send model**
- make it manually triggerable / structurally ready
- then automate later
