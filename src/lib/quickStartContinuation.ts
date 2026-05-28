const QUICK_START_QUERY_FLAG = '1' as const;
const QUICK_START_DASHBOARD_NEXT_STEPS = ['photos', 'review'] as const;

type QuickStartDashboardNextStep = (typeof QUICK_START_DASHBOARD_NEXT_STEPS)[number];

type SearchParamsLike = Pick<URLSearchParams, 'get'>;

const isQuickStartDashboardNextStep = (value: string | null): value is QuickStartDashboardNextStep => (
  value !== null && QUICK_START_DASHBOARD_NEXT_STEPS.includes(value as QuickStartDashboardNextStep)
);

export const readQuickStartDashboardContinuation = (searchParams: SearchParamsLike) => {
  const fromQuickStart = searchParams.get('fromQuickStart') === QUICK_START_QUERY_FLAG;
  const nextStep = searchParams.get('next');

  return {
    fromQuickStart,
    nextStep: isQuickStartDashboardNextStep(nextStep) ? nextStep : null,
  } as const;
};

export const buildQuickStartEntryPath = () => '/onboarding/quick-start?bypassPayment=1';
export const buildQuickStartManualSetupPath = () => '/onboarding?bypassPayment=1';
export const buildQuickStartPhotosPath = () => '/dashboard/photos?bypassPayment=1&fromQuickStart=1&next=review';
export const buildQuickStartGuestsPath = () => '/dashboard/guests?bypassPayment=1&fromQuickStart=1&next=photos';
export const buildQuickStartOverviewPath = () => '/dashboard/overview?bypassPayment=1&fromQuickStart=1';
