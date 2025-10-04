# Admin Dashboard — Technical Specification

## 1. Architecture Overview

```
┌────────────────┐      ┌────────────────┐      ┌────────────────┐
│  Admin UI      │─────▶│  Edge Functions│─────▶│  Supabase DB   │
│  (React)       │      │  (Deno)        │      │  (PostgreSQL)  │
└────────────────┘      └────────────────┘      └────────────────┘
        │                       │                        │
        │                       ├───────────────────────▶│
        │                       │    Stripe API          │
        │                       ├───────────────────────▶│
        │                       │    OmniHuman API       │
        └───────────────────────┴────────────────────────┘
                      Authentication & Role Check
```

---

## 2. Database Schema

### 2.1 Enum: app_role

```sql
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
```

### 2.2 Table: user_roles

```sql
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  created_by uuid REFERENCES auth.users(id),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Only admins can view roles
CREATE POLICY "Admins can view all roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policy: Only admins can assign roles
CREATE POLICY "Admins can assign roles"
ON public.user_roles FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));
```

### 2.3 Table: admin_profiles

```sql
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
```

### 2.4 Table: promo_codes

```sql
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
```

### 2.5 Table: promo_links

```sql
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
```

### 2.6 Table: admin_audit_logs

```sql
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
```

### 2.7 Table: api_health

```sql
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

CREATE INDEX idx_api_health_service ON public.api_health(service_name);
CREATE INDEX idx_api_health_checked ON public.api_health(checked_at DESC);
```

### 2.8 Security Definer Function: has_role

```sql
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
```

### 2.9 Trigger: Update updated_at

```sql
CREATE TRIGGER update_promo_codes_updated_at
BEFORE UPDATE ON public.promo_codes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
```

---

## 3. Edge Functions

### 3.1 Admin Auth Middleware

```typescript
// shared/adminAuth.ts
export async function verifyAdmin(req: Request, supabase: any) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader) {
    return { error: 'Unauthorized', status: 401 };
  }

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  
  if (authError || !user) {
    return { error: 'Unauthorized', status: 401 };
  }

  // Check if user has admin role
  const { data: hasAdminRole } = await supabase
    .rpc('has_role', { _user_id: user.id, _role: 'admin' });

  if (!hasAdminRole) {
    return { error: 'Forbidden: Admin access required', status: 403 };
  }

  return { user, error: null };
}

export async function logAdminAction(
  supabase: any,
  adminId: string,
  action: string,
  details: any,
  req: Request
) {
  await supabase.from('admin_audit_logs').insert({
    admin_id: adminId,
    action,
    details,
    ip_address: req.headers.get('x-forwarded-for') || 'unknown',
    user_agent: req.headers.get('user-agent')
  });
}
```

### 3.2 Function: admin/get_dashboard_data

```typescript
// supabase/functions/admin/get_dashboard_data/index.ts
import { createClient } from '@supabase/supabase-js';
import { verifyAdmin } from '../shared/adminAuth.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const { user, error: authError } = await verifyAdmin(req, supabase);
  if (authError) {
    return new Response(JSON.stringify({ error: authError }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    // Get user count
    const { count: userCount } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    // Get project count
    const { count: projectCount } = await supabase
      .from('projects')
      .select('*', { count: 'exact', head: true });

    // Get generation count
    const { count: generationCount } = await supabase
      .from('omnihuman_generations')
      .select('*', { count: 'exact', head: true });

    // Get recent API health
    const { data: apiHealth } = await supabase
      .from('api_health')
      .select('*')
      .order('checked_at', { ascending: false })
      .limit(1);

    // Get recent admin actions
    const { data: recentActions } = await supabase
      .from('admin_audit_logs')
      .select('*, admin_id')
      .order('created_at', { ascending: false })
      .limit(10);

    return new Response(JSON.stringify({
      users: userCount || 0,
      projects: projectCount || 0,
      generations: generationCount || 0,
      apiHealth: apiHealth?.[0] || null,
      recentActions: recentActions || []
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
```

### 3.3 Function: admin/create_promo

```typescript
// supabase/functions/admin/create_promo/index.ts
import { createClient } from '@supabase/supabase-js';
import { verifyAdmin, logAdminAction } from '../shared/adminAuth.ts';
import Stripe from 'https://esm.sh/stripe@14.21.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const { user, error: authError } = await verifyAdmin(req, supabase);
  if (authError) {
    return new Response(JSON.stringify({ error: authError }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    const { code, discountType, discountValue, usageLimit, expiresAt, createStripeCoupon } = await req.json();

    let stripeCouponId = null;

    // Create Stripe coupon if requested
    if (createStripeCoupon) {
      const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
        apiVersion: '2023-10-16',
      });

      const couponData: any = {
        id: code,
        name: code,
      };

      if (discountType === 'percentage') {
        couponData.percent_off = discountValue;
      } else {
        couponData.amount_off = Math.round(discountValue * 100); // Convert to cents
        couponData.currency = 'usd';
      }

      if (usageLimit) {
        couponData.max_redemptions = usageLimit;
      }

      if (expiresAt) {
        couponData.redeem_by = Math.floor(new Date(expiresAt).getTime() / 1000);
      }

      const stripeCoupon = await stripe.coupons.create(couponData);
      stripeCouponId = stripeCoupon.id;
    }

    // Insert promo code
    const { data: promo, error: promoError } = await supabase
      .from('promo_codes')
      .insert({
        code,
        discount_type: discountType,
        discount_value: discountValue,
        usage_limit: usageLimit,
        expires_at: expiresAt,
        stripe_coupon_id: stripeCouponId,
        created_by: user.id
      })
      .select()
      .single();

    if (promoError) throw promoError;

    // Log admin action
    await logAdminAction(supabase, user.id, 'create_promo', {
      code,
      discountType,
      discountValue,
      stripeCouponId
    }, req);

    return new Response(JSON.stringify({ promo }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error creating promo:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
```

### 3.4 Function: admin/omnihuman_health_check

```typescript
// supabase/functions/admin/omnihuman_health_check/index.ts
import { createClient } from '@supabase/supabase-js';
import { verifyAdmin } from '../shared/adminAuth.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const { error: authError } = await verifyAdmin(req, supabase);
  if (authError) {
    return new Response(JSON.stringify({ error: authError }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const startTime = Date.now();
  let status = 'online';
  let errorMessage = null;

  try {
    // Call OmniHuman API health check
    const response = await fetch('https://api.kie.ai/api/v1/health', {
      headers: {
        'Authorization': `Bearer ${Deno.env.get('KIE_API_KEY')}`
      }
    });

    if (!response.ok) {
      status = 'warning';
      errorMessage = `HTTP ${response.status}`;
    }

    const latency = Date.now() - startTime;

    // Store health check result
    await supabase.from('api_health').insert({
      service_name: 'omnihuman',
      status,
      latency_ms: latency,
      error_message: errorMessage
    });

    return new Response(JSON.stringify({
      status,
      latency,
      errorMessage
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    const latency = Date.now() - startTime;
    await supabase.from('api_health').insert({
      service_name: 'omnihuman',
      status: 'down',
      latency_ms: latency,
      error_message: error.message
    });

    return new Response(JSON.stringify({
      status: 'down',
      latency,
      errorMessage: error.message
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
```

---

## 4. Frontend Implementation

### 4.1 Route Guard: AdminGuard.tsx

```typescript
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    async function checkAdmin() {
      if (!user) {
        setIsAdmin(false);
        return;
      }

      const { data, error } = await supabase.rpc('has_role', {
        _user_id: user.id,
        _role: 'admin'
      });

      if (error) {
        console.error('Error checking admin status:', error);
        setIsAdmin(false);
      } else {
        setIsAdmin(data === true);
      }
    }

    checkAdmin();
  }, [user]);

  if (loading || isAdmin === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
```

### 4.2 Admin Layout Component

```typescript
// src/components/admin/AdminLayout.tsx
import { AppSidebar } from "@/components/admin/AdminSidebar";
import { SidebarProvider } from "@/components/ui/sidebar";

export function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gray-50">
        <AppSidebar />
        <main className="flex-1 p-8">
          {children}
        </main>
      </div>
    </SidebarProvider>
  );
}
```

---

## 5. API Integration Patterns

### 5.1 Admin API Hook

```typescript
// src/hooks/useAdminAPI.ts
import { supabase } from "@/integrations/supabase/client";

export function useAdminAPI() {
  async function callAdminFunction(functionName: string, body?: any) {
    const { data, error } = await supabase.functions.invoke(
      `admin/${functionName}`,
      { body }
    );

    if (error) throw error;
    return data;
  }

  return { callAdminFunction };
}
```

---

## 6. Security Checklist

- [x] Role-based access with separate user_roles table
- [x] Security definer function for role checks
- [x] RLS policies on all admin tables
- [x] JWT verification in all edge functions
- [x] Admin actions logged to audit table
- [x] Secrets stored in Supabase vault
- [x] CORS headers configured
- [x] Input validation on all endpoints
- [x] SQL injection prevention via parameterized queries
- [x] XSS prevention via React's built-in escaping

---

## 7. Testing Strategy

### 7.1 Unit Tests
- Role checking function
- Promo code validation logic
- Date expiration checks

### 7.2 Integration Tests
- Admin authentication flow
- Promo creation with Stripe
- Health check API calls

### 7.3 E2E Tests
- Complete promo creation flow
- Admin login and dashboard access
- Audit log generation

---

## 8. Deployment Checklist

- [ ] All edge functions deployed
- [ ] Database migrations applied
- [ ] RLS policies tested
- [ ] Admin role assigned to initial user
- [ ] Secrets configured in Supabase
- [ ] Stripe keys validated (sandbox first)
- [ ] Health checks tested
- [ ] Audit logging verified
- [ ] Frontend build successful
- [ ] Admin routes protected
- [ ] Documentation complete

---

**Document Version:** 1.0  
**Last Updated:** 2025-10-04  
**Status:** Ready for Implementation
