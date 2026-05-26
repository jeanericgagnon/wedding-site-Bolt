import { describe, expect, it } from 'vitest';

// @ts-ignore Test imports a Node script module with named exports.
import { findOpenLocalPort } from '../../scripts/proofPreviewRuntime.mjs';

describe('findOpenLocalPort', () => {
  it('returns the first available port in the range', async () => {
    const port = await findOpenLocalPort(4175, 3, async (candidatePort: number) => ({
      available: candidatePort === 4177,
      error: candidatePort === 4177 ? null : Object.assign(new Error('busy'), { code: 'EADDRINUSE' }),
    }));

    expect(port).toBe(4177);
  });

  it('keeps the occupied-port message when every port is in use', async () => {
    await expect(
      findOpenLocalPort(4175, 2, async () => ({
        available: false,
        error: Object.assign(new Error('busy'), { code: 'EADDRINUSE' }),
      })),
    ).rejects.toThrow('No available local preview port found from 4175 through 4176');
  });

  it('surfaces binding permission failures instead of claiming every port is occupied', async () => {
    await expect(
      findOpenLocalPort(4175, 2, async (candidatePort: number) => ({
        available: false,
        error: Object.assign(new Error(`listen EPERM on ${candidatePort}`), { code: 'EPERM' }),
      })),
    ).rejects.toThrow('Could not bind a local preview port starting at 4175. First failure: EPERM on 4175');
  });
});
