import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      'dist',
      'tmp',
      'recovery',
      'imports',
      'node_modules',
      'coverage',
    ],
  },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }],
      '@typescript-eslint/ban-ts-comment': 'warn',
      'no-useless-escape': 'warn',
      'no-empty': 'warn',
      'prefer-const': 'warn',
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
    },
  }
  ,
  {
    files: [
      'src/components/auth/ProtectedRoute.tsx',
      'src/lib/activeSite.ts',
      'src/lib/customerSafeError.ts',
      'src/lib/mediaUrl.ts',
      'src/lib/paymentGate.ts',
      'src/lib/publicRenderContract.ts',
      'src/lib/publicSiteAccess.ts',
      'src/lib/publicSiteRenderModel.ts',
      'src/lib/publicSiteSlug.ts',
      'src/render/publicSectionDataSanitizer.ts',
      'src/lib/siteConfigValidate.ts',
      'src/lib/stripeService.ts',
      'src/lib/vendorProfiles.ts',
      'src/pages/RSVP.tsx',
      'src/pages/SiteView.tsx',
      'src/pages/siteViewHelpers.ts',
      'src/pages/onboarding/QuickStart.tsx',
      'src/routes/dashboardRoutes.tsx',
      'src/routes/publicRoutes.tsx',
      'src/routes/guestRoutes.tsx',
      'src/routes/onboardingRoutes.tsx',
      'src/routes/accountRoutes.tsx',
      'src/routes/internalToolingRoutes.tsx',
      'src/pages/dashboard/planning/nameChangeService.ts',
    ],
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/ban-ts-comment': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }],
      'no-empty': 'error',
      'prefer-const': 'error',
    },
  }
);
