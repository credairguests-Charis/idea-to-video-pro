# MCP Tools Integration

## Overview

Agent Mode integrates with multiple MCP (Model Context Protocol) servers to access external data sources. Each MCP server provides specific tools for competitor research, trend analysis, and content generation.

## 1. Meta Ads Library MCP

### Purpose
Research competitor ads running on Facebook and Instagram.

### API Contract

**Endpoint**: `https://www.facebook.com/ads/library/api/` (via MCP server)

**Tool Schema**:
```typescript
interface MetaAdsLibraryTool {
  name: "meta_ads_search";
  description: "Search Meta Ads Library for competitor ads";
  input_schema: {
    type: "object";
    properties: {
      search_term: string; // brand name or keyword
      ad_reached_countries?: string; // country code, default "US"
      ad_active_status?: "ACTIVE" | "INACTIVE" | "ALL"; // default "ALL"
      limit?: number; // default 50
      fields?: string[]; // e.g., ["id", "ad_creative_bodies", "ad_snapshot_url"]
    };
  };
}
```

**Environment Variables**:
- `META_ADS_ACCESS_TOKEN` (required)

**Output Normalization**:
```typescript
interface MetaAdResult {
  ad_id: string;
  brand_name: string;
  ad_creative_bodies: string[]; // text content
  ad_creative_link_titles: string[];
  ad_snapshot_url: string;
  page_name: string;
  funding_entity?: string;
  impressions?: string; // range like "10,000-50,000"
}
```

**Rate Limits**:
- 200 requests per hour per access token
- Retry with exponential backoff if rate limited

**Error Handling**:
- Invalid access token → log error, skip tool
- No results found → return empty array, proceed
- API timeout → retry 3x, then fallback

**Safety**:
- Never store ad creative in logs (only ad_id)
- Respect Meta's Terms of Service
- Do not scrape beyond allowed fields

---

## 2. TikTok Creative Center Trends MCP

### Purpose
Analyze trending content, hashtags, and audio on TikTok.

### API Contract

**Endpoint**: `https://ads.tiktok.com/creative_radar_api/` (via MCP server)

**Tool Schema**:
```typescript
interface TikTokTrendsTool {
  name: "tiktok_trends_search";
  description: "Get trending content from TikTok Creative Center";
  input_schema: {
    type: "object";
    properties: {
      industry?: string; // e.g., "Tech", "Beauty", "Finance"
      country?: string; // default "US"
      trend_type?: "hashtag" | "music" | "creator" | "video"; // default "all"
      time_range?: "7d" | "30d"; // default "7d"
      limit?: number; // default 20
    };
  };
}
```

**Environment Variables**:
- `TIKTOK_CREATIVE_CENTER_API_KEY` (required)

**Output Normalization**:
```typescript
interface TikTokTrendResult {
  trend_id: string;
  trend_type: "hashtag" | "music" | "creator" | "video";
  trend_name: string;
  hashtag?: string;
  music_title?: string;
  music_author?: string;
  video_url?: string;
  engagement_score?: number;
  growth_rate?: number; // percentage
  relevant_industries?: string[];
}
```

**Rate Limits**:
- 100 requests per hour
- Cache results for 1 hour

**Error Handling**:
- API key invalid → log error, skip tool
- No trends found → return generic evergreen formats
- Timeout → retry 2x, then use cached data

**Safety**:
- Do not download videos (only metadata)
- Respect TikTok's API Terms
- Filter out inappropriate content

---

## 3. YouTube Ads Insights MCP

### Purpose
Analyze successful video ad formats and hooks from YouTube.

### API Contract

**Endpoint**: `https://www.googleapis.com/youtube/v3/` (via MCP server)

**Tool Schema**:
```typescript
interface YouTubeAdsInsightsTool {
  name: "youtube_ads_search";
  description: "Search YouTube for video ad examples and insights";
  input_schema: {
    type: "object";
    properties: {
      search_query: string; // e.g., "SaaS demo video"
      video_duration?: "short" | "medium" | "long"; // default "short" (< 4 min)
      order?: "viewCount" | "relevance" | "date"; // default "viewCount"
      limit?: number; // default 10
    };
  };
}
```

**Environment Variables**:
- `YOUTUBE_API_KEY` (required)

**Output Normalization**:
```typescript
interface YouTubeAdResult {
  video_id: string;
  title: string;
  description: string;
  channel_name: string;
  thumbnail_url: string;
  view_count: number;
  like_count: number;
  duration_seconds: number;
  published_at: string;
  category?: string;
}
```

**Rate Limits**:
- 10,000 quota units per day
- Each search costs 100 units
- Cache results for 24 hours

**Error Handling**:
- Quota exceeded → use cached data
- No results → fallback to generic video formats
- API error → retry once, then skip

**Safety**:
- Do not download videos
- Only use publicly available data
- Filter out age-restricted content

---

## 4. Video Analysis MCP

### Purpose
Analyze video structure, pacing, hooks, CTAs from uploaded reference videos.

### API Contract

**Tool Schema**:
```typescript
interface VideoAnalysisTool {
  name: "analyze_video";
  description: "Extract insights from a reference video";
  input_schema: {
    type: "object";
    properties: {
      video_url: string; // publicly accessible URL
      analysis_type?: ("structure" | "hooks" | "pacing" | "cta")[]; // default all
    };
  };
}
```

**Environment Variables**:
- `OPENAI_API_KEY` (for GPT-5 vision analysis)

**Output Normalization**:
```typescript
interface VideoAnalysisResult {
  video_url: string;
  duration_seconds: number;
  structure: {
    intro_duration?: number;
    problem_duration?: number;
    solution_duration?: number;
    cta_duration?: number;
  };
  hooks: string[]; // extracted hooks
  visual_elements: string[]; // e.g., "text overlays", "product demo"
  pacing: "fast" | "medium" | "slow";
  cta: string;
  recommended_improvements?: string[];
}
```

**Rate Limits**:
- Max 10 videos per agent run
- Analysis costs ~$0.10 per video (GPT-5 vision)

**Error Handling**:
- Video download fails → skip analysis
- Analysis timeout → return partial results
- Invalid video format → log error, skip

**Safety**:
- Only analyze user-uploaded or publicly accessible videos
- Do not store videos (only metadata)

---

## 5. Screenshot Tool

### Purpose
Capture screenshots of competitor landing pages or ads for visual reference.

### API Contract

**Tool Schema**:
```typescript
interface ScreenshotTool {
  name: "capture_screenshot";
  description: "Capture a screenshot of a webpage";
  input_schema: {
    type: "object";
    properties: {
      url: string;
      viewport?: { width: number; height: number }; // default { width: 1920, height: 1080 }
      full_page?: boolean; // default false
    };
  };
}
```

**Environment Variables**:
- None (uses Puppeteer/Playwright)

**Output Normalization**:
```typescript
interface ScreenshotResult {
  screenshot_url: string; // stored in Supabase Storage
  page_title?: string;
  captured_at: string;
  viewport: { width: number; height: number };
}
```

**Rate Limits**:
- Max 5 screenshots per agent run
- Timeout after 10 seconds per screenshot

**Error Handling**:
- Page load timeout → skip screenshot
- Invalid URL → log error, skip
- Screenshot upload fails → retry once

**Safety**:
- Do not screenshot login-required pages
- Respect robots.txt
- Delete screenshots after 30 days

---

## 6. Supabase Project MCP

### Purpose
Access agent's own Supabase project for memory and storage.

### API Contract

**Tool Schema**:
```typescript
interface SupabaseProjectTool {
  name: "supabase_query";
  description: "Query Supabase database or storage";
  input_schema: {
    type: "object";
    properties: {
      operation: "read_memory" | "write_memory" | "upload_file" | "read_file";
      table?: string;
      query?: string;
      file_path?: string;
      file_content?: string; // base64 encoded
    };
  };
}
```

**Environment Variables**:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

**Output Normalization**:
```typescript
interface SupabaseResult {
  operation: string;
  success: boolean;
  data?: any;
  error?: string;
}
```

**Rate Limits**:
- No explicit limit (internal tool)
- Respect Supabase connection pool limits

**Error Handling**:
- RLS violation → log error, inform user
- Connection error → retry 3x
- Query timeout → log slow query

**Safety**:
- Never expose service role key
- Use RLS for all user data
- Sanitize all inputs

---

## 7. Whisper Transcription Tool

### Purpose
Transcribe audio from video ads or reference content.

### API Contract

**Tool Schema**:
```typescript
interface WhisperTranscriptionTool {
  name: "transcribe_audio";
  description: "Transcribe audio using Whisper";
  input_schema: {
    type: "object";
    properties: {
      audio_url: string; // publicly accessible URL
      language?: string; // default "en"
      format?: "text" | "srt" | "vtt"; // default "text"
    };
  };
}
```

**Environment Variables**:
- `OPENAI_API_KEY` (for Whisper API)

**Output Normalization**:
```typescript
interface TranscriptionResult {
  audio_url: string;
  transcription: string;
  duration_seconds: number;
  language: string;
  confidence_score?: number;
}
```

**Rate Limits**:
- Max 25MB file size
- ~$0.006 per minute of audio

**Error Handling**:
- Audio download fails → skip transcription
- Transcription timeout → retry once
- Invalid audio format → log error, skip

**Safety**:
- Do not transcribe copyrighted content without permission
- Delete audio files after transcription

---

## 8. Sora 2 Video Synthesis Tool

### Purpose
Generate video clips using Sora 2 and stitch them into final video.

### API Contract

**Tool Schema**:
```typescript
interface Sora2VideoTool {
  name: "generate_video_sora2";
  description: "Generate video using Sora 2";
  input_schema: {
    type: "object";
    properties: {
      prompts: string[]; // array of prompts for each 8s clip
      duration_seconds?: number; // total desired duration, default 30
      aspect_ratio?: "16:9" | "9:16" | "1:1"; // default "9:16"
      style?: string; // e.g., "realistic", "animated", "documentary"
      reference_images?: string[]; // optional image URLs for consistency
    };
  };
}
```

**Environment Variables**:
- `SORA2_API_KEY` (if available; otherwise use existing Kie.ai API)

**Output Normalization**:
```typescript
interface Sora2VideoResult {
  video_clips: {
    clip_url: string;
    clip_index: number;
    duration_seconds: number;
  }[];
  final_video_url: string; // stitched video
  total_duration_seconds: number;
  generation_time_ms: number;
  cost_usd?: number;
}
```

**Stitching Logic**:
1. Generate individual 8-second clips based on shot list
2. Use FFmpeg to stitch clips together
3. Add transitions (fade, cut) between clips
4. Add background music and voiceover (if provided)
5. Export final video to Supabase Storage

**Rate Limits**:
- Max 6 clips per video (48 seconds total)
- Generation time ~30 seconds per clip

**Error Handling**:
- Clip generation fails → regenerate with simplified prompt
- Stitching fails → deliver clips separately
- Timeout → cancel and notify user

**Safety**:
- Do not generate inappropriate content
- Respect Sora 2 Terms of Service
- Watermark videos if required

---

## 9. Tool Execution Order

### Research Phase
1. **Memory Search** (always first)
2. **Meta Ads Library** + **TikTok Trends** + **YouTube Ads** (parallel)
3. **Video Analysis** (if reference video provided)
4. **Screenshot Tool** (for visual reference)

### Generation Phase
5. **LLM via Lovable AI** (concept generation)
6. **LLM via Lovable AI** (script generation)
7. **Whisper** (if audio voiceover needed)
8. **Sora 2** (video generation)

### Memory Update Phase
9. **Supabase Project** (write memory)

---

## 10. Tool Integration Testing

### Test Cases

**Meta Ads Library**:
- Search for known brand (e.g., "Nike")
- Verify 50 results returned
- Check ad_id and ad_creative_bodies present

**TikTok Trends**:
- Fetch trends for "Tech" industry
- Verify trending hashtags and music
- Check engagement scores are numeric

**YouTube Ads**:
- Search for "SaaS demo video"
- Verify video_id and view_count present
- Check duration_seconds is accurate

**Video Analysis**:
- Upload sample video
- Verify hooks extracted
- Check structure analysis accurate

**Screenshot Tool**:
- Capture screenshot of public page
- Verify image stored in Supabase Storage
- Check image accessible

**Supabase Project**:
- Read memory for user
- Write new memory
- Verify RLS isolation

**Whisper**:
- Transcribe sample audio
- Verify transcription accuracy
- Check cost is reasonable

**Sora 2**:
- Generate 8-second clip
- Stitch 3 clips together
- Verify final video plays correctly

---

## 11. Error Handling Matrix

| Tool | Error Type | Recovery Strategy | Fallback |
|------|-----------|------------------|----------|
| Meta Ads Library | Rate limit | Wait and retry | Use cached data |
| Meta Ads Library | Invalid token | Log error | Skip tool, proceed |
| TikTok Trends | API error | Retry 2x | Use evergreen trends |
| YouTube Ads | Quota exceeded | Use cache | Generic video formats |
| Video Analysis | Timeout | Return partial results | Skip analysis |
| Screenshot Tool | Page load fail | Skip screenshot | Proceed without visual |
| Supabase Project | Connection error | Retry 3x | Log error, fail gracefully |
| Whisper | Audio download fail | Skip transcription | Use TTS instead |
| Sora 2 | Generation fail | Retry with simpler prompt | Fallback to Omnihuman |

---

## 12. Cost Estimation Per Tool

| Tool | Cost Per Call | Max Calls Per Run | Total Cost |
|------|--------------|------------------|------------|
| Meta Ads Library | Free (rate limited) | 1 | $0.00 |
| TikTok Trends | Free (rate limited) | 1 | $0.00 |
| YouTube Ads | Free (quota limited) | 1 | $0.00 |
| Video Analysis | ~$0.10 (GPT-5 vision) | 1 | $0.10 |
| Screenshot Tool | Free (self-hosted) | 5 | $0.00 |
| Supabase Project | Free (internal) | Unlimited | $0.00 |
| Whisper | $0.006/min | 1 (30s) | $0.03 |
| Sora 2 | ~$2.00/clip | 4 clips | $8.00 |
| **Total** | | | **~$8.13** |

**Note**: Sora 2 is the most expensive tool. Consider offering tiered pricing (e.g., 1 video free, then paid).
