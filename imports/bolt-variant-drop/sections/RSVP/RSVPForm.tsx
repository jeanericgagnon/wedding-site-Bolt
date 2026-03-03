import { Send, User, Users, Mail } from 'lucide-react';
import { Section } from '../../types/layoutConfig';

interface RSVPFormProps {
  section: Section;
}

export default function RSVPForm({ section }: RSVPFormProps) {
  return (
    <section className="py-24 bg-gradient-to-br from-gray-900 to-gray-800 text-white">
      <div className="max-w-3xl mx-auto px-4">
        <h2 className="text-5xl font-serif text-center mb-6">RSVP</h2>
        <p className="text-center text-xl mb-12 text-gray-300">
          Please let us know if you can join us
        </p>

        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 md:p-12">
          <form className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium mb-2">First Name</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/20 rounded-lg focus:outline-none focus:border-amber-400 text-white placeholder-gray-400"
                    placeholder="John"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Last Name</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/20 rounded-lg focus:outline-none focus:border-amber-400 text-white placeholder-gray-400"
                    placeholder="Doe"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/20 rounded-lg focus:outline-none focus:border-amber-400 text-white placeholder-gray-400"
                  placeholder="john@example.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Number of Guests</label>
              <div className="relative">
                <Users className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <select className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/20 rounded-lg focus:outline-none focus:border-amber-400 text-white">
                  <option value="1">1 Guest</option>
                  <option value="2">2 Guests</option>
                  <option value="3">3 Guests</option>
                  <option value="4">4 Guests</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Will you be attending?</label>
              <div className="grid grid-cols-2 gap-4">
                <button type="button" className="py-4 bg-emerald-600 hover:bg-emerald-700 rounded-lg font-semibold transition-colors">
                  Joyfully Accept
                </button>
                <button type="button" className="py-4 bg-white/10 hover:bg-white/20 rounded-lg font-semibold transition-colors">
                  Regretfully Decline
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Message (Optional)</label>
              <textarea
                rows={4}
                className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg focus:outline-none focus:border-amber-400 text-white placeholder-gray-400 resize-none"
                placeholder="Any dietary restrictions or special requests?"
              />
            </div>

            <button
              type="submit"
              className="w-full py-4 bg-amber-500 hover:bg-amber-600 rounded-lg font-semibold text-lg transition-colors flex items-center justify-center gap-3"
            >
              <Send className="w-5 h-5" />
              Submit RSVP
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
