import React from 'react';
import { Link } from 'react-router-dom';
import {
  buildPublicSitePageHref,
  buildPublicSiteSectionAnchorHref,
  normalizeSiteViewPageSlug,
  type PublicSitePageNavItem,
  type PublicSiteSectionAnchorNavItem,
} from './siteViewPageSelection';

export const PublicSitePageNav: React.FC<{
  pages: PublicSitePageNavItem[];
  sectionAnchors?: PublicSiteSectionAnchorNavItem[];
  siteSlug: string;
  currentPageSlug?: string | null;
  useRootPaths?: boolean;
}> = ({ pages, sectionAnchors = [], siteSlug, currentPageSlug, useRootPaths = false }) => {
  const showSectionAnchors = pages.length <= 1 && sectionAnchors.length > 0;
  if (pages.length <= 1 && !showSectionAnchors) return null;
  const activeSlug = currentPageSlug ? normalizeSiteViewPageSlug(currentPageSlug) : 'home';

  return (
    <nav
      aria-label={showSectionAnchors ? 'Site section navigation' : 'Site page navigation'}
      className="sticky top-0 z-30 border-b border-black/10 bg-white/90 px-4 py-2 backdrop-blur"
    >
      <div className="mx-auto flex max-w-5xl items-center gap-2 overflow-x-auto">
        {showSectionAnchors ? sectionAnchors.map((anchor) => (
          <a
            key={anchor.id}
            href={buildPublicSiteSectionAnchorHref(siteSlug, anchor, useRootPaths)}
            className="whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-subtle)] hover:text-[var(--color-text-primary)]"
          >
            {anchor.title}
          </a>
        )) : pages.map((page) => {
          const isActive = activeSlug === page.slug || (!currentPageSlug && page.isHome);
          return (
            <Link
              key={page.id ?? page.slug}
              to={buildPublicSitePageHref(siteSlug, page, useRootPaths)}
              aria-current={isActive ? 'page' : undefined}
              className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                isActive
                  ? 'bg-[var(--color-text-primary)] text-[var(--color-background)]'
                  : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-subtle)] hover:text-[var(--color-text-primary)]'
              }`}
            >
              {page.title}
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
