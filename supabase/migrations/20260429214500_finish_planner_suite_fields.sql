-- Finish Planner v1 fields that turn existing modules into a fuller PM-style suite.
alter table public.planning_tasks
  add column if not exists category text;

alter table public.planning_vendors
  add column if not exists document_url text,
  add column if not exists document_label text;

create index if not exists planning_tasks_category_idx
  on public.planning_tasks(wedding_site_id, category);
