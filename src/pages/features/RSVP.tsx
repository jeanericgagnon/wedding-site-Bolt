import React from 'react';
import { Link } from 'react-router-dom';
import { Header, Footer } from '../../components/layout';
import { Button } from '../../components/ui';
import { useAuth } from '../../hooks/useAuth';
import { getFeaturePageFooterCtas, getFeaturePageHeroCtas } from './featurePageCtas';
import {
  CheckCircle2,
  Users,
  Calendar,
  Utensils,
  MessageSquare,
  Clock,
  Shield,
  Mail,
  BarChart,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';

export const RSVPFeature: React.FC = () => {
  const { user } = useAuth();
  const heroCtas = getFeaturePageHeroCtas('rsvp', Boolean(user));
  const footerCtas = getFeaturePageFooterCtas('rsvp', Boolean(user));

  return (
    <div className="min-h-screen flex flex-col bg-paper text-ink">
      <Header />

      <section className="py-16 md:py-24 bg-gradient-to-b from-paper to-white">
        <div className="container-custom">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center justify-center p-4 bg-brand/10 rounded-2xl mb-6">
              <CheckCircle2 className="w-12 h-12 text-brand" />
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold text-ink mb-6 leading-tight">
RSVP
            </h1>
            <p className="text-xl md:text-2xl text-ink/70 mb-10 leading-relaxed">
              A calm RSVP flow for households, events, meals, and guest details — built to make replying feel simple for guests and clear for you.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to={heroCtas.primary.to} state={heroCtas.primary.state}>
                <Button variant="accent" size="lg">
                  {heroCtas.primary.label}
                </Button>
              </Link>
              <Link to={heroCtas.secondary.to}>
                <Button variant="outline" size="lg">
                  {heroCtas.secondary.label}
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
Built to keep things clear
            </h2>
            <p className="text-xl text-ink/70 max-w-3xl mx-auto">
              Most RSVP friction comes from confusing flows. Dayof keeps responses clean, clear, and easy to trust.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-paper rounded-2xl p-8">
              <div className="p-3 bg-brand/10 rounded-xl w-fit mb-4">
                <Users className="w-6 h-6 text-brand" />
              </div>
              <h3 className="text-xl font-serif font-bold text-ink mb-3">Household-Aware Flow</h3>
              <p className="text-ink/70 mb-4">
                Keep household replies together so guest responses stay easier to read and manage. DayOf helps structure the household flow without pretending every family edge case is magic.
              </p>
              <ul className="space-y-2 text-sm text-ink/70">
                <li>• Clear household member selection</li>
                <li>• Fewer duplicate-response messes</li>
                <li>• Plus-one acceptance built in</li>
              </ul>
            </div>

            <div className="bg-paper rounded-2xl p-8">
              <div className="p-3 bg-brand/10 rounded-xl w-fit mb-4">
                <Calendar className="w-6 h-6 text-brand" />
              </div>
              <h3 className="text-xl font-serif font-bold text-ink mb-3">Multi-Event RSVP</h3>
              <p className="text-ink/70 mb-4">
                Separate RSVPs for ceremony, reception, rehearsal dinner, or any events you add. Clear access rules keep event details private.
              </p>
              <ul className="space-y-2 text-sm text-ink/70">
                <li>• Per-event responses</li>
                <li>• Different deadlines per event</li>
                <li>• Guest sees only their events</li>
              </ul>
            </div>

            <div className="bg-paper rounded-2xl p-8">
              <div className="p-3 bg-brand/10 rounded-xl w-fit mb-4">
                <Utensils className="w-6 h-6 text-brand" />
              </div>
              <h3 className="text-xl font-serif font-bold text-ink mb-3">Meal Selection</h3>
              <p className="text-ink/70 mb-4">
                Collect meal choices per person with dietary restrictions and allergies. Export to caterer with accurate headcounts.
              </p>
              <ul className="space-y-2 text-sm text-ink/70">
                <li>• Custom meal options</li>
                <li>• Dietary notes per person</li>
                <li>• Allergen updates</li>
              </ul>
            </div>

            <div className="bg-paper rounded-2xl p-8">
              <div className="p-3 bg-brand/10 rounded-xl w-fit mb-4">
                <MessageSquare className="w-6 h-6 text-brand" />
              </div>
              <h3 className="text-xl font-serif font-bold text-ink mb-3">Custom Questions</h3>
              <p className="text-ink/70 mb-4">
                Add your own questions to the RSVP flow. Song requests, transportation needs, or anything you need to know.
              </p>
              <ul className="space-y-2 text-sm text-ink/70">
                <li>• Text, multiple choice, or checkboxes</li>
                <li>• Optional or recommended</li>
                <li>• Per-event or global</li>
              </ul>
            </div>

            <div className="bg-paper rounded-2xl p-8">
              <div className="p-3 bg-brand/10 rounded-xl w-fit mb-4">
                <Clock className="w-6 h-6 text-brand" />
              </div>
              <h3 className="text-xl font-serif font-bold text-ink mb-3">Deadline Handling</h3>
              <p className="text-ink/70 mb-4">
                Set clear RSVP deadlines with guest-facing cutoffs. Reminder support and late override controls are being tightened in phases, so the page does not pretend every admin path is fully hands-off yet.
              </p>
              <ul className="space-y-2 text-sm text-ink/70">
                <li>• Per-event deadlines</li>
                <li>• Timezone aware</li>
                <li>• Late override controls</li>
              </ul>
            </div>

            <div className="bg-paper rounded-2xl p-8">
              <div className="p-3 bg-brand/10 rounded-xl w-fit mb-4">
                <BarChart className="w-6 h-6 text-brand" />
              </div>
              <h3 className="text-xl font-serif font-bold text-ink mb-3">Current RSVP visibility</h3>
              <p className="text-ink/70 mb-4">
                Keep a current read on replies, headcounts, meal choices, and dietary needs so planning decisions stay grounded in the latest saved responses.
              </p>
              <ul className="space-y-2 text-sm text-ink/70">
                <li>• Current headcount by event</li>
                <li>• Response progress visibility</li>
                <li>• Meal choice breakdown</li>
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
                More ways to keep replies clean
              </h2>
            </div>

            <div className="space-y-8">
              <div className="bg-white rounded-2xl p-8 border border-brand/20">
                <div className="flex items-start gap-6">
                  <div className="p-3 bg-brand/10 rounded-xl flex-shrink-0">
                    <Mail className="w-6 h-6 text-brand" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-ink mb-3">Reminder scheduling</h3>
                    <p className="text-ink/70 leading-relaxed">
                      Reminder drafts and scheduling support are the current strength. More automated RSVP reminder behavior is being enabled in phases, so we do not pretend every reminder path is fully hands-off yet.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-8 border border-brand/20">
                <div className="flex items-start gap-6">
                  <div className="p-3 bg-brand/10 rounded-xl flex-shrink-0">
                    <Shield className="w-6 h-6 text-brand" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-ink mb-3">Simple guest access</h3>
                    <p className="text-ink/70 leading-relaxed">
                      Guests access their RSVP with email or a unique link, without forcing them into a full account flow. Response updates stay simple up to the deadline rules you set.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-8 border border-brand/20">
                <div className="flex items-start gap-6">
                  <div className="p-3 bg-brand/10 rounded-xl flex-shrink-0">
                    <Users className="w-6 h-6 text-brand" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-ink mb-3">Fallback-friendly when guests need help</h3>
                    <p className="text-ink/70 leading-relaxed">
                      Some guests will answer by phone, text, or through a parent. DayOf should still let you keep one clean RSVP record without making those guests fight the software.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-8 border border-brand/20">
                <div className="flex items-start gap-6">
                  <div className="p-3 bg-brand/10 rounded-xl flex-shrink-0">
                    <AlertCircle className="w-6 h-6 text-brand" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-ink mb-3">Clear checks along the way</h3>
                    <p className="text-ink/70 leading-relaxed">
                      Clear validation at every step prevents incomplete submissions. Required fields marked clearly. Error messages guide guests to fix issues.
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
              A strong RSVP core, already together
              </h2>
              <p className="text-xl text-ink/70 mb-8">
              A practical RSVP flow that keeps replies cleaner and easier to trust, without pretending every reminder or admin edge path is fully automatic.
              </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12 text-left">
              {[
                'Household-aware flow',
                'Multi-event RSVP',
                'Meal selection',
                'Dietary updates',
                'Custom questions',
                'Deadline enforcement',
                'Reminder support, with fuller automation phased in',
                'Plus-one acceptance',
                'Response editing',
                'Current RSVP visibility',
                'Export-friendly reporting',
                'Mobile-friendly',
              ].map((feature, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-success mt-0.5 flex-shrink-0" />
                  <span className="text-ink/70">{feature}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to={footerCtas.primary.to} state={footerCtas.primary.state}>
                <Button variant="accent" size="lg">
                  {footerCtas.primary.label}
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
              <Link to={footerCtas.secondary.to}>
                <Button variant="outline" size="lg">
                  {footerCtas.secondary.label}
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
