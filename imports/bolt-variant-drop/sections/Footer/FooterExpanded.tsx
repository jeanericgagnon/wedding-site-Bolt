import { Heart, Instagram, Facebook, Mail } from 'lucide-react';
import { Section } from '../../types/layoutConfig';

interface FooterExpandedProps {
  section: Section;
}

export default function FooterExpanded({ section }: FooterExpandedProps) {
  return (
    <footer className="py-16 bg-gradient-to-br from-gray-900 to-black text-white">
      <div className="max-w-6xl mx-auto px-4">
        <div className="grid md:grid-cols-3 gap-12 mb-12">
          <div className="text-center md:text-left">
            <h3 className="text-2xl font-serif mb-4">Stay Connected</h3>
            <p className="text-gray-400 mb-4">Follow our journey</p>
            <div className="flex gap-4 justify-center md:justify-start">
              <a href="#" className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors">
                <Instagram className="w-5 h-5" />
              </a>
              <a href="#" className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors">
                <Facebook className="w-5 h-5" />
              </a>
              <a href="#" className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors">
                <Mail className="w-5 h-5" />
              </a>
            </div>
          </div>

          <div className="text-center">
            <Heart className="w-12 h-12 mx-auto mb-4 text-rose-400" fill="currentColor" />
            <p className="text-xl font-serif mb-2">Thank You</p>
            <p className="text-gray-400">For being part of our special day</p>
          </div>

          <div className="text-center md:text-right">
            <h3 className="text-2xl font-serif mb-4">Questions?</h3>
            <p className="text-gray-400 mb-2">Contact us at:</p>
            <a href="mailto:wedding@example.com" className="text-rose-400 hover:text-rose-300 transition-colors">
              wedding@example.com
            </a>
          </div>
        </div>

        <div className="border-t border-white/10 pt-8 text-center text-gray-500">
          <p>Made with love © 2025</p>
        </div>
      </div>
    </footer>
  );
}
