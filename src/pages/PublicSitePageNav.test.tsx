import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { PublicSitePageNav } from './PublicSitePageNav';

describe('PublicSitePageNav', () => {
  it('renders one-page section anchor navigation when there is only a home page', () => {
    render(
      <MemoryRouter>
        <PublicSitePageNav
          siteSlug="maya-leo"
          pages={[{ slug: 'home', title: 'Home', orderIndex: 0, isHome: true }]}
          sectionAnchors={[{ id: 'travel', anchorId: 'Travel Info', title: 'Travel', orderIndex: 0 }]}
        />
      </MemoryRouter>,
    );

    expect(screen.getByRole('navigation', { name: 'Site section navigation' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Travel' })).toHaveAttribute('href', '/site/maya-leo#travel-info');
    expect(screen.queryByRole('link', { name: 'Home' })).not.toBeInTheDocument();
  });

  it('renders multi-page navigation with the current dedicated page marked active', () => {
    render(
      <MemoryRouter>
        <PublicSitePageNav
          siteSlug="maya-leo"
          currentPageSlug="Travel Info"
          pages={[
            { slug: 'home', title: 'Home', orderIndex: 0, isHome: true },
            { slug: 'travel-info', title: 'Travel', orderIndex: 1, isHome: false },
          ]}
        />
      </MemoryRouter>,
    );

    expect(screen.getByRole('navigation', { name: 'Site page navigation' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/site/maya-leo');
    expect(screen.getByRole('link', { name: 'Travel' })).toHaveAttribute('href', '/site/maya-leo/travel-info');
    expect(screen.getByRole('link', { current: 'page' })).toHaveTextContent('Travel');
  });

  it('uses root-mounted links for wedding subdomain public sites', () => {
    render(
      <MemoryRouter>
        <PublicSitePageNav
          siteSlug="maya-leo"
          currentPageSlug="travel"
          useRootPaths
          pages={[
            { slug: 'home', title: 'Home', orderIndex: 0, isHome: true },
            { slug: 'travel', title: 'Travel', orderIndex: 1, isHome: false },
          ]}
        />
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: 'Travel' })).toHaveAttribute('href', '/travel');
  });

  it('uses root-mounted anchor links for one-page wedding subdomain public sites', () => {
    render(
      <MemoryRouter>
        <PublicSitePageNav
          siteSlug="maya-leo"
          useRootPaths
          pages={[{ slug: 'home', title: 'Home', orderIndex: 0, isHome: true }]}
          sectionAnchors={[{ id: 'travel', anchorId: 'Travel Info', title: 'Travel', orderIndex: 0 }]}
        />
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: 'Travel' })).toHaveAttribute('href', '/#travel-info');
  });
});
