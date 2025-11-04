-- Add project_id to video_generations table to link videos to projects
ALTER TABLE video_generations
ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES projects(id) ON DELETE CASCADE;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_video_generations_project_id ON video_generations(project_id);

-- Add folders RLS policies for update and delete
CREATE POLICY "Users can update their own folders"
ON folders
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own folders"
ON folders
FOR DELETE
USING (auth.uid() = user_id);

-- Update video_generations RLS policy to work with projects
DROP POLICY IF EXISTS "Users can create their own video generations" ON video_generations;
CREATE POLICY "Users can create their own video generations"
ON video_generations
FOR INSERT
WITH CHECK (
  auth.uid() = user_id 
  AND (
    project_id IS NULL 
    OR EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = video_generations.project_id 
      AND projects.user_id = auth.uid()
    )
  )
);