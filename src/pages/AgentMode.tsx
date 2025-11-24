import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { AgentConsole } from "@/components/agent/AgentConsole";
import { AgentPreview } from "@/components/agent/AgentPreview";
import { AgentInput } from "@/components/agent/AgentInput";
import { AgentTimeline } from "@/components/agent/AgentTimeline";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

  const handleStartAgent = async (brandData: any) => {
    if (!user) return;

    try {
      setIsRunning(true);
      setLogs([]);
      setPreviewData(null);
      
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
    <div className="flex flex-col h-screen bg-background">
      {/* Top Sticky Menu Bar */}
      <div className="sticky top-0 z-50 h-12 flex items-center justify-between px-4 border-b border-border bg-card">
        <div className="flex items-center gap-3">
          <h1 className="text-sm font-semibold">Agent Mode</h1>
          <span className="text-xs text-muted-foreground">/app/agent-mode</span>
        </div>
        <div className="flex items-center gap-2">
          {session && (
            <span className="text-xs text-muted-foreground">
              Session: {session.id.slice(0, 8)}...
            </span>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel - Console (Fixed Width: 420-480px) */}
        <div className="w-[460px] flex flex-col border-r border-border">
          <Tabs defaultValue="console" className="flex-1 flex flex-col">
            <TabsList className="w-full justify-start border-b rounded-none bg-transparent px-4">
              <TabsTrigger value="console" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent">
                Console
              </TabsTrigger>
              <TabsTrigger value="timeline" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent">
                Timeline
              </TabsTrigger>
            </TabsList>
            <TabsContent value="console" className="flex-1 mt-0 flex flex-col">
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
            </TabsContent>
            <TabsContent value="timeline" className="flex-1 mt-0">
              <AgentTimeline 
                logs={logs}
                session={session}
              />
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Panel - Preview (Flexible Width) */}
        <div className="flex-1 overflow-auto bg-muted/30">
          <AgentPreview 
            data={previewData}
            session={session}
          />
        </div>
      </div>
    </div>
  );
}
