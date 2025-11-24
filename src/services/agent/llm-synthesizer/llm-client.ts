/**
 * LLM Client
 * 
 * Abstraction layer for multiple LLM providers
 */

import {
  LLMConfig,
  LLMMessage,
  LLMResponse,
  LLMProvider,
} from "./types";

export class LLMClient {
  private config: LLMConfig;

  constructor(config: LLMConfig) {
    this.config = config;
  }

  /**
   * Send completion request to LLM
   */
  async complete(messages: LLMMessage[]): Promise<LLMResponse> {
    console.log(`[LLMClient] Sending request to ${this.config.provider}`);

    try {
      switch (this.config.provider) {
        case "lovable-ai":
          return await this.completeLovableAI(messages);
        case "openai":
          return await this.completeOpenAI(messages);
        case "anthropic":
          return await this.completeAnthropic(messages);
        default:
          throw new Error(`Unsupported provider: ${this.config.provider}`);
      }
    } catch (error) {
      console.error("[LLMClient] Completion failed:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Complete using Lovable AI Gateway
   * Note: API key must be passed via config when used client-side
   */
  private async completeLovableAI(messages: LLMMessage[]): Promise<LLMResponse> {
    const LOVABLE_API_KEY = this.config.apiKey;
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured - pass via config.apiKey");
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.config.model || "google/gemini-2.5-flash",
        messages,
        temperature: this.config.temperature ?? 0.7,
        max_tokens: this.config.maxTokens ?? 4000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Lovable AI error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    return {
      success: true,
      content: data.choices[0].message.content,
      usage: {
        promptTokens: data.usage?.prompt_tokens || 0,
        completionTokens: data.usage?.completion_tokens || 0,
        totalTokens: data.usage?.total_tokens || 0,
      },
    };
  }

  /**
   * Complete using OpenAI API
   */
  private async completeOpenAI(messages: LLMMessage[]): Promise<LLMResponse> {
    const apiKey = this.config.apiKey;
    
    if (!apiKey) {
      throw new Error("OpenAI API key not configured");
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.config.model || "gpt-4o",
        messages,
        temperature: this.config.temperature ?? 0.7,
        max_tokens: this.config.maxTokens ?? 4000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    return {
      success: true,
      content: data.choices[0].message.content,
      usage: {
        promptTokens: data.usage?.prompt_tokens || 0,
        completionTokens: data.usage?.completion_tokens || 0,
        totalTokens: data.usage?.total_tokens || 0,
      },
    };
  }

  /**
   * Complete using Anthropic API (Claude)
   */
  private async completeAnthropic(messages: LLMMessage[]): Promise<LLMResponse> {
    const apiKey = this.config.apiKey;
    
    if (!apiKey) {
      throw new Error("Anthropic API key not configured");
    }

    // Convert messages to Anthropic format
    const systemMessage = messages.find((m) => m.role === "system");
    const conversationMessages = messages.filter((m) => m.role !== "system");

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.config.model || "claude-sonnet-4-5",
        system: systemMessage?.content,
        messages: conversationMessages,
        temperature: this.config.temperature ?? 0.7,
        max_tokens: this.config.maxTokens ?? 4000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Anthropic error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    return {
      success: true,
      content: data.content[0].text,
      usage: {
        promptTokens: data.usage?.input_tokens || 0,
        completionTokens: data.usage?.output_tokens || 0,
        totalTokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
      },
    };
  }
}
