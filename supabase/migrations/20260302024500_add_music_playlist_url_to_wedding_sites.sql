-- Song request system v1: per-site collaborative playlist link
alter table if exists wedding_sites
  add column if not exists music_playlist_url text;
