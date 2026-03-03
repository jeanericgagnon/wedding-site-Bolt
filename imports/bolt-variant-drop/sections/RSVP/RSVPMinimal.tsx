import { Section } from '../../types/layoutConfig';

interface RSVPMinimalProps {
  section: Section;
}

export default function RSVPMinimal({ section }: RSVPMinimalProps) {
  const deadline = section.bindings?.deadline || 'May 1, 2025';

  return (
    <section className="py-24 bg-white">
      <div className="max-w-2xl mx-auto px-4 text-center">
        <h2 className="text-4xl font-serif mb-8 text-gray-900">Kindly Respond</h2>
        <p className="text-xl text-gray-600 mb-4">
          Please RSVP by {deadline}
        </p>
        <p className="text-lg text-gray-500 mb-12">
          We cannot wait to celebrate with you
        </p>

        <div className="max-w-md mx-auto space-y-4">
          <input
            type="text"
            placeholder="Your Name"
            className="w-full px-6 py-4 border-2 border-gray-200 focus:border-gray-400 outline-none text-lg"
          />
          <input
            type="email"
            placeholder="Email Address"
            className="w-full px-6 py-4 border-2 border-gray-200 focus:border-gray-400 outline-none text-lg"
          />
          <div className="grid grid-cols-2 gap-4 pt-4">
            <button className="py-4 bg-gray-900 text-white font-medium hover:bg-gray-800 transition-colors">
              Accept
            </button>
            <button className="py-4 border-2 border-gray-900 text-gray-900 font-medium hover:bg-gray-50 transition-colors">
              Decline
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
