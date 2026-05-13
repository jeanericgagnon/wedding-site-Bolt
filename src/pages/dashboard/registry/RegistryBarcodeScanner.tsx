import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Camera, CameraOff, Loader2, ScanLine } from 'lucide-react';

import { Button } from '../../../components/ui';
import { mapDetectorFormat, normalizeRegistryBarcode } from '../../../lib/registryBarcode';

type DetectedBarcode = {
  rawValue?: string;
  format?: string;
};

type BarcodeDetectorShape = {
  detect(source: ImageBitmapSource): Promise<DetectedBarcode[]>;
};

type BarcodeDetectorConstructor = {
  new (options?: { formats?: string[] }): BarcodeDetectorShape;
  getSupportedFormats?: () => Promise<string[]>;
};

interface Props {
  value: string;
  disabled?: boolean;
  isLookingUp?: boolean;
  onChange: (value: string) => void;
  onConfirm: (value: string) => void;
}

const DETECTION_TARGET_COUNT = 3;

function getBarcodeDetector() {
  return (globalThis as typeof globalThis & { BarcodeDetector?: BarcodeDetectorConstructor }).BarcodeDetector;
}

export const RegistryBarcodeScanner: React.FC<Props> = ({
  value,
  disabled = false,
  isLookingUp = false,
  onChange,
  onConfirm,
}) => {
  const detectorSupported = typeof window !== 'undefined' && typeof navigator !== 'undefined' && Boolean(getBarcodeDetector());
  const mediaSupported = typeof window !== 'undefined' && typeof navigator !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scannerLabel, setScannerLabel] = useState<string>('Start camera');
  const [detectedFormat, setDetectedFormat] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);
  const stableDetectionRef = useRef<{ value: string; count: number }>({ value: '', count: 0 });

  const inputHint = useMemo(() => {
    if (!detectorSupported || !mediaSupported) return 'Camera scanning is not available here. You can still enter the barcode by hand.';
    if (cameraError) return cameraError;
    if (detectedFormat) return `Stable ${detectedFormat.replace(/_/g, ' ')} detected. Review before saving.`;
    return 'Scan the barcode 2 to 3 times or type it by hand if camera access is awkward.';
  }, [cameraError, detectedFormat, detectorSupported, mediaSupported]);

  useEffect(() => () => {
    if (timerRef.current != null) window.clearTimeout(timerRef.current);
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => {
    if (!cameraActive || !detectorSupported || !mediaSupported || !videoRef.current) return;

    let cancelled = false;
    const videoElement = videoRef.current;
    async function start() {
      try {
        const detectorCtor = getBarcodeDetector();
        if (!detectorCtor) return;

        const formats = await detectorCtor.getSupportedFormats?.().catch(() => []);
        const supportedFormats = Array.isArray(formats) ? formats : [];
        const preferredFormats = ['upc_a', 'upc_e', 'ean_13', 'ean_8', 'itf-14'];
        const detector = new detectorCtor({
          formats: supportedFormats.length ? preferredFormats.filter((format) => supportedFormats.includes(format)) : preferredFormats,
        });

        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
          },
          audio: false,
        });

        if (!detector || cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        const video = videoElement;
        if (!video) return;
        video.srcObject = stream;
        await video.play();
        setScannerLabel('Scanning…');
        setCameraError(null);

        const scan = async () => {
          if (cancelled || !videoElement) return;
          try {
            const detections = await detector.detect(videoElement);
            const first = detections.find((entry) => normalizeRegistryBarcode(entry.rawValue ?? '').ok);
            if (first?.rawValue) {
              const normalized = normalizeRegistryBarcode(first.rawValue);
              if (normalized.ok) {
                onChange(normalized.raw);
                const previous = stableDetectionRef.current;
                const nextCount = previous.value === normalized.raw ? previous.count + 1 : 1;
                stableDetectionRef.current = { value: normalized.raw, count: nextCount };
                const mappedFormat = mapDetectorFormat(first.format);
                setDetectedFormat(mappedFormat ?? first.format ?? null);
                if (nextCount >= DETECTION_TARGET_COUNT) {
                  onConfirm(normalized.raw);
                  stableDetectionRef.current = { value: '', count: 0 };
                  setCameraActive(false);
                  return;
                }
              }
            }
          } catch {
            // Ignore transient frame errors.
          }

          timerRef.current = window.setTimeout(() => {
            void scan();
          }, 350);
        };

        void scan();
      } catch {
        if (!cancelled) {
          setCameraError('Camera access was blocked. Enter the barcode by hand instead.');
          setCameraActive(false);
        }
      }
    }

    void start();

    return () => {
      cancelled = true;
      if (timerRef.current != null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      if (videoElement) videoElement.srcObject = null;
      setScannerLabel('Start camera');
    };
  }, [cameraActive, detectorSupported, mediaSupported, onChange, onConfirm]);

  return (
    <div className="space-y-3 rounded-lg border border-border-subtle bg-surface-subtle/40 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-text-primary">Scan a barcode</p>
          <p className="mt-1 text-xs text-text-secondary">{inputHint}</p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || !mediaSupported || !detectorSupported}
          onClick={() => {
            setCameraError(null);
            setDetectedFormat(null);
            setCameraActive((previous) => !previous);
          }}
        >
          {cameraActive ? (
            <>
              <CameraOff className="mr-2 h-4 w-4" />
              Stop camera
            </>
          ) : (
            <>
              <Camera className="mr-2 h-4 w-4" />
              {scannerLabel}
            </>
          )}
        </Button>
      </div>

      {cameraActive && (
        <div className="overflow-hidden rounded-lg border border-border-subtle bg-black">
          <video
            ref={videoRef}
            className="aspect-[4/3] w-full object-cover"
            playsInline
            muted
          />
        </div>
      )}

      <div className="flex gap-2">
        <div className="relative flex-1">
          <ScanLine className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
          <input
            type="text"
            inputMode="numeric"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder="UPC, EAN, GTIN, or ISBN"
            className="w-full rounded-lg border border-border bg-white py-2.5 pl-9 pr-3 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>
        <Button
          type="button"
          variant="primary"
          size="sm"
          disabled={disabled || isLookingUp || !value.trim()}
          onClick={() => onConfirm(value)}
        >
          {isLookingUp ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Look up'}
        </Button>
      </div>
    </div>
  );
};
