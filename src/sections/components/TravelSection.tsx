import React from 'react';
import { WeddingDataV1 } from '../../types/weddingData';
import { SectionInstance } from '../../types/layoutConfig';
import { Bus, Car, ExternalLink, Globe2, Hotel, MapPin, Plane, Ticket } from 'lucide-react';
import { readBuilderValue } from '../../lib/weddingProfile';
import { buildTravelVenueDirectionsHref, normalizeTravelPortalData } from '../../lib/travelStructuredData';

interface Props {
  data: WeddingDataV1;
  instance: SectionInstance;
}

function toIcsDateTime(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;
}

function escapeIcs(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
}

function downloadIcs(data: WeddingDataV1, onlyEventId?: string) {
  const scheduleItems = (onlyEventId ? data.schedule.filter(s => s.id === onlyEventId) : data.schedule)
    .filter(s => !!s.startTimeISO);
  if (!scheduleItems.length) return;

  const venueMap = new Map(data.venues.map(v => [v.id, v]));
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//dayof//Wedding Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ];

  for (const item of scheduleItems) {
    const venue = item.venueId ? venueMap.get(item.venueId) : undefined;
    const uid = `${item.id}@dayof.love`;
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${uid}`);
    lines.push(`DTSTAMP:${toIcsDateTime(new Date().toISOString())}`);
    lines.push(`DTSTART:${toIcsDateTime(item.startTimeISO!)}`);
    if (item.endTimeISO) lines.push(`DTEND:${toIcsDateTime(item.endTimeISO)}`);
    lines.push(`SUMMARY:${escapeIcs(item.label)}`);
    if (venue?.name) lines.push(`LOCATION:${escapeIcs([venue.name, venue.address].filter(Boolean).join(' — '))}`);
    if (item.notes) lines.push(`DESCRIPTION:${escapeIcs(item.notes)}`);
    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');
  const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = onlyEventId ? 'event.ics' : 'wedding-weekend.ics';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function TimezoneBadge({ tz }: { tz: string }) {
  return <span className="inline-flex items-center px-2 py-1 text-xs rounded-full border border-border bg-surface-subtle text-text-secondary">Times shown in {tz}</span>;
}

function TravelSupportCard({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-border rounded-2xl p-5 md:p-6 bg-surface shadow-sm">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <h4 className="font-semibold text-text-primary">{title}</h4>
      </div>
      <div className="text-sm text-text-secondary leading-relaxed space-y-2">{children}</div>
    </div>
  );
}

export const TravelSection: React.FC<Props> = ({ data, instance }) => {
  const { settings } = instance;
  const { venues, travel } = data;
  const structuredTravel = normalizeTravelPortalData(travel);
  const timezone = data.event?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'local time';
  const hasContent = venues.length > 0
    || travel?.notes
    || travel?.flightInfo
    || travel?.hotelInfo
    || travel?.parkingInfo
    || structuredTravel.hotels.length > 0
    || structuredTravel.roomBlocks.length > 0
    || structuredTravel.shuttles.length > 0
    || structuredTravel.visaTips.length > 0
    || structuredTravel.culturalTips.length > 0;
  const title = readBuilderValue(settings.title as string | { value: string } | undefined, 'Travel & Accommodations');

  return (
    <section className="py-16 px-4 bg-surface-subtle">
      <div className="max-w-4xl mx-auto">
        {settings.showTitle !== false && (
          <h2 className="text-3xl md:text-4xl font-semibold text-text-primary mb-8 text-center">
            {title}
          </h2>
        )}
        {(settings.showTimezoneBadge !== false || settings.showIcsButton !== false) && (
          <div className="flex flex-wrap items-center justify-center gap-2 mb-6">
            {settings.showTimezoneBadge !== false && <TimezoneBadge tz={timezone} />}
            {settings.showIcsButton !== false && data.schedule.length > 0 && (
              <button
                onClick={() => downloadIcs(data)}
                className="inline-flex items-center px-3.5 py-2 text-xs font-medium rounded-full border border-border bg-surface hover:border-primary hover:text-primary transition-colors"
              >
                Add weekend plans to your calendar (.ics)
              </button>
            )}
          </div>
        )}
        {!hasContent ? (
          <div className="text-center">
            <p className="text-text-secondary">Travel details, hotel notes, and local guidance will appear here once they’re added.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {travel?.notes && (
              <p className="text-text-secondary text-center max-w-2xl mx-auto whitespace-pre-wrap">{travel.notes}</p>
            )}
            {venues.map(venue => (
              <div key={venue.id} className="border border-border rounded-xl p-6 bg-surface">
                {venue.name && (
                  <h3 className="text-lg md:text-xl font-semibold text-text-primary mb-2">{venue.name}</h3>
                )}
                {venue.address && (
                  <p className="text-text-secondary flex items-start gap-2.5 mb-3 leading-relaxed">
                    <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    {venue.address}
                  </p>
                )}
                {venue.address && (
                  <a
                    href={buildTravelVenueDirectionsHref(venue.name, venue.address)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary-hover transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" / >
                    Open directions in Google Maps
                  </a>
                )}
                {venue.notes && (
                  <p className="text-sm text-text-secondary leading-relaxed mt-3">{venue.notes}</p>
                )}
              </div>
            ))}
            {(travel?.flightInfo || travel?.hotelInfo || travel?.parkingInfo) && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {travel?.flightInfo && (
                  <TravelSupportCard icon={<Plane className="w-4 h-4 text-primary" />} title="Getting here">
                    <p className="whitespace-pre-wrap">{travel.flightInfo}</p>
                  </TravelSupportCard>
                )}
                {travel?.hotelInfo && (
                  <TravelSupportCard icon={<Hotel className="w-4 h-4 text-primary" />} title="Where to stay">
                    <p className="whitespace-pre-wrap">{travel.hotelInfo}</p>
                  </TravelSupportCard>
                )}
                {travel?.parkingInfo && (
                  <TravelSupportCard icon={<Car className="w-4 h-4 text-primary" />} title="Parking">
                    <p className="whitespace-pre-wrap">{travel.parkingInfo}</p>
                  </TravelSupportCard>
                )}
              </div>
            )}
            {structuredTravel.hotels.length > 0 && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg md:text-xl font-semibold text-text-primary">Hotel options</h3>
                  <p className="mt-1 text-sm text-text-secondary">Guest-friendly hotel details stay together here instead of getting buried in one paragraph.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {structuredTravel.hotels.map((hotel) => (
                    <div key={hotel.id} className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-text-primary">{hotel.name}</p>
                          {hotel.distance && <p className="text-xs text-text-secondary mt-1">{hotel.distance}</p>}
                        </div>
                        {hotel.priceRange && <span className="rounded-full bg-surface-subtle px-2.5 py-1 text-[11px] font-medium text-text-secondary">{hotel.priceRange}</span>}
                      </div>
                      <div className="mt-3 space-y-2 text-sm text-text-secondary">
                        {hotel.address && <p>{hotel.address}</p>}
                        {hotel.phone && <p>{hotel.phone}</p>}
                        {hotel.bookingCode && <p><span className="font-medium text-text-primary">Booking code:</span> {hotel.bookingCode}</p>}
                        {hotel.bookingDeadline && <p><span className="font-medium text-text-primary">Book by:</span> {hotel.bookingDeadline}</p>}
                        {hotel.shuttleInfo && <p><span className="font-medium text-text-primary">Shuttle:</span> {hotel.shuttleInfo}</p>}
                        {hotel.notes && <p>{hotel.notes}</p>}
                      </div>
                      {hotel.url && (
                        <a
                          href={hotel.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary-hover transition-colors"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          Visit hotel site
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {(structuredTravel.roomBlocks.length > 0 || structuredTravel.shuttles.length > 0) && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {structuredTravel.roomBlocks.length > 0 && (
                  <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                      <Ticket className="w-4 h-4 text-primary" />
                      <h3 className="font-semibold text-text-primary">Room blocks</h3>
                    </div>
                    <div className="space-y-3">
                      {structuredTravel.roomBlocks.map((roomBlock) => (
                        <div key={roomBlock.id} className="rounded-xl border border-border-subtle bg-surface-subtle p-4">
                          <p className="font-medium text-text-primary">{roomBlock.hotelName}</p>
                          <div className="mt-2 space-y-1 text-sm text-text-secondary">
                            {roomBlock.bookingCode && <p><span className="font-medium text-text-primary">Code:</span> {roomBlock.bookingCode}</p>}
                            {roomBlock.bookingDeadline && <p><span className="font-medium text-text-primary">Book by:</span> {roomBlock.bookingDeadline}</p>}
                            {roomBlock.detail && <p>{roomBlock.detail}</p>}
                          </div>
                          {roomBlock.url && (
                            <a
                              href={roomBlock.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary-hover transition-colors"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              Open booking page
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {structuredTravel.shuttles.length > 0 && (
                  <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                      <Bus className="w-4 h-4 text-primary" />
                      <h3 className="font-semibold text-text-primary">Shuttle plans</h3>
                    </div>
                    <div className="space-y-3">
                      {structuredTravel.shuttles.map((shuttle) => (
                        <div key={shuttle.id} className="rounded-xl border border-border-subtle bg-surface-subtle p-4">
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-medium text-text-primary">{shuttle.label}</p>
                            {(shuttle.departureTime || shuttle.returnTime) && (
                              <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-text-secondary">
                                {[shuttle.departureTime, shuttle.returnTime].filter(Boolean).join(' · ')}
                              </span>
                            )}
                          </div>
                          <div className="mt-2 space-y-1 text-sm text-text-secondary">
                            {shuttle.route && <p>{shuttle.route}</p>}
                            {shuttle.notes && <p>{shuttle.notes}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            {(structuredTravel.visaTips.length > 0 || structuredTravel.culturalTips.length > 0) && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {structuredTravel.visaTips.length > 0 && (
                  <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                      <Globe2 className="w-4 h-4 text-primary" />
                      <h3 className="font-semibold text-text-primary">Visa and arrival tips</h3>
                    </div>
                    <ul className="space-y-2 list-disc pl-5 text-sm text-text-secondary">
                      {structuredTravel.visaTips.map((tip, index) => <li key={`${tip}-${index}`}>{tip}</li>)}
                    </ul>
                  </div>
                )}
                {structuredTravel.culturalTips.length > 0 && (
                  <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                      <MapPin className="w-4 h-4 text-primary" />
                      <h3 className="font-semibold text-text-primary">Local tips</h3>
                    </div>
                    <ul className="space-y-2 list-disc pl-5 text-sm text-text-secondary">
                      {structuredTravel.culturalTips.map((tip, index) => <li key={`${tip}-${index}`}>{tip}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
};

export const TravelCards: React.FC<Props> = ({ data, instance }) => {
  const { settings } = instance;
  const { venues, travel } = data;
  const structuredTravel = normalizeTravelPortalData(travel);
  const timezone = data.event?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'local time';
  const title = readBuilderValue(settings.title as string | { value: string } | undefined, 'Travel & Accommodations');

  return (
    <section className="py-20 px-4 bg-surface">
      <div className="max-w-5xl mx-auto">
        {settings.showTitle !== false && (
          <div className="text-center mb-10 md:mb-14">
            <p className="text-sm text-primary mb-3 font-light">Travel details</p>
            <h2 className="text-4xl font-light text-text-primary">{title}</h2>
            {travel?.notes && <p className="text-text-secondary mt-4 max-w-xl mx-auto leading-relaxed">{travel.notes}</p>}
            <div className="w-10 h-px bg-primary mx-auto mt-6" />
          </div>
        )}
        {(settings.showTimezoneBadge !== false || settings.showIcsButton !== false) && (
          <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
            {settings.showTimezoneBadge !== false && <TimezoneBadge tz={timezone} />}
            {settings.showIcsButton !== false && data.schedule.length > 0 && (
              <button
                onClick={() => downloadIcs(data)}
                className="inline-flex items-center px-3.5 py-2 text-xs font-medium rounded-full border border-border bg-surface hover:border-primary hover:text-primary transition-colors"
              >
                Add weekend plans to your calendar (.ics)
              </button>
            )}
          </div>
        )}
        {venues.length > 0 && (
          <div className="space-y-4 mb-10">
            {venues.map(venue => (
              <div key={venue.id} className="flex items-start gap-4 p-6 rounded-2xl border border-border bg-surface-subtle">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  {venue.name && (
                    <h3 className="font-semibold text-text-primary mb-1">{venue.name}</h3>
                  )}
                  {venue.address && (
                    <p className="text-sm text-text-secondary mb-2">{venue.address}</p>
                  )}
                  {venue.address && (
                    <a
                      href={buildTravelVenueDirectionsHref(venue.name, venue.address)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:text-primary-hover transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Open in Google Maps
                    </a>
                  )}
                  {venue.notes && (
                    <p className="text-xs text-text-secondary leading-relaxed mt-2">{venue.notes}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6">
          <div className="text-center p-8 rounded-2xl border border-border bg-surface-subtle shadow-sm">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Plane className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-semibold text-text-primary mb-2">Getting here</h3>
            <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-wrap">
              {travel?.flightInfo || 'Flight and transport details will appear here once they’re added.'}
            </p>
          </div>
          <div className="text-center p-8 rounded-2xl border border-border bg-surface-subtle shadow-sm">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Hotel className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-semibold text-text-primary mb-2">Where to stay</h3>
            <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-wrap">
              {travel?.hotelInfo || structuredTravel.hotels[0]?.name || 'Hotel recommendations will appear here once they’re added.'}
            </p>
          </div>
          <div className="text-center p-8 rounded-2xl border border-border bg-surface-subtle shadow-sm">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Car className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-semibold text-text-primary mb-2">Parking</h3>
            <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-wrap">
              {travel?.parkingInfo || structuredTravel.shuttles[0]?.label || 'Parking details will appear here once they’re added.'}
            </p>
          </div>
        </div>
        {(structuredTravel.roomBlocks.length > 0 || structuredTravel.culturalTips.length > 0) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6 mt-6">
            {structuredTravel.roomBlocks.length > 0 && (
              <div className="rounded-2xl border border-border bg-surface-subtle p-6 shadow-sm">
                <h3 className="font-semibold text-text-primary mb-2">Room block quick view</h3>
                <div className="space-y-3 text-sm text-text-secondary">
                  {structuredTravel.roomBlocks.slice(0, 2).map((roomBlock) => (
                    <div key={roomBlock.id}>
                      <p className="font-medium text-text-primary">{roomBlock.hotelName}</p>
                      <p>{[roomBlock.bookingCode ? `Code ${roomBlock.bookingCode}` : '', roomBlock.bookingDeadline ? `Book by ${roomBlock.bookingDeadline}` : ''].filter(Boolean).join(' · ')}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {structuredTravel.culturalTips.length > 0 && (
              <div className="rounded-2xl border border-border bg-surface-subtle p-6 shadow-sm">
                <h3 className="font-semibold text-text-primary mb-2">Weekend tips</h3>
                <ul className="space-y-2 list-disc pl-5 text-sm text-text-secondary">
                  {structuredTravel.culturalTips.slice(0, 3).map((tip, index) => <li key={`${tip}-${index}`}>{tip}</li>)}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
};

export const TravelLocalGuide: React.FC<Props> = ({ data, instance }) => {
  const { settings } = instance;
  const { venues, travel } = data;
  const structuredTravel = normalizeTravelPortalData(travel);
  const timezone = data.event?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'local time';
  const title = readBuilderValue(settings.title as string | { value: string } | undefined, 'Travel & Local Guide');

  const localTips = (
    structuredTravel.culturalTips.length > 0
      ? structuredTravel.culturalTips
      : (travel?.notes || '')
          .split(/\n+/)
          .map((line) => line.trim())
          .filter(Boolean)
  ).slice(0, 4);

  return (
    <section className="py-16 md:py-20 px-4 bg-surface-subtle">
      <div className="max-w-5xl mx-auto">
        {settings.showTitle !== false && (
          <div className="text-center mb-10 md:mb-12">
            <p className="text-sm text-primary mb-3 font-light">Travel details</p>
            <h2 className="text-3xl md:text-4xl font-light text-text-primary leading-tight">{title}</h2>
            <div className="w-10 h-px bg-primary mx-auto mt-6" />
          </div>
        )}

        {(settings.showTimezoneBadge !== false || settings.showIcsButton !== false) && (
          <div className="flex flex-wrap items-center justify-center gap-2 mb-6">
            {settings.showTimezoneBadge !== false && <TimezoneBadge tz={timezone} />}
            {settings.showIcsButton !== false && data.schedule.length > 0 && (
              <button
                onClick={() => downloadIcs(data)}
                className="inline-flex items-center px-3.5 py-2 text-xs font-medium rounded-full border border-border bg-surface hover:border-primary hover:text-primary transition-colors"
              >
                Add weekend plans to your calendar (.ics)
              </button>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 md:gap-6">
          <div className="rounded-2xl border border-border bg-surface p-6 md:p-7 shadow-sm">
            <h3 className="font-semibold text-text-primary mb-3">Getting here</h3>
            <div className="space-y-3 text-sm text-text-secondary leading-relaxed">
              <p><span className="font-medium text-text-primary">Flights:</span> {travel?.flightInfo || 'Airport and transport details will appear here once they’re added.'}</p>
              <p><span className="font-medium text-text-primary">Parking:</span> {travel?.parkingInfo || structuredTravel.shuttles[0]?.label || 'Parking details will appear here once they’re added.'}</p>
              <p><span className="font-medium text-text-primary">Hotels:</span> {travel?.hotelInfo || structuredTravel.hotels[0]?.name || 'Hotel recommendations will appear here once they’re added.'}</p>
              {structuredTravel.visaTips[0] && <p><span className="font-medium text-text-primary">Arrival note:</span> {structuredTravel.visaTips[0]}</p>}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-surface p-6 md:p-7 shadow-sm">
            <h3 className="font-semibold text-text-primary mb-3">Local tips</h3>
            <ul className="space-y-2 text-sm text-text-secondary leading-relaxed list-disc pl-5">
              {(localTips.length > 0
                ? localTips
                : [
                    'Book accommodation early for best rates.',
                    'Plan extra travel time around ceremony start.',
                    'Rideshare pickup points will be shared before the event.',
                    'Check weather and bring layers for evening events.',
                  ]).map((tip, idx) => (
                <li key={idx}>{tip}</li>
              ))}
            </ul>
          </div>
        </div>

        {venues.length > 0 && (
          <div className="mt-6 rounded-2xl border border-border bg-surface p-5 md:p-6">
            <h3 className="font-semibold text-text-primary mb-4">Key locations</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {venues.slice(0, 4).map((venue) => (
                <div key={venue.id} className="rounded-xl border border-border-subtle bg-surface-subtle p-4 shadow-sm">
                  <p className="font-medium text-text-primary">{venue.name || 'Venue'}</p>
                  {venue.address && <p className="text-sm text-text-secondary mt-1">{venue.address}</p>}
                </div>
              ))}
            </div>
          </div>
        )}
        {structuredTravel.shuttles.length > 0 && (
          <div className="mt-6 rounded-2xl border border-border bg-surface p-5 md:p-6">
            <h3 className="font-semibold text-text-primary mb-4">Shuttle timing</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {structuredTravel.shuttles.map((shuttle) => (
                <div key={shuttle.id} className="rounded-xl border border-border-subtle bg-surface-subtle p-4 shadow-sm">
                  <p className="font-medium text-text-primary">{shuttle.label}</p>
                  {shuttle.route && <p className="text-sm text-text-secondary mt-1">{shuttle.route}</p>}
                  {(shuttle.departureTime || shuttle.returnTime) && (
                    <p className="text-sm text-text-secondary mt-1">{[shuttle.departureTime, shuttle.returnTime].filter(Boolean).join(' · ')}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
