import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { AgentChatPanel } from "@/components/agent/AgentChatPanel";
import { AgentWorkspace } from "@/components/agent/AgentWorkspace";
import { AgentNavbar } from "@/components/agent/AgentNavbar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { PanelLeftClose, PanelLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

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
  title?: string;
}

export default function AgentMode() {
  const { user } = useAuth();
  const [session, setSession] = useState<AgentSession | null>(null);
  const [logs, setLogs] = useState<AgentLog[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [userPrompt, setUserPrompt] = useState<string>("");
  const [isLeftPanelCollapsed, setIsLeftPanelCollapsed] = useState(false);
  const [workspaceTitle, setWorkspaceTitle] = useState("Untitled Workspace");
  const leftPanelRef = useRef<any>(null);
  const titleSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load or create session on mount
  useEffect(() => {
    if (!user) return;

    const loadOrCreateSession = async () => {
      // Try to find an existing active session
      const { data: existingSession, error: fetchError } = await supabase
        .from("agent_sessions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (existingSession && !fetchError) {
        setSession({
          id: existingSession.id,
          state: existingSession.state,
          current_step: existingSession.current_step || undefined,
          progress: existingSession.progress || 0,
          metadata: existingSession.metadata,
          title: existingSession.title || "Untitled Workspace",
        });
        setWorkspaceTitle(existingSession.title || "Untitled Workspace");
      } else {
        // Create a new session
        const { data: newSession, error: createError } = await supabase
          .from("agent_sessions")
          .insert({
            user_id: user.id,
            state: "idle",
            title: "Untitled Workspace",
          })
          .select()
          .single();

        if (newSession && !createError) {
          setSession({
            id: newSession.id,
            state: newSession.state,
            progress: 0,
            title: newSession.title || "Untitled Workspace",
          });
        }
      }
    };

    loadOrCreateSession();
  }, [user]);

  // Save title to database with debounce
  const handleTitleChange = useCallback((newTitle: string) => {
    setWorkspaceTitle(newTitle);
    
    // Clear existing timeout
    if (titleSaveTimeoutRef.current) {
      clearTimeout(titleSaveTimeoutRef.current);
    }
    
    // Debounce save to database
    titleSaveTimeoutRef.current = setTimeout(async () => {
      if (!session?.id) return;
      
      const { error } = await supabase
        .from("agent_sessions")
        .update({ title: newTitle })
        .eq("id", session.id);
      
      if (error) {
        console.error("Failed to save workspace title:", error);
      }
    }, 500);
  }, [session?.id]);

  // Duplicate workspace
  const handleDuplicate = useCallback(async () => {
    if (!user || !session) return;
    
    try {
      const { data: newSession, error } = await supabase
        .from("agent_sessions")
        .insert({
          user_id: user.id,
          state: "idle",
          title: `${workspaceTitle} (Copy)`,
          metadata: session.metadata,
        })
        .select()
        .single();

      if (error) throw error;

      if (newSession) {
        setSession({
          id: newSession.id,
          state: newSession.state,
          progress: 0,
          title: newSession.title || "Untitled Workspace",
        });
        setWorkspaceTitle(newSession.title || "Untitled Workspace");
        setLogs([]);
        setPreviewData(null);
        toast.success("Workspace duplicated");
      }
    } catch (error) {
      console.error("Failed to duplicate workspace:", error);
      toast.error("Failed to duplicate workspace");
    }
  }, [user, session, workspaceTitle]);

  // Share workspace (placeholder - copies link)
  const handleShare = useCallback(() => {
    if (!session?.id) return;
    
    const shareUrl = `${window.location.origin}/app/agent-mode?session=${session.id}`;
    navigator.clipboard.writeText(shareUrl);
    toast.success("Share link copied to clipboard");
  }, [session?.id]);

  // Delete workspace
  const handleDelete = useCallback(async () => {
    if (!user || !session) return;
    
    const confirmed = window.confirm("Are you sure you want to delete this workspace? This action cannot be undone.");
    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from("agent_sessions")
        .delete()
        .eq("id", session.id);

      if (error) throw error;

      // Create a new session after deletion
      const { data: newSession, error: createError } = await supabase
        .from("agent_sessions")
        .insert({
          user_id: user.id,
          state: "idle",
          title: "Untitled Workspace",
        })
        .select()
        .single();

      if (newSession && !createError) {
        setSession({
          id: newSession.id,
          state: newSession.state,
          progress: 0,
          title: newSession.title || "Untitled Workspace",
        });
        setWorkspaceTitle(newSession.title || "Untitled Workspace");
        setLogs([]);
        setPreviewData(null);
        toast.success("Workspace deleted");
      }
    } catch (error) {
      console.error("Failed to delete workspace:", error);
      toast.error("Failed to delete workspace");
    }
  }, [user, session]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (titleSaveTimeoutRef.current) {
        clearTimeout(titleSaveTimeoutRef.current);
      }
    };
  }, []);

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

  const handleToggleCollapse = () => {
    if (leftPanelRef.current) {
      if (isLeftPanelCollapsed) {
        leftPanelRef.current.expand();
      } else {
        leftPanelRef.current.collapse();
      }
    }
  };

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Top Navigation Bar - Full Width */}
      <AgentNavbar 
        workspaceTitle={workspaceTitle} 
        sessionId={session?.id}
        onTitleChange={handleTitleChange}
        onDuplicate={handleDuplicate}
        onShare={handleShare}
        onDelete={handleDelete}
        onToggleCollapse={handleToggleCollapse}
      />

      {/* Main Content - Two Panel Layout with Resizable */}
      <div className="flex-1 overflow-hidden">
        <ResizablePanelGroup direction="horizontal" className="h-full">
          {/* Left Panel - Chat/Task Feed */}
          <ResizablePanel
            ref={leftPanelRef}
            defaultSize={25}
            minSize={18}
            maxSize={40}
            collapsible
            collapsedSize={0}
            onCollapse={() => setIsLeftPanelCollapsed(true)}
            onExpand={() => setIsLeftPanelCollapsed(false)}
            className="transition-all duration-300 ease-in-out"
          >
            <div className={`h-full transition-opacity duration-200 ${isLeftPanelCollapsed ? 'opacity-0' : 'opacity-100'}`}>
              <AgentChatPanel 
                logs={logs}
                isRunning={isRunning}
                userPrompt={userPrompt}
                onSubmit={handleStartAgent}
                isCollapsed={isLeftPanelCollapsed}
                onToggleCollapse={handleToggleCollapse}
              />
            </div>
          </ResizablePanel>

          {/* Resize Handle */}
          <ResizableHandle className="w-0 bg-transparent hover:bg-primary/10 hover:w-1 transition-all duration-200" />

          {/* Right Panel - Workspace with curved corners */}
          <ResizablePanel defaultSize={75} className="transition-all duration-300 ease-in-out">
            <div className="h-full bg-white rounded-tl-xl border-l border-t border-border/20 overflow-hidden relative">
              {/* Collapse toggle button - shown when panel is collapsed */}
              <div className={`absolute top-3 left-3 z-10 transition-all duration-300 ease-in-out ${isLeftPanelCollapsed ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}`}>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleToggleCollapse}
                  className="h-8 w-8 p-0 bg-white/80 backdrop-blur-sm border border-border/40 shadow-sm hover:bg-white hover:scale-105 transition-transform duration-200"
                >
                  <PanelLeft className="h-4 w-4" />
                </Button>
              </div>
              <AgentWorkspace 
                data={previewData}
                session={session}
              />
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
}
