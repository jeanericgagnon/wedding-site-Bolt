import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, ExternalLink, Instagram, Mail, Palette, ShieldCheck, Sparkles } from 'lucide-react';
import { listMyVendorProfileInquiries, type VendorProfileInquiry } from '../lib/vendorProfiles';
import { isVendorProfileCreationEnabled } from '../lib/vendorProfileLaunch';

type VendorTemplateId =
  | 'editorial'
  | 'portfolio'
  | 'minimal'
  | 'magazine'
  | 'booking'
  | 'photography'
  | 'floral'
  | 'venue'
  | 'planner'
  | 'service'
  | 'food'
  | 'beauty'
  | 'music'
  | 'travel';

type VendorTemplate = {
  id: VendorTemplateId;
  name: string;
  label: string;
  bestFor: string;
  status: 'ready' | 'review';
  summary: string;
};

type SampleVendor = {
  id: string;
  name: string;
  category: string;
  location: string;
  descriptor: string;
  about: string;
  images: string[];
  links: string[];
  email: string;
  sourceQuality: 'Website ready' | 'Social profile' | 'Image starter' | 'Needs images';
};

const templates: VendorTemplate[] = [
  {
    id: 'photography',
    name: 'Photography Portfolio',
    label: 'Photo and video',
    bestFor: 'photographers, videographers, content teams',
    status: 'ready',
    summary: 'Image-led story, gallery rhythm, featured work, and a package-minded inquiry path.',
  },
  {
    id: 'floral',
    name: 'Floral Lookbook',
    label: 'Flowers and decor',
    bestFor: 'florists, rentals, tabletop, stationery, decor',
    status: 'ready',
    summary: 'Palette-forward layout for texture, installation scale, source links, and design inquiry.',
  },
  {
    id: 'venue',
    name: 'Venue Estate',
    label: 'Venues',
    bestFor: 'venues, hotels, restaurants, private estates',
    status: 'ready',
    summary: 'Large location hero, guest-flow highlights, tour CTA, and enough structure for real venue review.',
  },
  {
    id: 'food',
    name: 'Food and Beverage',
    label: 'Catering, cakes, and bar',
    bestFor: 'caterers, cake artists, bar services, rehearsal dinners',
    status: 'ready',
    summary: 'Menu-led proof, tasting path, service style, and clear confidence for food-focused vendors.',
  },
  {
    id: 'beauty',
    name: 'Beauty Atelier',
    label: 'Beauty, attire, and jewelry',
    bestFor: 'beauty teams, salons, bridal fashion, jewelers',
    status: 'ready',
    summary: 'Artist-forward profile for trials, service menus, finish details, and a polished booking path.',
  },
  {
    id: 'music',
    name: 'Entertainment Stage',
    label: 'Music and entertainment',
    bestFor: 'DJs, bands, ceremony musicians, performers, photo booths',
    status: 'ready',
    summary: 'Energy-first layout for sample sets, reception moments, timing confidence, and booking inquiries.',
  },
  {
    id: 'planner',
    name: 'Planner Concierge',
    label: 'Planning and coordination',
    bestFor: 'planners, coordinators, designers, officiants',
    status: 'ready',
    summary: 'Process-led profile with trust language, calm logistics, and a premium consultation CTA.',
  },
  {
    id: 'travel',
    name: 'Travel Logistics',
    label: 'Travel and transportation',
    bestFor: 'hotel blocks, travel specialists, shuttles, transportation',
    status: 'ready',
    summary: 'Route, room-block, pickup-window, and guest-movement clarity for logistics-heavy vendors.',
  },
];

const sampleVendors: SampleVendor[] = [
  {
    id: 'everlight-studio',
    name: 'Everlight Studio',
    category: 'Photography',
    location: 'New York, NY',
    descriptor: 'Documentary wedding photography with an editorial finish',
    about:
      'Everlight Studio photographs weddings with a calm, observant style built around real emotion, clean composition, and the small in-between moments couples actually remember.',
    images: [
      'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1400&q=80',
      'https://images.unsplash.com/photo-1520854221256-17451cc331bf?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1523438885200-e635ba2c371e?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=900&q=80',
    ],
    links: ['Instagram', 'Website', 'Inquiry form'],
    email: 'hello@everlight.example',
    sourceQuality: 'Website ready',
  },
  {
    id: 'marigold-floral',
    name: 'Marigold Floral House',
    category: 'Flowers',
    location: 'Austin, TX',
    descriptor: 'Sculptural florals for warm, high-texture celebrations',
    about:
      'Marigold Floral House designs wedding flowers that feel garden-gathered, seasonal, and dimensional, from ceremony installations to reception tablescapes.',
    images: [
      'https://images.unsplash.com/photo-1460978812857-470ed1c77af0?auto=format&fit=crop&w=1400&q=80',
      'https://images.unsplash.com/photo-1526047932273-341f2a7631f9?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1509223197845-458d87318791?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1504196606672-aef5c9cefc92?auto=format&fit=crop&w=900&q=80',
    ],
    links: ['Instagram', 'Website', 'Inquiry form'],
    email: 'studio@marigold.example',
    sourceQuality: 'Social profile',
  },
  {
    id: 'stonehouse-estate',
    name: 'Stonehouse Estate',
    category: 'Venue',
    location: 'Hudson Valley, NY',
    descriptor: 'Historic estate venue with gardens, tented lawns, and guest flow',
    about:
      'Stonehouse Estate hosts wedding weekends with a ceremony garden, indoor dinner space, and enough property detail to make logistics feel organized from arrival to sendoff.',
    images: [
      'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=1400&q=80',
      'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=900&q=80',
    ],
    links: ['Website', 'Inquiry form'],
    email: 'events@stonehouse.example',
    sourceQuality: 'Image starter',
  },
  {
    id: 'sage-table',
    name: 'Sage Table Catering',
    category: 'Catering',
    location: 'Charleston, SC',
    descriptor: 'Seasonal wedding menus, passed bites, late-night snacks, and polished bar support',
    about:
      'Sage Table builds menus around regional ingredients, guest flow, and service timing, from welcome cocktails to family-style dinners and cake service coordination.',
    images: [
      'https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=1400&q=80',
      'https://images.unsplash.com/photo-1555244162-803834f70033?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1551024506-0bccd828d307?auto=format&fit=crop&w=900&q=80',
    ],
    links: ['Menu guide', 'Website', 'Tasting inquiry'],
    email: 'events@sagetable.example',
    sourceQuality: 'Website ready',
  },
  {
    id: 'veil-and-velvet',
    name: 'Veil & Velvet Atelier',
    category: 'Beauty',
    location: 'Miami, FL',
    descriptor: 'Hair, makeup, and styling support for camera-ready wedding mornings',
    about:
      'Veil & Velvet Atelier handles trials, touch-up timelines, bridal party styling, and calm getting-ready room coordination with a polished editorial finish.',
    images: [
      'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=1400&q=80',
      'https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1502716119720-b23a93e5fe1b?auto=format&fit=crop&w=900&q=80',
    ],
    links: ['Instagram', 'Trial booking', 'Website'],
    email: 'bookings@veilandvelvet.example',
    sourceQuality: 'Social profile',
  },
  {
    id: 'afterglow-sound',
    name: 'Afterglow Sound',
    category: 'Entertainment',
    location: 'Nashville, TN',
    descriptor: 'Reception DJ, live ceremony music, and dance-floor production',
    about:
      'Afterglow Sound creates ceremony cues, cocktail-hour texture, reception pacing, and late-night dance energy with sample playlists couples can review before booking.',
    images: [
      'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1400&q=80',
      'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1506157786151-b8491531f063?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=900&q=80',
    ],
    links: ['Sample set', 'Website', 'Inquiry form'],
    email: 'hello@afterglowsound.example',
    sourceQuality: 'Website ready',
  },
  {
    id: 'luna-events',
    name: 'Luna Events',
    category: 'Planner',
    location: 'Los Angeles, CA',
    descriptor: 'Full-service planning for design-forward weekend weddings',
    about:
      'Luna Events supports couples from venue walkthroughs to vendor logistics, timeline production, design translation, and calm wedding-day coordination.',
    images: [
      'https://images.unsplash.com/photo-1523438885200-e635ba2c371e?auto=format&fit=crop&w=1400&q=80',
      'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1529634806980-85c3dd6d34ac?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1478146896981-b80fe463b330?auto=format&fit=crop&w=900&q=80',
    ],
    links: ['Instagram', 'Website', 'Inquiry form'],
    email: 'hello@lunaevents.example',
    sourceQuality: 'Website ready',
  },
  {
    id: 'northstar-transit',
    name: 'Northstar Transit Co.',
    category: 'Transportation',
    location: 'Chicago, IL',
    descriptor: 'Guest shuttle coordination and late-night transportation',
    about:
      'Northstar Transit Co. coordinates guest movement between hotel blocks, ceremony locations, reception spaces, and after-party stops with clear pickup windows and day-of contact support.',
    images: [],
    links: ['Website', 'Direct email'],
    email: 'dispatch@northstar.example',
    sourceQuality: 'Needs images',
  },
];

const statusCopy: Record<VendorTemplate['status'], string> = {
  ready: 'Ready',
  review: 'Review',
};

const sampleProfileLinks = [
  { label: 'Photography sample', href: '/vendor/dayof-sample-photography' },
  { label: 'Floral sample', href: '/vendor/dayof-sample-floral' },
  { label: 'Venue sample', href: '/vendor/dayof-sample-venue' },
  { label: 'Catering sample', href: '/vendor/dayof-sample-catering' },
];

const getVendorInitials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'DV';

const VendorImageFallback: React.FC<{ vendor: SampleVendor; className?: string }> = ({ vendor, className = '' }) => (
  <div className={`flex items-center justify-center bg-[#f5e9db] text-[#8b6f53] ${className}`}>
    <div className="text-center">
      <p className="text-xs font-medium">Vendor</p>
      <p className="mt-2 text-4xl font-semibold">{getVendorInitials(vendor.name)}</p>
    </div>
  </div>
);

const VendorImage: React.FC<{ src?: string; vendor: SampleVendor; className?: string }> = ({ src, vendor, className = '' }) => {
  if (!src) return <VendorImageFallback vendor={vendor} className={className} />;
  return <img src={src} alt="" className={className} />;
};

const ShellPreview: React.FC<{ template: VendorTemplate; vendor: SampleVendor }> = ({ template, vendor }) => {
  if (template.id === 'floral' || template.id === 'magazine') {
    return (
      <div className="overflow-hidden rounded-lg border border-[#dfd0bc] bg-[#fbf7f0] shadow-sm">
        <div className="grid gap-0 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="flex flex-col justify-between bg-[#2f261d] p-6 text-[#f8f3ec] sm:p-8">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#d8c4ad]">Floral lookbook</p>
              <h3 className="mt-6 text-4xl font-semibold leading-[0.98] sm:text-6xl">{vendor.name}</h3>
              <p className="mt-5 max-w-md text-base leading-7 text-[#efe4d8]">{vendor.descriptor}</p>
            </div>
            <div className="mt-8 grid gap-3 text-sm text-[#d8c4ad]">
              <div className="border-t border-white/15 pt-4">{vendor.category}</div>
              <div className="border-t border-white/15 pt-4">{vendor.location}</div>
              <div className="border-t border-white/15 pt-4">{vendor.sourceQuality}</div>
            </div>
          </div>
          <div className="grid gap-3 p-3 sm:grid-cols-[1.15fr_0.85fr]">
            <VendorImage src={vendor.images[0]} vendor={vendor} className="min-h-96 w-full rounded-lg object-cover" />
            <div className="grid gap-3">
              <VendorImage src={vendor.images[1]} vendor={vendor} className="min-h-44 w-full rounded-lg object-cover" />
              <div className="rounded-lg bg-white p-5">
                <p className="text-xs font-semibold text-[#9a7a59]">Palette and scale</p>
                <p className="mt-3 text-sm leading-6 text-[#4b3a2c]">{vendor.about}</p>
                <button className="mt-5 w-full rounded-lg bg-[#2f261d] px-4 py-3 text-sm font-semibold text-white">Start inquiry</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (template.id === 'food') {
    const featureImages = [vendor.images[1], vendor.images[2], vendor.images[3]];
    return (
      <div className="overflow-hidden rounded-lg border border-[#dfd0bc] bg-[#fffaf3] shadow-sm">
        <div className="grid gap-0 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="p-5 sm:p-7">
            <div className="overflow-hidden rounded-lg bg-[#e9dfd2]">
              <VendorImage src={vendor.images[0]} vendor={vendor} className="h-[29rem] w-full object-cover" />
            </div>
          </div>
          <div className="flex flex-col justify-between bg-[#3a2a1f] p-6 text-[#f8f3ec] sm:p-8">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#d8c4ad]">Food and beverage</p>
              <h3 className="mt-5 text-4xl font-semibold leading-[1] sm:text-6xl">{vendor.name}</h3>
              <p className="mt-5 max-w-lg text-base leading-7 text-[#efe4d8]">{vendor.descriptor}</p>
              <div className="mt-7 grid gap-3 sm:grid-cols-3">
                {['Tasting path', 'Service style', 'Menu confidence'].map((item) => (
                  <div key={item} className="rounded-lg border border-white/15 px-4 py-3 text-sm text-[#f5e9db]">{item}</div>
                ))}
              </div>
            </div>
            <div className="mt-8 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
              <p className="text-sm leading-6 text-[#d8c4ad]">{vendor.about}</p>
              <button className="rounded-lg bg-[#f5e9db] px-5 py-3 text-sm font-semibold text-[#2f261d]">Request tasting</button>
            </div>
          </div>
        </div>
        <div className="grid gap-3 bg-white p-4 sm:grid-cols-3">
          {featureImages.map((image, index) => (
            <VendorImage key={image ?? `food-fallback-${index}`} src={image} vendor={vendor} className="h-40 w-full rounded-lg object-cover" />
          ))}
        </div>
      </div>
    );
  }

  if (template.id === 'beauty') {
    return (
      <div className="rounded-lg border border-[#e7dac8] bg-[#fbf7f0] p-4 shadow-sm sm:p-6">
        <div className="grid gap-5 lg:grid-cols-[0.78fr_1.22fr]">
          <div className="flex flex-col justify-between rounded-lg bg-white p-6">
            <div>
              <p className="text-xs font-semibold text-[#9a7a59]">Beauty and attire</p>
              <h3 className="mt-4 text-4xl font-semibold leading-tight text-[#2f261d]">{vendor.name}</h3>
              <p className="mt-4 text-sm leading-6 text-[#6f5843]">{vendor.descriptor}</p>
            </div>
            <div className="mt-8 grid gap-2 text-sm text-[#4b3a2c]">
              <div className="rounded-lg bg-[#f8f3ec] px-4 py-3">Trial ready</div>
              <div className="rounded-lg bg-[#f8f3ec] px-4 py-3">Wedding morning timing</div>
              <div className="rounded-lg bg-[#f8f3ec] px-4 py-3">Party service menu</div>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-[1.05fr_0.95fr]">
            <VendorImage src={vendor.images[0]} vendor={vendor} className="min-h-[28rem] w-full rounded-lg object-cover" />
            <div className="grid gap-3">
              <VendorImage src={vendor.images[1]} vendor={vendor} className="min-h-48 w-full rounded-lg object-cover" />
              <div className="rounded-lg bg-[#2f261d] p-5 text-[#f8f3ec]">
                <p className="text-xs font-semibold text-[#d8c4ad]">Booking path</p>
                <p className="mt-3 text-sm leading-6 text-[#efe4d8]">{vendor.about}</p>
                <button className="mt-5 w-full rounded-lg bg-[#f5e9db] px-4 py-3 text-sm font-semibold text-[#2f261d]">Book a trial</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (template.id === 'music') {
    return (
      <div className="overflow-hidden rounded-lg border border-[#d9c8b3] bg-[#151311] text-[#f8f3ec] shadow-sm">
        <div className="grid gap-0 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="relative min-h-[32rem]">
            <VendorImage src={vendor.images[0]} vendor={vendor} className="absolute inset-0 h-full w-full object-cover opacity-80" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-black/15" />
            <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#d8c4ad]">Music and entertainment</p>
              <h3 className="mt-4 max-w-2xl text-5xl font-semibold leading-[0.98] sm:text-7xl">{vendor.name}</h3>
              <p className="mt-5 max-w-xl text-base leading-7 text-[#efe4d8]">{vendor.descriptor}</p>
            </div>
          </div>
          <div className="flex flex-col justify-between p-6 sm:p-8">
            <div className="grid gap-3">
              {['Ceremony cues', 'Cocktail texture', 'Reception energy', 'After-party handoff'].map((item) => (
                <div key={item} className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm">
                  <span>{item}</span>
                  <span className="h-2 w-16 rounded-full bg-[#d8c4ad]" />
                </div>
              ))}
            </div>
            <div className="mt-8">
              <p className="text-sm leading-6 text-[#d8c4ad]">{vendor.about}</p>
              <button className="mt-5 w-full rounded-lg bg-[#f5e9db] px-4 py-3 text-sm font-semibold text-[#2f261d]">Hear sample set</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (template.id === 'travel') {
    return (
      <div className="rounded-lg border border-[#d9c8b3] bg-white p-5 shadow-sm sm:p-7">
        <div className="grid gap-6 lg:grid-cols-[0.92fr_1.08fr]">
          <div>
            <p className="text-xs font-semibold text-[#8b6f53]">Travel and logistics</p>
            <h3 className="mt-3 text-4xl font-semibold leading-tight text-[#2f261d]">{vendor.name}</h3>
            <p className="mt-3 text-sm leading-6 text-[#6f5843]">{vendor.descriptor}</p>
            <div className="mt-6 grid gap-3">
              {['Pickup windows', 'Guest movement', 'Day-of contact'].map((item, index) => (
                <div key={item} className="grid grid-cols-[auto_1fr] gap-3 rounded-lg bg-[#fbf7f0] p-4 text-sm text-[#4b3a2c]">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#2f261d] text-xs font-semibold text-white">{index + 1}</span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-lg bg-[#f5e9db] p-5">
            <div className="grid min-h-80 place-items-center rounded-lg border border-dashed border-[#c9b69d] bg-white/70 p-6 text-center">
              <div>
                <p className="text-xs font-semibold text-[#9a7a59]">Route clarity</p>
                <p className="mt-3 text-3xl font-semibold text-[#2f261d]">{vendor.location}</p>
                <p className="mt-3 text-sm leading-6 text-[#6f5843]">{vendor.about}</p>
                <button className="mt-6 rounded-lg bg-[#2f261d] px-5 py-3 text-sm font-semibold text-white">Confirm logistics</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (template.id === 'service' || template.id === 'booking') {
    return (
      <div className="rounded-lg border border-[#d9c8b3] bg-white p-4 shadow-sm sm:p-6">
        <div className="grid gap-6 lg:grid-cols-[0.74fr_1.26fr]">
          <div className="rounded-lg bg-[#f5e9db] p-5">
            <p className="text-xs font-semibold text-[#8b6f53]">Service snapshot</p>
            <h3 className="mt-3 text-3xl font-semibold leading-tight text-[#2f261d]">{vendor.name}</h3>
            <p className="mt-3 text-sm leading-6 text-[#6f5843]">{vendor.descriptor}</p>
            <div className="mt-5 space-y-2 text-sm text-[#4b3a2c]">
              <div className="rounded-lg bg-white px-4 py-3">{vendor.category}</div>
              <div className="rounded-lg bg-white px-4 py-3">{vendor.location}</div>
              <div className="rounded-lg bg-white px-4 py-3">{vendor.email}</div>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-[1fr_0.82fr]">
            <VendorImage src={vendor.images[0]} vendor={vendor} className="min-h-80 w-full rounded-lg object-cover" />
            <div className="flex flex-col justify-between rounded-lg border border-[#eadfce] p-5">
              <div>
                <p className="text-xs font-semibold text-[#9a7a59]">Next step</p>
                <p className="mt-3 text-sm leading-6 text-[#6f5843]">{vendor.about}</p>
              </div>
              <div className="mt-5 grid gap-2">
                <button className="rounded-lg bg-[#2f261d] px-4 py-3 text-sm font-semibold text-white">Send inquiry</button>
                <button className="rounded-lg border border-[#eadfce] px-4 py-3 text-sm font-semibold text-[#4b3a2c]">Email vendor</button>
                <div className="flex flex-wrap gap-2 pt-2">
                  {vendor.links.map((link) => (
                    <span key={link} className="rounded-lg bg-[#fbf7f0] px-3 py-1 text-xs text-[#6f5843]">{link}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (template.id === 'photography' || template.id === 'portfolio') {
    const gallerySlots = [vendor.images[1], vendor.images[2], vendor.images[3]];
    return (
      <div className="overflow-hidden rounded-lg border border-[#e7dac8] bg-[#fbf7f0] shadow-sm">
        <div className="grid gap-2 p-3 sm:grid-cols-[1.1fr_0.9fr]">
          <VendorImage src={vendor.images[0]} vendor={vendor} className="h-72 w-full rounded-lg object-cover" />
          <div className="grid grid-cols-2 gap-2">
            {gallerySlots.map((image, index) => (
              <VendorImage key={image ?? `fallback-${index}`} src={image} vendor={vendor} className="h-full min-h-32 w-full rounded object-cover" />
            ))}
            <div className="flex min-h-32 items-center justify-center rounded bg-[#2f261d] px-4 text-center text-xs font-semibold text-[#f5e9db]">
              Featured work
            </div>
          </div>
        </div>
        <div className="grid gap-5 px-5 pb-5 pt-2 sm:grid-cols-[1fr_0.68fr]">
          <div>
            <p className="text-xs font-semibold text-[#9a7a59]">Wedding vendor</p>
            <h3 className="mt-2 text-3xl font-semibold text-[#2f261d]">{vendor.name}</h3>
            <p className="mt-1 text-xs font-medium text-[#9a7a59]">{vendor.category} · {vendor.location}</p>
            <p className="mt-2 text-sm leading-6 text-[#6f5843]">{vendor.about}</p>
          </div>
          <div className="rounded-lg bg-white p-4">
            <p className="text-xs font-semibold text-[#9a7a59]">Contact</p>
            <div className="mt-3 space-y-2">
              {vendor.links.map((link) => (
                <div key={link} className="flex items-center justify-between rounded-lg border border-[#eadfce] px-3 py-2 text-sm text-[#4b3a2c]">
                  {link}
                  <ExternalLink className="h-3.5 w-3.5" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (template.id === 'planner' || template.id === 'minimal') {
    return (
      <div className="rounded-lg border border-[#e7dac8] bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
          <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-lg bg-[#f5e9db] text-3xl font-semibold text-[#8b6f53]">
            {getVendorInitials(vendor.name)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-[#9a7a59]">Planning partner</p>
            <h3 className="mt-2 text-3xl font-semibold leading-tight text-[#2f261d]">{vendor.name}</h3>
            <p className="mt-2 text-base text-[#6f5843]">{vendor.descriptor}</p>
            <p className="mt-2 text-xs font-medium text-[#9a7a59]">{vendor.category} · {vendor.location}</p>
          </div>
          <div className="grid gap-2 sm:w-52">
            <button className="rounded-lg bg-[#2f261d] px-4 py-3 text-sm font-semibold text-white">Request consult</button>
            <button className="rounded-lg border border-[#eadfce] px-4 py-3 text-sm font-semibold text-[#4b3a2c]">Review process</button>
          </div>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg bg-[#fbf7f0] p-4">
            <Instagram className="h-4 w-4 text-[#8b6f53]" />
            <p className="mt-2 text-sm text-[#4b3a2c]">Source profile attached</p>
          </div>
          <div className="rounded-lg bg-[#fbf7f0] p-4">
            <Mail className="h-4 w-4 text-[#8b6f53]" />
            <p className="mt-2 text-sm text-[#4b3a2c]">{vendor.email}</p>
          </div>
          <div className="rounded-lg bg-[#fbf7f0] p-4">
            <CheckCircle2 className="h-4 w-4 text-[#8b6f53]" />
            <p className="mt-2 text-sm text-[#4b3a2c]">Process-first review</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-[#e7dac8] bg-white shadow-sm">
      <div className="relative min-h-[360px]">
        <VendorImage src={vendor.images[0]} vendor={vendor} className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-6 text-white sm:p-8">
          <p className="text-xs font-semibold text-white/75">Venue profile</p>
          <h3 className="mt-3 max-w-2xl text-4xl font-semibold leading-tight sm:text-6xl">{vendor.name}</h3>
          <p className="mt-3 max-w-xl text-base text-white/85">{vendor.descriptor}</p>
          <p className="mt-3 text-xs font-medium text-white/70">{vendor.category} · {vendor.location}</p>
        </div>
      </div>
      <div className="grid gap-6 p-6 sm:grid-cols-[1fr_0.62fr] sm:p-8">
        <p className="text-base leading-8 text-[#4b3a2c]">{vendor.about}</p>
        <div className="rounded-lg bg-[#f8f3ec] p-4">
          <p className="text-xs font-semibold text-[#9a7a59]">Tour path</p>
          <button className="mt-3 w-full rounded-lg bg-[#2f261d] px-4 py-3 text-sm font-semibold text-white">Request tour</button>
          <div className="mt-3 flex flex-wrap gap-2">
            {vendor.links.map((link) => (
              <span key={link} className="rounded-lg bg-white px-3 py-1 text-xs text-[#6f5843]">{link}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export const VendorTemplates: React.FC = () => {
  const [activeId, setActiveId] = useState<VendorTemplateId>('photography');
  const [selectedVendorId, setSelectedVendorId] = useState(sampleVendors[0].id);
  const [category, setCategory] = useState('All');
  const [location, setLocation] = useState('All');
  const [sourceQuality, setSourceQuality] = useState('All');
  const [search, setSearch] = useState('');
  const [inquiries, setInquiries] = useState<VendorProfileInquiry[]>([]);
  const [loadingInquiries, setLoadingInquiries] = useState(false);
  const [inquiryError, setInquiryError] = useState('');
  const creationEnabled = isVendorProfileCreationEnabled();
  const activeTemplate = useMemo(() => templates.find((template) => template.id === activeId) ?? templates[0], [activeId]);
  const categories = useMemo(() => ['All', ...Array.from(new Set(sampleVendors.map((vendor) => vendor.category))).sort()], []);
  const locations = useMemo(() => ['All', ...Array.from(new Set(sampleVendors.map((vendor) => vendor.location))).sort()], []);
  const sourceQualities = useMemo(() => ['All', ...Array.from(new Set(sampleVendors.map((vendor) => vendor.sourceQuality))).sort()], []);
  const filteredVendors = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sampleVendors.filter((vendor) => {
      const categoryOk = category === 'All' || vendor.category === category;
      const locationOk = location === 'All' || vendor.location === location;
      const sourceOk = sourceQuality === 'All' || vendor.sourceQuality === sourceQuality;
      const searchOk = !q || [vendor.name, vendor.category, vendor.location, vendor.descriptor, vendor.sourceQuality].join(' ').toLowerCase().includes(q);
      return categoryOk && locationOk && sourceOk && searchOk;
    });
  }, [category, location, search, sourceQuality]);
  const activeVendor = useMemo(
    () => filteredVendors.find((vendor) => vendor.id === selectedVendorId) ?? filteredVendors[0] ?? sampleVendors[0],
    [filteredVendors, selectedVendorId],
  );
  const loadInquiries = async () => {
    try {
      setLoadingInquiries(true);
      setInquiryError('');
      setInquiries(await listMyVendorProfileInquiries());
    } catch {
      setInquiryError('Couldn’t load vendor inquiries right now.');
    } finally {
      setLoadingInquiries(false);
    }
  };

  useEffect(() => {
    void loadInquiries();
  }, []);

  return (
    <div className="min-h-screen bg-[#f6f1ea] px-4 py-8 text-[#2f261d] sm:px-6">
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold text-[#8b6f53]">Vendor page designs</p>
            <h1 className="mt-3 text-4xl font-semibold leading-tight sm:text-6xl">Choose how each vendor should feel.</h1>
            <p className="mt-4 text-base leading-7 text-[#6f5843]">
              Compare polished vendor page styles, image states, and contact flows before a generated page is shared with couples.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            {sampleProfileLinks.map((link) => (
              <Link key={link.href} to={link.href} className="inline-flex items-center rounded-lg border border-[#d8c8b6] bg-white px-4 py-3 text-sm font-semibold text-[#4b3a2c]">
                {link.label}
              </Link>
            ))}
            {creationEnabled ? (
              <Link to="/vendor-profile-v1" className="inline-flex items-center rounded-lg bg-[#2f261d] px-5 py-3 text-sm font-semibold text-white">
                Generate vendor page
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            ) : (
              <span className="inline-flex items-center rounded-lg bg-[#2f261d]/70 px-5 py-3 text-sm font-semibold text-white">
                Generator paused
                <ShieldCheck className="ml-2 h-4 w-4" />
              </span>
            )}
            <a href="#review" className="inline-flex items-center rounded-lg border border-[#d8c8b6] bg-white px-5 py-3 text-sm font-semibold text-[#4b3a2c]">
              Review checklist
            </a>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {templates.map((template) => {
            const selected = template.id === activeTemplate.id;
            return (
              <button
                key={template.id}
                type="button"
                onClick={() => setActiveId(template.id)}
                className={`rounded-lg border p-5 text-left transition ${selected ? 'border-[#2f261d] bg-white shadow-sm' : 'border-[#e7dac8] bg-white/70 hover:bg-white'}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold text-[#8b6f53]">{template.label}</p>
                    <h2 className="mt-2 text-xl font-semibold text-[#2f261d]">{template.name}</h2>
                  </div>
                  <span className={`rounded-lg px-3 py-1 text-xs font-semibold ${template.status === 'ready' ? 'border border-[#d8c8b6] bg-white text-[#4b3a2c]' : 'bg-stone-100 text-stone-700'}`}>
                    {statusCopy[template.status]}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6 text-[#6f5843]">{template.summary}</p>
                <p className="mt-4 text-xs font-medium text-[#9a7a59]">Best for {template.bestFor}</p>
              </button>
            );
          })}
        </section>

        <section className="grid gap-6 xl:grid-cols-[0.72fr_1.28fr]">
          <aside className="space-y-4">
          <div className="rounded-lg border border-[#e7dac8] bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#f5e9db]">
                <Palette className="h-5 w-5 text-[#8b6f53]" />
              </div>
              <div>
                <p className="text-xs font-semibold text-[#8b6f53]">Selected design</p>
                <h2 className="text-xl font-semibold">{activeTemplate.name}</h2>
              </div>
            </div>
            <div className="mt-6 space-y-4 text-sm leading-6 text-[#6f5843]">
              <p>{activeTemplate.summary}</p>
              <div className="rounded-lg bg-[#fbf7f0] p-4">
                <p className="text-xs font-semibold text-[#8b6f53]">Works well with</p>
                <ul className="mt-3 space-y-2">
                  <li>Strong website details</li>
                  <li>Social profile only</li>
                  <li>Screenshot-based starting point</li>
                  <li>Needs images</li>
                  <li>Direct email and inquiry-only modes</li>
                </ul>
              </div>
              <div className="rounded-lg bg-[#2f261d] p-4 text-[#f5e9db]">
                <Sparkles className="h-4 w-4" />
                <p className="mt-2 text-sm">Use this page to compare the feel before creating the real vendor page.</p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-[#e7dac8] bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold text-[#8b6f53]">Vendor browser</p>
            <div className="mt-4 grid gap-3">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search vendor, flowers, location..."
                className="w-full rounded-lg border border-[#eadfce] px-4 py-3 text-sm outline-none"
              />
              <div className="grid gap-3 sm:grid-cols-3">
                <select value={category} onChange={(event) => setCategory(event.target.value)} className="rounded-lg border border-[#eadfce] bg-white px-4 py-3 text-sm outline-none">
                  {categories.map((item) => <option key={item}>{item}</option>)}
                </select>
                <select value={location} onChange={(event) => setLocation(event.target.value)} className="rounded-lg border border-[#eadfce] bg-white px-4 py-3 text-sm outline-none">
                  {locations.map((item) => <option key={item}>{item}</option>)}
                </select>
                <select value={sourceQuality} onChange={(event) => setSourceQuality(event.target.value)} className="rounded-lg border border-[#eadfce] bg-white px-4 py-3 text-sm outline-none">
                  {sourceQualities.map((item) => <option key={item}>{item}</option>)}
                </select>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              {filteredVendors.map((vendor) => {
                const selected = vendor.id === activeVendor.id;
                return (
                  <button
                    key={vendor.id}
                    type="button"
                    onClick={() => setSelectedVendorId(vendor.id)}
                    className={`w-full rounded-lg border px-4 py-3 text-left transition ${selected ? 'border-[#2f261d] bg-[#fbf7f0]' : 'border-[#eadfce] bg-white hover:bg-[#fbf7f0]'}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-[#2f261d]">{vendor.name}</p>
                        <p className="mt-1 text-xs text-[#8b6f53]">{vendor.category} · {vendor.location}</p>
                      </div>
                      <span className="rounded-lg bg-[#f5e9db] px-2 py-1 text-[10px] font-medium text-[#8b6f53]">{vendor.sourceQuality}</span>
                    </div>
                  </button>
                );
              })}
              {filteredVendors.length === 0 && (
                <div className="rounded-lg border border-dashed border-[#d8c8b6] px-4 py-5 text-sm text-[#6f5843]">
                  No sample vendors match those filters yet.
                </div>
              )}
            </div>
          </div>
          </aside>

          <main>
            <ShellPreview template={activeTemplate} vendor={activeVendor} />
          </main>
        </section>

        <section id="review" className="rounded-lg border border-[#e7dac8] bg-white p-6 shadow-sm sm:p-8">
          <p className="text-xs font-semibold text-[#8b6f53]">Review checklist</p>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {[
              'Generate a vendor draft from website details.',
              'Generate a vendor draft from social-only input.',
              'Edit hero, about, links, email, and image URLs.',
              'Publish and verify `/vendor/:slug` renders.',
              'Submit public inquiry and verify it appears here.',
              'Confirm creation is paused or intentionally enabled.',
              'Confirm public forms are protected before sharing.',
              'Confirm planner vendor can link to generated profile.',
            ].map((item) => (
              <div key={item} className="flex items-start gap-3 rounded-lg bg-[#fbf7f0] px-4 py-3 text-sm text-[#4b3a2c]">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#8b6f53]" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-[#e7dac8] bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold text-[#8b6f53]">Inquiry inbox</p>
              <h2 className="mt-2 text-2xl font-semibold text-[#2f261d]">Recent vendor inquiries</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#6f5843]">
                Public vendor pages save inquiries here for review. This only shows inquiries tied to vendor pages created by this account.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void loadInquiries()}
              disabled={loadingInquiries}
              className="inline-flex items-center justify-center rounded-lg border border-[#d8c8b6] px-4 py-3 text-sm font-semibold text-[#4b3a2c] disabled:opacity-60"
            >
              {loadingInquiries ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>

          {inquiryError && (
            <div className="mt-4 rounded-lg border border-[#d8c8b6] bg-white px-4 py-3 text-sm text-[#6f5843]">
              {inquiryError}
            </div>
          )}

          <div className="mt-5 space-y-3">
            {inquiries.map((inquiry) => (
              <article key={inquiry.id} className="rounded-lg border border-[#eadfce] bg-[#fbf7f0] p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-[#2f261d]">{inquiry.name}</p>
                    <p className="text-xs text-[#8b6f53]">{inquiry.email}</p>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="text-xs font-medium text-[#9a7a59]">{inquiry.vendor_name}</p>
                    <p className="mt-1 text-xs text-[#8b6f53]">{new Date(inquiry.created_at).toLocaleString()}</p>
                  </div>
                </div>
                <p className="mt-3 text-sm leading-6 text-[#4b3a2c]">{inquiry.message}</p>
                {inquiry.vendor_slug && (
                  <Link to={`/vendor/${inquiry.vendor_slug}`} className="mt-3 inline-flex text-sm font-semibold text-[#2f261d] underline decoration-[#d8c8b6] underline-offset-4">
                    Open vendor page
                  </Link>
                )}
              </article>
            ))}
            {!loadingInquiries && inquiries.length === 0 && !inquiryError && (
              <div className="rounded-lg border border-dashed border-[#d8c8b6] px-4 py-5 text-sm text-[#6f5843]">
                No vendor inquiries yet. Submit one from a published vendor page to verify the full loop.
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default VendorTemplates;
