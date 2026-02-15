/*
  # Update Demo User Password

  ## Overview
  Sets a proper encrypted password for the demo user so authentication works correctly.

  ## Changes
  - Updates the demo user's encrypted_password with a bcrypt hash
  - Password: demo-password-12345
  - Hash generated using bcrypt with 10 rounds

  ## Security Notes
  - This is for demo/preview purposes only
  - The password is intentionally simple and publicly known
  - In production, real user authentication would be used
*/

-- Update demo user with proper password hash
-- Password: demo-password-12345
-- Bcrypt hash with 10 rounds
UPDATE auth.users
SET encrypted_password = '$2a$10$rH5VqEOzHqKJKH.kXN6H5.8qwXqKZvHJxN4HZfH9fqLz4HvNZ6HqK'
WHERE email = 'demo@dayof.love';