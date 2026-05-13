import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { QrScanner, type QrScannerStart } from './QrScanner';

describe('QrScanner', () => {
  function enableCameraSupport() {
    Object.defineProperty(global.navigator, 'mediaDevices', {
      value: { getUserMedia: vi.fn() },
      configurable: true,
    });
  }

  it('debounces duplicate scans', async () => {
    enableCameraSupport();
    const onPayload = vi.fn(async () => {});
    let detect: ((value: string) => void) | null = null;
    const stop = vi.fn();
    const startScanner: QrScannerStart = vi.fn(async ({ onDetected }) => {
      detect = onDetected;
      return { stop };
    });

    render(<QrScanner onPayload={onPayload} startScanner={startScanner} />);

    fireEvent.click(screen.getByRole('button', { name: /scan qr/i }));
    await waitFor(() => expect(startScanner).toHaveBeenCalled());
    await act(async () => {
      detect?.('https://dayof.love/rsvp?token=guest-token-1');
      detect?.('https://dayof.love/rsvp?token=guest-token-1');
    });

    await waitFor(() => expect(onPayload).toHaveBeenCalledTimes(1));
  });

  it('cleans up the camera controller on unmount', async () => {
    enableCameraSupport();
    const stop = vi.fn();
    const startScanner: QrScannerStart = vi.fn(async () => ({ stop }));
    const { unmount } = render(<QrScanner onPayload={vi.fn()} startScanner={startScanner} />);

    fireEvent.click(screen.getByRole('button', { name: /scan qr/i }));
    await waitFor(() => expect(startScanner).toHaveBeenCalled());

    unmount();

    expect(stop).toHaveBeenCalledTimes(1);
  });

  it('supports the manual fallback', async () => {
    const onPayload = vi.fn(async () => {});
    render(<QrScanner onPayload={onPayload} />);

    fireEvent.change(screen.getByPlaceholderText(/paste a guest check-in url or invite token/i), {
      target: { value: 'guest-token-1' },
    });
    fireEvent.click(screen.getByRole('button', { name: /validate code/i }));

    await waitFor(() => expect(onPayload).toHaveBeenCalledWith('guest-token-1'));
  });
});
