import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { RegistryBarcodeScanner } from './RegistryBarcodeScanner';

const originalMediaDevices = navigator.mediaDevices;
const originalBarcodeDetector = (globalThis as typeof globalThis & { BarcodeDetector?: unknown }).BarcodeDetector;

function setMediaDevices(value: MediaDevices | undefined) {
  Object.defineProperty(globalThis.navigator, 'mediaDevices', {
    configurable: true,
    value,
  });
}

function setBarcodeDetector(value: unknown) {
  Object.defineProperty(globalThis, 'BarcodeDetector', {
    configurable: true,
    value,
  });
}

describe('RegistryBarcodeScanner', () => {
  beforeEach(() => {
    setMediaDevices(originalMediaDevices);
    setBarcodeDetector(originalBarcodeDetector);
  });

  afterEach(() => {
    setMediaDevices(originalMediaDevices);
    setBarcodeDetector(originalBarcodeDetector);
    vi.restoreAllMocks();
  });

  it('surfaces photo + manual fallback when live camera access is unavailable', () => {
    setMediaDevices(undefined);
    setBarcodeDetector(undefined);

    render(
      <RegistryBarcodeScanner
        value=""
        onChange={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );

    expect(screen.getByText('Photo + manual fallback')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /start camera/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /use photo/i })).toBeEnabled();
  });

  it('surfaces compatibility camera copy when BarcodeDetector is missing', () => {
    setMediaDevices({ getUserMedia: vi.fn() } as unknown as MediaDevices);
    setBarcodeDetector(undefined);

    render(
      <RegistryBarcodeScanner
        value=""
        onChange={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );

    expect(screen.getByText('Compatibility camera + photo fallback')).toBeInTheDocument();
    expect(screen.getByText(/compatibility scanner path/i)).toBeInTheDocument();
  });

  it('shows recovery actions when camera permission is blocked', async () => {
    setMediaDevices({
      getUserMedia: vi.fn().mockRejectedValue(new Error('blocked')),
    } as unknown as MediaDevices);
    setBarcodeDetector(class FakeBarcodeDetector {
      static async getSupportedFormats() {
        return ['upc_a'];
      }

      async detect() {
        return [];
      }
    });

    render(
      <RegistryBarcodeScanner
        value=""
        onChange={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /start camera/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: /try camera again/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /use photo instead/i })).toBeInTheDocument();
  });
});
