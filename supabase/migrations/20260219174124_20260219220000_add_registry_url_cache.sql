/*
  # Registry URL Preview Cache

  ## Summary
  Adds a server-side persistent cache for registry URL preview extractions.
  Replaces the ephemeral in-memory cache in the edge function with a durable,
  queryable store that survives function cold-starts.

  ## New Table: registry_url_cache

  ### Columns
  - `id`                  (uuid, pk)
  - `normalized_url_hash` (text, unique) — SHA-256 hex of the normalized URL for fast lookup
  - `normalized_url`      (text)         — The cleaned/canonical URL
  - `title`               (text)         — Extracted product title
  - `description`         (text)         — Product description
  - `image_url`           (text)         — Product image
  - `price_label`         (text)         — Raw price string
  - `price_amount`        (numeric)      — Parsed numeric price
  - `currency`            (text)         — Currency code
  - `availability`        (text)         — In stock / out of stock etc.
  - `brand`               (text)         — Product brand
  - `store_name`          (text)         — Merchant / store name
  - `canonical_url`       (text)         — Canonical product URL
  - `confidence_score`    (numeric)      — 0–1 quality score
  - `source_method`       (text)         — jsonld | og | adapter | heuristic
  - `retailer`            (text)         — Detected retailer slug
  - `fetch_status`        (text)         — success | blocked | timeout | parse_failure | unsupported
  - `error_message`       (text)         — Human-readable error if failed
  - `last_fetched_at`     (timestamptz)  — When the data was last fetched
  - `created_at`          (timestamptz)

  ## Security
  - RLS enabled
  - No user-facing policies (edge function uses service role key for reads/writes)
  - Authenticated users can read cache entries (for UI display)

  ## Indexes
  - normalized_url_hash (unique, primary lookup)
  - last_fetched_at (for cache expiry queries)
  - fetch_status (for analytics)
*/

CREATE TABLE IF NOT EXISTS registry_url_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  normalized_url_hash text UNIQUE NOT NULL,
  normalized_url text NOT NULL,
  title text,
  description text,
  image_url text,
  price_label text,
  price_amount numeric(12,2),
  currency text NOT NULL DEFAULT '',
  availability text NOT NULL DEFAULT '',
  brand text NOT NULL DEFAULT '',
  store_name text NOT NULL DEFAULT '',
  canonical_url text,
  confidence_score numeric(4,3) NOT NULL DEFAULT 0,
  source_method text NOT NULL DEFAULT 'heuristic',
  retailer text NOT NULL DEFAULT 'generic',
  fetch_status text NOT NULL DEFAULT 'success',
  error_message text,
  last_fetched_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS registry_url_cache_hash_idx ON registry_url_cache(normalized_url_hash);
CREATE INDEX IF NOT EXISTS registry_url_cache_fetched_idx ON registry_url_cache(last_fetched_at);
CREATE INDEX IF NOT EXISTS registry_url_cache_status_idx ON registry_url_cache(fetch_status);
CREATE INDEX IF NOT EXISTS registry_url_cache_retailer_idx ON registry_url_cache(retailer);

ALTER TABLE registry_url_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read url cache"
  ON registry_url_cache FOR SELECT
  TO authenticated
  USING (true);
