import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, ExternalLink, Instagram, Mail, Palette, ShieldCheck, Sparkles } from 'lucide-react';
import { listMyVendorProfileInquiries, type VendorProfileInquiry } from '../lib/vendorProfiles';
import { isVendorProfileCreationEnabled } from '../lib/vendorProfileLaunch';

type VendorTemplateId = 'editorial' | 'portfolio' | 'minimal';

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
    id: 'editorial',
    name: 'Editorial Feature',
    label: 'Hero-led',
    bestFor: 'photographers, venues, planners, florists',
    status: 'ready',
    summary: 'Large visual lead, polished about copy, gallery, links, and inquiry path.',
  },
  {
    id: 'portfolio',
    name: 'Portfolio Grid',
    label: 'Image-forward',
    bestFor: 'photo, video, beauty, rentals, decor',
    status: 'review',
    summary: 'Prioritizes image breadth and links when the vendor has strong visuals.',
  },
  {
    id: 'minimal',
    name: 'Concierge Card',
    label: 'Simple profile',
    bestFor: 'social-only vendors, DJs, transportation, day-of contacts',
    status: 'review',
    summary: 'Works when details are sparse: clean identity, core links, direct inquiry, and no invented claims.',
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
  if (template.id === 'portfolio') {
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
              View work
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

  if (template.id === 'minimal') {
    return (
      <div className="rounded-lg border border-[#e7dac8] bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
          <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-lg bg-[#f5e9db] text-3xl font-semibold text-[#8b6f53]">
            {getVendorInitials(vendor.name)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-[#9a7a59]">Preferred vendor</p>
            <h3 className="mt-2 text-3xl font-semibold leading-tight text-[#2f261d]">{vendor.name}</h3>
            <p className="mt-2 text-base text-[#6f5843]">{vendor.descriptor}</p>
            <p className="mt-2 text-xs font-medium text-[#9a7a59]">{vendor.category} · {vendor.location}</p>
          </div>
          <div className="grid gap-2 sm:w-52">
            <button className="rounded-lg bg-[#2f261d] px-4 py-3 text-sm font-semibold text-white">Send inquiry</button>
            <button className="rounded-lg border border-[#eadfce] px-4 py-3 text-sm font-semibold text-[#4b3a2c]">Open links</button>
          </div>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg bg-[#fbf7f0] p-4">
            <Instagram className="h-4 w-4 text-[#8b6f53]" />
            <p className="mt-2 text-sm text-[#4b3a2c]">Social profile attached</p>
          </div>
          <div className="rounded-lg bg-[#fbf7f0] p-4">
            <Mail className="h-4 w-4 text-[#8b6f53]" />
            <p className="mt-2 text-sm text-[#4b3a2c]">{vendor.email}</p>
          </div>
          <div className="rounded-lg bg-[#fbf7f0] p-4">
            <CheckCircle2 className="h-4 w-4 text-[#8b6f53]" />
            <p className="mt-2 text-sm text-[#4b3a2c]">No unsupported claims required</p>
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
          <p className="text-xs font-semibold text-white/75">Wedding vendor</p>
          <h3 className="mt-3 max-w-2xl text-4xl font-semibold leading-tight sm:text-6xl">{vendor.name}</h3>
          <p className="mt-3 max-w-xl text-base text-white/85">{vendor.descriptor}</p>
          <p className="mt-3 text-xs font-medium text-white/70">{vendor.category} · {vendor.location}</p>
        </div>
      </div>
      <div className="grid gap-6 p-6 sm:grid-cols-[1fr_0.62fr] sm:p-8">
        <p className="text-base leading-8 text-[#4b3a2c]">{vendor.about}</p>
        <div className="rounded-lg bg-[#f8f3ec] p-4">
          <p className="text-xs font-semibold text-[#9a7a59]">Next step</p>
          <button className="mt-3 w-full rounded-lg bg-[#2f261d] px-4 py-3 text-sm font-semibold text-white">Inquire</button>
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
  const [activeId, setActiveId] = useState<VendorTemplateId>('editorial');
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

        <section className="grid gap-4 lg:grid-cols-3">
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
