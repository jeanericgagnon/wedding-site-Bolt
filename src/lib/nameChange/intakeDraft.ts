import { canonicalizeNameChangeDocumentKind } from './documentKinds';
import type { NameChangeDocumentInput, NameChangeExtractedFieldInput } from './types';

const SUPPORTED_DRAFT_DOCUMENT_KINDS = new Set<NameChangeDocumentInput['document_kind']>([
  'marriage_certificate',
  'court_order',
  'court_order_name_change',
  'current_drivers_license',
  'current_passport',
  'social_security_card',
  'benefits_account_record',
  'insurance_card',
  'professional_license_record',
  'birth_certificate',
  'proof_of_address',
  'other',
]);

const SUPPORTED_DRAFT_FIELD_KEYS = new Set<NameChangeExtractedFieldInput['field_key']>([
  'first_name',
  'middle_name',
  'last_name',
  'spouse_last_name',
  'issuance_date',
  'certificate_number',
  'case_number',
  'county',
  'court_order_date',
]);

const DRAFT_LABEL_SEPARATOR_PATTERN = '[:;#=.|。/:／⁄⧸ᐟ~∼〜：；︓︔﹕﹔∶꞉＃＝﹦｜∣ǀ❘⏐\\-–—]';
const DRAFT_WRAPPING_CHAR_PATTERN = /^["'([{<«‹「『【《〈（]+|["')\]}>»›」』】》〉）]+$/g;
const DRAFT_VALUE_PREFIX_PATTERN = /^[~∼〜]+\s*/;
const DRAFT_QUOTE_PREFIX_PATTERN = /^(?:>+|[›»])\s*/;

function humanizeDraftToken(value: string) {
  return value
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function normalizeDraftText(value: string | null | undefined) {
  return (value ?? '').trim().replace(/\s+/g, ' ');
}

function stripLeadingDraftValueMarker(value: string) {
  return value.replace(/^(?:(?:\[(?:x|X| )\]|\((?:x|X| )\)|[☐☑☒✓✔✗✘])\s*|[•*·●○◦▪■]+\s*|\d+[.)-]\s+)/, '').trim();
}

function stripLeadingDraftValuePrefix(value: string) {
  return value.replace(DRAFT_VALUE_PREFIX_PATTERN, '').trim();
}

function stripLeadingDraftQuotePrefix(value: string) {
  return value.replace(DRAFT_QUOTE_PREFIX_PATTERN, '').trim();
}

function stripLeadingDraftValueNoise(value: string) {
  let cleanedValue = value.trim();

  while (cleanedValue) {
    const nextValue = stripLeadingDraftQuotePrefix(
      stripLeadingDraftValuePrefix(stripLeadingDraftValueMarker(cleanedValue)),
    );

    if (nextValue === cleanedValue) {
      return cleanedValue;
    }

    cleanedValue = nextValue;
  }

  return cleanedValue;
}

function buildDraftMaskedFileName(kind: NameChangeDocumentInput['document_kind']) {
  return `${kind.replace(/_/g, '-')}-draft.pdf`;
}

export function isDraftNameChangeMaskedFileName(fileName: string | null | undefined) {
  return typeof fileName === 'string' && /-draft\.pdf$/i.test(fileName.trim());
}

function isRequestedDraftDocumentId(documentId: string | null | undefined) {
  return typeof documentId === 'string' && documentId.trim().toLowerCase().startsWith('draft');
}

function shouldBlockDraftDocumentFieldWrite(documentId: string | null | undefined, normalizedDocumentId: string | null) {
  const trimmedDocumentId = typeof documentId === 'string' ? documentId.trim() : '';
  const requestedBareDraftDocumentId = /^draft$/i.test(trimmedDocumentId);
  const requestedFallbackOtherDraftDocumentId = isRequestedDraftDocumentId(documentId) && !normalizedDocumentId;
  return isRequestedDraftDocumentId(documentId) && (requestedBareDraftDocumentId || requestedFallbackOtherDraftDocumentId);
}

function normalizeDraftDocumentKind(value: string) {
  const normalizedKind = value
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .toLowerCase()
    .replace(/\bno\.?\b/g, 'number')
    .replace(/[+#,&()\\/.:\-'’\s]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');

  const strippedVersionKind = normalizedKind
    .replace(/(?:_(?:page_\d+|page|v\d+|version_\d+|\d+))+$/g, '')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');

  const strippedSuffixKind = strippedVersionKind
    .replace(/^(?:(?:document|documents|doc|copy|scan|scanned|upload|uploaded|file|image|photo|pdf|png|jpg|jpeg|webp|heic|heif|tif|tiff)_)+/g, '')
    .replace(/(?:_(?:document|documents|doc|copy|scan|scanned|upload|uploaded|file|image|photo|front|back|pdf|png|jpg|jpeg|webp|heic|heif|tif|tiff))+$/g, '')
    .replace(/^(?:(?:reviewed|review|final|edited|cropped|processed|renamed|latest|new|temp|tmp|attachment)_)+/g, '')
    .replace(/(?:_(?:reviewed|review|final|edited|cropped|processed|renamed|latest|new|temp|tmp|attachment|page))+$/g, '')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');

  const kindAliases: Record<string, NameChangeDocumentInput['document_kind']> = {
    marriage_cert: 'marriage_certificate',
    marriage_license: 'marriage_certificate',
    marriage_license_copy: 'marriage_certificate',
    marriage_record: 'marriage_certificate',
    marriage_license_certificate: 'marriage_certificate',
    court_decree: 'court_order',
    name_change_decree: 'court_order',
    name_change_order: 'court_order',
    passport: 'current_passport',
    passport_book: 'current_passport',
    passport_card: 'current_passport',
    driver_license: 'current_drivers_license',
    driver_license_state_id: 'current_drivers_license',
    drivers_license: 'current_drivers_license',
    driver_s_license: 'current_drivers_license',
    driver_licence: 'current_drivers_license',
    drivers_licence: 'current_drivers_license',
    driver_s_licence: 'current_drivers_license',
    dmv_id: 'current_drivers_license',
    state_id: 'current_drivers_license',
    state_identification: 'current_drivers_license',
    state_identification_card: 'current_drivers_license',
    state_id_card: 'current_drivers_license',
    social_security: 'social_security_card',
    social_security_card: 'social_security_card',
    social_security_ssa_card: 'social_security_card',
    social_security_number_card: 'social_security_card',
    ssa_card: 'social_security_card',
    ss_card: 'social_security_card',
    soc_sec_card: 'social_security_card',
    social_security_card_copy: 'social_security_card',
    ssn_card: 'social_security_card',
    benefits_statement: 'benefits_account_record',
    benefits_account: 'benefits_account_record',
    retirement_account: 'benefits_account_record',
    retirement_statement: 'benefits_account_record',
    pension_statement: 'benefits_account_record',
    pension_account: 'benefits_account_record',
    beneficiary_form: 'benefits_account_record',
    beneficiary_designation: 'benefits_account_record',
    beneficiary_record: 'benefits_account_record',
    '401k_statement': 'benefits_account_record',
    '401k_account': 'benefits_account_record',
    k_401_statement: 'benefits_account_record',
    k_401_account: 'benefits_account_record',
    _401_k_statement: 'benefits_account_record',
    _401_k_account: 'benefits_account_record',
    insurance_card: 'insurance_card',
    insurance_member_card: 'insurance_card',
    member_id_card: 'insurance_card',
    health_insurance_card: 'insurance_card',
    medical_insurance_card: 'insurance_card',
    professional_license_record: 'professional_license_record',
    professional_license_card: 'professional_license_record',
    professional_license_certificate: 'professional_license_record',
    license_card: 'professional_license_record',
    license_certificate: 'professional_license_record',
    license_renewal_notice: 'professional_license_record',
    credential_record: 'professional_license_record',
    birth_cert: 'birth_certificate',
    birth_record: 'birth_certificate',
    vital_record: 'birth_certificate',
    utility_bill: 'proof_of_address',
    utility_statement: 'proof_of_address',
    bank_statement: 'proof_of_address',
    lease_agreement: 'proof_of_address',
    mortgage_statement: 'proof_of_address',
    residence_proof: 'proof_of_address',
    proof_of_residence: 'proof_of_address',
    proof_of_residency: 'proof_of_address',
    residency_proof: 'proof_of_address',
    residency_document: 'proof_of_address',
    address_verification: 'proof_of_address',
    proof_address: 'proof_of_address',
  };

  const canonicalKind = (kindAliases[strippedSuffixKind] ?? kindAliases[normalizedKind] ?? strippedSuffixKind) as NameChangeDocumentInput['document_kind'];
  return SUPPORTED_DRAFT_DOCUMENT_KINDS.has(canonicalKind) ? canonicalKind : 'other';
}

function decodeDraftDocumentQueryValue(value: string | null | undefined) {
  if (!value) return null;
  try {
    return decodeURIComponent(value.replace(/\+/g, ' '));
  } catch {
    return value.replace(/\+/g, ' ');
  }
}

function extractDraftDocumentQueryFilename(documentId: string) {
  const directFilenameMatch = documentId.match(/[?&](?:filename|file|name)=([^&#]+)/i);
  if (directFilenameMatch?.[1]) return decodeDraftDocumentQueryValue(directFilenameMatch[1]);

  const contentDispositionMatch = documentId.match(/[?&](?:response-content-disposition|content-disposition)=([^&#]+)/i);
  const decodedDisposition = decodeDraftDocumentQueryValue(contentDispositionMatch?.[1]);
  if (!decodedDisposition) return null;

  const filenameContinuationParts = [...decodedDisposition.matchAll(/filename\*(\d+)\*?\s*=\s*([^;]+)/gi)]
    .map((match) => ({
      index: Number.parseInt(match[1] ?? '', 10),
      value: match[2]?.trim().replace(/^"|"$/g, '') ?? '',
    }))
    .filter((part) => Number.isFinite(part.index) && part.value);

  if (filenameContinuationParts.length > 0) {
    const sortedParts = filenameContinuationParts.sort((left, right) => left.index - right.index);
    const isContiguous = sortedParts.every((part, index) => part.index === index);
    if (isContiguous) {
      const [firstPart, ...remainingParts] = sortedParts;
      const firstPartValue = firstPart?.value ?? '';
      const charsetPrefixedValueMatch = firstPartValue.match(/^(?:[^']*'[^']*')?(.*)$/);
      const normalizedValue = [charsetPrefixedValueMatch?.[1] ?? firstPartValue, ...remainingParts.map((part) => part.value)].join('');
      const decodedValue = decodeDraftDocumentQueryValue(normalizedValue);
      if (decodedValue) return decodedValue;
    }
  }

  const utfFilenameMatch = decodedDisposition.match(/filename\*\s*=\s*(?:[^']*'[^']*')?([^;]+)/i);
  if (utfFilenameMatch?.[1]) {
    return decodeDraftDocumentQueryValue(utfFilenameMatch[1].trim().replace(/^"|"$/g, ''));
  }

  const filenameMatch = decodedDisposition.match(/filename\s*=\s*([^;]+)/i);
  if (!filenameMatch?.[1]) return null;
  return decodeDraftDocumentQueryValue(filenameMatch[1].trim().replace(/^"|"$/g, ''));
}

export function normalizeDraftFieldKey(value: string) {
  const normalizedFieldKey = value
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .toLowerCase()
    .replace(/#/g, ' number ')
    .replace(/\bno\.?\b/g, 'number')
    .replace(/[+#,&()\\/.:\-'’\s]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');

  const fieldAliases: Record<string, NameChangeExtractedFieldInput['field_key']> = {
    cert: 'certificate_number',
    issue_date: 'issuance_date',
    issued_date: 'issuance_date',
    issued_on: 'issuance_date',
    date_issued: 'issuance_date',
    date_of_issue: 'issuance_date',
    issue_dt: 'issuance_date',
    date_of_issuance: 'issuance_date',
    issuance_dt: 'issuance_date',
    issuance_on: 'issuance_date',
    signature_date: 'court_order_date',
    signing_date: 'court_order_date',
    filing_date: 'court_order_date',
    order_entry_date: 'court_order_date',
    issued_dt: 'issuance_date',
    signed_dt: 'court_order_date',
    executed_dt: 'court_order_date',
    filed_dt: 'court_order_date',
    entered_dt: 'court_order_date',
    signing_dt: 'court_order_date',
    entry_dt: 'court_order_date',
    cert_no: 'certificate_number',
    cert_num: 'certificate_number',
    certificate_no: 'certificate_number',
    record_number: 'certificate_number',
    cert_number: 'certificate_number',
    marriage_certificate_number: 'certificate_number',
    county_residence: 'county',
    county_of_residence: 'county',
    resident_county: 'county',
    county_lived_in: 'county',
    residence_county: 'county',
    county_residence_name: 'county',
    case: 'case_number',
    case_no: 'case_number',
    case_docket_number: 'case_number',
    case_num_no: 'case_number',
    case_num: 'case_number',
    docket_number: 'case_number',
    docket_no: 'case_number',
    signed_date: 'court_order_date',
    signed_on: 'court_order_date',
    order_date: 'court_order_date',
    order_signed_on: 'court_order_date',
    order_entered_on: 'court_order_date',
    order_filed_on: 'court_order_date',
    filed_date: 'court_order_date',
    filed_on: 'court_order_date',
    date_signed: 'court_order_date',
    date_of_signing: 'court_order_date',
    date_of_execution: 'court_order_date',
    date_of_filing: 'court_order_date',
    court_filed_date: 'court_order_date',
    execution_date: 'court_order_date',
    executed_on: 'court_order_date',
    entry_date: 'court_order_date',
    entered_date: 'court_order_date',
    entered_on: 'court_order_date',
    date_of_signature: 'court_order_date',
    date_of_entry: 'court_order_date',
    spouse_surname: 'spouse_last_name',
    spouse_family_name: 'spouse_last_name',
    surname: 'last_name',
    family_name: 'last_name',
    given_name: 'first_name',
    first_given_name: 'first_name',
    middle_initial: 'middle_name',
    middle_given_name: 'middle_name',
  };

  const canonicalFieldKey = (fieldAliases[normalizedFieldKey] ?? normalizedFieldKey) as NameChangeExtractedFieldInput['field_key'];
  return SUPPORTED_DRAFT_FIELD_KEYS.has(canonicalFieldKey) ? canonicalFieldKey : '' as NameChangeExtractedFieldInput['field_key'];
}

function parseDraftMonthName(monthName: string) {
  const normalizedMonthName = monthName.toLowerCase().replace(/\.$/, '');
  const monthMap = {
    january: 1, jan: 1,
    february: 2, feb: 2,
    march: 3, mar: 3,
    april: 4, apr: 4,
    may: 5,
    june: 6, jun: 6,
    july: 7, jul: 7,
    august: 8, aug: 8,
    september: 9, sep: 9, sept: 9,
    october: 10, oct: 10,
    november: 11, nov: 11,
    december: 12, dec: 12,
  } as const;

  return monthMap[normalizedMonthName as keyof typeof monthMap] ?? null;
}

function normalizeDraftDateValue(value: string) {
  const markerStrippedValue = stripLeadingDraftValueNoise(value);
  const rawOffsetPattern = '[+-](?:\\d{1,2}|\\d{3,4}|\\d{1,2}:\\d{2})';
  const namedOffsetPattern = '(?:UTC|GMT)[+-]?(?:\\d{1,2}|\\d{3,4}|\\d{1,2}:\\d{2})?';
  const zoneTokenPattern = `(?:Z|${rawOffsetPattern}|${namedOffsetPattern}|[A-Za-z]{2,5}|[A-Za-z_-]+(?:\\/[A-Za-z_-]+)+|\\([^)]*\\)|\\[[^\\]]+\\])`;
  const weekdayPrefixPattern = /^(?:(?:mon|tues|wednes|thurs|fri|satur|sun)day|(?:mon|tue|tues|wed|thu|thur|thurs|fri|sat|sun))\b[,.\s-]*/i;
  const dateLabelPrefixPattern = new RegExp(
    `^(?:(?:date of signature|date of issuance|date of issue|date of order|date of filing|issuance date|issue date|issued date|signed date|order date|filed date|date issued|date signed|date filed|dated|date)(?:\\s*${DRAFT_LABEL_SEPARATOR_PATTERN}\\s*|\\s+)|(?:issued|signed|filed|dated)\\s+(?:on(?:\\s*${DRAFT_LABEL_SEPARATOR_PATTERN}\\s*|\\s+))?|(?:executed|entered)\\s+(?:on(?:\\s*${DRAFT_LABEL_SEPARATOR_PATTERN}\\s*|\\s+))?)`,
    'i',
  );
  const normalizeIsoParts = (year: string, month: string, day: string) => {
    const normalizedYear = year.padStart(4, '0');
    const normalizedMonth = month.padStart(2, '0');
    const normalizedDay = day.padStart(2, '0');
    const parsedMonth = Number.parseInt(normalizedMonth, 10);
    const parsedDay = Number.parseInt(normalizedDay, 10);
    if (!Number.isInteger(parsedMonth) || !Number.isInteger(parsedDay) || parsedMonth < 1 || parsedMonth > 12 || parsedDay < 1) {
      return null;
    }

    const candidate = new Date(Date.UTC(Number.parseInt(normalizedYear, 10), parsedMonth - 1, parsedDay));
    if (
      Number.isNaN(candidate.getTime())
      || candidate.getUTCFullYear() !== Number.parseInt(normalizedYear, 10)
      || candidate.getUTCMonth() !== parsedMonth - 1
      || candidate.getUTCDate() !== parsedDay
    ) {
      return null;
    }

    return `${normalizedYear}-${normalizedMonth}-${normalizedDay}`;
  };
  const normalizedOrdinalValue = markerStrippedValue.replace(/\b(\d{1,2})(st|nd|rd|th)\b/gi, '$1');
  const delabeledValue = normalizedOrdinalValue.replace(dateLabelPrefixPattern, '');
  const deweekdayValue = delabeledValue.replace(weekdayPrefixPattern, '');
  const sanitizedTimestampValue = deweekdayValue.replace(/,\s*(\d{1,2}:\d{2}(?::\d{2})?(?:\.\d+)?)\b/g, ' $1');
  const compactTimestampValue = sanitizedTimestampValue.replace(/\s+/g, ' ').trim();
  const depunctuatedTimestampValue = compactTimestampValue.replace(/[.,;:]+$/g, '').trim();
  const unwrappedTimestampValue = depunctuatedTimestampValue.replace(DRAFT_WRAPPING_CHAR_PATTERN, '').trim();
  const normalizedTimestampValue = unwrappedTimestampValue.replace(/\b(am|pm)\b/gi, (_, meridiem: string) => meridiem.toUpperCase());
  const canonicalTimestampValue = normalizedTimestampValue
    .replace(/\bz\b/g, 'Z')
    .replace(/\butc\b/gi, 'UTC')
    .replace(/\bgmt\b/gi, 'GMT')
    .replace(/\b(UTC|GMT)\s+([+-])\s*(\d{1,4}|\d{1,2}:\d{2})\b/g, '$1$2$3')
    .replace(/\b(UTC|GMT)\s+([+-](?:\d{1,2}|\d{3,4}|\d{1,2}:\d{2}))\b/g, '$1$2');
  const suffixStrippedTimestampValue = canonicalTimestampValue.replace(
    new RegExp(`(?:,?\\s+\\d{1,2}:\\d{2}(?::\\d{2})?(?:\\.\\d+)?(?:\\s*[AP]M)?(?:\\s+${zoneTokenPattern})?|\\s+${zoneTokenPattern})$`),
    '',
  );
  const isoTimestampMatch = canonicalTimestampValue.match(new RegExp(`^(\\d{4})-(\\d{2})-(\\d{2})(?:[T\\s].*|${rawOffsetPattern}|Z|\\s+[A-Za-z]{2,5}|\\(.*\\)|\\s+\\[[^\\]]+\\]|\\s+[A-Za-z_-]+(?:\\/[A-Za-z_-]+)+|\\s+(?:UTC|GMT)[+-]?(?:\\d{1,2}|\\d{3,4}|\\d{1,2}:\\d{2})?|\\s+\\d{1,2}:\\d{2}\\s*[AP]M)?$`));
  if (isoTimestampMatch) {
    const [, year, month, day] = isoTimestampMatch;
    return normalizeIsoParts(year, month, day);
  }

  const monthFirstNumericMatch = suffixStrippedTimestampValue.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (monthFirstNumericMatch) {
    const [, month, day, year] = monthFirstNumericMatch;
    const normalizedValue = normalizeIsoParts(year, month, day);
    if (normalizedValue) return normalizedValue;
  }

  const yearFirstNumericMatch = suffixStrippedTimestampValue.match(/^(\d{4})[/.-](\d{1,2})[/.-](\d{1,2})$/);
  if (yearFirstNumericMatch) {
    const [, year, month, day] = yearFirstNumericMatch;
    const normalizedValue = normalizeIsoParts(year, month, day);
    if (normalizedValue) return normalizedValue;
  }

  const yearFirstSpacedMatch = suffixStrippedTimestampValue.match(/^(\d{4})\s+(\d{1,2})\s+(\d{1,2})$/);
  if (yearFirstSpacedMatch) {
    const [, year, month, day] = yearFirstSpacedMatch;
    const normalizedValue = normalizeIsoParts(year, month, day);
    if (normalizedValue) return normalizedValue;
  }

  const monthFirstWrittenMatch = suffixStrippedTimestampValue.match(/^([A-Za-z]+\.?)[\s]+(\d{1,2})(?:,)?\s*(\d{4})$/);
  if (monthFirstWrittenMatch) {
    const [, monthName, day, year] = monthFirstWrittenMatch;
    const month = parseDraftMonthName(monthName);
    if (month) {
      const normalizedValue = normalizeIsoParts(year, String(month), day);
      if (normalizedValue) return normalizedValue;
    }
  }

  const dayFirstWrittenMatch = suffixStrippedTimestampValue.match(/^(\d{1,2})\s+([A-Za-z]+\.?)[\s,]+(\d{4})$/);
  if (dayFirstWrittenMatch) {
    const [, day, monthName, year] = dayFirstWrittenMatch;
    const month = parseDraftMonthName(monthName);
    if (month) {
      const normalizedValue = normalizeIsoParts(year, String(month), day);
      if (normalizedValue) return normalizedValue;
    }
  }

  const hyphenatedWrittenMatch = suffixStrippedTimestampValue.match(/^(\d{1,2})-([A-Za-z]+\.?)-(\d{4})$/);
  if (hyphenatedWrittenMatch) {
    const [, day, monthName, year] = hyphenatedWrittenMatch;
    const month = parseDraftMonthName(monthName);
    if (month) {
      const normalizedValue = normalizeIsoParts(year, String(month), day);
      if (normalizedValue) return normalizedValue;
    }
  }

  const compactIsoMatch = suffixStrippedTimestampValue.match(/^(19\d{2}|20\d{2})(\d{2})(\d{2})$/);
  if (compactIsoMatch) {
    const [, year, month, day] = compactIsoMatch;
    const normalizedValue = normalizeIsoParts(year, month, day);
    if (normalizedValue) return normalizedValue;
  }

  const compactUsMatch = suffixStrippedTimestampValue.match(/^(\d{2})(\d{2})(\d{4})$/);
  if (compactUsMatch) {
    const [, month, day, year] = compactUsMatch;
    const normalizedValue = normalizeIsoParts(year, month, day);
    if (normalizedValue) return normalizedValue;
  }

  const dottedYearFirstMatch = suffixStrippedTimestampValue.match(/^(\d{4})\.(\d{1,2})\.(\d{1,2})$/);
  if (dottedYearFirstMatch) {
    const [, year, month, day] = dottedYearFirstMatch;
    const normalizedValue = normalizeIsoParts(year, month, day);
    if (normalizedValue) return normalizedValue;
  }

  const timestampSlashMatch = canonicalTimestampValue.match(new RegExp(`^(\\d{4})\\/(\\d{1,2})\\/(\\d{1,2})(?:[T\\s].*|${rawOffsetPattern}|Z|\\s+[A-Za-z]{2,5}|\\(.*\\)|\\s+\\[[^\\]]+\\]|\\s+[A-Za-z_-]+(?:\\/[A-Za-z_-]+)+|\\s+(?:UTC|GMT)[+-]?(?:\\d{1,2}|\\d{3,4}|\\d{1,2}:\\d{2})?|\\s+\\d{1,2}:\\d{2}\\s*[AP]M)?$`));
  if (timestampSlashMatch) {
    const [, year, month, day] = timestampSlashMatch;
    const normalizedValue = normalizeIsoParts(year, month, day);
    if (normalizedValue) return normalizedValue;
  }

  return suffixStrippedTimestampValue;
}

function normalizeDraftCountyValue(value: string) {
  const normalizedValue = stripLeadingDraftValueNoise(normalizeDraftText(value));
  if (!normalizedValue) return '';

  const countyWithoutLabels = normalizedValue.replace(
    new RegExp(`^(?:(?:county\\s+of|residence\\s+county|resident\\s+county|county\\s+residence|county))\\s*${DRAFT_LABEL_SEPARATOR_PATTERN}?\\s*`, 'i'),
    '',
  );
  const countyWithoutTrailingPunctuation = countyWithoutLabels.replace(/[.,;:]+$/g, '').trim();
  const countyWithoutWrapping = countyWithoutTrailingPunctuation.replace(DRAFT_WRAPPING_CHAR_PATTERN, '').trim();

  const countyWithoutAffixes = countyWithoutWrapping
    .replace(/^county\s+of\s+/i, '')
    .replace(/\s+(?:county|co\.?)$/i, '')
    .trim();

  return humanizeDraftToken(countyWithoutAffixes.toLowerCase());
}

function normalizeDraftPersonNameValue(
  value: string,
  fieldKey: 'first_name' | 'middle_name' | 'last_name' | 'spouse_last_name',
) {
  const normalizedValue = stripLeadingDraftValueNoise(normalizeDraftText(value));
  if (!normalizedValue) return '';

  const labelPatterns: Record<typeof fieldKey, RegExp> = {
    first_name: new RegExp(`^(?:(?:first|given)(?:\\s+legal)?\\s+name|name\\s*${DRAFT_LABEL_SEPARATOR_PATTERN}?\\s*first)\\s*${DRAFT_LABEL_SEPARATOR_PATTERN}?\\s*`, 'i'),
    middle_name: new RegExp(`^(?:middle(?:\\s+legal)?\\s+name|middle\\s+initial)\\s*${DRAFT_LABEL_SEPARATOR_PATTERN}?\\s*`, 'i'),
    last_name: new RegExp(`^(?:(?:last|family|surname)(?:\\s+legal)?\\s+name|new\\s+legal\\s+name|target\\s+legal\\s+name)\\s*${DRAFT_LABEL_SEPARATOR_PATTERN}?\\s*`, 'i'),
    spouse_last_name: new RegExp(`^(?:spouse(?:'s)?\\s+(?:(?:last|family)\\s+name|surname))\\s*${DRAFT_LABEL_SEPARATOR_PATTERN}?\\s*`, 'i'),
  };

  const unlabeledValue = normalizedValue.replace(labelPatterns[fieldKey], '').trim();
  const cleanedValue = unlabeledValue
    .replace(/[.,;:]+$/g, '')
    .replace(DRAFT_WRAPPING_CHAR_PATTERN, '')
    .trim();
  if (!cleanedValue) return '';

  if (fieldKey === 'middle_name' && /^[A-Za-z]\.?$/.test(cleanedValue)) {
    return cleanedValue.charAt(0).toUpperCase();
  }

  return humanizeDraftToken(cleanedValue.toLowerCase());
}

function getDraftCompositeNameLabelKind(fieldKey: string, fieldLabel: string): 'current' | 'target' | null {
  const normalizedFieldKey = normalizeDraftText(fieldKey).toLowerCase();
  const normalizedFieldLabel = normalizeDraftText(fieldLabel).toLowerCase();
  const compositeTargetNamePattern = /(?:^|\b)(?:new|target)\s+legal\s+name(?:\b|$)|(?:^|\b)target\s+name(?:\b|$)|(?:^|\b)new\s+name(?:\b|$)/i;
  if (compositeTargetNamePattern.test(normalizedFieldKey) || compositeTargetNamePattern.test(normalizedFieldLabel)) {
    return 'target';
  }

  const compositeCurrentNamePattern = /(?:^|\b)current\s+legal\s+name(?:\b|$)|(?:^|\b)current\s+name(?:\b|$)|(?:^|\b)(?:existing|present)\s+legal\s+name(?:\b|$)/i;
  if (compositeCurrentNamePattern.test(normalizedFieldKey) || compositeCurrentNamePattern.test(normalizedFieldLabel)) {
    return 'current';
  }

  return null;
}

function buildDraftCompositeNameFields(
  documentId: string | null,
  fieldLabel: string,
  nextValue: string,
  fallbackLabel: string,
): NameChangeExtractedFieldInput[] | null {
  const normalizedValue = normalizeDraftPersonNameValue(nextValue, 'last_name');
  if (!normalizedValue) return [];

  const nameParts = normalizedValue.split(/\s+/).filter(Boolean);
  if (nameParts.length < 2) return null;

  const firstName = nameParts[0] ?? '';
  const lastName = nameParts[nameParts.length - 1] ?? '';
  const middleName = nameParts.slice(1, -1).join(' ');
  const normalizedLabel = normalizeDraftText(fieldLabel) || fallbackLabel;

  return [
    {
      document_id: documentId,
      field_key: 'first_name',
      field_label: `${normalizedLabel} first name`,
      field_value_masked: firstName,
      source_type: 'manual',
      is_verified: true,
    },
    ...(middleName
      ? [{
        document_id: documentId,
        field_key: 'middle_name' as const,
        field_label: `${normalizedLabel} middle name`,
        field_value_masked: middleName,
        source_type: 'manual' as const,
        is_verified: true,
      }]
      : []),
    {
      document_id: documentId,
      field_key: 'last_name',
      field_label: `${normalizedLabel} last name`,
      field_value_masked: lastName,
      source_type: 'manual',
      is_verified: true,
    },
  ];
}

function normalizeDraftReferenceNumberValue(value: string) {
  const normalizedValue = stripLeadingDraftValueNoise(normalizeDraftText(value));
  if (!normalizedValue) return '';

  return normalizedValue
    .replace(new RegExp(`^(?:(?:case|docket|certificate|cert|record)\\s*(?:number|no\\.?|#)?\\s*${DRAFT_LABEL_SEPARATOR_PATTERN}\\s*|(?:case|docket|certificate|cert|record)\\s+(?:number|no\\.?|#)\\s*)`, 'i'), '')
    .trim()
    .replace(/[.,;:]+$/g, '')
    .replace(DRAFT_WRAPPING_CHAR_PATTERN, '')
    .toUpperCase()
    .replace(/[–—−]/g, '-')
    .replace(/\s*([-/#])\s*/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeDraftFieldValue(fieldKey: NameChangeExtractedFieldInput['field_key'], value: string) {
  const normalizedValue = normalizeDraftText(value);
  if (!normalizedValue) return '';

  if (fieldKey === 'county') {
    return normalizeDraftCountyValue(normalizedValue);
  }

  if (fieldKey === 'first_name' || fieldKey === 'middle_name' || fieldKey === 'last_name' || fieldKey === 'spouse_last_name') {
    return normalizeDraftPersonNameValue(normalizedValue, fieldKey);
  }

  if (fieldKey === 'case_number' || fieldKey === 'certificate_number') {
    return normalizeDraftReferenceNumberValue(normalizedValue);
  }

  if (fieldKey === 'court_order_date' || fieldKey === 'issuance_date') {
    return normalizeDraftDateValue(normalizedValue);
  }

  return normalizedValue;
}

function buildDraftFieldLabel(fieldKey: NameChangeExtractedFieldInput['field_key'], fieldLabel: string) {
  return normalizeDraftText(fieldLabel) || humanizeDraftToken(fieldKey);
}

function shouldCreateDraftNameChangeDocumentMaskedFile(kind: NameChangeDocumentInput['document_kind']) {
  return kind !== 'other';
}

function getDraftNameChangeDocumentIntakeStatus(kind: NameChangeDocumentInput['document_kind']) {
  return kind !== 'other' ? 'uploaded' : 'not_started';
}

function getDraftNameChangeExtractionConfidence(kind: NameChangeDocumentInput['document_kind']) {
  void kind;
  return null;
}

export function buildDraftNameChangeDocumentId(kind: NameChangeDocumentInput['document_kind']) {
  const normalizedKind = normalizeDraftDocumentKind(kind) || 'other';
  return normalizedKind === 'other'
    ? 'draft-other'
    : `draft-${canonicalizeNameChangeDocumentKind(normalizedKind as NameChangeDocumentInput['document_kind'])}`;
}

export function normalizeDraftNameChangeDocumentId(
  documentId: string | null | undefined,
  fallbackKind?: NameChangeDocumentInput['document_kind'] | null,
) {
  const normalizedDocumentId = documentId?.trim() || null;
  if (!normalizedDocumentId) return null;
  if (/^(?:blob|data):/i.test(normalizedDocumentId)) return null;
  if (/^draft$/i.test(normalizedDocumentId)) return null;
  if (/^draft(?:\s*[\\/_-]?\s*)other$/i.test(normalizedDocumentId)) return null;
  const queryFilename = extractDraftDocumentQueryFilename(normalizedDocumentId);
  const querylessDocumentId = normalizedDocumentId.replace(/[?#].*$/, '');
  const decodedDocumentId = (() => {
    try {
      return decodeURIComponent(querylessDocumentId);
    } catch {
      return querylessDocumentId;
    }
  })();
  const decodedQueryFilename = queryFilename;
  const extensionStrippedDocumentId = decodedDocumentId.replace(/\.(pdf|png|jpg|jpeg|webp|heic|heif|tif|tiff)$/i, '');
  const pathLikeDocumentId = (decodedQueryFilename || extensionStrippedDocumentId)
    .split(/[\\/]/)
    .filter(Boolean)
    .pop() ?? decodedQueryFilename ?? extensionStrippedDocumentId;
  const normalizedDraftPrefix = /^draft(?:\s*[\\/_-]?\s*)/i.test(extensionStrippedDocumentId)
    ? extensionStrippedDocumentId.replace(/^draft(?:\s*[\\/_-]?\s*)/i, 'draft-')
    : pathLikeDocumentId?.replace(/^draft(?:\s*[\\/_-]?\s*)/i, 'draft-') ?? null;
  if (!normalizedDraftPrefix?.startsWith('draft-')) {
    const normalizedKind = normalizeDraftDocumentKind(pathLikeDocumentId);
    const resolvedKind = normalizedKind && normalizedKind !== 'other'
      ? normalizedKind
      : (fallbackKind ? canonicalizeNameChangeDocumentKind(fallbackKind) : null);
    if (!resolvedKind || resolvedKind === 'other') return normalizedDocumentId;
    return buildDraftNameChangeDocumentId(resolvedKind as NameChangeDocumentInput['document_kind']);
  }
  const normalizedKind = normalizeDraftDocumentKind(normalizedDraftPrefix.slice('draft-'.length));
  if (!normalizedKind) return null;
  if (normalizedKind === 'other') return null;
  return buildDraftNameChangeDocumentId(normalizedKind as NameChangeDocumentInput['document_kind']);
}

export function isDraftNameChangeDocumentId(documentId: string | null | undefined) {
  return isRequestedDraftDocumentId(documentId)
    && normalizeDraftNameChangeDocumentId(documentId) != null;
}

export function isDraftNameChangePlaceholderDocument(document: Pick<NameChangeDocumentInput, 'id' | 'file_name_masked'> | null | undefined) {
  if (!document) return false;
  return isDraftNameChangeDocumentId(document.id) || isDraftNameChangeMaskedFileName(document.file_name_masked);
}

export function createDraftNameChangeDocument(
  kind: NameChangeDocumentInput['document_kind'],
  label: string,
): NameChangeDocumentInput {
  const normalizedKind = normalizeDraftDocumentKind(kind) || 'other';
  const canonicalKind = canonicalizeNameChangeDocumentKind(normalizedKind as NameChangeDocumentInput['document_kind']);
  const shouldUseMaskedFileName = shouldCreateDraftNameChangeDocumentMaskedFile(canonicalKind);
  const defaultExtractionConfidence = getDraftNameChangeExtractionConfidence(canonicalKind);
  const defaultIntakeStatus = getDraftNameChangeDocumentIntakeStatus(canonicalKind);
  const normalizedLabel = canonicalKind === 'other'
    ? humanizeDraftToken(canonicalKind)
    : normalizeDraftText(label) || humanizeDraftToken(canonicalKind);

  return {
    id: canonicalKind === 'other' ? undefined : buildDraftNameChangeDocumentId(canonicalKind),
    document_kind: canonicalKind,
    display_name: normalizedLabel,
    storage_mode: 'metadata_only',
    intake_status: defaultIntakeStatus,
    file_name_masked: shouldUseMaskedFileName ? buildDraftMaskedFileName(canonicalKind) : null,
    issuing_authority: null,
    issued_on: null,
    expires_on: null,
    extraction_confidence: defaultExtractionConfidence,
    extracted_snapshot: null,
  };
}

export function upsertDraftNameChangeExtractedField(
  extractedFields: NameChangeExtractedFieldInput[],
  documentId: string | null | undefined,
  fieldKey: NameChangeExtractedFieldInput['field_key'],
  fieldLabel: string,
  nextValue: string,
  options?: { preserveExactDocumentId?: boolean },
): NameChangeExtractedFieldInput[] {
  const normalizedDocumentId = normalizeDraftNameChangeDocumentId(documentId);
  const persistedDocumentId = options?.preserveExactDocumentId ? documentId?.trim() || null : null;
  const targetDocumentId = persistedDocumentId && !/^draft(?:$|\s*[/_-]?)/i.test(persistedDocumentId)
    ? persistedDocumentId
    : normalizedDocumentId;
  const matchesTargetDocument = (candidateDocumentId: string | null | undefined) => (
    targetDocumentId && targetDocumentId.startsWith('draft-')
      ? normalizeDraftNameChangeDocumentId(candidateDocumentId) === targetDocumentId
      : candidateDocumentId === targetDocumentId
  );
  if (shouldBlockDraftDocumentFieldWrite(documentId, targetDocumentId)) {
    return extractedFields;
  }

  const compositeNameLabelKind = getDraftCompositeNameLabelKind(fieldKey, fieldLabel);
  const compositeNameFields = compositeNameLabelKind
    ? buildDraftCompositeNameFields(
      targetDocumentId,
      fieldLabel,
      nextValue,
      compositeNameLabelKind === 'current' ? 'Current legal name' : 'Target legal name',
    )
    : null;
  if (compositeNameFields) {
    const compositeFieldKeys = new Set(compositeNameFields.map((field) => field.field_key));
    const rest = extractedFields.filter((field) => !(
      matchesTargetDocument(field.document_id)
      && compositeFieldKeys.has(normalizeDraftFieldKey(field.field_key))
    ));
    return [...rest, ...compositeNameFields];
  }

  const normalizedFieldKey = normalizeDraftFieldKey(fieldKey);
  if (!normalizedFieldKey) {
    return extractedFields;
  }
  const normalizedValue = normalizeDraftFieldValue(normalizedFieldKey, nextValue);
  const normalizedLabel = buildDraftFieldLabel(normalizedFieldKey, fieldLabel);
  const rest = extractedFields.filter((field) => !(
    matchesTargetDocument(field.document_id)
    && normalizeDraftFieldKey(field.field_key) === normalizedFieldKey
  ));
  if (!normalizedValue) return rest;

  return [
    ...rest,
    {
      document_id: targetDocumentId,
      field_key: normalizedFieldKey,
      field_label: normalizedLabel,
      field_value_masked: normalizedValue,
      source_type: 'manual',
      is_verified: true,
    },
  ];
}

function getDraftSnapshotFieldValue(candidate: unknown): string | null {
  if (typeof candidate === 'string') {
    return candidate;
  }

  if (typeof candidate === 'number' || typeof candidate === 'boolean') {
    return String(candidate);
  }

  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
    return null;
  }

  const record = candidate as Record<string, unknown>;
  for (const key of ['value', 'field_value', 'fieldValue', 'masked_value', 'maskedValue', 'normalized_value', 'normalizedValue', 'extracted_value', 'extractedValue', 'display_value', 'displayValue', 'text', 'raw']) {
    const nestedValue = record[key];
    if (typeof nestedValue === 'string' || typeof nestedValue === 'number' || typeof nestedValue === 'boolean') {
      return String(nestedValue);
    }

    if (nestedValue && typeof nestedValue === 'object' && !Array.isArray(nestedValue)) {
      const deepValue = getDraftSnapshotFieldValue(nestedValue);
      if (deepValue) {
        return deepValue;
      }
    }
  }

  return null;
}

function normalizeDraftSnapshotPayload(
  snapshot: unknown,
  depth = 0,
): Record<string, unknown> | Array<unknown> | null {
  if (depth > 4) return null;
  if (Array.isArray(snapshot)) return snapshot;
  if (snapshot && typeof snapshot === 'object') {
    const record = snapshot as Record<string, unknown>;
    for (const wrapperKey of ['snapshot', 'payload', 'data', 'result', 'document']) {
      const wrappedSnapshot = normalizeDraftSnapshotPayload(record[wrapperKey], depth + 1);
      if (wrappedSnapshot) {
        return wrappedSnapshot;
      }
    }

    return record;
  }
  if (typeof snapshot !== 'string') return null;

  const trimmedSnapshot = snapshot.trim();
  if (!trimmedSnapshot) return null;

  const normalizedString = trimmedSnapshot.startsWith('```')
    ? trimmedSnapshot
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/, '')
      .trim()
    : trimmedSnapshot;

  if (!normalizedString) return null;

  try {
    const parsedSnapshot = JSON.parse(normalizedString) as unknown;
    return normalizeDraftSnapshotPayload(parsedSnapshot, depth + 1);
  } catch {
    return null;
  }
}

function appendDraftSnapshotFieldEntries(
  entries: Array<[string, unknown]>,
  snapshot: Record<string, unknown> | Array<unknown>,
) {
  if (Array.isArray(snapshot)) {
    for (const candidateEntry of snapshot) {
      if (!candidateEntry || typeof candidateEntry !== 'object' || Array.isArray(candidateEntry)) {
        continue;
      }

      const record = candidateEntry as Record<string, unknown>;
      const entryKey = ['field_key', 'fieldKey', 'field', 'key', 'name', 'label']
        .map((key) => record[key])
        .find((value): value is string => typeof value === 'string' && value.trim().length > 0);
      if (!entryKey) continue;
      entries.push([entryKey, candidateEntry]);
    }
    return;
  }

  for (const [key, value] of Object.entries(snapshot)) {
    entries.push([key, value]);
  }

  for (const nestedKey of ['fields', 'extracted_fields', 'extractedFields', 'normalized_fields', 'normalizedFields', 'metadata', 'document_metadata', 'documentMetadata', 'meta', 'document_info', 'documentInfo']) {
    const nestedValue = snapshot[nestedKey];
    if (Array.isArray(nestedValue)) {
      for (const candidateEntry of nestedValue) {
        if (!candidateEntry || typeof candidateEntry !== 'object' || Array.isArray(candidateEntry)) {
          continue;
        }

        const record = candidateEntry as Record<string, unknown>;
        const entryKey = ['field_key', 'fieldKey', 'field', 'key', 'name', 'label']
          .map((key) => record[key])
          .find((value): value is string => typeof value === 'string' && value.trim().length > 0);
        if (!entryKey) continue;
        entries.push([entryKey, candidateEntry]);
      }
      continue;
    }

    if (!nestedValue || typeof nestedValue !== 'object') {
      continue;
    }

    for (const [key, value] of Object.entries(nestedValue as Record<string, unknown>)) {
      entries.push([key, value]);
    }
  }
}

export function buildDraftNameChangeExtractedFieldsFromSnapshot(
  documentId: string | null | undefined,
  snapshot: unknown,
  fallbackKind?: NameChangeDocumentInput['document_kind'] | null,
): NameChangeExtractedFieldInput[] {
  const normalizedSnapshot = normalizeDraftSnapshotPayload(snapshot);
  if (!normalizedSnapshot) {
    return [];
  }

  const entries: Array<[string, unknown]> = [];
  appendDraftSnapshotFieldEntries(entries, normalizedSnapshot);
  const snapshotDocumentId = resolveDraftSnapshotDocumentId(documentId, fallbackKind);

  return entries.reduce<NameChangeExtractedFieldInput[]>((fields, [fieldKey, candidateValue]) => {
    const value = getDraftSnapshotFieldValue(candidateValue);
    if (!value) {
      return fields;
    }

    return upsertDraftNameChangeExtractedField(fields, snapshotDocumentId, fieldKey as NameChangeExtractedFieldInput['field_key'], '', value, {
      preserveExactDocumentId: true,
    });
  }, []);
}

export function buildNameChangeSnapshotBackedExtractedFields(
  documents: NameChangeDocumentInput[],
  extractedFields: NameChangeExtractedFieldInput[],
) {
  const explicitFieldKeys = new Set<string>();

  extractedFields.forEach((field) => {
    const resolvedDocumentKind = resolveSnapshotBackedFieldDocumentKind(documents, field.document_id);
    if (!resolvedDocumentKind) return;
    explicitFieldKeys.add(buildSnapshotBackedFieldKey(resolvedDocumentKind, field.field_key));
  });

  return [
    ...extractedFields,
    ...documents.flatMap((document) => buildDraftNameChangeExtractedFieldsFromSnapshot(
      document.id ?? null,
      document.extracted_snapshot,
      document.document_kind,
    ).filter((field) => !explicitFieldKeys.has(buildSnapshotBackedFieldKey(document.document_kind, field.field_key)))),
  ];
}

function buildSnapshotBackedFieldKey(
  documentKind: NameChangeDocumentInput['document_kind'],
  fieldKey: NameChangeExtractedFieldInput['field_key'],
) {
  return `${documentKind}:${fieldKey}`;
}

function resolveSnapshotBackedFieldDocumentKind(
  documents: NameChangeDocumentInput[],
  documentId: string | null | undefined,
) {
  const trimmedDocumentId = documentId?.trim();
  if (!trimmedDocumentId) return null;

  for (const document of documents) {
    const exactDocumentId = document.id?.trim();
    if (exactDocumentId && exactDocumentId === trimmedDocumentId) return document.document_kind;

    const normalizedExactDocumentId = normalizeDraftNameChangeDocumentId(exactDocumentId ?? null, document.document_kind);
    const normalizedFieldDocumentId = normalizeDraftNameChangeDocumentId(trimmedDocumentId, document.document_kind);
    if (normalizedExactDocumentId && normalizedFieldDocumentId && normalizedExactDocumentId === normalizedFieldDocumentId) {
      return document.document_kind;
    }
  }

  return null;
}

function resolveDraftSnapshotDocumentId(
  documentId: string | null | undefined,
  fallbackKind?: NameChangeDocumentInput['document_kind'] | null,
) {
  const trimmedDocumentId = documentId?.trim() || null;
  if (!trimmedDocumentId) return null;
  if (/^(?:blob|data):/i.test(trimmedDocumentId)) return null;
  if (/^draft(?:$|\s*[/_-]?)/i.test(trimmedDocumentId)) {
    return normalizeDraftNameChangeDocumentId(trimmedDocumentId, fallbackKind);
  }

  return fallbackKind
    ? (normalizeDraftNameChangeDocumentId(trimmedDocumentId, fallbackKind) ?? trimmedDocumentId)
    : trimmedDocumentId;
}

export function buildDraftNameChangeDocumentMetadataFromSnapshot(
  snapshot: unknown,
) {
  const normalizedSnapshot = normalizeDraftSnapshotPayload(snapshot);
  if (!normalizedSnapshot) {
    return {
      fileNameMasked: null,
      issuingAuthority: null,
      issuedOn: null,
      expiresOn: null,
      extractionConfidence: null,
    };
  }

  const snapshotEntries: Array<[string, unknown]> = [];
  appendDraftSnapshotFieldEntries(snapshotEntries, normalizedSnapshot);

  const readValue = (...keys: string[]) => {
    if (!Array.isArray(normalizedSnapshot)) {
      for (const key of keys) {
        const directValue = getDraftSnapshotFieldValue(normalizedSnapshot[key]);
        if (directValue) return directValue;
      }
    }

    for (const [entryKey, entryValue] of snapshotEntries) {
      if (!keys.includes(entryKey)) continue;
      const value = getDraftSnapshotFieldValue(entryValue);
      if (value) return value;
    }

    return null;
  };

  const extractionConfidenceValue = readValue('extraction_confidence', 'extractionConfidence', 'confidence');
  const parsedExtractionConfidence = extractionConfidenceValue == null ? null : Number.parseFloat(extractionConfidenceValue);

  const fileNameMasked = readValue(
    'file_name_masked',
    'fileNameMasked',
    'masked_filename',
    'maskedFilename',
    'file_name',
    'fileName',
    'filename',
    'file',
    'name',
  );
  const issuedOnValue = readValue('issued_on', 'issuedOn', 'issuance_date', 'issuanceDate', 'issue_date', 'issueDate');
  const expiresOnValue = readValue('expires_on', 'expiresOn', 'expiration_date', 'expirationDate', 'expiry_date', 'expiryDate');

  return {
    fileNameMasked: fileNameMasked ? normalizeDraftText(fileNameMasked) : null,
    issuingAuthority: readValue('issuing_authority', 'issuingAuthority', 'issuing_agency', 'issuingAgency', 'authority', 'issuer'),
    issuedOn: issuedOnValue ? normalizeDraftDateValue(issuedOnValue) : null,
    expiresOn: expiresOnValue ? normalizeDraftDateValue(expiresOnValue) : null,
    extractionConfidence: Number.isFinite(parsedExtractionConfidence) ? parsedExtractionConfidence : null,
  };
}
