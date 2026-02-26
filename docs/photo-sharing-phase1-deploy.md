# Photo Sharing Phase 1 Deploy Checklist

## 1) Database migration

```bash
supabase db push
```

Confirm tables:
- `photo_albums`
- `photo_uploads`

## 2) Edge function deploy

```bash
supabase functions deploy photo-album-create
supabase functions deploy photo-upload
supabase functions deploy photo-album-manage
```

## 3) Required env vars (Supabase project)

- `GOOGLE_DRIVE_CLIENT_ID`
- `GOOGLE_DRIVE_CLIENT_SECRET`
- `APP_PUBLIC_URL` (e.g. `https://dayof.love`)

Also ensure existing vault Drive env remains valid.

## 4) Frontend deploy

Deploy app normally (Vercel pipeline).

## 5) Smoke test

1. In dashboard, open **Photo Sharing**.
2. Create album.
3. Copy upload URL and open in incognito.
4. Upload 1 image.
5. Verify file appears in target Drive folder.
6. Pause album and verify upload fails.
7. Regenerate link and verify old token fails/new token works.
