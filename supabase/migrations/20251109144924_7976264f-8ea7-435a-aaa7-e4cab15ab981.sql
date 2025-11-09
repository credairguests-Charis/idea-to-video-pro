-- Enable realtime for video_generations table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'video_generations'
  ) THEN
    ALTER TABLE public.video_generations REPLICA IDENTITY FULL;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.video_generations;
  END IF;
END $$;

-- Enable realtime for admin_audit_logs table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'admin_audit_logs'
  ) THEN
    ALTER TABLE public.admin_audit_logs REPLICA IDENTITY FULL;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_audit_logs;
  END IF;
END $$;

-- Enable realtime for promo_codes table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'promo_codes'
  ) THEN
    ALTER TABLE public.promo_codes REPLICA IDENTITY FULL;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.promo_codes;
  END IF;
END $$;