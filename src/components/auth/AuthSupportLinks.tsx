import React from 'react';
import { Link } from 'react-router-dom';

const SUPPORT_LINKS = [
  { href: '/support', label: 'Support' },
  { href: '/privacy', label: 'Privacy policy' },
  { href: '/terms', label: 'Terms of service' },
  { href: '/refund', label: 'Refund policy' },
] as const;

export const AuthSupportLinks: React.FC = () => (
  <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-xs text-text-tertiary">
    {SUPPORT_LINKS.map((item) => (
      <Link key={item.href} to={item.href} className="hover:text-text-primary transition-colors">
        {item.label}
      </Link>
    ))}
  </div>
);
