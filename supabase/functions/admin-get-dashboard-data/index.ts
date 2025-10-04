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
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    // Get active promo codes
    const { count: activePromos } = await supabase
      .from('promo_codes')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    console.log('Dashboard data fetched successfully');

    return new Response(JSON.stringify({
      users: userCount || 0,
      projects: projectCount || 0,
      generations: generationCount || 0,
      activePromos: activePromos || 0,
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
