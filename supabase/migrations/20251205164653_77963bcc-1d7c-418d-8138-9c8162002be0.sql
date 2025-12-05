-- Create storage bucket for agent uploads
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('agent-uploads', 'agent-uploads', false, 20971520, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf', 'text/plain', 'text/csv', 'application/json', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
ON CONFLICT (id) DO NOTHING;

-- Users can upload their own agent files
CREATE POLICY "Users can upload agent files" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'agent-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Users can view their own agent files
CREATE POLICY "Users can view own agent files" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'agent-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Users can delete their own agent files
CREATE POLICY "Users can delete own agent files" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'agent-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);