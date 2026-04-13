# Collaborator invite table + accept flow contract

Date: 2026-04-13

## Table: wedding_site_collaborator_invites

### Fields
- `id` uuid primary key
- `wedding_site_id` uuid not null
- `invite_email` text not null
- `invite_name` text null
- `role` text not null
- `status` text not null default `pending`
- `invite_token` text not null unique
- `invited_by` uuid not null
- `accepted_user_id` uuid null
- `invited_at` timestamptz not null default now()
- `accepted_at` timestamptz null
- `expires_at` timestamptz null
- `revoked_at` timestamptz null
- `updated_at` timestamptz not null default now()

## Status values
- `pending`
- `accepted`
- `revoked`
- `expired`

## Accept flow contract

### Owner side
Create invite:
- validates owner access
- creates invite row
- returns invite link/token

### Recipient side
Claim invite:
- requires authenticated user
- finds pending invite by token
- verifies token is not expired/revoked/used
- verifies email match if we want strict claim safety
- writes active collaborator row
- marks invite accepted

## Safety rules
- only owner can create/revoke invites
- accepted invite cannot be reused
- revoked invite cannot be claimed
- expired invite cannot be claimed
- role must be one of canonical collaborator roles

## Recommended API shape
### create_collaborator_invite
Input:
- weddingSiteId
- inviteEmail
- inviteName
- role

Output:
- inviteId
- inviteToken
- inviteUrl
- status

### accept_collaborator_invite
Input:
- inviteToken

Output:
- weddingSiteId
- collaboratorRole
- status=accepted

## Next step
- 10.3.5 build migration stub for invite table
