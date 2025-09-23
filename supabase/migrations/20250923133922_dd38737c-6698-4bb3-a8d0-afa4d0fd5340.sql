-- Insert realistic UGC-style actors data
INSERT INTO public.actors (id, name, gender, age_group, ethnicity, accent, emotions, scenarios, thumbnail_url, is_premium) VALUES
(
  gen_random_uuid(),
  'Emma Rodriguez',
  'Female',
  '25-35',
  'Hispanic',
  'American',
  ARRAY['Enthusiastic', 'Friendly', 'Professional'],
  ARRAY['Product Review', 'Testimonial', 'Tutorial'],
  '/src/assets/actors/actor-female-1.jpg',
  false
),
(
  gen_random_uuid(),
  'James Chen',
  'Male', 
  '25-35',
  'Asian',
  'American',
  ARRAY['Confident', 'Trustworthy', 'Engaging'],
  ARRAY['Business Pitch', 'Product Demo', 'Explainer'],
  '/src/assets/actors/actor-male-1.jpg',
  false
),
(
  gen_random_uuid(),
  'Zara Williams',
  'Female',
  '20-30', 
  'Black',
  'American',
  ARRAY['Energetic', 'Authentic', 'Relatable'],
  ARRAY['Lifestyle', 'Fashion', 'Beauty'],
  '/src/assets/actors/actor-female-2.jpg',
  true
),
(
  gen_random_uuid(),
  'Michael Thompson',
  'Male',
  '35-45',
  'Caucasian', 
  'American',
  ARRAY['Professional', 'Authoritative', 'Warm'],
  ARRAY['Corporate Message', 'Training', 'Leadership'],
  '/src/assets/actors/actor-male-2.jpg',
  false
),
(
  gen_random_uuid(),
  'Lily Zhang',
  'Female',
  '20-30',
  'Asian',
  'American',
  ARRAY['Passionate', 'Creative', 'Inspiring'],
  ARRAY['Creative Content', 'Art Tutorial', 'Motivation'],
  '/src/assets/actors/actor-female-3.jpg',
  true
),
(
  gen_random_uuid(),
  'Carlos Martinez',
  'Male',
  '25-35',
  'Hispanic',
  'American',
  ARRAY['Charismatic', 'Dynamic', 'Persuasive'],
  ARRAY['Sales Pitch', 'Marketing', 'Social Media'],
  '/src/assets/actors/actor-male-3.jpg',
  false
)
ON CONFLICT (id) DO NOTHING;