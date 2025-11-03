-- Create video_generations table for Sora 2 integration
CREATE TABLE IF NOT EXISTS public.video_generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prompt TEXT NOT NULL,
  image_url TEXT NOT NULL,
  task_id TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'waiting',
  result_url TEXT,
  aspect_ratio TEXT DEFAULT 'landscape',
  n_frames TEXT DEFAULT '10',
  remove_watermark BOOLEAN DEFAULT true,
  fail_code TEXT,
  fail_msg TEXT,
  cost_time INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.video_generations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can create their own video generations"
  ON public.video_generations
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own video generations"
  ON public.video_generations
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own video generations"
  ON public.video_generations
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own video generations"
  ON public.video_generations
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_video_generations_user_id ON public.video_generations(user_id);
CREATE INDEX IF NOT EXISTS idx_video_generations_task_id ON public.video_generations(task_id);
CREATE INDEX IF NOT EXISTS idx_video_generations_status ON public.video_generations(status);

-- Create updated_at trigger
CREATE TRIGGER update_video_generations_updated_at
  BEFORE UPDATE ON public.video_generations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();