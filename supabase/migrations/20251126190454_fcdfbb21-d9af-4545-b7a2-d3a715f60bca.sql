-- Create invite_links table
CREATE TABLE public.invite_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  expires_at timestamptz NOT NULL,
  max_uses integer DEFAULT NULL,
  current_uses integer DEFAULT 0 NOT NULL,
  revoked boolean DEFAULT false NOT NULL,
  created_by uuid NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Create invite_link_usages table
CREATE TABLE public.invite_link_usages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invite_id uuid REFERENCES public.invite_links(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  used_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.invite_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invite_link_usages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for invite_links
CREATE POLICY "Admins can manage invite links"
ON public.invite_links
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view non-revoked active invite links"
ON public.invite_links
FOR SELECT
TO anon, authenticated
USING (revoked = false AND expires_at > now());

-- RLS Policies for invite_link_usages
CREATE POLICY "Admins can view all invite usages"
ON public.invite_link_usages
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service can insert invite usages"
ON public.invite_link_usages
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Create index for faster slug lookup
CREATE INDEX idx_invite_links_slug ON public.invite_links(slug);
CREATE INDEX idx_invite_link_usages_invite_id ON public.invite_link_usages(invite_id);