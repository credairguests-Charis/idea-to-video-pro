import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface MCPRequest {
  brandName: string;
  maxAds?: number;
  sessionId?: string;
  userId?: string;
}

interface ScrapedAd {
  advertiser: string;
  adCopy: string;
  videoUrl: string | null;
  thumbnailUrl: string | null;
  ctaText: string | null;
  platform: string;
  screenshotUrl?: string;
}

/**
 * Firecrawl MCP Server Scraper
 * Uses the Firecrawl MCP Server at https://mcp.firecrawl.dev/{API_KEY}/v2/mcp
 * to scrape Meta Ads Library for competitor ads
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const firecrawlApiKey = Deno.env.get("FIRECRAWL_API_KEY");

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const body: MCPRequest = await req.json();
    const { brandName, maxAds = 10, sessionId, userId } = body;

    if (!brandName) {
      return new Response(
        JSON.stringify({ success: false, error: "brandName is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!firecrawlApiKey) {
      console.error("[FIRECRAWL-MCP] FIRECRAWL_API_KEY not configured");
      return new Response(
        JSON.stringify({ success: false, error: "Firecrawl API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[FIRECRAWL-MCP] Starting Meta Ads scrape for: ${brandName}`);

    // Log progress if sessionId provided
    const logProgress = async (stepName: string, status: string, data?: any) => {
      if (sessionId) {
        await supabase.from("agent_execution_logs").insert({
          session_id: sessionId,
          step_name: stepName,
          status,
          tool_name: "firecrawl_mcp",
          input_data: { brandName, maxAds, ...data },
          output_data: null,
        });
      }
    };

    await logProgress("Firecrawl MCP Scrape", "started", { brandName });

    // Build the MCP endpoint URL
    const mcpEndpoint = `https://mcp.firecrawl.dev/${firecrawlApiKey}/v2/mcp`;
    
    // Build Meta Ads Library URL
    const metaAdsUrl = `https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=ALL&q=${encodeURIComponent(brandName)}&search_type=keyword_unordered&media_type=video`;

    console.log(`[FIRECRAWL-MCP] Scraping URL: ${metaAdsUrl}`);

    // Method 1: Try direct scrape with MCP
    let scrapedAds: ScrapedAd[] = [];
    let screenshotUrl: string | null = null;

    try {
      const scrapeResponse = await fetch(mcpEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: Date.now(),
          method: "tools/call",
          params: {
            name: "firecrawl_scrape",
            arguments: {
              url: metaAdsUrl,
              formats: ["markdown", "html", "screenshot"],
              waitFor: 6000,
              timeout: 45000,
              onlyMainContent: false,
            },
          },
        }),
      });

      if (scrapeResponse.ok) {
        const scrapeData = await scrapeResponse.json();
        console.log(`[FIRECRAWL-MCP] Scrape response received`);

        if (scrapeData.result?.content) {
          const content = scrapeData.result.content;
          
          // Extract screenshot if available
          if (content.screenshot) {
            screenshotUrl = content.screenshot;
          }

          // Parse ads from markdown/html content
          scrapedAds = parseAdsFromContent(content, brandName, maxAds);
        }
      }
    } catch (scrapeError) {
      console.error(`[FIRECRAWL-MCP] Direct scrape failed:`, scrapeError);
    }

    // Method 2: If direct scrape didn't find enough ads, try extract
    if (scrapedAds.length < 3) {
      console.log(`[FIRECRAWL-MCP] Trying extract method...`);
      
      try {
        const extractResponse = await fetch(mcpEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: Date.now() + 1,
            method: "tools/call",
            params: {
              name: "firecrawl_extract",
              arguments: {
                urls: [metaAdsUrl],
                prompt: `Extract all video advertisements for "${brandName}" from this Meta Ads Library page. For each ad, extract: advertiser name, ad copy/text, video URL (look for fbcdn.net or video sources), thumbnail image URL, and call-to-action button text. Return up to ${maxAds} ads.`,
                schema: {
                  type: "object",
                  properties: {
                    ads: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          advertiser: { type: "string" },
                          adCopy: { type: "string" },
                          videoUrl: { type: "string" },
                          thumbnailUrl: { type: "string" },
                          ctaText: { type: "string" },
                        },
                      },
                    },
                  },
                },
                enableWebSearch: true,
              },
            },
          }),
        });

        if (extractResponse.ok) {
          const extractData = await extractResponse.json();
          console.log(`[FIRECRAWL-MCP] Extract response received`);

          if (extractData.result?.content?.ads) {
            const extractedAds = extractData.result.content.ads.map((ad: any) => ({
              advertiser: ad.advertiser || brandName,
              adCopy: ad.adCopy || "",
              videoUrl: ad.videoUrl || null,
              thumbnailUrl: ad.thumbnailUrl || null,
              ctaText: ad.ctaText || null,
              platform: "meta",
            }));
            scrapedAds = [...scrapedAds, ...extractedAds].slice(0, maxAds);
          }
        }
      } catch (extractError) {
        console.error(`[FIRECRAWL-MCP] Extract method failed:`, extractError);
      }
    }

    // Method 3: If still no ads, try search
    if (scrapedAds.length === 0) {
      console.log(`[FIRECRAWL-MCP] Trying search method...`);
      
      try {
        const searchResponse = await fetch(mcpEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: Date.now() + 2,
            method: "tools/call",
            params: {
              name: "firecrawl_search",
              arguments: {
                query: `${brandName} Meta ads Facebook ads video advertisements`,
                limit: maxAds,
                scrapeOptions: {
                  formats: ["markdown"],
                },
              },
            },
          }),
        });

        if (searchResponse.ok) {
          const searchData = await searchResponse.json();
          console.log(`[FIRECRAWL-MCP] Search response received`);

          if (searchData.result?.content) {
            const results = Array.isArray(searchData.result.content) 
              ? searchData.result.content 
              : [searchData.result.content];
            
            scrapedAds = results.slice(0, maxAds).map((r: any, i: number) => ({
              advertiser: brandName,
              adCopy: r.description || r.title || `Ad ${i + 1}`,
              videoUrl: null,
              thumbnailUrl: null,
              ctaText: null,
              platform: "meta",
            }));
          }
        }
      } catch (searchError) {
        console.error(`[FIRECRAWL-MCP] Search method failed:`, searchError);
      }
    }

    // Store results in competitor_videos if we have any
    if (scrapedAds.length > 0 && sessionId && userId) {
      for (const ad of scrapedAds) {
        if (ad.videoUrl || ad.thumbnailUrl) {
          await supabase.from("competitor_videos").insert({
            session_id: sessionId,
            user_id: userId,
            video_url: ad.videoUrl || ad.thumbnailUrl || "",
            advertiser_name: ad.advertiser,
            ad_copy: ad.adCopy,
            cta_text: ad.ctaText,
            thumbnail_url: ad.thumbnailUrl,
          });
        }
      }
    }

    await logProgress("Firecrawl MCP Scrape", "completed", { adsFound: scrapedAds.length });

    console.log(`[FIRECRAWL-MCP] Completed. Found ${scrapedAds.length} ads`);

    return new Response(
      JSON.stringify({
        success: true,
        ads: scrapedAds,
        screenshotUrl,
        metaAdsUrl,
        adsFound: scrapedAds.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[FIRECRAWL-MCP] Error:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error",
        ads: [],
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

/**
 * Parse ads from scraped content
 */
function parseAdsFromContent(content: any, brandName: string, maxAds: number): ScrapedAd[] {
  const ads: ScrapedAd[] = [];
  
  const text = content.markdown || content.html || "";
  
  // Extract video URLs (Meta CDN patterns)
  const videoPatterns = [
    /https?:\/\/[^\s"']+\.fbcdn\.net[^\s"']*video[^\s"']*/gi,
    /https?:\/\/video[^\s"']*\.fbcdn\.net[^\s"']*/gi,
    /https?:\/\/scontent[^\s"']*\.fbcdn\.net[^\s"']*\.mp4[^\s"']*/gi,
  ];

  const videoUrls: string[] = [];
  for (const pattern of videoPatterns) {
    const matches = text.match(pattern) || [];
    videoUrls.push(...matches);
  }

  // Extract image URLs for thumbnails
  const imagePatterns = [
    /https?:\/\/scontent[^\s"']*\.fbcdn\.net[^\s"']*\.(?:jpg|png|jpeg)[^\s"']*/gi,
    /https?:\/\/[^\s"']+\.fbcdn\.net[^\s"']*\.(?:jpg|png|jpeg)[^\s"']*/gi,
  ];

  const imageUrls: string[] = [];
  for (const pattern of imagePatterns) {
    const matches = text.match(pattern) || [];
    imageUrls.push(...matches);
  }

  // Create ads from found URLs
  const uniqueVideoUrls = [...new Set(videoUrls)].slice(0, maxAds);
  const uniqueImageUrls = [...new Set(imageUrls)];

  for (let i = 0; i < Math.max(uniqueVideoUrls.length, Math.min(maxAds, 5)); i++) {
    ads.push({
      advertiser: brandName,
      adCopy: `${brandName} Video Ad ${i + 1}`,
      videoUrl: uniqueVideoUrls[i] || null,
      thumbnailUrl: uniqueImageUrls[i] || null,
      ctaText: null,
      platform: "meta",
    });
  }

  return ads.slice(0, maxAds);
}
