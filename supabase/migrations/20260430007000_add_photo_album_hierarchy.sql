ALTER TABLE public.photo_albums
  ADD COLUMN IF NOT EXISTS parent_album_id uuid REFERENCES public.photo_albums(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS hierarchy_label text,
  ADD COLUMN IF NOT EXISTS is_moment_bucket boolean NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_photo_albums_parent
  ON public.photo_albums(parent_album_id);

CREATE INDEX IF NOT EXISTS idx_photo_albums_site_parent_active
  ON public.photo_albums(wedding_site_id, parent_album_id, is_active);

CREATE OR REPLACE FUNCTION public.prevent_photo_album_parent_cycles()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  ancestor_id uuid;
BEGIN
  IF NEW.parent_album_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.parent_album_id = NEW.id THEN
    RAISE EXCEPTION 'A photo bucket cannot be its own parent.';
  END IF;

  SELECT wedding_site_id INTO ancestor_id
  FROM public.photo_albums
  WHERE id = NEW.parent_album_id;

  IF ancestor_id IS NULL THEN
    RAISE EXCEPTION 'Parent photo bucket does not exist.';
  END IF;

  IF ancestor_id <> NEW.wedding_site_id THEN
    RAISE EXCEPTION 'Parent photo bucket must belong to the same wedding site.';
  END IF;

  WITH RECURSIVE ancestors AS (
    SELECT id, parent_album_id
    FROM public.photo_albums
    WHERE id = NEW.parent_album_id
    UNION ALL
    SELECT pa.id, pa.parent_album_id
    FROM public.photo_albums pa
    INNER JOIN ancestors a ON pa.id = a.parent_album_id
  )
  SELECT id INTO ancestor_id
  FROM ancestors
  WHERE id = NEW.id
  LIMIT 1;

  IF ancestor_id IS NOT NULL THEN
    RAISE EXCEPTION 'Photo bucket hierarchy cannot contain cycles.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_photo_albums_prevent_parent_cycles ON public.photo_albums;
CREATE TRIGGER trg_photo_albums_prevent_parent_cycles
BEFORE INSERT OR UPDATE OF parent_album_id, wedding_site_id ON public.photo_albums
FOR EACH ROW EXECUTE FUNCTION public.prevent_photo_album_parent_cycles();
