import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ScraperInput {
  brandName: string;
  maxAds?: number;
  sessionId?: string;
}

interface ScrapedAd {
  id: string;
  advertiser: string;
  adCopy: string;
  ctaText: string;
  screenshotUrl?: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  startDate?: string;
  isActive: boolean;
  platform: string[];
  metadata: Record<string, any>;
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
    const input: ScraperInput = body;

    if (!input.brandName) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing brandName" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[BROWSERLESS-SCRAPER] Scraping ads for: ${input.brandName}`);

    // Check cache first
    const urlHash = await hashString(`meta-ads-${input.brandName.toLowerCase()}`);
    const { data: cached } = await supabase
      .from("scraping_cache")
      .select("scraped_data, expires_at")
      .eq("url_hash", urlHash)
      .single();

    if (cached && new Date(cached.expires_at) > new Date()) {
      console.log(`[BROWSERLESS-SCRAPER] Cache hit for ${input.brandName}`);
      return new Response(
        JSON.stringify({ success: true, ads: cached.scraped_data, fromCache: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Construct Meta Ads Library URL
    const metaAdsUrl = `https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=ALL&q=${encodeURIComponent(input.brandName)}&search_type=keyword_unordered&media_type=all`;

    let scrapedAds: ScrapedAd[] = [];

    if (browserlessApiKey) {
      // Use Browserless.io for production-grade scraping
      console.log(`[BROWSERLESS-SCRAPER] Using Browserless.io`);

      const browserlessScript = `
        module.exports = async ({ page }) => {
          await page.goto('${metaAdsUrl}', { waitUntil: 'networkidle2', timeout: 30000 });
          
          // Wait for ads to load
          await page.waitForSelector('[data-testid="ad_library_card"]', { timeout: 10000 }).catch(() => {});
          
          // Scroll to load more ads
          for (let i = 0; i < 3; i++) {
            await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
            await new Promise(r => setTimeout(r, 2000));
          }
          
          // Extract ad data
          const ads = await page.evaluate(() => {
            const cards = document.querySelectorAll('[data-testid="ad_library_card"]');
            return Array.from(cards).slice(0, ${input.maxAds || 10}).map((card, index) => {
              const textContent = card.textContent || '';
              const videoEl = card.querySelector('video');
              const imgEl = card.querySelector('img[src*="scontent"]');
              
              return {
                id: 'ad_' + index,
                advertiser: card.querySelector('[data-testid="page_name"]')?.textContent || '',
                adCopy: textContent.slice(0, 500),
                ctaText: card.querySelector('[data-testid="cta_button"]')?.textContent || '',
                videoUrl: videoEl?.src || null,
                thumbnailUrl: imgEl?.src || null,
                isActive: true,
                platform: ['facebook'],
                metadata: {}
              };
            });
          });
          
          // Take screenshots of each ad
          const screenshots = [];
          const adCards = await page.$$('[data-testid="ad_library_card"]');
          for (let i = 0; i < Math.min(adCards.length, ${input.maxAds || 10}); i++) {
            try {
              const screenshot = await adCards[i].screenshot({ encoding: 'base64' });
              screenshots.push(screenshot);
            } catch (e) {
              screenshots.push(null);
            }
          }
          
          return { ads, screenshots };
        };
      `;

      try {
        const browserlessResponse = await fetch(`https://chrome.browserless.io/function?token=${browserlessApiKey}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code: browserlessScript,
            context: {},
          }),
        });

        if (browserlessResponse.ok) {
          const result = await browserlessResponse.json();
          
          // Upload screenshots to Supabase Storage
          if (result.ads && result.screenshots) {
            for (let i = 0; i < result.ads.length; i++) {
              if (result.screenshots[i]) {
                const screenshotBuffer = Uint8Array.from(atob(result.screenshots[i]), c => c.charCodeAt(0));
                const screenshotPath = `screenshots/${input.sessionId || 'default'}/${result.ads[i].id}.png`;
                
                const { data: uploadData, error: uploadError } = await supabase.storage
                  .from("agent-uploads")
                  .upload(screenshotPath, screenshotBuffer, {
                    contentType: "image/png",
                    upsert: true,
                  });

                if (!uploadError) {
                  const { data: publicUrl } = supabase.storage
                    .from("agent-uploads")
                    .getPublicUrl(screenshotPath);
                  result.ads[i].screenshotUrl = publicUrl.publicUrl;
                }
              }
            }
          }
          
          scrapedAds = result.ads || [];
        }
      } catch (browserlessError) {
        console.error(`[BROWSERLESS-SCRAPER] Browserless error:`, browserlessError);
      }
    }

    // Fallback: Use Firecrawl if Browserless fails or unavailable
    if (scrapedAds.length === 0) {
      console.log(`[BROWSERLESS-SCRAPER] Falling back to Firecrawl`);
      
      const firecrawlApiKey = Deno.env.get("FIRECRAWL_API_KEY");
      if (firecrawlApiKey) {
        try {
          const firecrawlResponse = await fetch("https://api.firecrawl.dev/v1/scrape", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${firecrawlApiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              url: metaAdsUrl,
              formats: ["markdown", "html"],
              waitFor: 6000,
              onlyMainContent: false,
            }),
          });

          if (firecrawlResponse.ok) {
            const firecrawlData = await firecrawlResponse.json();
            const html = firecrawlData.data?.html || "";
            const markdown = firecrawlData.data?.markdown || "";

            // Extract video URLs from HTML
            const videoUrlRegex = /https:\/\/[^"'\s]*(?:video|\.mp4|fbcdn)[^"'\s]*/gi;
            const videoUrls = [...new Set(html.match(videoUrlRegex) || [])];

            // Extract image URLs
            const imageUrlRegex = /https:\/\/scontent[^"'\s]*\.(?:jpg|jpeg|png|webp)/gi;
            const imageUrls = [...new Set(html.match(imageUrlRegex) || [])];

            // Create synthetic ad entries from extracted data
            const maxAds = input.maxAds || 10;
            for (let i = 0; i < Math.min(maxAds, Math.max(videoUrls.length, imageUrls.length, 1)); i++) {
              scrapedAds.push({
                id: `ad_${i}`,
                advertiser: input.brandName,
                adCopy: markdown.slice(i * 200, (i + 1) * 200),
                ctaText: "Learn More",
                videoUrl: videoUrls[i] || undefined,
                thumbnailUrl: imageUrls[i] || undefined,
                isActive: true,
                platform: ["facebook"],
                metadata: { source: "firecrawl" },
              });
            }
          }
        } catch (firecrawlError) {
          console.error(`[BROWSERLESS-SCRAPER] Firecrawl error:`, firecrawlError);
        }
      }
    }

    // If still no ads, create placeholder data
    if (scrapedAds.length === 0) {
      console.log(`[BROWSERLESS-SCRAPER] Using placeholder data`);
      scrapedAds = [{
        id: "ad_placeholder",
        advertiser: input.brandName,
        adCopy: `Sample ad for ${input.brandName}. Unable to scrape live data.`,
        ctaText: "Shop Now",
        isActive: true,
        platform: ["facebook"],
        metadata: { placeholder: true },
      }];
    }

    // Cache the results (expire in 1 hour)
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    await supabase.from("scraping_cache").upsert({
      url_hash: urlHash,
      url: metaAdsUrl,
      scraped_data: scrapedAds,
      expires_at: expiresAt,
    });

    // Store competitor videos if found
    if (input.sessionId) {
      for (const ad of scrapedAds) {
        if (ad.videoUrl || ad.screenshotUrl) {
          await supabase.from("competitor_videos").insert({
            session_id: input.sessionId,
            user_id: (await supabase.from("agent_sessions").select("user_id").eq("id", input.sessionId).single()).data?.user_id,
            video_url: ad.videoUrl || ad.screenshotUrl || "",
            thumbnail_url: ad.thumbnailUrl,
            ad_copy: ad.adCopy,
            cta_text: ad.ctaText,
            advertiser_name: ad.advertiser,
          }).then(() => {});
        }
      }
    }

    console.log(`[BROWSERLESS-SCRAPER] Scraped ${scrapedAds.length} ads`);

    return new Response(
      JSON.stringify({ success: true, ads: scrapedAds }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error(`[BROWSERLESS-SCRAPER] Error:`, error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function hashString(str: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}
