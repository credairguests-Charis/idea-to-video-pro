/**
 * Azure Video Indexer Normalizer
 * 
 * Normalizes raw Azure Video Indexer data into a clean, standardized format
 */

import {
  VideoInsights,
  NormalizedVideoInsights,
} from "./types";
import {
  extractFullTranscript,
  extractTimestampedTranscript,
  extractScenes,
  extractVisualContent,
  extractOverallSentiment,
  extractDominantEmotions,
  extractTopics,
  extractKeywords,
} from "./extractors";

/**
 * Normalize video insights into standardized format
 */
export function normalizeVideoInsights(
  insights: VideoInsights
): NormalizedVideoInsights {
  console.log("[VideoIndexerNormalizer] Normalizing insights for:", insights.id);

  const normalized: NormalizedVideoInsights = {
    videoId: insights.id,
    videoName: insights.name,
    durationInSeconds: insights.durationInSeconds,
    processingState: insights.state,

    // Full transcript
    fullTranscript: extractFullTranscript(insights),

    // Timestamped transcript
    timestampedTranscript: extractTimestampedTranscript(insights),

    // Scene breakdown
    scenes: extractScenes(insights),

    // Visual content
    visualContent: extractVisualContent(insights),

    // Sentiment
    overallSentiment: extractOverallSentiment(insights),

    // Emotions
    dominantEmotions: extractDominantEmotions(insights),

    // Topics
    topics: extractTopics(insights),

    // Keywords
    keywords: extractKeywords(insights),
  };

  console.log("[VideoIndexerNormalizer] Normalization complete:", {
    videoId: normalized.videoId,
    transcriptLength: normalized.fullTranscript.length,
    sceneCount: normalized.scenes.length,
    labelCount: normalized.visualContent.labels.length,
  });

  return normalized;
}

/**
 * Create summary from normalized insights
 */
export function createInsightsSummary(normalized: NormalizedVideoInsights): string {
  const parts: string[] = [];

  // Basic info
  parts.push(`Video: ${normalized.videoName}`);
  parts.push(`Duration: ${Math.round(normalized.durationInSeconds)}s`);
  parts.push("");

  // Transcript preview
  if (normalized.fullTranscript) {
    const preview = normalized.fullTranscript.substring(0, 200);
    parts.push(`Transcript Preview: ${preview}...`);
    parts.push("");
  }

  // Scenes
  if (normalized.scenes.length > 0) {
    parts.push(`Scenes: ${normalized.scenes.length} detected`);
    normalized.scenes.slice(0, 3).forEach((scene, idx) => {
      parts.push(`  Scene ${idx + 1}: ${scene.startTime} - ${scene.endTime}`);
      if (scene.keyVisuals.length > 0) {
        parts.push(`    Visuals: ${scene.keyVisuals.join(", ")}`);
      }
      if (scene.sentiment) {
        parts.push(`    Sentiment: ${scene.sentiment}`);
      }
    });
    parts.push("");
  }

  // Visual content
  if (normalized.visualContent.labels.length > 0) {
    parts.push(`Visual Labels: ${normalized.visualContent.labels.slice(0, 10).join(", ")}`);
  }
  if (normalized.visualContent.brands.length > 0) {
    parts.push(`Brands Detected: ${normalized.visualContent.brands.join(", ")}`);
  }
  if (normalized.visualContent.people.length > 0) {
    parts.push(`People: ${normalized.visualContent.people.join(", ")}`);
  }
  if (normalized.visualContent.locations.length > 0) {
    parts.push(`Locations: ${normalized.visualContent.locations.join(", ")}`);
  }
  parts.push("");

  // Sentiment
  parts.push(`Overall Sentiment:`);
  parts.push(`  Positive: ${normalized.overallSentiment.positive}%`);
  parts.push(`  Neutral: ${normalized.overallSentiment.neutral}%`);
  parts.push(`  Negative: ${normalized.overallSentiment.negative}%`);
  parts.push("");

  // Emotions
  if (normalized.dominantEmotions.length > 0) {
    parts.push(`Dominant Emotions: ${normalized.dominantEmotions.join(", ")}`);
    parts.push("");
  }

  // Topics
  if (normalized.topics.length > 0) {
    parts.push(`Topics: ${normalized.topics.join(", ")}`);
    parts.push("");
  }

  // Keywords
  if (normalized.keywords.length > 0) {
    parts.push(`Keywords: ${normalized.keywords.join(", ")}`);
  }

  return parts.join("\n");
}
