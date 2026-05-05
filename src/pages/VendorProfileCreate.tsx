import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { generateVendorProfileDraft, createVendorProfile, normalizeVendorTemplateId, type VendorProfile, type VendorProfileDraft, type VendorTemplateId } from '../lib/vendorProfiles';
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
  { id: 'editorial', name: 'Editorial profile', detail: 'Large hero, polished gallery, and a premium inquiry section.' },
  { id: 'portfolio', name: 'Portfolio forward', detail: 'Visual-first layout for photographers, florists, beauty, venues, and rentals.' },
  { id: 'minimal', name: 'Minimal card', detail: 'Quiet, direct profile for planners, officiants, musicians, and service vendors.' },
];

function getDraftTemplateId(draft: VendorProfileDraft): VendorTemplateId {
  return normalizeVendorTemplateId(draft.source_payload?.template_id);
}

function withTemplateId(draft: VendorProfileDraft, templateId: VendorTemplateId): VendorProfileDraft {
  return {
    ...draft,
    source_payload: {
      ...draft.source_payload,
      template_id: templateId,
    },
  };
}

function sanitizeDraftForPublish(draft: VendorProfileDraft): VendorProfileDraft {
  return {
    ...draft,
    hero_image_url: getSafePublicImageUrl(draft.hero_image_url) || null,
    image_urls: draft.image_urls.map((image) => getSafePublicImageUrl(image)).filter(Boolean),
    instagram_url: getSafePublicInstagramUrl(draft.instagram_url) || null,
    website_url: getSafePublicWebUrl(draft.website_url) || null,
    contact_email: getSafePublicEmailHref(draft.contact_email) ? draft.contact_email : null,
    source_payload: {
      ...draft.source_payload,
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
                <a key={link.label} href={link.href} target="_blank" rel="noreferrer" className="text-sm text-[#6f5843] underline">{link.label}</a>
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
