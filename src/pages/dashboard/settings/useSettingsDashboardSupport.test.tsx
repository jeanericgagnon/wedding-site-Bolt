import { act, renderHook, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  loadSettingsCollaboratorInvitesMock,
  loadSettingsTranslationStatusesMock,
  resolveActiveSiteForUserMock,
} = vi.hoisted(() => ({
  loadSettingsCollaboratorInvitesMock: vi.fn(),
  loadSettingsTranslationStatusesMock: vi.fn(async () => []),
  resolveActiveSiteForUserMock: vi.fn(),
}));

vi.mock('../../../lib/activeSite', () => ({
  resolveActiveSiteForUser: resolveActiveSiteForUserMock,
}));

vi.mock('../../../lib/actionAudit', () => ({
  logAppAction: vi.fn(),
}));

vi.mock('./settingsSiteData', () => ({
  loadSettingsCollaboratorInvites: loadSettingsCollaboratorInvitesMock,
  loadSettingsTranslationStatuses: loadSettingsTranslationStatusesMock,
}));

import { useSettingsDashboardSupport } from './useSettingsDashboardSupport';
import type { TranslationStatusRow } from './settingsDashboardTypes';
import type { SettingsCollaboratorInviteRow } from './settingsSiteData';

function createInvite(id: string): SettingsCollaboratorInviteRow {
  return {
    id,
    invite_email: `${id}@example.com`,
    invite_name: null,
    invited_at: '2026-05-19T00:00:00.000Z',
    expires_at: null,
    permissions: [],
    role: 'viewer',
    status: 'pending',
    invite_token: `${id}-token`,
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((promiseResolve) => {
    resolve = promiseResolve;
  });
  return { promise, resolve };
}

describe('useSettingsDashboardSupport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('ignores stale collaborator invite responses after a newer site load starts', async () => {
    const firstLoad = deferred<SettingsCollaboratorInviteRow[]>();
    loadSettingsCollaboratorInvitesMock
      .mockReturnValueOnce(firstLoad.promise)
      .mockResolvedValueOnce([createInvite('current')]);

    const { result } = renderHook(() => {
      const [collaboratorInvites, setCollaboratorInvites] = useState<SettingsCollaboratorInviteRow[]>([]);
      const [, setTranslationStatuses] = useState<TranslationStatusRow[]>([]);
      const [weddingSiteId, setWeddingSiteId] = useState<string | null>('site-1');
      const support = useSettingsDashboardSupport({
        setCollaboratorInvites,
        setTranslationStatuses,
        setWeddingSiteId,
        userId: 'user-1',
        weddingSiteId,
      });
      return { collaboratorInvites, support };
    });

    void result.current.support.loadCollaboratorInvites('site-1');
    await act(async () => {
      await result.current.support.loadCollaboratorInvites('site-2');
    });

    await waitFor(() => expect(result.current.collaboratorInvites.map((invite) => invite.id)).toEqual(['current']));

    await act(async () => {
      firstLoad.resolve([createInvite('stale')]);
    });

    await waitFor(() => expect(result.current.collaboratorInvites.map((invite) => invite.id)).toEqual(['current']));
  });
});
