# Collaborator persistence flow

Date: 2026-04-13

## Goal
Replace local-only planner invite/setup behavior with a real DB-backed collaborator invite and activation flow.

## Desired flow

### 1. Owner creates invite
Owner enters:
- name
- email
- role

System creates a collaborator invite record tied to:
- wedding site id
- invite email
- target role
- invited by
- status = pending
- token / claim path

### 2. Invite recipient accepts
Recipient opens invite link, authenticates or creates account, then claims invite.

### 3. Activation
On successful claim:
- collaborator row becomes active
- collaborator links to real user id
- role is enforced by backend RBAC

### 4. Ongoing management
Owner can:
- view collaborators
- change role
- revoke access
- resend invite

## Minimum data model additions
Need one of:
- collaborator_invites table
or
- extend existing collaborator model with pending invite fields

Recommended cleaner choice:
- separate `wedding_site_collaborator_invites`

## Suggested invite table fields
- id
- wedding_site_id
- invite_email
- invite_name
- role
- status (pending / accepted / revoked / expired)
- invite_token
- invited_by
- invited_at
- accepted_at
- accepted_user_id
- expires_at

## Why separate invite table is better
- cleaner than overloading active collaborator rows
- easier resend/revoke/expiry tracking
- clearer auditability

## Safe rollout order
1. add invite table
2. build owner create/list UI
3. build invite accept flow
4. create active collaborator row on accept
5. retire local-only invite reliance

## Next step
- 10.3.4 define invite table + accept flow contract
