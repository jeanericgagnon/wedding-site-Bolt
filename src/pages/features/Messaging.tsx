import React from 'react';
import { Link } from 'react-router-dom';
import { GUEST_COMMUNICATION_FLOW } from '../../lib/guestCommunicationFlow';
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
              Keep guests in the loop with email and text that feel organized, timely, and easy to send.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/signup">
                <Button variant="accent" size="lg">
                  Start your website
                </Button>
              </Link>
              <Link to="/product">
                <Button variant="outline" size="lg">
                  See how Dayof works
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>


      <section className="py-16 bg-white border-y border-border-subtle">
        <div className="container-custom max-w-6xl">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-ink mb-4">One communication flow, not four disconnected tools</h2>
            <p className="text-lg text-ink/70 max-w-3xl mx-auto">DayOf should help couples move guests through the whole communication arc clearly: early notice, invitation, reminder, and day-of help.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {GUEST_COMMUNICATION_FLOW.map((stage) => (
              <div key={stage.id} className="rounded-2xl border border-border-subtle bg-paper p-5">
                <p className="text-xs uppercase tracking-wide text-brand font-semibold">{stage.label}</p>
                <p className="mt-2 text-sm text-ink/70 leading-relaxed">{stage.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-white">        <div className="container-custom">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-ink mb-6">
              Reach guests clearly
            </h2>
            <p className="text-xl text-ink/70 max-w-3xl mx-auto">
              Email works well for most updates. Text can support urgent changes once sender setup is ready. Either way, the right guests get the right message.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-paper rounded-2xl p-8">
              <div className="p-3 bg-brand/10 rounded-xl w-fit mb-4">
                <Mail className="w-6 h-6 text-brand" />
              </div>
              <h3 className="text-xl font-serif font-bold text-ink mb-3">Email included</h3>
              <p className="text-ink/70 mb-4">
                Send wedding guest emails without bolting on a separate tool. Draft invitations, RSVP reminders, venue updates, and thank-you follow-ups in one place.
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
              <h3 className="text-xl font-serif font-bold text-ink mb-3">Texting, when enabled</h3>
              <p className="text-ink/70 mb-4">
                For urgent updates like venue changes or weather alerts, DayOf can support text once sender setup and delivery readiness are in place. Until then, keep texting plans reviewable instead of pretending the lane is fully live.
              </p>
              <ul className="space-y-2 text-sm text-ink/70">
                <li>• SMS credits handled separately from email</li>
                <li>• Sender setup comes first</li>
                <li>• Use the lane only when live readiness is confirmed</li>
              </ul>
            </div>

            <div className="bg-paper rounded-2xl p-8">
              <div className="p-3 bg-brand/10 rounded-xl w-fit mb-4">
                <Users className="w-6 h-6 text-brand" />
              </div>
              <h3 className="text-xl font-serif font-bold text-ink mb-3">Guest Segmentation</h3>
              <p className="text-ink/70 mb-4">
                Send to specific groups. RSVP status, event access rules, household tags, or custom filters.
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
                See practical delivery signals first, then use them to decide who still needs follow-up. Measured counts matter more than fake certainty.
              </p>
              <ul className="space-y-2 text-sm text-ink/70">
                <li>• Delivery-oriented status view</li>
                <li>• Guest follow-up guidance</li>
                <li>• History tied to actual message state</li>
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
                More control when timing matters
              </h2>
            </div>

            <div className="space-y-8">
              <div className="bg-white rounded-2xl p-8 border border-brand/20">
                <div className="flex items-start gap-6">
                  <div className="p-3 bg-brand/10 rounded-xl flex-shrink-0">
                    <Send className="w-6 h-6 text-brand" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-ink mb-3">Starting points for common messages</h3>
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
                    <h3 className="text-xl font-semibold text-ink mb-3">Flexible recipient filters</h3>
                    <p className="text-ink/70 leading-relaxed">
                      Combine multiple filters to reach exactly who you need. RSVP status AND event access rules AND custom tags. Preview recipient count before sending.
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
              <h3 className="text-xl font-semibold text-ink mb-3">Automatic reminders</h3>
              <p className="text-ink/70 leading-relaxed">
                      Reminder drafting and scheduled follow-up are the current strength. More automated RSVP reminder behavior is being tightened in phases, so we do not pretend every reminder path is fully hands-off yet.
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
              Core wedding messaging, together in one place
              </h2>
              <p className="text-xl text-ink/70 mb-8">
              A strong core messaging flow for wedding updates, without pretending this is a full communications suite.
              </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12 text-left">
              {[
                'Email included',
                'SMS path stays gated until sender setup is ready',
                'Guest segmentation',
                'Schedule sends',
                'Open updates',
                'Click updates',
                'Message templates',
                'Custom messages',
                'Reminder drafting + scheduled follow-up',
                'Opt-out management',
                'CAN-SPAM compliant',
                'Sender setup status stays explicit',
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
                  Start your website
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
              <Link to="/product">
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
