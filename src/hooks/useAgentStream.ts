import { useState, useCallback, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

// LangChain-style streaming modes
export type StreamMode = "updates" | "messages" | "custom";

export interface StreamEvent {
  mode: StreamMode;
  type: string;
  data: any;
  timestamp: string;
  step?: string;
  node?: string;
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
    streamModes = ["updates", "messages", "custom"],
    onToken,
    onStepStart,
    onStepEnd,
    onError,
    onComplete,
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

  const abortControllerRef = useRef<AbortController | null>(null);

  const startStream = useCallback(
    async (prompt: string, brandName?: string) => {
      // Cancel any existing stream
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();

      setState({
        isStreaming: true,
        currentStep: "initializing",
        progress: 0,
        tokens: [],
        streamedContent: "",
        events: [],
        error: null,
      });

      try {
        const { data: { session } } = await supabase.auth.getSession();
        const accessToken = session?.access_token;

        const response = await fetch(
          `https://kopclhksdjbheypwsvxz.supabase.co/functions/v1/agent-stream`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${accessToken}`,
            },
            body: JSON.stringify({
              sessionId,
              userId,
              prompt,
              brandName: brandName || "Brand",
              streamModes,
            }),
            signal: abortControllerRef.current.signal,
          }
        );

        if (!response.ok) {
          throw new Error(`Stream request failed: ${response.status}`);
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) {
          throw new Error("No response body");
        }

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n").filter((line) => line.startsWith("data:"));

          for (const line of lines) {
            const jsonStr = line.replace("data: ", "").trim();
            if (!jsonStr || jsonStr === "[DONE]") continue;

            try {
              const event: StreamEvent = JSON.parse(jsonStr);
              
              setState((prev) => ({
                ...prev,
                events: [...prev.events, event],
              }));

              // Handle different stream modes (LangChain-style)
              switch (event.mode) {
                case "updates":
                  handleUpdateEvent(event);
                  break;
                case "messages":
                  handleMessageEvent(event);
                  break;
                case "custom":
                  // Custom events are added to events array
                  break;
              }
            } catch (e) {
              console.warn("[useAgentStream] Failed to parse event:", jsonStr);
            }
          }
        }

        setState((prev) => ({
          ...prev,
          isStreaming: false,
          progress: 100,
        }));

        onComplete?.();
      } catch (error) {
        if ((error as Error).name === "AbortError") {
          console.log("[useAgentStream] Stream aborted");
          return;
        }

        const errorMsg = error instanceof Error ? error.message : "Stream failed";
        setState((prev) => ({
          ...prev,
          isStreaming: false,
          error: errorMsg,
        }));
        onError?.(errorMsg);
      }
    },
    [sessionId, userId, streamModes, onToken, onStepStart, onStepEnd, onError, onComplete]
  );

  const handleUpdateEvent = useCallback(
    (event: StreamEvent) => {
      switch (event.type) {
        case "step_start":
          setState((prev) => ({
            ...prev,
            currentStep: event.step || null,
            progress: event.data?.progressPercent || prev.progress,
          }));
          onStepStart?.(event.step || "", event.data);
          break;

        case "step_end":
          setState((prev) => ({
            ...prev,
            progress: event.data?.progressPercent || prev.progress,
          }));
          onStepEnd?.(event.step || "", event.data);
          break;

        case "step_error":
          setState((prev) => ({
            ...prev,
            error: event.data?.error || "Step failed",
          }));
          break;

        case "session_end":
          setState((prev) => ({
            ...prev,
            isStreaming: false,
            progress: 100,
          }));
          break;
      }
    },
    [onStepStart, onStepEnd]
  );

  const handleMessageEvent = useCallback(
    (event: StreamEvent) => {
      if (event.type === "token" && event.data?.token) {
        setState((prev) => ({
          ...prev,
          tokens: [...prev.tokens, event.data.token],
          streamedContent: event.data.fullContent || prev.streamedContent + event.data.token,
        }));
        onToken?.(event.data.token, event.data.fullContent || "");
      }
    },
    [onToken]
  );

  const stopStream = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setState((prev) => ({
      ...prev,
      isStreaming: false,
    }));
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    ...state,
    startStream,
    stopStream,
  };
}
