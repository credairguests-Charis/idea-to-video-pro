import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function verifyAdmin(req: Request, supabase: any) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader) {
    return { error: 'Unauthorized', status: 401, user: null };
  }

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  
  if (authError || !user) {
    return { error: 'Unauthorized', status: 401, user: null };
  }

  const { data: hasAdminRole } = await supabase
    .rpc('has_role', { _user_id: user.id, _role: 'admin' });

  if (!hasAdminRole) {
    return { error: 'Forbidden: Admin access required', status: 403, user: null };
  }

  return { user, error: null, status: 200 };
}

async function logAdminAction(supabase: any, adminId: string, action: string, details: any, req: Request) {
  await supabase.from('admin_audit_logs').insert({
    admin_id: adminId,
    action,
    details,
    ip_address: req.headers.get('x-forwarded-for') || 'unknown',
    user_agent: req.headers.get('user-agent')
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const { user, error: authError, status } = await verifyAdmin(req, supabase);
  if (authError) {
    return new Response(JSON.stringify({ error: authError }), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    const { code, discountType, discountValue, usageLimit, expiresAt } = await req.json();

    // Validate input
    if (!code || !discountType || !discountValue) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Insert promo code
    const { data: promo, error: promoError } = await supabase
      .from('promo_codes')
      .insert({
        code: code.toUpperCase(),
        discount_type: discountType,
        discount_value: discountValue,
        usage_limit: usageLimit || null,
        expires_at: expiresAt || null,
        created_by: user.id
      })
      .select()
      .single();

    if (promoError) {
      console.error('Error creating promo:', promoError);
      throw promoError;
    }

    // Log admin action
    await logAdminAction(supabase, user.id, 'create_promo', {
      code,
      discountType,
      discountValue
    }, req);

    console.log('Promo created successfully:', code);

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
