import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { generateVendorProfileDraft, createVendorProfile, type VendorProfileDraft } from '../lib/vendorProfiles';
import { useToast } from '../components/ui/Toast';

export const VendorProfileCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [form, setForm] = useState({ vendorName: '', instagramUrl: '', websiteUrl: '' });
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState<VendorProfileDraft | null>(null);
  const [saving, setSaving] = useState(false);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const nextDraft = await generateVendorProfileDraft(form);
      setDraft(nextDraft);
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
      toast('Vendor page created.', 'success');
      navigate(`/vendor/${created.slug}`);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not create vendor page.', 'error');
    } finally {
      setSaving(false);
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
          <button disabled={loading} className="rounded-2xl bg-[#2f261d] px-5 py-3 text-sm font-semibold text-white disabled:opacity-60">
            {loading ? 'Generating…' : 'Generate vendor profile'}
          </button>
        </form>

        {draft && (
          <div className="rounded-[28px] bg-white p-6 sm:p-8 shadow-[0_18px_40px_rgba(53,37,22,0.08)] space-y-4">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-[#8b6f53]">Draft</p>
              <h2 className="mt-2 text-2xl font-semibold">{draft.vendor_name}</h2>
              {draft.descriptor && <p className="mt-1 text-[#6f5843]">{draft.descriptor}</p>}
            </div>
            <p className="text-[#4b3a2c] leading-7">{draft.about}</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {(draft.image_urls || []).slice(0, 6).map((image: string) => (
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
      </div>
    </div>
  );
};

export default VendorProfileCreatePage;
