# Vault Google Drive Ops Runbook

## Purpose
Operate Vault with Google Drive storage safely, with lock enforcement and predictable recovery.

## Current System
- Provider toggle in Vault dashboard: Supabase / Google Drive
- OAuth connect flow:
  - `google-drive-auth-start`
  - `google-drive-auth-callback`
- Health diagnostics:
  - `google-drive-health`
- Upload path:
  - `vault-upload-google-drive`
- Locked-link resolver:
  - `vault-resolve-entry-link`

## Required Supabase Function Secrets
- `GOOGLE_DRIVE_CLIENT_ID`
- `GOOGLE_DRIVE_CLIENT_SECRET`
- `GOOGLE_DRIVE_REDIRECT_URI`

## Google OAuth App Setup
### Authorized JavaScript origins
- `https://dayof.love`

### Authorized redirect URIs
- `https://dayof.love/dashboard/vault`

> Origins and Redirect URIs are different fields. Paths are required only in redirect URIs.

## Security Notes
- If a client secret is exposed, rotate immediately.
- Treat `vault_google_drive_refresh_token` as sensitive.
- Keep Drive files private; resolve links only after unlock checks.

## Expected Happy Path
1. Open dashboard Vault
2. Click **Connect Drive**
3. Complete Google consent
4. Return to Vault dashboard
5. Health check passes
6. Switch provider to Google Drive
7. Submit contribution
8. File lands under:
   - `DayOf Vault - {siteSlug}/{year}-year`

## Lock Enforcement (Current)
- Entry-level lock via `unlock_at` (or computed fallback)
- Content/media hidden before unlock
- Attachment access requires server resolver
- Public bucket read policy removed for vault attachments

## Common Failure Modes
1. **Redirect mismatch**
   - OAuth error after connect
   - Fix redirect URI in Google + secret value
2. **Token refresh failure**
   - `needsReconnect=true` in health
   - Reconnect Drive
3. **Drive not connected for site**
   - contribution blocked with clear message
4. **Missing env vars**
   - function returns configuration error

## Troubleshooting Checklist
- Verify secrets exist in Supabase functions env
- Verify Google OAuth client redirect URI exact match
- Check Vault provider card health message
- Use **Check Health** button after connect
- Reconnect if refresh token missing/expired

## Deploy / Update Checklist
When function logic changes, deploy impacted functions:
- `supabase functions deploy google-drive-auth-start --project-ref <ref>`
- `supabase functions deploy google-drive-auth-callback --project-ref <ref>`
- `supabase functions deploy google-drive-health --project-ref <ref>`
- `supabase functions deploy vault-upload-google-drive --project-ref <ref>`
- `supabase functions deploy vault-resolve-entry-link --project-ref <ref>`

## Operational Guardrails
- Do not switch provider to Drive unless health passes
- Keep lock behavior tested when changing attachment logic
- Validate one live contribution after any OAuth/Drive migration
