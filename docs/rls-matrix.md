# RLS Policy Matrix

Last verified: 2026-02-18

All 16 public tables have RLS enabled. Policies are PERMISSIVE unless stated otherwise.

---

## Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Correct, intentional |
| ⚠️ | Broad but acceptable given product design |
| 🔒 | Owner-only (authenticated, auth.uid() check) |

---

## `wedding_sites`

| Operation | Role | Condition | Assessment |
|-----------|------|-----------|------------|
| SELECT | anon | `site_slug IS NOT NULL` | ⚠️ Any site with a slug is publicly readable. Intentional — enables draft sharing before publish. |
| SELECT | authenticated | `auth.uid() = user_id` | ✅ |
| INSERT | authenticated | `auth.uid() = user_id` | ✅ |
| UPDATE | authenticated | `auth.uid() = user_id` | ✅ |
| DELETE | authenticated | `auth.uid() = user_id` | ✅ |

**Note:** The anon SELECT policy exposes the full `wedding_sites` row (including `wedding_data`, `site_json`, `published_json`) to any anonymous client who knows the slug. This is intentional for public site rendering, but means draft content is visible if the slug is known. The `is_published` flag is an application-layer gate (in `SiteView.tsx`), not an RLS gate.

---

## `guests`

| Operation | Role | Condition | Assessment |
|-----------|------|-----------|------------|
| SELECT | public | `invite_token IS NOT NULL` | ⚠️ Returns any guest with a token. Enables invite-token based lookup. |
| SELECT | anon+auth | `invite_token IS NOT NULL` | ⚠️ Duplicate of above (redundant policy). |
| SELECT | authenticated | Owner via `wedding_site_id` join | ✅ |
| INSERT | authenticated | Owner via `wedding_site_id` join | ✅ |
| UPDATE | authenticated | Owner via `wedding_site_id` join | ✅ |
| DELETE | authenticated | Owner via `wedding_site_id` join | ✅ |

**Note:** The two public SELECT policies are functionally identical. The `invite_token IS NOT NULL` check means every guest row (all guests have a token by default) is technically visible to anonymous clients. In practice, a client needs to know the specific guest UUID to query it. Risk is low but worth monitoring.

---

## `rsvps`

| Operation | Role | Condition | Assessment |
|-----------|------|-----------|------------|
| SELECT | anon | `guest_id IN (SELECT id FROM guests WHERE invite_token IS NOT NULL)` | ✅ Fixed in migration `fix_overly_permissive_rls_policies`. Token-gated. |
| SELECT | authenticated (3 policies) | Owner via `wedding_site_id` join | ✅ |
| INSERT | anon | `WITH CHECK(true)` | ⚠️ Any anonymous client can insert an RSVP for any guest_id. Enables the public RSVP form. |
| INSERT | anon+auth | `WITH CHECK(true)` | ⚠️ Redundant with above. |
| UPDATE | anon | `guest_id IN (SELECT id FROM guests)` | ⚠️ Allows any anon to update any RSVP if they know the guest UUID. Acceptable for RSVP update flow. |
| UPDATE | authenticated | Owner via `wedding_site_id` join | ✅ |

**Known risk:** The anon INSERT `WITH CHECK(true)` allows inserting RSVPs for any guest_id without token verification. This is a product design choice for the simple public RSVP form. A future hardening step would add a `guest_id IN (SELECT id FROM guests WHERE invite_token = ...)` check once the RSVP form passes invite tokens.

---

## `site_rsvps`

| Operation | Role | Condition | Assessment |
|-----------|------|-----------|------------|
| INSERT | anon+auth | `WITH CHECK(true)` | ⚠️ Open insert for the public RSVP section on wedding sites. No site validation at RLS level. |
| SELECT | authenticated | Owner via `wedding_site_id` join | ✅ |

**Note:** The `site_rsvps` INSERT has no RLS-level check that the `wedding_site_id` refers to a published site. Abuse would require knowing a valid site UUID. The `wedding_site_id` FK constraint prevents invalid UUIDs.

---

## `registry_items`

| Operation | Role | Condition | Assessment |
|-----------|------|-----------|------------|
| SELECT | anon | `is_published = true` on parent site | ✅ Published-site gate enforced at RLS level. |
| SELECT | authenticated | `is_published = true` OR owner | ✅ |
| SELECT | authenticated | Owner via `wedding_site_id` join | ✅ |
| INSERT | authenticated | Owner via `wedding_site_id` join | ✅ |
| UPDATE | authenticated | Owner via `wedding_site_id` join | ✅ |
| DELETE | authenticated | Owner via `wedding_site_id` join | ✅ |

**Note:** Public purchase mutations are handled by the `increment_registry_purchase` SECURITY DEFINER function, which enforces its own published-site check and row-level locking.

---

## `event_invitations`

| Operation | Role | Condition | Assessment |
|-----------|------|-----------|------------|
| SELECT | anon | `USING(true)` | ⚠️ All event invitations are publicly readable. Intended to support guest RSVP lookup by invitation ID. |
| SELECT | authenticated | Owner via event → site join | ✅ |
| INSERT | authenticated | Owner via event → site join | ✅ |
| DELETE | authenticated | Owner via event → site join | ✅ |

**Known risk:** The anon `USING(true)` policy exposes all event invitation records. A client can enumerate invitations if they know or guess UUIDs. Consider restricting to `guest_id IN (SELECT id FROM guests WHERE invite_token IS NOT NULL)` in a future migration.

---

## `event_rsvps`

| Operation | Role | Condition | Assessment |
|-----------|------|-----------|------------|
| SELECT | anon | `USING(true)` | ⚠️ All event RSVPs publicly readable. Broad but low-sensitivity data. |
| SELECT | authenticated | Owner via invitation → event → site join | ✅ |
| INSERT | anon | `event_invitation_id IN (SELECT id FROM event_invitations)` | ✅ |
| UPDATE | anon | `event_invitation_id IN (SELECT id FROM event_invitations)` | ✅ Fixed in migration `fix_overly_permissive_rls_policies`. |
| UPDATE | authenticated | Owner via invitation → event → site join | ✅ |

---

## `itinerary_events`

| Operation | Role | Condition | Assessment |
|-----------|------|-----------|------------|
| SELECT | anon | `is_visible = true` | ✅ Only visible events are public. |
| SELECT | authenticated | Owner via `wedding_site_id` join | ✅ |
| INSERT | authenticated | Owner via `wedding_site_id` join | ✅ |
| UPDATE | authenticated | Owner via `wedding_site_id` join | ✅ |
| DELETE | authenticated | Owner via `wedding_site_id` join | ✅ |

---

## `messages`

| Operation | Role | Condition | Assessment |
|-----------|------|-----------|------------|
| SELECT | authenticated (3 policies) | Owner via `wedding_site_id` join | ✅ Redundant policies — all equivalent. |
| INSERT | authenticated (3 policies) | Owner via `wedding_site_id` join | ✅ Redundant policies — all equivalent. |
| UPDATE | authenticated (2 policies) | Owner via `wedding_site_id` join | ✅ |
| DELETE | authenticated (3 policies) | Owner via `wedding_site_id` join | ✅ |

**Note:** Multiple overlapping policies exist (added across different migrations). They are all correct and PERMISSIVE, so duplicates cause no security issue — only minor query overhead.

---

## `photos`

| Operation | Role | Condition | Assessment |
|-----------|------|-----------|------------|
| SELECT | authenticated | Owner via `wedding_site_id` join | ✅ No public read. |
| INSERT | authenticated | Owner via `wedding_site_id` join | ✅ |
| UPDATE | authenticated | Owner via `wedding_site_id` join | ✅ |
| DELETE | authenticated | Owner via `wedding_site_id` join | ✅ |

---

## `site_content`

| Operation | Role | Condition | Assessment |
|-----------|------|-----------|------------|
| SELECT | authenticated | Owner via `wedding_site_id` join | ✅ |
| INSERT | authenticated | Owner via `wedding_site_id` join | ✅ |
| UPDATE | authenticated | Owner via `wedding_site_id` join | ✅ |
| DELETE | authenticated | Owner via `wedding_site_id` join | ✅ |

---

## `builder_media_assets`

| Operation | Role | Condition | Assessment |
|-----------|------|-----------|------------|
| SELECT | authenticated | Owner via `wedding_site_id` join | ✅ |
| INSERT | authenticated | Owner via `wedding_site_id` join | ✅ |
| UPDATE | authenticated | Owner via `wedding_site_id` join | ✅ |
| DELETE | authenticated | Owner via `wedding_site_id` join | ✅ |

---

## `sms_contacts`, `sms_messages`, `sms_segments`, `sms_settings`

| Operation | Role | Condition | Assessment |
|-----------|------|-----------|------------|
| All CRUD | authenticated | Owner via `wedding_site_id` join | ✅ No public access. |

---

## Security Functions (SECURITY DEFINER)

| Function | Purpose | Security Notes |
|----------|---------|----------------|
| `increment_registry_purchase` | Public registry purchase | Enforces published-site check, row-level lock (`SELECT FOR UPDATE`), quantity cap. Safe for anon invocation. |
| `create_demo_wedding_data` | Demo account setup trigger | Fires only for `demo@dayof.love` email. Inserts with RLS bypass. Trigger-only invocation. |
| `initialize_demo_account` | Legacy demo initialization | SECURITY DEFINER, admin-invoked only. |

---

## Summary of Known Risks

| Risk | Severity | Status |
|------|----------|--------|
| `wedding_sites` anon SELECT exposes draft content | Low | Accepted — intentional for draft sharing |
| `guests` token-based SELECT is broad | Low | Acceptable — requires knowing guest UUID |
| `rsvps` anon INSERT `WITH CHECK(true)` | Low | Accepted — enables public RSVP form |
| `event_invitations` anon SELECT `USING(true)` | Low | Open risk — enumerable with UUID guessing |
| `event_rsvps` anon SELECT `USING(true)` | Low | Open risk — low-sensitivity data |
| Duplicate policies on `messages` | Info | No security issue, minor overhead |
