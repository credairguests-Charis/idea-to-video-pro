-- Add thumbnail URL column for video fallback images
ALTER TABLE public.marketing_links 
ADD COLUMN og_thumbnail_url TEXT;