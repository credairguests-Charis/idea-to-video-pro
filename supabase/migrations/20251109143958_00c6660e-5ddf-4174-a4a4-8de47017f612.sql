-- Enable realtime for health_checks table
ALTER TABLE public.health_checks REPLICA IDENTITY FULL;

-- Add table to realtime publication if not already added
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'health_checks'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.health_checks;
  END IF;
END $$;