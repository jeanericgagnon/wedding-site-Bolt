import { Send } from 'lucide-react';
import { Section } from '../../types/layoutConfig';

interface RSVPClassicProps {
  section: Section;
}

export default function RSVPClassic({ section }: RSVPClassicProps) {
  return (
    <section className="py-24 bg-gradient-to-b from-rose-50 to-pink-50">
      <div className="max-w-2xl mx-auto px-4">
        <h2 className="text-5xl font-serif text-center mb-8 text-gray-800">RSVP</h2>
        <p className="text-center text-gray-600 mb-12">
          Please respond by April 1, 2025
        </p>
        <form className="space-y-6 bg-white p-8 rounded-lg shadow-lg">
          <div>
            <label className="block text-gray-700 mb-2 font-medium">Full Name</label>
            <input
              type="text"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-400 focus:border-transparent"
              placeholder="Enter your name"
            />
          </div>
          <div>
            <label className="block text-gray-700 mb-2 font-medium">Email</label>
            <input
              type="email"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-400 focus:border-transparent"
              placeholder="Enter your email"
            />
          </div>
          <div>
            <label className="block text-gray-700 mb-2 font-medium">Will you attend?</label>
            <select className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-400 focus:border-transparent">
              <option>Joyfully accepts</option>
              <option>Regretfully declines</option>
            </select>
          </div>
          <div>
            <label className="block text-gray-700 mb-2 font-medium">Number of Guests</label>
            <input
              type="number"
              min="1"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-400 focus:border-transparent"
              placeholder="1"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-rose-500 text-white py-4 rounded-lg hover:bg-rose-600 transition-colors flex items-center justify-center gap-2 font-medium text-lg"
          >
            <Send className="w-5 h-5" />
            Submit RSVP
          </button>
        </form>
      </div>
    </section>
  );
}
