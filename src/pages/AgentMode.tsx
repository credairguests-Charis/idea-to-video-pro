import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { AgentConsole } from "@/components/agent/AgentConsole";
import { AgentPreview } from "@/components/agent/AgentPreview";
import { AgentInput } from "@/components/agent/AgentInput";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AgentLog {
  id: string;
  step_name: string;
  status: string;
  tool_name?: string;
  input_data?: any;
  output_data?: any;
  error_message?: string;
  duration_ms?: number;
  created_at: string;
}

interface AgentSession {
  id: string;
  state: string;
  current_step?: string;
  progress?: number;
  metadata?: any;
}

export default function AgentMode() {
  const { user } = useAuth();
  const [session, setSession] = useState<AgentSession | null>(null);
  const [logs, setLogs] = useState<AgentLog[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);

  useEffect(() => {
    if (!user || !session) return;

    // Subscribe to real-time logs
    const channel = supabase
      .channel(`agent-session:${session.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "agent_execution_logs",
          filter: `session_id=eq.${session.id}`,
        },
        (payload) => {
          const newLog = payload.new as AgentLog;
          setLogs((prev) => [...prev, newLog]);
          
          // Update preview if there's output data
          if (newLog.output_data) {
            setPreviewData(newLog.output_data);
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "agent_sessions",
          filter: `id=eq.${session.id}`,
        },
        (payload) => {
          setSession(payload.new as AgentSession);
          if (payload.new.state === "completed" || payload.new.state === "error") {
            setIsRunning(false);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, session]);

  const handleStartAgent = async (prompt: string) => {
    if (!user) return;

    try {
      setIsRunning(true);
      
      // Create new agent session
      const { data: newSession, error: sessionError } = await supabase
        .from("agent_sessions")
        .insert({
          user_id: user.id,
          state: "running",
          metadata: { prompt },
        })
        .select()
        .single();

      if (sessionError) throw sessionError;

      setSession(newSession);
      setLogs([]);
      setPreviewData(null);

      // Start agent execution via edge function
      const { error: execError } = await supabase.functions.invoke("agent-start", {
        body: { session_id: newSession.id, prompt },
      });

      if (execError) throw execError;

      toast.success("Agent started successfully");
    } catch (error) {
      console.error("Error starting agent:", error);
      toast.error("Failed to start agent");
      setIsRunning(false);
    }
  };

  const handleStopAgent = async () => {
    if (!session) return;

    try {
      await supabase
        .from("agent_sessions")
        .update({ state: "cancelled" })
        .eq("id", session.id);
      
      setIsRunning(false);
      toast.info("Agent execution stopped");
    } catch (error) {
      console.error("Error stopping agent:", error);
      toast.error("Failed to stop agent");
    }
  };

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Left Panel - Console & Input */}
      <div className="w-[420px] border-r border-border flex flex-col">
        <AgentConsole 
          logs={logs} 
          session={session}
          isRunning={isRunning}
          onStop={handleStopAgent}
        />
        <AgentInput 
          onSubmit={handleStartAgent} 
          isRunning={isRunning}
        />
      </div>

      {/* Right Panel - Preview */}
      <div className="flex-1 overflow-auto">
        <AgentPreview 
          data={previewData}
          session={session}
        />
      </div>
    </div>
  );
}
