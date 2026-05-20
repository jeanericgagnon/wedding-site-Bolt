import React from 'react';
import { Link } from 'react-router-dom';
import { Header, Footer } from '../../components/layout';
import { Button } from '../../components/ui';
import {
  Calendar,
  Users,
  ClipboardCheck,
  Download,
  QrCode,
  Shield,
  CheckCircle2,
  Printer,
  Utensils,
  MousePointer,
  ArrowRight,
} from 'lucide-react';

export const SeatingFeature: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-paper text-ink">
      <Header />

      <section className="py-16 md:py-24 bg-gradient-to-b from-paper to-white">
        <div className="container-custom">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center justify-center p-4 bg-brand/10 rounded-xl mb-6">
              <Calendar className="w-12 h-12 text-brand" />
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold text-ink mb-6 leading-tight">
              Seating + Check-in
            </h1>
            <p className="text-xl md:text-2xl text-ink/70 mb-10 leading-relaxed">
              Plan tables, assign guests, and handle arrivals in one calm wedding-week view.
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
              From table planning to guest arrivals
            </h2>
            <p className="text-xl text-ink/70 max-w-3xl mx-auto">
              Plan the room, print what you need, and stay organized when guests start arriving.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-paper rounded-xl p-8">
              <div className="p-3 bg-brand/10 rounded-xl w-fit mb-4">
                <MousePointer className="w-6 h-6 text-brand" />
              </div>
              <h3 className="text-xl font-serif font-bold text-ink mb-3">Visual Seating Chart</h3>
              <p className="text-ink/70 mb-4">
                Create a visual floor plan with tables. See your entire reception layout at a glance.
              </p>
              <ul className="space-y-2 text-sm text-ink/70">
                <li>• Drag-and-drop table placement</li>
                <li>• Custom table shapes and sizes</li>
                <li>• Save multiple layouts</li>
              </ul>
            </div>

            <div className="bg-paper rounded-xl p-8">
              <div className="p-3 bg-brand/10 rounded-xl w-fit mb-4">
                <Users className="w-6 h-6 text-brand" />
              </div>
              <h3 className="text-xl font-serif font-bold text-ink mb-3">Drag-and-Drop Assign</h3>
              <p className="text-ink/70 mb-4">
                Assign guests to tables by dragging names and keep table counts visible while you work through the room.
              </p>
              <ul className="space-y-2 text-sm text-ink/70">
                <li>• Drag guests to tables</li>
                <li>• Capacity tracking while planning</li>
                <li>• Color-coded by status</li>
              </ul>
            </div>

            <div className="bg-paper rounded-xl p-8">
              <div className="p-3 bg-brand/10 rounded-xl w-fit mb-4">
                <Printer className="w-6 h-6 text-brand" />
              </div>
              <h3 className="text-xl font-serif font-bold text-ink mb-3">Print Place Cards</h3>
              <p className="text-ink/70 mb-4">
                Create printable place cards with guest names and table numbers. Multiple templates available.
              </p>
              <ul className="space-y-2 text-sm text-ink/70">
                <li>• PDF generation</li>
                <li>• Multiple card templates</li>
                <li>• Standard paper sizes</li>
              </ul>
            </div>

            <div className="bg-paper rounded-xl p-8">
              <div className="p-3 bg-brand/10 rounded-xl w-fit mb-4">
                <ClipboardCheck className="w-6 h-6 text-brand" />
              </div>
              <h3 className="text-xl font-serif font-bold text-ink mb-3">Day-of Check-in</h3>
              <p className="text-ink/70 mb-4">
                Use seating and lookup surfaces to support arrivals on wedding day, with a practical check-in flow instead of extra paper lists.
              </p>
              <ul className="space-y-2 text-sm text-ink/70">
                <li>• Quick check-in interface</li>
                <li>• Search by name</li>
                <li>• Arrival timestamps</li>
              </ul>
            </div>

            <div className="bg-paper rounded-xl p-8">
              <div className="p-3 bg-brand/10 rounded-xl w-fit mb-4">
                <Shield className="w-6 h-6 text-brand" />
              </div>
              <h3 className="text-xl font-serif font-bold text-ink mb-3">RSVP Drift Detection</h3>
              <p className="text-ink/70 mb-4">
                If a guest updates their RSVP after seating is assigned, dayof highlights the impacted seat so you can adjust quickly.
              </p>
              <ul className="space-y-2 text-sm text-ink/70">
                <li>• Highlights invalidated seats</li>
                <li>• Reassign in one click</li>
                <li>• Clearer visibility on late changes</li>
              </ul>
            </div>

            <div className="bg-paper rounded-xl p-8">
              <div className="p-3 bg-brand/10 rounded-xl w-fit mb-4">
                <Download className="w-6 h-6 text-brand" />
              </div>
              <h3 className="text-xl font-serif font-bold text-ink mb-3">Caterer Export</h3>
              <p className="text-ink/70 mb-4">
                Export seating and meal data cleanly so your caterer or venue team has something usable without extra cleanup.
              </p>
              <ul className="space-y-2 text-sm text-ink/70">
                <li>• Seating CSV export</li>
                <li>• Place cards CSV export</li>
                <li>• Includes meal preferences</li>
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
                Helpful seating tools behind the scenes
              </h2>
            </div>

            <div className="space-y-8">
              <div className="bg-white rounded-xl p-8 border border-brand/20">
                <div className="flex items-start gap-6">
                  <div className="p-3 bg-brand/10 rounded-xl flex-shrink-0">
                    <Utensils className="w-6 h-6 text-brand" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-ink mb-3">Meal choices, right where you need them</h3>
                    <p className="text-ink/70 leading-relaxed">
                      See meal choices displayed with each guest on your seating chart. Export seating with meal counts organized by table for your caterer.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl p-8 border border-brand/20">
                <div className="flex items-start gap-6">
                  <div className="p-3 bg-brand/10 rounded-xl flex-shrink-0">
                    <Users className="w-6 h-6 text-brand" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-ink mb-3">Smarter assignments</h3>
                    <p className="text-ink/70 leading-relaxed">
                      Assign entire households to tables at once. See warnings if you split a household or exceed table capacity.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl p-8 border border-brand/20">
                <div className="flex items-start gap-6">
                  <div className="p-3 bg-brand/10 rounded-xl flex-shrink-0">
                    <QrCode className="w-6 h-6 text-brand" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-ink mb-3">Auto-fill from confirmed guests</h3>
                    <p className="text-ink/70 leading-relaxed">
                      Start from confirmed guests with an auto-assignment pass, then adjust seats where household, social, or venue realities need a human call.
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
              A practical seating core, already together
              </h2>
              <p className="text-xl text-ink/70 mb-8">
              Strong seating tools for assignments, lookup, and day-of support, without pretending every live event wrinkle is fully solved.
              </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12 text-left">
              {[
                'Drag-and-drop seating board',
                'Per-event seating',
                'Table capacity updates',
                'Auto-assign starting point',
                'Household-aware grouping',
                'RSVP drift detection',
                'Seating CSV export',
                'Place cards CSV export',
                'Meal preference display',
                'Reset with confirmation',
                'Unassigned guest pool',
                'Arrival support tools',
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
