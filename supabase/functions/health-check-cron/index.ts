import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function checkSoraAPI(): Promise<{ status: string; latency: number; error?: string }> {
  const startTime = Date.now();
  try {
    const kieApiKey = Deno.env.get('KIE_API_KEY');
    if (!kieApiKey) {
      return { status: 'down', latency: Date.now() - startTime, error: 'KIE_API_KEY not configured' };
    }

    const response = await fetch('https://api.kie.ai/api/v1/jobs/createTask', {
      method: 'HEAD',
      headers: { 'Authorization': `Bearer ${kieApiKey}` },
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    const latency = Date.now() - startTime;
    
    if (response.ok || response.status === 405) { // 405 is expected for HEAD
      return { status: 'online', latency };
    }
    
    return { status: 'warning', latency, error: `HTTP ${response.status}` };
  } catch (error) {
    return { status: 'down', latency: Date.now() - startTime, error: error.message };
  }
}

async function checkStripeAPI(): Promise<{ status: string; latency: number; error?: string }> {
  const startTime = Date.now();
  try {
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) {
      return { status: 'down', latency: Date.now() - startTime, error: 'STRIPE_SECRET_KEY not configured' };
    }

    const response = await fetch('https://api.stripe.com/v1/balance', {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${stripeKey}` },
      signal: AbortSignal.timeout(10000),
    });

    const latency = Date.now() - startTime;
    
    if (response.ok) {
      return { status: 'online', latency };
    }
    
    return { status: 'warning', latency, error: `HTTP ${response.status}` };
  } catch (error) {
    return { status: 'down', latency: Date.now() - startTime, error: error.message };
  }
}

async function checkSupabaseStorage(supabase: any): Promise<{ status: string; latency: number; error?: string }> {
  const startTime = Date.now();
  try {
    const { data, error } = await supabase.storage.listBuckets();
    
    const latency = Date.now() - startTime;
    
    if (error) {
      return { status: 'down', latency, error: error.message };
    }
    
    return { status: 'online', latency };
  } catch (error) {
    return { status: 'down', latency: Date.now() - startTime, error: error.message };
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  console.log('Starting health checks...');

  try {
    // Run all health checks in parallel
    const [soraResult, stripeResult, storageResult] = await Promise.all([
      checkSoraAPI(),
      checkStripeAPI(),
      checkSupabaseStorage(supabase),
    ]);

    console.log('Health check results:', { soraResult, stripeResult, storageResult });

    // Insert all results into the database
    const insertPromises = [
      supabase.from('health_checks').insert({
        service_name: 'sora',
        status: soraResult.status,
        latency: soraResult.latency,
        error_message: soraResult.error || null,
      }),
      supabase.from('health_checks').insert({
        service_name: 'stripe',
        status: stripeResult.status,
        latency: stripeResult.latency,
        error_message: stripeResult.error || null,
      }),
      supabase.from('health_checks').insert({
        service_name: 'storage',
        status: storageResult.status,
        latency: storageResult.latency,
        error_message: storageResult.error || null,
      }),
    ];

    await Promise.all(insertPromises);

    console.log('Health check results saved to database');

    return new Response(
      JSON.stringify({
        success: true,
        results: {
          sora: soraResult,
          stripe: stripeResult,
          storage: storageResult,
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Health check failed:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
