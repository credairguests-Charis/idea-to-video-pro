-- Create admin alerts table
CREATE TABLE IF NOT EXISTS public.admin_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID
);

-- Enable RLS
ALTER TABLE public.admin_alerts ENABLE ROW LEVEL SECURITY;

-- Admins can view all alerts
CREATE POLICY "Admins can view alerts"
  ON public.admin_alerts
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

-- Admins can update alerts (mark as read/resolved)
CREATE POLICY "Admins can update alerts"
  ON public.admin_alerts
  FOR UPDATE
  USING (has_role(auth.uid(), 'admin'));

-- Service role can insert alerts
CREATE POLICY "Service can insert alerts"
  ON public.admin_alerts
  FOR INSERT
  WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX idx_admin_alerts_created_at ON public.admin_alerts(created_at DESC);
CREATE INDEX idx_admin_alerts_is_read ON public.admin_alerts(is_read) WHERE is_read = false;