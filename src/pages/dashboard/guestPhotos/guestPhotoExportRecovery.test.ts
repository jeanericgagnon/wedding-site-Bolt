import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('guest photo export recovery', () => {
  it('does not overclaim successful bulk copy after the photo export helper falls back or fails', () => {
    const source = readFileSync(join(process.cwd(), 'src/pages/dashboard/guestPhotos/useGuestPhotoExportActions.ts'), 'utf8');

    expect(source).toContain('const copyRequestIdRef = useRef(0);');
    expect(source).toContain('const copyContextKey = useMemo(() => JSON.stringify({');
    expect(source).toContain('bucketUploadLinks,');
    expect(source).toContain('slideshowFrames,');
    expect(source).toContain('const requestContextKey = copyContextKeyRef.current;');
    expect(source).toContain('requestContextKey === copyContextKeyRef.current');
    expect(source).toContain('}, [copyContextKey]);');
    expect(source).toContain('return result;');
    expect(source).toContain('return null;');
    expect(source).toContain("const [copyNotice, setCopyNotice] = useState<{ key: string; mode: 'copied' | 'downloaded' } | null>(null);");
    expect(source).toContain("if (result === 'copied') {\n      setSuccess(`Copied ${lines.length} share message(s).`);\n    }");
    expect(source).toContain("if (result === 'copied') {\n      setSuccess(`Copied ${links.length} link(s).`);\n    }");
  });

  it('recovers slideshow export failures with fallback text instead of assuming the copy succeeded', () => {
    const source = readFileSync(join(process.cwd(), 'src/pages/dashboard/guestPhotos/useGuestPhotoExportActions.ts'), 'utf8');

    expect(source).toContain("setSuccess('Copied the slideshow notes.');");
    expect(source).toContain("setSuccess('Clipboard was blocked, so I saved the slideshow notes instead.');");
    expect(source).toContain("setError('Clipboard access is blocked here. The slideshow notes are ready below so you can select them.');");
    expect(source).toContain('setCopyFallbackValue(JSON.stringify(payload, null, 2));');
  });

  it('threads downloaded fallback labels through the guest photo owner cards too', () => {
    const albumCreate = readFileSync(join(process.cwd(), 'src/pages/dashboard/guestPhotos/GuestPhotoAlbumCreateCard.tsx'), 'utf8');
    const albumControls = readFileSync(join(process.cwd(), 'src/pages/dashboard/guestPhotos/GuestPhotoAlbumControls.tsx'), 'utf8');
    const bucketCard = readFileSync(join(process.cwd(), 'src/pages/dashboard/guestPhotos/GuestPhotoBucketCard.tsx'), 'utf8');
    const hubQrCard = readFileSync(join(process.cwd(), 'src/pages/dashboard/guestPhotos/GuestPhotoHubQrCard.tsx'), 'utf8');
    const organizerCard = readFileSync(join(process.cwd(), 'src/pages/dashboard/guestPhotos/GuestPhotoOrganizerCard.tsx'), 'utf8');
    const slideshowCard = readFileSync(join(process.cwd(), 'src/pages/dashboard/guestPhotos/GuestPhotoSlideshowCard.tsx'), 'utf8');

    expect(albumCreate).toContain('Downloaded newest album link');
    expect(albumCreate).toContain('Downloaded latest link');
    expect(albumCreate).toContain('Copied latest link');
    expect(albumControls).toContain('Downloaded all links');
    expect(albumControls).toContain('Downloaded prompts');
    expect(bucketCard).toContain('Downloaded upload link');
    expect(bucketCard).toContain('Copied upload link');
    expect(bucketCard).toContain('Downloaded share prompt');
    expect(hubQrCard).toContain('Downloaded guest hub link');
    expect(hubQrCard).toContain('Downloaded guest recap link');
    expect(organizerCard).toContain('Downloaded organizer notes');
    expect(organizerCard).toContain('Copied organizer notes');
    expect(slideshowCard).toContain('Downloaded slideshow notes');
    expect(slideshowCard).toContain('Copied slideshow notes');
  });

  it('labels review-card JSON exports as downloads instead of copy actions', () => {
    const reviewCard = readFileSync(join(process.cwd(), 'src/pages/dashboard/guestPhotos/GuestPhotoReviewCard.tsx'), 'utf8');

    expect(reviewCard).toContain('Download chapter notes');
    expect(reviewCard).toContain('Download recap notes');
    expect(reviewCard).not.toContain('Copy chapter notes');
    expect(reviewCard).not.toContain('Copy recap notes');
  });
});
