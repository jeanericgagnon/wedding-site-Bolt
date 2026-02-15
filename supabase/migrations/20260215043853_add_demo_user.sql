/*
  # Add Demo User for Testing

  1. Purpose
    - Creates a demo user account for testing and onboarding
    - Allows the mock authentication system to work with real database queries

  2. Changes
    - Inserts a demo user into auth.users table with UUID '00000000-0000-0000-0000-000000000001'
    - Sets up the user with email 'demo@dayof.love'

  3. Security
    - This is a demo-only user for development/preview purposes
    - In production, real Supabase authentication would be used
*/

-- Insert demo user into auth.users table if not exists
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  aud,
  role
)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'demo@dayof.love',
  '',
  now(),
  now(),
  now(),
  'authenticated',
  'authenticated'
)
ON CONFLICT (id) DO NOTHING;