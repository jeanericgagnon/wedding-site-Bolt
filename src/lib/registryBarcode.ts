export type RegistryBarcodeFormat =
  | 'upc_a'
  | 'upc_e'
  | 'ean_13'
  | 'ean_8'
  | 'gtin_14'
  | 'isbn_10'
  | 'isbn_13';

export type RegistryBarcodeValidation =
  | { ok: true; raw: string; normalized: string; format: RegistryBarcodeFormat; digits: string }
  | { ok: false; reason: string };

function digitsOnly(value: string) {
  return value.replace(/\D/g, '');
}

function isRepeating(value: string) {
  return /^(\d)\1+$/.test(value);
}

function computeModulo10CheckDigit(body: string) {
  const digits = body.split('').reverse().map(Number);
  const sum = digits.reduce((total, digit, index) => total + (digit * (index % 2 === 0 ? 3 : 1)), 0);

  return (10 - (sum % 10)) % 10;
}

function isValidModulo10(value: string) {
  if (!/^\d+$/.test(value) || value.length < 8) return false;
  const body = value.slice(0, -1);
  return computeModulo10CheckDigit(body) === Number(value.slice(-1));
}

function computeIsbn10CheckDigit(body: string) {
  const digits = body.split('').map(Number);
  const sum = digits.reduce((total, digit, index) => total + (digit * (10 - index)), 0);
  const remainder = 11 - (sum % 11);
  if (remainder === 10) return 'X';
  if (remainder === 11) return '0';
  return String(remainder % 11);
}

function isValidIsbn10(value: string) {
  if (!/^\d{9}[\dX]$/i.test(value)) return false;
  return computeIsbn10CheckDigit(value.slice(0, 9)) === value.slice(-1).toUpperCase();
}

function expandUpcE(value: string) {
  if (!/^\d{8}$/.test(value)) return null;
  const [numberSystem, m1, m2, m3, m4, m5, m6] = value.split('');
  let expandedBody = '';

  switch (m6) {
    case '0':
    case '1':
    case '2':
      expandedBody = `${numberSystem}${m1}${m2}${m6}0000${m3}${m4}${m5}`;
      break;
    case '3':
      expandedBody = `${numberSystem}${m1}${m2}${m3}00000${m4}${m5}`;
      break;
    case '4':
      expandedBody = `${numberSystem}${m1}${m2}${m3}${m4}00000${m5}`;
      break;
    default:
      expandedBody = `${numberSystem}${m1}${m2}${m3}${m4}${m5}0000${m6}`;
      break;
  }

  const checkDigit = value.slice(-1);
  const expanded = `${expandedBody}${checkDigit}`;
  return isValidModulo10(expanded) ? expanded : null;
}

export function normalizeRegistryBarcode(rawValue: string): RegistryBarcodeValidation {
  const raw = rawValue.trim();
  const digits = digitsOnly(raw);

  if (!digits) return { ok: false, reason: 'Enter a barcode.' };
  if (isRepeating(digits)) return { ok: false, reason: 'That barcode does not look valid.' };

  if (digits.length === 8 && isValidModulo10(digits)) {
    const upcA = expandUpcE(digits);
    if (upcA) {
      return { ok: true, raw, normalized: upcA, format: 'upc_e', digits };
    }
    return { ok: true, raw, normalized: digits, format: 'ean_8', digits };
  }

  if (digits.length === 12 && isValidModulo10(digits)) {
    return { ok: true, raw, normalized: digits, format: 'upc_a', digits };
  }

  if (digits.length === 13 && /^\d{13}$/.test(digits)) {
    if (digits.startsWith('978') || digits.startsWith('979')) {
      if (isValidModulo10(digits)) {
        return { ok: true, raw, normalized: digits, format: 'isbn_13', digits };
      }
      return { ok: false, reason: 'That ISBN check digit does not match.' };
    }
    if (isValidModulo10(digits)) {
      return { ok: true, raw, normalized: digits, format: 'ean_13', digits };
    }
    return { ok: false, reason: 'That EAN check digit does not match.' };
  }

  if (digits.length === 14 && isValidModulo10(digits)) {
    return { ok: true, raw, normalized: digits, format: 'gtin_14', digits };
  }

  const isbnCandidate = raw.replace(/[-\s]/g, '').toUpperCase();
  if (isbnCandidate.length === 10 && isValidIsbn10(isbnCandidate)) {
    return { ok: true, raw, normalized: isbnCandidate, format: 'isbn_10', digits: isbnCandidate.replace(/\D/g, '') };
  }

  return { ok: false, reason: 'Use a valid UPC, EAN, GTIN, or ISBN barcode.' };
}

export function mapDetectorFormat(format: string | null | undefined): RegistryBarcodeFormat | null {
  const normalized = String(format ?? '').trim().toLowerCase();
  if (!normalized) return null;
  if (normalized === 'upc_a' || normalized === 'upc_e' || normalized === 'ean_13' || normalized === 'ean_8') {
    return normalized;
  }
  if (normalized === 'itf' || normalized === 'itf-14') return 'gtin_14';
  if (normalized === 'isbn') return 'isbn_13';
  return null;
}
