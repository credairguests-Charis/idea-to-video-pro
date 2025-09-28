# ByteDance OmniHuman API Integration

## Overview

### Purpose of the Integration
This document outlines the integration of ByteDance's OmniHuman API via the KIE AI platform into our AI video generation system. The integration enables users to create high-quality, lip-synced video advertisements by combining actor reference images with either uploaded audio or text-to-speech generated voiceovers.

### Why OmniHuman is Being Added
- **Advanced Lip Synchronization**: Precise lip-sync alignment between audio and character movements
- **High-Fidelity Output**: Professional-grade video generation with natural expressions and gestures
- **Full-Body Animation**: Complete character animation, not just head/face movements  
- **Background Preservation**: Maintains original background while animating characters
- **Real-Time Processing**: Fast generation suitable for production workflows
- **Wide-Angle Support**: Supports various camera angles and character positions
- **Cost-Effective**: Competitive pricing through KIE AI's optimized infrastructure

## Core Workflow

### Default Behavior: Audio Upload or TTS Generation
The system supports two primary input methods:

#### Option 1: Direct Audio Upload
1. **User uploads audio file** (max 1 minute 30 seconds)
2. **Audio validation** and format conversion (if needed)
3. **Storage in Supabase** for processing
4. **Pass to OmniHuman API** with selected actor images

#### Option 2: Text-to-Speech Generation
1. **User enters text script** in the interface
2. **Language/accent selection** from available options
3. **OpenAI TTS API call** to convert text to natural speech
4. **Audio storage** and processing in Supabase
5. **Pass generated audio** to OmniHuman API

### Actor Selection as Image-to-Video
When users select actors from the library:
1. **Actor reference images** are retrieved from Supabase storage
2. **Image validation** ensures compatibility with OmniHuman requirements
3. **Single or multiple actor selection** supported
4. **Image URLs passed** to OmniHuman API along with audio

### Multi-Actor Handling
Since OmniHuman processes one character per request:
- **Sequential Generation**: Process actors one by one for rate limit compliance
- **Parallel Processing**: Generate multiple videos simultaneously (faster, higher resource usage)
- **Batch Management**: Intelligent queuing based on user priority and system load
- **Result Aggregation**: Collect all generated videos and present to user

## Integration Details

### Primary API Endpoints

#### Create Task Endpoint
```
POST https://api.kie.ai/api/v1/jobs/createTask
```

**Required Parameters:**
```json
{
  "model": "omni-human",
  "input": {
    "image": "string", // Actor image URL
    "audio": "string"  // Audio file URL
  },
  "callBackUrl": "string" // Webhook endpoint for completion notification
}
```

**Optional Parameters:**
```json
{
  "attachment": "string" // Additional file information if needed
}
```

#### Query Task Status
```
GET https://api.kie.ai/api/v1/jobs/recordsInfo?taskId={taskId}
```

**Response Format:**
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "taskId": "omnihuman_task_12345",
    "model": "omni-human",
    "state": "success", // waiting, queued, generating, success, fail
    "resultUrls": "[{\"video_url\": \"https://...\"}]",
    "completeTime": 1698765432000,
    "createTime": 1698765400000,
    "updateTime": 1698765432000
  }
}
```

### Text-to-Speech Integration

#### OpenAI TTS API Configuration
```javascript
// Default TTS settings
const TTS_CONFIG = {
  model: "tts-1", // Cost-effective option
  voice: "alloy",  // Default voice (customizable)
  response_format: "mp3",
  speed: 1.0
};

// Supported voices with language/accent options
const VOICE_OPTIONS = {
  "alloy": { languages: ["en-US", "en-GB", "es-ES", "fr-FR"] },
  "echo": { languages: ["en-US", "en-GB"] },
  "fable": { languages: ["en-US", "en-GB"] },
  "onyx": { languages: ["en-US", "en-GB"] },
  "nova": { languages: ["en-US", "en-GB"] },
  "shimmer": { languages: ["en-US", "en-GB"] }
};
```

#### TTS Processing Flow
```javascript
async function generateTTSAudio(text, options) {
  // 1. Validate text length (max ~4000 characters)
  // 2. Call OpenAI TTS API
  // 3. Store generated audio in Supabase Storage
  // 4. Return audio URL for OmniHuman processing
}
```

### Supabase Backend Architecture

#### Database Schema Extensions
```sql
-- Add OmniHuman specific fields to projects table
ALTER TABLE projects ADD COLUMN omnihuman_task_ids TEXT[];
ALTER TABLE projects ADD COLUMN omnihuman_video_urls TEXT[];
ALTER TABLE projects ADD COLUMN audio_source TEXT; -- 'upload' or 'tts'
ALTER TABLE projects ADD COLUMN tts_settings JSONB;
ALTER TABLE projects ADD COLUMN generation_status TEXT DEFAULT 'pending';
ALTER TABLE projects ADD COLUMN generation_progress INTEGER DEFAULT 0;

-- Create OmniHuman generations tracking table
CREATE TABLE omnihuman_generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id),
  actor_id UUID REFERENCES actors(id),
  task_id TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  video_url TEXT,
  audio_url TEXT,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

-- Create audio files tracking table
CREATE TABLE audio_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id),
  source_type TEXT NOT NULL, -- 'upload' or 'tts'
  file_url TEXT NOT NULL,
  duration_seconds INTEGER,
  file_size_bytes INTEGER,
  tts_settings JSONB, -- Only for TTS generated audio
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### Storage Bucket Structure
```
/omnihuman-content/
  /{project_id}/
    /audio/
      /uploads/        # User uploaded audio files
      /tts/           # Generated TTS audio files
    /videos/
      /raw/           # Original OmniHuman outputs
      /processed/     # Post-processed videos (if any)
    /actors/
      /references/    # Actor reference images
    /thumbnails/      # Generated thumbnails
```

#### RLS Policies for New Tables
```sql
-- OmniHuman generations policies
CREATE POLICY "Users can view their own generations" 
ON omnihuman_generations 
FOR SELECT 
USING (auth.uid() = (SELECT user_id FROM projects WHERE id = project_id));

CREATE POLICY "Users can create generations" 
ON omnihuman_generations 
FOR INSERT 
WITH CHECK (auth.uid() = (SELECT user_id FROM projects WHERE id = project_id));

-- Audio files policies
CREATE POLICY "Users can view their own audio files" 
ON audio_files 
FOR SELECT 
USING (auth.uid() = (SELECT user_id FROM projects WHERE id = project_id));

CREATE POLICY "Users can create audio files" 
ON audio_files 
FOR INSERT 
WITH CHECK (auth.uid() = (SELECT user_id FROM projects WHERE id = project_id));
```

### Edge Functions Implementation

#### 1. TTS Generation Function
```typescript
// supabase/functions/generate-tts/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, voice = "alloy", language = "en-US" } = await req.json();
    
    // Validate input
    if (!text || text.length > 4000) {
      throw new Error('Text is required and must be under 4000 characters');
    }

    // Call OpenAI TTS API
    const ttsResponse = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'tts-1',
        input: text,
        voice: voice,
        response_format: 'mp3'
      }),
    });

    if (!ttsResponse.ok) {
      throw new Error(`TTS generation failed: ${await ttsResponse.text()}`);
    }

    // Convert to base64 and return
    const audioBuffer = await ttsResponse.arrayBuffer();
    const base64Audio = btoa(String.fromCharCode(...new Uint8Array(audioBuffer)));

    return new Response(JSON.stringify({ 
      success: true, 
      audioData: base64Audio,
      settings: { voice, language }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('TTS generation error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
```

#### 2. OmniHuman Generation Function
```typescript
// supabase/functions/generate-omnihuman/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { projectId, actorIds, audioUrl } = await req.json();

    const generations = [];

    // Process each actor sequentially
    for (const actorId of actorIds) {
      // Get actor image URL
      const { data: actor, error: actorError } = await supabase
        .from('actors')
        .select('thumbnail_url')
        .eq('id', actorId)
        .single();

      if (actorError || !actor?.thumbnail_url) {
        console.error(`Actor not found: ${actorId}`);
        continue;
      }

      // Call OmniHuman API
      const omniResponse = await fetch('https://api.kie.ai/api/v1/humanLiveUse', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('KIE_API_KEY')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'omni-human',
          callbackUrl: `${Deno.env.get('SUPABASE_URL')}/functions/v1/omnihuman-webhook`,
          liveImage: actor.thumbnail_url,
          liveAudio: audioUrl
        }),
      });

      if (!omniResponse.ok) {
        throw new Error(`OmniHuman API error: ${await omniResponse.text()}`);
      }

      const { taskId } = await omniResponse.json();

      // Store generation record
      const { error: insertError } = await supabase
        .from('omnihuman_generations')
        .insert({
          project_id: projectId,
          actor_id: actorId,
          task_id: taskId,
          status: 'pending'
        });

      if (insertError) {
        console.error('Failed to store generation record:', insertError);
      }

      generations.push({ actorId, taskId });
    }

    return new Response(JSON.stringify({ 
      success: true, 
      generations 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('OmniHuman generation error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
```

#### 3. Webhook Handler Function
```typescript
// supabase/functions/omnihuman-webhook/index.ts
serve(async (req) => {
  try {
    const payload = await req.json();
    const { taskId, state, resultUrls } = payload;

    // Update generation status
    const updateData: any = {
      status: state,
      completed_at: new Date().toISOString()
    };

    if (state === 'success' && resultUrls) {
      try {
        const results = JSON.parse(resultUrls);
        updateData.video_url = results[0]?.video_url;
      } catch (e) {
        console.error('Failed to parse result URLs:', e);
      }
    }

    const { error } = await supabase
      .from('omnihuman_generations')
      .update(updateData)
      .eq('task_id', taskId);

    if (error) {
      console.error('Failed to update generation:', error);
    }

    // Update project progress
    await updateProjectProgress(taskId);

    return new Response(JSON.stringify({ received: true }));

  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
    });
  }
});

async function updateProjectProgress(taskId: string) {
  // Calculate and update overall project progress
  // This function would check all generations for a project
  // and update the project's generation_progress field
}
```

### Error Handling and Monitoring

#### Common Error Scenarios
1. **Invalid Audio Files**: Unsupported format, duration too long, corrupted files
2. **TTS Failures**: Text too long, unsupported language, API rate limits
3. **Actor Image Issues**: Invalid URLs, unsupported formats, low resolution
4. **API Rate Limits**: OmniHuman or OpenAI API throttling
5. **Generation Failures**: OmniHuman processing errors, timeout issues

#### Error Recovery Strategies
```javascript
// Retry mechanism for API calls
const retryWithBackoff = async (fn, maxRetries = 3) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
    }
  }
};

// Graceful degradation for TTS
const handleTTSFailure = async (text, primaryOptions, fallbackOptions) => {
  try {
    return await generateTTS(text, primaryOptions);
  } catch (error) {
    console.warn('Primary TTS failed, trying fallback:', error);
    return await generateTTS(text, fallbackOptions);
  }
};
```

## User Interface Integration

### TTS Configuration UI
```typescript
interface TTSOptions {
  voice: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';
  language: string;
  speed: number; // 0.25 to 4.0
}

const TTSConfigPanel = () => {
  const [ttsOptions, setTTSOptions] = useState<TTSOptions>({
    voice: 'alloy',
    language: 'en-US',
    speed: 1.0
  });

  return (
    <div className="tts-config-panel">
      <Select value={ttsOptions.voice} onValueChange={(voice) => 
        setTTSOptions(prev => ({ ...prev, voice }))
      }>
        <SelectItem value="alloy">Alloy (Neutral)</SelectItem>
        <SelectItem value="echo">Echo (Male)</SelectItem>
        <SelectItem value="fable">Fable (British)</SelectItem>
        <SelectItem value="onyx">Onyx (Deep)</SelectItem>
        <SelectItem value="nova">Nova (Young Female)</SelectItem>
        <SelectItem value="shimmer">Shimmer (Soft Female)</SelectItem>
      </Select>
      
      <Select value={ttsOptions.language} onValueChange={(language) => 
        setTTSOptions(prev => ({ ...prev, language }))
      }>
        <SelectItem value="en-US">English (US)</SelectItem>
        <SelectItem value="en-GB">English (UK)</SelectItem>
        <SelectItem value="es-ES">Spanish</SelectItem>
        <SelectItem value="fr-FR">French</SelectItem>
      </Select>
    </div>
  );
};
```

### Audio Upload Component
```typescript
const AudioUploadComponent = () => {
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [duration, setDuration] = useState<number>(0);

  const handleFileUpload = (file: File) => {
    // Validate file type and duration
    if (file.type.startsWith('audio/')) {
      const audio = new Audio(URL.createObjectURL(file));
      audio.addEventListener('loadedmetadata', () => {
        if (audio.duration <= 90) { // Max 1:30
          setAudioFile(file);
          setDuration(audio.duration);
        } else {
          toast.error('Audio file must be 1 minute 30 seconds or less');
        }
      });
    }
  };

  return (
    <div className="audio-upload">
      <input 
        type="file" 
        accept="audio/*" 
        onChange={(e) => e.files?.[0] && handleFileUpload(e.files[0])}
      />
      {audioFile && (
        <div className="audio-preview">
          <audio controls src={URL.createObjectURL(audioFile)} />
          <span>Duration: {Math.round(duration)}s</span>
        </div>
      )}
    </div>
  );
};
```

## Performance and Optimization

### Caching Strategy
```typescript
// Cache TTS audio for repeated text
const ttsCache = new Map<string, string>();

const getCachedTTS = async (text: string, options: TTSOptions) => {
  const cacheKey = `${text}-${JSON.stringify(options)}`;
  
  if (ttsCache.has(cacheKey)) {
    return ttsCache.get(cacheKey);
  }
  
  const audioUrl = await generateTTS(text, options);
  ttsCache.set(cacheKey, audioUrl);
  return audioUrl;
};
```

### Background Processing
```typescript
// Use Supabase Edge Functions background tasks
EdgeRuntime.waitUntil(
  processLongRunningTask()
);
```

## Future Extensions

### Advanced TTS Options
- **ElevenLabs Integration**: Higher quality voices with emotion control
- **Custom Voice Training**: User-specific voice models
- **Multi-Language Support**: Expanded language library
- **SSML Support**: Advanced speech synthesis markup

### Enhanced OmniHuman Features
- **Custom Emotions**: Control facial expressions and gestures
- **Background Replacement**: Dynamic background changing
- **Multi-Character Scenes**: Support for multiple characters in one video
- **Real-Time Generation**: Live streaming capabilities

### Analytics and Monitoring
- **Generation Metrics**: Track success rates, processing times
- **User Behavior Analysis**: Popular voices, common errors
- **Cost Optimization**: Monitor API usage and optimize calls
- **Quality Assurance**: Automated video quality checks

### Scalability Improvements
- **Queue Management**: Intelligent job scheduling
- **Resource Scaling**: Auto-scale based on demand
- **CDN Integration**: Faster video delivery
- **Compression Optimization**: Reduce file sizes while maintaining quality

## Security Considerations

### API Key Management
- Store all API keys in Supabase secrets
- Rotate keys regularly
- Monitor usage for unusual patterns

### Content Moderation
- Implement text filtering for TTS input
- Audio content validation
- Actor image approval workflow

### Rate Limiting
- Implement user-based rate limits
- Queue management for high-volume periods
- Graceful degradation during API outages

This integration provides a robust foundation for incorporating OmniHuman's advanced lip-sync video generation capabilities into our platform, with comprehensive audio handling, scalable backend architecture, and extensibility for future enhancements.