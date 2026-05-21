import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ArrowRight, ExternalLink, Instagram } from 'lucide-react';
import {
  getMyVendorInquiryContext,
  getVendorProfileBySlug,
  normalizeVendorProfileCustomization,
  normalizeVendorTemplateId,
  submitVendorInquiry,
  type VendorAccentId,
  type VendorInquiryContext,
  type VendorProfile,
  type VendorSectionId,
} from '../lib/vendorProfiles';
import { getSafePublicEmailHref, getSafePublicImageUrl, getSafePublicInstagramUrl, getSafePublicWebUrl } from '../sections/publicLinks';
import { customerSafeErrorMessage } from '../lib/customerSafeError';

function readSourceLink(profile: VendorProfile, key: 'pinterest_url' | 'tiktok_url' | 'facebook_url' | 'youtube_url'): string | null {
  const value = profile.source_payload?.[key];
  if (typeof value !== 'string') return null;
  return getSafePublicWebUrl(value) || null;
}

function safeVendorProfileError(err: unknown, fallback: string): string {
  return customerSafeErrorMessage(err, fallback);
}

const vendorAccentStyles: Record<VendorAccentId, {
  inquiry: string;
  inquiryButton: string;
  highlight: string;
  softPanel: string;
}> = {
  champagne: {
    inquiry: 'bg-[#2f261d] text-white',
    inquiryButton: 'bg-[#f5e9db] text-[#2f261d] hover:bg-white',
    highlight: 'bg-[#f5e9db] text-[#2f261d]',
    softPanel: 'bg-[#fffaf3] text-[#4b3a2c]',
  },
  sage: {
    inquiry: 'bg-[#23372f] text-white',
    inquiryButton: 'bg-[#eef4e8] text-[#23372f] hover:bg-white',
    highlight: 'bg-[#eef4e8] text-[#23372f]',
    softPanel: 'bg-[#f4f8f1] text-[#34483d]',
  },
  rose: {
    inquiry: 'bg-[#4a2f34] text-white',
    inquiryButton: 'bg-[#f9e7e8] text-[#4a2f34] hover:bg-white',
    highlight: 'bg-[#f9e7e8] text-[#4a2f34]',
    softPanel: 'bg-[#fff7f7] text-[#4a2f34]',
  },
  ink: {
    inquiry: 'bg-[#141414] text-white',
    inquiryButton: 'bg-[#f1ede6] text-[#141414] hover:bg-white',
    highlight: 'bg-[#efebe4] text-[#141414]',
    softPanel: 'bg-[#f8f6f2] text-[#2f2a24]',
  },
};

export const VendorProfilePage: React.FC = () => {
  const { slug } = useParams();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<VendorProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [showFullGallery, setShowFullGallery] = useState(false);
  const [inquiryContext, setInquiryContext] = useState<VendorInquiryContext | null>(null);
  const [form, setForm] = useState({ name: '', email: '', weddingDate: '', venueName: '', venueLocation: '', message: '' });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!slug) {
        setError('This page is not ready right now.');
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const data = await getVendorProfileBySlug(slug);
        if (cancelled) return;
        setProfile(data);
        setError(data ? null : 'This page is not ready right now.');
      } catch (err) {
        if (cancelled) return;
        setProfile(null);
        setError(safeVendorProfileError(err, 'Couldn’t load this page right now. Please refresh and try again.'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  useEffect(() => {
    let cancelled = false;
    async function loadInquiryContext() {
      try {
        const context = await getMyVendorInquiryContext();
        if (cancelled || !context) return;
        setInquiryContext(context);
        setForm((prev) => ({
          ...prev,
          name: prev.name || context.sender_name || context.couple_names,
          email: prev.email || context.sender_email,
          weddingDate: prev.weddingDate || context.wedding_date,
          venueName: prev.venueName || context.venue_name,
          venueLocation: prev.venueLocation || context.venue_location,
        }));
      } catch {
        if (!cancelled) setInquiryContext(null);
      }
    }
    void loadInquiryContext();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setShowFullGallery(false);
  }, [profile?.id]);

  const galleryImages = useMemo(() => {
    if (!profile) return [] as string[];
    return [profile.hero_image_url, ...profile.image_urls]
      .map((item) => getSafePublicImageUrl(item))
      .filter((item, index, arr): item is string => Boolean(item) && arr.indexOf(item) === index);
  }, [profile]);

  const visibleGalleryImages = showFullGallery ? galleryImages : galleryImages.slice(0, 6);
  const featuredImage = visibleGalleryImages[0] ?? null;
  const secondaryImages = visibleGalleryImages.slice(1);
  const initials = useMemo(() => profile?.vendor_name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') ?? 'VP', [profile?.vendor_name]);
  const pinterestUrl = profile ? readSourceLink(profile, 'pinterest_url') : null;
  const tiktokUrl = profile ? readSourceLink(profile, 'tiktok_url') : null;
  const facebookUrl = profile ? readSourceLink(profile, 'facebook_url') : null;
  const youtubeUrl = profile ? readSourceLink(profile, 'youtube_url') : null;
  const instagramUrl = profile ? getSafePublicInstagramUrl(profile.instagram_url) : '';
  const websiteUrl = profile ? getSafePublicWebUrl(profile.website_url) : '';
  const directEmailHref = profile ? getSafePublicEmailHref(profile.contact_email) : '';
  const directEmailSubjectHref = profile ? getSafePublicEmailHref(profile.contact_email, `Note for ${profile.vendor_name}`) : '';
  const publicLinks = [
    instagramUrl ? { label: 'Instagram', href: instagramUrl, icon: <Instagram className="h-4 w-4" /> } : null,
    pinterestUrl ? { label: 'Pinterest', href: pinterestUrl, icon: <ExternalLink className="h-4 w-4" /> } : null,
    tiktokUrl ? { label: 'TikTok', href: tiktokUrl, icon: <ExternalLink className="h-4 w-4" /> } : null,
    facebookUrl ? { label: 'Facebook', href: facebookUrl, icon: <ExternalLink className="h-4 w-4" /> } : null,
    youtubeUrl ? { label: 'YouTube', href: youtubeUrl, icon: <ExternalLink className="h-4 w-4" /> } : null,
    websiteUrl ? { label: 'Website', href: websiteUrl, icon: <ExternalLink className="h-4 w-4" /> } : null,
  ].filter((item): item is { label: string; href: string; icon: JSX.Element } => Boolean(item));
  const hasGallery = visibleGalleryImages.length > 0;
  const hasSingleImage = visibleGalleryImages.length === 1;
  const hasTwoImages = visibleGalleryImages.length === 2;
  const canExpandGallery = galleryImages.length > 6;
  const hiddenGalleryCount = Math.max(0, galleryImages.length - visibleGalleryImages.length);
  const hasDescriptor = Boolean(profile?.descriptor);
  const hasDirectEmail = Boolean(directEmailHref);
  const hasPublicLinks = publicLinks.length > 0;
  const hasPackagedInquiryContext = Boolean(inquiryContext?.sender_email);
  const templateId = normalizeVendorTemplateId(profile?.source_payload?.template_id);
  const customization = useMemo(() => normalizeVendorProfileCustomization(profile?.source_payload), [profile?.source_payload]);
  const accent = vendorAccentStyles[customization.accent_id];
  const isPortfolio = templateId === 'portfolio' || templateId === 'photography';
  const isFood = templateId === 'food';
  const isBeauty = templateId === 'beauty';
  const isMusic = templateId === 'music';
  const isTravel = templateId === 'travel';
  const isMinimal = templateId === 'minimal' || templateId === 'planner' || templateId === 'service' || isTravel;
  const isDark = isPortfolio || isMusic;
  const templateEyebrow = templateId === 'venue'
    ? 'Venue'
    : templateId === 'floral'
      ? 'Florals and decor'
      : isFood
        ? 'Food and drinks'
        : isBeauty
          ? 'Beauty and getting ready'
          : isMusic
            ? 'Music and sound'
            : isTravel
              ? 'Travel and guest movement'
      : templateId === 'planner'
        ? 'Planning help'
        : templateId === 'service'
          ? 'Wedding help'
          : 'Wedding notes';
  const defaultProfileNotes = isFood
    ? ['Tasting plan', 'Menu notes', 'Schedule']
    : isBeauty
      ? ['Trial plan', 'Wedding morning', 'Party schedule']
      : isMusic
        ? ['Ceremony cues', 'Reception energy', 'Set notes']
        : isTravel
          ? ['Pickup windows', 'Guest movement', 'Day of contact']
          : templateId === 'venue'
            ? ['Tour plan', 'Guest flow', 'Space notes']
            : templateId === 'floral'
              ? ['Palette', 'Install plan', 'Seasonal texture']
              : templateId === 'planner'
                ? ['Planning notes', 'Schedule', 'Calm handoffs']
                : [];
  const profileNotes = customization.proof_points.length > 0 ? customization.proof_points : defaultProfileNotes;
  const rating = customization.rating.enabled ? customization.rating : null;
  const externalCredibility = customization.external_credibility.enabled ? customization.external_credibility : null;
  const defaultNextStepCopy = isFood
    ? 'Send note about tasting'
    : isBeauty
      ? 'Send note about trial'
      : isMusic
        ? 'Hear a set'
      : isTravel
          ? 'Plan transportation'
          : templateId === 'venue'
            ? 'Send note about a tour'
            : templateId === 'planner'
              ? 'Send note about planning'
              : 'Send note';
  const nextStepCopy = customization.cta_label ?? defaultNextStepCopy;
  const pageClass = isDark
    ? 'bg-[#11100e] text-[#f8f3ec]'
    : isFood
      ? 'bg-[#fffaf3] text-[#2f261d]'
      : isBeauty
        ? 'bg-[#fbf7f4] text-[#2f261d]'
        : isMinimal
          ? 'bg-[#fbfaf7] text-[#2f261d]'
          : 'bg-[#f6f1ea] text-[#2f261d]';
  const shellClass = isMinimal ? 'max-w-3xl' : isDark ? 'max-w-6xl' : 'max-w-5xl';
  const heroCardClass = isDark
    ? 'overflow-hidden rounded-xl border border-white/10 bg-[#1d1a17] shadow-sm'
    : isMinimal
      ? 'rounded-xl border border-[#eadfce] bg-white shadow-sm'
      : 'overflow-hidden rounded-xl bg-white shadow-sm';
  const mutedText = isDark ? 'text-[#d8c4ad]' : 'text-[#6f5843]';
  const eyebrowText = isDark ? 'text-[#d8c4ad]' : 'text-[#8b6f53]';
  const titleText = isDark ? 'text-[#f8f3ec]' : 'text-[#2f261d]';
  const chipClass = isDark ? 'bg-white/10 text-[#f5e9db]' : 'bg-[#f6f1ea] text-[#8b6f53]';
  const panelClass = isDark
    ? 'rounded-xl border border-white/10 bg-white/8 p-6 sm:p-8 shadow-sm'
    : 'rounded-xl bg-white p-6 sm:p-8 shadow-sm';
  const sectionEnabled = (sectionId: VendorSectionId) => !customization.hidden_sections.includes(sectionId);
  const sectionOrderIndex = (sectionId: VendorSectionId) => {
    const index = customization.section_order.indexOf(sectionId);
    return index === -1 ? 99 : index;
  };
  const galleryGridClass = customization.gallery_layout === 'stacked'
    ? 'grid gap-3 sm:gap-4'
    : customization.gallery_layout === 'mosaic'
      ? 'grid gap-3 sm:gap-4 sm:grid-cols-3'
      : isDark
        ? 'grid gap-3 sm:gap-4 sm:grid-cols-3'
        : hasSingleImage
          ? 'grid'
          : hasTwoImages
            ? 'grid gap-3 sm:gap-4 sm:grid-cols-2'
            : 'grid gap-3 sm:gap-4 sm:grid-cols-[1.25fr_0.75fr]';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    try {
      setSending(true);
      await submitVendorInquiry({
        vendor_profile_id: profile.id,
        name: form.name.trim(),
        email: form.email.trim(),
        wedding_date: form.weddingDate.trim(),
        venue_name: form.venueName.trim(),
        venue_location: form.venueLocation.trim(),
        couple_names: inquiryContext?.couple_names,
        site_slug: inquiryContext?.site_slug,
        inquiry_context: inquiryContext?.summary,
        message: form.message.trim(),
      });
      setSent(true);
      setForm({ name: '', email: '', weddingDate: '', venueName: '', venueLocation: '', message: '' });
    } catch (err) {
      setError(safeVendorProfileError(err, 'Couldn’t send that note right now. Please try again.'));
    } finally {
      setSending(false);
    }
  };

  const updateInquiryField = (
    key: 'name' | 'email' | 'weddingDate' | 'venueName' | 'venueLocation' | 'message',
    value: string,
  ) => {
    setError(null);
    setSent(false);
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return <div className="min-h-screen bg-[#f6f1ea] flex items-center justify-center text-[#2f261d]">Loading page...</div>;
  }

  if (!profile) {
    return <div className="min-h-screen bg-[#f6f1ea] flex items-center justify-center px-6 text-center text-[#2f261d]">{error || 'This page is not ready right now.'}</div>;
  }

  return (
    <div className={`min-h-screen ${pageClass}`}>
      <div className={`${shellClass} mx-auto px-4 py-4 sm:px-6 sm:py-8 space-y-8 sm:space-y-14`}>
        <section className={heroCardClass}>
          {featuredImage ? (
            <div className={`${isMinimal ? 'mx-6 mt-6 aspect-[16/10] rounded-xl' : isDark ? 'aspect-[4/5] sm:aspect-[21/9]' : 'aspect-[4/5] sm:aspect-[18/7]'} overflow-hidden bg-[#e9dfd2]`}>
              <img src={featuredImage} alt={profile.vendor_name} className={`h-full w-full object-cover ${isDark ? 'saturate-[0.92] contrast-105' : ''}`} />
            </div>
          ) : (
            <div className={`${isMinimal ? 'mx-6 mt-6 aspect-[16/10] rounded-xl' : 'aspect-[4/5] sm:aspect-[18/7]'} bg-[linear-gradient(135deg,#e9dfd2_0%,#f8f3ec_55%,#e1d3c2_100%)] flex items-center justify-center`}>
              <div className="flex h-24 w-24 items-center justify-center rounded-xl border border-white/60 bg-white/70 text-3xl font-semibold text-[#8b6f53] sm:h-32 sm:w-32 sm:text-4xl">
                {initials}
              </div>
            </div>
          )}
          <div className={`${isMinimal ? 'p-6 sm:p-8' : 'p-6 sm:p-8'} space-y-4`}>
            {customization.logo_text && (
              <div className={`inline-flex h-12 min-w-12 items-center justify-center rounded-xl px-3 text-sm font-semibold tracking-[0.12em] ${isDark ? 'bg-white/10 text-[#f8f3ec]' : accent.highlight}`}>
                {customization.logo_text}
              </div>
            )}
            <p className={`text-xs font-semibold ${eyebrowText}`}>{templateEyebrow}</p>
            <h1 className={`text-4xl sm:text-5xl font-semibold leading-[1.02] max-w-3xl ${titleText}`}>{profile.vendor_name}</h1>
            {hasDescriptor ? (
              <p className={`text-base sm:text-xl ${mutedText} max-w-2xl`}>{profile.descriptor}</p>
            ) : (
              <p className={`text-sm sm:text-base ${eyebrowText} max-w-2xl`}>Photos, links, and a simple way to write.</p>
            )}
            <div className="flex flex-wrap gap-2 pt-2">
              {instagramUrl && <span className={`rounded-xl px-3 py-1 text-xs font-medium ${chipClass}`}>Instagram</span>}
              {websiteUrl && <span className={`rounded-xl px-3 py-1 text-xs font-medium ${chipClass}`}>Website</span>}
              {hasDirectEmail && <span className={`rounded-xl px-3 py-1 text-xs font-medium ${chipClass}`}>Email</span>}
              {externalCredibility && (
                <span className={`rounded-xl px-3 py-1 text-xs font-medium ${chipClass}`}>
                  {externalCredibility.source_label} notes
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-3 pt-2">
              <a href="#vendor-inquiry" className={`inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold shadow-sm ${accent.inquiryButton}`}>
                {nextStepCopy}
                <ArrowRight className="h-4 w-4" />
              </a>
              {customization.service_area && (
                <span className={`inline-flex items-center rounded-xl px-4 py-3 text-sm font-medium ${isDark ? 'bg-white/10 text-[#efe4d8]' : accent.softPanel}`}>
                  {customization.service_area}
                </span>
              )}
            </div>
          </div>
        </section>

        <div className="flex flex-col gap-8 sm:gap-14">
        {sectionEnabled('proof') && profileNotes.length > 0 && (
          <section style={{ order: sectionOrderIndex('proof') }} className={`grid gap-3 ${isMinimal ? '' : 'sm:grid-cols-3'}`}>
            {profileNotes.map((item) => (
              <div key={item} className={`${isDark ? 'border border-white/10 bg-white/8 text-[#efe4d8]' : `${accent.highlight} border border-black/5`} rounded-xl px-4 py-4 shadow-sm`}>
                <p className={`text-xs font-semibold ${isDark ? eyebrowText : 'text-current opacity-70'}`}>Note</p>
                <p className="mt-2 text-sm font-semibold">{item}</p>
              </div>
            ))}
          </section>
        )}

        {(externalCredibility || rating) && (
          <section style={{ order: sectionOrderIndex('proof') + 0.25 }} className={`${panelClass} space-y-4`}>
            <h2 className={`text-sm font-semibold ${eyebrowText}`}>Shared notes</h2>
            <div className={`grid gap-3 ${externalCredibility && rating ? 'sm:grid-cols-2' : ''}`}>
              {externalCredibility && (
                <div className={`rounded-xl border p-4 ${isDark ? 'border-white/10 bg-white/5' : 'border-[#eadfce] bg-[#fffaf3]'}`}>
                  <p className={`text-xs font-semibold ${eyebrowText}`}>Notes from</p>
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <span className={`inline-flex items-center rounded-xl px-3 py-2 text-sm font-semibold ${isDark ? 'bg-white/10 text-[#f8f3ec]' : accent.highlight}`}>
                      {externalCredibility.source_label}
                    </span>
                    <p className={`text-sm leading-6 ${mutedText}`}>
                      {externalCredibility.review_count !== null
                        ? `${externalCredibility.review_count.toLocaleString()} note${externalCredibility.review_count === 1 ? '' : 's'} shared there.`
                        : 'Notes shared there.'}
                    </p>
                  </div>
                  {externalCredibility.profile_url && (
                    <a
                      href={externalCredibility.profile_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`mt-3 inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold ${isDark ? 'bg-white/10 text-[#f8f3ec] hover:bg-white/15' : 'bg-white text-[#4b3a2c] hover:bg-[#fbf8f3]'}`}
                    >
                      Open {externalCredibility.source_label}
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                </div>
              )}
              {rating && (
                <div className={`rounded-xl border p-4 ${isDark ? 'border-white/10 bg-white/5' : 'border-[#eadfce] bg-[#fffaf3]'}`}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className={`text-xs font-semibold ${eyebrowText}`}>Notes</p>
                      <p className={`mt-2 text-sm leading-6 ${mutedText}`}>
                        {rating.summary || 'Schedule, style, and guest notes.'}
                      </p>
                    </div>
                  </div>
                  {rating.categories.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {rating.categories.map((item) => (
                        <span key={`${item.label}-${item.score}`} className={`rounded-xl px-3 py-1 text-xs font-semibold ${isDark ? 'bg-white/10 text-[#efe4d8]' : 'bg-white text-[#6f5843]'}`}>
                          {item.label}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>
        )}

        {sectionEnabled('fit') && (customization.service_area || customization.pricing_note) && (
          <section style={{ order: sectionOrderIndex('fit') }} className={`grid gap-3 ${customization.service_area && customization.pricing_note ? 'sm:grid-cols-2' : ''}`}>
            {customization.service_area && (
              <div className={`${isDark ? 'border border-white/10 bg-white/8 text-[#efe4d8]' : 'bg-white text-[#4b3a2c]'} rounded-xl p-5 shadow-sm`}>
                <p className={`text-xs font-semibold ${eyebrowText}`}>Where they work</p>
                <p className="mt-2 text-base font-semibold leading-7">{customization.service_area}</p>
              </div>
            )}
            {customization.pricing_note && (
              <div className={`${isDark ? 'border border-white/10 bg-white/8 text-[#efe4d8]' : 'bg-white text-[#4b3a2c]'} rounded-xl p-5 shadow-sm`}>
                <p className={`text-xs font-semibold ${eyebrowText}`}>Note</p>
                <p className="mt-2 text-base font-semibold leading-7">{customization.pricing_note}</p>
              </div>
            )}
          </section>
        )}

        {sectionEnabled('facts') && customization.category_facts.length > 0 && (
          <section style={{ order: sectionOrderIndex('facts') }} className={`${panelClass} space-y-4`}>
            <h2 className={`text-sm font-semibold ${eyebrowText}`}>Details</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {customization.category_facts.map((fact) => (
                <div key={`${fact.label}-${fact.value}`} className={`rounded-xl border p-4 ${isDark ? 'border-white/10 bg-white/5' : 'border-[#eadfce] bg-[#fffaf3]'}`}>
                  <p className={`text-xs font-semibold ${eyebrowText}`}>{fact.label}</p>
                  <p className={`mt-2 text-sm font-semibold leading-6 ${titleText}`}>{fact.value}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {sectionEnabled('gallery') && hasGallery && (
          <section style={{ order: sectionOrderIndex('gallery') }} className="space-y-4 sm:space-y-5">
            <h2 className={`text-sm font-semibold ${eyebrowText}`}>Photos</h2>
            <div className={galleryGridClass}>
              {featuredImage && (
                <div className="overflow-hidden rounded-xl bg-white shadow-sm">
                  <img src={featuredImage} alt={`${profile.vendor_name} main photo`} className={`h-full w-full object-cover ${isDark ? 'aspect-[4/5]' : hasSingleImage ? 'aspect-[4/5] sm:aspect-[16/9]' : 'aspect-[4/5] sm:aspect-[4/4.4]'}`} />
                </div>
              )}
              {!hasSingleImage && !isDark && customization.gallery_layout !== 'mosaic' && (
                <div className={`grid ${hasTwoImages ? 'grid-cols-1' : 'grid-cols-2'} gap-3 sm:gap-4 auto-rows-fr`}>
                  {secondaryImages.map((image, index) => (
                    <div key={`${image}-${index}`} className="overflow-hidden rounded-xl bg-white shadow-sm">
                      <img src={image} alt={`${profile.vendor_name} ${index + 2}`} className="h-full w-full object-cover aspect-square" />
                    </div>
                  ))}
                </div>
              )}
              {!hasSingleImage && !isDark && customization.gallery_layout === 'mosaic' && secondaryImages.map((image, index) => (
                <div key={`${image}-${index}`} className="overflow-hidden rounded-xl bg-white shadow-sm">
                  <img src={image} alt={`${profile.vendor_name} ${index + 2}`} className="h-full w-full object-cover aspect-square" />
                </div>
              ))}
              {isDark && secondaryImages.map((image, index) => (
                <div key={`${image}-${index}`} className="overflow-hidden rounded-xl bg-white shadow-sm">
                  <img src={image} alt={`${profile.vendor_name} ${index + 2}`} className="h-full w-full object-cover aspect-[4/5]" />
                </div>
              ))}
            </div>
            {canExpandGallery && (
              <button
                type="button"
                aria-expanded={showFullGallery}
                onClick={() => setShowFullGallery((current) => !current)}
                className={`inline-flex rounded-xl px-4 py-2 text-sm font-semibold ${isDark ? 'bg-white/10 text-[#f8f3ec] hover:bg-white/15' : 'bg-white text-[#4b3a2c] shadow-sm hover:bg-[#fbf8f3]'}`}
              >
                {showFullGallery ? 'Show fewer photos' : `Show all photos${hiddenGalleryCount > 0 ? ` (${hiddenGalleryCount} more)` : ''}`}
              </button>
            )}
          </section>
        )}

        {sectionEnabled('gallery') && !hasGallery && (
          <section style={{ order: sectionOrderIndex('gallery') }} className={`rounded-xl border border-dashed ${isDark ? 'border-white/15 bg-white/8 text-[#d8c4ad]' : 'border-[#d8c8b6] bg-white/70 text-[#6f5843]'} p-6 sm:p-8`}>
            <h2 className={`text-sm font-semibold ${eyebrowText}`}>Photos</h2>
            <p className="mt-3 text-sm sm:text-base">Photos can come later. Check the links for work samples.</p>
          </section>
        )}

        {sectionEnabled('packages') && customization.packages.length > 0 && (
          <section style={{ order: sectionOrderIndex('packages') }} className="space-y-4">
            <h2 className={`text-sm font-semibold ${eyebrowText}`}>What to know</h2>
            <div className={`grid gap-3 ${customization.packages.length > 1 ? 'sm:grid-cols-2' : ''}`}>
              {customization.packages.map((item) => (
                <div key={`${item.title}-${item.detail}`} className={`${panelClass} space-y-2`}>
                  <p className={`text-xs font-semibold ${eyebrowText}`}>{item.price ?? 'Note'}</p>
                  <h3 className={`text-xl font-semibold ${titleText}`}>{item.title}</h3>
                  <p className={`text-sm leading-6 ${mutedText}`}>{item.detail}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {sectionEnabled('testimonials') && customization.testimonials.length > 0 && (
          <section style={{ order: sectionOrderIndex('testimonials') }} className="space-y-4">
            <h2 className={`text-sm font-semibold ${eyebrowText}`}>Couple notes</h2>
            <div className={`grid gap-3 ${customization.testimonials.length > 1 ? 'sm:grid-cols-2' : ''}`}>
              {customization.testimonials.map((item) => (
                <figure key={`${item.quote}-${item.attribution ?? ''}`} className={`${panelClass} space-y-3`}>
                  <blockquote className={`text-lg font-semibold leading-8 ${titleText}`}>“{item.quote}”</blockquote>
                  {item.attribution && <figcaption className={`text-sm ${mutedText}`}>{item.attribution}</figcaption>}
                </figure>
              ))}
            </div>
          </section>
        )}

        {sectionEnabled('faq') && customization.faqs.length > 0 && (
          <section style={{ order: sectionOrderIndex('faq') }} className={`${panelClass} space-y-4`}>
            <h2 className={`text-sm font-semibold ${eyebrowText}`}>Common questions</h2>
            <div className="grid gap-3">
              {customization.faqs.map((item) => (
                <div key={`${item.question}-${item.answer}`} className={`rounded-xl border p-4 ${isDark ? 'border-white/10 bg-white/5' : 'border-[#eadfce] bg-[#fffaf3]'}`}>
                  <h3 className={`text-base font-semibold ${titleText}`}>{item.question}</h3>
                  <p className={`mt-2 text-sm leading-6 ${mutedText}`}>{item.answer}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {(sectionEnabled('about') || sectionEnabled('links')) && <section style={{ order: Math.min(sectionOrderIndex('about'), sectionOrderIndex('links')) }} className="grid gap-8 lg:grid-cols-[1.12fr_0.88fr] lg:items-start">
          {sectionEnabled('about') && <div className={`${panelClass} space-y-4 sm:space-y-5`}>
            <h2 className={`text-sm font-semibold ${eyebrowText}`}>About</h2>
            <p className={`text-base sm:text-lg leading-8 ${isDark ? 'text-[#efe4d8]' : 'text-[#4b3a2c]'}`}>{profile.about || `${profile.vendor_name} has a few notes, links, and a clear way to write.`}</p>
          </div>}

          {sectionEnabled('links') && <div className={`${panelClass} space-y-4 lg:sticky lg:top-6`}>
            <h2 className={`text-sm font-semibold ${eyebrowText}`}>Links</h2>
            {hasPublicLinks ? (
              <div className="space-y-3">
                {publicLinks.map((link) => (
                  <a key={link.label} href={link.href} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between rounded-xl border border-[#eadfce] px-4 py-3 hover:bg-[#fbf8f3]">
                    <span className="flex items-center gap-3">{link.icon} {link.label}</span>
                    <ExternalLink className="h-4 w-4" />
                  </a>
                ))}
              </div>
            ) : (
              <p className="text-sm sm:text-base text-[#6f5843]">Links can go here.</p>
            )}
            {hasPublicLinks && (
              <p className="pt-2 text-xs text-[#8b6f53]">Check these links for work samples or their website.</p>
            )}
          </div>}
        </section>}

        {sectionEnabled('inquiry') && <section style={{ order: sectionOrderIndex('inquiry') + 100 }} id="vendor-inquiry" className={`rounded-xl p-6 shadow-sm sm:p-8 space-y-5 sm:space-y-6 scroll-mt-6 ${accent.inquiry}`}>
          <div>
            <h2 className="text-sm font-semibold text-[#d8c4ad]">Send a note</h2>
            <p className="mt-3 text-2xl font-semibold leading-tight text-white sm:text-3xl">
              Send one clear note.
            </p>
            <p className="mt-3 text-base sm:text-lg text-[#efe4d8] max-w-2xl">
              {hasDirectEmail
                ? `${profile.vendor_name} will get your wedding details, reply email, and note together.`
                : 'Keep your wedding details, reply email, and note together.'}
            </p>
            {!hasDirectEmail && publicLinks.length === 0 && (
              <p className="mt-3 text-sm text-[#d8c4ad]">There are only a few notes here for now. The form below still gives couples a clear way to write.</p>
            )}
            {customization.inquiry_questions.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {customization.inquiry_questions.map((item) => (
                  <span key={item} className="rounded-xl bg-white/10 px-3 py-1 text-xs font-medium text-[#efe4d8]">{item}</span>
                ))}
              </div>
            )}
          </div>
          {error && (
            <div role="alert" className="rounded-xl bg-white px-4 py-3 text-sm font-semibold text-[#4b3a2c]">
              {error}
            </div>
          )}
          <div className={`grid gap-4 ${hasDirectEmail ? 'lg:grid-cols-[1.18fr_0.82fr]' : ''}`}>
            <div className={`rounded-xl border border-white/25 p-4 shadow-sm sm:p-5 space-y-4 ${accent.highlight}`}>
              {sent ? (
                <div role="status" className="rounded-xl bg-white px-4 py-4 text-sm text-[#4b3a2c]">Note sent. Note saved here.</div>
              ) : (
                <form onSubmit={handleSubmit} className="grid gap-3 sm:grid-cols-2" aria-busy={sending}>
                  <div className="sm:col-span-2 rounded-xl bg-white px-4 py-3">
                    <p className="text-sm font-semibold text-[#2f261d]">
                      {hasPackagedInquiryContext ? 'Wedding details included' : 'Add your note'}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-[#6f5843]">
                      {hasPackagedInquiryContext
                        ? 'Your date, venue, location, site, and reply email will go with the note.'
                        : 'Your reply email is included.'}
                    </p>
                  </div>
                  {hasPackagedInquiryContext ? (
                    <div className="sm:col-span-2 grid gap-2 rounded-xl bg-white/80 p-4 text-sm text-[#4b3a2c]">
                      {inquiryContext?.couple_names && <p><span className="font-semibold">Names:</span> {inquiryContext.couple_names}</p>}
                      {form.venueLocation && <p><span className="font-semibold">Location:</span> {form.venueLocation}</p>}
                      {form.venueName && <p><span className="font-semibold">Venue:</span> {form.venueName}</p>}
                      {form.weddingDate && <p><span className="font-semibold">Date:</span> {form.weddingDate}</p>}
                      {inquiryContext?.site_slug && <p><span className="font-semibold">Site:</span> /{inquiryContext.site_slug}</p>}
                      <p><span className="font-semibold">Email:</span> {form.email}</p>
                      <p className="pt-2 text-xs leading-5 text-[#6f5843]">Add style, schedule, guest count, or budget notes below.</p>
                    </div>
                  ) : (
                    <>
                      <div>
                        <label htmlFor="vendor-inquiry-name" className="mb-1 block text-sm font-medium text-[#4b3a2c]">Your name</label>
                        <input id="vendor-inquiry-name" value={form.name} onChange={(e) => updateInquiryField('name', e.target.value)} placeholder="Your name" className="w-full rounded-xl border border-[#d8c8b6] bg-white px-4 py-3 text-[#2f261d] placeholder:text-[#9a7a59] outline-none focus:ring-2 focus:ring-[#2f261d]/20" required />
                      </div>
                      <div>
                        <label htmlFor="vendor-inquiry-email" className="mb-1 block text-sm font-medium text-[#4b3a2c]">Email</label>
                        <input id="vendor-inquiry-email" type="email" value={form.email} onChange={(e) => updateInquiryField('email', e.target.value)} placeholder="Email" className="w-full rounded-xl border border-[#d8c8b6] bg-white px-4 py-3 text-[#2f261d] placeholder:text-[#9a7a59] outline-none focus:ring-2 focus:ring-[#2f261d]/20" required />
                      </div>
                      <div className="sm:col-span-2 rounded-xl border border-[#d8c8b6] bg-white/80 p-3">
                        <label htmlFor="vendor-inquiry-location" className="mb-1 block text-sm font-semibold text-[#4b3a2c]">Location</label>
                        <input id="vendor-inquiry-location" value={form.venueLocation} onChange={(e) => updateInquiryField('venueLocation', e.target.value)} placeholder="City, state, venue area, or destination" className="w-full rounded-xl border border-[#d8c8b6] bg-white px-4 py-3 text-[#2f261d] placeholder:text-[#9a7a59] outline-none focus:ring-2 focus:ring-[#2f261d]/20" />
                      </div>
                      <div>
                        <label htmlFor="vendor-inquiry-venue" className="mb-1 block text-sm font-medium text-[#4b3a2c]">Venue</label>
                        <input id="vendor-inquiry-venue" value={form.venueName} onChange={(e) => updateInquiryField('venueName', e.target.value)} placeholder="Venue" className="w-full rounded-xl border border-[#d8c8b6] bg-white px-4 py-3 text-[#2f261d] placeholder:text-[#9a7a59] outline-none focus:ring-2 focus:ring-[#2f261d]/20" />
                      </div>
                      <div>
                        <label htmlFor="vendor-inquiry-date" className="mb-1 block text-sm font-medium text-[#4b3a2c]">Date</label>
                        <input id="vendor-inquiry-date" type="date" value={form.weddingDate} onChange={(e) => updateInquiryField('weddingDate', e.target.value)} className="w-full rounded-xl border border-[#d8c8b6] bg-white px-4 py-3 text-[#2f261d] outline-none focus:ring-2 focus:ring-[#2f261d]/20" />
                      </div>
                    </>
                  )}
                  <div className="sm:col-span-2">
                    <label htmlFor="vendor-inquiry-message" className="mb-1 block text-sm font-semibold text-[#4b3a2c]">Note</label>
                    <textarea id="vendor-inquiry-message" value={form.message} onChange={(e) => updateInquiryField('message', e.target.value)} placeholder="Share schedule, guest count, style, budget, or questions." className="min-h-[150px] w-full rounded-xl border border-[#d8c8b6] bg-white px-4 py-3 text-[#2f261d] placeholder:text-[#9a7a59] outline-none focus:ring-2 focus:ring-[#2f261d]/20" required />
                  </div>
                  <button disabled={sending} className="sm:col-span-2 rounded-xl bg-[#2f261d] px-5 py-4 text-base font-semibold text-white hover:bg-[#4b3a2c] disabled:opacity-60">
                    {sending ? 'Sending…' : nextStepCopy}
                  </button>
                </form>
              )}
            </div>

            {hasDirectEmail && (
              <div className="rounded-xl bg-white/8 border border-white/10 p-4 sm:p-5 space-y-3 h-full">
                <p className="text-xs font-semibold text-[#d8c4ad]">Prefer your inbox?</p>
                <p className="text-sm text-[#efe4d8] leading-6">Write from your email instead.</p>
                <div className="grid gap-3">
                  <a
                    href={directEmailSubjectHref}
                    className="inline-flex items-center justify-center rounded-xl border border-white/20 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10"
                  >
                    Email {profile.vendor_name}
                  </a>
                  <a
                    href={directEmailHref}
                    className="inline-flex items-center justify-center rounded-xl border border-white/20 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10 break-all text-center"
                  >
                    {profile.contact_email}
                  </a>
                </div>
              </div>
            )}
          </div>
        </section>}
        </div>
      </div>
    </div>
  );
};

export default VendorProfilePage;
