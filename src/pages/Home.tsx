import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Header, Footer } from '../components/layout';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../components/ui/Toast';
import {
  Heart,
  Users,
  Mail,
  Calendar,
  CheckCircle2,
  Hotel,
  ChevronDown,
  ArrowRight,
} from 'lucide-react';
import { GridItem, HeroReveal, Reveal, SlideReveal, StaggerGrid } from '../components/marketing/Reveal';

export const Home: React.FC = () => {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const { toast } = useToast();
  const [expandedFaq, setExpandedFaq] = useState<number | null>(0);
  const [demoLoading, setDemoLoading] = useState(false);
  const proposalImageUrl = `${import.meta.env.BASE_URL}7641B308-4D92-48B2-8332-E6AB193A128D_1_105_c.jpeg`;
  const [selectedFeature, setSelectedFeature] = useState('guests');
  const featureRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const carouselRef = useRef<HTMLDivElement | null>(null);
  const autoScrollPauseUntilRef = useRef(0);

  const featurePanels = [
    {
      id: 'guests',
      title: 'Guests + Households',
      icon: Users,
      href: '/features/guests',
      bullets: ['Household grouping', 'Plus-one rules', 'Event access', 'CSV import', 'Duplicate prevention', 'Export for vendors'],
    },
    {
      id: 'rsvp',
      title: 'RSVP Engine',
      icon: CheckCircle2,
      href: '/features/rsvp',
      bullets: ['Multi-event RSVP', 'Household-aware flow', 'Meal selection', 'Dietary updates', 'Deadline handling', 'Live response view'],
    },
    {
      id: 'messaging',
      title: 'Messaging',
      icon: Mail,
      href: '/features/messaging',
      bullets: ['Email blasts included', 'Guest segmentation', 'Schedule sends', 'Delivery status updates', 'Draft + scheduled send flow', 'Ready-to-send templates'],
    },
    {
      id: 'travel',
      title: 'Travel + Itinerary',
      icon: Hotel,
      href: '/features/travel',
      bullets: ['Hotel room blocks', 'Multi-day timeline', 'Venue addresses', 'Add-to-calendar', 'Timezone support', 'Travel FAQs'],
    },
    {
      id: 'registry',
      title: 'Registry',
      icon: Heart,
      href: '/features/registry',
      bullets: ['Link existing registries', 'Link any registry', 'Honeymoon fund', 'Charity donations', 'Simple gift cards and links', 'No sponsored clutter'],
    },
    {
      id: 'seating',
      title: 'Seating',
      icon: Calendar,
      href: '/features/seating',
      bullets: ['Drag-and-drop seating board', 'Table capacity management', 'Auto-assign by RSVP', 'Table assignment workflows', 'Export for caterer', 'Per-event seating'],
    },
  ] as const;

  const handleSignUp = async () => {
    navigate('/templates');
  };

  const handleDemoLogin = async () => {
    if (demoLoading) return;
    setDemoLoading(true);
    try {
      await signIn();
      // Ensure auth context state is committed before protected-route evaluation.
      await new Promise((resolve) => setTimeout(resolve, 0));
      navigate('/dashboard/overview', { replace: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Demo login failed. Please try again.';
      toast(message, 'error');
      setDemoLoading(false);
    }
  };

  const focusFeature = (id: string) => {
    setSelectedFeature(id);
    autoScrollPauseUntilRef.current = Date.now() + 2200;

    const node = carouselRef.current;
    const target = featureRefs.current[id];
    if (!node || !target) return;

    const left = target.offsetLeft - (node.clientWidth - target.clientWidth) / 2;
    node.scrollTo({ left: Math.max(0, left), behavior: 'smooth' });
  };

  const scrollCarouselBy = (dir: 'left' | 'right') => {
    const node = carouselRef.current;
    if (!node) return;
    autoScrollPauseUntilRef.current = Date.now() + 1800;
    const amount = Math.max(280, Math.floor(node.clientWidth * 0.72));
    node.scrollBy({ left: dir === 'left' ? -amount : amount, behavior: 'smooth' });
  };

  useEffect(() => {
    const node = carouselRef.current;
    if (!node) return;

    const speedPx = 1; // perceptible slow drift
    const timer = window.setInterval(() => {
      if (Date.now() < autoScrollPauseUntilRef.current) return;

      const el = carouselRef.current;
      if (!el) return;
      const max = el.scrollWidth - el.clientWidth;
      if (max <= 0) return;

      const next = el.scrollLeft + speedPx;
      el.scrollLeft = next >= max ? 0 : next;
    }, 24);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-paper text-ink">
      <Header />

      {/* HERO */}
      <section id="top" className="py-14 md:py-20 bg-gradient-to-b from-paper to-white">
        <div className="container-custom">
          <div className="max-w-4xl mx-auto text-center">
            <HeroReveal>
              <h1 className="text-[2.4rem] md:text-[4rem] font-serif font-bold text-ink mb-5 leading-[1.04] updates-tight">
                A wedding site that doesn't break when it matters
              </h1>
            </HeroReveal>
            <HeroReveal delay={0.1}>
              <p className="text-[1.0625rem] md:text-[1.1875rem] text-ink/75 mb-8 leading-relaxed max-w-3xl mx-auto">
                One place for your wedding site, RSVPs, guests, messaging, seating, registry, photo sharing, and timeline, built to make planning easier, not push you through a funnel.
              </p>
            </HeroReveal>
            <HeroReveal delay={0.2}>
              <div className="flex flex-col sm:flex-row gap-3 justify-center mb-6">
                <button
                className="px-7 py-3.5 bg-brand text-paper font-semibold rounded-2xl hover:bg-brand/90 transition-all shadow-sm hover:shadow-md active:translate-y-[1px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50 focus-visible:ring-offset-2"
                onClick={handleSignUp}
                aria-label="Sign up for your wedding site"
              >
                Start your site
              </button>
              <Link
                to="/templates"
                className="group inline-flex items-center justify-center gap-2 px-7 py-3.5 border-2 border-brand text-brand font-semibold rounded-2xl hover:bg-brand/5 hover:border-brand transition-all active:translate-y-[1px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50 focus-visible:ring-offset-2"
              >
                Browse templates
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <button
                onClick={handleDemoLogin}
                disabled={demoLoading}
                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 border-2 border-brand text-brand font-semibold rounded-2xl hover:bg-brand/5 hover:border-brand transition-all active:translate-y-[1px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50 focus-visible:ring-offset-2 disabled:opacity-60 disabled:cursor-wait"
              >
                {demoLoading && (
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                )}
                {demoLoading ? 'Opening demo...' : 'Try demo'}
              </button>
              </div>
            </HeroReveal>
            <HeroReveal delay={0.3}>
              <p className="text-[0.8125rem] text-ink/60 updates-wide leading-loose">
                $49 flat fee for 2 years • Auto-renew OFF by default • Private by default
              </p>
            </HeroReveal>
            <HeroReveal delay={0.38}>
              <div className="mt-4 inline-flex flex-wrap justify-center gap-2">
                <span className="text-[11px] px-2.5 py-1 rounded-full border border-brand/20 bg-brand/5 text-brand">Website + RSVP + Registry + Day-of</span>
                <span className="text-[11px] px-2.5 py-1 rounded-full border border-border bg-surface text-ink/80">No forced upsells</span>
                <span className="text-[11px] px-2.5 py-1 rounded-full border border-border bg-surface text-ink/80">Built for guests of all ages</span>
              </div>
            </HeroReveal>
          </div>
        </div>
      </section>

      {/* WHY I BUILT THIS */}
      <section id="why" className="section-shell bg-white">
        <div className="container-custom">
          <Reveal className="max-w-3xl mx-auto">
            <h2 className="section-title mb-10 text-center">
              Why I built this
            </h2>

            <div className="mb-10">
              <img
                src={proposalImageUrl}
                alt="Proposal moment in a park overlooking the city"
                loading="lazy"
                className="w-full rounded-2xl shadow-lg mb-8 object-cover"
              />
              <div className="space-y-5 max-w-2xl mx-auto">
                <p className="text-[1.0625rem] text-ink/80 leading-relaxed">
                  I got engaged this year and tried to make a wedding website like most couples do.
                </p>
                <p className="text-[1.0625rem] text-ink/80 leading-relaxed">
                  What I ran into was constant upsells. Basic features were locked behind confusing tiers, and simple tasks kept turning into checkout screens. It added stress at the exact moment I needed things to feel simple.
                </p>
                <p className="text-[1.0625rem] text-ink/80 leading-relaxed">
                  So I built my own site and spent a lot of time getting it right.
                </p>
                <p className="text-[1.0625rem] text-ink/80 leading-relaxed">
                  Then the QR code I was using stopped working. Guests couldn't access the site, and the only way to turn it back on was to pay $120 for three months.
                </p>
                <p className="text-[1.0625rem] text-ink/80 leading-relaxed">
                  That experience is why this exists. A wedding site should be reliable, straightforward, and honest about pricing. No tricks. No surprise renewals. No stress tax.
                </p>
              </div>
            </div>

            <div className="bg-accent/5 rounded-2xl p-7 border border-accent/20 max-w-2xl mx-auto">
              <h3 className="text-[1.5rem] font-serif font-bold text-ink mb-3 leading-[1.2] updates-tight">Built for trust, not tricks</h3>
              <p className="text-[1.0625rem] text-ink/80 mb-6 leading-relaxed">Wedding sites should not make money by stressing you out.</p>
              <ul className="space-y-3 text-[0.9375rem] text-ink/70">
                <li className="leading-relaxed">No upsells. No paid add ons to "unlock" the basics.</li>
                <li className="leading-relaxed">No rigged registry order. No forced affiliate links.</li>
                <li className="leading-relaxed">No QR codes or links that break unless you keep paying.</li>
                <li className="leading-relaxed">No surprise renewals. Auto renew is off by default.</li>
                <li className="leading-relaxed">No hidden fees. Clear pricing before you pay.</li>
                <li className="leading-relaxed">Privacy first defaults, so your details are not accidentally public.</li>
              </ul>
            </div>
          </Reveal>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="section-shell bg-paper">
        <div className="container-custom">
          <SlideReveal from="left" className="section-intro">
            <h2 className="section-title mb-4">
              Everything you need—nothing you don't
            </h2>
          </SlideReveal>

          <div className="mb-8 sticky top-20 z-10">
            <div className="bg-white/90 backdrop-blur border border-border-subtle rounded-2xl p-2 overflow-x-auto">
              <div className="flex gap-2 min-w-max">
                {featurePanels.map((feature) => (
                  <button
                    key={feature.id}
                    type="button"
                    onClick={() => focusFeature(feature.id)}
                    className={`px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all whitespace-nowrap ${selectedFeature === feature.id
                      ? 'bg-brand text-paper border-brand shadow-sm'
                      : 'bg-white text-ink/80 border-border hover:border-brand/40 hover:bg-brand/5'}`}
                  >
                    {feature.title}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mb-3 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => scrollCarouselBy('left')}
              className="px-3 py-1.5 rounded-lg border border-border bg-white text-ink/80 hover:text-brand hover:border-brand/40"
              aria-label="Scroll features left"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={() => scrollCarouselBy('right')}
              className="px-3 py-1.5 rounded-lg border border-border bg-white text-ink/80 hover:text-brand hover:border-brand/40"
              aria-label="Scroll features right"
            >
              ›
            </button>
          </div>

          <div ref={carouselRef} className="mb-10 overflow-x-auto pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="flex gap-4 min-w-max pr-2">
            {featurePanels.map((feature, idx) => {
              const Icon = feature.icon;
              return (
                <SlideReveal key={feature.id} from={idx % 2 === 0 ? 'left' : 'right'}>
                  <div
                    ref={(el) => {
                      featureRefs.current[feature.id] = el;
                    }}
                    className={`shrink-0 w-[88vw] md:w-[62vw] lg:w-[48vw] rounded-2xl border p-6 md:p-7 transition-all ${selectedFeature === feature.id
                      ? 'bg-white border-brand/35 shadow-lg'
                      : 'bg-white/80 border-border-subtle shadow-sm'}`}
                  >
                    <div className="flex items-start justify-between gap-4 mb-5">
                      <div className="flex items-center gap-3">
                        <div className={`p-3 rounded-xl ${selectedFeature === feature.id ? 'bg-brand/12' : 'bg-brand/8'}`}>
                          <Icon className="w-6 h-6 text-brand" />
                        </div>
                        <h3 className="text-[1.3rem] font-serif font-bold text-ink leading-snug updates-tight">{feature.title}</h3>
                      </div>
                      <button
                        type="button"
                        onClick={() => focusFeature(feature.id)}
                        className="text-xs font-semibold px-3 py-2 rounded-lg border border-border hover:border-brand/50 text-ink/70 hover:text-brand bg-white"
                      >
                        Focus
                      </button>
                    </div>

                    <ul className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-[0.92rem] text-ink/75 leading-relaxed">
                      {feature.bullets.map((bullet) => (
                        <li key={bullet} className="flex items-start gap-2">
                          <span className="text-brand mt-0.5">•</span>
                          <span>{bullet}</span>
                        </li>
                      ))}
                    </ul>

                    <div className="mt-5">
                      <Link
                        to={feature.href}
                        className="group inline-flex items-center gap-2 text-sm font-semibold text-brand hover:text-brand/85"
                      >
                        Explore this feature
                        <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                      </Link>
                    </div>
                  </div>
                </SlideReveal>
              );
            })}
            </div>
          </div>

          <SlideReveal from="right" className="text-center">
            <Link
              to="/product"
              className="group inline-flex items-center justify-center gap-2 px-6 py-3 border-2 border-brand text-brand font-semibold rounded-2xl hover:bg-brand/5 transition-all active:translate-y-[1px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
            >
              See full product tour
              <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </SlideReveal>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="py-14 md:py-16 bg-white">
        <div className="container-custom">
          <div className="text-center mb-9">
            <h2 className="text-[2rem] font-serif font-bold text-ink mb-4 leading-[1.2] updates-tight">
              Simple, honest pricing
            </h2>
            <p className="text-[1.125rem] text-ink/70 leading-relaxed">
              One flat fee. No surprises. Auto-renew OFF by default.
            </p>
          </div>

          <div className="max-w-lg mx-auto mb-14">
            <div className="bg-white border border-brand/25 rounded-2xl p-7 shadow-[0_1px_2px_rgba(15,23,42,0.06)] hover:shadow-[0_8px_24px_rgba(15,23,42,0.08)] transition-shadow duration-200">
              <div className="text-center mb-7">
                <h3 className="text-[1.5rem] font-serif font-bold text-ink mb-6 leading-[1.2] updates-tight">Complete Wedding Platform</h3>
                <div className="mb-5">
                  <div className="flex items-baseline justify-center gap-2">
                    <span className="text-[4.5rem] font-bold text-brand leading-[1] updates-tight">$49</span>
                    <span className="text-[1.125rem] text-ink/60 leading-snug pb-2">/ 2 years</span>
                  </div>
                </div>
                <span className="inline-block px-4 py-2 bg-brand/10 text-brand text-[0.8125rem] font-semibold rounded-full border border-brand/20">
                  Auto-renew: OFF by default
                </span>
              </div>

              <ul className="space-y-3 mb-7">
                {[
                  'Unlimited guests',
                  'Email included (fair-use)',
                  'SMS credits optional',
                  'Multi-event RSVP',
                  'Meal choices + dietary updates',
                  'Guest list management',
                  'Itinerary timeline',
                  'Private by default',
                  'Mobile-friendly for all ages',
                  'Guest export tools',
                ].map((item, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-success mt-0.5 flex-shrink-0" />
                    <span className="text-[0.9375rem] text-ink/75 leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>

              <div className="space-y-3">
                <button
                  className="w-full px-6 py-4 text-[1.0625rem] bg-brand text-paper font-semibold rounded-xl hover:bg-brand/90 transition-all shadow-sm hover:shadow-md active:translate-y-[1px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50 focus-visible:ring-offset-2"
                  onClick={handleSignUp}
                  aria-label="Sign up for your wedding site"
                >
                  Start free
                </button>
                <button
                  onClick={handleDemoLogin}
                  disabled={demoLoading}
                  className="inline-flex items-center justify-center gap-2 w-full px-6 py-3 text-center border-2 border-brand/40 text-brand font-medium rounded-xl hover:bg-brand/5 hover:border-brand transition-all active:translate-y-[1px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50 focus-visible:ring-offset-2 disabled:opacity-60 disabled:cursor-wait"
                >
                  {demoLoading && (
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                  )}
                  {demoLoading ? 'Opening demo...' : 'Try demo'}
                </button>
              </div>

              <div className="mt-5 pt-5 border-t border-border-subtle space-y-2">
                <p className="text-[0.8125rem] text-ink/55 text-center updates-wide leading-loose">
                  Taxes may apply depending on location.
                </p>
                <p className="text-[0.8125rem] text-ink/55 text-center updates-wide leading-loose">
                  After 2 years: site remains readable. You'll get the option to renew.
                </p>
              </div>
            </div>
          </div>

          <div className="max-w-3xl mx-auto mt-1">
            <h3 className="text-[1.5rem] font-serif font-bold text-ink mb-6 text-center leading-[1.2] updates-tight">Frequently asked questions</h3>
            <div className="space-y-3">
              {[
                {
                  q: 'Why is auto-renew off by default?',
                  a: 'We believe in transparency. Most couples only need the site for 2-3 years. We won\'t charge you again unless you explicitly choose to renew.',
                },
                {
                  q: 'What about privacy and search engines?',
                  a: 'Your site is private by default. It won\'t appear in search engines unless you explicitly enable public indexing.',
                },
                {
                  q: 'How do SMS credits work?',
                  a: 'Email is included. For urgent updates (venue changes, weather), you can purchase SMS credits. We charge $0.02/message with no markup.',
                },
                {
                  q: 'Can I use my own domain?',
                  a: 'Yes! Connect any domain you own (like smithwedding.com) or use our free subdomain.',
                },
                {
                  q: 'What if I need a refund?',
                  a: 'Full refund within 30 days, no questions asked. After that, pro-rated refund based on time remaining.',
                },
                {
                  q: 'Can I export my data?',
                  a: 'Yes. Export your guest list, RSVPs, photos, and all data anytime in standard formats (CSV, JSON, ZIP).',
                },
                {
                  q: 'What happens after 2 years?',
                  a: 'Your site stays read-only. You can download everything or renew for another 2 years. We send reminders 60 and 30 days before.',
                },
                {
                  q: 'Do you sell my data or show ads?',
                  a: 'Never. We make money from the $49 flat fee. Your wedding is not our ad platform.',
                },
              ].map((faq, idx) => (
                <div
                  key={idx}
                  className="bg-paper border border-brand/20 rounded-2xl p-5 cursor-pointer hover:border-brand/40 transition-all"
                  onClick={() => setExpandedFaq(expandedFaq === idx ? null : idx)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setExpandedFaq(expandedFaq === idx ? null : idx);
                    }
                  }}
                  aria-expanded={expandedFaq === idx}
                  aria-label={faq.q}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h4 className="text-[1.125rem] font-semibold text-ink mb-2 leading-snug">{faq.q}</h4>
                      {expandedFaq === idx && (
                        <p className="text-base text-ink/70 leading-relaxed">{faq.a}</p>
                      )}
                    </div>
                    <ChevronDown
                      className={`w-5 h-5 text-ink/60 flex-shrink-0 transition-transform ${
                        expandedFaq === idx ? 'rotate-180' : ''
                      }`}
                      aria-hidden="true"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};
