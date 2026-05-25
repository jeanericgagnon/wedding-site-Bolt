import { expect, test } from '@playwright/test';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

test.skip(process.env.LIVE_PHOTO_UPLOAD_WRITE_READ !== '1', 'Set LIVE_PHOTO_UPLOAD_WRITE_READ=1 to create a production photo bucket, upload media, verify, and clean up rows.');

function envValue(key: string, fallback = '') {
  if (process.env[key]) return String(process.env[key]);
  const envPath = join(process.cwd(), '.env');
  if (!existsSync(envPath)) return fallback;
  const match = readFileSync(envPath, 'utf8')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
    .find((line) => line.startsWith(`${key}=`));
  if (!match) return fallback;
  return match.slice(key.length + 1).trim().replace(/^['"]|['"]$/g, '');
}

test('guest photo upload stores hosted media and owner reads it back', async ({ page }) => {
  test.setTimeout(240_000);
  const logStep = (label: string) => console.error(`[photo-upload ${new Date().toISOString()}] ${label}`);
  const email = process.env.V1_OWNER_EMAIL || 'test@gmail.com';
  const password = process.env.V1_OWNER_PASSWORD || '12345678';
  const supabaseUrl = envValue('VITE_SUPABASE_URL', 'https://atuzuobpprjstfmdnwso.supabase.co');
  const supabaseAnonKey = envValue('VITE_SUPABASE_ANON_KEY');
  const proofSiteSlug = process.env.V1_PROOF_SITE_SLUG || 'maya-and-leo';
  const cleanupOnlyRunId = process.env.LIVE_PHOTO_UPLOAD_CLEANUP_RUN_ID;
  const runId = cleanupOnlyRunId || process.env.LIVE_PHOTO_UPLOAD_RUN_ID || `${Date.now()}`;
  const bucketName = `Photo Upload QA ${runId}`;
  const guestName = `Photo Guest ${runId}`;
  const guestEmail = `dayof.photoqa.${runId}@example.com`;
  const note = `Photo upload QA note ${runId}`;
  const videoGuestName = `Photo Video Guest ${runId}`;
  const videoGuestEmail = `dayof.photoqa.video.${runId}@example.com`;
  const videoNote = `Photo upload QA video note ${runId}`;
  const artifactDir = join(process.cwd(), 'test-results', 'photo-upload-write-read');
  mkdirSync(artifactDir, { recursive: true });
  const imagePath = join(artifactDir, `photo-upload-qa-${runId}.png`);
  const videoPath = join(artifactDir, `photo-upload-qa-${runId}.mp4`);
  writeFileSync(imagePath, Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=',
    'base64',
  ));
  writeFileSync(videoPath, Buffer.from('dayof-live-video-qa'));

  let ownerAccessToken = '';

  const authHeaders = () => ({
    apikey: supabaseAnonKey,
    Authorization: `Bearer ${ownerAccessToken || supabaseAnonKey}`,
    'Content-Type': 'application/json',
  });

  const restUrl = (table: string, params: Record<string, string>) => {
    const search = new URLSearchParams(params);
    return `${supabaseUrl}/rest/v1/${table}?${search.toString()}`;
  };

  const restFetch = async (url: string, init: RequestInit = {}) => fetch(url, {
    ...init,
    headers: {
      ...authHeaders(),
      ...(init.headers || {}),
    },
    signal: AbortSignal.timeout(10_000),
  });

  const loginOwner = async () => {
    logStep('owner login start');
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.getByPlaceholder('your@email.com').fill(email);
    await page.getByPlaceholder('Enter your password').fill(password);
    await page.getByRole('button', { name: 'Sign In' }).click();
    await expect(page).toHaveURL(/\/dashboard/);
    ownerAccessToken = await page.evaluate(() => {
      for (const [key, value] of Object.entries(window.localStorage)) {
        if (!key.includes('auth-token')) continue;
        try {
          const parsed = JSON.parse(String(value)) as { access_token?: string; currentSession?: { access_token?: string } };
          const token = parsed.access_token || parsed.currentSession?.access_token || '';
          if (token) return token;
        } catch {
          // Keep scanning.
        }
      }
      return '';
    });
    expect(ownerAccessToken || supabaseAnonKey).toBeTruthy();
    logStep('owner login done');
  };

  const cleanupQaAlbums = async () => {
    const albumsResponse = await restFetch(restUrl('photo_albums', {
      select: 'id',
      name: `eq.${bucketName}`,
    }));
    expect(albumsResponse.ok).toBeTruthy();
    const albums = await albumsResponse.json() as Array<{ id: string }>;
    for (const album of albums) {
      await restFetch(restUrl('photo_uploads', { photo_album_id: `eq.${album.id}` }), { method: 'DELETE' });
      await restFetch(restUrl('photo_albums', { id: `eq.${album.id}` }), { method: 'DELETE' });
    }
    const remaining = await restFetch(restUrl('photo_albums', {
      select: 'id',
      name: `eq.${bucketName}`,
    }));
    expect(remaining.ok).toBeTruthy();
    expect(await remaining.json()).toHaveLength(0);
  };

  await loginOwner();
  logStep('cleanup existing albums start');
  await cleanupQaAlbums();
  logStep('cleanup existing albums done');
  if (cleanupOnlyRunId) return;

  const sitesResponse = await restFetch(restUrl('wedding_sites', {
    select: 'id',
    site_slug: `eq.${proofSiteSlug}`,
    limit: '1',
  }));
  expect(sitesResponse.ok).toBeTruthy();
  const [site] = await sitesResponse.json() as Array<{ id: string }>;
  expect(site?.id).toBeTruthy();

  try {
    logStep('create album start');
    const createResponse = await fetch(`${supabaseUrl}/functions/v1/photo-album-create`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        siteId: site.id,
        name: bucketName,
        opensAt: null,
        closesAt: null,
      }),
      signal: AbortSignal.timeout(20_000),
    });
    const createData = await createResponse.json().catch(() => ({}));
    expect(createResponse.ok, JSON.stringify(createData)).toBeTruthy();
    expect(createData.uploadUrl).toContain('/photos/upload?t=');
    logStep('create album done');

    logStep('guest image upload start');
    await page.goto(createData.uploadUrl as string, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Share your photos' })).toBeVisible();
    await page.getByLabel('Your name (optional)').fill(guestName);
    await page.getByLabel('Email (optional)').fill(guestEmail);
    await page.getByLabel('Note (optional)').fill(note);
    await page.getByLabel('Files').setInputFiles({
      name: `photo-upload-qa-${runId}.png`,
      mimeType: 'image/png',
      buffer: readFileSync(imagePath),
    });
    await expect(page.getByText('1 file(s) selected')).toBeVisible();
    await page.getByRole('button', { name: 'Upload files' }).click();
    await expect(page.getByText('Uploaded 1 file(s). Thank you!')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(`photo-upload-qa-${runId}.png`)).toBeVisible();
    logStep('guest image upload done');

    logStep('guest video upload start');
    await page.goto(createData.uploadUrl as string, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Share your photos' })).toBeVisible();
    await page.getByLabel('Your name (optional)').fill(videoGuestName);
    await page.getByLabel('Email (optional)').fill(videoGuestEmail);
    await page.getByLabel('Note (optional)').fill(videoNote);
    await page.getByLabel('Files').setInputFiles({
      name: `photo-upload-qa-${runId}.mp4`,
      mimeType: 'video/mp4',
      buffer: readFileSync(videoPath),
    });
    await expect(page.getByText('1 file(s) selected')).toBeVisible();
    await page.getByRole('button', { name: 'Upload files' }).click();
    await expect(page.getByText('Uploaded 1 file(s). Thank you!')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(`photo-upload-qa-${runId}.mp4`)).toBeVisible();
    logStep('guest video upload done');

    logStep('rest upload readback start');
    const uploadsResponse = await restFetch(restUrl('photo_uploads', {
      select: 'id,photo_album_id,wedding_site_id,guest_name,guest_email,note,original_filename,mime_type,size_bytes,drive_file_id,drive_web_view_link,is_hidden,is_flagged',
      original_filename: `in.("photo-upload-qa-${runId}.png","photo-upload-qa-${runId}.mp4")`,
    }));
    expect(uploadsResponse.ok).toBeTruthy();
    const uploads = await uploadsResponse.json() as Array<{
      id: string;
      photo_album_id: string;
      wedding_site_id: string;
      guest_name: string | null;
      guest_email: string | null;
      note: string | null;
      original_filename: string;
      mime_type: string;
      size_bytes: number;
      drive_file_id: string | null;
      drive_web_view_link: string | null;
      is_hidden: boolean | null;
      is_flagged: boolean | null;
    }>;
    expect(uploads).toHaveLength(2);
    const imageUpload = uploads.find((upload) => upload.original_filename === `photo-upload-qa-${runId}.png`);
    const videoUpload = uploads.find((upload) => upload.original_filename === `photo-upload-qa-${runId}.mp4`);
    expect(imageUpload).toMatchObject({
      wedding_site_id: site.id,
      guest_name: guestName,
      guest_email: guestEmail,
      note,
      original_filename: `photo-upload-qa-${runId}.png`,
      mime_type: 'image/png',
      is_hidden: false,
      is_flagged: false,
    });
    expect(videoUpload).toMatchObject({
      wedding_site_id: site.id,
      guest_name: videoGuestName,
      guest_email: videoGuestEmail,
      note: videoNote,
      original_filename: `photo-upload-qa-${runId}.mp4`,
      mime_type: 'video/mp4',
      is_hidden: false,
      is_flagged: false,
    });
    for (const upload of uploads) {
      expect(upload.size_bytes).toBeGreaterThan(0);
      expect(upload.drive_file_id).toBeTruthy();
      expect(upload.drive_web_view_link).toContain('token=');
    }
    logStep('rest upload readback done');

    if (process.env.LIVE_PHOTO_ANALYSIS_WRITE_READ === '1') {
      const analysisResponse = await fetch(`${supabaseUrl}/functions/v1/photo-analyze-batch`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          siteId: site.id,
          uploadIds: uploads.map((upload) => upload.id),
          limit: uploads.length,
          mode: 'auto',
          force: true,
        }),
        signal: AbortSignal.timeout(45_000),
      });
      const analysisData = await analysisResponse.json().catch(() => ({}));
      expect(analysisResponse.ok, JSON.stringify(analysisData)).toBeTruthy();
      expect(analysisData.analyzed).toBe(1);

      const analysisRowsResponse = await restFetch(restUrl('photo_upload_ai_analysis', {
        select: 'upload_id,status,detected_moment,suggested_bucket_name,bucket_confidence,quality_score,is_video,slideshow_priority,caption,tags',
        upload_id: `in.(${uploads.map((upload) => upload.id).join(',')})`,
      }));
      expect(analysisRowsResponse.ok).toBeTruthy();
      const analysisRows = await analysisRowsResponse.json() as Array<{
        upload_id: string;
        status: string;
        detected_moment: string | null;
        suggested_bucket_name: string | null;
        bucket_confidence: number | null;
        quality_score: number | null;
        is_video: boolean;
        slideshow_priority: number | null;
        caption: string | null;
        tags: string[] | null;
      }>;
      expect(analysisRows).toHaveLength(2);
      const imageAnalysis = analysisRows.find((row) => row.upload_id === imageUpload?.id);
      const videoAnalysis = analysisRows.find((row) => row.upload_id === videoUpload?.id);
      expect(imageAnalysis?.is_video).toBe(false);
      expect(imageAnalysis?.detected_moment).toBeTruthy();
      expect(imageAnalysis?.suggested_bucket_name).toBeTruthy();
      expect(imageAnalysis?.bucket_confidence ?? 0).toBeGreaterThan(0);
      expect(imageAnalysis?.quality_score ?? 0).toBeGreaterThan(0);
      expect(imageAnalysis?.slideshow_priority ?? 0).toBeGreaterThan(0);
      expect(Array.isArray(imageAnalysis?.tags)).toBe(true);
      expect(videoAnalysis?.is_video).toBe(true);
      expect(videoAnalysis?.detected_moment).toBeTruthy();
      expect(videoAnalysis?.suggested_bucket_name).toBeTruthy();
      expect(videoAnalysis?.bucket_confidence ?? 0).toBeGreaterThan(0);
      expect(videoAnalysis?.quality_score ?? 0).toBeGreaterThan(0);
      expect(videoAnalysis?.slideshow_priority ?? 0).toBeGreaterThan(0);
      expect(Array.isArray(videoAnalysis?.tags)).toBe(true);

      const metadataRowsResponse = await restFetch(restUrl('photo_upload_metadata', {
        select: 'upload_id,has_exif,has_gps,file_sha256,perceptual_hash',
        upload_id: `in.(${uploads.map((upload) => upload.id).join(',')})`,
      }));
      expect(metadataRowsResponse.ok).toBeTruthy();
      const metadataRows = await metadataRowsResponse.json() as Array<{ upload_id: string; file_sha256: string | null }>;
      expect(metadataRows).toHaveLength(2);
      expect(metadataRows.every((row) => Boolean(row.file_sha256))).toBe(true);
    }

    logStep('owner dashboard feature/story start');
    await page.goto('/dashboard/photos?bypassPayment=1&photoUploadQa=' + runId, { waitUntil: 'domcontentloaded' });
    const uploadedRow = page.locator('li').filter({ hasText: `photo-upload-qa-${runId}.png` }).first();
    await expect(uploadedRow).toBeVisible();
    await uploadedRow.getByRole('button', { name: 'Feature' }).click();
    await uploadedRow.getByRole('button', { name: 'Story' }).click();
    await expect.poll(async () => {
      const response = await restFetch(restUrl('photo_uploads', {
        select: 'original_filename,recap_featured,recap_story',
        original_filename: `in.("photo-upload-qa-${runId}.png","photo-upload-qa-${runId}.mp4")`,
      }));
      const rows = await response.json() as Array<{ original_filename: string; recap_featured: boolean; recap_story: boolean }>;
      const row = rows.find((upload) => upload.original_filename === `photo-upload-qa-${runId}.png`);
      return Boolean(row?.recap_featured && row?.recap_story);
    }).toBe(true);
    const uploadedVideoRow = page.locator('li').filter({ hasText: `photo-upload-qa-${runId}.mp4` }).first();
    await expect(uploadedVideoRow).toBeVisible();
    await uploadedVideoRow.getByRole('button', { name: 'Feature' }).click();
    await uploadedVideoRow.getByRole('button', { name: 'Story' }).click();
    await expect.poll(async () => {
      const response = await restFetch(restUrl('photo_uploads', {
        select: 'original_filename,recap_featured,recap_story',
        original_filename: `in.("photo-upload-qa-${runId}.png","photo-upload-qa-${runId}.mp4")`,
      }));
      const rows = await response.json() as Array<{ original_filename: string; recap_featured: boolean; recap_story: boolean }>;
      const row = rows.find((upload) => upload.original_filename === `photo-upload-qa-${runId}.mp4`);
      return Boolean(row?.recap_featured && row?.recap_story);
    }).toBe(true);
    logStep('owner dashboard feature/story done');

    logStep('export manifest start');
    const manifestResponse = await fetch(`${supabaseUrl}/functions/v1/photo-export-manifest`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ siteId: site.id, includeHidden: true }),
      signal: AbortSignal.timeout(20_000),
    });
    const manifest = await manifestResponse.json().catch(() => ({}));
    expect(manifestResponse.ok, JSON.stringify(manifest)).toBeTruthy();
    const manifestRows = (manifest.rows ?? []) as Array<{ filename: string; download_url: string; mime_type: string }>;
    const manifestImage = manifestRows.find((row) => row.filename === `photo-upload-qa-${runId}.png`);
    const manifestVideo = manifestRows.find((row) => row.filename === `photo-upload-qa-${runId}.mp4`);
    expect(manifestImage?.download_url).toContain('/storage/v1/object/sign/photo-uploads/');
    expect(manifestImage?.mime_type).toBe('image/png');
    expect(manifestVideo?.download_url).toContain('/storage/v1/object/sign/photo-uploads/');
    expect(manifestVideo?.mime_type).toBe('video/mp4');
    logStep('export manifest done');

    logStep('public recap verify start');
    await page.goto(`/event/${proofSiteSlug}/recap?photoRecapQa=${runId}`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /Maya.*Leo|maya.*leo/i }).first()).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole('heading', { name: 'Top moments' })).toBeVisible();
    await expect(page.getByText(note)).toBeVisible();
    await expect(page.getByText(`Shared by ${guestName}`)).toBeVisible();
    await expect(page.getByText(videoNote)).toBeVisible();
    await expect(page.getByText(`Shared by ${videoGuestName}`)).toBeVisible();
    await expect(page.getByText('Featured').first()).toBeVisible();
    await expect(page.getByText('Story pick').first()).toBeVisible();
    const recapImage = page.locator('img[src*="/storage/v1/object/sign/photo-uploads/"]').first();
    await expect(recapImage).toBeVisible();
    await expect(recapImage).toHaveAttribute('src', /\/storage\/v1\/object\/sign\/photo-uploads\//);
    await expect(page.getByRole('article').filter({ hasText: videoNote }).filter({ hasText: `Shared by ${videoGuestName}` }).first()).toBeVisible();
    logStep('public recap verify done');

    logStep('publish recap start');
    await page.goto('/dashboard/photos?bypassPayment=1&tool=recap&photoUploadQa=' + runId + '&afterRecap=1', { waitUntil: 'domcontentloaded' });
    const recapSharingCard = page.locator('#photos-tool-recap');
    await expect(recapSharingCard).toBeVisible();
    await recapSharingCard.getByRole('combobox').selectOption('published');
    await recapSharingCard.getByRole('button', { name: 'Save status' }).click();
    await expect(page.getByText('Guest hub settings saved.')).toBeVisible();
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Current mode: Published')).toBeVisible();
    await expect(page.getByText('The recap is live for guests.')).toBeVisible();
    logStep('publish recap done');

    logStep('preview recap popup start');
    const recapPreviewPagePromise = page.context().waitForEvent('page');
    await recapSharingCard.getByRole('button', { name: 'Preview recap' }).click();
    const recapPreviewPage = await recapPreviewPagePromise;
    await recapPreviewPage.waitForLoadState('domcontentloaded');
    await expect(recapPreviewPage).toHaveURL(new RegExp(`/event/${proofSiteSlug}/recap`));
    await expect(recapPreviewPage.getByRole('heading', { name: /Maya.*Leo|maya.*leo/i }).first()).toBeVisible();
    await expect(recapPreviewPage.getByRole('heading', { name: 'Top moments' })).toBeVisible();
    await expect(recapPreviewPage.getByText(note)).toBeVisible();
    await expect(recapPreviewPage.getByText(`Shared by ${guestName}`)).toBeVisible();
    await expect(recapPreviewPage.getByText(videoNote)).toBeVisible();
    await expect(recapPreviewPage.getByText(`Shared by ${videoGuestName}`)).toBeVisible();
    await expect(recapPreviewPage.getByText('Featured').first()).toBeVisible();
    await expect(recapPreviewPage.getByText('Story pick').first()).toBeVisible();
    await expect(recapPreviewPage.locator('img[src*="/storage/v1/object/sign/photo-uploads/"]').first()).toBeVisible();
    await expect(recapPreviewPage.getByRole('article').filter({ hasText: videoNote }).filter({ hasText: `Shared by ${videoGuestName}` }).first()).toBeVisible();
    await expect(recapPreviewPage.locator('body')).not.toContainText('token=');
    await recapPreviewPage.close();
    logStep('preview recap popup done');
  } finally {
    logStep('cleanup albums final start');
    await cleanupQaAlbums();
    logStep('cleanup albums final done');
  }
});
