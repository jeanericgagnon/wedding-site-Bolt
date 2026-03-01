/*
  Role-based admin access registry.
*/

CREATE TABLE IF NOT EXISTS admin_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  email text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role can manage admin users" ON admin_users;
CREATE POLICY "Service role can manage admin users"
  ON admin_users FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated can check own admin status" ON admin_users;
CREATE POLICY "Authenticated can check own admin status"
  ON admin_users FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

INSERT INTO admin_users (user_id, email)
SELECT id, email
FROM auth.users
WHERE email = 'admin@dayof.love'
ON CONFLICT (user_id) DO NOTHING;
