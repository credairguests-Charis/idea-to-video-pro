import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { AgentChatPanel } from "@/components/agent/AgentChatPanel";
import { AgentWorkspace } from "@/components/agent/AgentWorkspace";
import { AgentNavbar } from "@/components/agent/AgentNavbar";
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
  const [userPrompt, setUserPrompt] = useState<string>("");

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

  const handleStartAgent = async (brandData: any) => {
    if (!user) return;

    try {
      setIsRunning(true);
      setLogs([]);
      setPreviewData(null);
      setUserPrompt(brandData.prompt || brandData.competitorQuery || "");
      
      toast.info("Starting workflow...");

      // Call the agent-workflow edge function
      const { data, error } = await supabase.functions.invoke("agent-workflow", {
        body: {
          input: {
            brandName: brandData.brandName || "Unknown Brand",
            productCategory: brandData.productCategory || "SaaS",
            targetAudience: brandData.targetAudience || "General",
            brandVoice: brandData.brandVoice || "Professional",
            keyMessages: brandData.keyMessages || ["Quality", "Innovation"],
            competitorQuery: brandData.competitorQuery || brandData.prompt || "competitors",
            maxCompetitors: brandData.maxCompetitors || 3,
            userId: user.id,
          },
        },
      });

      if (error) {
        console.error("Workflow error:", error);
        const errorMessage = error.message || "Failed to start workflow";
        toast.error(errorMessage);
        setIsRunning(false);
        return;
      }

      if (data?.success) {
        setSession({
          id: data.sessionId,
          state: "completed",
          progress: 100,
          metadata: data.metadata,
        });
        setPreviewData(data.synthesis);
        
        // Show detailed success message
        const { metadata } = data;
        toast.success(
          `Workflow completed! Found ${metadata?.competitorsFound || 0} competitors, ${metadata?.adsExtracted || 0} ads, analyzed ${metadata?.videosAnalyzed || 0} videos.`,
          { duration: 5000 }
        );
      } else {
        const errorMessage = data?.error || "Workflow failed";
        toast.error(errorMessage);
        setIsRunning(false);
        return;
      }

      setIsRunning(false);
    } catch (error) {
      console.error("Error starting workflow:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to start workflow";
      toast.error(errorMessage);
      setIsRunning(false);
    }
  };

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Top Navigation Bar */}
      <AgentNavbar 
        workspaceTitle="Charis Agent Workspace" 
        sessionId={session?.id}
      />

      {/* Main Content - Two Panel Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel - Chat/Task Feed (Fixed Width: 380-420px) */}
        <div className="w-[400px] flex-shrink-0 border-r border-border/50">
          <AgentChatPanel 
            logs={logs}
            isRunning={isRunning}
            userPrompt={userPrompt}
            onSubmit={handleStartAgent}
          />
        </div>

        {/* Right Panel - Workspace (Flexible Width) */}
        <div className="flex-1 overflow-hidden">
          <AgentWorkspace 
            data={previewData}
            session={session}
          />
        </div>
      </div>
    </div>
  );
}
