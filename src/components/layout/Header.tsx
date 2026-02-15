import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Heart, Menu, X } from 'lucide-react';
import { Button } from '../ui';

interface HeaderProps {
  variant?: 'marketing' | 'dashboard';
}

export const Header: React.FC<HeaderProps> = ({ variant = 'marketing' }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<string>('top');
  const [isScrolled, setIsScrolled] = useState(false);

  const isHomePage = location.pathname === '/';

  const handleSignUp = () => {
    navigate('/signup');
  };

  const handleLogin = () => {
    navigate('/login');
  };

  const handleViewDemo = () => {
    navigate('/product');
  };

  const scrollToSection = (sectionId: string) => {
    if (!isHomePage) {
      navigate('/' + '#' + sectionId);
      return;
    }

    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setMobileMenuOpen(false);
    }
  };

  useEffect(() => {
    if (variant === 'dashboard') return;

    const handleScroll = () => {
      setIsScrolled(window.scrollY > 16);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio > 0.3) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { threshold: [0.3, 0.5, 0.7], rootMargin: '-100px 0px -50% 0px' }
    );

    const sections = ['top', 'why', 'features', 'pricing'];

    sections.forEach((id) => {
      const element = document.getElementById(id);
      if (element) observer.observe(element);
    });

    window.addEventListener('scroll', handleScroll);
    handleScroll();

    return () => {
      sections.forEach((id) => {
        const element = document.getElementById(id);
        if (element) observer.unobserve(element);
      });
      window.removeEventListener('scroll', handleScroll);
    };
  }, [variant, location.pathname]);

  useEffect(() => {
    if (location.hash) {
      const sectionId = location.hash.slice(1);
      setTimeout(() => {
        const element = document.getElementById(sectionId);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    }
  }, [location]);

  if (variant === 'dashboard') {
    return null;
  }

  const navItems = [
    { label: 'Why', id: 'why', isAnchor: true },
    { label: 'Features', id: 'features', isAnchor: true },
    { label: 'Pricing', id: 'pricing', isAnchor: true },
    { label: 'Product', id: 'product', isAnchor: false, route: '/product' },
  ];

  return (
    <header className={`sticky top-0 z-50 transition-all duration-200 ${
      isScrolled
        ? 'bg-paper shadow-md border-b border-brand/20'
        : 'bg-paper/95 backdrop-blur-md border-b border-brand/10'
    }`}>
      <nav className="container-custom" aria-label="Main navigation">
        <div className="flex items-center justify-between h-16">
          <Link
            to="/"
            className="flex items-center gap-2.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand rounded-lg p-1 -ml-1"
            aria-label="WeddingSite home"
          >
            <Heart className="w-5 h-5 text-accent" aria-hidden="true" />
            <span className="text-lg font-semibold text-ink tracking-tight">WeddingSite</span>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              if (item.isAnchor) {
                return (
                  <button
                    key={item.id}
                    onClick={() => scrollToSection(item.id)}
                    className={`text-sm font-medium transition-colors px-3 py-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
                      isHomePage && activeSection === item.id
                        ? 'text-brand bg-brand/10'
                        : 'text-ink/70 hover:text-ink hover:bg-brand/5'
                    }`}
                    aria-current={isHomePage && activeSection === item.id ? 'location' : undefined}
                  >
                    {item.label}
                  </button>
                );
              } else {
                return (
                  <Link
                    key={item.id}
                    to={item.route || '/'}
                    className={`text-sm font-medium transition-colors px-3 py-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
                      location.pathname === item.route
                        ? 'text-brand bg-brand/10'
                        : 'text-ink/70 hover:text-ink hover:bg-brand/5'
                    }`}
                    aria-current={location.pathname === item.route ? 'page' : undefined}
                  >
                    {item.label}
                  </Link>
                );
              }
            })}
          </div>

          <div className="hidden md:flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={handleLogin}>
              Login
            </Button>
            <Button variant="outline" size="sm" onClick={handleViewDemo}>
              View demo
            </Button>
            <Button variant="accent" size="sm" onClick={handleSignUp}>
              Sign up
            </Button>
          </div>

          <button
            className="md:hidden p-2 text-ink hover:bg-brand/10 rounded-lg transition-colors min-h-[44px] min-w-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-brand/20">
            <div className="flex flex-col gap-2">
              {navItems.map((item) => {
                if (item.isAnchor) {
                  return (
                    <button
                      key={item.id}
                      onClick={() => scrollToSection(item.id)}
                      className={`text-sm font-medium transition-colors py-2 px-3 rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
                        isHomePage && activeSection === item.id
                          ? 'text-brand bg-brand/10'
                          : 'text-ink/70 hover:text-ink hover:bg-brand/5'
                      }`}
                      aria-current={isHomePage && activeSection === item.id ? 'location' : undefined}
                    >
                      {item.label}
                    </button>
                  );
                } else {
                  return (
                    <Link
                      key={item.id}
                      to={item.route || '/'}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`text-sm font-medium transition-colors py-2 px-3 rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
                        location.pathname === item.route
                          ? 'text-brand bg-brand/10'
                          : 'text-ink/70 hover:text-ink hover:bg-brand/5'
                      }`}
                      aria-current={location.pathname === item.route ? 'page' : undefined}
                    >
                      {item.label}
                    </Link>
                  );
                }
              })}
              <div className="flex flex-col gap-2 pt-3 mt-3 border-t border-brand/20">
                <Button variant="ghost" size="md" fullWidth onClick={handleLogin}>
                  Login
                </Button>
                <Button variant="outline" size="md" fullWidth onClick={handleViewDemo}>
                  View demo
                </Button>
                <Button variant="accent" size="md" fullWidth onClick={handleSignUp}>
                  Sign up
                </Button>
              </div>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
};
