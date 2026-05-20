import React from 'react';
import { Link } from 'react-router-dom';
import { Header, Footer } from '../../components/layout';
import { Button } from '../../components/ui';
import {
  Users,
  UserPlus,
  Lock,
  AlertTriangle,
  Upload,
  Download,
  CheckCircle2,
  FileText,
  Search,
  Tags,
  ArrowRight,
} from 'lucide-react';

export const GuestsFeature: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-paper text-ink">
      <Header />

      <section className="py-16 md:py-24 bg-gradient-to-b from-paper to-white">
        <div className="container-custom">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center justify-center p-4 bg-brand/10 rounded-xl mb-6">
              <Users className="w-12 h-12 text-brand" />
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold text-ink mb-6 leading-tight">
              Guests + Households
            </h1>
            <p className="text-xl md:text-2xl text-ink/70 mb-10 leading-relaxed">
              Keep your guest list clear from the start, with households, plus-ones, event access, and imports that make sense.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/signup">
                <Button variant="accent" size="lg">
                  Start your website
                </Button>
              </Link>
              <Link to="/product">
                <Button variant="outline" size="lg">
                  See how dayof works
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
              Built for real guest-list complexity
            </h2>
            <p className="text-xl text-ink/70 max-w-3xl mx-auto">
              Guest lists get complicated fast. dayof keeps the structure clean without making you fight the system.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-paper rounded-xl p-8">
              <div className="p-3 bg-brand/10 rounded-xl w-fit mb-4">
                <Users className="w-6 h-6 text-brand" />
              </div>
              <h3 className="text-xl font-serif font-bold text-ink mb-3">Household Grouping</h3>
              <p className="text-ink/70 mb-4">
                Keep guests organized by household so RSVPs and follow-up stay cleaner. dayof supports household structure without pretending every family edge case resolves itself automatically.
              </p>
              <ul className="space-y-2 text-sm text-ink/70">
                <li>• Clear household grouping</li>
                <li>• Manual merge and split controls</li>
                <li>• Household-level invitations</li>
              </ul>
            </div>

            <div className="bg-paper rounded-xl p-8">
              <div className="p-3 bg-brand/10 rounded-xl w-fit mb-4">
                <UserPlus className="w-6 h-6 text-brand" />
              </div>
              <h3 className="text-xl font-serif font-bold text-ink mb-3">Plus-One Rules</h3>
              <p className="text-ink/70 mb-4">
                Control exactly who can bring a guest. Named plus-ones, unnamed dates, or no plus-one at all.
              </p>
              <ul className="space-y-2 text-sm text-ink/70">
                <li>• Named plus-ones (specific person)</li>
                <li>• Unnamed plus-ones (bring a date)</li>
                <li>• Clear rules prevent confusion</li>
              </ul>
            </div>

            <div className="bg-paper rounded-xl p-8">
              <div className="p-3 bg-brand/10 rounded-xl w-fit mb-4">
                <Lock className="w-6 h-6 text-brand" />
              </div>
              <h3 className="text-xl font-serif font-bold text-ink mb-3">Event Permissions</h3>
              <p className="text-ink/70 mb-4">
                Invite different guests to different events. Ceremony only, reception only, or full weekend access.
              </p>
              <ul className="space-y-2 text-sm text-ink/70">
                <li>• Per-event guest access rules</li>
                <li>• Clearer event-specific visibility</li>
                <li>• Clear visibility controls</li>
              </ul>
            </div>

            <div className="bg-paper rounded-xl p-8">
              <div className="p-3 bg-brand/10 rounded-xl w-fit mb-4">
                <AlertTriangle className="w-6 h-6 text-brand" />
              </div>
              <h3 className="text-xl font-serif font-bold text-ink mb-3">Duplicate Prevention</h3>
              <p className="text-ink/70 mb-4">
                dayof helps surface likely duplicates and risky overlaps before they create confusion. Human review still matters for the unusual cases.
              </p>
              <ul className="space-y-2 text-sm text-ink/70">
                <li>• Name similarity detection</li>
                <li>• Email and phone matching</li>
                <li>• You choose what to merge</li>
              </ul>
            </div>

            <div className="bg-paper rounded-xl p-8">
              <div className="p-3 bg-brand/10 rounded-xl w-fit mb-4">
                <Upload className="w-6 h-6 text-brand" />
              </div>
              <h3 className="text-xl font-serif font-bold text-ink mb-3">CSV Import</h3>
              <p className="text-ink/70 mb-4">
                Import your guest list from Excel or Google Sheets. Intelligent column mapping handles any format.
              </p>
              <ul className="space-y-2 text-sm text-ink/70">
                <li>• Auto-detect column mappings</li>
                <li>• Preview before import</li>
                <li>• Clear checks and helpful prompts</li>
              </ul>
            </div>

            <div className="bg-paper rounded-xl p-8">
              <div className="p-3 bg-brand/10 rounded-xl w-fit mb-4">
                <Download className="w-6 h-6 text-brand" />
              </div>
              <h3 className="text-xl font-serif font-bold text-ink mb-3">Export for Vendors</h3>
              <p className="text-ink/70 mb-4">
                Export guest data cleanly for caterers, venues, or your own review without rebuilding the list from scratch.
              </p>
              <ul className="space-y-2 text-sm text-ink/70">
                <li>• Clean CSV export</li>
                <li>• Filtered by RSVP status or event</li>
                <li>• Include meal preferences</li>
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
                Extra control when you need it
              </h2>
            </div>

            <div className="space-y-8">
              <div className="bg-white rounded-xl p-8 border border-brand/20">
                <div className="flex items-start gap-6">
                  <div className="p-3 bg-brand/10 rounded-xl flex-shrink-0">
                    <Search className="w-6 h-6 text-brand" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-ink mb-3">Search and filtering</h3>
                    <p className="text-ink/70 leading-relaxed">
                      Search guests quickly, filter by RSVP status or event structure, and narrow the list enough to make real planning decisions without spreadsheet thrash.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl p-8 border border-brand/20">
                <div className="flex items-start gap-6">
                  <div className="p-3 bg-brand/10 rounded-xl flex-shrink-0">
                    <Tags className="w-6 h-6 text-brand" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-ink mb-3">Custom tags and notes</h3>
                    <p className="text-ink/70 leading-relaxed">
                      Add custom tags for your own organization. VIP, wedding party, family, or any categories you need. Private notes visible only to you.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl p-8 border border-brand/20">
                <div className="flex items-start gap-6">
                  <div className="p-3 bg-brand/10 rounded-xl flex-shrink-0">
                    <FileText className="w-6 h-6 text-brand" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-ink mb-3">Dietary notes that stay organized</h3>
                    <p className="text-ink/70 leading-relaxed">
                      Track dietary needs and allergies for every guest. Export directly to your caterer with meal counts and special requirements clearly organized.
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
              A strong guest-management core, already together
              </h2>
              <p className="text-xl text-ink/70 mb-8">
              A practical guest flow from first draft to final count, without pretending every edge case is fully automatic.
              </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12 text-left">
              {[
                'Guest list built for real weddings',
                'Household grouping',
                'Plus-one management',
                'Event access',
                'Duplicate prevention',
                'CSV import + export',
                'Advanced search',
                'Custom tags',
                'Private notes',
                'Dietary updates',
                'RSVP status filtering',
                'Clear follow-up visibility',
              ].map((feature, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-brand mt-0.5 flex-shrink-0" />
                  <span className="text-ink/70">{feature}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/signup">
                <Button variant="accent" size="lg">
                  Start your website
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
              <Link to="/features">
                <Button variant="outline" size="lg">
                  Explore more features
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
