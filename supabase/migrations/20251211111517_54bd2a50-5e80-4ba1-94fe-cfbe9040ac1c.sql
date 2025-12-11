-- Enable pgvector extension if not already enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- Ad embeddings table for vector store
CREATE TABLE IF NOT EXISTS public.ad_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.agent_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  embedding vector(1536),
  ad_type TEXT,
  brand_name TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Ad audit reports table
CREATE TABLE IF NOT EXISTS public.ad_audit_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.agent_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  brand_name TEXT NOT NULL,
  report_url TEXT,
  report_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Competitor videos table for storing scraped video data
CREATE TABLE IF NOT EXISTS public.competitor_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.agent_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  video_url TEXT NOT NULL,
  storage_path TEXT,
  thumbnail_url TEXT,
  frames JSONB DEFAULT '[]'::jsonb,
  ad_copy TEXT,
  cta_text TEXT,
  advertiser_name TEXT,
  analysis JSONB DEFAULT '{}'::jsonb,
  embedding vector(1536),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Scraping cache for reducing redundant requests
CREATE TABLE IF NOT EXISTS public.scraping_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url_hash TEXT UNIQUE NOT NULL,
  url TEXT NOT NULL,
  scraped_data JSONB NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ad_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_audit_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competitor_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scraping_cache ENABLE ROW LEVEL SECURITY;

-- RLS policies for ad_embeddings
CREATE POLICY "Users can view their own embeddings" ON public.ad_embeddings
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own embeddings" ON public.ad_embeddings
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Service can manage all embeddings" ON public.ad_embeddings
  FOR ALL USING (true) WITH CHECK (true);

-- RLS policies for ad_audit_reports
CREATE POLICY "Users can view their own reports" ON public.ad_audit_reports
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own reports" ON public.ad_audit_reports
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Service can manage all reports" ON public.ad_audit_reports
  FOR ALL USING (true) WITH CHECK (true);

-- RLS policies for competitor_videos
CREATE POLICY "Users can view their own videos" ON public.competitor_videos
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own videos" ON public.competitor_videos
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Service can manage all videos" ON public.competitor_videos
  FOR ALL USING (true) WITH CHECK (true);

-- RLS policies for scraping_cache (public read for caching efficiency)
CREATE POLICY "Anyone can read cache" ON public.scraping_cache
  FOR SELECT USING (true);
CREATE POLICY "Service can manage cache" ON public.scraping_cache
  FOR ALL USING (true) WITH CHECK (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_ad_embeddings_user_id ON public.ad_embeddings(user_id);
CREATE INDEX IF NOT EXISTS idx_ad_embeddings_session_id ON public.ad_embeddings(session_id);
CREATE INDEX IF NOT EXISTS idx_ad_audit_reports_user_id ON public.ad_audit_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_competitor_videos_session_id ON public.competitor_videos(session_id);
CREATE INDEX IF NOT EXISTS idx_scraping_cache_url_hash ON public.scraping_cache(url_hash);
CREATE INDEX IF NOT EXISTS idx_scraping_cache_expires ON public.scraping_cache(expires_at);

-- Vector similarity search function
CREATE OR REPLACE FUNCTION public.match_ad_embeddings(
  query_embedding vector(1536),
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 5,
  filter_user_id UUID DEFAULT NULL,
  filter_brand_name TEXT DEFAULT NULL
) RETURNS TABLE (
  id UUID,
  user_id UUID,
  content TEXT,
  ad_type TEXT,
  brand_name TEXT,
  metadata JSONB,
  similarity FLOAT
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ad_embeddings.id,
    ad_embeddings.user_id,
    ad_embeddings.content,
    ad_embeddings.ad_type,
    ad_embeddings.brand_name,
    ad_embeddings.metadata,
    1 - (ad_embeddings.embedding <=> query_embedding) as similarity
  FROM public.ad_embeddings
  WHERE 
    (filter_user_id IS NULL OR ad_embeddings.user_id = filter_user_id)
    AND (filter_brand_name IS NULL OR ad_embeddings.brand_name ILIKE '%' || filter_brand_name || '%')
    AND 1 - (ad_embeddings.embedding <=> query_embedding) > match_threshold
  ORDER BY ad_embeddings.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;