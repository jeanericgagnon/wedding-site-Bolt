import React from 'react';
import { Link } from 'react-router-dom';
import { Header, Footer } from '../../components/layout';
import { Button } from '../../components/ui';
import {
  Mail,
  MessageSquare,
  Users,
  Send,
  Clock,
  Shield,
  CheckCircle2,
  Filter,
  BarChart,
  Bell,
  ArrowRight,
} from 'lucide-react';

export const MessagingFeature: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-paper text-ink">
      <Header />

      <section className="py-16 md:py-24 bg-gradient-to-b from-paper to-white">
        <div className="container-custom">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center justify-center p-4 bg-brand/10 rounded-2xl mb-6">
              <Mail className="w-12 h-12 text-brand" />
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold text-ink mb-6 leading-tight">
              Messaging
            </h1>
            <p className="text-xl md:text-2xl text-ink/70 mb-10 leading-relaxed">
              Email included, SMS available. Segment guests, schedule sends, and communicate with confidence.
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
              Reach guests the right way
            </h2>
            <p className="text-xl text-ink/70 max-w-3xl mx-auto">
              Email for most updates, SMS for urgent changes. Segment by any criteria and track engagement.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-paper rounded-2xl p-8">
              <div className="p-3 bg-brand/10 rounded-xl w-fit mb-4">
                <Mail className="w-6 h-6 text-brand" />
              </div>
              <h3 className="text-xl font-serif font-bold text-ink mb-3">Email Included</h3>
              <p className="text-ink/70 mb-4">
                Send unlimited emails to your guests. Save the date, RSVP reminders, venue updates, or thank you notes.
              </p>
              <ul className="space-y-2 text-sm text-ink/70">
                <li>• Fair-use limits (no spam)</li>
                <li>• Professional email templates</li>
                <li>• Custom from name and reply-to</li>
              </ul>
            </div>

            <div className="bg-paper rounded-2xl p-8">
              <div className="p-3 bg-brand/10 rounded-xl w-fit mb-4">
                <MessageSquare className="w-6 h-6 text-brand" />
              </div>
              <h3 className="text-xl font-serif font-bold text-ink mb-3">SMS Credits</h3>
              <p className="text-ink/70 mb-4">
                For urgent updates like venue changes or weather alerts, purchase SMS credits. No markup, transparent pricing.
              </p>
              <ul className="space-y-2 text-sm text-ink/70">
                <li>• $0.02 per message</li>
                <li>• Buy only what you need</li>
                <li>• International support</li>
              </ul>
            </div>

            <div className="bg-paper rounded-2xl p-8">
              <div className="p-3 bg-brand/10 rounded-xl w-fit mb-4">
                <Users className="w-6 h-6 text-brand" />
              </div>
              <h3 className="text-xl font-serif font-bold text-ink mb-3">Guest Segmentation</h3>
              <p className="text-ink/70 mb-4">
                Send to specific groups. RSVP status, event permissions, household tags, or custom filters.
              </p>
              <ul className="space-y-2 text-sm text-ink/70">
                <li>• Non-responders only</li>
                <li>• Event-specific guests</li>
                <li>• Custom tag filtering</li>
              </ul>
            </div>

            <div className="bg-paper rounded-2xl p-8">
              <div className="p-3 bg-brand/10 rounded-xl w-fit mb-4">
                <Clock className="w-6 h-6 text-brand" />
              </div>
              <h3 className="text-xl font-serif font-bold text-ink mb-3">Schedule Sends</h3>
              <p className="text-ink/70 mb-4">
                Write messages now, send later. Schedule for optimal timing across timezones.
              </p>
              <ul className="space-y-2 text-sm text-ink/70">
                <li>• Schedule for future date/time</li>
                <li>• Timezone-aware delivery</li>
                <li>• Edit before send</li>
              </ul>
            </div>

            <div className="bg-paper rounded-2xl p-8">
              <div className="p-3 bg-brand/10 rounded-xl w-fit mb-4">
                <BarChart className="w-6 h-6 text-brand" />
              </div>
              <h3 className="text-xl font-serif font-bold text-ink mb-3">Open Tracking</h3>
              <p className="text-ink/70 mb-4">
                See who opened your emails and when. Know if important updates were received.
              </p>
              <ul className="space-y-2 text-sm text-ink/70">
                <li>• Email open rates</li>
                <li>• Click tracking</li>
                <li>• Individual guest history</li>
              </ul>
            </div>

            <div className="bg-paper rounded-2xl p-8">
              <div className="p-3 bg-brand/10 rounded-xl w-fit mb-4">
                <Shield className="w-6 h-6 text-brand" />
              </div>
              <h3 className="text-xl font-serif font-bold text-ink mb-3">Consent Management</h3>
              <p className="text-ink/70 mb-4">
                Respect guest preferences. Built-in opt-out and unsubscribe. Compliance with email best practices.
              </p>
              <ul className="space-y-2 text-sm text-ink/70">
                <li>• One-click unsubscribe</li>
                <li>• Communication preferences</li>
                <li>• CAN-SPAM compliant</li>
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
                Powerful messaging tools
              </h2>
            </div>

            <div className="space-y-8">
              <div className="bg-white rounded-2xl p-8 border border-brand/20">
                <div className="flex items-start gap-6">
                  <div className="p-3 bg-brand/10 rounded-xl flex-shrink-0">
                    <Send className="w-6 h-6 text-brand" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-ink mb-3">Message Templates</h3>
                    <p className="text-ink/70 leading-relaxed">
                      Pre-built templates for common scenarios: save the dates, RSVP reminders, venue updates, thank you notes. Customize or create your own.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-8 border border-brand/20">
                <div className="flex items-start gap-6">
                  <div className="p-3 bg-brand/10 rounded-xl flex-shrink-0">
                    <Filter className="w-6 h-6 text-brand" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-ink mb-3">Advanced Filtering</h3>
                    <p className="text-ink/70 leading-relaxed">
                      Combine multiple filters to reach exactly who you need. RSVP status AND event permissions AND custom tags. Preview recipient count before sending.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-8 border border-brand/20">
                <div className="flex items-start gap-6">
                  <div className="p-3 bg-brand/10 rounded-xl flex-shrink-0">
                    <Bell className="w-6 h-6 text-brand" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-ink mb-3">Automated Reminders</h3>
                    <p className="text-ink/70 leading-relaxed">
                      Set up automatic RSVP reminder emails for guests who haven't responded. Customizable timing and message content.
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
              Everything you need to communicate clearly with your guests.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12 text-left">
              {[
                'Email included',
                'SMS credits available',
                'Guest segmentation',
                'Schedule sends',
                'Open tracking',
                'Click tracking',
                'Message templates',
                'Custom messages',
                'Automated reminders',
                'Opt-out management',
                'CAN-SPAM compliant',
                'International support',
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
