import { expect, test, type Page } from '@playwright/test';
import { mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

test.use({ serviceWorkers: 'block' });

const DEMO_GUEST_PHOTO_STATE_STORAGE_KEY = 'dayof.demo.guest-photo.state.v1';

async function enableLocalDemo(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem('dayof_e2e_local_auth', '1');
  });

  await page.route('**/*', async (route) => {
    const url = route.request().url();
    if (url.includes('/auth/v1/user')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: 'demo-local-user', email: 'demo@dayof.love' }),
      });
      return;
    }
    await route.continue();
  });
}

async function seedDemoPhotoState(page: Page) {
  await page.addInitScript(({ storageKey }) => {
    if (window.localStorage.getItem(storageKey)) return;
    const envelope = {
      savedAtISO: '2026-05-14T12:00:00.000Z',
      value: {
        siteId: 'demo-site-id',
        siteSlug: 'alex-jordan-demo',
        events: [
          { id: 'ceremony-id', event_name: 'Ceremony', event_date: '2026-06-15', start_time: '16:00', end_time: '16:30' },
          { id: 'reception-id', event_name: 'Reception', event_date: '2026-06-15', start_time: '18:00', end_time: '23:00' },
        ],
        buckets: [
          { id: 'demo-photo-album-ceremony', name: 'Ceremony', slug: 'ceremony', parent_album_id: null, hierarchy_label: 'Ceremony', drive_folder_url: null, is_active: true, created_at: '2026-05-02T12:00:00.000Z', itinerary_event_id: 'ceremony-id', opens_at: null, closes_at: null },
          { id: 'demo-photo-album-reception', name: 'Reception', slug: 'reception', parent_album_id: null, hierarchy_label: 'Reception', drive_folder_url: null, is_active: true, created_at: '2026-05-02T12:00:00.000Z', itinerary_event_id: 'reception-id', opens_at: null, closes_at: null },
          { id: 'demo-photo-album-dance-floor', name: 'Dance floor', slug: 'dance-floor', parent_album_id: 'demo-photo-album-reception', hierarchy_label: 'Reception / Dance floor', drive_folder_url: null, is_active: true, created_at: '2026-05-02T12:00:00.000Z', itinerary_event_id: 'reception-id', opens_at: null, closes_at: null },
        ],
        uploads: [
          { id: 'demo-photo-upload-1', photo_album_id: 'demo-photo-album-ceremony', original_filename: 'vows-kiss.jpg', guest_name: 'Emma Waters', guest_email: 'emma.waters+0@dayof.demo', note: 'The first kiss from the left aisle.', mime_type: 'image/jpeg', size_bytes: 1823400, drive_web_view_link: 'https://drive.google.com/file/d/demo-photo-upload-1/view?token=demo-safe-link-1', is_hidden: false, is_flagged: false, recap_hidden: false, recap_featured: true, recap_story: true, uploaded_at: '2026-06-15T16:24:00.000Z' },
          { id: 'demo-photo-upload-2', photo_album_id: 'demo-photo-album-ceremony', original_filename: 'ring-closeup.jpg', guest_name: 'Noah Waters', guest_email: 'noah.waters+1@dayof.demo', note: 'Rings right before the vows.', mime_type: 'image/jpeg', size_bytes: 1532200, drive_web_view_link: 'https://drive.google.com/file/d/demo-photo-upload-2/view?token=demo-safe-link-2', is_hidden: false, is_flagged: false, recap_hidden: false, recap_featured: true, recap_story: false, uploaded_at: '2026-06-15T16:10:00.000Z' },
          { id: 'demo-photo-upload-5', photo_album_id: 'demo-photo-album-ceremony', original_filename: 'aisle-smile.jpg', guest_name: 'Maya Brooks', guest_email: 'maya.brooks+4@dayof.demo', note: 'A quiet smile right before everyone stood.', mime_type: 'image/jpeg', size_bytes: 1642800, drive_web_view_link: 'https://drive.google.com/file/d/demo-photo-upload-5/view?token=demo-safe-link-5', is_hidden: false, is_flagged: false, recap_hidden: false, recap_featured: true, recap_story: false, uploaded_at: '2026-06-15T16:15:00.000Z' },
          { id: 'demo-photo-upload-3', photo_album_id: 'demo-photo-album-reception', original_filename: 'cheers-boomerang.mp4', guest_name: 'Olivia Nguyen', guest_email: 'olivia.nguyen+2@dayof.demo', note: 'Cheers from the welcome toast.', mime_type: 'video/mp4', size_bytes: 4421000, drive_web_view_link: 'https://drive.google.com/file/d/demo-photo-upload-3/view?token=demo-safe-link-3', is_hidden: false, is_flagged: false, recap_hidden: false, recap_featured: false, recap_story: true, uploaded_at: '2026-06-15T18:26:00.000Z' },
          { id: 'demo-photo-upload-4', photo_album_id: 'demo-photo-album-dance-floor', original_filename: 'dance-floor-lights.jpg', guest_name: 'Liam Nguyen', guest_email: 'liam.nguyen+3@dayof.demo', note: 'Packed dance floor near the end of the night.', mime_type: 'image/jpeg', size_bytes: 2119000, drive_web_view_link: 'https://drive.google.com/file/d/demo-photo-upload-4/view?token=demo-safe-link-4', is_hidden: false, is_flagged: false, recap_hidden: false, recap_featured: false, recap_story: true, uploaded_at: '2026-06-15T21:48:00.000Z' },
        ],
        uploadAnalyses: [
          { id: 'demo-photo-analysis-1', upload_id: 'demo-photo-upload-1', wedding_site_id: 'demo-site-id', photo_album_id: 'demo-photo-album-ceremony', status: 'ready', detected_moment: 'Ceremony', suggested_bucket_id: 'demo-photo-album-ceremony', suggested_bucket_name: 'Ceremony', bucket_confidence: 0.96, quality_score: 0.94, blur_score: 0.06, people_count_range: '2-4', is_video: false, slideshow_priority: 96, caption: 'You can almost hear the crowd inhale right before the kiss.', tags: ['ceremony', 'kiss', 'couple'], warnings: [], error_message: null, analyzed_at: '2026-05-02T12:00:00.000Z' },
          { id: 'demo-photo-analysis-2', upload_id: 'demo-photo-upload-2', wedding_site_id: 'demo-site-id', photo_album_id: 'demo-photo-album-ceremony', status: 'ready', detected_moment: 'Ceremony details', suggested_bucket_id: 'demo-photo-album-ceremony', suggested_bucket_name: 'Ceremony', bucket_confidence: 0.88, quality_score: 0.82, blur_score: 0.08, people_count_range: '0-1', is_video: false, slideshow_priority: 83, caption: 'A quiet detail shot before the ceremony starts moving fast.', tags: ['rings', 'details', 'ceremony'], warnings: [], error_message: null, analyzed_at: '2026-05-02T12:00:00.000Z' },
          { id: 'demo-photo-analysis-3', upload_id: 'demo-photo-upload-5', wedding_site_id: 'demo-site-id', photo_album_id: 'demo-photo-album-ceremony', status: 'ready', detected_moment: 'Ceremony aisle', suggested_bucket_id: 'demo-photo-album-ceremony', suggested_bucket_name: 'Ceremony', bucket_confidence: 0.9, quality_score: 0.84, blur_score: 0.09, people_count_range: '2-4', is_video: false, slideshow_priority: 81, caption: 'A calm frame before the ceremony picks up speed.', tags: ['ceremony', 'aisle', 'smile'], warnings: [], error_message: null, analyzed_at: '2026-05-02T12:00:00.000Z' },
          { id: 'demo-photo-analysis-4', upload_id: 'demo-photo-upload-3', wedding_site_id: 'demo-site-id', photo_album_id: 'demo-photo-album-reception', status: 'ready', detected_moment: 'Reception toast', suggested_bucket_id: 'demo-photo-album-reception', suggested_bucket_name: 'Reception', bucket_confidence: 0.91, quality_score: 0.79, blur_score: 0.11, people_count_range: '5-9', is_video: true, slideshow_priority: 77, caption: 'Short motion clip from the first big reception toast.', tags: ['toast', 'reception', 'video'], warnings: [], error_message: null, analyzed_at: '2026-05-02T12:00:00.000Z' },
          { id: 'demo-photo-analysis-5', upload_id: 'demo-photo-upload-4', wedding_site_id: 'demo-site-id', photo_album_id: 'demo-photo-album-dance-floor', status: 'ready', detected_moment: 'Dance floor', suggested_bucket_id: 'demo-photo-album-dance-floor', suggested_bucket_name: 'Dance floor', bucket_confidence: 0.95, quality_score: 0.87, blur_score: 0.14, people_count_range: '10+', is_video: false, slideshow_priority: 89, caption: 'High-energy frame for the late-night slideshow section.', tags: ['dance floor', 'party', 'reception'], warnings: [], error_message: null, analyzed_at: '2026-05-02T12:00:00.000Z' },
        ],
        uploadMetadata: [
          { upload_id: 'demo-photo-upload-1', taken_at: '2026-06-15T16:23:42.000Z', width: 3024, height: 4032, has_exif: true, has_gps: false, file_sha256: 'demo-photo-sha-1', perceptual_hash: 'demo-photo-hash-1', location_label: 'Rose Garden', event_match_id: 'ceremony-id', event_match_confidence: 0.97, event_match_reason: 'Captured inside ceremony window.' },
          { upload_id: 'demo-photo-upload-2', taken_at: '2026-06-15T16:09:10.000Z', width: 3024, height: 4032, has_exif: true, has_gps: false, file_sha256: 'demo-photo-sha-2', perceptual_hash: 'demo-photo-hash-2', location_label: 'Rose Garden', event_match_id: 'ceremony-id', event_match_confidence: 0.94, event_match_reason: 'Captured inside ceremony window.' },
          { upload_id: 'demo-photo-upload-5', taken_at: '2026-06-15T16:14:33.000Z', width: 3024, height: 4032, has_exif: true, has_gps: false, file_sha256: 'demo-photo-sha-5', perceptual_hash: 'demo-photo-hash-5', location_label: 'Rose Garden', event_match_id: 'ceremony-id', event_match_confidence: 0.92, event_match_reason: 'Captured inside ceremony window.' },
          { upload_id: 'demo-photo-upload-3', taken_at: '2026-06-15T18:25:31.000Z', width: 1920, height: 1080, has_exif: true, has_gps: false, file_sha256: 'demo-photo-sha-3', perceptual_hash: 'demo-photo-hash-3', location_label: 'Grand Ballroom', event_match_id: 'reception-id', event_match_confidence: 0.95, event_match_reason: 'Captured inside reception window.' },
          { upload_id: 'demo-photo-upload-4', taken_at: '2026-06-15T21:48:59.000Z', width: 3024, height: 4032, has_exif: true, has_gps: false, file_sha256: 'demo-photo-sha-4', perceptual_hash: 'demo-photo-hash-4', location_label: 'Grand Ballroom', event_match_id: 'reception-id', event_match_confidence: 0.93, event_match_reason: 'Captured inside reception window.' },
        ],
        aiBucketCorrections: [],
        guestbookEntries: [
          { id: 'demo-guestbook-1', guest_name: 'Ava Turner', guest_email: 'ava.turner+10@dayof.demo', message: 'Still thinking about the vows and that sunset.', is_hidden: false, is_flagged: false, created_at: '2026-06-16T08:15:00.000Z' },
        ],
        guestProspects: [
          { id: 'demo-guest-prospect-1', guest_name: 'Grace Campbell', email: 'grace.campbell+26@dayof.demo', phone: null, source: 'guest_upload', wants_photo_updates: true, wants_own_event_info: false, recap_email_queued_at: null, future_event_email_queued_at: null, created_at: '2026-06-15T22:15:00.000Z' },
        ],
        hubSettings: {
          rsvp_enabled: true,
          photos_enabled: true,
          guestbook_enabled: true,
          registry_enabled: true,
          schedule_enabled: true,
          travel_enabled: true,
          recap_status: 'private_link',
          recap_published_at: '2026-06-16T10:00:00.000Z',
          recap_closed_at: null,
          custom_message: 'Add your favorite photos or a quick video. We will fold the best moments into the recap.',
          language_default: 'en',
        },
        bucketUploadLinks: {
          'demo-photo-album-ceremony': `${window.location.origin}/photos/upload?site=alex-jordan-demo&hub=1&invite_token=token-c-1`,
          'demo-photo-album-reception': `${window.location.origin}/photos/upload?site=alex-jordan-demo&hub=1&invite_token=token-c-2`,
          'demo-photo-album-dance-floor': `${window.location.origin}/photos/upload?site=alex-jordan-demo&hub=1&invite_token=token-c-2`,
        },
      },
    };
    window.localStorage.setItem(storageKey, JSON.stringify(envelope));
  }, { storageKey: DEMO_GUEST_PHOTO_STATE_STORAGE_KEY });
}

async function expectNoMeaningfulHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => {
    const doc = document.documentElement;
    return Math.max(0, doc.scrollWidth - doc.clientWidth);
  });
  expect(overflow).toBeLessThanOrEqual(8);
}

test('demo photo memory flow proves slideshow, export, and recap readback continuity', async ({ page }) => {
  await enableLocalDemo(page);
  await seedDemoPhotoState(page);
  await page.goto('/dashboard/photos?bypassPayment=1&photoMemoryFlowQa=1', { waitUntil: 'domcontentloaded' });

  await expect(page.getByText('No-app memory flow')).toBeVisible();
  await expect(page.getByText(/1 video captured for the memory flow\./i)).toBeVisible();
  await expect(page.getByText(/Owner handoff sheets and full-resolution download jobs can be saved/i)).toBeVisible();

  const guestUploadPage = await page.context().newPage();
  await guestUploadPage.goto('/photos/upload?site=alex-jordan-demo&hub=1&invite_token=token-c-2&guestLang=fr&photoMemoryFlowQa=1', { waitUntil: 'domcontentloaded' });
  await guestUploadPage.locator('#photo-upload-guest-name').fill('Taylor Guest');
  await guestUploadPage.locator('#photo-upload-guest-email').fill('taylor@example.com');
  await guestUploadPage.locator('#photo-upload-note').fill('Short welcome toast clip.');
  await guestUploadPage.setInputFiles('input[type="file"]', {
    name: 'welcome-toast.mp4',
    mimeType: 'video/mp4',
    buffer: Buffer.from('demo-video-bytes'),
  });
  await guestUploadPage.getByRole('button', { name: /upload files|envoyer les fichiers/i }).click();
  await expect(guestUploadPage.getByText(/1 file uploaded\.|1 fichier\(s\) envoyé\(s\)\. Merci\./i)).toBeVisible();
  await expect(guestUploadPage.locator('body')).not.toContainText('token-c-2');
  await guestUploadPage.close();

  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByText(/2 videos captured for the memory flow\./i)).toBeVisible();
  const uploadedClipRow = page.getByRole('listitem').filter({ hasText: 'welcome-toast.mp4' }).filter({ hasText: 'Taylor Guest' }).first();
  await expect(uploadedClipRow).toBeVisible();

  const slideshowCard = page.locator('section, div').filter({ has: page.getByRole('heading', { name: 'Slideshow draft' }) }).first();
  const slideshowPreviewButton = slideshowCard.getByRole('button', { name: 'Preview', exact: true });
  await slideshowPreviewButton.scrollIntoViewIfNeeded();
  await slideshowPreviewButton.click();
  const slideshowDialog = page.locator('div.fixed.inset-0').filter({ has: page.getByText('Slideshow preview', { exact: true }) }).first();
  await expect(slideshowDialog.getByText('Slideshow preview', { exact: true })).toBeVisible();
  await expect(slideshowDialog.getByText('vows-kiss.jpg', { exact: true })).toBeVisible();
  await expect(slideshowDialog.getByText('aisle-smile.jpg', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Close' }).click();

  await expect(page.getByText('3 story picks', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Add to story' }).first().click();
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByText('4 story picks', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Remove from story' }).first()).toBeVisible();

  const moderatedUploadedClipRow = page.getByRole('listitem').filter({ hasText: 'welcome-toast.mp4' }).filter({ hasText: 'Taylor Guest' }).first();
  await moderatedUploadedClipRow.getByRole('button', { name: 'Feature', exact: true }).click();
  await moderatedUploadedClipRow.getByRole('button', { name: 'Story', exact: true }).click();
  await expect(moderatedUploadedClipRow.getByText('Featured', { exact: true })).toBeVisible();
  await expect(moderatedUploadedClipRow.getByText('Story', { exact: true })).toBeVisible();
  await page.reload({ waitUntil: 'domcontentloaded' });
  const reloadedUploadedClipRow = page.getByRole('listitem').filter({ hasText: 'welcome-toast.mp4' }).filter({ hasText: 'Taylor Guest' }).first();
  await expect(reloadedUploadedClipRow.getByText('Featured', { exact: true })).toBeVisible();
  await expect(reloadedUploadedClipRow.getByText('Story', { exact: true })).toBeVisible();
  await expect(reloadedUploadedClipRow.getByRole('button', { name: 'Unfeature', exact: true })).toBeVisible();
  await expect(reloadedUploadedClipRow.getByRole('button', { name: 'Unstory', exact: true })).toBeVisible();

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save full-res download job' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('photo-full-resolution-download-job.json');
  const downloadDir = join(process.cwd(), 'test-results', 'photo-memory-flow');
  mkdirSync(downloadDir, { recursive: true });
  const downloadPath = join(downloadDir, `full-res-job-${Date.now()}.json`);
  await download.saveAs(downloadPath);
  const downloadContents = readFileSync(downloadPath, 'utf8');
  expect(downloadContents).toContain('demo-photo-upload-1');
  expect(downloadContents).not.toContain('token-c-2');

  await page.locator('select.h-11.rounded-lg.border.border-border-subtle.bg-white').first().selectOption('published');
  await page.getByRole('button', { name: 'Save status' }).click();
  await expect(page.getByText('Guest hub settings saved.')).toBeVisible();
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByText('Current mode: Published')).toBeVisible();
  await expect(page.getByText('The recap is live for guests.')).toBeVisible();

  const recapPreviewPagePromise = page.context().waitForEvent('page');
  await page.getByRole('button', { name: 'Preview recap' }).click();
  const recapPreviewPage = await recapPreviewPagePromise;
  await recapPreviewPage.waitForLoadState('domcontentloaded');
  await expect(recapPreviewPage).toHaveURL(/\/event\/alex-jordan-demo\/recap/);
  await expect(recapPreviewPage.getByRole('heading', { name: /alex thompson & jordan rivera/i })).toBeVisible();
  await expect(recapPreviewPage.getByRole('heading', { name: /Top moments|Moments forts/i })).toBeVisible();
  await expect(recapPreviewPage.getByText('Story pick').first()).toBeVisible();
  await expect(recapPreviewPage.getByText('Featured').first()).toBeVisible();
  await expect(recapPreviewPage.getByText('Short motion clip from the first big reception toast.')).toBeVisible();
  await expect(recapPreviewPage.getByText('Short welcome toast clip.')).toBeVisible();
  await expect(recapPreviewPage.getByText(/Taylor Guest/i)).toBeVisible();
  await expect(recapPreviewPage.getByText(/Emma Waters/i)).toBeVisible();
  await expect(recapPreviewPage.locator('body')).not.toContainText('token-c-2');
  await recapPreviewPage.close();

  await page.goto('/event/alex-jordan-demo/recap?photoMemoryFlowQa=1&invite_token=token-c-2', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: /alex thompson & jordan rivera/i })).toBeVisible();
  await expect(page.getByRole('heading', { name: /Wedding recap|Récap du mariage/i })).toBeVisible();
  await expect(page.getByRole('heading', { name: /Top moments|Moments forts/i })).toBeVisible();
  await expect(page.getByRole('heading', { name: /Memory chapters|Chapitres de souvenirs/i })).toBeVisible();
  await expect(page.getByText('Story pick').first()).toBeVisible();
  await expect(page.getByText('Featured').first()).toBeVisible();
  await expect(page.getByText('Short motion clip from the first big reception toast.')).toBeVisible();
  await expect(page.getByText('Short welcome toast clip.')).toBeVisible();
  await expect(page.getByText(/Taylor Guest/i)).toBeVisible();
  await expect(page.getByText(/Emma Waters/i)).toBeVisible();
  await expect(page.locator('body')).not.toContainText('token-c-2');
});

test('mobile guest upload route stays usable for the no-app memory flow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/photos/upload?site=alex-jordan-demo&hub=1&invite_token=token-c-2&guestLang=fr&photoMemoryFlowQa=1', { waitUntil: 'domcontentloaded' });

  await expect(page.getByRole('heading', { name: /share your photos|partagez vos photos/i })).toBeVisible();
  await expect(page.getByText(/Photos and videos go straight to the couple\.|Photos and videos go straight to the couple\.|Photos et vidéos vont directement au couple\./i)).toBeVisible();
  await expect(page.locator('input[type="file"]')).toBeVisible();
  await expect(page.getByRole('button', { name: /upload files|envoyer les fichiers/i })).toBeVisible();
  await expect(page.locator('body')).not.toContainText('token-c-2');
  await expectNoMeaningfulHorizontalOverflow(page);
});
