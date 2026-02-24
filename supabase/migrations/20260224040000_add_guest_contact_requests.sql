-- Guest contact self-service request links
create table if not exists guest_contact_requests (
  id uuid primary key default gen_random_uuid(),
  wedding_site_id uuid not null references wedding_sites(id) on delete cascade,
  guest_id uuid not null references guests(id) on delete cascade,
  token text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index if not exists guest_contact_requests_guest_idx on guest_contact_requests(guest_id, created_at desc);
create index if not exists guest_contact_requests_token_idx on guest_contact_requests(token);

alter table guest_contact_requests enable row level security;

-- Authenticated users can manage requests for their own site.
do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='guest_contact_requests' and policyname='Users manage own guest contact requests'
  ) then
    create policy "Users manage own guest contact requests"
      on guest_contact_requests
      for all
      to authenticated
      using (
        exists (
          select 1 from wedding_sites ws where ws.id = guest_contact_requests.wedding_site_id and ws.user_id = auth.uid()
        )
      )
      with check (
        exists (
          select 1 from wedding_sites ws where ws.id = guest_contact_requests.wedding_site_id and ws.user_id = auth.uid()
        )
      );
  end if;
end $$;