-- Create agent-uploads storage bucket for video downloads
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'agent-uploads',
  'agent-uploads',
  true,
  104857600, -- 100MB limit
  ARRAY['video/mp4', 'video/webm', 'video/quicktime', 'image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Create agent-videos bucket for downloaded competitor videos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'agent-videos',
  'agent-videos',
  true,
  209715200, -- 200MB limit for videos
  ARRAY['video/mp4', 'video/webm', 'video/quicktime', 'video/mpeg', 'video/x-msvideo']
)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to agent-uploads
CREATE POLICY "Public read access for agent-uploads"
ON storage.objects FOR SELECT
USING (bucket_id = 'agent-uploads');

-- Allow authenticated users to upload to agent-uploads
CREATE POLICY "Authenticated users can upload to agent-uploads"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'agent-uploads' AND auth.role() = 'authenticated');

-- Allow public read access to agent-videos
CREATE POLICY "Public read access for agent-videos"
ON storage.objects FOR SELECT
USING (bucket_id = 'agent-videos');

-- Allow service role to upload to agent-videos (for edge functions)
CREATE POLICY "Service role can upload to agent-videos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'agent-videos');