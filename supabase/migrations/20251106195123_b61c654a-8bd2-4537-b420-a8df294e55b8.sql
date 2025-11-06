-- Add order field to projects table for drag-and-drop reordering
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;

-- Create index for better query performance when ordering
CREATE INDEX IF NOT EXISTS idx_projects_folder_order ON public.projects(folder_id, display_order);

-- Update existing projects to have sequential order within their folders
WITH ranked_projects AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (PARTITION BY COALESCE(folder_id::text, 'null') ORDER BY created_at) as rn
  FROM public.projects
)
UPDATE public.projects
SET display_order = (ranked_projects.rn - 1) * 100
FROM ranked_projects
WHERE projects.id = ranked_projects.id;