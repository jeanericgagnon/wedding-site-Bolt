drop policy if exists "Authenticated can check own admin status" on public.admin_users;

create or replace function public.admin_access_check()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists(
    select 1
    from public.admin_users
    where user_id = auth.uid()
  );
$$;

revoke all on function public.admin_access_check() from public;
grant execute on function public.admin_access_check() to authenticated;
