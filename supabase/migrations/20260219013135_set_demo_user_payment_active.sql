/*
  # Set demo user payment status to active

  The demo account (demo@dayof.love) was being redirected to the payment
  gate because its wedding_site had payment_status = 'payment_required'.
  This sets it to 'active' so demo users can access the dashboard freely.
*/

UPDATE wedding_sites
SET payment_status = 'active'
WHERE user_id = (
  SELECT id FROM auth.users WHERE email = 'demo@dayof.love'
);
