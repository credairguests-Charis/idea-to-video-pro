/**
 * Supabase Edge Function: Video Download Service
 * 
 * Downloads videos from URLs and uploads them to Supabase Storage
 * for processing by Azure Video Indexer.
 * 
 * Features:
 * - Download videos from Meta CDN and other sources
 * - Upload to Supabase Storage bucket
 * - Return public URL for video analysis
 * - Progress tracking for real-time UI updates
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const BUCKET_NAME = "agent-uploads";
const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB

interface DownloadResult {
  success: boolean;
  originalUrl: string;
  storagePath?: string;
  publicUrl?: string;
  fileSize?: number;
  contentType?: string;
  error?: string;
  duration_ms: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { videoUrl, videoUrls, sessionId, videoName } = await req.json();

    // Helper to log progress - ONLY uses valid status values: started, completed, failed, skipped
    const logProgress = async (
      status: string,
      progressPercent: number,
      subStep: string,
      outputData?: any
    ) => {
      if (sessionId) {
        // Map invalid status values to valid ones
        const validStatus = status === "running" || status === "in_progress" ? "started" :
                           status === "warning" || status === "error" ? "failed" :
                           ["started", "completed", "failed", "skipped"].includes(status) ? status : "started";
        
        await supabase.from("agent_execution_logs").insert({
          session_id: sessionId,
          step_name: "Video Download",
          tool_name: "video_download_service",
          status: validStatus,
          input_data: {
            tool_icon: "📥",
            progress_percent: progressPercent,
            sub_step: subStep,
          },
          output_data: outputData,
          duration_ms: Date.now() - startTime,
        });
      }
    };

    // Single video download
    const downloadVideo = async (url: string, name?: string): Promise<DownloadResult> => {
      const videoStartTime = Date.now();
      
      try {
        console.log("[video-download-service] Downloading:", url);

        // Fetch video
        const response = await fetch(url, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: Failed to fetch video`);
        }

        const contentType = response.headers.get("content-type") || "video/mp4";
        const contentLength = parseInt(response.headers.get("content-length") || "0");

        if (contentLength > MAX_VIDEO_SIZE) {
          throw new Error(`Video too large: ${(contentLength / 1024 / 1024).toFixed(1)}MB exceeds ${MAX_VIDEO_SIZE / 1024 / 1024}MB limit`);
        }

        // Get video data
        const videoBuffer = await response.arrayBuffer();
        const videoBytes = new Uint8Array(videoBuffer);

        // Generate unique filename
        const timestamp = Date.now();
        const randomId = Math.random().toString(36).substring(2, 8);
        const extension = contentType.includes("mp4") ? "mp4" : 
                          contentType.includes("webm") ? "webm" : "mp4";
        const fileName = name || `video_${timestamp}_${randomId}`;
        const storagePath = `videos/${fileName}.${extension}`;

        console.log("[video-download-service] Uploading to storage:", storagePath);

        // Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from(BUCKET_NAME)
          .upload(storagePath, videoBytes, {
            contentType,
            upsert: true,
          });

        if (uploadError) {
          throw new Error(`Storage upload failed: ${uploadError.message}`);
        }

        // Get public URL
        const { data: publicUrlData } = supabase.storage
          .from(BUCKET_NAME)
          .getPublicUrl(storagePath);

        return {
          success: true,
          originalUrl: url,
          storagePath,
          publicUrl: publicUrlData.publicUrl,
          fileSize: videoBytes.length,
          contentType,
          duration_ms: Date.now() - videoStartTime,
        };
      } catch (error) {
        return {
          success: false,
          originalUrl: url,
          error: error instanceof Error ? error.message : "Unknown error",
          duration_ms: Date.now() - videoStartTime,
        };
      }
    };

    // Batch processing
    if (videoUrls && Array.isArray(videoUrls)) {
      console.log(`[video-download-service] Batch processing ${videoUrls.length} videos`);

      await logProgress("running", 5, `Preparing to download ${videoUrls.length} videos`);

      const results: DownloadResult[] = [];
      const maxConcurrent = 3;

      // Process in batches for concurrency control
      for (let i = 0; i < videoUrls.length; i += maxConcurrent) {
        const batch = videoUrls.slice(i, i + maxConcurrent);
        const batchNum = Math.floor(i / maxConcurrent) + 1;
        const totalBatches = Math.ceil(videoUrls.length / maxConcurrent);
        
        const progress = Math.round(5 + ((i / videoUrls.length) * 90));
        await logProgress("running", progress, `Downloading batch ${batchNum}/${totalBatches}`);

        const batchResults = await Promise.all(
          batch.map((url, idx) => downloadVideo(url, `video_batch_${i + idx}`))
        );
        
        results.push(...batchResults);
      }

      const successCount = results.filter(r => r.success).length;
      const totalSize = results.reduce((sum, r) => sum + (r.fileSize || 0), 0);

      await logProgress(
        "completed",
        100,
        `Downloaded ${successCount}/${videoUrls.length} videos`,
        {
          successful: successCount,
          failed: videoUrls.length - successCount,
          total_size_mb: (totalSize / 1024 / 1024).toFixed(2),
        }
      );

      return new Response(
        JSON.stringify({
          success: true,
          results,
          summary: {
            total: videoUrls.length,
            successful: successCount,
            failed: videoUrls.length - successCount,
            total_size_bytes: totalSize,
          },
          duration_ms: Date.now() - startTime,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Single video
    if (!videoUrl) {
      throw new Error("Missing required parameter: videoUrl or videoUrls");
    }

    await logProgress("running", 20, "Downloading video from source");

    const result = await downloadVideo(videoUrl, videoName);

    if (!result.success) {
      await logProgress("failed", 100, `Download failed: ${result.error}`);
      throw new Error(result.error);
    }

    await logProgress(
      "completed",
      100,
      "Video downloaded and uploaded to storage",
      {
        storage_path: result.storagePath,
        file_size_mb: ((result.fileSize || 0) / 1024 / 1024).toFixed(2),
      }
    );

    return new Response(
      JSON.stringify({
        success: true,
        ...result,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("[video-download-service] Error:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        duration_ms: Date.now() - startTime,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
