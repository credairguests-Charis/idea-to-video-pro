# Veo 3 Fast API Integration

## Overview

### Purpose of the Integration
This document outlines the integration of Google's Veo 3 Fast model via the KIE AI API into our AI video generation platform. The integration enables users to generate high-quality video content from text prompts and actor images, with built-in audio generation and advanced customization options.

### Why Veo 3 Fast is Being Added
- **Cost-Effective**: KIE AI offers Veo 3 at 25% of Google's direct API pricing
- **Enhanced Reliability**: Built-in optimizations and fallback mechanisms for higher success rates
- **Vertical Video Support**: Native 9:16 aspect ratio support for TikTok-style content
- **Multi-Language**: Enhanced prompt processing for global language support
- **Audio Generation**: Automatic background audio generation with synchronized speech
- **Image-to-Video**: Convert actor portraits into dynamic video performances

## Core Workflow

### Default Behavior: Built-in Audio Generation
When no custom audio is provided, Veo 3 Fast automatically:
1. Analyzes the text prompt/script
2. Generates synchronized speech/voice that matches the content
3. Adds appropriate background audio and sound effects
4. Ensures lip-sync alignment with any visible speakers in the video
5. Outputs a complete video with audio track

**Note**: In <5% of cases, Google may suppress audio for content deemed sensitive (e.g., involving minors).

### Optional Behavior: Custom Audio Integration
When users provide custom audio (via record/upload/text-to-speech):
1. **Audio Processing**: Custom audio is uploaded to Supabase Storage
2. **Video Generation**: Veo 3 generates video with default audio first
3. **Audio Replacement**: Backend merges custom audio with generated video
4. **Lip-Sync Alignment**: Advanced processing ensures clean lip-sync matching
5. **Final Output**: Delivers video with custom audio, overriding default audio

### Actor Selection as Image-to-Video

#### Single Actor Workflow
```
User selects actor → Actor image URL retrieved → Passed to Veo 3 as imageUrls[0] → Video generated
```

#### Multi-Actor Workflow
Since Veo 3 accepts only **one image per request**, multiple actors require parallel processing:

```
User selects 3 actors → 3 separate API calls → 3 videos generated → All results returned
```

**Backend Processing Options**:
- **Sequential**: Generate videos one after another (safer for rate limits)
- **Parallel**: Generate all videos simultaneously (faster, higher resource usage)
- **Batched**: Process in smaller groups (balanced approach)

## Integration Details

### Primary API Endpoint
```
POST https://api.kie.ai/api/v1/veo/generate
```

### Required Parameters
```json
{
  "prompt": "string - Text description of the video content",
  "imageUrls": ["array - Actor image URLs (max 1 per request)"],
  "model": "veo3", 
  "watermark": "string - Optional brand watermark",
  "callbackUrl": "string - Webhook endpoint for completion notification",
  "aspectRatio": "9:16", // Default for TikTok-style videos
  "enableFallback": true, // Handle content policy issues
  "enableTranslation": true // Support non-English prompts
}
```

### Response Format
```json
{
  "code": 200,
  "msg": "success", 
  "data": {
    "taskId": "veo_task_abcdef123456"
  }
}
```

### Status Monitoring
```
GET https://api.kie.ai/api/v1/veo/record-info?taskId={taskId}
```

**Status Flags**:
- `0`: Generating (in progress)
- `1`: Success (completed)
- `2`: Failed (generation error)
- `3`: Generation Failed (task created but generation failed)

### HD Video Retrieval (16:9 only)
```
GET https://api.kie.ai/api/v1/veo/get-1080p-video?taskId={taskId}
```

### Audio Handling Logic

#### Built-in Audio (Default)
```javascript
// No additional audio processing needed
const videoResponse = await generateVeo3Video({
  prompt: userScript,
  imageUrls: [actorImageUrl],
  model: "veo3",
  aspectRatio: "9:16"
});
```

#### Custom Audio Override
```javascript
// 1. Upload custom audio to Supabase
const audioUrl = await uploadAudioToSupabase(customAudio);

// 2. Generate video with default audio
const videoResponse = await generateVeo3Video({
  prompt: userScript,
  imageUrls: [actorImageUrl],
  model: "veo3", 
  aspectRatio: "9:16"
});

// 3. Replace audio track (post-processing)
const finalVideo = await mergeCustomAudio(videoResponse.videoUrl, audioUrl);
```

### Storage in Supabase

#### Database Schema Updates
```sql
-- Add Veo 3 specific fields to projects table
ALTER TABLE projects ADD COLUMN veo3_task_ids TEXT[];
ALTER TABLE projects ADD COLUMN veo3_video_urls TEXT[];
ALTER TABLE projects ADD COLUMN custom_audio_url TEXT;
ALTER TABLE projects ADD COLUMN generation_status TEXT DEFAULT 'pending';
ALTER TABLE projects ADD COLUMN generation_progress INTEGER DEFAULT 0;

-- Create generations tracking table
CREATE TABLE veo3_generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id),
  actor_id UUID REFERENCES actors(id),
  task_id TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  video_url TEXT,
  hd_video_url TEXT,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);
```

#### File Storage Structure
```
/veo3-videos/
  /{project_id}/
    /raw/           # Original Veo 3 outputs
    /processed/     # Videos with custom audio
    /thumbnails/    # Generated thumbnails
    /audio/         # Custom audio files
```

### Error Handling

#### Common Error Scenarios
1. **Invalid Image URLs**: Actor images not accessible or malformed
2. **Expired URLs**: CDN/storage URLs no longer valid
3. **Content Policy Violations**: Image/prompt flagged by moderation
4. **API Rate Limits**: Too many concurrent requests
5. **Generation Failures**: Veo 3 internal processing errors

#### Error Recovery Strategies
```javascript
// Intelligent fallback for content policy issues
const generateWithFallback = async (params) => {
  try {
    return await veo3Generate({ ...params, enableFallback: true });
  } catch (error) {
    if (error.code === 422) {
      // Content policy violation - try alternative approach
      return await handleContentPolicyError(params);
    }
    throw error;
  }
};
```

#### Monitoring and Logging
```javascript
// Comprehensive error tracking
const logGenerationError = async (projectId, actorId, error) => {
  await supabase.from('error_logs').insert({
    project_id: projectId,
    actor_id: actorId,
    error_type: error.type,
    error_message: error.message,
    api_response: error.response,
    timestamp: new Date()
  });
};
```

## Multi-Actor Handling

### Batch Generation Strategy
```javascript
const generateMultiActorVideos = async (projectId, script, actorIds) => {
  const generations = [];
  
  // Sequential processing to respect rate limits
  for (const actorId of actorIds) {
    const actor = await getActorById(actorId);
    
    try {
      const taskId = await veo3Generate({
        prompt: script,
        imageUrls: [actor.thumbnail_url],
        model: "veo3",
        aspectRatio: "9:16",
        callbackUrl: `${process.env.CALLBACK_URL}/veo3/${projectId}/${actorId}`
      });
      
      // Track generation in database
      await supabase.from('veo3_generations').insert({
        project_id: projectId,
        actor_id: actorId,
        task_id: taskId,
        status: 'pending'
      });
      
      generations.push({ actorId, taskId });
      
    } catch (error) {
      await logGenerationError(projectId, actorId, error);
    }
  }
  
  return generations;
};
```

### Progress Tracking
```javascript
// Real-time progress updates via webhooks
app.post('/webhook/veo3/:projectId/:actorId', async (req, res) => {
  const { projectId, actorId } = req.params;
  const { code, msg, data } = req.body;
  
  await supabase.from('veo3_generations')
    .update({
      status: code === 200 ? 'completed' : 'failed',
      video_url: data?.response?.resultUrls?.[0],
      error_message: code !== 200 ? msg : null,
      completed_at: new Date()
    })
    .match({ project_id: projectId, actor_id: actorId });
    
  // Update overall project progress
  await updateProjectProgress(projectId);
  
  res.json({ received: true });
});
```

## Future Extensions

### Voice Cloning Integration
- **Custom Voice Models**: Train actor-specific voice models
- **Voice Consistency**: Ensure consistent voice across multiple videos
- **Emotion Control**: Adjust voice tone/emotion based on script content

### Enhanced Actor Library
- **CDN Optimization**: Host actor images on high-performance CDN
- **Image Validation**: Automatic quality and format checking
- **Dynamic Updates**: Real-time actor library updates

### Advanced Audio Processing
- **AI Voice Enhancement**: Improve audio quality using AI upscaling
- **Multi-Language TTS**: Support for various languages and accents
- **Background Music**: Automatic background music selection and mixing

### Batch Processing Optimization
- **Intelligent Queuing**: Smart queue management based on user priority
- **Resource Scaling**: Auto-scale processing based on demand
- **Cost Optimization**: Batch similar requests for better pricing

### Analytics and Insights
- **Generation Analytics**: Track success rates, popular actors, common errors
- **Performance Metrics**: Monitor API response times and reliability
- **User Behavior**: Analyze user preferences and usage patterns