import { Celebration, GuidedSetup, Onboarding, QuickStart, SetupShell, WeddingStatus } from './routePages';
import { ProtectedPageRoute } from './ProtectedPageRoute';

export function OnboardingRoutes() {
  return (
    <>
      {ProtectedPageRoute({ path: '/onboarding', element: <Onboarding /> })}
      {ProtectedPageRoute({ path: '/onboarding/status', element: <WeddingStatus /> })}
      {ProtectedPageRoute({ path: '/onboarding/celebration', element: <Celebration />, skipPaymentGate: true })}
      {ProtectedPageRoute({ path: '/onboarding/quick-start', element: <QuickStart /> })}
      {ProtectedPageRoute({ path: '/onboarding/guided', element: <GuidedSetup /> })}
      {ProtectedPageRoute({ path: '/setup', element: <SetupShell /> })}
      {ProtectedPageRoute({ path: '/setup/:step', element: <SetupShell /> })}
    </>
  );
}
