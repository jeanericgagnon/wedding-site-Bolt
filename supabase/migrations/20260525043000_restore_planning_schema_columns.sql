alter table public.planning_budget_items
  add column if not exists due_date date;

alter table public.planning_vendors
  add column if not exists phone text not null default '';
