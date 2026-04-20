import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { generateVendorProfileDraft, createVendorProfile, type VendorProfile, type VendorProfileDraft } from '../lib/vendorProfiles';
import { useToast } from '../components/ui/Toast';

function normalizeImageLines(input: string): string[] {
  return input
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((item, index, arr) => arr.indexOf(item) === index)
    .slice(0, 6);
}

export const VendorProfileCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [form, setForm] = useState({ vendorName: '', instagramUrl: '', websiteUrl: '', contactEmail: '' });
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
      toast(err instanceof Error ? err.message : 'Could not generate vendor draft.', 'error');
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
      toast(err instanceof Error ? err.message : 'Could not create vendor page.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleCopyLiveUrl = async () => {
    if (!createdProfile) return;
    const url = `${window.location.origin}/vendor/${createdProfile.slug}`;
    try {
      await navigator.clipboard.writeText(url);
      toast('Live vendor URL copied.', 'success');
    } catch {
      window.prompt('Copy live vendor URL:', url);
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
          <input type="email" value={form.contactEmail} onChange={(e) => setForm((prev) => ({ ...prev, contactEmail: e.target.value }))} placeholder="Contact email for inquiry CTA (optional)" className="w-full rounded-2xl border border-[#eadfce] px-4 py-3 outline-none" />
          <button disabled={loading} className="rounded-2xl bg-[#2f261d] px-5 py-3 text-sm font-semibold text-white disabled:opacity-60">
            {loading ? 'Generating…' : 'Generate vendor profile'}
          </button>
        </form>

        {draft && (
          <div className="rounded-[28px] bg-white p-6 sm:p-8 shadow-[0_18px_40px_rgba(53,37,22,0.08)] space-y-4">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-[#8b6f53]">Draft</p>
              <input value={draft.vendor_name} onChange={(e) => setDraft((prev) => prev ? { ...prev, vendor_name: e.target.value } : prev)} className="mt-2 w-full rounded-2xl border border-[#eadfce] px-4 py-3 text-2xl font-semibold outline-none" />
              <input value={draft.descriptor ?? ''} onChange={(e) => setDraft((prev) => prev ? { ...prev, descriptor: e.target.value || null } : prev)} placeholder="Short descriptor" className="mt-3 w-full rounded-2xl border border-[#eadfce] px-4 py-3 text-[#6f5843] outline-none" />
            </div>
            <textarea value={draft.about} onChange={(e) => setDraft((prev) => prev ? { ...prev, about: e.target.value } : prev)} className="min-h-[132px] w-full rounded-2xl border border-[#eadfce] px-4 py-3 text-[#4b3a2c] leading-7 outline-none" />
            <input value={draft.slug} onChange={(e) => setDraft((prev) => prev ? { ...prev, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') } : prev)} placeholder="vendor-page-slug" className="w-full rounded-2xl border border-[#eadfce] px-4 py-3 text-sm outline-none" />
            <input type="email" value={draft.contact_email ?? ''} onChange={(e) => setDraft((prev) => prev ? { ...prev, contact_email: e.target.value || null } : prev)} placeholder="Contact email for direct inquiry CTA" className="w-full rounded-2xl border border-[#eadfce] px-4 py-3 text-sm outline-none" />
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.22em] text-[#8b6f53]">Images (first line becomes hero)</p>
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
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[draft.hero_image_url, ...(draft.image_urls || [])].filter((image): image is string => Boolean(image)).slice(0, 6).map((image) => (
                <img key={image} src={image} alt={draft.vendor_name} className="aspect-square w-full rounded-2xl object-cover bg-[#f3eadf]" />
              ))}
            </div>
            <div className="flex flex-wrap gap-3">
              {draft.instagram_url && <a href={draft.instagram_url} target="_blank" rel="noreferrer" className="text-sm text-[#6f5843] underline">Instagram</a>}
              {draft.website_url && <a href={draft.website_url} target="_blank" rel="noreferrer" className="text-sm text-[#6f5843] underline">Website</a>}
            </div>
            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={handlePublish} disabled={saving} className="rounded-2xl bg-[#2f261d] px-5 py-3 text-sm font-semibold text-white disabled:opacity-60">
                {saving ? 'Publishing…' : 'Publish vendor page'}
              </button>
              <div className="text-sm text-[#8b6f53] self-center">Preferred path: /vendor/{draft.slug}</div>
            </div>
            <p className="text-xs text-[#8b6f53]">If that slug is already taken, publish will automatically use the next clean available URL.</p>
          </div>
        )}

        {createdProfile && (
          <div className="rounded-[28px] bg-[#2f261d] p-6 sm:p-8 text-white shadow-[0_24px_80px_rgba(31,21,12,0.24)] space-y-4">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-[#d8c4ad]">Published</p>
              <h2 className="mt-2 text-2xl font-semibold">/{`vendor/${createdProfile.slug}`}</h2>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link to={`/vendor/${createdProfile.slug}`} className="rounded-2xl bg-[#f5e9db] px-5 py-3 text-sm font-semibold text-[#2f261d]">
                Open live page
              </Link>
              <button type="button" onClick={handleCopyLiveUrl} className="rounded-2xl border border-white/20 px-5 py-3 text-sm font-semibold text-white">
                Copy live URL
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
