import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { AgentChatPanel, ChatMessage } from "@/components/agent/AgentChatPanel";
import { AgentWorkspace } from "@/components/agent/AgentWorkspace";
import { AgentNavbar } from "@/components/agent/AgentNavbar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { PanelLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { CharisLoader } from "@/components/ui/charis-loader";

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
  const { user, loading: authLoading } = useAuth();
  const [session, setSession] = useState<AgentSession | null>(null);
  const [logs, setLogs] = useState<AgentLog[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [userPrompt, setUserPrompt] = useState<string>("");
  const [isLeftPanelCollapsed, setIsLeftPanelCollapsed] = useState(false);
  const [workspaceTitle, setWorkspaceTitle] = useState("Untitled Workspace");
  const [isInitializing, setIsInitializing] = useState(true);
  
  // Chat messages state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streamingContent, setStreamingContent] = useState<string>("");
  
  // Intermediate data for real-time display
  const [intermediateData, setIntermediateData] = useState<{
    extractedAds: any[];
    downloadedVideos: any[];
    videoAnalyses: any[];
  }>({
    extractedAds: [],
    downloadedVideos: [],
    videoAnalyses: [],
  });
  const leftPanelRef = useRef<any>(null);
  const titleSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const streamAbortRef = useRef<AbortController | null>(null);

  // (Legacy manual SSE streaming removed.)
  // Live streaming is now handled exclusively via useAgentStream inside AgentChatPanel,
  // which calls the agent-stream edge function and powers the left-panel Agent Activity log.


  // Load or create session on mount
  useEffect(() => {
    if (!user) {
      setIsInitializing(false);
      return;
    }

    const loadOrCreateSession = async () => {
      try {
        setIsInitializing(true);
        
        // Try to find an existing active session
        const { data: existingSession, error: fetchError } = await supabase
          .from("agent_sessions")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

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
          
          // Load existing chat messages and logs for this session
          await Promise.all([
            loadChatMessages(existingSession.id),
            loadExecutionLogs(existingSession.id),
          ]);
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
            setMessages([]);
          } else if (createError) {
            console.error("[AgentMode] Failed to create session:", createError);
            toast.error("Failed to initialize workspace");
          }
        }
      } catch (error) {
        console.error("[AgentMode] Session initialization error:", error);
        toast.error("Failed to load workspace");
      } finally {
        setIsInitializing(false);
      }
    };

    loadOrCreateSession();
  }, [user]);

  // Load chat messages for a session
  const loadChatMessages = async (sessionId: string) => {
    try {
      const { data, error } = await supabase
        .from("agent_chat_messages")
        .select("*")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("[AgentMode] Failed to load messages:", error);
        return;
      }

      if (data) {
        setMessages(data.map(msg => ({
          id: msg.id,
          role: msg.role as "user" | "assistant" | "system",
          content: msg.content,
          is_streaming: msg.is_streaming || false,
          created_at: msg.created_at,
          metadata: msg.metadata,
        })));
      }
    } catch (error) {
      console.error("[AgentMode] Error loading messages:", error);
    }
  };

  // Load execution logs for a session
  const loadExecutionLogs = async (sessionId: string) => {
    try {
      const { data, error } = await supabase
        .from("agent_execution_logs")
        .select("*")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("[AgentMode] Failed to load logs:", error);
        return;
      }

      if (data) {
        setLogs(data as AgentLog[]);
      }
    } catch (error) {
      console.error("[AgentMode] Error loading logs:", error);
    }
  };

  // Subscribe to real-time chat message updates
  useEffect(() => {
    if (!session?.id) return;

    const channel = supabase
      .channel(`agent-chat-${session.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "agent_chat_messages",
          filter: `session_id=eq.${session.id}`,
        },
        (payload) => {
          console.log("[AgentMode] Chat message event:", payload.eventType, payload.new);
          
          if (payload.eventType === "INSERT") {
            const newMsg = payload.new as any;
            setMessages((prev) => {
              if (prev.find(m => m.id === newMsg.id)) return prev;
              return [...prev, {
                id: newMsg.id,
                role: newMsg.role,
                content: newMsg.content,
                is_streaming: newMsg.is_streaming || false,
                created_at: newMsg.created_at,
                metadata: newMsg.metadata,
              }];
            });
          } else if (payload.eventType === "UPDATE") {
            const updatedMsg = payload.new as any;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === updatedMsg.id
                  ? {
                      ...m,
                      content: updatedMsg.content,
                      is_streaming: updatedMsg.is_streaming || false,
                      metadata: updatedMsg.metadata,
                    }
                  : m
              )
            );
            
            // If streaming finished, clear streaming content
            if (!updatedMsg.is_streaming) {
              setStreamingContent("");
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session?.id]);

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
        setMessages([]);
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
        setMessages([]);
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
          event: "*",
          schema: "public",
          table: "agent_execution_logs",
          filter: `session_id=eq.${session.id}`,
        },
        (payload) => {
          console.log("[AgentMode] Log event:", payload.eventType, payload.new);
          
          if (payload.eventType === "INSERT") {
            const newLog = payload.new as AgentLog;
            setLogs((prev) => {
              if (prev.find(l => l.id === newLog.id)) return prev;
              return [...prev, newLog];
            });
            
            // Extract intermediate data from logs for real-time preview
            if (newLog.output_data) {
              const output = newLog.output_data;
              
              // Update extracted ads
              if (output.ads && Array.isArray(output.ads)) {
                setIntermediateData(prev => ({
                  ...prev,
                  extractedAds: [...prev.extractedAds, ...output.ads]
                }));
              }
              
              // Update downloaded videos
              if (output.downloaded_videos && Array.isArray(output.downloaded_videos)) {
                setIntermediateData(prev => ({
                  ...prev,
                  downloadedVideos: [...prev.downloadedVideos, ...output.downloaded_videos]
                }));
              }
              if (output.videos && Array.isArray(output.videos)) {
                setIntermediateData(prev => ({
                  ...prev,
                  downloadedVideos: [...prev.downloadedVideos, ...output.videos]
                }));
              }
              
              // Update video analyses
              if (output.analyses && Array.isArray(output.analyses)) {
                setIntermediateData(prev => ({
                  ...prev,
                  videoAnalyses: [...prev.videoAnalyses, ...output.analyses]
                }));
              }
              if (output.video_analyses && Array.isArray(output.video_analyses)) {
                setIntermediateData(prev => ({
                  ...prev,
                  videoAnalyses: [...prev.videoAnalyses, ...output.video_analyses]
                }));
              }
              
              // Update preview data with latest synthesis
              if (output.synthesisId || output.suggestedScripts || output.adAnalyses) {
                setPreviewData(output);
              }
            }
          } else if (payload.eventType === "UPDATE") {
            const updatedLog = payload.new as AgentLog;
            setLogs((prev) => 
              prev.map((l) => l.id === updatedLog.id ? updatedLog : l)
            );
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
    if (!user || !session?.id) return;

    try {
      setIsRunning(true);
      setLogs([]);
      setPreviewData(null);
      setIntermediateData({ extractedAds: [], downloadedVideos: [], videoAnalyses: [] });
      setUserPrompt(brandData.prompt || brandData.competitorQuery || "");
      setStreamingContent("");
      
      const userMessageContent = brandData.prompt || brandData.competitorQuery || "";
      
      // Insert user message into database
      const { data: userMsg, error: userMsgError } = await supabase
        .from("agent_chat_messages")
        .insert({
          session_id: session.id,
          role: "user",
          content: userMessageContent,
          metadata: {
            attachedFiles: brandData.attachedFiles,
            attachedUrls: brandData.attachedUrls,
          },
        })
        .select()
        .single();

      if (userMsgError) {
        console.error("Failed to save user message:", userMsgError);
      }

      // Streaming of the assistant response is now handled by useAgentStream
      // inside AgentChatPanel via the agent-stream edge function.

      // Then run the full workflow in background
      toast.info("Starting analysis workflow...");

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
            sessionId: session.id,
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
        
        // Defensive check: only set preview data if it's a valid object
        const synthesisData = data.synthesis;
        if (synthesisData && typeof synthesisData === 'object') {
          setPreviewData(synthesisData);
        } else {
          console.warn("[AgentMode] Invalid synthesis data received:", synthesisData);
          setPreviewData(null);
        }
        
        // Insert assistant message with results summary
        const { metadata } = data;
        const summaryMessage = `I've completed the analysis. Here's what I found:

• **Competitors Found:** ${metadata?.competitorsFound || 0}
• **Ads Extracted:** ${metadata?.adsExtracted || 0}
• **Videos Analyzed:** ${metadata?.videosAnalyzed || 0}

Check the results panel on the right for detailed insights, scripts, and recommendations.`;

        await supabase.from("agent_chat_messages").insert({
          session_id: session.id,
          role: "assistant",
          content: summaryMessage,
          metadata: { 
            success: true,
            competitorsFound: metadata?.competitorsFound,
            adsExtracted: metadata?.adsExtracted,
            videosAnalyzed: metadata?.videosAnalyzed,
          },
        });
        
        toast.success(
          `Workflow completed! Found ${metadata?.competitorsFound || 0} competitors, ${metadata?.adsExtracted || 0} ads, analyzed ${metadata?.videosAnalyzed || 0} videos.`,
          { duration: 5000 }
        );
      } else {
        const errorMessage = data?.error || "Workflow failed";
        toast.error(errorMessage);
        
        // Insert error message
        await supabase.from("agent_chat_messages").insert({
          session_id: session.id,
          role: "assistant",
          content: `I encountered an issue: ${errorMessage}. Please try again or adjust your query.`,
          metadata: { error: true },
        });
        
        setIsRunning(false);
        return;
      }

      setIsRunning(false);
    } catch (error) {
      console.error("Error starting workflow:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to start workflow";
      toast.error(errorMessage);
      
      // Insert error message
      if (session?.id) {
        await supabase.from("agent_chat_messages").insert({
          session_id: session.id,
          role: "assistant",
          content: `Sorry, something went wrong: ${errorMessage}`,
          metadata: { error: true },
        });
      }
      
      setIsRunning(false);
    }
  };

  // Show loading state
  if (authLoading || isInitializing) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-white">
        <CharisLoader size="lg" />
        <p className="mt-4 text-sm text-muted-foreground">Loading workspace...</p>
      </div>
    );
  }

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
    <ErrorBoundary>
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
        onViewHistory={() => {
          toast.info("Workspace history feature coming soon!");
        }}
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
                sessionId={session?.id}
                userId={user.id}
                messages={messages}
                onMessagesChange={setMessages}
                streamingContent={streamingContent}
              />
            </div>
          </ResizablePanel>

          {/* Resize Handle */}
          <ResizableHandle className="w-0 bg-transparent hover:bg-primary/10 hover:w-1 transition-all duration-200" />

          {/* Right Panel - Workspace with curved corners */}
          <ResizablePanel defaultSize={75} className="transition-all duration-300 ease-in-out">
            <div className="h-full py-3 pr-3 bg-white">
              <div className="h-full bg-white rounded-xl border border-border overflow-hidden relative">
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
                  intermediateData={intermediateData}
                />
              </div>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
    </ErrorBoundary>
  );
}
