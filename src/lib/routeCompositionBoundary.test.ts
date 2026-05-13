import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');

describe('route composition boundary', () => {
  it('keeps App focused on composing route groups instead of inline route sprawl', () => {
    const app = read('src/App.tsx');

    expect(app).toContain("import { PublicRoutes } from './routes/publicRoutes';");
    expect(app).toContain("import { GuestRoutes } from './routes/guestRoutes';");
    expect(app).toContain("import { AccountRoutes } from './routes/accountRoutes';");
    expect(app).toContain("import { OnboardingRoutes } from './routes/onboardingRoutes';");
    expect(app).toContain("import { DashboardRoutes } from './routes/dashboardRoutes';");
    expect(app).toContain('{PublicRoutes({ isWeddingSubdomainHost })}');
    expect(app).toContain('{GuestRoutes()}');
    expect(app).toContain('{AccountRoutes()}');
    expect(app).toContain('{OnboardingRoutes()}');
    expect(app).toContain('{DashboardRoutes()}');
    expect(app).not.toContain('path="/dashboard/guests"');
    expect(app).not.toContain('path="/vault/:siteSlug"');
  });

  it('keeps the protected-route wrapper centralized for grouped routes', () => {
    const helper = read('src/routes/ProtectedPageRoute.tsx');
    const onboardingRoutes = read('src/routes/onboardingRoutes.tsx');
    const dashboardRoutes = read('src/routes/dashboardRoutes.tsx');

    expect(helper).toContain("from '../components/auth/ProtectedRoute'");
    expect(helper).toContain('<ProtectedRoute skipPaymentGate={skipPaymentGate}>');
    expect(onboardingRoutes).toContain("{ProtectedPageRoute({ path: '/onboarding', element: <Onboarding /> })}");
    expect(dashboardRoutes).toContain("{ProtectedPageRoute({ path: '/dashboard/guests', element: <DashboardGuests /> })}");
  });
});
