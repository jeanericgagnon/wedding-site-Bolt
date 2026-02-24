-- SMS credit wallet + ledger
alter table wedding_sites
  add column if not exists sms_credits_balance integer not null default 0;

create table if not exists sms_credit_transactions (
  id uuid primary key default gen_random_uuid(),
  wedding_site_id uuid not null references wedding_sites(id) on delete cascade,
  stripe_checkout_session_id text,
  credits_delta integer not null,
  amount_cents integer,
  reason text not null default 'purchase',
  metadata jsonb,
  created_at timestamptz not null default now()
);

create unique index if not exists sms_credit_transactions_session_unique
  on sms_credit_transactions(stripe_checkout_session_id)
  where stripe_checkout_session_id is not null;

create index if not exists sms_credit_transactions_site_created_idx
  on sms_credit_transactions(wedding_site_id, created_at desc);

alter table sms_credit_transactions enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='sms_credit_transactions' and policyname='Users can view own site sms transactions'
  ) then
    create policy "Users can view own site sms transactions"
      on sms_credit_transactions
      for select
      to authenticated
      using (
        exists (
          select 1 from wedding_sites ws
          where ws.id = sms_credit_transactions.wedding_site_id
            and ws.user_id = auth.uid()
        )
      );
  end if;
end $$;