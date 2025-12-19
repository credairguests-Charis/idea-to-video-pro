-- Update default credits for new profiles from 0 to 210
ALTER TABLE public.profiles ALTER COLUMN credits SET DEFAULT 210;

-- Update default initial_credits for marketing_links from 105 to 210
ALTER TABLE public.marketing_links ALTER COLUMN initial_credits SET DEFAULT 210;

-- Update default credited_amount for marketing_link_usages from 105 to 210
ALTER TABLE public.marketing_link_usages ALTER COLUMN credited_amount SET DEFAULT 210;