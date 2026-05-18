import React from 'react';
import { MemoryRouter, Routes } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AccountRoutes } from './accountRoutes';

vi.mock('./ProtectedPageRoute', async () => {
  const { Route } = await import('react-router-dom');
  return {
    ProtectedPageRoute: ({ path, element }: { path: string; element: React.ReactNode }) => (
      <Route path={path} element={element} />
    ),
  };
});

vi.mock('./routePages', () => ({
  Login: () => <div>Login Page</div>,
  PaymentRequired: () => <div>Payment Required</div>,
  PaymentSuccess: () => <div>Payment Success</div>,
  VendorProfileCreatePage: () => <div>Vendor Profile Create</div>,
  VendorTemplates: () => <div>Vendor Templates</div>,
}));

function renderWithPath(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>{AccountRoutes()}</Routes>
    </MemoryRouter>,
  );
}

describe('AccountRoutes', () => {
  it('renders the vendor generator route inside the protected account route group', () => {
    renderWithPath('/vendor-profile-v1');
    expect(screen.getByText('Vendor Profile Create')).toBeInTheDocument();
  });

  it('renders the vendor templates route inside the protected account route group', () => {
    renderWithPath('/vendor-templates');
    expect(screen.getByText('Vendor Templates')).toBeInTheDocument();
  });

  it('keeps the login route public', () => {
    renderWithPath('/login');
    expect(screen.getByText('Login Page')).toBeInTheDocument();
  });
});
