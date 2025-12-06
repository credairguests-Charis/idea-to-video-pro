import { useState, useRef, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Check, Image, FileText, X, Globe, Flame, Video, Brain, Download, Smartphone } from "lucide-react";
import { CharisLoader } from "@/components/ui/charis-loader";
import charisLogo from "@/assets/charis-logo-icon.png";
import { PromptInputBox } from "@/components/ui/ai-prompt-box";
import { supabase } from "@/integrations/supabase/client";

interface AgentLog {
  id: string;
  step_name: string;
  status: string;
  tool_name?: string;
  input_data?: {
    tool_icon?: string;
    progress_percent?: number;
    sub_step?: string;
    [key: string]: any;
  };
  output_data?: any;
  error_message?: string;
  duration_ms?: number;
  created_at: string;
}

interface UploadedFile {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
  isUploading?: boolean;
}

interface AttachedUrl {
  id: string;
  url: string;
  title?: string;
}

interface AgentChatPanelProps {
  logs: AgentLog[];
  isRunning: boolean;
  userPrompt?: string;
  onSubmit: (brandData: any) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  sessionId?: string;
}

// Tool icon mapping
const getToolIcon = (toolName?: string, inputData?: any) => {
  // Check for custom icon in input_data
  const customIcon = inputData?.tool_icon;
  if (customIcon) {
    return <span className="text-sm">{customIcon}</span>;
  }

  // Default icon mapping
  switch (toolName) {
    case "firecrawl_mcp":
    case "firecrawl_meta_ads_scraper":
    case "klavis_firecrawl_mcp":
      return <Flame className="h-3.5 w-3.5 text-orange-500" />;
    case "meta_ads_extractor":
    case "firecrawl_meta_ads":
      return <Smartphone className="h-3.5 w-3.5 text-blue-500" />;
    case "video_download_service":
      return <Download className="h-3.5 w-3.5 text-purple-500" />;
    case "azure_video_indexer":
    case "azure-video-analyzer":
      return <Video className="h-3.5 w-3.5 text-cyan-500" />;
    case "llm_synthesizer":
    case "llm-synthesis-engine":
      return <Brain className="h-3.5 w-3.5 text-pink-500" />;
    default:
      return <Search className="h-3.5 w-3.5 text-muted-foreground" />;
  }
};

export function AgentChatPanel({ 
  logs, 
  isRunning, 
  userPrompt, 
  onSubmit, 
  sessionId 
}: AgentChatPanelProps) {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [attachedUrls, setAttachedUrls] = useState<AttachedUrl[]>([]);
  const [realtimeLogs, setRealtimeLogs] = useState<AgentLog[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Combine passed logs with realtime logs - with null safety
  const safeLogs = Array.isArray(logs) ? logs : [];
  const safeRealtimeLogs = Array.isArray(realtimeLogs) ? realtimeLogs : [];
  
  const allLogs = [...safeLogs, ...safeRealtimeLogs].reduce((acc, log) => {
    if (log && log.id && !acc.find(l => l.id === log.id)) {
      acc.push(log);
    }
    return acc;
  }, [] as AgentLog[]);

  // Subscribe to real-time log updates
  useEffect(() => {
    if (!sessionId) return;

    const channel = supabase
      .channel(`agent-logs-${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "agent_execution_logs",
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          console.log("[AgentChatPanel] New log received:", payload.new);
          const newLog = payload.new as AgentLog;
          setRealtimeLogs((prev) => {
            if (prev.find(l => l.id === newLog.id)) return prev;
            return [...prev, newLog];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  // Clear realtime logs when session changes
  useEffect(() => {
    setRealtimeLogs([]);
  }, [sessionId]);

  // Auto-scroll task list
  useEffect(() => {
    if (scrollRef.current) {
      const viewport = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (viewport) {
        viewport.scrollTop = viewport.scrollHeight;
      }
    }
  }, [allLogs]);

  const removeFile = (fileId: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const removeUrl = (urlId: string) => {
    setAttachedUrls(prev => prev.filter(u => u.id !== urlId));
  };

  // Convert logs to task items with enhanced display
  const taskItems = allLogs.map((log) => {
    const progressPercent = log.input_data?.progress_percent;
    const subStep = log.input_data?.sub_step;
    
    return {
      id: log.id,
      toolName: log.tool_name,
      inputData: log.input_data,
      text: subStep || log.step_name.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
      status: log.status,
      progress: progressPercent,
      duration: log.duration_ms,
      outputData: log.output_data,
    };
  });

  const getStatusIcon = (status: string, toolName?: string, inputData?: any) => {
    // Handle all possible status values including "started" which is the valid DB value
    if (status === "running" || status === "in_progress" || status === "started") {
      return <CharisLoader size="xs" />;
    }
    if (status === "success" || status === "completed") {
      return <Check className="h-3.5 w-3.5 text-green-600" />;
    }
    if (status === "failed" || status === "error") {
      return <X className="h-3.5 w-3.5 text-red-500" />;
    }
    if (status === "skipped") {
      return <Check className="h-3.5 w-3.5 text-muted-foreground" />;
    }
    return getToolIcon(toolName, inputData);
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) {
      return <Image className="h-3.5 w-3.5" />;
    }
    return <FileText className="h-3.5 w-3.5" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDuration = (ms?: number) => {
    if (!ms) return "";
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Chat Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* User Message Bubble */}
        {userPrompt && (
          <div className="bg-[#F3F4F6] rounded-lg p-3.5 text-sm text-foreground leading-relaxed">
            {userPrompt}
          </div>
        )}

        {/* Agent Response */}
        {userPrompt && (
          <div className="space-y-3">
            {/* Agent Header */}
            <div className="flex items-center gap-2">
              <img src={charisLogo} alt="Charis" className="w-5 h-5 rounded" />
              <span className="text-sm font-medium text-foreground">Charis</span>
            </div>
            
            {/* Agent Message */}
            <div className="text-sm text-foreground leading-relaxed">
              {isRunning ? (
                <span className="flex items-center gap-2">
                  <CharisLoader size="xs" />
                  Processing your request...
                </span>
              ) : allLogs.some(l => l.status === "completed") ? (
                "I've completed the analysis. Check the results on the right panel."
              ) : (
                "I'll build a targeted list based on your criteria."
              )}
            </div>
          </div>
        )}

        {/* Task List Container */}
        {(taskItems.length > 0 || isRunning) && (
          <div className="bg-[#F9FAFB] rounded-lg p-3 border border-border/30">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs font-medium text-foreground">
                Agent Workflow
              </span>
              {isRunning && (
                <span className="text-xs text-muted-foreground animate-pulse">
                  Live
                </span>
              )}
            </div>
            
            <ScrollArea ref={scrollRef} className="max-h-[320px]">
              <div className="space-y-1">
                {taskItems.map((task) => (
                  <div
                    key={task.id}
                    className={`flex items-start gap-2 py-2 px-2 rounded transition-colors ${
                      task.status === "running" || task.status === "started" ? "bg-primary/5" : ""
                    }`}
                  >
                    <div className="mt-0.5">
                      {getStatusIcon(task.status, task.toolName, task.inputData)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm truncate ${
                          task.status === "running" || task.status === "started" ? "text-foreground font-medium" : "text-muted-foreground"
                        }`}>
                          {task.text}
                        </span>
                        {task.duration && task.status === "completed" && (
                          <span className="text-xs text-muted-foreground/60">
                            {formatDuration(task.duration)}
                          </span>
                        )}
                      </div>
                      
                      {/* Progress bar for running/started tasks */}
                      {(task.status === "running" || task.status === "started") && task.progress !== undefined && (
                        <div className="mt-1.5 w-full bg-muted rounded-full h-1">
                          <div 
                            className="bg-primary h-1 rounded-full transition-all duration-500"
                            style={{ width: `${task.progress}%` }}
                          />
                        </div>
                      )}
                      
                      {/* Output summary for completed tasks */}
                      {task.status === "completed" && task.outputData && (
                        <div className="mt-1 text-xs text-muted-foreground/70">
                          {task.outputData.competitors_found !== undefined && (
                            <span>{task.outputData.competitors_found} competitors found</span>
                          )}
                          {task.outputData.total_ads !== undefined && (
                            <span>{task.outputData.total_ads} ads extracted</span>
                          )}
                          {task.outputData.videos_analyzed !== undefined && (
                            <span>{task.outputData.videos_analyzed} videos analyzed</span>
                          )}
                          {task.outputData.scriptsCount !== undefined && (
                            <span>{task.outputData.scriptsCount} scripts generated</span>
                          )}
                        </div>
                      )}
                    </div>
                    
                    {/* Tool badge */}
                    {task.toolName && task.status !== "running" && task.status !== "started" && (
                      <div className="flex-shrink-0">
                        {getToolIcon(task.toolName, task.inputData)}
                      </div>
                    )}
                  </div>
                ))}
                
                {isRunning && taskItems.length === 0 && (
                  <div className="flex items-center gap-2 py-1.5 px-1.5">
                    <CharisLoader size="xs" />
                    <span className="text-sm text-muted-foreground">Initializing workflow...</span>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Empty State */}
        {!userPrompt && taskItems.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center px-6 py-12">
            <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
              <Search className="h-7 w-7 text-primary" />
            </div>
            <h3 className="text-base font-medium text-foreground mb-1.5">Start a conversation</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Ask Charis to analyze competitors, research trends, or generate insights.
            </p>
          </div>
        )}
      </div>

      {/* Bottom Input - Sticky */}
      <div className="p-3 bg-white">
        {/* Attached URLs Preview */}
        {attachedUrls.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {attachedUrls.map((urlItem) => (
              <div
                key={urlItem.id}
                className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 rounded-md px-2 py-1.5 text-xs"
              >
                <Globe className="h-3.5 w-3.5 text-blue-600" />
                <span className="max-w-[120px] truncate text-blue-700 font-medium">{urlItem.title}</span>
                <button
                  type="button"
                  onClick={() => removeUrl(urlItem.id)}
                  className="p-0.5 rounded hover:bg-blue-100 text-blue-500 hover:text-blue-700 transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Uploaded Files Preview */}
        {uploadedFiles.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {uploadedFiles.map((file) => (
              <div
                key={file.id}
                className="flex items-center gap-1.5 bg-white border border-border/50 rounded-md px-2 py-1.5 text-xs"
              >
                {file.isUploading ? (
                  <CharisLoader size="xs" />
                ) : (
                  getFileIcon(file.type)
                )}
                <span className="max-w-[100px] truncate text-foreground">{file.name}</span>
                <span className="text-muted-foreground">{formatFileSize(file.size)}</span>
                {!file.isUploading && (
                  <button
                    type="button"
                    onClick={() => removeFile(file.id)}
                    className="p-0.5 rounded hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        <PromptInputBox
          onSend={(message) => {
            if (!message.trim() && uploadedFiles.length === 0 && attachedUrls.length === 0) return;
            onSubmit({
              prompt: message.trim(),
              brandName: "Agent Query",
              competitorQuery: message.trim(),
              attachedFiles: uploadedFiles.map(f => ({ name: f.name, url: f.url, type: f.type })),
              attachedUrls: attachedUrls.map(u => ({ url: u.url, title: u.title })),
            });
            setUploadedFiles([]);
            setAttachedUrls([]);
          }}
          isLoading={isRunning}
          placeholder="Ask Charis..."
          disabled={isRunning}
        />
      </div>
    </div>
  );
}
