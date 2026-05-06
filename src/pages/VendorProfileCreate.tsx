import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  VENDOR_ACCENT_OPTIONS,
  VENDOR_GALLERY_LAYOUT_OPTIONS,
  VENDOR_SECTION_IDS,
  createVendorProfile,
  generateVendorProfileDraft,
  normalizeVendorProfileCustomization,
  normalizeVendorTemplateId,
  type VendorAccentId,
  type VendorGalleryLayoutId,
  type VendorProfile,
  type VendorProfileDraft,
  type VendorSectionId,
  type VendorTemplateId,
} from '../lib/vendorProfiles';
import { useToast } from '../components/ui/Toast';
import { copyTextOrDownload } from '../lib/copyText';
import { getSafePublicEmailHref, getSafePublicImageUrl, getSafePublicInstagramUrl, getSafePublicWebUrl } from '../sections/publicLinks';
import { isVendorProfileCreationEnabled } from '../lib/vendorProfileLaunch';

function normalizeImageLines(input: string): string[] {
  return input
    .split(/\n|,/)
    .map((item) => getSafePublicImageUrl(item))
    .filter(Boolean)
    .filter((item, index, arr) => arr.indexOf(item) === index)
    .slice(0, 6);
}

function draftLinks(draft: VendorProfileDraft) {
  const instagramUrl = getSafePublicInstagramUrl(draft.instagram_url);
  const websiteUrl = getSafePublicWebUrl(draft.website_url);
  const pinterestUrl = typeof draft.source_payload?.pinterest_url === 'string' ? getSafePublicWebUrl(draft.source_payload.pinterest_url) : '';
  const tiktokUrl = typeof draft.source_payload?.tiktok_url === 'string' ? getSafePublicWebUrl(draft.source_payload.tiktok_url) : '';
  const facebookUrl = typeof draft.source_payload?.facebook_url === 'string' ? getSafePublicWebUrl(draft.source_payload.facebook_url) : '';
  const youtubeUrl = typeof draft.source_payload?.youtube_url === 'string' ? getSafePublicWebUrl(draft.source_payload.youtube_url) : '';

  return [
    instagramUrl ? { label: 'Instagram', href: instagramUrl } : null,
    websiteUrl ? { label: 'Website', href: websiteUrl } : null,
    pinterestUrl ? { label: 'Pinterest', href: pinterestUrl } : null,
    tiktokUrl ? { label: 'TikTok', href: tiktokUrl } : null,
    facebookUrl ? { label: 'Facebook', href: facebookUrl } : null,
    youtubeUrl ? { label: 'YouTube', href: youtubeUrl } : null,
  ].filter((item): item is { label: string; href: string } => Boolean(item));
}

const vendorTemplateOptions: Array<{ id: VendorTemplateId; name: string; detail: string }> = [
  { id: 'photography', name: 'Photography portfolio', detail: 'Image-led story, gallery rhythm, and clear package inquiry for photo and video teams.' },
  { id: 'floral', name: 'Floral lookbook', detail: 'Texture, palette, installation moments, and inquiry copy for florists and decor studios.' },
  { id: 'venue', name: 'Venue estate', detail: 'Large location hero, event-flow details, capacity-style proof, and tour-first CTA.' },
  { id: 'food', name: 'Food and beverage', detail: 'Menu confidence, service style, tasting CTA, and proof points for caterers, cakes, and bar teams.' },
  { id: 'beauty', name: 'Beauty and attire', detail: 'Artist-led portfolio, service menu, trial-ready contact path, and fit for salons, glam, and jewelry.' },
  { id: 'music', name: 'Music and entertainment', detail: 'Energy, sample-set proof, reception timing, and booking CTA for bands, DJs, and performers.' },
  { id: 'planner', name: 'Planner concierge', detail: 'Process, trust, logistics calm, and premium inquiry copy for planners and coordinators.' },
  { id: 'travel', name: 'Travel and logistics', detail: 'Route, room-block, shuttle, and guest-movement clarity for transportation and travel vendors.' },
  { id: 'service', name: 'Service card', detail: 'Fast-contact layout for officiants, rentals, specialty vendors, and practical services.' },
];

function getDraftTemplateId(draft: VendorProfileDraft): VendorTemplateId {
  return normalizeVendorTemplateId(draft.source_payload?.template_id);
}

function withTemplateId(draft: VendorProfileDraft, templateId: VendorTemplateId): VendorProfileDraft {
  const customization = normalizeVendorProfileCustomization(draft.source_payload);
  return {
    ...draft,
    source_payload: {
      ...draft.source_payload,
      template_id: templateId,
      vendor_customization: {
        ...customization,
        accent_id: customization.accent_id,
      },
    },
  };
}

function updateDraftCustomization(
  draft: VendorProfileDraft,
  patch: Partial<{
    accent_id: VendorAccentId;
    gallery_layout: VendorGalleryLayoutId;
    logo_text: string;
    cta_label: string;
    service_area: string;
    pricing_note: string;
    proof_points: string[];
    section_order: VendorSectionId[];
    hidden_sections: VendorSectionId[];
    packages: Array<{ title: string; detail: string; price?: string | null }>;
    faqs: Array<{ question: string; answer: string }>;
    testimonials: Array<{ quote: string; attribution?: string | null }>;
    inquiry_questions: string[];
    external_credibility: {
      enabled?: boolean;
      source_label?: string | null;
      rating?: number | string | null;
      review_count?: number | string | null;
      profile_url?: string | null;
      place_id?: string | null;
      last_synced_at?: string | null;
    };
    rating: {
      enabled?: boolean;
      overall_score?: number | string | null;
      summary?: string | null;
      categories?: Array<{ label: string; score: number | string }>;
    };
  }>,
): VendorProfileDraft {
  const current = normalizeVendorProfileCustomization(draft.source_payload);
  return {
    ...draft,
    source_payload: {
      ...draft.source_payload,
      vendor_customization: {
        ...current,
        ...patch,
      },
    },
  };
}

function updateArrayItem<T>(items: T[], index: number, patch: Partial<T>, fallback: T): T[] {
  const next = [...items];
  next[index] = { ...(next[index] ?? fallback), ...patch };
  return next;
}

function readRawCustomizationArray<T>(draft: VendorProfileDraft, key: string): T[] {
  const rawCustomization = draft.source_payload.vendor_customization;
  if (!rawCustomization || typeof rawCustomization !== 'object' || Array.isArray(rawCustomization)) return [];
  const value = (rawCustomization as Record<string, unknown>)[key];
  return Array.isArray(value) ? value as T[] : [];
}

function sanitizeDraftForPublish(draft: VendorProfileDraft): VendorProfileDraft {
  const customization = normalizeVendorProfileCustomization(draft.source_payload);
  return {
    ...draft,
    hero_image_url: getSafePublicImageUrl(draft.hero_image_url) || null,
    image_urls: draft.image_urls.map((image) => getSafePublicImageUrl(image)).filter(Boolean),
    instagram_url: getSafePublicInstagramUrl(draft.instagram_url) || null,
    website_url: getSafePublicWebUrl(draft.website_url) || null,
    contact_email: getSafePublicEmailHref(draft.contact_email) ? draft.contact_email : null,
    source_payload: {
      ...draft.source_payload,
      vendor_customization: customization,
      pinterest_url: typeof draft.source_payload?.pinterest_url === 'string' ? getSafePublicWebUrl(draft.source_payload.pinterest_url) || null : null,
      tiktok_url: typeof draft.source_payload?.tiktok_url === 'string' ? getSafePublicWebUrl(draft.source_payload.tiktok_url) || null : null,
      facebook_url: typeof draft.source_payload?.facebook_url === 'string' ? getSafePublicWebUrl(draft.source_payload.facebook_url) || null : null,
      youtube_url: typeof draft.source_payload?.youtube_url === 'string' ? getSafePublicWebUrl(draft.source_payload.youtube_url) || null : null,
    },
  };
}

export const VendorProfileCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const creationEnabled = isVendorProfileCreationEnabled();
  const [form, setForm] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return {
      vendorName: params.get('vendorName') ?? '',
      instagramUrl: params.get('instagramUrl') ?? '',
      websiteUrl: params.get('websiteUrl') ?? '',
      pinterestUrl: params.get('pinterestUrl') ?? '',
      tiktokUrl: params.get('tiktokUrl') ?? '',
      facebookUrl: params.get('facebookUrl') ?? '',
      youtubeUrl: params.get('youtubeUrl') ?? '',
      contactEmail: params.get('contactEmail') ?? '',
      templateId: normalizeVendorTemplateId(params.get('template')),
    };
  });
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState<VendorProfileDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [imageEditor, setImageEditor] = useState('');
  const [createdProfile, setCreatedProfile] = useState<VendorProfile | null>(null);
  const draftCustomization = draft ? normalizeVendorProfileCustomization(draft.source_payload) : null;

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const nextDraft = await generateVendorProfileDraft(form);
      const next = withTemplateId({ ...nextDraft, contact_email: form.contactEmail.trim() || nextDraft.contact_email }, form.templateId);
      setDraft(next);
      setCreatedProfile(null);
      setImageEditor([next.hero_image_url, ...next.image_urls].filter(Boolean).join('\n'));
      toast('Vendor draft generated.', 'success');
    } catch {
      toast('Couldn’t prepare that vendor page yet.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async () => {
    if (!draft) return;
    try {
      setSaving(true);
      const created = await createVendorProfile(sanitizeDraftForPublish(draft));
      setCreatedProfile(created);
      toast('Vendor page created.', 'success');
    } catch {
      toast('Couldn’t create that vendor page yet.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleCopyLiveUrl = async () => {
    if (!createdProfile) return;
    const url = `${window.location.origin}/vendor/${createdProfile.slug}`;
    const result = await copyTextOrDownload(url, 'dayof-vendor-profile-url.txt');
    if (result === 'copied') {
      toast('Live vendor URL copied.', 'success');
    } else {
      toast('Clipboard was blocked, so the vendor URL downloaded.', 'success');
    }
  };

  if (!creationEnabled) {
    return (
      <div className="min-h-screen bg-[#f6f1ea] px-4 py-8 text-[#2f261d] sm:px-6">
        <div className="mx-auto max-w-3xl space-y-5 rounded-lg bg-white p-6 shadow-sm sm:p-8">
          <p className="text-xs font-semibold text-[#8b6f53]">Vendor page studio</p>
          <h1 className="text-3xl font-semibold">Vendor page generation is paused</h1>
          <p className="text-sm leading-6 text-[#6f5843]">
            Vendor templates are still available for review. Turn on `VITE_ENABLE_VENDOR_PROFILE_CREATION=true` when profile generation is intentionally part of this launch.
          </p>
          <Link to="/vendor-templates" className="inline-flex rounded-lg bg-[#2f261d] px-4 py-2 text-sm font-semibold text-white">
            Review vendor templates
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f6f1ea] text-[#2f261d] px-4 py-8 sm:px-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="space-y-2">
          <p className="text-xs font-semibold text-[#8b6f53]">Vendor page studio</p>
          <h1 className="text-3xl sm:text-5xl font-semibold">Generate a vendor page</h1>
          <p className="text-[#6f5843] max-w-2xl">Start with a few details and turn them into a polished vendor page.</p>
          <Link to="/vendor-templates" className="inline-flex text-sm font-semibold text-[#6f5843] underline underline-offset-4">
            Browse vendor page designs
          </Link>
        </div>

        <form onSubmit={handleGenerate} className="rounded-lg bg-white p-6 sm:p-8 shadow-sm space-y-4" aria-busy={loading}>
          <div>
            <label htmlFor="vendor-create-name" className="mb-1 block text-sm font-semibold text-[#4b3a2c]">Vendor name</label>
            <input id="vendor-create-name" value={form.vendorName} onChange={(e) => setForm((prev) => ({ ...prev, vendorName: e.target.value }))} placeholder="Vendor name" className="w-full rounded-lg border border-[#eadfce] px-4 py-3 outline-none" required />
          </div>
          <div>
            <label htmlFor="vendor-create-instagram" className="mb-1 block text-sm font-semibold text-[#4b3a2c]">Instagram URL (optional)</label>
            <input id="vendor-create-instagram" value={form.instagramUrl} onChange={(e) => setForm((prev) => ({ ...prev, instagramUrl: e.target.value }))} placeholder="Instagram URL (optional)" className="w-full rounded-lg border border-[#eadfce] px-4 py-3 outline-none" />
          </div>
          <div>
            <label htmlFor="vendor-create-website" className="mb-1 block text-sm font-semibold text-[#4b3a2c]">Website URL (optional)</label>
            <input id="vendor-create-website" value={form.websiteUrl} onChange={(e) => setForm((prev) => ({ ...prev, websiteUrl: e.target.value }))} placeholder="Website URL (optional)" className="w-full rounded-lg border border-[#eadfce] px-4 py-3 outline-none" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="vendor-create-pinterest" className="mb-1 block text-sm font-semibold text-[#4b3a2c]">Pinterest URL (optional)</label>
              <input id="vendor-create-pinterest" value={form.pinterestUrl} onChange={(e) => setForm((prev) => ({ ...prev, pinterestUrl: e.target.value }))} placeholder="Pinterest URL (optional)" className="w-full rounded-lg border border-[#eadfce] px-4 py-3 outline-none" />
            </div>
            <div>
              <label htmlFor="vendor-create-tiktok" className="mb-1 block text-sm font-semibold text-[#4b3a2c]">TikTok URL (optional)</label>
              <input id="vendor-create-tiktok" value={form.tiktokUrl} onChange={(e) => setForm((prev) => ({ ...prev, tiktokUrl: e.target.value }))} placeholder="TikTok URL (optional)" className="w-full rounded-lg border border-[#eadfce] px-4 py-3 outline-none" />
            </div>
            <div>
              <label htmlFor="vendor-create-facebook" className="mb-1 block text-sm font-semibold text-[#4b3a2c]">Facebook URL (optional)</label>
              <input id="vendor-create-facebook" value={form.facebookUrl} onChange={(e) => setForm((prev) => ({ ...prev, facebookUrl: e.target.value }))} placeholder="Facebook URL (optional)" className="w-full rounded-lg border border-[#eadfce] px-4 py-3 outline-none" />
            </div>
            <div>
              <label htmlFor="vendor-create-youtube" className="mb-1 block text-sm font-semibold text-[#4b3a2c]">YouTube URL (optional)</label>
              <input id="vendor-create-youtube" value={form.youtubeUrl} onChange={(e) => setForm((prev) => ({ ...prev, youtubeUrl: e.target.value }))} placeholder="YouTube URL (optional)" className="w-full rounded-lg border border-[#eadfce] px-4 py-3 outline-none" />
            </div>
          </div>
          <div>
            <label htmlFor="vendor-create-contact-email" className="mb-1 block text-sm font-semibold text-[#4b3a2c]">Contact email for inquiry CTA (optional)</label>
            <input id="vendor-create-contact-email" type="email" value={form.contactEmail} onChange={(e) => setForm((prev) => ({ ...prev, contactEmail: e.target.value }))} placeholder="Contact email for inquiry CTA (optional)" className="w-full rounded-lg border border-[#eadfce] px-4 py-3 outline-none" />
          </div>
          <div>
            <label htmlFor="vendor-create-template" className="mb-2 block text-sm font-semibold text-[#4b3a2c]">Design style</label>
            <select
              id="vendor-create-template"
              value={form.templateId}
              onChange={(e) => setForm((prev) => ({ ...prev, templateId: normalizeVendorTemplateId(e.target.value) }))}
              className="w-full rounded-lg border border-[#eadfce] bg-white px-4 py-3 outline-none"
            >
              {vendorTemplateOptions.map((option) => (
                <option key={option.id} value={option.id}>{option.name}</option>
              ))}
            </select>
            <p className="mt-2 text-xs text-[#8b6f53]">
              {vendorTemplateOptions.find((option) => option.id === form.templateId)?.detail}
            </p>
          </div>
          <button disabled={loading} className="rounded-lg bg-[#2f261d] px-5 py-3 text-sm font-semibold text-white disabled:opacity-60">
            {loading ? 'Generating…' : 'Generate vendor profile'}
          </button>
        </form>

        {draft && (
          <div className="space-y-6">
          <div className="rounded-lg bg-white p-6 sm:p-8 shadow-sm space-y-4">
            <div>
              <p className="text-xs font-semibold text-[#8b6f53]">Draft</p>
              <h2 className="mt-2 text-2xl font-semibold">Vendor page details</h2>
              <p className="mt-2 text-sm text-[#6f5843]">Everything below shapes the public page: hero, images, about, links, and contact.</p>
              {typeof draft.source_payload?.sourceLabel === 'string' && (
                <p className="mt-3 text-xs font-medium text-[#8b6f53]">Started from {draft.source_payload.sourceLabel}</p>
              )}
            </div>
            <div className="rounded-lg border border-[#eadfce] p-4 sm:p-5 space-y-3">
              <p className="text-xs font-semibold text-[#8b6f53]">Design</p>
              <div className="grid gap-3 sm:grid-cols-3">
                {vendorTemplateOptions.map((option) => {
                  const selected = getDraftTemplateId(draft) === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setDraft((prev) => prev ? withTemplateId(prev, option.id) : prev)}
                      className={`rounded-lg border px-4 py-3 text-left transition ${selected ? 'border-[#2f261d] bg-[#2f261d] text-white' : 'border-[#eadfce] bg-white text-[#4b3a2c] hover:border-[#cbb395]'}`}
                    >
                      <span className="block text-sm font-semibold">{option.name}</span>
                      <span className={`mt-1 block text-xs leading-5 ${selected ? 'text-[#efe4d8]' : 'text-[#8b6f53]'}`}>{option.detail}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            {draftCustomization && (
              <div className="rounded-lg border border-[#eadfce] bg-[#fffaf3] p-4 sm:p-5 space-y-4">
                <div>
                  <p className="text-xs font-semibold text-[#8b6f53]">Customization</p>
                  <h3 className="mt-2 text-lg font-semibold">Make this vendor feel specific</h3>
                  <p className="mt-1 text-sm text-[#6f5843]">These fields shape the public call-to-action, proof chips, and vendor fit panels.</p>
                </div>
                <div>
                  <label htmlFor="vendor-draft-accent" className="mb-2 block text-sm font-semibold text-[#4b3a2c]">Accent style</label>
                  <select
                    id="vendor-draft-accent"
                    value={draftCustomization.accent_id}
                    onChange={(e) => setDraft((prev) => prev ? updateDraftCustomization(prev, { accent_id: e.target.value as VendorAccentId }) : prev)}
                    className="w-full rounded-lg border border-[#eadfce] bg-white px-4 py-3 outline-none"
                  >
                    {VENDOR_ACCENT_OPTIONS.map((option) => (
                      <option key={option.id} value={option.id}>{option.name}</option>
                    ))}
                  </select>
                  <p className="mt-2 text-xs text-[#8b6f53]">
                    {VENDOR_ACCENT_OPTIONS.find((option) => option.id === draftCustomization.accent_id)?.detail}
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label htmlFor="vendor-draft-logo" className="mb-1 block text-sm font-semibold text-[#4b3a2c]">Logo or monogram text</label>
                    <input
                      id="vendor-draft-logo"
                      value={draftCustomization.logo_text ?? ''}
                      onChange={(e) => setDraft((prev) => prev ? updateDraftCustomization(prev, { logo_text: e.target.value }) : prev)}
                      placeholder="MFH"
                      className="w-full rounded-lg border border-[#eadfce] bg-white px-4 py-3 text-sm outline-none"
                    />
                  </div>
                  <div>
                    <label htmlFor="vendor-draft-gallery-layout" className="mb-1 block text-sm font-semibold text-[#4b3a2c]">Gallery layout</label>
                    <select
                      id="vendor-draft-gallery-layout"
                      value={draftCustomization.gallery_layout}
                      onChange={(e) => setDraft((prev) => prev ? updateDraftCustomization(prev, { gallery_layout: e.target.value as VendorGalleryLayoutId }) : prev)}
                      className="w-full rounded-lg border border-[#eadfce] bg-white px-4 py-3 text-sm outline-none"
                    >
                      {VENDOR_GALLERY_LAYOUT_OPTIONS.map((option) => (
                        <option key={option.id} value={option.id}>{option.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label htmlFor="vendor-draft-cta-label" className="mb-1 block text-sm font-semibold text-[#4b3a2c]">Inquiry button label</label>
                    <input
                      id="vendor-draft-cta-label"
                      value={draftCustomization.cta_label ?? ''}
                      onChange={(e) => setDraft((prev) => prev ? updateDraftCustomization(prev, { cta_label: e.target.value }) : prev)}
                      placeholder="Check date availability"
                      className="w-full rounded-lg border border-[#eadfce] bg-white px-4 py-3 text-sm outline-none"
                    />
                  </div>
                  <div>
                    <label htmlFor="vendor-draft-service-area" className="mb-1 block text-sm font-semibold text-[#4b3a2c]">Service area or best fit</label>
                    <input
                      id="vendor-draft-service-area"
                      value={draftCustomization.service_area ?? ''}
                      onChange={(e) => setDraft((prev) => prev ? updateDraftCustomization(prev, { service_area: e.target.value }) : prev)}
                      placeholder="Hudson Valley, NYC, and destination weekends"
                      className="w-full rounded-lg border border-[#eadfce] bg-white px-4 py-3 text-sm outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="vendor-draft-pricing-note" className="mb-1 block text-sm font-semibold text-[#4b3a2c]">Pricing or planning note</label>
                  <input
                    id="vendor-draft-pricing-note"
                    value={draftCustomization.pricing_note ?? ''}
                    onChange={(e) => setDraft((prev) => prev ? updateDraftCustomization(prev, { pricing_note: e.target.value }) : prev)}
                    placeholder="Best fit for full-service wedding weekends and custom scopes."
                    className="w-full rounded-lg border border-[#eadfce] bg-white px-4 py-3 text-sm outline-none"
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  {[0, 1, 2].map((index) => (
                    <div key={index}>
                      <label htmlFor={`vendor-draft-proof-${index}`} className="mb-1 block text-sm font-semibold text-[#4b3a2c]">Proof point {index + 1}</label>
                      <input
                        id={`vendor-draft-proof-${index}`}
                        value={draftCustomization.proof_points[index] ?? ''}
                        onChange={(e) => {
                          const nextProofPoints = [...draftCustomization.proof_points];
                          nextProofPoints[index] = e.target.value;
                          setDraft((prev) => prev ? updateDraftCustomization(prev, { proof_points: nextProofPoints }) : prev);
                        }}
                        placeholder={index === 0 ? 'Fast previews' : index === 1 ? 'Rain plan ready' : 'Timeline support'}
                        className="w-full rounded-lg border border-[#eadfce] bg-white px-4 py-3 text-sm outline-none"
                      />
                    </div>
                  ))}
                </div>
                <div className="rounded-lg border border-[#eadfce] bg-white p-4 space-y-3">
                  <p className="text-sm font-semibold text-[#4b3a2c]">Sections</p>
                  <p className="text-xs text-[#8b6f53]">Choose what appears publicly. Sections keep a safe default order.</p>
                  <label htmlFor="vendor-draft-section-order" className="block text-xs font-semibold text-[#8b6f53]">Section order</label>
                  <input
                    id="vendor-draft-section-order"
                    value={draftCustomization.section_order.join(', ')}
                    onChange={(e) => {
                      const requested = e.target.value.split(',').map((item) => item.trim()).filter((item): item is VendorSectionId => VENDOR_SECTION_IDS.includes(item as VendorSectionId));
                      setDraft((prev) => prev ? updateDraftCustomization(prev, { section_order: requested }) : prev);
                    }}
                    className="w-full rounded-lg border border-[#eadfce] px-3 py-2 text-sm outline-none"
                  />
                  <div className="grid gap-2 sm:grid-cols-3">
                    {VENDOR_SECTION_IDS.map((sectionId) => {
                      const enabled = !draftCustomization.hidden_sections.includes(sectionId);
                      return (
                        <label key={sectionId} className="flex items-center gap-2 rounded-lg border border-[#eadfce] px-3 py-2 text-sm">
                          <input
                            type="checkbox"
                            checked={enabled}
                            onChange={(e) => {
                              const hidden = e.target.checked
                                ? draftCustomization.hidden_sections.filter((item) => item !== sectionId)
                                : [...draftCustomization.hidden_sections, sectionId];
                              setDraft((prev) => prev ? updateDraftCustomization(prev, { hidden_sections: hidden }) : prev);
                            }}
                          />
                          <span className="capitalize">{sectionId}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
                <div className="rounded-lg border border-[#eadfce] bg-white p-4 space-y-3">
                  <p className="text-sm font-semibold text-[#4b3a2c]">Packages or services</p>
                  {[0, 1, 2].map((index) => {
                    const item = draftCustomization.packages[index] ?? { title: '', detail: '', price: '' };
                    return (
                      <div key={index} className="grid gap-2 rounded-lg bg-[#fffaf3] p-3">
                        <input
                          value={item.title}
                          onChange={(e) => setDraft((prev) => {
                            if (!prev) return prev;
                            const currentPackages = readRawCustomizationArray<{ title: string; detail: string; price?: string | null }>(prev, 'packages');
                            return updateDraftCustomization(prev, { packages: updateArrayItem(currentPackages, index, { title: e.target.value }, { title: '', detail: '', price: '' }) });
                          })}
                          placeholder={`Service ${index + 1} title`}
                          className="w-full rounded-lg border border-[#eadfce] px-3 py-2 text-sm outline-none"
                        />
                        <input
                          value={item.detail}
                          onChange={(e) => setDraft((prev) => {
                            if (!prev) return prev;
                            const currentPackages = readRawCustomizationArray<{ title: string; detail: string; price?: string | null }>(prev, 'packages');
                            return updateDraftCustomization(prev, { packages: updateArrayItem(currentPackages, index, { detail: e.target.value }, { title: '', detail: '', price: '' }) });
                          })}
                          placeholder="Short service description"
                          className="w-full rounded-lg border border-[#eadfce] px-3 py-2 text-sm outline-none"
                        />
                        <input
                          value={item.price ?? ''}
                          onChange={(e) => setDraft((prev) => {
                            if (!prev) return prev;
                            const currentPackages = readRawCustomizationArray<{ title: string; detail: string; price?: string | null }>(prev, 'packages');
                            return updateDraftCustomization(prev, { packages: updateArrayItem(currentPackages, index, { price: e.target.value }, { title: '', detail: '', price: '' }) });
                          })}
                          placeholder="Price hint or custom quote"
                          className="w-full rounded-lg border border-[#eadfce] px-3 py-2 text-sm outline-none"
                        />
                      </div>
                    );
                  })}
                </div>
                <div className="rounded-lg border border-[#eadfce] bg-white p-4 space-y-3">
                  <div>
                    <p className="text-sm font-semibold text-[#4b3a2c]">External credibility</p>
                    <p className="mt-1 text-xs text-[#8b6f53]">Use this for Google-style public reputation. DayOf fit rating stays separate.</p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-[0.7fr_0.35fr_0.35fr]">
                    <input
                      value={draftCustomization.external_credibility.source_label}
                      onChange={(e) => setDraft((prev) => prev ? updateDraftCustomization(prev, { external_credibility: { ...draftCustomization.external_credibility, enabled: true, source_label: e.target.value } }) : prev)}
                      placeholder="Google"
                      className="w-full rounded-lg border border-[#eadfce] px-3 py-2 text-sm outline-none"
                    />
                    <input
                      value={draftCustomization.external_credibility.rating ?? ''}
                      onChange={(e) => setDraft((prev) => prev ? updateDraftCustomization(prev, { external_credibility: { ...draftCustomization.external_credibility, enabled: true, rating: e.target.value } }) : prev)}
                      placeholder="4.8"
                      className="w-full rounded-lg border border-[#eadfce] px-3 py-2 text-sm outline-none"
                    />
                    <input
                      value={draftCustomization.external_credibility.review_count ?? ''}
                      onChange={(e) => setDraft((prev) => prev ? updateDraftCustomization(prev, { external_credibility: { ...draftCustomization.external_credibility, enabled: true, review_count: e.target.value } }) : prev)}
                      placeholder="126"
                      className="w-full rounded-lg border border-[#eadfce] px-3 py-2 text-sm outline-none"
                    />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <input
                      value={draftCustomization.external_credibility.profile_url ?? ''}
                      onChange={(e) => setDraft((prev) => prev ? updateDraftCustomization(prev, { external_credibility: { ...draftCustomization.external_credibility, enabled: true, profile_url: e.target.value } }) : prev)}
                      placeholder="Google profile URL"
                      className="w-full rounded-lg border border-[#eadfce] px-3 py-2 text-sm outline-none"
                    />
                    <input
                      value={draftCustomization.external_credibility.place_id ?? ''}
                      onChange={(e) => setDraft((prev) => prev ? updateDraftCustomization(prev, { external_credibility: { ...draftCustomization.external_credibility, enabled: true, place_id: e.target.value } }) : prev)}
                      placeholder="Google place ID for future sync"
                      className="w-full rounded-lg border border-[#eadfce] px-3 py-2 text-sm outline-none"
                    />
                  </div>
                </div>
                <div className="rounded-lg border border-[#eadfce] bg-white p-4 space-y-3">
                  <div>
                    <p className="text-sm font-semibold text-[#4b3a2c]">Vendor fit rating</p>
                    <p className="mt-1 text-xs text-[#8b6f53]">A couple-facing score for fit, not a private planning note.</p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-[0.35fr_1fr]">
                    <input
                      value={draftCustomization.rating.overall_score ?? ''}
                      onChange={(e) => setDraft((prev) => prev ? updateDraftCustomization(prev, { rating: { ...draftCustomization.rating, enabled: true, overall_score: e.target.value } }) : prev)}
                      placeholder="9.2"
                      className="w-full rounded-lg border border-[#eadfce] px-3 py-2 text-sm outline-none"
                    />
                    <input
                      value={draftCustomization.rating.summary ?? ''}
                      onChange={(e) => setDraft((prev) => prev ? updateDraftCustomization(prev, { rating: { ...draftCustomization.rating, enabled: true, summary: e.target.value } }) : prev)}
                      placeholder="Why this vendor is a strong fit"
                      className="w-full rounded-lg border border-[#eadfce] px-3 py-2 text-sm outline-none"
                    />
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {[0, 1, 2, 3].map((index) => {
                      const item = draftCustomization.rating.categories[index] ?? { label: '', score: '' };
                      return (
                        <div key={index} className="grid grid-cols-[1fr_80px] gap-2">
                          <input
                            value={item.label}
                            onChange={(e) => {
                              const categories = updateArrayItem<Array<{ label: string; score: number | string }>[number]>(draftCustomization.rating.categories, index, { label: e.target.value }, { label: '', score: 0 });
                              setDraft((prev) => prev ? updateDraftCustomization(prev, { rating: { ...draftCustomization.rating, enabled: true, categories } }) : prev);
                            }}
                            placeholder={index === 0 ? 'Style match' : index === 1 ? 'Logistics' : index === 2 ? 'Responsiveness' : 'Value'}
                            className="w-full rounded-lg border border-[#eadfce] px-3 py-2 text-sm outline-none"
                          />
                          <input
                            value={item.score}
                            onChange={(e) => {
                              const categories = updateArrayItem<Array<{ label: string; score: number | string }>[number]>(draftCustomization.rating.categories, index, { score: e.target.value }, { label: '', score: 0 });
                              setDraft((prev) => prev ? updateDraftCustomization(prev, { rating: { ...draftCustomization.rating, enabled: true, categories } }) : prev);
                            }}
                            placeholder="9"
                            className="w-full rounded-lg border border-[#eadfce] px-3 py-2 text-sm outline-none"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="rounded-lg border border-[#eadfce] bg-white p-4 space-y-3">
                  <p className="text-sm font-semibold text-[#4b3a2c]">Testimonials</p>
                  {[0, 1].map((index) => {
                    const item = draftCustomization.testimonials[index] ?? { quote: '', attribution: '' };
                    return (
                      <div key={index} className="grid gap-2 rounded-lg bg-[#fffaf3] p-3">
                        <input
                          value={item.quote}
                          onChange={(e) => setDraft((prev) => {
                            if (!prev) return prev;
                            const currentTestimonials = readRawCustomizationArray<{ quote: string; attribution?: string | null }>(prev, 'testimonials');
                            return updateDraftCustomization(prev, { testimonials: updateArrayItem(currentTestimonials, index, { quote: e.target.value }, { quote: '', attribution: '' }) });
                          })}
                          placeholder="Short quote"
                          className="w-full rounded-lg border border-[#eadfce] px-3 py-2 text-sm outline-none"
                        />
                        <input
                          value={item.attribution ?? ''}
                          onChange={(e) => setDraft((prev) => {
                            if (!prev) return prev;
                            const currentTestimonials = readRawCustomizationArray<{ quote: string; attribution?: string | null }>(prev, 'testimonials');
                            return updateDraftCustomization(prev, { testimonials: updateArrayItem(currentTestimonials, index, { attribution: e.target.value }, { quote: '', attribution: '' }) });
                          })}
                          placeholder="Attribution"
                          className="w-full rounded-lg border border-[#eadfce] px-3 py-2 text-sm outline-none"
                        />
                      </div>
                    );
                  })}
                </div>
                <div className="rounded-lg border border-[#eadfce] bg-white p-4 space-y-3">
                  <p className="text-sm font-semibold text-[#4b3a2c]">FAQ</p>
                  {[0, 1, 2].map((index) => {
                    const item = draftCustomization.faqs[index] ?? { question: '', answer: '' };
                    return (
                      <div key={index} className="grid gap-2 rounded-lg bg-[#fffaf3] p-3">
                        <input
                          value={item.question}
                          onChange={(e) => setDraft((prev) => {
                            if (!prev) return prev;
                            const currentFaqs = readRawCustomizationArray<{ question: string; answer: string }>(prev, 'faqs');
                            return updateDraftCustomization(prev, { faqs: updateArrayItem(currentFaqs, index, { question: e.target.value }, { question: '', answer: '' }) });
                          })}
                          placeholder={`Question ${index + 1}`}
                          className="w-full rounded-lg border border-[#eadfce] px-3 py-2 text-sm outline-none"
                        />
                        <input
                          value={item.answer}
                          onChange={(e) => setDraft((prev) => {
                            if (!prev) return prev;
                            const currentFaqs = readRawCustomizationArray<{ question: string; answer: string }>(prev, 'faqs');
                            return updateDraftCustomization(prev, { faqs: updateArrayItem(currentFaqs, index, { answer: e.target.value }, { question: '', answer: '' }) });
                          })}
                          placeholder="Answer"
                          className="w-full rounded-lg border border-[#eadfce] px-3 py-2 text-sm outline-none"
                        />
                      </div>
                    );
                  })}
                </div>
                <div className="rounded-lg border border-[#eadfce] bg-white p-4 space-y-3">
                  <p className="text-sm font-semibold text-[#4b3a2c]">Custom inquiry prompts</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {[0, 1, 2, 3].map((index) => (
                      <input
                        key={index}
                        value={draftCustomization.inquiry_questions[index] ?? ''}
                        onChange={(e) => {
                          setDraft((prev) => {
                            if (!prev) return prev;
                            const currentQuestions = readRawCustomizationArray<string>(prev, 'inquiry_questions');
                            const nextQuestions = [...currentQuestions];
                            nextQuestions[index] = e.target.value;
                            return updateDraftCustomization(prev, { inquiry_questions: nextQuestions });
                          });
                        }}
                        placeholder={index === 0 ? 'Estimated guest count' : index === 1 ? 'Budget range' : index === 2 ? 'Design inspiration' : 'Timing needs'}
                        className="w-full rounded-lg border border-[#eadfce] px-3 py-2 text-sm outline-none"
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div className="rounded-lg border border-[#eadfce] p-4 sm:p-5 space-y-3">
              <p className="text-xs font-semibold text-[#8b6f53]">Hero</p>
              <div>
                <label htmlFor="vendor-draft-name" className="mb-1 block text-sm font-semibold text-[#4b3a2c]">Public vendor name</label>
                <input id="vendor-draft-name" value={draft.vendor_name} onChange={(e) => setDraft((prev) => prev ? { ...prev, vendor_name: e.target.value } : prev)} className="w-full rounded-lg border border-[#eadfce] px-4 py-3 text-2xl font-semibold outline-none" placeholder="Vendor name" />
              </div>
              <div>
                <label htmlFor="vendor-draft-descriptor" className="mb-1 block text-sm font-semibold text-[#4b3a2c]">Short descriptor</label>
                <input id="vendor-draft-descriptor" value={draft.descriptor ?? ''} onChange={(e) => setDraft((prev) => prev ? { ...prev, descriptor: e.target.value || null } : prev)} placeholder="Short descriptor under the vendor name" className="w-full rounded-lg border border-[#eadfce] px-4 py-3 text-[#6f5843] outline-none" />
              </div>
              <div>
                <label htmlFor="vendor-draft-slug" className="mb-1 block text-sm font-semibold text-[#4b3a2c]">Public URL slug</label>
                <input id="vendor-draft-slug" value={draft.slug} onChange={(e) => setDraft((prev) => prev ? { ...prev, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') } : prev)} placeholder="vendor-page-slug" className="w-full rounded-lg border border-[#eadfce] px-4 py-3 text-sm outline-none" />
              </div>
            </div>
            <div className="rounded-lg border border-[#eadfce] p-4 sm:p-5 space-y-3">
              <label htmlFor="vendor-draft-about" className="block text-xs font-semibold text-[#8b6f53]">About</label>
              <textarea id="vendor-draft-about" value={draft.about} onChange={(e) => setDraft((prev) => prev ? { ...prev, about: e.target.value } : prev)} className="min-h-[132px] w-full rounded-lg border border-[#eadfce] px-4 py-3 text-[#4b3a2c] leading-7 outline-none" placeholder="Short 2–3 sentence vendor description" />
            </div>
            <div className="rounded-lg border border-[#eadfce] p-4 sm:p-5 space-y-3">
              <p className="text-xs font-semibold text-[#8b6f53]">Links and contact</p>
              <input value={draft.instagram_url ?? ''} onChange={(e) => setDraft((prev) => prev ? { ...prev, instagram_url: e.target.value || null } : prev)} placeholder="Instagram URL" className="w-full rounded-lg border border-[#eadfce] px-4 py-3 text-sm outline-none" />
              <input value={draft.website_url ?? ''} onChange={(e) => setDraft((prev) => prev ? { ...prev, website_url: e.target.value || null } : prev)} placeholder="Website URL" className="w-full rounded-lg border border-[#eadfce] px-4 py-3 text-sm outline-none" />
              <div className="grid gap-3 sm:grid-cols-2">
                <input value={typeof draft.source_payload?.pinterest_url === 'string' ? draft.source_payload.pinterest_url : ''} onChange={(e) => setDraft((prev) => prev ? { ...prev, source_payload: { ...prev.source_payload, pinterest_url: e.target.value || null } } : prev)} placeholder="Pinterest URL" className="w-full rounded-lg border border-[#eadfce] px-4 py-3 text-sm outline-none" />
                <input value={typeof draft.source_payload?.tiktok_url === 'string' ? draft.source_payload.tiktok_url : ''} onChange={(e) => setDraft((prev) => prev ? { ...prev, source_payload: { ...prev.source_payload, tiktok_url: e.target.value || null } } : prev)} placeholder="TikTok URL" className="w-full rounded-lg border border-[#eadfce] px-4 py-3 text-sm outline-none" />
                <input value={typeof draft.source_payload?.facebook_url === 'string' ? draft.source_payload.facebook_url : ''} onChange={(e) => setDraft((prev) => prev ? { ...prev, source_payload: { ...prev.source_payload, facebook_url: e.target.value || null } } : prev)} placeholder="Facebook URL" className="w-full rounded-lg border border-[#eadfce] px-4 py-3 text-sm outline-none" />
                <input value={typeof draft.source_payload?.youtube_url === 'string' ? draft.source_payload.youtube_url : ''} onChange={(e) => setDraft((prev) => prev ? { ...prev, source_payload: { ...prev.source_payload, youtube_url: e.target.value || null } } : prev)} placeholder="YouTube URL" className="w-full rounded-lg border border-[#eadfce] px-4 py-3 text-sm outline-none" />
              </div>
              <input type="email" value={draft.contact_email ?? ''} onChange={(e) => setDraft((prev) => prev ? { ...prev, contact_email: e.target.value || null } : prev)} placeholder="Contact email for direct inquiry CTA" className="w-full rounded-lg border border-[#eadfce] px-4 py-3 text-sm outline-none" />
            </div>
            <div className="rounded-lg border border-[#eadfce] p-4 sm:p-5 space-y-3">
              <label htmlFor="vendor-draft-images" className="block text-xs font-semibold text-[#8b6f53]">Images</label>
              <p id="vendor-draft-images-help" className="text-xs text-[#8b6f53]">First line becomes the hero. Up to five more images fill the gallery.</p>
              <textarea
                id="vendor-draft-images"
                value={imageEditor}
                onChange={(e) => {
                  const nextValue = e.target.value;
                  setImageEditor(nextValue);
                  const images = normalizeImageLines(nextValue);
                  setDraft((prev) => prev ? {
                    ...prev,
                    hero_image_url: images[0] ?? null,
                    image_urls: images.slice(1),
                  } : prev);
                }}
                placeholder="One image URL per line"
                aria-describedby="vendor-draft-images-help"
                className="min-h-[120px] w-full rounded-lg border border-[#eadfce] px-4 py-3 text-sm outline-none"
              />
              {getSafePublicImageUrl(draft.hero_image_url) && <p className="text-xs text-[#8b6f53]">Current hero image: {getSafePublicImageUrl(draft.hero_image_url)}</p>}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[draft.hero_image_url, ...(draft.image_urls || [])].map((image) => getSafePublicImageUrl(image)).filter((image): image is string => Boolean(image)).slice(0, 6).map((image) => (
                <img key={image} src={image} alt={draft.vendor_name} className="aspect-square w-full rounded-lg object-cover bg-[#f3eadf]" />
              ))}
            </div>
            <div className="flex flex-wrap gap-3">
              {draftLinks(draft).map((link) => (
                <a key={link.label} href={link.href} target="_blank" rel="noopener noreferrer" className="text-sm text-[#6f5843] underline">{link.label}</a>
              ))}
            </div>
            <p className="text-xs text-[#8b6f53]">When a website has limited detail, the page can still use Instagram, Pinterest, and other social links for images and context.</p>
            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={handlePublish} disabled={saving} className="rounded-lg bg-[#2f261d] px-5 py-3 text-sm font-semibold text-white disabled:opacity-60">
                {saving ? 'Publishing…' : 'Publish vendor page'}
              </button>
              <div className="text-sm text-[#8b6f53] self-center">Preferred path: /vendor/{draft.slug}</div>
            </div>
            <p className="text-xs text-[#8b6f53]">If that slug is already taken, publish will automatically use the next clean available URL.</p>
          </div>

          <div className="rounded-lg bg-white p-6 sm:p-8 shadow-sm space-y-5">
            <div>
              <p className="text-xs font-semibold text-[#8b6f53]">Design preview</p>
              <h3 className="mt-2 text-xl font-semibold">How this draft becomes a vendor page</h3>
              <p className="mt-1 text-sm text-[#6f5843]">{vendorTemplateOptions.find((option) => option.id === getDraftTemplateId(draft))?.name}</p>
            </div>
            <div className="overflow-hidden rounded-lg border border-[#eadfce] bg-[#f8f3ec]">
              <div className="aspect-[16/10] bg-[#e9dfd2] flex items-center justify-center overflow-hidden">
                {getSafePublicImageUrl(draft.hero_image_url) ? (
                  <img src={getSafePublicImageUrl(draft.hero_image_url)} alt={draft.vendor_name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-lg bg-white/70 text-xl font-semibold text-[#8b6f53]">
                    {draft.vendor_name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'VP'}
                  </div>
                )}
              </div>
              <div className="p-5 space-y-5">
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-[#8b6f53]">Hero</p>
                  <h4 className="text-2xl font-semibold leading-tight">{draft.vendor_name || 'Vendor name'}</h4>
                  <p className="text-sm text-[#6f5843]">{draft.descriptor || 'Short descriptor will sit here if present.'}</p>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-semibold text-[#8b6f53]">Images</p>
                  {(draft.image_urls || []).map((image) => getSafePublicImageUrl(image)).filter(Boolean).length > 0 ? (
                    <div className="grid grid-cols-3 gap-2">
                      {draft.image_urls.map((image) => getSafePublicImageUrl(image)).filter((image): image is string => Boolean(image)).slice(0, 3).map((image) => (
                        <img key={image} src={image} alt={draft.vendor_name} className="aspect-square w-full rounded-lg object-cover bg-white" />
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-[#6f5843]">Gallery images will appear here when present.</p>
                  )}
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-semibold text-[#8b6f53]">About</p>
                  <p className="text-sm leading-7 text-[#4b3a2c]">{draft.about || 'Short vendor description will render here.'}</p>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-semibold text-[#8b6f53]">Links and contact</p>
                  <div className="flex flex-wrap gap-2">
                    {draftLinks(draft).length > 0 ? draftLinks(draft).map((link) => (
                      <span key={link.label} className="rounded-lg bg-white px-3 py-1 text-xs text-[#6f5843] border border-[#eadfce]">{link.label}</span>
                    )) : <span className="text-sm text-[#6f5843]">Links will render here if present.</span>}
                    {draft.contact_email && <span className="rounded-lg bg-white px-3 py-1 text-xs text-[#6f5843] border border-[#eadfce]">Direct email CTA</span>}
                    <span className="rounded-lg bg-white px-3 py-1 text-xs text-[#6f5843] border border-[#eadfce]">Inquiry form</span>
                  </div>
                </div>
                {draftCustomization && (draftCustomization.cta_label || draftCustomization.service_area || draftCustomization.proof_points.length > 0) && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-[#8b6f53]">Customization</p>
                    <div className="flex flex-wrap gap-2">
                      {draftCustomization.cta_label && <span className="rounded-lg bg-[#2f261d] px-3 py-1 text-xs font-semibold text-white">{draftCustomization.cta_label}</span>}
                      {draftCustomization.service_area && <span className="rounded-lg bg-white px-3 py-1 text-xs text-[#6f5843] border border-[#eadfce]">{draftCustomization.service_area}</span>}
                      {draftCustomization.proof_points.map((point) => (
                        <span key={point} className="rounded-lg bg-white px-3 py-1 text-xs text-[#6f5843] border border-[#eadfce]">{point}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          </div>
        )}

        {createdProfile && (
          <div role="status" className="rounded-lg bg-[#2f261d] p-6 sm:p-8 text-white shadow-sm space-y-4">
            <div>
              <p className="text-xs font-semibold text-[#d8c4ad]">Published</p>
              <h2 className="mt-2 text-2xl font-semibold">/{`vendor/${createdProfile.slug}`}</h2>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link to={`/vendor/${createdProfile.slug}`} className="rounded-lg bg-[#f5e9db] px-5 py-3 text-sm font-semibold text-[#2f261d]">
                Open live page
              </Link>
              <button type="button" onClick={handleCopyLiveUrl} className="rounded-lg border border-white/20 px-5 py-3 text-sm font-semibold text-white">
                Copy live URL
              </button>
              <button type="button" onClick={() => navigate(0)} className="rounded-lg border border-white/20 px-5 py-3 text-sm font-semibold text-white/80">
                Start another vendor
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VendorProfileCreatePage;
