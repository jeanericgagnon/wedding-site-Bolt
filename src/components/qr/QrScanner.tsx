import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Camera, CameraOff, Loader2, ScanLine } from 'lucide-react';

import { Button, Input } from '../ui';

export type QrScannerVisualState =
  | 'idle'
  | 'camera-unavailable'
  | 'permission-denied'
  | 'scanning'
  | 'scan-found'
  | 'validating';

export type QrScannerController = {
  stop: () => void | Promise<void>;
};

export type QrScannerStart = (args: {
  video: HTMLVideoElement;
  onDetected: (text: string) => void;
}) => Promise<QrScannerController>;

export interface QrScannerProps {
  busy?: boolean;
  cooldownMs?: number;
  manualPlaceholder?: string;
  onPayload: (value: string) => Promise<void> | void;
  startScanner?: QrScannerStart;
}

const DEFAULT_COOLDOWN_MS = 2500;

async function defaultStartScanner(args: {
  video: HTMLVideoElement;
  onDetected: (text: string) => void;
}): Promise<QrScannerController> {
  const { BrowserQRCodeReader } = await import('@zxing/browser');
  const reader = new BrowserQRCodeReader();
  const controls = await reader.decodeFromVideoDevice(undefined, args.video, (result) => {
    const text = result?.getText?.();
    if (text) args.onDetected(text);
  });

  return {
    stop: () => {
      try {
        controls.stop();
      } finally {
        const stream = args.video.srcObject;
        if (stream && 'getTracks' in stream) {
          (stream as MediaStream).getTracks().forEach((track) => track.stop());
        }
        args.video.srcObject = null;
      }
    },
  };
}

export const QrScanner: React.FC<QrScannerProps> = ({
  busy = false,
  cooldownMs = DEFAULT_COOLDOWN_MS,
  manualPlaceholder = 'Paste a guest check-in URL or invite token',
  onPayload,
  startScanner = defaultStartScanner,
}) => {
  const [manualValue, setManualValue] = useState('');
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [visualState, setVisualState] = useState<QrScannerVisualState>(() => (
    typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia ? 'camera-unavailable' : 'idle'
  ));
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const controllerRef = useRef<QrScannerController | null>(null);
  const lastScanRef = useRef<{ value: string; at: number }>({ value: '', at: 0 });

  const stopScanner = useCallback(() => {
    const controller = controllerRef.current;
    controllerRef.current = null;
    try {
      controller?.stop();
    } catch {
      // ignore cleanup failures
    }
    setCameraActive(false);
  }, []);

  const emitPayload = useCallback(async (raw: string) => {
    const normalized = raw.trim();
    if (!normalized) return;
    const now = Date.now();
    if (lastScanRef.current.value === normalized && now - lastScanRef.current.at < cooldownMs) return;
    lastScanRef.current = { value: normalized, at: now };
    setVisualState('scan-found');
    await onPayload(normalized);
  }, [cooldownMs, onPayload]);

  const startCamera = useCallback(async () => {
    if (!videoRef.current || busy) return;
    setCameraError(null);
    setVisualState('scanning');
    try {
      controllerRef.current = await startScanner({
        video: videoRef.current,
        onDetected: (text) => {
          void emitPayload(text);
        },
      });
      setCameraActive(true);
    } catch (error) {
      const message = error instanceof Error ? error.message.toLowerCase() : '';
      const permissionDenied = message.includes('denied') || message.includes('notallowed');
      setCameraActive(false);
      setVisualState(permissionDenied ? 'permission-denied' : 'camera-unavailable');
      setCameraError(permissionDenied ? 'Camera permission is blocked on this device.' : 'Camera scanning is unavailable here.');
    }
  }, [busy, emitPayload, startScanner]);

  useEffect(() => () => {
    stopScanner();
  }, [stopScanner]);

  useEffect(() => {
    if (busy) setVisualState('validating');
    else if (cameraActive) setVisualState('scanning');
  }, [busy, cameraActive]);

  const hint = useMemo(() => {
    if (cameraError) return cameraError;
    switch (visualState) {
      case 'camera-unavailable':
        return 'Camera scanning is unavailable here. Use the manual fallback.';
      case 'permission-denied':
        return 'Camera permission is blocked. Use the manual fallback or re-enable camera access.';
      case 'scan-found':
        return 'Code found. Validating it against this event now.';
      case 'validating':
        return 'Validating the guest and event before any check-in happens.';
      case 'scanning':
        return 'Point the camera at the guest check-in QR. Repeated scans are automatically debounced.';
      default:
        return 'Use camera scanning when available, or paste a guest check-in link/token below.';
    }
  }, [cameraError, visualState]);

  return (
    <div className="rounded-xl border border-border/60 bg-surface-subtle/20 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => void startCamera()} disabled={busy || visualState === 'camera-unavailable'}>
          <Camera className="h-4 w-4" />
          {cameraActive ? 'Restart camera' : 'Scan QR'}
        </Button>
        {cameraActive && (
          <Button type="button" variant="ghost" size="sm" onClick={stopScanner} disabled={busy}>
            <CameraOff className="h-4 w-4" />
            Stop
          </Button>
        )}
        {busy && (
          <span className="inline-flex items-center gap-1 rounded-xl border border-primary/20 bg-primary/5 px-2 py-1 text-[11px] text-primary">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Validating
          </span>
        )}
      </div>

      <div className="mt-3 overflow-hidden rounded-xl border border-border/50 bg-black/90">
        <div className="relative aspect-[4/3] w-full">
          <video ref={videoRef} className={`h-full w-full object-cover ${cameraActive ? 'block' : 'hidden'}`} muted playsInline />
          {!cameraActive && (
            <div className="flex h-full w-full flex-col items-center justify-center gap-2 p-4 text-center text-white/85">
              <ScanLine className="h-8 w-8" />
              <p className="text-sm font-medium">Camera ready when you are</p>
              <p className="max-w-xs text-xs text-white/70">{hint}</p>
            </div>
          )}
        </div>
      </div>

      <p className="mt-2 text-[11px] text-text-secondary">{hint}</p>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <Input
          value={manualValue}
          onChange={(event) => setManualValue(event.target.value)}
          placeholder={manualPlaceholder}
          className="text-sm"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={busy || !manualValue.trim()}
          onClick={() => {
            void emitPayload(manualValue);
          }}
        >
          Validate code
        </Button>
      </div>
    </div>
  );
};
