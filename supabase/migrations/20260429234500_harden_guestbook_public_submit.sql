alter table public.guestbook_entries
  add column if not exists requester_ip text,
  add column if not exists user_agent text;

create index if not exists idx_guestbook_entries_site_ip_created
  on public.guestbook_entries(wedding_site_id, requester_ip, created_at desc);

create index if not exists idx_guestbook_entries_site_email_created
  on public.guestbook_entries(wedding_site_id, guest_email, created_at desc);
