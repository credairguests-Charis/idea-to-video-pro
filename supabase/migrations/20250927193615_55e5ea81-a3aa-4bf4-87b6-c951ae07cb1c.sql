-- Upload actor images to Supabase storage and update URLs
-- First, create a function to handle the actor image uploads

-- Create a bucket for actor images if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('actor-images', 'actor-images', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for actor images
CREATE POLICY "Anyone can view actor images" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'actor-images');

CREATE POLICY "Service role can manage actor images" 
ON storage.objects 
FOR ALL 
USING (bucket_id = 'actor-images');