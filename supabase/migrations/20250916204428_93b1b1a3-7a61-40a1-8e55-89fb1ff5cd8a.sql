-- Create profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create actors table for AI actor library
CREATE TABLE public.actors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  gender TEXT NOT NULL,
  age_group TEXT NOT NULL,
  ethnicity TEXT,
  accent TEXT,
  emotions TEXT[],
  scenarios TEXT[],
  thumbnail_url TEXT,
  voice_sample_url TEXT,
  is_premium BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for actors (public read access)
ALTER TABLE public.actors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view actors" 
ON public.actors 
FOR SELECT 
USING (true);

-- Create projects table
CREATE TABLE public.projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Untitled Project',
  script TEXT,
  selected_actors UUID[],
  aspect_ratio TEXT DEFAULT 'portrait',
  status TEXT DEFAULT 'draft',
  generated_video_url TEXT,
  thumbnail_url TEXT,
  folder_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Create policies for projects
CREATE POLICY "Users can view their own projects" 
ON public.projects 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create projects" 
ON public.projects 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own projects" 
ON public.projects 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own projects" 
ON public.projects 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create folders table for project organization
CREATE TABLE public.folders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  parent_id UUID REFERENCES public.folders(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;

-- Create policies for folders
CREATE POLICY "Users can view their own folders" 
ON public.folders 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create folders" 
ON public.folders 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create generations table for tracking video generation status
CREATE TABLE public.generations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  actor_id UUID NOT NULL REFERENCES public.actors(id),
  status TEXT DEFAULT 'pending',
  progress INTEGER DEFAULT 0,
  video_url TEXT,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.generations ENABLE ROW LEVEL SECURITY;

-- Create policies for generations
CREATE POLICY "Users can view their own generations" 
ON public.generations 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create generations" 
ON public.generations 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Insert sample actors
INSERT INTO public.actors (name, gender, age_group, ethnicity, accent, emotions, scenarios, thumbnail_url) VALUES
('Morgan', 'Female', '30-40', 'Mixed', 'American', ARRAY['Professional', 'Confident', 'Friendly'], ARRAY['Business', 'Tech', 'Education'], '/actors/morgan.jpg'),
('Kennedy', 'Female', '25-35', 'Caucasian', 'American', ARRAY['Energetic', 'Cheerful', 'Persuasive'], ARRAY['Marketing', 'Social Media', 'Lifestyle'], '/actors/kennedy.jpg'),
('Alex', 'Male', '28-38', 'Hispanic', 'American', ARRAY['Trustworthy', 'Calm', 'Professional'], ARRAY['Finance', 'Healthcare', 'Real Estate'], '/actors/alex.jpg'),
('Sarah', 'Female', '35-45', 'African American', 'American', ARRAY['Authoritative', 'Warm', 'Experienced'], ARRAY['Legal', 'Consulting', 'Corporate'], '/actors/sarah.jpg'),
('David', 'Male', '30-40', 'Asian', 'American', ARRAY['Innovative', 'Smart', 'Approachable'], ARRAY['Tech', 'Startup', 'Innovation'], '/actors/david.jpg');

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_projects_updated_at
    BEFORE UPDATE ON public.projects
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_generations_updated_at
    BEFORE UPDATE ON public.generations
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();