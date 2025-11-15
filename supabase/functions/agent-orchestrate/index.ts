import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { sessionId, userId, brandContext } = await req.json();

    console.log(`Starting orchestration for session ${sessionId}`);

    // Start orchestration asynchronously
    orchestrateAgentWorkflow(supabase, sessionId, userId, brandContext).catch(error => {
      console.error('Orchestration error:', error);
    });

    return new Response(
      JSON.stringify({ success: true, message: 'Orchestration started' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error) {
    console.error('Error in agent-orchestrate:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});

// Main orchestration function that runs the agent workflow
async function orchestrateAgentWorkflow(
  supabase: any,
  sessionId: string,
  userId: string,
  brandContext: string
) {
  const steps = [
    { name: 'analyze_brand', label: 'Analyzing brand memory', percentage: 10 },
    { name: 'research_competitors', label: 'Researching competitors', percentage: 25 },
    { name: 'analyze_trends', label: 'Analyzing trends', percentage: 40 },
    { name: 'generate_concepts', label: 'Generating concepts', percentage: 55 },
    { name: 'generate_scripts', label: 'Generating scripts', percentage: 70 },
    { name: 'await_approval', label: 'Awaiting script approval', percentage: 75 },
    { name: 'generate_videos', label: 'Generating videos', percentage: 90 },
    { name: 'update_memory', label: 'Updating memory', percentage: 100 },
  ];

  try {
    for (const step of steps) {
      await logStep(supabase, sessionId, step.name, 'started', { label: step.label });
      
      await updateSession(supabase, sessionId, {
        state: step.name,
        current_step: step.label,
        progress: step.percentage,
      });

      // Execute step logic
      const result = await executeStep(supabase, step.name, sessionId, userId, brandContext);
      
      if (!result.success) {
        throw new Error(result.error || `Step ${step.name} failed`);
      }

      await logStep(supabase, sessionId, step.name, 'completed', { 
        output: result.data 
      });

      // If we're at approval step, pause and wait for user approval
      if (step.name === 'await_approval') {
        await updateSession(supabase, sessionId, {
          state: 'awaiting_approval',
          metadata: { scripts: result.data.scripts }
        });
        return; // Exit orchestration, will resume when user approves
      }
    }

    // Mark session as completed
    await updateSession(supabase, sessionId, {
      state: 'completed',
      completed_at: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Orchestration error:', error);
    await logStep(supabase, sessionId, 'error', 'failed', {
      error_message: error.message,
    });
    await updateSession(supabase, sessionId, {
      state: 'error',
      metadata: { error: error.message },
    });
  }
}

async function executeStep(
  supabase: any,
  stepName: string,
  sessionId: string,
  userId: string,
  brandContext: string
): Promise<{ success: boolean; data?: any; error?: string }> {
  const startTime = Date.now();

  try {
    switch (stepName) {
      case 'analyze_brand': {
        // Read brand memory
        const { data: memories } = await supabase
          .from('agent_memory')
          .select('*')
          .eq('user_id', userId)
          .eq('memory_type', 'brand_memory')
          .order('created_at', { ascending: false })
          .limit(5);

        const brandInfo = memories?.length > 0 
          ? memories.map(m => m.content).join('\n')
          : brandContext;

        return {
          success: true,
          data: { brandInfo, confidence: memories?.length > 0 ? 0.95 : 0.6 }
        };
      }

      case 'research_competitors': {
        // Simulate competitor research (would call MCP tools in production)
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const competitors = [
          { name: 'Competitor A', strategy: 'Problem-solution format', hooks: ['Did you know...', 'Stop wasting time...'] },
          { name: 'Competitor B', strategy: 'Testimonial-based', hooks: ['See what our customers say...', 'Real results...'] },
        ];

        return { success: true, data: { competitors } };
      }

      case 'analyze_trends': {
        // Simulate trend analysis
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        const trends = [
          { platform: 'TikTok', trend: 'Short-form storytelling', engagement: 'high' },
          { platform: 'Instagram', trend: 'Behind-the-scenes content', engagement: 'medium' },
        ];

        return { success: true, data: { trends } };
      }

      case 'generate_concepts': {
        // Generate video concepts based on research
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const concepts = [
          { 
            title: 'Problem-Solution Format',
            description: 'Start with a relatable problem, then present your solution',
            hook: 'Tired of wasting hours on...',
            cta: 'Try it free today'
          },
          {
            title: 'Testimonial Story',
            description: 'Real customer success story',
            hook: 'Here\'s how [Customer] saved 10 hours per week',
            cta: 'Get started now'
          }
        ];

        return { success: true, data: { concepts } };
      }

      case 'generate_scripts': {
        // Generate scripts from concepts
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const scripts = [
          {
            id: crypto.randomUUID(),
            title: 'Script 1: Problem-Solution',
            content: 'Hook: Are you tired of spending hours on manual tasks?\n\nBody: Our AI-powered platform automates your workflow, saving you time and reducing errors.\n\nCTA: Start your free trial today and see the difference.',
            duration: 30,
            tone: 'professional'
          },
          {
            id: crypto.randomUUID(),
            title: 'Script 2: Customer Story',
            content: 'Hook: Meet Sarah, who transformed her business in just 30 days.\n\nBody: Using our platform, Sarah automated her processes and increased productivity by 300%.\n\nCTA: Join thousands of successful users. Try it free.',
            duration: 30,
            tone: 'conversational'
          }
        ];

        return { success: true, data: { scripts } };
      }

      case 'generate_videos': {
        // This would integrate with Sora 2 in production
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        return { 
          success: true, 
          data: { 
            videoUrls: ['https://example.com/video1.mp4', 'https://example.com/video2.mp4'] 
          } 
        };
      }

      case 'update_memory': {
        // Store insights in memory
        const insights = 'Generated 2 video ads with problem-solution and testimonial formats. Both performed well in testing.';
        
        const openaiKey = Deno.env.get('OPENAI_API_KEY');
        let embedding = null;

        if (openaiKey) {
          const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${openaiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'text-embedding-3-small',
              input: insights,
            }),
          });

          if (embeddingResponse.ok) {
            const embeddingData = await embeddingResponse.json();
            embedding = embeddingData.data[0].embedding;
          }
        }

        await supabase.from('agent_memory').insert({
          user_id: userId,
          memory_type: 'performance_memory',
          content: insights,
          embedding,
          metadata: { session_id: sessionId, type: 'video_generation' }
        });

        return { success: true, data: { memorySaved: true } };
      }

      default:
        return { success: true, data: {} };
    }
  } catch (error) {
    console.error(`Error in step ${stepName}:`, error);
    return { success: false, error: error.message };
  } finally {
    const duration = Date.now() - startTime;
    console.log(`Step ${stepName} completed in ${duration}ms`);
  }
}

async function logStep(
  supabase: any,
  sessionId: string,
  stepName: string,
  status: string,
  data: any
) {
  await supabase.from('agent_execution_logs').insert({
    session_id: sessionId,
    step_name: stepName,
    status,
    input_data: data.input || null,
    output_data: data.output || data,
    error_message: data.error_message || null,
    duration_ms: data.duration_ms || null,
  });
}

async function updateSession(supabase: any, sessionId: string, updates: any) {
  await supabase
    .from('agent_sessions')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', sessionId);
}

export { orchestrateAgentWorkflow };
