import { Clock, Users, Camera, Gift, MapPin, Utensils } from 'lucide-react';
import { Section } from '../../types/layoutConfig';

interface FAQGridProps {
  section: Section;
}

export default function FAQGrid({ section }: FAQGridProps) {
  const faqs = [
    {
      icon: Clock,
      question: 'What time should I arrive?',
      answer: 'Please arrive by 3:30 PM for a 4:00 PM ceremony start.',
    },
    {
      icon: Users,
      question: 'Can I bring a guest?',
      answer: 'Please check your invitation for the number of guests invited.',
    },
    {
      icon: Utensils,
      question: 'What about dietary needs?',
      answer: 'Please note any restrictions when you RSVP.',
    },
    {
      icon: MapPin,
      question: 'Where is parking?',
      answer: 'Complimentary valet parking available at venue.',
    },
    {
      icon: Camera,
      question: 'Can I take photos?',
      answer: 'Unplugged ceremony requested. Photos encouraged at reception.',
    },
    {
      icon: Gift,
      question: 'Are gifts expected?',
      answer: 'Your presence is enough. Registry info available if desired.',
    },
  ];

  return (
    <section className="py-24 bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-7xl mx-auto px-4">
        <h2 className="text-5xl font-serif text-center mb-16 text-gray-800">Good to Know</h2>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {faqs.map((faq, index) => {
            const Icon = faq.icon;
            return (
              <div key={index} className="bg-white p-8 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                <Icon className="w-10 h-10 text-rose-500 mb-4" />
                <h3 className="text-xl font-semibold mb-3 text-gray-800">{faq.question}</h3>
                <p className="text-gray-600 leading-relaxed">{faq.answer}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
