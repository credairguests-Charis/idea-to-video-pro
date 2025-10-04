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

  const { error: authError, status: authStatus } = await verifyAdmin(req, supabase);
  if (authError) {
    return new Response(JSON.stringify({ error: authError }), {
      status: authStatus,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const startTime = Date.now();
  let status = 'online';
  let errorMessage = null;

  try {
    // Test OmniHuman API
    const kieApiKey = Deno.env.get('KIE_API_KEY');
    if (!kieApiKey) {
      throw new Error('KIE_API_KEY not configured');
    }

    const response = await fetch('https://api.kie.ai/api/v1/jobs/createTask', {
      method: 'HEAD',
      headers: {
        'Authorization': `Bearer ${kieApiKey}`
      }
    });

    if (!response.ok && response.status !== 405) { // 405 is expected for HEAD
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

    console.log('Health check completed:', { status, latency, errorMessage });

    return new Response(JSON.stringify({
      service: 'omnihuman',
      status,
      latency,
      errorMessage,
      timestamp: new Date().toISOString()
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

    console.error('Health check failed:', error);

    return new Response(JSON.stringify({
      service: 'omnihuman',
      status: 'down',
      latency,
      errorMessage: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
