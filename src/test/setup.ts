import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Ensure modules that import the shared Supabase client can load in CI/unit tests
// without requiring real project secrets.
vi.stubEnv('VITE_SUPABASE_URL', process.env.VITE_SUPABASE_URL || 'https://example.supabase.co');
vi.stubEnv('VITE_SUPABASE_ANON_KEY', process.env.VITE_SUPABASE_ANON_KEY || 'test-anon-key');
