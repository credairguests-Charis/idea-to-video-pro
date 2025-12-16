-- Add og_image_url column to marketing_links for social media preview images
ALTER TABLE public.marketing_links 
ADD COLUMN og_image_url TEXT;

-- Add comment for clarity
COMMENT ON COLUMN public.marketing_links.og_image_url IS 'Custom image URL displayed when link is shared on social media (Open Graph image)';

-- Create storage bucket for marketing link images if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('marketing-images', 'marketing-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to marketing images
CREATE POLICY "Marketing images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'marketing-images');

-- Allow authenticated users to upload marketing images
CREATE POLICY "Authenticated users can upload marketing images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'marketing-images' AND auth.role() = 'authenticated');

-- Allow authenticated users to delete their marketing images
CREATE POLICY "Authenticated users can delete marketing images"
ON storage.objects FOR DELETE
USING (bucket_id = 'marketing-images' AND auth.role() = 'authenticated');