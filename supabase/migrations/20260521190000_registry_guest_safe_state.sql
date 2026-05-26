-- Registry import safety state. Keeps guest-facing display truth separate from parser diagnostics.

alter table public.registry_items
  add column if not exists display_mode text not null default 'product_card',
  add column if not exists guest_safe boolean not null default true,
  add column if not exists source_status text not null default 'not_imported',
  add column if not exists review_status text not null default 'clean',
  add column if not exists confidence_overall numeric,
  add column if not exists confidence_title numeric,
  add column if not exists confidence_price numeric,
  add column if not exists confidence_image numeric,
  add column if not exists confidence_availability numeric,
  add column if not exists import_reason text,
  add column if not exists import_source_method text,
  add column if not exists parser_version text,
  add column if not exists last_imported_at timestamptz;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'registry_items_display_mode_check') then
    alter table public.registry_items
      add constraint registry_items_display_mode_check
      check (display_mode in ('product_card', 'link_card', 'cash_fund', 'manual_card', 'review_only', 'hidden'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'registry_items_source_status_check') then
    alter table public.registry_items
      add constraint registry_items_source_status_check
      check (source_status in ('clean', 'partial', 'blocked', 'timeout', 'invalid_url', 'parse_failed', 'manual', 'not_imported'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'registry_items_review_status_check') then
    alter table public.registry_items
      add constraint registry_items_review_status_check
      check (review_status in ('clean', 'needs_review', 'missing_price', 'missing_image', 'weak_title', 'blocked_source', 'duplicate_candidate', 'manual_override'));
  end if;
end $$;

update public.registry_items
set
  display_mode = case
    when product_metadata->>'registryDisplayMode' in ('product_card', 'link_card', 'cash_fund', 'manual_card', 'review_only', 'hidden')
      then product_metadata->>'registryDisplayMode'
    when item_type = 'cash_fund' then 'cash_fund'
    when coalesce(source_type, '') = 'manual' then 'manual_card'
    else display_mode
  end,
  guest_safe = case
    when product_metadata ? 'registryGuestSafe' then coalesce((product_metadata->>'registryGuestSafe')::boolean, true)
    else guest_safe
  end,
  source_status = case
    when product_metadata->>'registrySourceStatus' in ('clean', 'partial', 'blocked', 'timeout', 'invalid_url', 'parse_failed', 'manual', 'not_imported')
      then product_metadata->>'registrySourceStatus'
    when metadata_fetch_status = 'success' then 'clean'
    when metadata_fetch_status = 'blocked' then 'blocked'
    when metadata_fetch_status = 'timeout' then 'timeout'
    when metadata_fetch_status in ('parse_failure', 'error', 'unsupported') then 'parse_failed'
    when coalesce(source_type, '') = 'manual' then 'manual'
    else source_status
  end,
  review_status = case
    when product_metadata->>'registryReviewStatus' in ('clean', 'needs_review', 'missing_price', 'missing_image', 'weak_title', 'blocked_source', 'duplicate_candidate', 'manual_override')
      then product_metadata->>'registryReviewStatus'
    else review_status
  end,
  import_reason = coalesce(import_reason, nullif(product_metadata->>'registryImportReason', '')),
  import_source_method = coalesce(import_source_method, nullif(product_metadata->>'registryImportSourceMethod', ''), metadata_source_method),
  confidence_overall = coalesce(confidence_overall, metadata_confidence_score)
where true;

update public.registry_items
set guest_safe = display_mode in ('product_card', 'link_card', 'cash_fund', 'manual_card')
where not (product_metadata ? 'registryGuestSafe');

create or replace function public.registry_item_guest_safe_state_sync()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.display_mode := case
    when new.product_metadata->>'registryDisplayMode' in ('product_card', 'link_card', 'cash_fund', 'manual_card', 'review_only', 'hidden')
      then new.product_metadata->>'registryDisplayMode'
    when new.item_type = 'cash_fund' then 'cash_fund'
    when coalesce(new.source_type, '') = 'manual' then 'manual_card'
    else coalesce(new.display_mode, 'product_card')
  end;

  new.source_status := case
    when new.product_metadata->>'registrySourceStatus' in ('clean', 'partial', 'blocked', 'timeout', 'invalid_url', 'parse_failed', 'manual', 'not_imported')
      then new.product_metadata->>'registrySourceStatus'
    when new.metadata_fetch_status = 'success' then 'clean'
    when new.metadata_fetch_status = 'blocked' then 'blocked'
    when new.metadata_fetch_status = 'timeout' then 'timeout'
    when new.metadata_fetch_status in ('parse_failure', 'error', 'unsupported') then 'parse_failed'
    when coalesce(new.source_type, '') = 'manual' then 'manual'
    else coalesce(new.source_status, 'not_imported')
  end;

  new.review_status := case
    when new.product_metadata->>'registryReviewStatus' in ('clean', 'needs_review', 'missing_price', 'missing_image', 'weak_title', 'blocked_source', 'duplicate_candidate', 'manual_override')
      then new.product_metadata->>'registryReviewStatus'
    else coalesce(new.review_status, 'clean')
  end;

  new.guest_safe := case
    when new.product_metadata ? 'registryGuestSafe' then coalesce((new.product_metadata->>'registryGuestSafe')::boolean, new.display_mode in ('product_card', 'link_card', 'cash_fund', 'manual_card'))
    else new.display_mode in ('product_card', 'link_card', 'cash_fund', 'manual_card')
  end;

  new.import_reason := case
    when new.product_metadata ? 'registryImportReason' then nullif(new.product_metadata->>'registryImportReason', '')
    else new.import_reason
  end;
  new.import_source_method := coalesce(nullif(new.product_metadata->>'registryImportSourceMethod', ''), new.import_source_method, new.metadata_source_method);
  new.confidence_overall := coalesce(new.metadata_confidence_score, new.confidence_overall);

  return new;
end;
$$;

drop trigger if exists registry_item_guest_safe_state_sync_trigger on public.registry_items;
create trigger registry_item_guest_safe_state_sync_trigger
before insert or update on public.registry_items
for each row
execute function public.registry_item_guest_safe_state_sync();

create index if not exists registry_items_guest_safe_idx
  on public.registry_items(wedding_site_id, guest_safe, display_mode);

create table if not exists public.registry_item_sources (
  id uuid primary key default gen_random_uuid(),
  registry_item_id uuid not null references public.registry_items(id) on delete cascade,
  original_url text not null,
  normalized_url text,
  final_url text,
  canonical_url text,
  domain text,
  store_name text,
  raw_title text,
  raw_description text,
  raw_image_url text,
  raw_price text,
  extracted_candidates jsonb not null default '{}'::jsonb,
  blocked_detected boolean not null default false,
  blocked_reason text,
  fetch_status integer,
  fetch_error text,
  parser_name text,
  parser_version text not null default 'registry-preview-v1',
  created_at timestamptz not null default now()
);

create index if not exists registry_item_sources_item_idx
  on public.registry_item_sources(registry_item_id, created_at desc);

create table if not exists public.registry_import_batches (
  id uuid primary key default gen_random_uuid(),
  wedding_site_id uuid not null references public.wedding_sites(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  total_count integer not null default 0,
  clean_count integer not null default 0,
  link_only_count integer not null default 0,
  needs_review_count integer not null default 0,
  duplicate_count integer not null default 0,
  failed_count integer not null default 0,
  status text not null default 'processing' check (status in ('processing', 'complete', 'failed')),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists registry_import_batches_site_idx
  on public.registry_import_batches(wedding_site_id, created_at desc);

create table if not exists public.registry_import_batch_items (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.registry_import_batches(id) on delete cascade,
  original_url text not null,
  normalized_url text,
  registry_item_id uuid references public.registry_items(id) on delete set null,
  result text not null check (result in ('clean', 'link_only', 'needs_review', 'duplicate', 'failed')),
  store_name text,
  display_title text,
  reason text,
  created_at timestamptz not null default now()
);

create index if not exists registry_import_batch_items_batch_idx
  on public.registry_import_batch_items(batch_id, created_at);

alter table public.registry_item_sources enable row level security;
alter table public.registry_import_batches enable row level security;
alter table public.registry_import_batch_items enable row level security;

drop policy if exists "Registry item sources read" on public.registry_item_sources;
create policy "Registry item sources read"
  on public.registry_item_sources for select
  to authenticated
  using (
    exists (
      select 1
      from public.registry_items ri
      where ri.id = registry_item_sources.registry_item_id
        and (
          public.dayof_has_site_role(ri.wedding_site_id, array['owner','planner','coordinator','viewer'])
          or public.dayof_has_site_permission(ri.wedding_site_id, 'registry')
        )
    )
  );

drop policy if exists "Registry item sources write" on public.registry_item_sources;
create policy "Registry item sources write"
  on public.registry_item_sources for all
  to authenticated
  using (
    exists (
      select 1
      from public.registry_items ri
      where ri.id = registry_item_sources.registry_item_id
        and public.dayof_has_site_permission(ri.wedding_site_id, 'registry')
    )
  )
  with check (
    exists (
      select 1
      from public.registry_items ri
      where ri.id = registry_item_sources.registry_item_id
        and public.dayof_has_site_permission(ri.wedding_site_id, 'registry')
    )
  );

drop policy if exists "Registry import batches read" on public.registry_import_batches;
create policy "Registry import batches read"
  on public.registry_import_batches for select
  to authenticated
  using (
    public.dayof_has_site_role(wedding_site_id, array['owner','planner','coordinator','viewer'])
    or public.dayof_has_site_permission(wedding_site_id, 'registry')
  );

drop policy if exists "Registry import batches write" on public.registry_import_batches;
create policy "Registry import batches write"
  on public.registry_import_batches for all
  to authenticated
  using (public.dayof_has_site_permission(wedding_site_id, 'registry'))
  with check (public.dayof_has_site_permission(wedding_site_id, 'registry'));

drop policy if exists "Registry import batch items read" on public.registry_import_batch_items;
create policy "Registry import batch items read"
  on public.registry_import_batch_items for select
  to authenticated
  using (
    exists (
      select 1
      from public.registry_import_batches rib
      where rib.id = registry_import_batch_items.batch_id
        and (
          public.dayof_has_site_role(rib.wedding_site_id, array['owner','planner','coordinator','viewer'])
          or public.dayof_has_site_permission(rib.wedding_site_id, 'registry')
        )
    )
  );

drop policy if exists "Registry import batch items write" on public.registry_import_batch_items;
create policy "Registry import batch items write"
  on public.registry_import_batch_items for all
  to authenticated
  using (
    exists (
      select 1
      from public.registry_import_batches rib
      where rib.id = registry_import_batch_items.batch_id
        and public.dayof_has_site_permission(rib.wedding_site_id, 'registry')
    )
  )
  with check (
    exists (
      select 1
      from public.registry_import_batches rib
      where rib.id = registry_import_batch_items.batch_id
        and public.dayof_has_site_permission(rib.wedding_site_id, 'registry')
    )
  );
