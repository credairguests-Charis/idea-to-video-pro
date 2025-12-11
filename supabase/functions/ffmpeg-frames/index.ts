import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface FrameExtractionInput {
  videoUrl: string;
  timestamps?: number[]; // Seconds
  sessionId?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const browserlessApiKey = Deno.env.get("BROWSERLESS_API_KEY");
  
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const body = await req.json();
    const input: FrameExtractionInput = body;

    if (!input.videoUrl) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing videoUrl" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[FFMPEG-FRAMES] Extracting frames from: ${input.videoUrl}`);

    const timestamps = input.timestamps || [0, 1, 2, 3]; // Default: first 4 seconds
    const extractedFrames: { timestamp: number; url: string }[] = [];

    // Method 1: Use Browserless.io to capture video frames via canvas
    // Since we can't run FFmpeg directly in Deno, we use browser-based extraction
    if (browserlessApiKey) {
      const extractionScript = `
        module.exports = async ({ page }) => {
          const videoUrl = '${input.videoUrl}';
          const timestamps = ${JSON.stringify(timestamps)};
          
          // Create a page with video element
          await page.setContent(\`
            <html>
              <body style="margin:0;padding:0;background:black;">
                <video id="video" crossorigin="anonymous" style="max-width:100%;"></video>
                <canvas id="canvas" style="display:none;"></canvas>
              </body>
            </html>
          \`);
          
          const frames = await page.evaluate(async (videoUrl, timestamps) => {
            return new Promise(async (resolve) => {
              const video = document.getElementById('video');
              const canvas = document.getElementById('canvas');
              const ctx = canvas.getContext('2d');
              const frames = [];
              
              video.src = videoUrl;
              video.muted = true;
              
              await new Promise((r) => {
                video.onloadedmetadata = () => {
                  canvas.width = video.videoWidth || 1280;
                  canvas.height = video.videoHeight || 720;
                  r();
                };
                video.onerror = () => r();
              });
              
              for (const ts of timestamps) {
                try {
                  video.currentTime = ts;
                  await new Promise((r) => {
                    video.onseeked = r;
                    setTimeout(r, 2000); // Timeout fallback
                  });
                  
                  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                  const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
                  frames.push({ timestamp: ts, dataUrl });
                } catch (e) {
                  console.error('Frame extraction error:', e);
                }
              }
              
              resolve(frames);
            });
          }, videoUrl, timestamps);
          
          return frames;
        };
      `;

      try {
        const browserlessResponse = await fetch(`https://chrome.browserless.io/function?token=${browserlessApiKey}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code: extractionScript,
            context: {},
          }),
        });

        if (browserlessResponse.ok) {
          const frames = await browserlessResponse.json();
          
          // Upload frames to Supabase Storage
          for (const frame of frames) {
            if (frame.dataUrl && frame.dataUrl.startsWith("data:image")) {
              const base64Data = frame.dataUrl.split(",")[1];
              const frameBuffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
              const framePath = `frames/${input.sessionId || "default"}/${Date.now()}_${frame.timestamp}s.jpg`;
              
              const { data: uploadData, error: uploadError } = await supabase.storage
                .from("agent-uploads")
                .upload(framePath, frameBuffer, {
                  contentType: "image/jpeg",
                  upsert: true,
                });

              if (!uploadError) {
                const { data: publicUrl } = supabase.storage
                  .from("agent-uploads")
                  .getPublicUrl(framePath);
                
                extractedFrames.push({
                  timestamp: frame.timestamp,
                  url: publicUrl.publicUrl,
                });
              }
            }
          }
        }
      } catch (browserlessError) {
        console.error(`[FFMPEG-FRAMES] Browserless error:`, browserlessError);
      }
    }

    // Method 2: Fallback - Use video thumbnail if available
    if (extractedFrames.length === 0) {
      console.log(`[FFMPEG-FRAMES] Using fallback thumbnail extraction`);
      
      // Try to get video thumbnail from common CDN patterns
      const thumbnailUrl = input.videoUrl
        .replace(/\.mp4.*$/, ".jpg")
        .replace(/video/, "thumbnail");
      
      // Check if thumbnail exists
      try {
        const thumbResponse = await fetch(thumbnailUrl, { method: "HEAD" });
        if (thumbResponse.ok) {
          extractedFrames.push({
            timestamp: 0,
            url: thumbnailUrl,
          });
        }
      } catch (e) {
        // Thumbnail doesn't exist
      }

      // If still no frames, return the video URL as a reference
      if (extractedFrames.length === 0) {
        extractedFrames.push({
          timestamp: 0,
          url: input.videoUrl,
        });
      }
    }

    console.log(`[FFMPEG-FRAMES] Extracted ${extractedFrames.length} frames`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        frames: extractedFrames,
        videoUrl: input.videoUrl,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error(`[FFMPEG-FRAMES] Error:`, error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
