import React, { useState } from 'react';
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

export const Home: React.FC = () => {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const { toast } = useToast();
  const [expandedFaq, setExpandedFaq] = useState<number | null>(0);
  const [demoLoading, setDemoLoading] = useState(false);
  const proposalImageUrl = `${import.meta.env.BASE_URL}7641B308-4D92-48B2-8332-E6AB193A128D_1_105_c.jpeg`;

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

  return (
    <div className="min-h-screen flex flex-col bg-paper text-ink">
      <Header />

      {/* HERO */}
      <section id="top" className="py-20 md:py-32 bg-gradient-to-b from-paper to-white">
        <div className="container-custom">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-[2.5rem] md:text-[4.25rem] font-serif font-bold text-ink mb-6 leading-[1.05] updates-tight">
              A wedding site that doesn't break when it matters
            </h1>
            <p className="text-[1.125rem] md:text-[1.25rem] text-ink/75 mb-10 leading-relaxed max-w-3xl mx-auto">
              One place for your wedding site, RSVPs, guests, messaging, seating, registry, photo sharing, and timeline, built to make planning easier, not push you through a funnel.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
              <button
                className="px-8 py-4 bg-brand text-paper font-semibold rounded-2xl hover:bg-brand/90 transition-all shadow-sm hover:shadow-md active:translate-y-[1px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50 focus-visible:ring-offset-2"
                onClick={handleSignUp}
                aria-label="Sign up for your wedding site"
              >
                Sign up
              </button>
              <button
                onClick={handleDemoLogin}
                disabled={demoLoading}
                className="inline-flex items-center justify-center gap-2 px-8 py-4 border-2 border-brand text-brand font-semibold rounded-2xl hover:bg-brand/5 hover:border-brand transition-all active:translate-y-[1px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50 focus-visible:ring-offset-2 disabled:opacity-60 disabled:cursor-wait"
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
            <p className="text-[0.8125rem] text-ink/60 updates-wide leading-loose">
              $49 flat fee for 2 years • Auto-renew OFF by default • Private by default
            </p>
          </div>
        </div>
      </section>

      {/* WHY I BUILT THIS */}
      <section id="why" className="section-shell bg-white">
        <div className="container-custom">
          <div className="max-w-3xl mx-auto">
            <h2 className="section-title mb-12 text-center">
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

            <div className="bg-accent/5 rounded-2xl p-8 border border-accent/20 max-w-2xl mx-auto">
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
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="section-shell bg-paper">
        <div className="container-custom">
          <div className="section-intro">
            <h2 className="section-title mb-4">
              Everything you need—nothing you don't
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7 mb-10">
            {/* Guests + Households */}
            <Link to="/features/guests" className="card-clean p-6 hover:border-brand/40 hover:shadow-md transition-all h-full">
              <div className="p-3 bg-brand/10 rounded-xl w-fit mb-5">
                <Users className="w-6 h-6 text-brand" />
              </div>
              <h3 className="text-[1.25rem] font-serif font-bold text-ink mb-4 leading-snug updates-tight">Guests + Households</h3>
              <ul className="space-y-2.5 text-[0.875rem] text-ink/70 leading-relaxed">
                <li className="flex items-start gap-2">
                  <span className="text-brand mt-0.5">•</span>
                  <span>Household grouping</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-brand mt-0.5">•</span>
                  <span>Plus-one rules</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-brand mt-0.5">•</span>
                  <span>Event access</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-brand mt-0.5">•</span>
                  <span>CSV import</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-brand mt-0.5">•</span>
                  <span>Duplicate prevention</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-brand mt-0.5">•</span>
                  <span>Export for vendors</span>
                </li>
              </ul>
            </Link>

            {/* RSVP Engine */}
            <Link to="/features/rsvp" className="card-clean p-6 hover:border-brand/40 hover:shadow-md transition-all h-full">
              <div className="p-3 bg-brand/10 rounded-xl w-fit mb-5">
                <CheckCircle2 className="w-6 h-6 text-brand" />
              </div>
              <h3 className="text-[1.25rem] font-serif font-bold text-ink mb-4 leading-snug updates-tight">RSVP Engine</h3>
              <ul className="space-y-2.5 text-[0.875rem] text-ink/70 leading-relaxed">
                <li className="flex items-start gap-2"><span className="text-brand mt-0.5">•</span><span>Multi-event RSVP</span></li>
                <li className="flex items-start gap-2"><span className="text-brand mt-0.5">•</span><span>Household-aware flow</span></li>
                <li className="flex items-start gap-2"><span className="text-brand mt-0.5">•</span><span>Meal selection</span></li>
                <li className="flex items-start gap-2"><span className="text-brand mt-0.5">•</span><span>Dietary updates</span></li>
                <li className="flex items-start gap-2"><span className="text-brand mt-0.5">•</span><span>Deadline handling</span></li>
                <li className="flex items-start gap-2"><span className="text-brand mt-0.5">•</span><span>Real-time analytics</span></li>
              </ul>
            </Link>

            {/* Messaging */}
            <Link to="/features/messaging" className="card-clean p-6 hover:border-brand/40 hover:shadow-md transition-all h-full">
              <div className="p-3 bg-brand/10 rounded-xl w-fit mb-5">
                <Mail className="w-6 h-6 text-brand" />
              </div>
              <h3 className="text-[1.25rem] font-serif font-bold text-ink mb-4 leading-snug updates-tight">Messaging</h3>
              <ul className="space-y-2.5 text-[0.875rem] text-ink/70 leading-relaxed">
                <li className="flex items-start gap-2"><span className="text-brand mt-0.5">•</span><span>Email blasts included</span></li>
                <li className="flex items-start gap-2"><span className="text-brand mt-0.5">•</span><span>Guest segmentation</span></li>
                <li className="flex items-start gap-2"><span className="text-brand mt-0.5">•</span><span>Schedule sends</span></li>
                <li className="flex items-start gap-2"><span className="text-brand mt-0.5">•</span><span>Delivery status updates</span></li>
                <li className="flex items-start gap-2"><span className="text-brand mt-0.5">•</span><span>Draft + scheduled send flow</span></li>
                <li className="flex items-start gap-2"><span className="text-brand mt-0.5">•</span><span>Template facets (style/season/colorway)</span></li>
              </ul>
            </Link>

            {/* Travel + Itinerary */}
            <Link to="/features/travel" className="card-clean p-6 hover:border-brand/40 hover:shadow-md transition-all h-full">
              <div className="p-3 bg-brand/10 rounded-xl w-fit mb-5">
                <Hotel className="w-6 h-6 text-brand" />
              </div>
              <h3 className="text-[1.25rem] font-serif font-bold text-ink mb-4 leading-snug updates-tight">Travel + Itinerary</h3>
              <ul className="space-y-2.5 text-[0.875rem] text-ink/70 leading-relaxed">
                <li className="flex items-start gap-2"><span className="text-brand mt-0.5">•</span><span>Hotel room blocks</span></li>
                <li className="flex items-start gap-2"><span className="text-brand mt-0.5">•</span><span>Multi-day timeline</span></li>
                <li className="flex items-start gap-2"><span className="text-brand mt-0.5">•</span><span>Venue addresses</span></li>
                <li className="flex items-start gap-2"><span className="text-brand mt-0.5">•</span><span>Add-to-calendar</span></li>
                <li className="flex items-start gap-2"><span className="text-brand mt-0.5">•</span><span>Timezone support</span></li>
                <li className="flex items-start gap-2"><span className="text-brand mt-0.5">•</span><span>Travel FAQs</span></li>
              </ul>
            </Link>

            {/* Registry */}
            <Link to="/features/registry" className="card-clean p-6 hover:border-brand/40 hover:shadow-md transition-all h-full">
              <div className="p-3 bg-brand/10 rounded-xl w-fit mb-5">
                <Heart className="w-6 h-6 text-brand" />
              </div>
              <h3 className="text-[1.25rem] font-serif font-bold text-ink mb-4 leading-snug updates-tight">Registry</h3>
              <ul className="space-y-2.5 text-[0.875rem] text-ink/70 leading-relaxed">
                <li className="flex items-start gap-2"><span className="text-brand mt-0.5">•</span><span>Link existing registries</span></li>
                <li className="flex items-start gap-2"><span className="text-brand mt-0.5">•</span><span>BYOAL affiliate option</span></li>
                <li className="flex items-start gap-2"><span className="text-brand mt-0.5">•</span><span>Honeymoon fund</span></li>
                <li className="flex items-start gap-2"><span className="text-brand mt-0.5">•</span><span>Charity donations</span></li>
                <li className="flex items-start gap-2"><span className="text-brand mt-0.5">•</span><span>Auto-fetch details</span></li>
                <li className="flex items-start gap-2"><span className="text-brand mt-0.5">•</span><span>No sponsored clutter</span></li>
              </ul>
            </Link>

            {/* Seating + Check-in */}
            <Link to="/features/seating" className="card-clean p-6 hover:border-brand/40 hover:shadow-md transition-all h-full">
              <div className="p-3 bg-brand/10 rounded-xl w-fit mb-5">
                <Calendar className="w-6 h-6 text-brand" />
              </div>
              <h3 className="text-[1.25rem] font-serif font-bold text-ink mb-4 leading-snug updates-tight">Seating</h3>
              <ul className="space-y-2.5 text-[0.875rem] text-ink/70 leading-relaxed">
                <li className="flex items-start gap-2"><span className="text-brand mt-0.5">•</span><span>Drag-and-drop seating board</span></li>
                <li className="flex items-start gap-2"><span className="text-brand mt-0.5">•</span><span>Table capacity management</span></li>
                <li className="flex items-start gap-2"><span className="text-brand mt-0.5">•</span><span>Auto-assign by RSVP</span></li>
                <li className="flex items-start gap-2"><span className="text-brand mt-0.5">•</span><span>Table assignment workflows</span></li>
                <li className="flex items-start gap-2"><span className="text-brand mt-0.5">•</span><span>Export for caterer</span></li>
                <li className="flex items-start gap-2"><span className="text-brand mt-0.5">•</span><span>Per-event seating</span></li>
              </ul>
            </Link>
          </div>

          <div className="text-center">
            <Link
              to="/product"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 border-2 border-brand text-brand font-semibold rounded-2xl hover:bg-brand/5 transition-all active:translate-y-[1px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
            >
              See full product tour
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="py-20 bg-white">
        <div className="container-custom">
          <div className="text-center mb-12">
            <h2 className="text-[2rem] font-serif font-bold text-ink mb-4 leading-[1.2] updates-tight">
              Simple, honest pricing
            </h2>
            <p className="text-[1.125rem] text-ink/70 leading-relaxed">
              One flat fee. No surprises. Auto-renew OFF by default.
            </p>
          </div>

          <div className="max-w-lg mx-auto mb-16">
            <div className="bg-white border-2 border-brand/30 rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow duration-200">
              <div className="text-center mb-8">
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

              <ul className="space-y-3 mb-8">
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

              <div className="mt-6 pt-6 border-t border-border-subtle space-y-2">
                <p className="text-[0.8125rem] text-ink/55 text-center updates-wide leading-loose">
                  Taxes may apply depending on location.
                </p>
                <p className="text-[0.8125rem] text-ink/55 text-center updates-wide leading-loose">
                  After 2 years: site remains readable. You'll get the option to renew.
                </p>
              </div>
            </div>
          </div>

          <div className="max-w-3xl mx-auto">
            <h3 className="text-[1.5rem] font-serif font-bold text-ink mb-8 text-center leading-[1.2] updates-tight">Frequently asked questions</h3>
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
                  className="bg-paper border border-brand/20 rounded-2xl p-6 cursor-pointer hover:border-brand/40 transition-all"
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
