-- Ensure realtime is properly configured for video_generations table
-- First, remove the table from the publication
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime DROP TABLE video_generations;
EXCEPTION
  WHEN undefined_table THEN NULL;
  WHEN undefined_object THEN NULL;
END $$;

-- Add the table back to the publication
ALTER PUBLICATION supabase_realtime ADD TABLE video_generations;

-- Ensure replica identity is set to FULL to capture all column data
ALTER TABLE video_generations REPLICA IDENTITY FULL;