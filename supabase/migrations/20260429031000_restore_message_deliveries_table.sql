-- Runtime parity repair for message delivery history.
create table if not exists message_deliveries (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references messages(id) on delete cascade,
  guest_id uuid references guests(id) on delete set null,
  recipient_email text not null,
  recipient_name text,
  status text not null default 'pending',
  provider_message_id text,
  error_message text,
  attempted_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz default now()
);

alter table message_deliveries enable row level security;

drop policy if exists "Couples can view deliveries for their messages" on message_deliveries;
create policy "Couples can view deliveries for their messages"
  on message_deliveries for select
  to authenticated
  using (
    exists (
      select 1
        from messages
        join wedding_sites on messages.wedding_site_id = wedding_sites.id
       where messages.id = message_deliveries.message_id
         and wedding_sites.user_id = auth.uid()
    )
  );

create index if not exists idx_message_deliveries_message_id on message_deliveries(message_id);
create index if not exists idx_message_deliveries_status on message_deliveries(status);
create index if not exists idx_message_deliveries_attempted_at on message_deliveries(attempted_at desc);

grant select on message_deliveries to authenticated;

