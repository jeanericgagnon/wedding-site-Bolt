import { beforeEach, describe, expect, it, vi } from 'vitest';

const invoke = vi.fn();
const getUser = vi.fn();
const from = vi.fn();

vi.mock('./supabase', () => ({
  supabase: {
    functions: { invoke },
    auth: { getUser },
    from,
  },
}));

describe('vendor profile inquiry bounds', () => {
  beforeEach(() => {
    invoke.mockReset();
    getUser.mockReset();
    from.mockReset();
  });

  it('caps vendor inquiry history reads to the shared maximum', async () => {
    getUser.mockResolvedValueOnce({ data: { user: { id: 'user-1' } } });
    const limit = vi.fn(async () => ({ data: [], error: null }));
    const order = vi.fn(() => ({ limit }));
    const eq = vi.fn(() => ({ order }));
    const select = vi.fn(() => ({ eq }));
    from.mockReturnValueOnce({ select });

    const {
      listMyVendorProfileInquiries,
      MAX_VENDOR_PROFILE_INQUIRIES,
    } = await import('./vendorProfiles');

    await listMyVendorProfileInquiries(MAX_VENDOR_PROFILE_INQUIRIES + 25);

    expect(limit).toHaveBeenCalledWith(MAX_VENDOR_PROFILE_INQUIRIES);
  });

  it('clamps non-positive vendor inquiry history reads to at least one row', async () => {
    getUser.mockResolvedValueOnce({ data: { user: { id: 'user-1' } } });
    const limit = vi.fn(async () => ({ data: [], error: null }));
    const order = vi.fn(() => ({ limit }));
    const eq = vi.fn(() => ({ order }));
    const select = vi.fn(() => ({ eq }));
    from.mockReturnValueOnce({ select });

    const { listMyVendorProfileInquiries } = await import('./vendorProfiles');

    await listMyVendorProfileInquiries(0);

    expect(limit).toHaveBeenCalledWith(1);
  });
});
