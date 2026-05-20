import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (relativePath: string) => readFileSync(join(process.cwd(), relativePath), 'utf8');

describe('dashboard internal navigation cleanup', () => {
  it('uses router navigation for address-collection message composer handoff', () => {
    const source = read('src/pages/dashboard/planning/AddressCollectionTab.tsx');

    expect(source).toContain("import { useNavigate } from 'react-router-dom';");
    expect(source).toContain('const navigate = useNavigate();');
    expect(source).toContain("pathname: '/dashboard/messages',");
    expect(source).not.toContain("window.location.href = `/dashboard/messages?");
  });

  it('uses router navigation for seating and itinerary dashboard CTAs', () => {
    const seatingSource = read('src/pages/dashboard/Seating.tsx');
    const itinerarySource = read('src/pages/dashboard/ItineraryDashboardRouteContent.tsx');

    expect(seatingSource).toContain("import { useNavigate } from 'react-router-dom';");
    expect(seatingSource).toContain("onClick={() => navigate('/dashboard/itinerary')}");
    expect(seatingSource).not.toContain("window.location.href = '/dashboard/itinerary';");

    expect(itinerarySource).toContain("import { useNavigate } from 'react-router-dom';");
    expect(itinerarySource).toContain("pathname: '/dashboard/photos',");
    expect(itinerarySource).not.toContain("window.location.href = `/dashboard/photos?");
  });

  it('uses router navigation for guest-photo message composer handoffs', () => {
    const exportActionsSource = read('src/pages/dashboard/guestPhotos/useGuestPhotoExportActions.ts');
    const bucketCardSource = read('src/pages/dashboard/guestPhotos/GuestPhotoBucketCard.tsx');

    expect(exportActionsSource).toContain("import { useNavigate } from 'react-router-dom';");
    expect(exportActionsSource).toContain('const navigate = useNavigate();');
    expect(exportActionsSource).toContain("navigate(`/dashboard/messages?prefillSubject=${subject}&prefillBody=${body}`);");
    expect(exportActionsSource).not.toContain("window.location.href = `/dashboard/messages?prefillSubject=${subject}&prefillBody=${body}`;");

    expect(bucketCardSource).toContain("import { useNavigate } from 'react-router-dom';");
    expect(bucketCardSource).toContain('const navigate = useNavigate();');
    expect(bucketCardSource).toContain("navigate(`/dashboard/messages?prefillSubject=${subject}&prefillBody=${body}`);");
    expect(bucketCardSource).not.toContain("window.location.href = `/dashboard/messages?prefillSubject=${subject}&prefillBody=${body}`;");
  });
});
