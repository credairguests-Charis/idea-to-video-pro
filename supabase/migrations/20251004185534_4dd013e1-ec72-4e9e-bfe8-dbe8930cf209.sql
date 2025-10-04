-- Create app_role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  created_by uuid REFERENCES auth.users(id),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS Policies for user_roles
CREATE POLICY "Admins can view all roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can assign roles"
ON public.user_roles FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete roles"
ON public.user_roles FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Create admin_profiles table
CREATE TABLE public.admin_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  display_name text,
  notes text,
  created_at timestamptz DEFAULT now() NOT NULL,
  last_login_at timestamptz
);

ALTER TABLE public.admin_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view admin profiles"
ON public.admin_profiles FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Create promo_codes table
CREATE TABLE public.promo_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  discount_type text NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value numeric NOT NULL CHECK (discount_value > 0),
  usage_limit integer DEFAULT NULL CHECK (usage_limit IS NULL OR usage_limit > 0),
  usage_count integer DEFAULT 0 NOT NULL,
  expires_at timestamptz,
  stripe_coupon_id text,
  is_active boolean DEFAULT true NOT NULL,
  created_by uuid REFERENCES auth.users(id) NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage promo codes"
ON public.promo_codes FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_promo_codes_code ON public.promo_codes(code);
CREATE INDEX idx_promo_codes_active ON public.promo_codes(is_active);

-- Create promo_links table
CREATE TABLE public.promo_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL UNIQUE,
  promo_code_id uuid REFERENCES public.promo_codes(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  usage_count integer DEFAULT 0 NOT NULL,
  max_uses integer DEFAULT 1 NOT NULL,
  created_by uuid REFERENCES auth.users(id) NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.promo_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage promo links"
ON public.promo_links FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_promo_links_token ON public.promo_links(token);

-- Create admin_audit_logs table
CREATE TABLE public.admin_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid REFERENCES auth.users(id) NOT NULL,
  action text NOT NULL,
  target_type text,
  target_id uuid,
  details jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit logs"
ON public.admin_audit_logs FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_audit_logs_admin ON public.admin_audit_logs(admin_id);
CREATE INDEX idx_audit_logs_created ON public.admin_audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_action ON public.admin_audit_logs(action);

-- Create api_health table
CREATE TABLE public.api_health (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_name text NOT NULL,
  status text NOT NULL CHECK (status IN ('online', 'warning', 'down')),
  latency_ms integer,
  error_message text,
  details jsonb,
  checked_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.api_health ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view api health"
ON public.api_health FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert api health"
ON public.api_health FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_api_health_service ON public.api_health(service_name);
CREATE INDEX idx_api_health_checked ON public.api_health(checked_at DESC);

-- Trigger for promo_codes updated_at
CREATE TRIGGER update_promo_codes_updated_at
BEFORE UPDATE ON public.promo_codes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();