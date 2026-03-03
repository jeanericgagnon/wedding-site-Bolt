import { Heart } from 'lucide-react';
import { Section } from '../../types/layoutConfig';

interface FooterClassicProps {
  section: Section;
}

export default function FooterClassic({ section }: FooterClassicProps) {
  return (
    <footer className="py-12 bg-gray-900 text-white">
      <div className="max-w-4xl mx-auto px-4 text-center">
        <Heart className="w-8 h-8 mx-auto mb-4 text-rose-400" fill="currentColor" />
        <p className="text-gray-400 mb-2">Thank you for celebrating with us</p>
        <p className="text-sm text-gray-500">Made with love</p>
      </div>
    </footer>
  );
}
