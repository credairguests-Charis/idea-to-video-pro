-- Add OmniHuman specific fields to projects table
ALTER TABLE projects ADD COLUMN IF NOT EXISTS omnihuman_task_ids TEXT[];
ALTER TABLE projects ADD COLUMN IF NOT EXISTS omnihuman_video_urls TEXT[];
ALTER TABLE projects ADD COLUMN IF NOT EXISTS audio_source TEXT DEFAULT 'tts';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS tts_settings JSONB;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS generation_status TEXT DEFAULT 'pending';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS generation_progress INTEGER DEFAULT 0;

-- Create OmniHuman generations tracking table
CREATE TABLE IF NOT EXISTS omnihuman_generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES actors(id),
  task_id TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  video_url TEXT,
  audio_url TEXT,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Create audio files tracking table
CREATE TABLE IF NOT EXISTS audio_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL CHECK (source_type IN ('upload', 'tts')),
  file_url TEXT NOT NULL,
  duration_seconds INTEGER,
  file_size_bytes INTEGER,
  tts_settings JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on new tables
ALTER TABLE omnihuman_generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE audio_files ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for omnihuman_generations
CREATE POLICY "Users can view their own generations" 
ON omnihuman_generations 
FOR SELECT 
USING (auth.uid() = (SELECT user_id FROM projects WHERE id = project_id));

CREATE POLICY "Users can create generations" 
ON omnihuman_generations 
FOR INSERT 
WITH CHECK (auth.uid() = (SELECT user_id FROM projects WHERE id = project_id));

CREATE POLICY "Users can update their own generations" 
ON omnihuman_generations 
FOR UPDATE 
USING (auth.uid() = (SELECT user_id FROM projects WHERE id = project_id));

-- Create RLS policies for audio_files
CREATE POLICY "Users can view their own audio files" 
ON audio_files 
FOR SELECT 
USING (auth.uid() = (SELECT user_id FROM projects WHERE id = project_id));

CREATE POLICY "Users can create audio files" 
ON audio_files 
FOR INSERT 
WITH CHECK (auth.uid() = (SELECT user_id FROM projects WHERE id = project_id));

-- Create storage bucket for omnihuman content
INSERT INTO storage.buckets (id, name, public) 
VALUES ('omnihuman-content', 'omnihuman-content', false)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for omnihuman content bucket
CREATE POLICY "Users can upload their own omnihuman content" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'omnihuman-content' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own omnihuman content" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'omnihuman-content' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own omnihuman content" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'omnihuman-content' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own omnihuman content" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'omnihuman-content' AND auth.uid()::text = (storage.foldername(name))[1]);