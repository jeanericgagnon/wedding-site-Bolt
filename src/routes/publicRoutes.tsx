import { Route } from 'react-router-dom';
import {
  GuestsFeature,
  Home,
  MessagingFeature,
  Privacy,
  Product,
  Refund,
  RegistryFeature,
  RSVPFeature,
  SeatingFeature,
  Signup,
  SiteView,
  Support,
  TemplateDetail,
  Templates,
  Terms,
  TravelFeature,
  Trust,
  VendorProfilePage,
} from './routePages';

type PublicRoutesProps = {
  isWeddingSubdomainHost: boolean;
};

export function PublicRoutes({ isWeddingSubdomainHost }: PublicRoutesProps) {
  return (
    <>
      <Route path="/" element={isWeddingSubdomainHost ? <SiteView /> : <Home />} />
      <Route path="/product" element={<Product />} />
      <Route path="/templates" element={<Templates />} />
      <Route path="/templates/:templateId" element={<TemplateDetail />} />
      <Route path="/site/:slug" element={<SiteView />} />
      <Route path="/site/:slug/:pageSlug" element={<SiteView />} />
      {isWeddingSubdomainHost ? <Route path="/:pageSlug" element={<SiteView />} /> : null}
      <Route path="/vendor/:slug" element={<VendorProfilePage />} />
      <Route path="/features/guests" element={<GuestsFeature />} />
      <Route path="/features/rsvp" element={<RSVPFeature />} />
      <Route path="/features/messaging" element={<MessagingFeature />} />
      <Route path="/features/travel" element={<TravelFeature />} />
      <Route path="/features/registry" element={<RegistryFeature />} />
      <Route path="/features/seating" element={<SeatingFeature />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/support" element={<Support />} />
      <Route path="/refund" element={<Refund />} />
      <Route path="/trust" element={<Trust />} />
    </>
  );
}
