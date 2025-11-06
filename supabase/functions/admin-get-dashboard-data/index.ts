import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';
import Stripe from 'https://esm.sh/stripe@18.5.0';

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
    // Get accurate user count from auth.users via RPC
    const { data: userCount } = await supabase.rpc('get_total_user_count');

    // Get paused user count
    const { count: pausedUserCount } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('paused', true);

    // Get project count
    const { count: projectCount } = await supabase
      .from('projects')
      .select('*', { count: 'exact', head: true });

    // Get generation count
    const { count: generationCount } = await supabase
      .from('omnihuman_generations')
      .select('*', { count: 'exact', head: true });

    // Get pending generations
    const { count: pendingCount } = await supabase
      .from('omnihuman_generations')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    // Get failed generations
    const { count: failedCount } = await supabase
      .from('omnihuman_generations')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'failed');

    // Get recent errors
    const { data: recentErrors } = await supabase
      .from('omnihuman_generations')
      .select('id, error_message, project_id, created_at')
      .eq('status', 'failed')
      .order('created_at', { ascending: false })
      .limit(20);

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
      .limit(20);

    // Get active promo codes
    const { count: activePromos } = await supabase
      .from('promo_codes')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    // Fetch Stripe subscription and revenue data
    let activeSubscriptions = 0;
    let monthlyRevenue = 0;
    const historicalRevenue: Array<{ month: string; revenue: number }> = [];
    
    try {
      const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
      if (stripeKey) {
        const stripe = new Stripe(stripeKey, { apiVersion: '2025-08-27.basil' });
        
        // Get all active subscriptions
        const subscriptions = await stripe.subscriptions.list({
          status: 'active',
          limit: 100,
        });
        
        activeSubscriptions = subscriptions.data.length;
        
        // Calculate monthly revenue from active subscriptions
        monthlyRevenue = subscriptions.data.reduce((total, sub) => {
          const subTotal = sub.items.data.reduce((itemTotal, item) => {
            const amount = item.price.unit_amount || 0;
            const quantity = item.quantity || 1;
            return itemTotal + (amount * quantity);
          }, 0);
          return total + subTotal;
        }, 0) / 100;
        
        // Fetch historical revenue data for last 6 months
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const now = new Date();
        
        for (let i = 5; i >= 0; i--) {
          const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
          
          const startTimestamp = Math.floor(monthStart.getTime() / 1000);
          const endTimestamp = Math.floor(monthEnd.getTime() / 1000);
          
          // Fetch charges for this month
          const charges = await stripe.charges.list({
            created: {
              gte: startTimestamp,
              lte: endTimestamp,
            },
            limit: 100,
          });
          
          const monthRevenue = charges.data
            .filter(charge => charge.paid && !charge.refunded)
            .reduce((sum, charge) => sum + charge.amount, 0) / 100;
          
          historicalRevenue.push({
            month: monthNames[monthStart.getMonth()],
            revenue: monthRevenue
          });
        }
        
        console.log('Stripe data fetched:', { activeSubscriptions, monthlyRevenue, historicalRevenue });
      } else {
        console.warn('STRIPE_SECRET_KEY not configured');
      }
    } catch (stripeError) {
      console.error('Error fetching Stripe data:', stripeError);
      // Continue with empty values if Stripe fails
    }

    console.log('Dashboard data fetched successfully');

    return new Response(JSON.stringify({
      users: userCount || 0,
      pausedUsers: pausedUserCount || 0,
      projects: projectCount || 0,
      generations: generationCount || 0,
      activePromos: activePromos || 0,
      queueLength: pendingCount || 0,
      failedJobs: failedCount || 0,
      activeSubscriptions,
      monthlyRevenue,
      historicalRevenue,
      apiHealth: apiHealth?.[0] || { status: 'unknown', checked_at: new Date().toISOString() },
      recentActions: recentActions || [],
      recentErrors: recentErrors || []
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
