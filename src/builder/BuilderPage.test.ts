import { describe, expect, it, vi } from 'vitest';

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({ user: null, isDemoMode: false }),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useSearchParams: () => [new URLSearchParams(), vi.fn()],
  };
});

vi.mock('../lib/activeSite', () => ({
  resolveActiveSiteForUser: vi.fn(),
}));

vi.mock('./services/builderProjectService', () => ({
  builderProjectService: {
    loadEntrySite: vi.fn(),
    loadProject: vi.fn(),
    createProject: vi.fn(),
    saveProject: vi.fn(),
    publishProject: vi.fn(),
  },
}));

vi.mock('./services/publishService', () => ({
  publishService: {
    publish: vi.fn(),
  },
}));

vi.mock('./components/BuilderShell', () => ({
  BuilderShell: () => null,
}));

vi.mock('./state/builderReducer', () => ({
  createInitialBuilderState: vi.fn(),
  builderReducer: vi.fn(),
}));

vi.mock('./state/builderActions', () => ({
  builderActions: {},
}));

vi.mock('./utils/setupDraftHydration', () => ({
  applySetupDraftToWeddingData: vi.fn((data) => data),
}));

vi.mock('./components/ai/BuilderAssistantPanel', () => ({
  BuilderAssistantPanel: () => null,
}));

vi.mock('../lib/coupleDisplayName', async () => {
  const actual = await vi.importActual<typeof import('../lib/coupleDisplayName')>('../lib/coupleDisplayName');
  return actual;
});

import { createDemoWeddingDataFromSite } from './BuilderPage';

describe('createDemoWeddingDataFromSite', () => {
  it('skips invalid demo wedding dates instead of crashing builder demo hydration', () => {
    expect(() => createDemoWeddingDataFromSite({ wedding_date: 'not-a-date' })).not.toThrow();

    const data = createDemoWeddingDataFromSite({ wedding_date: 'not-a-date' });

    expect(data.event.weddingDateISO).toBeUndefined();
    expect(data.schedule).toEqual([]);
  });
});
