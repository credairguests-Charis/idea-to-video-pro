-- Add credits column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS credits INTEGER DEFAULT 0;

-- Create transaction_logs table for credit tracking
CREATE TABLE IF NOT EXISTS transaction_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  credits_change INTEGER NOT NULL,
  reason TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create marketing_links table
CREATE TABLE IF NOT EXISTS marketing_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  initial_credits INTEGER NOT NULL DEFAULT 105,
  expires_at TIMESTAMPTZ NOT NULL,
  max_uses INTEGER,
  current_uses INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  revoked BOOLEAN NOT NULL DEFAULT false,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create marketing_link_logos table
CREATE TABLE IF NOT EXISTS marketing_link_logos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  marketing_link_id UUID NOT NULL REFERENCES marketing_links(id) ON DELETE CASCADE,
  logo_url TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create marketing_link_usages table
CREATE TABLE IF NOT EXISTS marketing_link_usages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  marketing_link_id UUID NOT NULL REFERENCES marketing_links(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  credited_amount INTEGER NOT NULL DEFAULT 105,
  credits_spent INTEGER NOT NULL DEFAULT 0,
  signup_timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  device_info TEXT,
  referrer TEXT,
  utm_parameters JSONB DEFAULT '{}'::jsonb
);

-- Create marketing_link_clicks table
CREATE TABLE IF NOT EXISTS marketing_link_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  marketing_link_id UUID NOT NULL REFERENCES marketing_links(id) ON DELETE CASCADE,
  clicked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  hashed_ip TEXT,
  user_agent TEXT
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_transaction_logs_user_id ON transaction_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_transaction_logs_created_at ON transaction_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_marketing_links_slug ON marketing_links(slug);
CREATE INDEX IF NOT EXISTS idx_marketing_link_usages_link_id ON marketing_link_usages(marketing_link_id);
CREATE INDEX IF NOT EXISTS idx_marketing_link_usages_user_id ON marketing_link_usages(user_id);
CREATE INDEX IF NOT EXISTS idx_marketing_link_clicks_link_id ON marketing_link_clicks(marketing_link_id);

-- RLS Policies for transaction_logs
ALTER TABLE transaction_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own transaction logs"
  ON transaction_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service can insert transaction logs"
  ON transaction_logs FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can view all transaction logs"
  ON transaction_logs FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for marketing_links
ALTER TABLE marketing_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage marketing links"
  ON marketing_links FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view active non-revoked marketing links"
  ON marketing_links FOR SELECT
  USING (is_active = true AND revoked = false);

-- RLS Policies for marketing_link_logos
ALTER TABLE marketing_link_logos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage marketing link logos"
  ON marketing_link_logos FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view logos for active links"
  ON marketing_link_logos FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM marketing_links 
    WHERE marketing_links.id = marketing_link_logos.marketing_link_id 
    AND marketing_links.is_active = true 
    AND marketing_links.revoked = false
  ));

-- RLS Policies for marketing_link_usages
ALTER TABLE marketing_link_usages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all marketing link usages"
  ON marketing_link_usages FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service can insert marketing link usages"
  ON marketing_link_usages FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can view their own usage"
  ON marketing_link_usages FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policies for marketing_link_clicks
ALTER TABLE marketing_link_clicks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all marketing link clicks"
  ON marketing_link_clicks FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service can insert marketing link clicks"
  ON marketing_link_clicks FOR INSERT
  WITH CHECK (true);