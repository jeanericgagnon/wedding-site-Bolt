-- SMS credit lots with expiry (12 months)
alter table sms_credit_transactions
  add column if not exists expires_at timestamptz;

alter table sms_credit_transactions
  add column if not exists remaining_credits integer;

-- Backfill purchase rows that predate this migration
update sms_credit_transactions
set remaining_credits = coalesce(remaining_credits, greatest(credits_delta, 0))
where reason = 'purchase';

update sms_credit_transactions
set expires_at = coalesce(expires_at, created_at + interval '12 months')
where reason = 'purchase';

create index if not exists sms_credit_transactions_expiry_idx
  on sms_credit_transactions(wedding_site_id, expires_at)
  where reason = 'purchase';