import { fireEvent, render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { Templates } from './Templates';
import { useAuth } from '../hooks/useAuth';
import { useInternalToolingRouteAccess } from '../lib/internalToolingRoutes';

vi.mock('../hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../lib/internalToolingRoutes', () => ({
  useInternalToolingRouteAccess: vi.fn(),
}));

vi.mock('../lib/setupDraft', () => ({
  emptySetupDraft: {
    migrationSource: '',
    partnerOneFirstName: '',
    partnerOneLastName: '',
    partnerTwoFirstName: '',
    partnerTwoLastName: '',
    dateKnown: true,
    weddingDate: '',
    weddingCity: '',
    weddingRegion: '',
    guestEstimateBand: '',
    stylePreferences: [],
    selectedTemplateId: 'modern-luxe',
  },
  readSetupDraft: vi.fn(() => ({
    migrationSource: '',
    partnerOneFirstName: '',
    partnerOneLastName: '',
    partnerTwoFirstName: '',
    partnerTwoLastName: '',
    dateKnown: true,
    weddingDate: '',
    weddingCity: '',
    weddingRegion: '',
    guestEstimateBand: '',
    stylePreferences: [],
    selectedTemplateId: '',
  })),
  selectSetupDraftTemplate: vi.fn(),
}));

function renderTemplates(internalToolingCaptureRoutesEnabled = false) {
  vi.mocked(useAuth).mockReturnValue({
    user: { id: 'user-1', email: 'couple@example.com', name: 'Alex and Jordan' },
    loading: false,
    isDemoMode: false,
    signIn: vi.fn(),
    signOut: vi.fn(),
  });
  vi.mocked(useInternalToolingRouteAccess).mockReturnValue({
    internalToolingRoutesEnabled: false,
    internalToolingCaptureRoutesEnabled,
    internalToolingRoutesLoading: false,
    internalToolingRouteFlagEnabled: false,
  });

  render(
    <MemoryRouter>
      <Templates />
    </MemoryRouter>,
  );
}

describe('Templates', () => {
  it('hides internal preview controls from the public compare surface', () => {
    renderTemplates(false);

    const compareButtons = screen.getAllByRole('button', { name: 'Compare' });
    fireEvent.click(compareButtons[0]);

    expect(screen.getByText('Quick compare')).toBeInTheDocument();
    expect(screen.queryByText('Internal preview')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Open preview' })).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Start here' }).length).toBeGreaterThan(0);
  });

  it('surfaces page and guest route metadata on template cards', () => {
    renderTemplates(false);

    expect(screen.getAllByText(/starter sections/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText('/schedule').length).toBeGreaterThan(0);
    expect(screen.getAllByText('/rsvp').length).toBeGreaterThan(0);
  });

  it('keeps recommendation reasons visible on the public template surface', () => {
    const source = readFileSync(join(process.cwd(), 'src/pages/Templates.tsx'), 'utf8');

    expect(source).toContain('getRecommendedTemplateMatches');
    expect(source).toContain('recommendedTemplateReasonById');
    expect(source).toContain('Why this fits');
  });

  it('shows catalog summary and readiness filtering controls', () => {
    const source = readFileSync(join(process.cwd(), 'src/pages/Templates.tsx'), 'utf8');

    expect(source).toContain('templateCatalogSummary');
    expect(source).toContain('All readiness');
    expect(source).toContain('Sort: Readiness');
  });

  it('compares guest routes as well as section order', () => {
    const source = readFileSync(join(process.cwd(), 'src/pages/Templates.tsx'), 'utf8');

    expect(source).toContain('sharedRoutes');
    expect(source).toContain('onlyARoutes');
    expect(source).toContain('Guest route comparison');
  });
});
