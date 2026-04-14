alter table public.wedding_sites
  add column if not exists onboarding_answers jsonb not null default '{}'::jsonb;

comment on column public.wedding_sites.onboarding_answers is
  'Canonical onboarding / concierge wedding profile snapshot used to generate the initial site draft.';
