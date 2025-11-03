-- Enable realtime for video_generations table
ALTER TABLE video_generations REPLICA IDENTITY FULL;

-- Ensure the table is in the realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE video_generations;