import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

// Types
export type StreamMode = "updates" | "messages" | "custom";

export interface StreamEvent {
  mode: StreamMode;
  type: string;
  data: any;
  timestamp: string;
  step?: string;
  node?: string;
}

export interface AgentResult {
  brand: string;
  result: {
    summary?: string;
    tool_history?: Array<{
      name: string;
      args: Record<string, unknown>;
      result: unknown;
    }>;
  };
  tool_history?: Array<{
    name: string;
    args: Record<string, unknown>;
    result: unknown;
  }>;
  cached: boolean;
  timestamp: string;
}

export interface AgentState {
  isLoading: boolean;
  result: AgentResult | null;
  error: string | null;
}

export interface AgentStreamState {
  isStreaming: boolean;
  currentStep: string | null;
  progress: number;
  tokens: string[];
  streamedContent: string;
  events: StreamEvent[];
  error: string | null;
}

interface UseAgentOptions {
  onSuccess?: (result: AgentResult) => void;
  onError?: (error: string) => void;
}

export function useAgent(options: UseAgentOptions = {}) {
  const { onSuccess, onError } = options;

  const [state, setState] = useState<AgentState>({
    isLoading: false,
    result: null,
    error: null,
  });

  const runAgent = useCallback(
    async (brandName: string, useCache: boolean = true) => {
      setState({
        isLoading: true,
        result: null,
        error: null,
      });

      try {
        const { data, error } = await supabase.functions.invoke("agent", {
          body: {
            brand_name: brandName,
            use_cache: useCache,
          },
        });

        if (error) {
          throw new Error(error.message || "Agent execution failed");
        }

        const result = data as AgentResult;

        setState({
          isLoading: false,
          result,
          error: null,
        });

        onSuccess?.(result);
        return result;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "Agent failed";
        
        setState({
          isLoading: false,
          result: null,
          error: errorMsg,
        });

        onError?.(errorMsg);
        throw error;
      }
    },
    [onSuccess, onError]
  );

  const reset = useCallback(() => {
    setState({
      isLoading: false,
      result: null,
      error: null,
    });
  }, []);

  return {
    ...state,
    runAgent,
    reset,
  };
}

interface UseAgentStreamOptions {
  sessionId: string;
  userId: string;
  streamModes?: StreamMode[];
  onToken?: (token: string, fullContent: string) => void;
  onStepStart?: (step: string, data: any) => void;
  onStepEnd?: (step: string, data: any) => void;
  onError?: (error: string) => void;
  onComplete?: () => void;
}

export function useAgentStream(options: UseAgentStreamOptions) {
  const {
    sessionId,
    userId,
    onComplete,
    onError,
  } = options;

  const [state, setState] = useState<AgentStreamState>({
    isStreaming: false,
    currentStep: null,
    progress: 0,
    tokens: [],
    streamedContent: "",
    events: [],
    error: null,
  });

  const startStream = useCallback(
    async (prompt: string, brandName?: string) => {
      setState({
        isStreaming: true,
        currentStep: "researching",
        progress: 10,
        tokens: [],
        streamedContent: "",
        events: [],
        error: null,
      });

      try {
        // Extract brand name from prompt if not provided
        const brand = brandName || 
          prompt.match(/(?:analyze|research|check|look at)\s+(\w+)/i)?.[1] || 
          prompt.trim();

        const { data, error } = await supabase.functions.invoke("agent", {
          body: {
            brand_name: brand,
            use_cache: false,
          },
        });

        if (error) {
          throw new Error(error.message || "Agent execution failed");
        }

        // Convert result to events for display
        const result = data as AgentResult;
        const events: StreamEvent[] = [];

        // Add events from tool history
        if (result.tool_history) {
          result.tool_history.forEach((tool, index) => {
            events.push({
              mode: "updates",
              type: "step_end",
              step: tool.name,
              data: {
                tool_name: tool.name,
                args: tool.args,
                result: tool.result,
                progressPercent: Math.round((index + 1) / result.tool_history!.length * 80) + 10,
              },
              timestamp: new Date().toISOString(),
            });
          });
        }

        // Add final message event
        events.push({
          mode: "messages",
          type: "complete",
          data: {
            summary: result.result?.summary || "Analysis complete",
            cached: result.cached,
          },
          timestamp: result.timestamp,
        });

        setState({
          isStreaming: false,
          currentStep: null,
          progress: 100,
          tokens: [],
          streamedContent: result.result?.summary || JSON.stringify(result.result, null, 2),
          events,
          error: null,
        });

        onComplete?.();
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "Agent failed";
        
        setState((prev) => ({
          ...prev,
          isStreaming: false,
          error: errorMsg,
        }));

        onError?.(errorMsg);
      }
    },
    [sessionId, userId, onComplete, onError]
  );

  const stopStream = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isStreaming: false,
    }));
  }, []);

  return {
    ...state,
    startStream,
    stopStream,
  };
}
