import { getSafePublicMapsUrl, getSafePublicWebUrl } from '../sections/publicLinks';

export interface TravelHotelRecord {
  id: string;
  name: string;
  distance?: string;
  address?: string;
  phone?: string;
  url?: string;
  notes?: string;
  priceRange?: string;
  bookingCode?: string;
  bookingDeadline?: string;
  shuttleInfo?: string;
}

export interface TravelRoomBlockRecord {
  id: string;
  hotelName: string;
  bookingCode?: string;
  bookingDeadline?: string;
  detail?: string;
  url?: string;
}

export interface TravelShuttleRecord {
  id: string;
  label: string;
  route?: string;
  departureTime?: string;
  returnTime?: string;
  notes?: string;
}

export interface NormalizedTravelPortalData {
  hotels: TravelHotelRecord[];
  roomBlocks: TravelRoomBlockRecord[];
  shuttles: TravelShuttleRecord[];
  visaTips: string[];
  culturalTips: string[];
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function asText(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

function asTipList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => asText(entry))
    .filter((entry): entry is string => Boolean(entry));
}

export function sanitizeTravelHotels(value: unknown): TravelHotelRecord[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry, index) => {
    const row = asRecord(entry);
    const name = asText(row?.name);
    if (!name) return [];
    return [{
      id: asText(row?.id) ?? `hotel-${index}`,
      name,
      ...(asText(row?.distance) ? { distance: asText(row?.distance) } : {}),
      ...(asText(row?.address) ? { address: asText(row?.address) } : {}),
      ...(asText(row?.phone) ? { phone: asText(row?.phone) } : {}),
      ...(getSafePublicWebUrl(asText(row?.url) ?? '') ? { url: getSafePublicWebUrl(asText(row?.url) ?? '') as string } : {}),
      ...(asText(row?.notes) ? { notes: asText(row?.notes) } : {}),
      ...(asText(row?.priceRange) ? { priceRange: asText(row?.priceRange) } : {}),
      ...(asText(row?.bookingCode) ? { bookingCode: asText(row?.bookingCode) } : {}),
      ...(asText(row?.bookingDeadline) ? { bookingDeadline: asText(row?.bookingDeadline) } : {}),
      ...(asText(row?.shuttleInfo) ? { shuttleInfo: asText(row?.shuttleInfo) } : {}),
    }];
  });
}

export function sanitizeTravelRoomBlocks(value: unknown): TravelRoomBlockRecord[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry, index) => {
    const row = asRecord(entry);
    const hotelName = asText(row?.hotelName) ?? asText(row?.hotel);
    if (!hotelName) return [];
    return [{
      id: asText(row?.id) ?? `room-block-${index}`,
      hotelName,
      ...(asText(row?.bookingCode) ? { bookingCode: asText(row?.bookingCode) } : {}),
      ...(asText(row?.bookingDeadline) ? { bookingDeadline: asText(row?.bookingDeadline) } : {}),
      ...(asText(row?.detail) ? { detail: asText(row?.detail) } : {}),
      ...(getSafePublicWebUrl(asText(row?.url) ?? '') ? { url: getSafePublicWebUrl(asText(row?.url) ?? '') as string } : {}),
    }];
  });
}

export function sanitizeTravelShuttles(value: unknown): TravelShuttleRecord[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry, index) => {
    const row = asRecord(entry);
    const label = asText(row?.label);
    if (!label) return [];
    return [{
      id: asText(row?.id) ?? `shuttle-${index}`,
      label,
      ...(asText(row?.route) ? { route: asText(row?.route) } : {}),
      ...(asText(row?.departureTime) ? { departureTime: asText(row?.departureTime) } : {}),
      ...(asText(row?.returnTime) ? { returnTime: asText(row?.returnTime) } : {}),
      ...(asText(row?.notes) ? { notes: asText(row?.notes) } : {}),
    }];
  });
}

export function normalizeTravelPortalData(value: unknown): NormalizedTravelPortalData {
  const travel = asRecord(value);
  return {
    hotels: sanitizeTravelHotels(travel?.hotels),
    roomBlocks: sanitizeTravelRoomBlocks(travel?.roomBlocks),
    shuttles: sanitizeTravelShuttles(travel?.shuttles),
    visaTips: asTipList(travel?.visaTips),
    culturalTips: asTipList(travel?.culturalTips),
  };
}

export function buildTravelVenueDirectionsHref(label?: string, address?: string, mapUrl?: string): string {
  return getSafePublicMapsUrl(mapUrl, [label, address].map((part) => part?.trim()).filter(Boolean).join(' '));
}
