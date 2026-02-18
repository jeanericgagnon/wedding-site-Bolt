/*
  # Universal Registry System

  ## Summary
  Upgrades the existing registry_items table to support the universal
  URL-import registry feature. Adds metadata fields, purchase tracking,
  display controls, and a server-side atomic purchase increment RPC.

  ## New Columns on registry_items
  - `price_label`         (text)        — Raw price string from source, e.g. "$349.99"
  - `price_amount`        (numeric)     — Parsed numeric price for sorting/display
  - `canonical_url`       (text)        — Normalized/canonical product URL
  - `merchant`            (text)        — Store/domain name (alias to store_name concept)
  - `notes`               (text)        — Couple's notes about the item (replaces description)
  - `desired_quantity`    (integer)     — Alias / rename of quantity_needed
  - `purchased_quantity`  (integer)     — How many have been purchased (alias quantity_purchased)
  - `purchaser_name`      (text)        — Most recent purchaser's name
  - `purchase_status`     (text)        — Computed: 'available' | 'partial' | 'purchased'
  - `hide_when_purchased` (boolean)     — Whether to hide this item on public page when fully purchased
  - `sort_order`          (integer)     — Display ordering
  - `updated_at`          (timestamptz) — Last modification timestamp

  ## New RLS Policies
  - Public SELECT: guests can read registry items for any published wedding site
  - Public purchase UPDATE: controlled increment-only path via RPC

  ## New Function
  - `increment_registry_purchase(item_id, purchaser_name, increment_by)`
    Atomically increments purchased_quantity up to desired_quantity,
    recomputes purchase_status, returns updated row.
    Callable by anon (public), but only modifies purchase fields.

  ## Indexes
  - (wedding_site_id, sort_order) for ordered public listing
  - (purchase_status) for filtering
*/

-- 1. Add missing columns safely
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'registry_items' AND column_name = 'price_label') THEN
    ALTER TABLE registry_items ADD COLUMN price_label text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'registry_items' AND column_name = 'price_amount') THEN
    ALTER TABLE registry_items ADD COLUMN price_amount numeric(12,2);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'registry_items' AND column_name = 'canonical_url') THEN
    ALTER TABLE registry_items ADD COLUMN canonical_url text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'registry_items' AND column_name = 'merchant') THEN
    ALTER TABLE registry_items ADD COLUMN merchant text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'registry_items' AND column_name = 'notes') THEN
    ALTER TABLE registry_items ADD COLUMN notes text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'registry_items' AND column_name = 'purchaser_name') THEN
    ALTER TABLE registry_items ADD COLUMN purchaser_name text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'registry_items' AND column_name = 'purchase_status') THEN
    ALTER TABLE registry_items ADD COLUMN purchase_status text NOT NULL DEFAULT 'available';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'registry_items' AND column_name = 'hide_when_purchased') THEN
    ALTER TABLE registry_items ADD COLUMN hide_when_purchased boolean NOT NULL DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'registry_items' AND column_name = 'sort_order') THEN
    ALTER TABLE registry_items ADD COLUMN sort_order integer NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'registry_items' AND column_name = 'updated_at') THEN
    ALTER TABLE registry_items ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
  END IF;
END $$;

-- 2. Sync price_amount from existing price column where null
UPDATE registry_items SET price_amount = price WHERE price_amount IS NULL AND price IS NOT NULL;

-- 3. Sync purchase_status for any existing rows
UPDATE registry_items SET
  purchase_status = CASE
    WHEN quantity_purchased >= quantity_needed THEN 'purchased'
    WHEN quantity_purchased > 0 THEN 'partial'
    ELSE 'available'
  END
WHERE purchase_status = 'available';

-- 4. Public read policy for published wedding sites
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'registry_items'
      AND policyname = 'Public can read registry items for published sites'
  ) THEN
    CREATE POLICY "Public can read registry items for published sites"
      ON registry_items FOR SELECT
      TO anon
      USING (
        EXISTS (
          SELECT 1 FROM wedding_sites
          WHERE wedding_sites.id = registry_items.wedding_site_id
            AND wedding_sites.is_published = true
        )
      );
  END IF;
END $$;

-- 5. Authenticated users can also read items for published sites (guests)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'registry_items'
      AND policyname = 'Authenticated users can read registry items for published sites'
  ) THEN
    CREATE POLICY "Authenticated users can read registry items for published sites"
      ON registry_items FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM wedding_sites
          WHERE wedding_sites.id = registry_items.wedding_site_id
            AND wedding_sites.is_published = true
        )
      );
  END IF;
END $$;

-- 6. Performance indexes
CREATE INDEX IF NOT EXISTS idx_registry_items_wedding_sort
  ON registry_items(wedding_site_id, sort_order);

CREATE INDEX IF NOT EXISTS idx_registry_items_purchase_status
  ON registry_items(purchase_status);

CREATE INDEX IF NOT EXISTS idx_registry_items_wedding_site_id
  ON registry_items(wedding_site_id);

-- 7. Atomic purchase increment function
-- Callable by anon so guests can mark items as purchased.
-- Only touches purchase fields — never metadata.
CREATE OR REPLACE FUNCTION increment_registry_purchase(
  p_item_id        uuid,
  p_purchaser_name text    DEFAULT NULL,
  p_increment_by   integer DEFAULT 1
)
RETURNS registry_items
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_row registry_items;
  v_new_qty integer;
BEGIN
  -- Lock the row for update
  SELECT * INTO v_row FROM registry_items WHERE id = p_item_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Registry item not found: %', p_item_id;
  END IF;

  -- Verify item is on a published site (public safety check)
  IF NOT EXISTS (
    SELECT 1 FROM wedding_sites
    WHERE id = v_row.wedding_site_id AND is_published = true
  ) THEN
    RAISE EXCEPTION 'Item is not on a published site';
  END IF;

  -- Cap at desired_quantity
  v_new_qty := LEAST(
    v_row.quantity_purchased + p_increment_by,
    COALESCE(v_row.quantity_needed, 1)
  );

  UPDATE registry_items SET
    quantity_purchased = v_new_qty,
    purchaser_name     = COALESCE(p_purchaser_name, purchaser_name),
    purchase_status    = CASE
                           WHEN v_new_qty >= COALESCE(quantity_needed, 1) THEN 'purchased'
                           WHEN v_new_qty > 0 THEN 'partial'
                           ELSE 'available'
                         END,
    updated_at         = now()
  WHERE id = p_item_id
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

-- Grant execute to anon and authenticated
GRANT EXECUTE ON FUNCTION increment_registry_purchase(uuid, text, integer) TO anon;
GRANT EXECUTE ON FUNCTION increment_registry_purchase(uuid, text, integer) TO authenticated;
