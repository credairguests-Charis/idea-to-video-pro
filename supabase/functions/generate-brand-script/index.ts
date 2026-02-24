import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ success: false, error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { brandData, userIntent } = await req.json();

    if (!brandData) {
      return new Response(
        JSON.stringify({ success: false, error: 'Brand data is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const systemPrompt = `You are a world-class UGC ad copywriter who creates scroll-stopping, high-converting short-form video scripts for TikTok, Instagram Reels, and YouTube Shorts.

Given brand information scraped from a website, you must:
1. Identify the brand's core product(s), value proposition, and target audience
2. Write a compelling 14-second UGC-style video script
3. Extract the most likely product image URL from the scraped content

Your output MUST be valid JSON with this exact structure:
{
  "script": "The complete video script with timing markers and directions",
  "productImageUrl": "The best product image URL found in the content, or null if none found",
  "brandName": "The brand name",
  "productName": "The main product name",
  "targetAudience": "Brief description of target audience",
  "hookLine": "The attention-grabbing opening line"
}

Script format guidelines:
- Hook (0-3s): Bold statement, question, or surprising visual that stops the scroll
- Body (4-12s): Deliver value, showcase product benefits naturally
- CTA (13-15s): Clear call-to-action (e.g., "Check it out", "Link in bio", "Use code X")
- Keep tone conversational, authentic, NOT salesy
- Write as if a real person is talking to their phone camera
- Include stage directions in brackets like [holds product up] or [shows phone screen]

For product image extraction:
- Look for img URLs in the scraped content that show products
- Prioritize URLs containing words like "product", "hero", "featured", "main"
- Look for og:image meta tags
- If multiple images found, pick the most product-focused one
- Return the full absolute URL`;

    const userMessage = `Here is the brand information scraped from their website:

**URL:** ${brandData.url}
**Title:** ${brandData.title}
**Description:** ${brandData.description}

**Page Content:**
${brandData.content}

${userIntent ? `**User's specific intent/direction:** ${userIntent}` : 'Generate a general product promotion UGC script.'}

Analyze this brand and generate a UGC video script. Return ONLY valid JSON.`;

    console.log('Generating brand script for:', brandData.title || brandData.url);

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ success: false, error: 'AI rate limit exceeded. Please try again in a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ success: false, error: 'AI credits depleted. Please add funds.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errText = await response.text();
      console.error('AI gateway error:', response.status, errText);
      return new Response(
        JSON.stringify({ success: false, error: 'AI generation failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await response.json();
    const rawContent = aiData.choices?.[0]?.message?.content || '';

    console.log('AI raw response length:', rawContent.length);

    // Parse JSON from response (handle markdown code blocks)
    let parsed;
    try {
      // Try direct parse first
      parsed = JSON.parse(rawContent);
    } catch {
      // Try extracting from markdown code block
      const jsonMatch = rawContent.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[1].trim());
      } else {
        // Try finding JSON object in the text
        const braceMatch = rawContent.match(/\{[\s\S]*\}/);
        if (braceMatch) {
          parsed = JSON.parse(braceMatch[0]);
        } else {
          throw new Error('Could not parse AI response as JSON');
        }
      }
    }

    console.log('Script generated for brand:', parsed.brandName);

    return new Response(
      JSON.stringify({ success: true, data: parsed }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error generating brand script:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Failed to generate script' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
