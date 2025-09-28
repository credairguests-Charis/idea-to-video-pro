import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Running OmniHuman API diagnostic test...');

    // Use the sample URLs from the API documentation
    const sampleRequest = {
      model: 'bytedance/omni-human',
      input: {
        image: 'https://file.aiquickdraw.com/custom-page/akr/section-images/1755620016758q9qg3ne4.webp',
        audio: 'https://file.aiquickdraw.com/custom-page/akr/section-images/1755620030056oe0opt2i.MP3'
      },
      callBackUrl: `${Deno.env.get('SUPABASE_URL')}/functions/v1/omnihuman-webhook`
    };

    console.log('Testing with sample request:', JSON.stringify(sampleRequest, null, 2));

    // First, check if the sample URLs are accessible
    console.log('Checking sample image accessibility...');
    const imageCheck = await fetch(sampleRequest.input.image, { method: 'HEAD' });
    console.log(`Sample image check: ${imageCheck.status} ${imageCheck.statusText}`);

    console.log('Checking sample audio accessibility...');
    const audioCheck = await fetch(sampleRequest.input.audio, { method: 'HEAD' });
    console.log(`Sample audio check: ${audioCheck.status} ${audioCheck.statusText}`);

    // Now test the KIE API
    console.log('Calling KIE API with sample data...');
    const omniResponse = await fetch('https://api.kie.ai/api/v1/jobs/createTask', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('KIE_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(sampleRequest),
    });

    console.log(`KIE API response status: ${omniResponse.status} ${omniResponse.statusText}`);

    const responseText = await omniResponse.text();
    console.log(`KIE API response body: ${responseText}`);

    let responseData = null;
    try {
      responseData = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse KIE API response as JSON:', parseError);
    }

    const diagnostic = {
      timestamp: new Date().toISOString(),
      apiKey: Deno.env.get('KIE_API_KEY') ? 'Present' : 'Missing',
      sampleImageAccessible: imageCheck.ok,
      sampleAudioAccessible: audioCheck.ok,
      kieApiStatus: omniResponse.status,
      kieApiStatusText: omniResponse.statusText,
      kieApiResponse: responseData || responseText,
      success: omniResponse.ok && responseData?.code === 200 && responseData?.data?.taskId
    };

    console.log('Diagnostic results:', JSON.stringify(diagnostic, null, 2));

    return new Response(JSON.stringify(diagnostic), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Diagnostic error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});