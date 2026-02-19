/*
  # Reset demo user password

  Sets the password for demo@dayof.love to 'demo-password-12345'
  using a fresh bcrypt hash so the Try Demo flow works correctly.
*/

UPDATE auth.users
SET encrypted_password = crypt('demo-password-12345', gen_salt('bf'))
WHERE email = 'demo@dayof.love';
