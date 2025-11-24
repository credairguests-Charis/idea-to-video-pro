# Meta Ads Library Service

Modular service for fetching and parsing Meta Ads Library data.

## Overview

This service provides a clean interface for extracting ad creative data from Meta Ads Library URLs, including video URLs, captions, CTAs, and advertiser metadata.

## Architecture

```
src/services/agent/meta-ads/
├── types.ts          # TypeScript type definitions
├── fetcher.ts        # Main fetch interface
├── parser.ts         # Data parsing utilities
├── cache.ts          # Caching layer
└── index.ts          # Public API exports
```

## Quick Start

### 1. Basic Usage

```typescript
import { MetaAdFetcher } from "@/services/agent/meta-ads";

const fetcher = new MetaAdFetcher({
  enabled: true,
  ttl_seconds: 3600,
  storage: "memory"
});

const result = await fetcher.fetchAdCreative(
  "https://www.facebook.com/ads/library/?id=123456789"
);

if (result.success) {
  console.log("Ad Creative:", result.creative);
  console.log("Video URL:", result.creative.video_url);
  console.log("CTA:", result.creative.cta_text);
}
```

### 2. Extract Specific Data

```typescript
const creative = result.creative;

// Extract video URL
const videoUrl = fetcher.extractVideoUrl(creative);

// Extract text metadata
const text = fetcher.extractTextMetadata(creative);
console.log("Headline:", text.headline);
console.log("Body:", text.body_text);

// Extract CTA
const cta = fetcher.extractCTAMetadata(creative);
console.log("CTA Button:", cta.cta_text);
console.log("Landing Page:", cta.link_url);

// Extract advertiser info
const advertiser = fetcher.extractAdvertiserMetadata(creative);
console.log("Page:", advertiser.page_name);
console.log("Followers:", advertiser.page_likes);
```

### 3. Batch Processing

```typescript
const urls = [
  "https://www.facebook.com/ads/library/?id=123",
  "https://www.facebook.com/ads/library/?id=456",
  "https://www.facebook.com/ads/library/?id=789"
];

const results = await fetcher.fetchBatch(urls);

results.forEach((result, index) => {
  if (result.success) {
    console.log(`Ad ${index + 1}:`, result.creative.page_name);
  }
});
```

## API Reference

### `MetaAdFetcher`

Main class for fetching and parsing Meta Ads Library data.

#### Constructor

```typescript
new MetaAdFetcher(cacheOptions?: CacheOptions)
```

**Cache Options:**
- `enabled: boolean` - Enable caching (default: true)
- `ttl_seconds: number` - Cache TTL (default: 3600)
- `storage: "memory" | "supabase"` - Storage backend (default: "memory")

#### Methods

##### `fetchAdCreative(url: string): Promise<MetaAdFetchResult>`

Fetch ad creative from Meta Ads Library URL.

**Returns:**
```typescript
{
  success: boolean;
  creative?: MetaAdCreative;
  error?: { code: string; message: string; };
  source: "cache" | "api";
  duration_ms: number;
}
```

##### `extractVideoUrl(creative: MetaAdCreative): string | undefined`

Extract video URL from creative.

##### `extractTextMetadata(creative: MetaAdCreative): TextExtraction`

Extract text content (headline, body, caption, description).

##### `extractCTAMetadata(creative: MetaAdCreative): CTAExtraction`

Extract CTA details (text, type, link URL, domain).

##### `extractAdvertiserMetadata(creative: MetaAdCreative): AdvertiserExtraction`

Extract advertiser information (page name, ID, URL, category).

##### `fetchBatch(urls: string[]): Promise<MetaAdFetchResult[]>`

Batch fetch multiple ads.

##### `clearCache(): Promise<void>`

Clear all cached data.

### `MetaAdParser`

Static utility class for parsing and validation.

#### Methods

##### `validateURL(url: string): boolean`

Validate if URL is a valid Meta Ads Library URL.

##### `parseAPIResponse(data: MetaAdAPIData): MetaAdCreative`

Parse API response into structured creative object.

##### `extractVideo(creative: MetaAdCreative): VideoExtraction`

Extract video-specific data.

##### `extractText(creative: MetaAdCreative): TextExtraction`

Extract text-specific data.

##### `extractCTA(creative: MetaAdCreative): CTAExtraction`

Extract CTA-specific data.

##### `extractAdvertiser(creative: MetaAdCreative): AdvertiserExtraction`

Extract advertiser-specific data.

## Data Structures

### `MetaAdCreative`

```typescript
{
  ad_archive_id: string;
  page_id: string;
  page_name: string;
  page_profile_uri: string;
  
  // Content
  body_text?: string;
  caption?: string;
  title?: string;
  
  // Media
  video_url?: string;
  video_thumbnail_url?: string;
  image_url?: string;
  media_type: "video" | "image" | "carousel" | "unknown";
  
  // CTA
  cta_text?: string;
  cta_type?: string;
  link_url?: string;
  link_description?: string;
  
  // Metadata
  display_format?: string;
  page_categories?: string[];
  page_like_count?: number;
  
  // Additional
  cards?: MetaAdCard[];
  targeting?: MetaAdTargeting;
}
```

### `VideoExtraction`

```typescript
{
  video_url?: string;
  thumbnail_url?: string;
  duration_seconds?: number;
  resolution?: string;
  format?: string;
}
```

### `TextExtraction`

```typescript
{
  headline?: string;
  body_text?: string;
  caption?: string;
  description?: string;
}
```

### `CTAExtraction`

```typescript
{
  cta_text?: string;
  cta_type?: string;
  link_url?: string;
  link_domain?: string;
  link_description?: string;
}
```

### `AdvertiserExtraction`

```typescript
{
  page_name: string;
  page_id: string;
  page_url: string;
  page_category?: string;
  page_likes?: number;
  verification_status?: string;
}
```

## Error Handling

### Error Codes

| Code | Description | Action |
|------|-------------|--------|
| `INVALID_URL` | URL format invalid | Check URL format |
| `AD_NOT_FOUND` | Ad not found in library | Verify ad_archive_id |
| `ACCESS_DENIED` | Access forbidden | Check permissions |
| `PARSING_ERROR` | Data parsing failed | Review data structure |
| `NETWORK_ERROR` | Network request failed | Retry request |
| `RATE_LIMITED` | Rate limit exceeded | Wait before retry |
| `TIMEOUT` | Request timeout | Increase timeout |

### Example

```typescript
try {
  const result = await fetcher.fetchAdCreative(url);
  
  if (!result.success) {
    console.error(`Error ${result.error.code}: ${result.error.message}`);
    
    // Handle specific errors
    if (result.error.code === "INVALID_URL") {
      // Validate URL format
    } else if (result.error.code === "RATE_LIMITED") {
      // Wait and retry
      await new Promise(resolve => setTimeout(resolve, 60000));
      return fetcher.fetchAdCreative(url);
    }
  }
} catch (error) {
  // Handle unexpected errors
}
```

## Caching

### Memory Cache

Default caching strategy using in-memory Map.

**Pros:**
- Fast access
- No external dependencies
- Simple implementation

**Cons:**
- Not persistent across restarts
- Limited to single instance

**Configuration:**
```typescript
const fetcher = new MetaAdFetcher({
  enabled: true,
  ttl_seconds: 3600, // 1 hour
  storage: "memory"
});
```

### Supabase Cache (Future)

Persistent caching using Supabase storage.

**Pros:**
- Persistent across restarts
- Shared across instances
- Scalable

**Cons:**
- Slower than memory
- Requires Supabase connection

## Edge Function Integration

This service is used by the `meta-ads-extractor` edge function:

```typescript
// Call edge function
const { data } = await supabase.functions.invoke('meta-ads-extractor', {
  body: {
    url: "https://www.facebook.com/ads/library/?id=123456789",
    session_id: sessionId // Optional, for logging
  }
});

// Or batch process
const { data } = await supabase.functions.invoke('meta-ads-extractor', {
  body: {
    urls: [
      "https://www.facebook.com/ads/library/?id=123",
      "https://www.facebook.com/ads/library/?id=456"
    ]
  }
});
```

## Implementation Notes

### Current Limitations

1. **No Direct API Access**: Meta doesn't provide a public API for Ads Library
2. **Minimal Data**: Current implementation returns basic structure only
3. **No Video Download**: Video URLs not extracted (placeholder implementation)

### Future Enhancements

To implement full functionality, choose one of these approaches:

#### Option 1: Third-Party API

Use a service like searchapi.io:

```typescript
const response = await fetch("https://www.searchapi.io/api/v1/search", {
  method: "POST",
  headers: {
    "Authorization": `Bearer ${SEARCHAPI_KEY}`,
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    engine: "facebook_ads",
    ad_id: ad_archive_id
  })
});
```

#### Option 2: Facebook Graph API

Use official Graph API with access token:

```typescript
const response = await fetch(
  `https://graph.facebook.com/v24.0/${ad_archive_id}?fields=creative,insights&access_token=${ACCESS_TOKEN}`
);
```

#### Option 3: Web Scraping

Implement HTML parsing with rate limiting:

```typescript
const response = await fetch(url);
const html = await response.text();
// Parse with cheerio or similar
```

## Best Practices

1. **Always validate URLs** before fetching
2. **Use caching** to reduce API calls
3. **Implement rate limiting** for scraping
4. **Handle errors gracefully** with fallbacks
5. **Log all operations** for debugging
6. **Batch process** when possible for efficiency

## Testing

Test with real Meta Ads Library URLs:

```typescript
const testUrls = [
  "https://www.facebook.com/ads/library/?id=123456789",
  "https://www.facebook.com/ads/library/?id=987654321"
];

for (const url of testUrls) {
  const result = await fetcher.fetchAdCreative(url);
  console.log(`${url}: ${result.success ? "✅" : "❌"}`);
  
  if (result.success) {
    console.log("  Media:", result.creative.media_type);
    console.log("  CTA:", result.creative.cta_text);
  }
}
```

## Related Documentation

- [AgentPRD.md](../../../../docs/AgentPRD.md) - Product requirements
- [agent-competitor-architecture.md](../../../../docs/agent-competitor-architecture.md) - System architecture
- [agent-workflow-sequence.md](../../../../docs/agent-workflow-sequence.md) - Workflow sequence

---

**Status**: ✅ Phase 2 Complete - Ready for Integration
