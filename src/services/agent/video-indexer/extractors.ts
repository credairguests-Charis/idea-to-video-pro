/**
 * Azure Video Indexer Extractors
 * 
 * Utility functions to extract specific insights from video data
 */

import {
  VideoInsights,
  TimestampedTranscriptEntry,
  NormalizedScene,
  Speaker,
} from "./types";

/**
 * Extract full transcript as single text
 */
export function extractFullTranscript(insights: VideoInsights): string {
  if (!insights.transcript || insights.transcript.length === 0) {
    return "";
  }

  return insights.transcript
    .map((entry) => entry.text)
    .filter((text) => text.trim() !== "")
    .join(" ");
}

/**
 * Extract timestamped transcript with speaker info
 */
export function extractTimestampedTranscript(
  insights: VideoInsights
): TimestampedTranscriptEntry[] {
  if (!insights.transcript || insights.transcript.length === 0) {
    return [];
  }

  // Create speaker lookup map
  const speakerMap = new Map<number, string>();
  if (insights.speakers) {
    insights.speakers.forEach((speaker) => {
      speakerMap.set(speaker.id, speaker.name);
    });
  }

  return insights.transcript.map((entry) => ({
    startTime: entry.instances[0]?.start || "0:00:00",
    endTime: entry.instances[0]?.end || "0:00:00",
    text: entry.text,
    speakerId: entry.speakerId,
    speakerName: entry.speakerId ? speakerMap.get(entry.speakerId) : undefined,
    confidence: entry.confidence,
  }));
}

/**
 * Extract scene breakdown with metadata
 */
export function extractScenes(insights: VideoInsights): NormalizedScene[] {
  if (!insights.scenes || insights.scenes.length === 0) {
    return [];
  }

  return insights.scenes.map((scene) => {
    const sceneStart = scene.instances[0]?.start || "0:00:00";
    const sceneEnd = scene.instances[scene.instances.length - 1]?.end || "0:00:00";

    // Find shots in this scene
    const shotsInScene = insights.shots?.filter((shot) =>
      shot.instances.some(
        (instance) =>
          instance.start >= sceneStart && instance.end <= sceneEnd
      )
    ) || [];

    // Extract key visuals from labels in this timeframe
    const keyVisuals = insights.labels
      ?.filter((label) =>
        label.instances.some(
          (instance) =>
            instance.start >= sceneStart && instance.end <= sceneEnd
        )
      )
      .map((label) => label.name)
      .slice(0, 5) || [];

    // Find dominant sentiment in this scene
    const sceneSentiment = insights.sentiments?.find((sentiment) =>
      sentiment.instances.some(
        (instance) =>
          instance.start >= sceneStart && instance.end <= sceneEnd
      )
    );

    // Find dominant emotion in this scene
    const sceneEmotion = insights.emotions?.find((emotion) =>
      emotion.instances.some(
        (instance) =>
          instance.start >= sceneStart && instance.end <= sceneEnd
      )
    );

    return {
      sceneId: scene.id,
      startTime: sceneStart,
      endTime: sceneEnd,
      shots: shotsInScene.length,
      keyVisuals,
      dominantEmotion: sceneEmotion?.type,
      sentiment: sceneSentiment?.sentimentType,
    };
  });
}

/**
 * Extract visual content summary
 */
export function extractVisualContent(insights: VideoInsights) {
  return {
    labels: insights.labels?.map((label) => label.name) || [],
    brands: insights.brands?.map((brand) => brand.name) || [],
    people: insights.namedPeople?.map((person) => person.name) || [],
    locations: insights.namedLocations?.map((location) => location.name) || [],
  };
}

/**
 * Calculate overall sentiment distribution
 */
export function extractOverallSentiment(insights: VideoInsights) {
  if (!insights.sentiments || insights.sentiments.length === 0) {
    return {
      positive: 0,
      negative: 0,
      neutral: 0,
    };
  }

  let totalDuration = 0;
  let positiveDuration = 0;
  let negativeDuration = 0;
  let neutralDuration = 0;

  insights.sentiments.forEach((sentiment) => {
    sentiment.instances.forEach((instance) => {
      const duration = parseTimeToSeconds(instance.end) - parseTimeToSeconds(instance.start);
      totalDuration += duration;

      if (sentiment.sentimentType === "Positive") {
        positiveDuration += duration;
      } else if (sentiment.sentimentType === "Negative") {
        negativeDuration += duration;
      } else {
        neutralDuration += duration;
      }
    });
  });

  if (totalDuration === 0) {
    return { positive: 0, negative: 0, neutral: 0 };
  }

  return {
    positive: Math.round((positiveDuration / totalDuration) * 100),
    negative: Math.round((negativeDuration / totalDuration) * 100),
    neutral: Math.round((neutralDuration / totalDuration) * 100),
  };
}

/**
 * Extract dominant emotions
 */
export function extractDominantEmotions(insights: VideoInsights): string[] {
  if (!insights.emotions || insights.emotions.length === 0) {
    return [];
  }

  // Count instances of each emotion
  const emotionCounts = new Map<string, number>();

  insights.emotions.forEach((emotion) => {
    const count = emotion.instances.length;
    emotionCounts.set(emotion.type, (emotionCounts.get(emotion.type) || 0) + count);
  });

  // Sort by count and return top 3
  return Array.from(emotionCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map((entry) => entry[0]);
}

/**
 * Extract topics
 */
export function extractTopics(insights: VideoInsights): string[] {
  if (!insights.topics || insights.topics.length === 0) {
    return [];
  }

  return insights.topics
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 5)
    .map((topic) => topic.name);
}

/**
 * Extract keywords
 */
export function extractKeywords(insights: VideoInsights): string[] {
  if (!insights.keywords || insights.keywords.length === 0) {
    return [];
  }

  return insights.keywords
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 10)
    .map((keyword) => keyword.text);
}

/**
 * Extract speaker segments
 */
export function extractSpeakerSegments(insights: VideoInsights): Speaker[] {
  return insights.speakers || [];
}

/**
 * Extract shot changes
 */
export function extractShotChanges(insights: VideoInsights) {
  if (!insights.shots || insights.shots.length === 0) {
    return [];
  }

  return insights.shots.map((shot) => ({
    shotId: shot.id,
    startTime: shot.instances[0]?.start || "0:00:00",
    endTime: shot.instances[shot.instances.length - 1]?.end || "0:00:00",
    tags: shot.tags || [],
    keyFrameCount: shot.keyFrames?.length || 0,
  }));
}

/**
 * Extract audio effects
 */
export function extractAudioEffects(insights: VideoInsights) {
  if (!insights.audioEffects || insights.audioEffects.length === 0) {
    return [];
  }

  return insights.audioEffects.map((effect) => ({
    type: effect.type,
    occurrences: effect.instances.length,
    timestamps: effect.instances.map((instance) => ({
      start: instance.start,
      end: instance.end,
    })),
  }));
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Parse time string to seconds
 */
function parseTimeToSeconds(timeString: string): number {
  // Format: "0:00:10.21" or "0:00:10"
  const parts = timeString.split(":");
  
  if (parts.length !== 3) {
    return 0;
  }

  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  const seconds = parseFloat(parts[2]);

  return hours * 3600 + minutes * 60 + seconds;
}
