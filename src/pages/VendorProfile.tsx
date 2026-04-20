import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ExternalLink, Instagram } from 'lucide-react';
import { getVendorProfileBySlug, submitVendorInquiry, type VendorProfile } from '../lib/vendorProfiles';

export const VendorProfilePage: React.FC = () => {
  const { slug } = useParams();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<VendorProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', message: '' });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!slug) {
        setError('Missing vendor page.');
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const data = await getVendorProfileBySlug(slug);
        if (cancelled) return;
        setProfile(data);
        setError(data ? null : 'Vendor page not found.');
      } catch (err) {
        if (cancelled) return;
        setProfile(null);
        setError(err instanceof Error ? err.message : 'Could not load vendor page.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const galleryImages = useMemo(() => {
    if (!profile) return [] as string[];
    const all = [profile.hero_image_url, ...profile.image_urls].filter((item, index, arr): item is string => !!item && arr.indexOf(item) === index);
    return all.slice(0, 6);
  }, [profile]);

  const featuredImage = galleryImages[0] ?? null;
  const secondaryImages = galleryImages.slice(1, 6);
  const initials = useMemo(() => profile?.vendor_name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') ?? 'VP', [profile?.vendor_name]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    try {
      setSending(true);
      await submitVendorInquiry({
        vendor_profile_id: profile.id,
        name: form.name.trim(),
        email: form.email.trim(),
        message: form.message.trim(),
      });
      setSent(true);
      setForm({ name: '', email: '', message: '' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send inquiry.');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-[#f6f1ea] flex items-center justify-center text-[#2f261d]">Loading vendor profile…</div>;
  }

  if (!profile) {
    return <div className="min-h-screen bg-[#f6f1ea] flex items-center justify-center px-6 text-center text-[#2f261d]">{error || 'Vendor page not found.'}</div>;
  }

  return (
    <div className="min-h-screen bg-[#f6f1ea] text-[#2f261d]">
      <div className="max-w-5xl mx-auto px-4 py-4 sm:px-6 sm:py-8 space-y-8 sm:space-y-12">
        <section className="overflow-hidden rounded-[28px] bg-white shadow-[0_24px_80px_rgba(53,37,22,0.12)]">
          {profile.hero_image_url ? (
            <div className="aspect-[4/5] sm:aspect-[16/8] bg-[#e9dfd2]">
              <img src={profile.hero_image_url} alt={profile.vendor_name} className="h-full w-full object-cover" />
            </div>
          ) : (
            <div className="aspect-[4/5] sm:aspect-[16/8] bg-[linear-gradient(135deg,#e9dfd2_0%,#f8f3ec_55%,#e1d3c2_100%)] flex items-center justify-center">
              <div className="flex h-28 w-28 items-center justify-center rounded-full border border-white/60 bg-white/70 text-3xl font-semibold tracking-[0.18em] text-[#8b6f53] shadow-[0_18px_40px_rgba(53,37,22,0.08)] sm:h-36 sm:w-36 sm:text-4xl">
                {initials}
              </div>
            </div>
          )}
          <div className="p-6 sm:p-10 space-y-3">
            <p className="text-xs uppercase tracking-[0.35em] text-[#8b6f53]">Wedding vendor</p>
            <h1 className="text-4xl sm:text-6xl font-semibold leading-tight">{profile.vendor_name}</h1>
            {profile.descriptor && <p className="text-base sm:text-xl text-[#6f5843] max-w-2xl">{profile.descriptor}</p>}
            <div className="flex flex-wrap gap-2 pt-2">
              {profile.instagram_url && <span className="rounded-full bg-[#f6f1ea] px-3 py-1 text-xs tracking-[0.18em] uppercase text-[#8b6f53]">Instagram</span>}
              {profile.website_url && <span className="rounded-full bg-[#f6f1ea] px-3 py-1 text-xs tracking-[0.18em] uppercase text-[#8b6f53]">Website</span>}
              <span className="rounded-full bg-[#f6f1ea] px-3 py-1 text-xs tracking-[0.18em] uppercase text-[#8b6f53]">Inquire</span>
            </div>
          </div>
        </section>

        {galleryImages.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-sm uppercase tracking-[0.28em] text-[#8b6f53]">Images</h2>
            <div className="grid gap-3 sm:gap-4 sm:grid-cols-[1.25fr_0.75fr]">
              {featuredImage && (
                <div className="overflow-hidden rounded-[24px] bg-white shadow-[0_18px_40px_rgba(53,37,22,0.08)]">
                  <img src={featuredImage} alt={`${profile.vendor_name} featured`} className="h-full w-full object-cover aspect-[4/5] sm:aspect-[4/4.4]" />
                </div>
              )}
              <div className="grid grid-cols-2 gap-3 sm:gap-4 auto-rows-fr">
                {secondaryImages.map((image, index) => (
                  <div key={`${image}-${index}`} className="overflow-hidden rounded-[24px] bg-white shadow-[0_18px_40px_rgba(53,37,22,0.08)]">
                    <img src={image} alt={`${profile.vendor_name} ${index + 2}`} className="h-full w-full object-cover aspect-square" />
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        <section className="grid gap-8 sm:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-[28px] bg-white p-6 sm:p-8 shadow-[0_18px_40px_rgba(53,37,22,0.08)] space-y-4">
            <h2 className="text-sm uppercase tracking-[0.28em] text-[#8b6f53]">About</h2>
            <p className="text-base sm:text-lg leading-8 text-[#4b3a2c]">{profile.about}</p>
          </div>

          <div className="rounded-[28px] bg-white p-6 sm:p-8 shadow-[0_18px_40px_rgba(53,37,22,0.08)] space-y-4">
            <h2 className="text-sm uppercase tracking-[0.28em] text-[#8b6f53]">Links</h2>
            <div className="space-y-3">
              {profile.instagram_url && (
                <a href={profile.instagram_url} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-2xl border border-[#eadfce] px-4 py-3 hover:bg-[#fbf8f3]">
                  <span className="flex items-center gap-3"><Instagram className="h-4 w-4" /> Instagram</span>
                  <ExternalLink className="h-4 w-4" />
                </a>
              )}
              {profile.website_url && (
                <a href={profile.website_url} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-2xl border border-[#eadfce] px-4 py-3 hover:bg-[#fbf8f3]">
                  <span className="flex items-center gap-3"><ExternalLink className="h-4 w-4" /> Website</span>
                  <ExternalLink className="h-4 w-4" />
                </a>
              )}
            </div>
          </div>
        </section>

        <section className="rounded-[28px] bg-[#2f261d] text-white p-6 sm:p-8 shadow-[0_24px_80px_rgba(31,21,12,0.24)] space-y-5">
          <div>
            <h2 className="text-sm uppercase tracking-[0.28em] text-[#d8c4ad]">Contact / Inquire</h2>
            <p className="mt-3 text-base sm:text-lg text-[#efe4d8] max-w-2xl">Send a quick inquiry and keep the conversation moving without hunting for details.</p>
          </div>
          {profile.contact_email && (
            <a
              href={`mailto:${profile.contact_email}?subject=${encodeURIComponent(`Inquiry for ${profile.vendor_name}`)}`}
              className="inline-flex items-center justify-center rounded-2xl bg-white/10 px-5 py-3 text-sm font-semibold text-white hover:bg-white/15"
            >
              Email {profile.vendor_name}
            </a>
          )}
          {sent ? (
            <div className="rounded-2xl bg-white/10 px-4 py-4 text-sm text-[#f5e9db]">Inquiry sent. We saved your message for follow-up.</div>
          ) : (
            <form onSubmit={handleSubmit} className="grid gap-3 sm:grid-cols-2">
              <input value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} placeholder="Your name" className="rounded-2xl bg-white/10 border border-white/15 px-4 py-3 text-white placeholder:text-white/60 outline-none" required />
              <input type="email" value={form.email} onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))} placeholder="Email" className="rounded-2xl bg-white/10 border border-white/15 px-4 py-3 text-white placeholder:text-white/60 outline-none" required />
              <textarea value={form.message} onChange={(e) => setForm((prev) => ({ ...prev, message: e.target.value }))} placeholder="What are you looking for?" className="sm:col-span-2 min-h-[150px] rounded-2xl bg-white/10 border border-white/15 px-4 py-3 text-white placeholder:text-white/60 outline-none" required />
              <button disabled={sending} className="sm:col-span-2 rounded-2xl bg-[#f5e9db] px-5 py-3 text-sm font-semibold text-[#2f261d] hover:bg-white disabled:opacity-60">
                {sending ? 'Sending…' : 'Send inquiry'}
              </button>
            </form>
          )}
        </section>
      </div>
    </div>
  );
};

export default VendorProfilePage;
