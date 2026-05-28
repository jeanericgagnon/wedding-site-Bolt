import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { generateVendorProfileDraft, createVendorProfile, type VendorProfile, type VendorProfileDraft } from '../lib/vendorProfiles';
import { useToast } from '../components/ui/Toast';
import {
  mapVendorProfileError,
  VENDOR_PROFILE_CREATE_RETRY_ERROR,
  VENDOR_PROFILE_DRAFT_RETRY_ERROR,
} from './vendorProfileCopy';

function normalizeImageLines(input: string): string[] {
  return input
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((item, index, arr) => arr.indexOf(item) === index)
    .slice(0, 6);
}

function draftLinks(draft: VendorProfileDraft) {
  return [
    draft.instagram_url ? { label: 'Instagram', href: draft.instagram_url } : null,
    draft.website_url ? { label: 'Website', href: draft.website_url } : null,
    typeof draft.source_payload?.pinterest_url === 'string' && draft.source_payload.pinterest_url ? { label: 'Pinterest', href: draft.source_payload.pinterest_url } : null,
    typeof draft.source_payload?.tiktok_url === 'string' && draft.source_payload.tiktok_url ? { label: 'TikTok', href: draft.source_payload.tiktok_url } : null,
    typeof draft.source_payload?.facebook_url === 'string' && draft.source_payload.facebook_url ? { label: 'Facebook', href: draft.source_payload.facebook_url } : null,
    typeof draft.source_payload?.youtube_url === 'string' && draft.source_payload.youtube_url ? { label: 'YouTube', href: draft.source_payload.youtube_url } : null,
  ].filter((item): item is { label: string; href: string } => Boolean(item));
}

export const VendorProfileCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [form, setForm] = useState({ vendorName: '', instagramUrl: '', websiteUrl: '', pinterestUrl: '', tiktokUrl: '', facebookUrl: '', youtubeUrl: '', contactEmail: '' });
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
      const next = { ...nextDraft, contact_email: form.contactEmail.trim() || nextDraft.contact_email };
      setDraft(next);
      setCreatedProfile(null);
      setImageEditor([next.hero_image_url, ...next.image_urls].filter(Boolean).join('\n'));
      toast('Vendor draft generated.', 'success');
    } catch (err) {
      toast(mapVendorProfileError(err, VENDOR_PROFILE_DRAFT_RETRY_ERROR), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async () => {
    if (!draft) return;
    try {
      setSaving(true);
      const created = await createVendorProfile(draft);
      setCreatedProfile(created);
      toast('Vendor page created.', 'success');
    } catch (err) {
      toast(mapVendorProfileError(err, VENDOR_PROFILE_CREATE_RETRY_ERROR), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleCopyVendorUrl = async () => {
    if (!createdProfile) return;
    const url = `${window.location.origin}/vendor/${createdProfile.slug}`;
    try {
      await navigator.clipboard.writeText(url);
      toast('Vendor page URL copied.', 'success');
    } catch {
      window.prompt('Copy vendor page URL:', url);
    }
  };

  return (
    <div className="min-h-screen bg-[#f6f1ea] text-[#2f261d] px-4 py-8 sm:px-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.35em] text-[#8b6f53]">Vendor profile v1</p>
          <h1 className="text-3xl sm:text-5xl font-semibold">Generate a single vendor page</h1>
          <p className="text-[#6f5843] max-w-2xl">Minimal input in. Public vendor page out. No accounts, no dashboard sprawl, no marketplace junk.</p>
        </div>

        <form onSubmit={handleGenerate} className="rounded-[28px] bg-white p-6 sm:p-8 shadow-[0_18px_40px_rgba(53,37,22,0.08)] space-y-4">
          <input value={form.vendorName} onChange={(e) => setForm((prev) => ({ ...prev, vendorName: e.target.value }))} placeholder="Vendor name" className="w-full rounded-2xl border border-[#eadfce] px-4 py-3 outline-none" required />
          <input value={form.instagramUrl} onChange={(e) => setForm((prev) => ({ ...prev, instagramUrl: e.target.value }))} placeholder="Instagram URL (optional)" className="w-full rounded-2xl border border-[#eadfce] px-4 py-3 outline-none" />
          <input value={form.websiteUrl} onChange={(e) => setForm((prev) => ({ ...prev, websiteUrl: e.target.value }))} placeholder="Website URL (optional)" className="w-full rounded-2xl border border-[#eadfce] px-4 py-3 outline-none" />
          <div className="grid gap-3 sm:grid-cols-2">
            <input value={form.pinterestUrl} onChange={(e) => setForm((prev) => ({ ...prev, pinterestUrl: e.target.value }))} placeholder="Pinterest URL (optional)" className="w-full rounded-2xl border border-[#eadfce] px-4 py-3 outline-none" />
            <input value={form.tiktokUrl} onChange={(e) => setForm((prev) => ({ ...prev, tiktokUrl: e.target.value }))} placeholder="TikTok URL (optional)" className="w-full rounded-2xl border border-[#eadfce] px-4 py-3 outline-none" />
            <input value={form.facebookUrl} onChange={(e) => setForm((prev) => ({ ...prev, facebookUrl: e.target.value }))} placeholder="Facebook URL (optional)" className="w-full rounded-2xl border border-[#eadfce] px-4 py-3 outline-none" />
            <input value={form.youtubeUrl} onChange={(e) => setForm((prev) => ({ ...prev, youtubeUrl: e.target.value }))} placeholder="YouTube URL (optional)" className="w-full rounded-2xl border border-[#eadfce] px-4 py-3 outline-none" />
          </div>
          <input type="email" value={form.contactEmail} onChange={(e) => setForm((prev) => ({ ...prev, contactEmail: e.target.value }))} placeholder="Contact email for inquiry CTA (optional)" className="w-full rounded-2xl border border-[#eadfce] px-4 py-3 outline-none" />
          <button disabled={loading} className="rounded-2xl bg-[#2f261d] px-5 py-3 text-sm font-semibold text-white disabled:opacity-60">
            {loading ? 'Generating…' : 'Generate vendor profile'}
          </button>
        </form>

        {draft && (
          <div className="space-y-6">
          <div className="rounded-[28px] bg-white p-6 sm:p-8 shadow-[0_18px_40px_rgba(53,37,22,0.08)] space-y-4">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-[#8b6f53]">Draft</p>
              <h2 className="mt-2 text-2xl font-semibold">Canonical vendor page fields</h2>
              <p className="mt-2 text-sm text-[#6f5843]">Everything below maps directly into the public vendor page template: hero, images, about, links, and contact.</p>
              {typeof draft.source_payload?.sourceLabel === 'string' && (
                <p className="mt-3 text-xs uppercase tracking-[0.22em] text-[#8b6f53]">Generated from {draft.source_payload.sourceLabel}</p>
              )}
            </div>
            <div className="rounded-[24px] border border-[#eadfce] p-4 sm:p-5 space-y-3">
              <p className="text-xs uppercase tracking-[0.22em] text-[#8b6f53]">Hero</p>
              <input value={draft.vendor_name} onChange={(e) => setDraft((prev) => prev ? { ...prev, vendor_name: e.target.value } : prev)} className="w-full rounded-2xl border border-[#eadfce] px-4 py-3 text-2xl font-semibold outline-none" placeholder="Vendor name" />
              <input value={draft.descriptor ?? ''} onChange={(e) => setDraft((prev) => prev ? { ...prev, descriptor: e.target.value || null } : prev)} placeholder="Short descriptor under the vendor name" className="w-full rounded-2xl border border-[#eadfce] px-4 py-3 text-[#6f5843] outline-none" />
              <input value={draft.slug} onChange={(e) => setDraft((prev) => prev ? { ...prev, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') } : prev)} placeholder="vendor-page-slug" className="w-full rounded-2xl border border-[#eadfce] px-4 py-3 text-sm outline-none" />
            </div>
            <div className="rounded-[24px] border border-[#eadfce] p-4 sm:p-5 space-y-3">
              <p className="text-xs uppercase tracking-[0.22em] text-[#8b6f53]">About</p>
              <textarea value={draft.about} onChange={(e) => setDraft((prev) => prev ? { ...prev, about: e.target.value } : prev)} className="min-h-[132px] w-full rounded-2xl border border-[#eadfce] px-4 py-3 text-[#4b3a2c] leading-7 outline-none" placeholder="Short 2–3 sentence vendor description" />
            </div>
            <div className="rounded-[24px] border border-[#eadfce] p-4 sm:p-5 space-y-3">
              <p className="text-xs uppercase tracking-[0.22em] text-[#8b6f53]">Links + Contact</p>
              <input value={draft.instagram_url ?? ''} onChange={(e) => setDraft((prev) => prev ? { ...prev, instagram_url: e.target.value || null } : prev)} placeholder="Instagram URL" className="w-full rounded-2xl border border-[#eadfce] px-4 py-3 text-sm outline-none" />
              <input value={draft.website_url ?? ''} onChange={(e) => setDraft((prev) => prev ? { ...prev, website_url: e.target.value || null } : prev)} placeholder="Website URL" className="w-full rounded-2xl border border-[#eadfce] px-4 py-3 text-sm outline-none" />
              <div className="grid gap-3 sm:grid-cols-2">
                <input value={typeof draft.source_payload?.pinterest_url === 'string' ? draft.source_payload.pinterest_url : ''} onChange={(e) => setDraft((prev) => prev ? { ...prev, source_payload: { ...prev.source_payload, pinterest_url: e.target.value || null } } : prev)} placeholder="Pinterest URL" className="w-full rounded-2xl border border-[#eadfce] px-4 py-3 text-sm outline-none" />
                <input value={typeof draft.source_payload?.tiktok_url === 'string' ? draft.source_payload.tiktok_url : ''} onChange={(e) => setDraft((prev) => prev ? { ...prev, source_payload: { ...prev.source_payload, tiktok_url: e.target.value || null } } : prev)} placeholder="TikTok URL" className="w-full rounded-2xl border border-[#eadfce] px-4 py-3 text-sm outline-none" />
                <input value={typeof draft.source_payload?.facebook_url === 'string' ? draft.source_payload.facebook_url : ''} onChange={(e) => setDraft((prev) => prev ? { ...prev, source_payload: { ...prev.source_payload, facebook_url: e.target.value || null } } : prev)} placeholder="Facebook URL" className="w-full rounded-2xl border border-[#eadfce] px-4 py-3 text-sm outline-none" />
                <input value={typeof draft.source_payload?.youtube_url === 'string' ? draft.source_payload.youtube_url : ''} onChange={(e) => setDraft((prev) => prev ? { ...prev, source_payload: { ...prev.source_payload, youtube_url: e.target.value || null } } : prev)} placeholder="YouTube URL" className="w-full rounded-2xl border border-[#eadfce] px-4 py-3 text-sm outline-none" />
              </div>
              <input type="email" value={draft.contact_email ?? ''} onChange={(e) => setDraft((prev) => prev ? { ...prev, contact_email: e.target.value || null } : prev)} placeholder="Contact email for direct inquiry CTA" className="w-full rounded-2xl border border-[#eadfce] px-4 py-3 text-sm outline-none" />
            </div>
            <div className="rounded-[24px] border border-[#eadfce] p-4 sm:p-5 space-y-3">
              <p className="text-xs uppercase tracking-[0.22em] text-[#8b6f53]">Images</p>
              <p className="text-xs text-[#8b6f53]">First line becomes the hero. Up to five more images fill the gallery.</p>
              <textarea
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
                className="min-h-[120px] w-full rounded-2xl border border-[#eadfce] px-4 py-3 text-sm outline-none"
              />
              {draft.hero_image_url && <p className="text-xs text-[#8b6f53]">Current hero image: {draft.hero_image_url}</p>}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[draft.hero_image_url, ...(draft.image_urls || [])].filter((image): image is string => Boolean(image)).slice(0, 6).map((image) => (
                <img key={image} src={image} alt={draft.vendor_name} className="aspect-square w-full rounded-2xl object-cover bg-[#f3eadf]" />
              ))}
            </div>
            <div className="flex flex-wrap gap-3">
              {draft.instagram_url && <a href={draft.instagram_url} target="_blank" rel="noreferrer" className="text-sm text-[#6f5843] underline">Instagram</a>}
              {draft.website_url && <a href={draft.website_url} target="_blank" rel="noreferrer" className="text-sm text-[#6f5843] underline">Website</a>}
              {typeof draft.source_payload?.pinterest_url === 'string' && draft.source_payload.pinterest_url && <a href={draft.source_payload.pinterest_url} target="_blank" rel="noreferrer" className="text-sm text-[#6f5843] underline">Pinterest</a>}
              {typeof draft.source_payload?.tiktok_url === 'string' && draft.source_payload.tiktok_url && <a href={draft.source_payload.tiktok_url} target="_blank" rel="noreferrer" className="text-sm text-[#6f5843] underline">TikTok</a>}
              {typeof draft.source_payload?.facebook_url === 'string' && draft.source_payload.facebook_url && <a href={draft.source_payload.facebook_url} target="_blank" rel="noreferrer" className="text-sm text-[#6f5843] underline">Facebook</a>}
              {typeof draft.source_payload?.youtube_url === 'string' && draft.source_payload.youtube_url && <a href={draft.source_payload.youtube_url} target="_blank" rel="noreferrer" className="text-sm text-[#6f5843] underline">YouTube</a>}
            </div>
            <p className="text-xs text-[#8b6f53]">When website metadata is weak, the generator now uses recovered Instagram, Pinterest, and other social links as fallback image/source signals.</p>
            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={handlePublish} disabled={saving} className="rounded-2xl bg-[#2f261d] px-5 py-3 text-sm font-semibold text-white disabled:opacity-60">
                {saving ? 'Creating page…' : 'Create vendor page'}
              </button>
              <div className="text-sm text-[#8b6f53] self-center">Preferred path: /vendor/{draft.slug}</div>
            </div>
            <p className="text-xs text-[#8b6f53]">If that slug is already taken, publish will automatically use the next clean available URL.</p>
          </div>

          <div className="rounded-[28px] bg-white p-6 sm:p-8 shadow-[0_18px_40px_rgba(53,37,22,0.08)] space-y-5">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-[#8b6f53]">Template preview</p>
              <h3 className="mt-2 text-xl font-semibold">How this draft will pour into the public page shell</h3>
            </div>
            <div className="overflow-hidden rounded-[24px] border border-[#eadfce] bg-[#f8f3ec]">
              <div className="aspect-[16/10] bg-[#e9dfd2] flex items-center justify-center overflow-hidden">
                {draft.hero_image_url ? (
                  <img src={draft.hero_image_url} alt={draft.vendor_name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-24 w-24 items-center justify-center rounded-full bg-white/70 text-xl font-semibold tracking-[0.18em] text-[#8b6f53]">
                    {draft.vendor_name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'VP'}
                  </div>
                )}
              </div>
              <div className="p-5 space-y-5">
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-[0.28em] text-[#8b6f53]">Hero</p>
                  <h4 className="text-2xl font-semibold leading-tight">{draft.vendor_name || 'Vendor name'}</h4>
                  <p className="text-sm text-[#6f5843]">{draft.descriptor || 'Short descriptor will sit here if present.'}</p>
                </div>

                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-[0.28em] text-[#8b6f53]">Images</p>
                  {(draft.image_urls || []).length > 0 ? (
                    <div className="grid grid-cols-3 gap-2">
                      {draft.image_urls.slice(0, 3).map((image) => (
                        <img key={image} src={image} alt={draft.vendor_name} className="aspect-square w-full rounded-2xl object-cover bg-white" />
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-[#6f5843]">Gallery images will appear here when present.</p>
                  )}
                </div>

                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-[0.28em] text-[#8b6f53]">About</p>
                  <p className="text-sm leading-7 text-[#4b3a2c]">{draft.about || 'Short vendor description will render here.'}</p>
                </div>

                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-[0.28em] text-[#8b6f53]">Links + Contact</p>
                  <div className="flex flex-wrap gap-2">
                    {draftLinks(draft).length > 0 ? draftLinks(draft).map((link) => (
                      <span key={link.label} className="rounded-full bg-white px-3 py-1 text-xs text-[#6f5843] border border-[#eadfce]">{link.label}</span>
                    )) : <span className="text-sm text-[#6f5843]">Links will render here if present.</span>}
                    {draft.contact_email && <span className="rounded-full bg-white px-3 py-1 text-xs text-[#6f5843] border border-[#eadfce]">Direct email CTA</span>}
                    <span className="rounded-full bg-white px-3 py-1 text-xs text-[#6f5843] border border-[#eadfce]">Inquiry form</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          </div>
        )}

        {createdProfile && (
          <div className="rounded-[28px] bg-[#2f261d] p-6 sm:p-8 text-white shadow-[0_24px_80px_rgba(31,21,12,0.24)] space-y-4">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-[#d8c4ad]">Vendor page ready</p>
              <h2 className="mt-2 text-2xl font-semibold">/{`vendor/${createdProfile.slug}`}</h2>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link to={`/vendor/${createdProfile.slug}`} className="rounded-2xl bg-[#f5e9db] px-5 py-3 text-sm font-semibold text-[#2f261d]">
                Open vendor page
              </Link>
              <button type="button" onClick={handleCopyVendorUrl} className="rounded-2xl border border-white/20 px-5 py-3 text-sm font-semibold text-white">
                Copy page URL
              </button>
              <button type="button" onClick={() => navigate(0)} className="rounded-2xl border border-white/20 px-5 py-3 text-sm font-semibold text-white/80">
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
