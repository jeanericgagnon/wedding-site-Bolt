-- Route public vendor inquiries through the rate-limited Edge Function.
-- The service role used by the function bypasses RLS, so direct public inserts
-- no longer need to be allowed from the browser.

drop policy if exists "vendor inquiries public create" on public.vendor_profile_inquiries;
drop policy if exists "vendor inquiries auth read" on public.vendor_profile_inquiries;

drop policy if exists "vendor inquiries creator read" on public.vendor_profile_inquiries;
create policy "vendor inquiries creator read"
on public.vendor_profile_inquiries
for select
using (
  exists (
    select 1
    from public.vendor_profiles vp
    where vp.id = vendor_profile_inquiries.vendor_profile_id
      and vp.created_by = auth.uid()
  )
);
