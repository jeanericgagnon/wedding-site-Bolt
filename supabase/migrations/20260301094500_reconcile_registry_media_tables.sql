-- Reconcile registry/media table shape used by frontend runtime

-- Registry table compatibility
ALTER TABLE public.registry_items
  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS item_type text NOT NULL DEFAULT 'product',
  ADD COLUMN IF NOT EXISTS price_label text,
  ADD COLUMN IF NOT EXISTS price_amount numeric,
  ADD COLUMN IF NOT EXISTS merchant text,
  ADD COLUMN IF NOT EXISTS canonical_url text,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS purchase_status text NOT NULL DEFAULT 'available',
  ADD COLUMN IF NOT EXISTS hide_when_purchased boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS metadata_last_checked_at timestamptz,
  ADD COLUMN IF NOT EXISTS metadata_fetch_status text,
  ADD COLUMN IF NOT EXISTS metadata_confidence_score numeric,
  ADD COLUMN IF NOT EXISTS previous_price_amount numeric,
  ADD COLUMN IF NOT EXISTS price_last_changed_at timestamptz,
  ADD COLUMN IF NOT EXISTS next_refresh_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_auto_refreshed_at timestamptz,
  ADD COLUMN IF NOT EXISTS refresh_fail_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fund_goal_amount numeric,
  ADD COLUMN IF NOT EXISTS fund_received_amount numeric,
  ADD COLUMN IF NOT EXISTS fund_venmo_url text,
  ADD COLUMN IF NOT EXISTS fund_paypal_url text,
  ADD COLUMN IF NOT EXISTS fund_zelle_handle text,
  ADD COLUMN IF NOT EXISTS fund_custom_url text,
  ADD COLUMN IF NOT EXISTS fund_custom_label text;

UPDATE public.registry_items
SET price_amount = COALESCE(price_amount, price)
WHERE price_amount IS NULL;

UPDATE public.registry_items
SET price_label = COALESCE(price_label, CASE WHEN price IS NOT NULL THEN ('$' || trim(to_char(price, 'FM999999990.00'))) ELSE NULL END)
WHERE price_label IS NULL;

CREATE INDEX IF NOT EXISTS idx_registry_items_sort_order ON public.registry_items(wedding_site_id, sort_order, created_at);

-- Builder media assets compatibility
CREATE TABLE IF NOT EXISTS public.builder_media_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_site_id uuid NOT NULL REFERENCES public.wedding_sites(id) ON DELETE CASCADE,
  filename text NOT NULL,
  original_filename text NOT NULL,
  mime_type text NOT NULL,
  asset_type text NOT NULL DEFAULT 'image',
  status text NOT NULL DEFAULT 'ready',
  url text NOT NULL,
  thumbnail_url text,
  width integer,
  height integer,
  size_bytes bigint NOT NULL DEFAULT 0,
  alt_text text,
  caption text,
  tags text[] NOT NULL DEFAULT '{}',
  attached_section_ids text[] NOT NULL DEFAULT '{}',
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.builder_media_assets ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY builder_media_assets_owner_select
    ON public.builder_media_assets FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM public.wedding_sites ws
        WHERE ws.id = builder_media_assets.wedding_site_id
          AND ws.user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY builder_media_assets_owner_insert
    ON public.builder_media_assets FOR INSERT
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.wedding_sites ws
        WHERE ws.id = builder_media_assets.wedding_site_id
          AND ws.user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY builder_media_assets_owner_update
    ON public.builder_media_assets FOR UPDATE
    USING (
      EXISTS (
        SELECT 1 FROM public.wedding_sites ws
        WHERE ws.id = builder_media_assets.wedding_site_id
          AND ws.user_id = auth.uid()
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.wedding_sites ws
        WHERE ws.id = builder_media_assets.wedding_site_id
          AND ws.user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY builder_media_assets_owner_delete
    ON public.builder_media_assets FOR DELETE
    USING (
      EXISTS (
        SELECT 1 FROM public.wedding_sites ws
        WHERE ws.id = builder_media_assets.wedding_site_id
          AND ws.user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_builder_media_assets_site_uploaded
  ON public.builder_media_assets(wedding_site_id, uploaded_at DESC);
