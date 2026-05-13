import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Camera, CameraOff, Loader2, ScanLine } from 'lucide-react';

import { Button } from '../../../components/ui';
import { mapDetectorFormat, normalizeRegistryBarcode } from '../../../lib/registryBarcode';

type DetectedBarcode = {
  rawValue?: string;
  format?: string | null;
};

type BarcodeDetectorShape = {
  detect(source: ImageBitmapSource): Promise<DetectedBarcode[]>;
};

type BarcodeDetectorConstructor = {
  new (options?: { formats?: string[] }): BarcodeDetectorShape;
  getSupportedFormats?: () => Promise<string[]>;
};

type ScannerController = {
  stop: () => void | Promise<void>;
};

interface Props {
  value: string;
  disabled?: boolean;
  isLookingUp?: boolean;
  onChange: (value: string) => void;
  onConfirm: (value: string) => void;
}

const DETECTION_TARGET_COUNT = 3;
const PREFERRED_NATIVE_FORMATS = ['upc_a', 'upc_e', 'ean_13', 'ean_8', 'itf-14'];

function getBarcodeDetector() {
  return (globalThis as typeof globalThis & { BarcodeDetector?: BarcodeDetectorConstructor }).BarcodeDetector;
}

function loadImageElement(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('image-load-failed'));
    image.src = url;
  });
}

async function decodeBarcodePhoto(file: File, detectorSupported: boolean): Promise<DetectedBarcode | null> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await loadImageElement(objectUrl);

    if (detectorSupported) {
      const detectorCtor = getBarcodeDetector();
      if (detectorCtor) {
        const supportedFormats = await detectorCtor.getSupportedFormats?.().catch(() => []) ?? [];
        const detector = new detectorCtor({
          formats: supportedFormats.length > 0
            ? PREFERRED_NATIVE_FORMATS.filter((format) => supportedFormats.includes(format))
            : PREFERRED_NATIVE_FORMATS,
        });
        const detection = (await detector.detect(image))
          .find((entry) => normalizeRegistryBarcode(entry.rawValue ?? '').ok);
        if (detection?.rawValue) return detection;
      }
    }

    const [{ BrowserMultiFormatReader }, { BarcodeFormat }] = await Promise.all([
      import('@zxing/browser'),
      import('@zxing/library'),
    ]);
    const reader = new BrowserMultiFormatReader();
    reader.possibleFormats = [
      BarcodeFormat.EAN_8,
      BarcodeFormat.EAN_13,
      BarcodeFormat.ITF,
      BarcodeFormat.UPC_A,
      BarcodeFormat.UPC_E,
    ];
    const result = await reader.decodeFromImageElement(image);
    const formatValue = result.getBarcodeFormat?.();
    const format = typeof formatValue === 'number'
      ? (BarcodeFormat as unknown as Record<number, string>)[formatValue] ?? null
      : null;

    return {
      rawValue: result.getText(),
      format,
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
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
  const [detectedFormat, setDetectedFormat] = useState<string | null>(null);
  const [photoDecoding, setPhotoDecoding] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);
  const scannerControllerRef = useRef<ScannerController | null>(null);
  const stableDetectionRef = useRef<{ value: string; count: number }>({ value: '', count: 0 });

  const stopScanner = useCallback(() => {
    if (timerRef.current != null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    const activeController = scannerControllerRef.current;
    scannerControllerRef.current = null;
    try {
      activeController?.stop();
    } catch {
      // ignore stop cleanup errors
    }

    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const registerDetection = useCallback((rawValue: string, format?: string | null) => {
    const normalized = normalizeRegistryBarcode(rawValue);
    if (!normalized.ok) return false;

    onChange(normalized.raw);
    const previous = stableDetectionRef.current;
    const nextCount = previous.value === normalized.raw ? previous.count + 1 : 1;
    stableDetectionRef.current = { value: normalized.raw, count: nextCount };
    const mappedFormat = mapDetectorFormat(format);
    setDetectedFormat(mappedFormat ?? format ?? null);

    if (nextCount >= DETECTION_TARGET_COUNT) {
      onConfirm(normalized.raw);
      stableDetectionRef.current = { value: '', count: 0 };
      setCameraActive(false);
      return true;
    }

    return false;
  }, [onChange, onConfirm]);

  const inputHint = useMemo(() => {
    if (cameraError) return cameraError;
    if (detectedFormat) return `Stable ${detectedFormat.replace(/_/g, ' ')} detected. Review before saving.`;
    if (!mediaSupported) return 'Live camera scanning is not available here. You can use a barcode photo or enter the code by hand.';
    if (!detectorSupported) return 'Compatibility camera scanning is ready here. If live scan is awkward, use a barcode photo instead.';
    return 'Scan the barcode 2 to 3 times, use a barcode photo, or type it by hand if camera access is awkward.';
  }, [cameraError, detectedFormat, detectorSupported, mediaSupported]);

  useEffect(() => () => {
    stopScanner();
  }, [stopScanner]);

  useEffect(() => {
    if (!cameraActive || !mediaSupported || !videoRef.current) return;

    let cancelled = false;
    const videoElement = videoRef.current;

    async function startNativeScanner() {
      const detectorCtor = getBarcodeDetector();
      if (!detectorCtor) throw new Error('native-detector-missing');

      const supportedFormats = await detectorCtor.getSupportedFormats?.().catch(() => []) ?? [];
      const detector = new detectorCtor({
        formats: supportedFormats.length > 0
          ? PREFERRED_NATIVE_FORMATS.filter((format) => supportedFormats.includes(format))
          : PREFERRED_NATIVE_FORMATS,
      });

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      });

      if (cancelled) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      streamRef.current = stream;
      videoElement.srcObject = stream;
      await videoElement.play();

      const scanFrame = async () => {
        if (cancelled) return;
        try {
          const detections = await detector.detect(videoElement);
          const first = detections.find((entry) => normalizeRegistryBarcode(entry.rawValue ?? '').ok);
          if (first?.rawValue) {
            const confirmed = registerDetection(first.rawValue, first.format ?? null);
            if (confirmed) {
              stopScanner();
              return;
            }
          }
        } catch {
          // ignore transient native frame failures
        }

        timerRef.current = window.setTimeout(() => {
          void scanFrame();
        }, 350);
      };

      scannerControllerRef.current = {
        stop: () => {
          if (timerRef.current != null) {
            window.clearTimeout(timerRef.current);
            timerRef.current = null;
          }
          stream.getTracks().forEach((track) => track.stop());
        },
      };

      void scanFrame();
    }

    async function startCompatibilityScanner() {
      const [{ BrowserMultiFormatReader }, { BarcodeFormat, NotFoundException }] = await Promise.all([
        import('@zxing/browser'),
        import('@zxing/library'),
      ]);

      const reader = new BrowserMultiFormatReader();
      reader.possibleFormats = [
        BarcodeFormat.EAN_8,
        BarcodeFormat.EAN_13,
        BarcodeFormat.ITF,
        BarcodeFormat.UPC_A,
        BarcodeFormat.UPC_E,
      ];

      const controls = await reader.decodeFromConstraints(
        {
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        },
        videoElement,
        (result, error) => {
          if (cancelled) return;

          if (result) {
            const formatValue = result.getBarcodeFormat?.();
            const format = typeof formatValue === 'number'
              ? (BarcodeFormat as unknown as Record<number, string>)[formatValue] ?? null
              : null;
            const confirmed = registerDetection(result.getText(), format);
            if (confirmed) {
              controls.stop();
            }
            return;
          }

          if (error && !(error instanceof NotFoundException) && error?.name !== 'NotFoundException') {
            // ignore transient compatibility-reader decode misses
          }
        },
      );

      if (cancelled) {
        controls.stop();
        return;
      }

      scannerControllerRef.current = {
        stop: () => {
          controls.stop();
          if (typeof (reader as { reset?: () => void }).reset === 'function') {
            (reader as { reset?: () => void }).reset?.();
          }
        },
      };
    }

    setCameraError(null);

    void (async () => {
      try {
        if (detectorSupported) {
          await startNativeScanner();
        } else {
          await startCompatibilityScanner();
        }
      } catch {
        if (!cancelled) {
          setCameraError('Camera access was blocked. Use a barcode photo or enter the code by hand instead.');
          setCameraActive(false);
          stopScanner();
        }
      }
    })();

    return () => {
      cancelled = true;
      stopScanner();
    };
  }, [cameraActive, detectorSupported, mediaSupported, registerDetection, stopScanner]);

  async function handlePhotoSelection(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setCameraError(null);
    setDetectedFormat(null);
    setPhotoDecoding(true);
    setCameraActive(false);
    stopScanner();

    try {
      const detection = await decodeBarcodePhoto(file, detectorSupported);
      if (!detection?.rawValue) {
        throw new Error('no-detection');
      }
      setBarcodeFromPhoto(detection.rawValue, detection.format ?? null);
    } catch {
      setCameraError('That photo did not produce a readable barcode. Try another angle or enter the code by hand.');
    } finally {
      setPhotoDecoding(false);
    }
  }

  function setBarcodeFromPhoto(rawValue: string, format: string | null) {
    const normalized = normalizeRegistryBarcode(rawValue);
    if (!normalized.ok) {
      setCameraError('That photo did not produce a valid barcode. Enter the code by hand instead.');
      return;
    }
    onChange(normalized.raw);
    const mappedFormat = mapDetectorFormat(format);
    setDetectedFormat(mappedFormat ?? format ?? null);
    onConfirm(normalized.raw);
  }

  return (
    <div className="space-y-3 rounded-lg border border-border-subtle bg-surface-subtle/40 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-text-primary">Scan a barcode</p>
          <p className="mt-1 text-xs text-text-secondary">{inputHint}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(event) => {
              void handlePhotoSelection(event);
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled || photoDecoding}
            onClick={() => {
              fileInputRef.current?.click();
            }}
          >
            {photoDecoding ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <ScanLine className="mr-2 h-4 w-4" />
            )}
            Use photo
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled || !mediaSupported || photoDecoding}
            onClick={() => {
              setCameraError(null);
              setDetectedFormat(null);
              stableDetectionRef.current = { value: '', count: 0 };
              if (cameraActive) {
                stopScanner();
                setCameraActive(false);
                return;
              }
              setCameraActive(true);
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
                Start camera
              </>
            )}
          </Button>
        </div>
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
