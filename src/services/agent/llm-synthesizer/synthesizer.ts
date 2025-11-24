/**
 * LLM Synthesizer
 * 
 * Main synthesis orchestrator that combines all insights
 */

import {
  SynthesisInput,
  SynthesisResult,
  SynthesisOutput,
  LLMConfig,
  SynthesizerError,
  SynthesizerErrorCode,
} from "./types";
import { LLMClient } from "./llm-client";
import {
  COMPETITOR_AD_SYNTHESIS_PROMPT,
  fillPromptTemplate,
  formatCompetitorData,
  formatMetaAdsData,
  formatVideoInsights,
} from "./prompts";

export class CompetitorAdSynthesizer {
  private llmClient: LLMClient;

  constructor(llmConfig: LLMConfig) {
    this.llmClient = new LLMClient(llmConfig);
  }

  /**
   * Synthesize all insights into comprehensive UGC recommendations
   */
  async synthesize(input: SynthesisInput): Promise<SynthesisResult> {
    const startTime = Date.now();
    console.log("[CompetitorAdSynthesizer] Starting synthesis");

    try {
      // Validate input
      this.validateInput(input);

      // Prepare prompt data
      const promptData = this.preparePromptData(input);

      // Fill prompt template
      const systemPrompt = COMPETITOR_AD_SYNTHESIS_PROMPT.systemPrompt;
      const userPrompt = fillPromptTemplate(
        COMPETITOR_AD_SYNTHESIS_PROMPT.userPromptTemplate,
        promptData
      );

      console.log("[CompetitorAdSynthesizer] Sending to LLM");

      // Send to LLM
      const llmResponse = await this.llmClient.complete([
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ]);

      if (!llmResponse.success || !llmResponse.content) {
        throw new SynthesizerError(
          SynthesizerErrorCode.LLM_ERROR,
          llmResponse.error || "LLM request failed"
        );
      }

      console.log("[CompetitorAdSynthesizer] Parsing response");

      // Parse response
      const output = this.parseOutput(llmResponse.content);

      const duration = Date.now() - startTime;

      console.log("[CompetitorAdSynthesizer] Synthesis complete");
      console.log(`[CompetitorAdSynthesizer] Duration: ${duration}ms`);
      console.log(`[CompetitorAdSynthesizer] Ad analyses: ${output.adAnalyses.length}`);
      console.log(`[CompetitorAdSynthesizer] Suggested scripts: ${output.suggestedScripts.length}`);

      return {
        success: true,
        output,
        duration_ms: duration,
        llmUsage: llmResponse.usage,
      };
    } catch (error) {
      console.error("[CompetitorAdSynthesizer] Synthesis failed:", error);

      if (error instanceof SynthesizerError) {
        return {
          success: false,
          error: {
            code: error.code,
            message: error.message,
            details: error.details,
          },
          duration_ms: Date.now() - startTime,
        };
      }

      return {
        success: false,
        error: {
          code: SynthesizerErrorCode.UNKNOWN_ERROR,
          message: error instanceof Error ? error.message : "Unknown error",
        },
        duration_ms: Date.now() - startTime,
      };
    }
  }

  /**
   * Validate synthesis input
   */
  private validateInput(input: SynthesisInput): void {
    if (!input.brandMemory) {
      throw new SynthesizerError(
        SynthesizerErrorCode.INVALID_INPUT,
        "Brand memory is required"
      );
    }

    if (!input.competitorData) {
      throw new SynthesizerError(
        SynthesizerErrorCode.INVALID_INPUT,
        "Competitor data is required"
      );
    }

    if (!input.metaAds || input.metaAds.length === 0) {
      throw new SynthesizerError(
        SynthesizerErrorCode.INVALID_INPUT,
        "At least one Meta ad is required"
      );
    }

    if (!input.videoInsights || input.videoInsights.length === 0) {
      throw new SynthesizerError(
        SynthesizerErrorCode.INVALID_INPUT,
        "At least one video insight is required"
      );
    }
  }

  /**
   * Prepare data for prompt template
   */
  private preparePromptData(input: SynthesisInput): Record<string, any> {
    return {
      brandName: input.brandMemory.brandName,
      targetAudience: input.brandMemory.targetAudience,
      brandVoice: input.brandMemory.brandVoice,
      productCategory: input.brandMemory.productCategory,
      keyMessages: input.brandMemory.keyMessages.join(", "),
      searchQuery: input.competitorData.searchQuery,
      totalCompetitors: input.competitorData.competitors.length,
      competitorsList: formatCompetitorData(input.competitorData.competitors),
      totalAds: input.metaAds.length,
      metaAdsData: formatMetaAdsData(input.metaAds),
      videoInsightsData: formatVideoInsights(input.videoInsights),
    };
  }

  /**
   * Parse LLM output into structured format
   */
  private parseOutput(content: string): SynthesisOutput {
    try {
      // Remove markdown code blocks if present
      let cleanContent = content.trim();
      
      if (cleanContent.startsWith("```json")) {
        cleanContent = cleanContent.replace(/^```json\s*/, "").replace(/\s*```$/, "");
      } else if (cleanContent.startsWith("```")) {
        cleanContent = cleanContent.replace(/^```\s*/, "").replace(/\s*```$/, "");
      }

      // Parse JSON
      const parsed = JSON.parse(cleanContent);

      // Validate structure
      if (!parsed.synthesisId || !parsed.brandName) {
        throw new Error("Missing required fields in output");
      }

      return parsed as SynthesisOutput;
    } catch (error) {
      console.error("[CompetitorAdSynthesizer] Failed to parse output:", error);
      console.error("[CompetitorAdSynthesizer] Raw content:", content);

      throw new SynthesizerError(
        SynthesizerErrorCode.PARSING_ERROR,
        "Failed to parse LLM output as JSON",
        { rawContent: content.substring(0, 500) }
      );
    }
  }
}
