# Azure Video Indexer Integration

This module provides a clean, modular integration with Microsoft Azure Video Indexer API for extracting comprehensive video insights including transcripts, scenes, visual content, sentiment, and more.

## Overview

Azure Video Indexer is a cloud-based AI service that extracts actionable insights from videos, including:
- Full transcripts with speaker identification
- Scene detection and shot boundaries
- Visual content recognition (labels, brands, people, locations)
- Sentiment analysis
- Emotion detection
- Keywords and topics
- Audio effects

## Architecture

```
video-indexer/
├── types.ts         # TypeScript type definitions
├── client.ts        # Azure Video Indexer API client
├── extractors.ts    # Insight extraction utilities
├── normalizer.ts    # Data normalization layer
└── index.ts         # Public API exports
```

## Usage

### 1. Client Initialization

```typescript
import { AzureVideoIndexerClient } from "@/services/agent/video-indexer";

const client = new AzureVideoIndexerClient({
  apiKey: process.env.AZURE_VIDEO_INDEXER_API_KEY!,
  accountId: process.env.AZURE_VIDEO_INDEXER_ACCOUNT_ID!,
  location: process.env.AZURE_VIDEO_INDEXER_LOCATION!, // e.g., "trial" or "eastus"
});
```

### 2. Upload and Process Video

```typescript
// Upload video by URL
const uploadResult = await client.uploadVideo({
  videoUrl: "https://example.com/video.mp4",
  videoName: "My Video",
  description: "Optional description",
  privacy: "Private",
  priority: "Normal",
  language: "en-US",
});

if (!uploadResult.success) {
  console.error("Upload failed:", uploadResult.error);
  return;
}

const videoId = uploadResult.data!.id;

// Wait for processing to complete
const insightsResult = await client.waitForProcessing(videoId, {
  maxWaitTime: 600000, // 10 minutes
  pollInterval: 10000, // 10 seconds
});

if (!insightsResult.success) {
  console.error("Processing failed:", insightsResult.error);
  return;
}

const insights = insightsResult.data!;
```

### 3. Extract Specific Insights

```typescript
import {
  extractFullTranscript,
  extractTimestampedTranscript,
  extractScenes,
  extractVisualContent,
  extractOverallSentiment,
  extractDominantEmotions,
  extractKeywords,
  extractTopics,
} from "@/services/agent/video-indexer";

// Get full transcript as text
const fullTranscript = extractFullTranscript(insights);

// Get timestamped transcript with speaker info
const timestampedTranscript = extractTimestampedTranscript(insights);

// Get scene breakdown
const scenes = extractScenes(insights);

// Get visual content summary
const visualContent = extractVisualContent(insights);
// Returns: { labels, brands, people, locations }

// Get overall sentiment distribution
const sentiment = extractOverallSentiment(insights);
// Returns: { positive: 65, negative: 10, neutral: 25 }

// Get dominant emotions
const emotions = extractDominantEmotions(insights);
// Returns: ["Joy", "Surprise", "Neutral"]

// Get keywords and topics
const keywords = extractKeywords(insights);
const topics = extractTopics(insights);
```

### 4. Normalize Insights

```typescript
import { normalizeVideoInsights, createInsightsSummary } from "@/services/agent/video-indexer";

// Normalize to standard format
const normalized = normalizeVideoInsights(insights);

// Create text summary
const summary = createInsightsSummary(normalized);
console.log(summary);
```

## Edge Function Usage

The `azure-video-analyzer` edge function provides a server-side endpoint for video processing:

```typescript
// From frontend or other edge function
const { data, error } = await supabase.functions.invoke("azure-video-analyzer", {
  body: {
    videoUrl: "https://example.com/video.mp4",
    videoName: "My Video",
    sessionId: "agent-session-id", // Optional: for logging
    waitForCompletion: true, // true = wait, false = async
  },
});

if (error) {
  console.error("Error:", error);
  return;
}

console.log("Video insights:", data.insights);
```

## Data Flow

1. **Upload**: Video URL is submitted to Azure Video Indexer
2. **Processing**: Azure processes the video (transcription, scene detection, etc.)
3. **Polling**: Client polls status until processing completes
4. **Extraction**: Raw insights are retrieved
5. **Normalization**: Data is normalized into standard format
6. **Output**: Clean, structured insights ready for LLM synthesis

## Normalized Output Structure

```typescript
{
  videoId: string;
  videoName: string;
  durationInSeconds: number;
  processingState: "Processed" | "Failed" | "Processing";
  
  fullTranscript: string;
  
  timestampedTranscript: [
    {
      startTime: "0:00:10",
      endTime: "0:00:15",
      text: "Welcome to our product demo",
      speakerId: 1,
      speakerName: "Speaker #1",
      confidence: 0.95
    }
  ];
  
  scenes: [
    {
      sceneId: 1,
      startTime: "0:00:00",
      endTime: "0:00:20",
      shots: 3,
      keyVisuals: ["person", "product", "indoor"],
      dominantEmotion: "Joy",
      sentiment: "Positive"
    }
  ];
  
  visualContent: {
    labels: ["person", "product", "office", ...],
    brands: ["Nike", "Apple", ...],
    people: ["John Doe", ...],
    locations: ["New York", ...]
  };
  
  overallSentiment: {
    positive: 65,
    negative: 10,
    neutral: 25
  };
  
  dominantEmotions: ["Joy", "Surprise", "Neutral"];
  topics: ["Technology", "Marketing", ...];
  keywords: ["product", "innovation", "solution", ...];
}
```

## Error Handling

All methods return a `VideoIndexerResult<T>` type:

```typescript
{
  success: boolean;
  data?: T;
  error?: {
    code: VideoIndexerErrorCode;
    message: string;
    details?: any;
  };
  duration_ms?: number;
}
```

Error codes:
- `AUTHENTICATION_FAILED`: API key or account ID invalid
- `UPLOAD_FAILED`: Video upload failed
- `PROCESSING_FAILED`: Video processing failed
- `TIMEOUT`: Processing exceeded max wait time
- `INVALID_VIDEO_URL`: Invalid video URL
- `VIDEO_NOT_FOUND`: Video ID not found
- `NETWORK_ERROR`: Network connectivity issue
- `UNKNOWN_ERROR`: Unknown error occurred

## Configuration

Required environment variables:
- `AZURE_VIDEO_INDEXER_API_KEY`: Your Azure Video Indexer API key
- `AZURE_VIDEO_INDEXER_ACCOUNT_ID`: Your Azure Video Indexer account ID
- `AZURE_VIDEO_INDEXER_LOCATION`: Azure region (e.g., "trial", "eastus")

## Best Practices

1. **Use video URLs when possible**: Uploading by URL is faster than uploading files
2. **Set appropriate timeouts**: Video processing can take 5-10 minutes for long videos
3. **Handle failures gracefully**: Network issues and processing failures can occur
4. **Cache insights**: Store normalized insights to avoid re-processing
5. **Monitor costs**: Azure Video Indexer charges per minute of video processed

## Integration with Agent Workflow

This module is designed to work seamlessly with the agent competitor research workflow:

1. Firecrawl MCP discovers competitor ads with video URLs
2. Meta Ads Library extracts video URLs and metadata
3. **Azure Video Indexer processes videos** ← This module
4. LLM synthesizes insights into recommendations

## References

- [Azure Video Indexer Documentation](https://learn.microsoft.com/en-us/azure/azure-video-indexer/)
- [API Reference](https://api-portal.videoindexer.ai/)
- [Output JSON Schema](https://learn.microsoft.com/en-us/azure/azure-video-indexer/video-indexer-output-json-v2)
