/*
  # Wedding Site Platform Database Schema

  ## Overview
  This migration creates the core database structure for a wedding website platform where couples can create personalized wedding sites, manage guest lists, RSVPs, photo galleries, and gift registries.

  ## New Tables

  ### 1. `wedding_sites`
  Stores the main wedding site information linked to a user account.
  - `id` (uuid, primary key) - Unique identifier for the wedding site
  - `user_id` (uuid, foreign key) - References auth.users
  - `couple_name_1` (text) - First person's name
  - `couple_name_2` (text) - Second person's name
  - `wedding_date` (date) - Date of the wedding
  - `venue_name` (text) - Wedding venue name
  - `venue_location` (text) - Venue address/location
  - `site_url` (text, unique) - Custom URL slug for the wedding site
  - `hero_image_url` (text) - URL to hero/cover image
  - `theme_settings` (jsonb) - Custom theme and style settings
  - `created_at` (timestamptz) - When the site was created
  - `updated_at` (timestamptz) - Last update timestamp

  ### 2. `guests`
  Manages guest list and RSVP information.
  - `id` (uuid, primary key) - Unique identifier
  - `wedding_site_id` (uuid, foreign key) - References wedding_sites
  - `name` (text) - Guest's full name
  - `email` (text) - Guest's email address
  - `phone` (text) - Guest's phone number
  - `plus_one_allowed` (boolean) - Whether guest can bring a plus one
  - `plus_one_name` (text) - Name of plus one if confirmed
  - `rsvp_status` (text) - Status: pending, confirmed, declined
  - `meal_preference` (text) - Dietary preferences/meal choice
  - `notes` (text) - Additional notes about the guest
  - `invitation_sent_at` (timestamptz) - When invitation was sent
  - `rsvp_received_at` (timestamptz) - When RSVP was received
  - `created_at` (timestamptz) - Record creation timestamp

  ### 3. `photos`
  Stores wedding photos and gallery images.
  - `id` (uuid, primary key) - Unique identifier
  - `wedding_site_id` (uuid, foreign key) - References wedding_sites
  - `url` (text) - Photo URL
  - `thumbnail_url` (text) - Thumbnail version URL
  - `caption` (text) - Photo caption
  - `category` (text) - Category: engagement, ceremony, reception, other
  - `display_order` (integer) - Order for display
  - `uploaded_at` (timestamptz) - Upload timestamp
  - `created_at` (timestamptz) - Record creation timestamp

  ### 4. `registry_items`
  Manages gift registry items.
  - `id` (uuid, primary key) - Unique identifier
  - `wedding_site_id` (uuid, foreign key) - References wedding_sites
  - `item_name` (text) - Name of the gift item
  - `description` (text) - Item description
  - `price` (decimal) - Item price
  - `store_name` (text) - Store or retailer name
  - `item_url` (text) - Link to purchase
  - `image_url` (text) - Product image URL
  - `quantity_needed` (integer) - How many needed
  - `quantity_purchased` (integer) - How many purchased
  - `priority` (text) - Priority: high, medium, low
  - `created_at` (timestamptz) - Record creation timestamp

  ### 5. `site_content`
  Stores customizable content blocks for the wedding site.
  - `id` (uuid, primary key) - Unique identifier
  - `wedding_site_id` (uuid, foreign key) - References wedding_sites
  - `section_type` (text) - Type: story, schedule, travel, accommodations, faq
  - `title` (text) - Section title
  - `content` (text) - Section content
  - `display_order` (integer) - Order for display
  - `is_visible` (boolean) - Whether section is visible on public site
  - `created_at` (timestamptz) - Record creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ## Security

  All tables have Row Level Security (RLS) enabled with policies ensuring:
  - Users can only access their own wedding site data
  - Public access is controlled through specific policies
  - Authentication is required for all data modifications

  ## Indexes

  Performance indexes are added for:
  - Foreign key relationships
  - Frequently queried fields (site_url, email, rsvp_status)
*/

-- Create wedding_sites table
CREATE TABLE IF NOT EXISTS wedding_sites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  couple_name_1 text NOT NULL,
  couple_name_2 text NOT NULL,
  wedding_date date,
  venue_name text,
  venue_location text,
  site_url text UNIQUE,
  hero_image_url text,
  theme_settings jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE wedding_sites ENABLE ROW LEVEL SECURITY;

-- Wedding sites policies
CREATE POLICY "Users can view their own wedding sites"
  ON wedding_sites FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own wedding sites"
  ON wedding_sites FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own wedding sites"
  ON wedding_sites FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own wedding sites"
  ON wedding_sites FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create guests table
CREATE TABLE IF NOT EXISTS guests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_site_id uuid REFERENCES wedding_sites(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  email text,
  phone text,
  plus_one_allowed boolean DEFAULT false,
  plus_one_name text,
  rsvp_status text DEFAULT 'pending',
  meal_preference text,
  notes text,
  invitation_sent_at timestamptz,
  rsvp_received_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE guests ENABLE ROW LEVEL SECURITY;

-- Guests policies
CREATE POLICY "Users can view guests for their wedding sites"
  ON guests FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM wedding_sites
      WHERE wedding_sites.id = guests.wedding_site_id
      AND wedding_sites.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create guests for their wedding sites"
  ON guests FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM wedding_sites
      WHERE wedding_sites.id = guests.wedding_site_id
      AND wedding_sites.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update guests for their wedding sites"
  ON guests FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM wedding_sites
      WHERE wedding_sites.id = guests.wedding_site_id
      AND wedding_sites.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM wedding_sites
      WHERE wedding_sites.id = guests.wedding_site_id
      AND wedding_sites.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete guests for their wedding sites"
  ON guests FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM wedding_sites
      WHERE wedding_sites.id = guests.wedding_site_id
      AND wedding_sites.user_id = auth.uid()
    )
  );

-- Create photos table
CREATE TABLE IF NOT EXISTS photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_site_id uuid REFERENCES wedding_sites(id) ON DELETE CASCADE NOT NULL,
  url text NOT NULL,
  thumbnail_url text,
  caption text,
  category text DEFAULT 'other',
  display_order integer DEFAULT 0,
  uploaded_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE photos ENABLE ROW LEVEL SECURITY;

-- Photos policies
CREATE POLICY "Users can view photos for their wedding sites"
  ON photos FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM wedding_sites
      WHERE wedding_sites.id = photos.wedding_site_id
      AND wedding_sites.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create photos for their wedding sites"
  ON photos FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM wedding_sites
      WHERE wedding_sites.id = photos.wedding_site_id
      AND wedding_sites.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update photos for their wedding sites"
  ON photos FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM wedding_sites
      WHERE wedding_sites.id = photos.wedding_site_id
      AND wedding_sites.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM wedding_sites
      WHERE wedding_sites.id = photos.wedding_site_id
      AND wedding_sites.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete photos for their wedding sites"
  ON photos FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM wedding_sites
      WHERE wedding_sites.id = photos.wedding_site_id
      AND wedding_sites.user_id = auth.uid()
    )
  );

-- Create registry_items table
CREATE TABLE IF NOT EXISTS registry_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_site_id uuid REFERENCES wedding_sites(id) ON DELETE CASCADE NOT NULL,
  item_name text NOT NULL,
  description text,
  price decimal(10, 2),
  store_name text,
  item_url text,
  image_url text,
  quantity_needed integer DEFAULT 1,
  quantity_purchased integer DEFAULT 0,
  priority text DEFAULT 'medium',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE registry_items ENABLE ROW LEVEL SECURITY;

-- Registry items policies
CREATE POLICY "Users can view registry items for their wedding sites"
  ON registry_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM wedding_sites
      WHERE wedding_sites.id = registry_items.wedding_site_id
      AND wedding_sites.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create registry items for their wedding sites"
  ON registry_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM wedding_sites
      WHERE wedding_sites.id = registry_items.wedding_site_id
      AND wedding_sites.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update registry items for their wedding sites"
  ON registry_items FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM wedding_sites
      WHERE wedding_sites.id = registry_items.wedding_site_id
      AND wedding_sites.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM wedding_sites
      WHERE wedding_sites.id = registry_items.wedding_site_id
      AND wedding_sites.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete registry items for their wedding sites"
  ON registry_items FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM wedding_sites
      WHERE wedding_sites.id = registry_items.wedding_site_id
      AND wedding_sites.user_id = auth.uid()
    )
  );

-- Create site_content table
CREATE TABLE IF NOT EXISTS site_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_site_id uuid REFERENCES wedding_sites(id) ON DELETE CASCADE NOT NULL,
  section_type text NOT NULL,
  title text,
  content text,
  display_order integer DEFAULT 0,
  is_visible boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE site_content ENABLE ROW LEVEL SECURITY;

-- Site content policies
CREATE POLICY "Users can view content for their wedding sites"
  ON site_content FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM wedding_sites
      WHERE wedding_sites.id = site_content.wedding_site_id
      AND wedding_sites.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create content for their wedding sites"
  ON site_content FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM wedding_sites
      WHERE wedding_sites.id = site_content.wedding_site_id
      AND wedding_sites.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update content for their wedding sites"
  ON site_content FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM wedding_sites
      WHERE wedding_sites.id = site_content.wedding_site_id
      AND wedding_sites.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM wedding_sites
      WHERE wedding_sites.id = site_content.wedding_site_id
      AND wedding_sites.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete content for their wedding sites"
  ON site_content FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM wedding_sites
      WHERE wedding_sites.id = site_content.wedding_site_id
      AND wedding_sites.user_id = auth.uid()
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_wedding_sites_user_id ON wedding_sites(user_id);
CREATE INDEX IF NOT EXISTS idx_wedding_sites_site_url ON wedding_sites(site_url);
CREATE INDEX IF NOT EXISTS idx_guests_wedding_site_id ON guests(wedding_site_id);
CREATE INDEX IF NOT EXISTS idx_guests_email ON guests(email);
CREATE INDEX IF NOT EXISTS idx_guests_rsvp_status ON guests(rsvp_status);
CREATE INDEX IF NOT EXISTS idx_photos_wedding_site_id ON photos(wedding_site_id);
CREATE INDEX IF NOT EXISTS idx_registry_items_wedding_site_id ON registry_items(wedding_site_id);
CREATE INDEX IF NOT EXISTS idx_site_content_wedding_site_id ON site_content(wedding_site_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_wedding_sites_updated_at
  BEFORE UPDATE ON wedding_sites
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_site_content_updated_at
  BEFORE UPDATE ON site_content
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
