import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting generation failure rate check...');

    // Get current time and one hour ago
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    // Query omnihuman_generations for the last hour
    const { data: omnihumanGens, error: omnihumanError } = await supabase
      .from('omnihuman_generations')
      .select('status')
      .gte('created_at', oneHourAgo.toISOString());

    if (omnihumanError) {
      console.error('Error fetching omnihuman generations:', omnihumanError);
    }

    // Query video_generations for the last hour
    const { data: videoGens, error: videoError } = await supabase
      .from('video_generations')
      .select('status')
      .gte('created_at', oneHourAgo.toISOString());

    if (videoError) {
      console.error('Error fetching video generations:', videoError);
    }

    // Combine both generation types
    const allGenerations = [...(omnihumanGens || []), ...(videoGens || [])];
    const totalGenerations = allGenerations.length;

    if (totalGenerations === 0) {
      console.log('No generations in the last hour');
      return new Response(
        JSON.stringify({ message: 'No generations to check', totalGenerations: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Count failed generations
    const failedGenerations = allGenerations.filter(
      (gen) => gen.status === 'failed' || gen.status === 'error'
    ).length;

    const failureRate = (failedGenerations / totalGenerations) * 100;

    console.log(`Failure rate: ${failureRate.toFixed(2)}% (${failedGenerations}/${totalGenerations})`);

    // Check if failure rate exceeds 10%
    if (failureRate > 10) {
      // Check if we already have an unresolved alert for this issue
      const { data: existingAlerts } = await supabase
        .from('admin_alerts')
        .select('id')
        .eq('alert_type', 'high_failure_rate')
        .is('resolved_at', null)
        .gte('created_at', oneHourAgo.toISOString())
        .limit(1);

      // Only create alert if no recent unresolved alert exists
      if (!existingAlerts || existingAlerts.length === 0) {
        const { error: alertError } = await supabase
          .from('admin_alerts')
          .insert({
            alert_type: 'high_failure_rate',
            severity: failureRate > 25 ? 'critical' : 'warning',
            title: `High Generation Failure Rate: ${failureRate.toFixed(1)}%`,
            message: `${failedGenerations} out of ${totalGenerations} video generations failed in the last hour (${failureRate.toFixed(1)}% failure rate). This exceeds the 10% threshold and requires immediate attention.`,
            metadata: {
              failure_rate: failureRate,
              failed_count: failedGenerations,
              total_count: totalGenerations,
              period: '1_hour',
              timestamp: now.toISOString(),
            },
          });

        if (alertError) {
          console.error('Error creating alert:', alertError);
          throw alertError;
        }

        console.log(`⚠️ ALERT CREATED: High failure rate detected - ${failureRate.toFixed(1)}%`);
      } else {
        console.log('Alert already exists for this issue, skipping duplicate');
      }
    } else {
      console.log('✅ Failure rate is within acceptable limits');
    }

    return new Response(
      JSON.stringify({
        message: 'Check completed',
        failureRate: failureRate.toFixed(2),
        failedGenerations,
        totalGenerations,
        alertCreated: failureRate > 10,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in check-generation-failures:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
