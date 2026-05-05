WITH candidates AS (
  SELECT ws.id
  FROM public.wedding_sites ws
  WHERE ws.payment_status = 'active'
    AND NOT EXISTS (
      SELECT 1
      FROM public.sms_credit_transactions tx
      WHERE tx.wedding_site_id = ws.id
        AND tx.reason = 'included'
        AND tx.metadata @> '{"source":"included_with_site_purchase"}'::jsonb
    )
),
inserted AS (
  INSERT INTO public.sms_credit_transactions (
    wedding_site_id,
    credits_delta,
    remaining_credits,
    expires_at,
    reason,
    metadata
  )
  SELECT
    id,
    1000,
    1000,
    now() + interval '12 months',
    'included',
    '{"source":"included_with_site_purchase","unit":"160_character_sms_segment"}'::jsonb
  FROM candidates
  RETURNING wedding_site_id
)
UPDATE public.wedding_sites ws
SET sms_credits_balance = COALESCE(ws.sms_credits_balance, 0) + 1000
WHERE ws.id IN (SELECT wedding_site_id FROM inserted);
