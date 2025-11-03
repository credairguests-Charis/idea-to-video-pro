-- Add title field to video_generations table for custom video names
ALTER TABLE video_generations ADD COLUMN title TEXT;

-- Add thumbnail_url field to store video thumbnails
ALTER TABLE video_generations ADD COLUMN thumbnail_url TEXT;