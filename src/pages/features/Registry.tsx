import React from 'react';
import { Link } from 'react-router-dom';
import { Header, Footer } from '../../components/layout';
import { Button } from '../../components/ui';
import {
  Heart,
  ExternalLink,
  DollarSign,
  Gift,
  Link as LinkIcon,
  CheckCircle2,
  Shield,
  Sparkles,
  Wallet,
  ArrowRight,
} from 'lucide-react';

export const RegistryFeature: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-paper text-ink">
      <Header />

      <section className="py-16 md:py-24 bg-gradient-to-b from-paper to-white">
        <div className="container-custom">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center justify-center p-4 bg-brand/10 rounded-2xl mb-6">
              <Heart className="w-12 h-12 text-brand" />
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold text-ink mb-6 leading-tight">
              Registry
            </h1>
            <p className="text-xl md:text-2xl text-ink/70 mb-10 leading-relaxed">
              Link existing registries, add cash funds, or use your own affiliate links. Clean presentation without sponsored clutter.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/signup">
                <Button variant="accent" size="lg">
                  Start free build
                </Button>
              </Link>
              <Link to="/product">
                <Button variant="outline" size="lg">
                  See full product tour
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="container-custom">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-ink mb-6">
              Your registry, your way
            </h2>
            <p className="text-xl text-ink/70 max-w-3xl mx-auto">
              No forced recommendations. No rigged affiliate links. Just clean links to what you actually want.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-paper rounded-2xl p-8">
              <div className="p-3 bg-brand/10 rounded-xl w-fit mb-4">
                <ExternalLink className="w-6 h-6 text-brand" />
              </div>
              <h3 className="text-xl font-serif font-bold text-ink mb-3">Link Any Registry</h3>
              <p className="text-ink/70 mb-4">
                Link to your existing registries at Amazon, Target, Crate & Barrel, or anywhere else. We support all major retailers.
              </p>
              <ul className="space-y-2 text-sm text-ink/70">
                <li>• Any retailer or website</li>
                <li>• Auto-fetch preview images</li>
                <li>• Multiple registries supported</li>
              </ul>
            </div>

            <div className="bg-paper rounded-2xl p-8">
              <div className="p-3 bg-brand/10 rounded-xl w-fit mb-4">
                <LinkIcon className="w-6 h-6 text-brand" />
              </div>
              <h3 className="text-xl font-serif font-bold text-ink mb-3">BYOAL Option</h3>
              <p className="text-ink/70 mb-4">
                Bring Your Own Affiliate Links. Use your own affiliate codes and keep the earnings instead of us taking a cut.
              </p>
              <ul className="space-y-2 text-sm text-ink/70">
                <li>• Use your Amazon Associates</li>
                <li>• Any affiliate program</li>
                <li>• You keep 100% of earnings</li>
              </ul>
            </div>

            <div className="bg-paper rounded-2xl p-8">
              <div className="p-3 bg-brand/10 rounded-xl w-fit mb-4">
                <Wallet className="w-6 h-6 text-brand" />
              </div>
              <h3 className="text-xl font-serif font-bold text-ink mb-3">Honeymoon Fund</h3>
              <p className="text-ink/70 mb-4">
                Create a cash fund for your honeymoon, home down payment, or charity donations. Custom messaging and goals.
              </p>
              <ul className="space-y-2 text-sm text-ink/70">
                <li>• Custom fund descriptions</li>
                <li>• Link to Venmo, PayPal, Zelle</li>
                <li>• Goal amounts optional</li>
              </ul>
            </div>

            <div className="bg-paper rounded-2xl p-8">
              <div className="p-3 bg-brand/10 rounded-xl w-fit mb-4">
                <Gift className="w-6 h-6 text-brand" />
              </div>
              <h3 className="text-xl font-serif font-bold text-ink mb-3">Charity Donations</h3>
              <p className="text-ink/70 mb-4">
                Request donations to charities instead of gifts. Link directly to charity donation pages with custom messaging.
              </p>
              <ul className="space-y-2 text-sm text-ink/70">
                <li>• Multiple charity options</li>
                <li>• Direct links to donate</li>
                <li>• Explain your choices</li>
              </ul>
            </div>

            <div className="bg-paper rounded-2xl p-8">
              <div className="p-3 bg-brand/10 rounded-xl w-fit mb-4">
                <Sparkles className="w-6 h-6 text-brand" />
              </div>
              <h3 className="text-xl font-serif font-bold text-ink mb-3">Auto-Fetch Details</h3>
              <p className="text-ink/70 mb-4">
                Paste a registry URL and we fetch the title, description, and preview image automatically. Quick setup.
              </p>
              <ul className="space-y-2 text-sm text-ink/70">
                <li>• Automatic metadata extraction</li>
                <li>• Preview images</li>
                <li>• Manual override available</li>
              </ul>
            </div>

            <div className="bg-paper rounded-2xl p-8">
              <div className="p-3 bg-brand/10 rounded-xl w-fit mb-4">
                <Shield className="w-6 h-6 text-brand" />
              </div>
              <h3 className="text-xl font-serif font-bold text-ink mb-3">No Sponsored Clutter</h3>
              <p className="text-ink/70 mb-4">
                We never inject sponsored products or recommended items. Only show what you explicitly add.
              </p>
              <ul className="space-y-2 text-sm text-ink/70">
                <li>• Zero ads or promotions</li>
                <li>• No algorithmic recommendations</li>
                <li>• Clean, focused presentation</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-paper">
        <div className="container-custom">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-serif font-bold text-ink mb-6">
                Complete control
              </h2>
            </div>

            <div className="space-y-8">
              <div className="bg-white rounded-2xl p-8 border border-brand/20">
                <div className="flex items-start gap-6">
                  <div className="p-3 bg-brand/10 rounded-xl flex-shrink-0">
                    <DollarSign className="w-6 h-6 text-brand" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-ink mb-3">No Rigged Order or Hidden Costs</h3>
                    <p className="text-ink/70 leading-relaxed">
                      Your registries display in the order you choose. No paid promotion, no algorithmic reordering, no hidden costs passed to your guests.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-8 border border-brand/20">
                <div className="flex items-start gap-6">
                  <div className="p-3 bg-brand/10 rounded-xl flex-shrink-0">
                    <LinkIcon className="w-6 h-6 text-brand" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-ink mb-3">Link Maintenance</h3>
                    <p className="text-ink/70 leading-relaxed">
                      We regularly check your registry links and notify you if any break. No surprise dead links when guests try to shop.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-8 border border-brand/20">
                <div className="flex items-start gap-6">
                  <div className="p-3 bg-brand/10 rounded-xl flex-shrink-0">
                    <Gift className="w-6 h-6 text-brand" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-ink mb-3">Custom Messaging</h3>
                    <p className="text-ink/70 leading-relaxed">
                      Add personal notes above your registry section. Explain your preferences, request contributions to specific funds, or simply say thank you.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="container-custom">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-ink mb-6">
              Every feature included
            </h2>
            <p className="text-xl text-ink/70 mb-8">
              Everything you need to manage your registry without tricks or upsells.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12 text-left">
              {[
                'Link any registry',
                'Auto-fetch details',
                'Multiple registries',
                'Cash funds',
                'Honeymoon fund',
                'Charity donations',
                'BYOAL affiliate option',
                'Custom messaging',
                'Link maintenance',
                'No sponsored items',
                'No rigged order',
                'Clean presentation',
              ].map((feature, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-success mt-0.5 flex-shrink-0" />
                  <span className="text-ink/70">{feature}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/signup">
                <Button variant="accent" size="lg">
                  Start free build
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
              <Link to="/product">
                <Button variant="outline" size="lg">
                  See all features
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};
