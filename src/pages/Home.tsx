import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Header, Footer } from '../components/layout';
import {
  Heart,
  Clock,
  Users,
  Mail,
  Calendar,
  CheckCircle2,
  Shield,
  Utensils,
  MessageSquare,
  Hotel,
  ChevronDown,
  Sparkles,
  ArrowRight,
} from 'lucide-react';

export const Home: React.FC = () => {
  const navigate = useNavigate();
  const [expandedFaq, setExpandedFaq] = useState<number | null>(0);

  const handleSignUp = async () => {
    navigate('/signup');
  };

  return (
    <div className="min-h-screen flex flex-col bg-paper text-ink">
      <Header />

      {/* HERO */}
      <section id="top" className="py-20 md:py-32 bg-gradient-to-b from-paper to-white">
        <div className="container-custom">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-serif font-bold text-ink mb-8 leading-tight">
              A wedding site that doesn't break when it matters
            </h1>
            <p className="text-xl md:text-2xl text-ink/70 mb-10 leading-relaxed">
              RSVP correctness, privacy-first defaults, and simple pricing—built for couples who want confidence, not chaos.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
              <button
                className="px-8 py-4 bg-brand text-paper font-semibold rounded-2xl hover:bg-brand/90 transition-all shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
                onClick={handleSignUp}
                aria-label="Sign up for your wedding site"
              >
                Sign up
              </button>
              <Link
                to="/login"
                className="inline-flex items-center justify-center px-8 py-4 border-2 border-brand text-brand font-semibold rounded-2xl hover:bg-brand/5 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
              >
                Preview demo
              </Link>
            </div>
            <p className="text-sm text-ink/60">
              $39 flat fee for 2 years • Auto-renew OFF by default • Private by default
            </p>
          </div>
        </div>
      </section>

      {/* WHY I BUILT THIS */}
      <section id="why" className="py-20 bg-white">
        <div className="container-custom">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-4xl md:text-5xl font-serif font-bold text-ink mb-8 text-center">
              Why I built this
            </h2>

            <div className="mb-10">
              <img
                src="/7641B308-4D92-48B2-8332-E6AB193A128D_1_105_c.jpeg"
                alt="Proposal moment in a park overlooking the city"
                className="w-full rounded-2xl shadow-lg mb-8"
              />
              <div className="space-y-6">
                <p className="text-lg text-ink/80 leading-relaxed">
                  I got engaged this year and tried to make a wedding website like most couples do.
                </p>
                <p className="text-lg text-ink/80 leading-relaxed">
                  What I ran into was constant upsells. Basic features were locked behind confusing tiers, and simple tasks kept turning into checkout screens. It added stress at the exact moment I needed things to feel simple.
                </p>
                <p className="text-lg text-ink/80 leading-relaxed">
                  So I built my own site and spent a lot of time getting it right.
                </p>
                <p className="text-lg text-ink/80 leading-relaxed">
                  Then the QR code I was using stopped working. Guests couldn't access the site, and the only way to turn it back on was to pay $120 for three months.
                </p>
                <p className="text-lg text-ink/80 leading-relaxed">
                  That experience is why this exists. A wedding site should be reliable, straightforward, and honest about pricing. No tricks. No surprise renewals. No stress tax.
                </p>
              </div>
            </div>

            <div className="bg-accent/5 rounded-2xl p-8 border border-accent/20">
              <h3 className="text-2xl font-serif font-bold text-ink mb-3">Built for trust, not tricks</h3>
              <p className="text-lg text-ink/80 mb-6">Wedding sites should not make money by stressing you out.</p>
              <ul className="space-y-3 text-ink/70">
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
      <section id="features" className="py-20 bg-paper">
        <div className="container-custom">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-serif font-bold text-ink mb-6">
              Everything you need—nothing you don't
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
            {/* Guests + Households */}
            <Link to="/features/guests" className="bg-white rounded-2xl p-8 shadow-sm hover:shadow-md transition-shadow border border-transparent hover:border-brand/20">
              <div className="p-3 bg-brand/10 rounded-xl w-fit mb-4">
                <Users className="w-6 h-6 text-brand" />
              </div>
              <h3 className="text-xl font-serif font-bold text-ink mb-4">Guests + Households</h3>
              <ul className="space-y-2 text-sm text-ink/70">
                <li>• Household grouping</li>
                <li>• Plus-one rules</li>
                <li>• Event permissions</li>
                <li>• CSV import</li>
                <li>• Duplicate prevention</li>
                <li>• Export for vendors</li>
              </ul>
            </Link>

            {/* RSVP Engine */}
            <Link to="/features/rsvp" className="bg-white rounded-2xl p-8 shadow-sm hover:shadow-md transition-shadow border border-transparent hover:border-brand/20">
              <div className="p-3 bg-brand/10 rounded-xl w-fit mb-4">
                <CheckCircle2 className="w-6 h-6 text-brand" />
              </div>
              <h3 className="text-xl font-serif font-bold text-ink mb-4">RSVP Engine</h3>
              <ul className="space-y-2 text-sm text-ink/70">
                <li>• Multi-event RSVP</li>
                <li>• Household-aware flow</li>
                <li>• Meal selection</li>
                <li>• Dietary tracking</li>
                <li>• Deadline handling</li>
                <li>• Real-time analytics</li>
              </ul>
            </Link>

            {/* Messaging */}
            <Link to="/features/messaging" className="bg-white rounded-2xl p-8 shadow-sm hover:shadow-md transition-shadow border border-transparent hover:border-brand/20">
              <div className="p-3 bg-brand/10 rounded-xl w-fit mb-4">
                <Mail className="w-6 h-6 text-brand" />
              </div>
              <h3 className="text-xl font-serif font-bold text-ink mb-4">Messaging</h3>
              <ul className="space-y-2 text-sm text-ink/70">
                <li>• Email included</li>
                <li>• SMS credits optional</li>
                <li>• Guest segmentation</li>
                <li>• Schedule sends</li>
                <li>• Open tracking</li>
                <li>• Consent management</li>
              </ul>
            </Link>

            {/* Travel + Itinerary */}
            <Link to="/features/travel" className="bg-white rounded-2xl p-8 shadow-sm hover:shadow-md transition-shadow border border-transparent hover:border-brand/20">
              <div className="p-3 bg-brand/10 rounded-xl w-fit mb-4">
                <Hotel className="w-6 h-6 text-brand" />
              </div>
              <h3 className="text-xl font-serif font-bold text-ink mb-4">Travel + Itinerary</h3>
              <ul className="space-y-2 text-sm text-ink/70">
                <li>• Hotel room blocks</li>
                <li>• Multi-day timeline</li>
                <li>• Venue addresses</li>
                <li>• Add-to-calendar</li>
                <li>• Timezone support</li>
                <li>• Travel FAQs</li>
              </ul>
            </Link>

            {/* Registry */}
            <Link to="/features/registry" className="bg-white rounded-2xl p-8 shadow-sm hover:shadow-md transition-shadow border border-transparent hover:border-brand/20">
              <div className="p-3 bg-brand/10 rounded-xl w-fit mb-4">
                <Heart className="w-6 h-6 text-brand" />
              </div>
              <h3 className="text-xl font-serif font-bold text-ink mb-4">Registry</h3>
              <ul className="space-y-2 text-sm text-ink/70">
                <li>• Link existing registries</li>
                <li>• BYOAL affiliate option</li>
                <li>• Honeymoon fund</li>
                <li>• Charity donations</li>
                <li>• Auto-fetch details</li>
                <li>• No sponsored clutter</li>
              </ul>
            </Link>

            {/* Seating + Check-in */}
            <Link to="/features/seating" className="bg-white rounded-2xl p-8 shadow-sm hover:shadow-md transition-shadow border border-transparent hover:border-brand/20">
              <div className="p-3 bg-brand/10 rounded-xl w-fit mb-4">
                <Calendar className="w-6 h-6 text-brand" />
              </div>
              <h3 className="text-xl font-serif font-bold text-ink mb-4">Seating + Check-in</h3>
              <ul className="space-y-2 text-sm text-ink/70">
                <li>• Visual seating chart</li>
                <li>• Drag-and-drop assign</li>
                <li>• Print place cards</li>
                <li>• Day-of check-in mode</li>
                <li>• Offline fallback</li>
                <li>• Caterer export</li>
              </ul>
            </Link>
          </div>

          <div className="text-center">
            <Link
              to="/product"
              className="inline-flex items-center justify-center px-6 py-3 border-2 border-brand text-brand font-semibold rounded-2xl hover:bg-brand/5 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
            >
              See full product tour
              <ArrowRight className="w-5 h-5 ml-2" />
            </Link>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="py-20 bg-white">
        <div className="container-custom">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-serif font-bold text-ink mb-6">
              Simple, honest pricing
            </h2>
            <p className="text-xl text-ink/70">
              One flat fee. No surprises. Auto-renew OFF by default.
            </p>
          </div>

          <div className="max-w-lg mx-auto mb-16">
            <div className="bg-paper border-2 border-brand rounded-2xl p-8 shadow-lg">
              <div className="text-center mb-8">
                <h3 className="text-2xl font-serif font-bold text-ink mb-4">Complete Wedding Platform</h3>
                <div className="mb-4">
                  <span className="text-6xl font-bold text-brand">$39</span>
                  <span className="text-xl text-ink/70"> / 2 years</span>
                </div>
                <span className="inline-block px-4 py-2 bg-brand/10 text-brand text-sm font-semibold rounded-full">
                  Auto-renew: OFF by default
                </span>
              </div>

              <ul className="space-y-3 mb-8">
                {[
                  'Unlimited guests',
                  'Email included (fair-use)',
                  'SMS credits optional',
                  'Multi-event RSVP',
                  'Meal choices + dietary tracking',
                  'Guest list management',
                  'Itinerary timeline',
                  'Private by default',
                  'Mobile-friendly for all ages',
                  'Data export anytime',
                ].map((item, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-success mt-0.5 flex-shrink-0" />
                    <span className="text-ink/70">{item}</span>
                  </li>
                ))}
              </ul>

              <div className="space-y-3">
                <button
                  className="w-full px-6 py-4 bg-brand text-paper font-semibold rounded-2xl hover:bg-brand/90 transition-all shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
                  onClick={handleSignUp}
                  aria-label="Sign up for your wedding site"
                >
                  Sign up
                </button>
                <Link
                  to="/login"
                  className="block w-full px-6 py-3 text-center border-2 border-brand text-brand font-medium rounded-2xl hover:bg-brand/5 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
                >
                  Preview demo
                </Link>
              </div>

              <div className="mt-6 pt-6 border-t border-border space-y-2">
                <p className="text-xs text-ink/60 text-center">
                  Taxes may apply depending on location.
                </p>
                <p className="text-xs text-ink/60 text-center">
                  After 2 years: renewal options shown in settings (coming soon).
                </p>
              </div>
            </div>
          </div>

          <div className="max-w-3xl mx-auto">
            <h3 className="text-2xl font-serif font-bold text-ink mb-8 text-center">Frequently asked questions</h3>
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
                  a: 'Never. We make money from the $39 flat fee. Your wedding is not our ad platform.',
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
                      <h4 className="text-lg font-semibold text-ink mb-2">{faq.q}</h4>
                      {expandedFaq === idx && (
                        <p className="text-ink/70 leading-relaxed">{faq.a}</p>
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
