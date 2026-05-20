import React from 'react';
import { MemoryRouter, Routes } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { PublicRoutes } from './publicRoutes';

vi.mock('./routePages', async () => {
  const { useParams } = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');

  return {
  GuestsFeature: () => <div>Guests Feature</div>,
  Home: () => <div>Home Page</div>,
  MessagingFeature: () => <div>Messaging Feature</div>,
  Privacy: () => <div>Privacy Page</div>,
  Product: () => <div>Product Page</div>,
  Refund: () => <div>Refund Page</div>,
  RegistryFeature: () => <div>Registry Feature</div>,
  RSVPFeature: () => <div>RSVP Feature</div>,
  SeatingFeature: () => <div>Seating Feature</div>,
  Signup: () => <div>Signup Page</div>,
  SiteView: () => {
    const params = useParams();
    return (
      <div>
        <span>Public Site View</span>
        <span data-testid="site-slug">{params.slug ?? ''}</span>
        <span data-testid="page-slug">{params.pageSlug ?? ''}</span>
      </div>
    );
  },
  Support: () => <div>Support Page</div>,
  TemplateDetail: () => <div>Template Detail</div>,
  Templates: () => <div>Templates Page</div>,
  Terms: () => <div>Terms Page</div>,
  TravelFeature: () => <div>Travel Feature</div>,
  Trust: () => <div>Trust Page</div>,
  VendorProfilePage: () => <div>Vendor Profile</div>,
  };
});

function renderPublicPath(path: string, isWeddingSubdomainHost = false) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>{PublicRoutes({ isWeddingSubdomainHost })}</Routes>
    </MemoryRouter>,
  );
}

describe('PublicRoutes', () => {
  it('renders a dedicated public site page under /site/:slug/:pageSlug', () => {
    renderPublicPath('/site/maya-leo/travel');

    expect(screen.getByText('Public Site View')).toBeInTheDocument();
    expect(screen.getByTestId('site-slug')).toHaveTextContent('maya-leo');
    expect(screen.getByTestId('page-slug')).toHaveTextContent('travel');
  });

  it('renders a dedicated page slug on wedding subdomain hosts', () => {
    renderPublicPath('/travel', true);

    expect(screen.getByText('Public Site View')).toBeInTheDocument();
    expect(screen.getByTestId('site-slug')).toHaveTextContent('');
    expect(screen.getByTestId('page-slug')).toHaveTextContent('travel');
  });
});
