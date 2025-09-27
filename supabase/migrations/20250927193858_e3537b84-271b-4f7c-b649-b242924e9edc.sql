-- Update actor thumbnail URLs to use Supabase storage URLs
-- The images will be uploaded to the actor-images bucket and accessed via public URLs

UPDATE public.actors 
SET thumbnail_url = 'https://kopclhksdjbheypwsvxz.supabase.co/storage/v1/object/public/actor-images/actor-female-1.jpg'
WHERE name = 'Emma Rodriguez';

UPDATE public.actors 
SET thumbnail_url = 'https://kopclhksdjbheypwsvxz.supabase.co/storage/v1/object/public/actor-images/actor-male-1.jpg'
WHERE name = 'James Chen';

UPDATE public.actors 
SET thumbnail_url = 'https://kopclhksdjbheypwsvxz.supabase.co/storage/v1/object/public/actor-images/actor-female-2.jpg'
WHERE name = 'Zara Williams';

UPDATE public.actors 
SET thumbnail_url = 'https://kopclhksdjbheypwsvxz.supabase.co/storage/v1/object/public/actor-images/actor-male-2.jpg'
WHERE name = 'Michael Thompson';

UPDATE public.actors 
SET thumbnail_url = 'https://kopclhksdjbheypwsvxz.supabase.co/storage/v1/object/public/actor-images/actor-female-3.jpg'
WHERE name = 'Lily Zhang';

UPDATE public.actors 
SET thumbnail_url = 'https://kopclhksdjbheypwsvxz.supabase.co/storage/v1/object/public/actor-images/actor-male-3.jpg'
WHERE name = 'Carlos Martinez';