-- Add source diagnostics fields to registry_items so admin UI can show adapter/source provenance
alter table public.registry_items
  add column if not exists metadata_source_method text,
  add column if not exists metadata_retailer text;

create index if not exists registry_items_metadata_source_method_idx
  on public.registry_items(metadata_source_method);

create index if not exists registry_items_metadata_retailer_idx
  on public.registry_items(metadata_retailer);
