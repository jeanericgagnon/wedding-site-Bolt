import React from 'react';
import { Link } from 'react-router-dom';
import { Header, Footer } from '../../components/layout';
import { Button } from '../../components/ui';
import {
  Hotel,
  Calendar,
  MapPin,
  Plane,
  Clock,
  Download,
  Globe,
  CheckCircle2,
  Info,
  Navigation,
  ArrowRight,
} from 'lucide-react';

export const TravelFeature: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-paper text-ink">
      <Header />

      <section className="py-16 md:py-24 bg-gradient-to-b from-paper to-white">
        <div className="container-custom">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center justify-center p-4 bg-brand/10 rounded-2xl mb-6">
              <Hotel className="w-12 h-12 text-brand" />
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold text-ink mb-6 leading-tight">
              Travel + Itinerary
            </h1>
            <p className="text-xl md:text-2xl text-ink/70 mb-10 leading-relaxed">
              Travel details, weekend schedule, and guest guidance in one place so fewer people text you the same questions.
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

      <section className="py-20 bg-white">
        <div className="container-custom">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-ink mb-6">
              Help guests arrive prepared
            </h2>
            <p className="text-xl text-ink/70 max-w-3xl mx-auto">
              Put the timing, directions, stay details, and local guidance in one clear place.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-paper rounded-2xl p-8">
              <div className="p-3 bg-brand/10 rounded-xl w-fit mb-4">
                <Hotel className="w-6 h-6 text-brand" />
              </div>
              <h3 className="text-xl font-serif font-bold text-ink mb-3">Hotel Room Blocks</h3>
              <p className="text-ink/70 mb-4">
                List hotel stays, room block notes, and booking links in one place. Share the details you have without pretending the page is a booking engine.
              </p>
              <ul className="space-y-2 text-sm text-ink/70">
                <li>• Multiple hotel options</li>
                <li>• Booking notes and links</li>
                <li>• Cutoff dates when you have them</li>
              </ul>
            </div>

            <div className="bg-paper rounded-2xl p-8">
              <div className="p-3 bg-brand/10 rounded-xl w-fit mb-4">
                <Calendar className="w-6 h-6 text-brand" />
              </div>
              <h3 className="text-xl font-serif font-bold text-ink mb-3">Multi-Day Timeline</h3>
              <p className="text-ink/70 mb-4">
                Create a detailed itinerary for multi-day weddings. Welcome dinner, ceremony, reception, brunch, and more.
              </p>
              <ul className="space-y-2 text-sm text-ink/70">
                <li>• Multi-day event scheduling</li>
                <li>• Clear start and end times</li>
                <li>• Event-specific details</li>
              </ul>
            </div>

            <div className="bg-paper rounded-2xl p-8">
              <div className="p-3 bg-brand/10 rounded-xl w-fit mb-4">
                <MapPin className="w-6 h-6 text-brand" />
              </div>
              <h3 className="text-xl font-serif font-bold text-ink mb-3">Venue Addresses</h3>
              <p className="text-ink/70 mb-4">
                Full venue addresses with clear map handoff links and arrival notes. Guests get the basics they need to open directions in the map app they already use.
              </p>
              <ul className="space-y-2 text-sm text-ink/70">
                <li>• Address and map links</li>
                <li>• Open in your map app</li>
                <li>• Parking and entrance notes</li>
              </ul>
            </div>

            <div className="bg-paper rounded-2xl p-8">
              <div className="p-3 bg-brand/10 rounded-xl w-fit mb-4">
                <Download className="w-6 h-6 text-brand" />
              </div>
              <h3 className="text-xl font-serif font-bold text-ink mb-3">Add to Calendar</h3>
              <p className="text-ink/70 mb-4">
                Offer calendar downloads for key events with the time, address, and notes guests need. Compatibility can vary by device and calendar app, so we keep the promise on the file itself.
              </p>
              <ul className="space-y-2 text-sm text-ink/70">
                <li>• Calendar file downloads</li>
                <li>• Standard calendar import format</li>
                <li>• Includes address and notes</li>
              </ul>
            </div>

            <div className="bg-paper rounded-2xl p-8">
              <div className="p-3 bg-brand/10 rounded-xl w-fit mb-4">
                <Globe className="w-6 h-6 text-brand" />
              </div>
              <h3 className="text-xl font-serif font-bold text-ink mb-3">Timezone Support</h3>
              <p className="text-ink/70 mb-4">
                Show clear timezone labels so destination and cross-country guests can double-check timing without guesswork. We do not pretend every guest view auto-converts itself perfectly.
              </p>
              <ul className="space-y-2 text-sm text-ink/70">
                <li>• Clear timezone labels</li>
                <li>• Published event times stay visible</li>
                <li>• Destination-weekend clarity</li>
              </ul>
            </div>

            <div className="bg-paper rounded-2xl p-8">
              <div className="p-3 bg-brand/10 rounded-xl w-fit mb-4">
                <Info className="w-6 h-6 text-brand" />
              </div>
              <h3 className="text-xl font-serif font-bold text-ink mb-3">Travel FAQs</h3>
              <p className="text-ink/70 mb-4">
                Answer common questions about airports, transportation, dress code, weather, and other local guidance guests may need before they travel.
              </p>
              <ul className="space-y-2 text-sm text-ink/70">
                <li>• Custom FAQ sections</li>
                <li>• Collapsible questions</li>
                <li>• Rich text formatting</li>
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
                Stronger travel details for guests
              </h2>
            </div>

            <div className="space-y-8">
              <div className="bg-white rounded-2xl p-8 border border-brand/20">
                <div className="flex items-start gap-6">
                  <div className="p-3 bg-brand/10 rounded-xl flex-shrink-0">
                    <Plane className="w-6 h-6 text-brand" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-ink mb-3">Airport and transportation notes</h3>
                    <p className="text-ink/70 leading-relaxed">
                      List nearby airports with distance and travel time. Add shuttle services, rental car info, or ride-share recommendations.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-8 border border-brand/20">
                <div className="flex items-start gap-6">
                  <div className="p-3 bg-brand/10 rounded-xl flex-shrink-0">
                    <Clock className="w-6 h-6 text-brand" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-ink mb-3">Timing details guests actually need</h3>
                    <p className="text-ink/70 leading-relaxed">
                      Specify doors open, ceremony start, cocktail hour, dinner service. Clear timing helps guests plan their day.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-8 border border-brand/20">
                <div className="flex items-start gap-6">
                  <div className="p-3 bg-brand/10 rounded-xl flex-shrink-0">
                    <Navigation className="w-6 h-6 text-brand" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-ink mb-3">Local Recommendations</h3>
                    <p className="text-ink/70 leading-relaxed">
                      Share favorite restaurants, neighborhood notes, or a short list of things to do in the area when that helps guests plan the weekend.
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
              A practical travel + itinerary core, already together
              </h2>
              <p className="text-xl text-ink/70 mb-8">
              A clean travel and timing layer that helps guests orient themselves without overselling beyond the wedding-core product.
              </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12 text-left">
              {[
                'Hotel room blocks',
                'Multi-day itinerary',
                'Venue addresses',
                'Map handoff links',
                'Calendar downloads',
                'Clear timezone labels',
                'Airport info',
                'Transportation details',
                'Travel FAQs',
                'Local guidance',
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
