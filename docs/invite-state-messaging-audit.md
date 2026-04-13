# Invite state messaging audit

Date: 2026-04-13

## Current states handled
- valid pending invite
- invalid / missing token
- wrong-email mismatch
- accepted claim success
- expired invite (treated as invalid)
- revoked invite (treated as invalid)

## Current weakness
Different invalid states collapse into one generic message too often.
That is safe, but not ideal UX.

## Better state messaging target
### Wrong email
- explicitly say which email must be used

### Expired invite
- say invite expired and ask owner for a fresh invite

### Revoked invite
- say invite is no longer active

### Already used / accepted
- say invite has already been claimed

### Missing token
- say link is incomplete or malformed

## Honest conclusion
This is worth one small polish pass.
It improves trust and reduces confusion without needing new infrastructure.

## Next step
- B2.2 improve invite-state message specificity on accept page
