# Collaborator invite safety audit

Date: 2026-04-13

## Current strengths
- invite tokens are DB-backed
- pending invites can be revoked
- invite status is checked before claim
- accepted invites are marked accepted and redirect cleanly

## Current trust gaps

### 1. No strict email-match enforcement
Current claim flow does not clearly verify that the signed-in user email matches `invite_email`.
That is the biggest remaining trust gap.

### 2. No expiry enforcement in claim UI
Expiry fields exist in contract/stub world, but claim path does not strongly enforce or surface expiry yet.

### 3. No resend flow
Owner can copy link, but there is no explicit resend action/workflow.

### 4. Limited runtime verification
Current flow is structurally real, but not yet battle-tested with multiple real accounts.

## Best next fixes
1. enforce signed-in email match to invite email
2. surface expired/revoked/used states more clearly
3. add resend action for pending invites

## Honest conclusion
The collaborator invite system is good enough for v1, but email-match enforcement is the one fix that matters most for trust.

## Next step
- P1.2 enforce invite-email match during claim
