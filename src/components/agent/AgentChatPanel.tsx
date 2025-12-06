import { useState, useRef, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Image, FileText, X, Globe, ArrowDown } from "lucide-react";
import { CharisLoader } from "@/components/ui/charis-loader";
import charisLogo from "@/assets/charis-logo-icon.png";
import { PromptInputBox } from "@/components/ui/ai-prompt-box";
import { supabase } from "@/integrations/supabase/client";
import { LogDetailCard } from "./LogDetailCard";
import { Button } from "@/components/ui/button";

export interface AgentLog {
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
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [isAutoScrollEnabled, setIsAutoScrollEnabled] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

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

  // Auto-scroll task list with user scroll detection
  useEffect(() => {
    if (scrollAreaRef.current && isAutoScrollEnabled) {
      const viewport = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (viewport) {
        viewport.scrollTop = viewport.scrollHeight;
      }
    }
  }, [allLogs, isAutoScrollEnabled]);

  // Handle scroll to detect manual scrolling
  useEffect(() => {
    const scrollArea = scrollAreaRef.current;
    if (!scrollArea) return;
    
    const viewport = scrollArea.querySelector('[data-radix-scroll-area-viewport]');
    if (!viewport) return;

    const handleScroll = () => {
      const isAtBottom = viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight < 50;
      setShowScrollButton(!isAtBottom);
      setIsAutoScrollEnabled(isAtBottom);
    };

    viewport.addEventListener('scroll', handleScroll);
    return () => viewport.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToBottom = () => {
    const viewport = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]');
    if (viewport) {
      viewport.scrollTo({ top: viewport.scrollHeight, behavior: 'smooth' });
      setIsAutoScrollEnabled(true);
    }
  };

  const removeFile = (fileId: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const removeUrl = (urlId: string) => {
    setAttachedUrls(prev => prev.filter(u => u.id !== urlId));
  };

  // Compute running and completed counts
  const runningCount = allLogs.filter(l => 
    l.status === "running" || l.status === "in_progress" || l.status === "started"
  ).length;
  const completedCount = allLogs.filter(l => 
    l.status === "success" || l.status === "completed"
  ).length;
  const failedCount = allLogs.filter(l => 
    l.status === "failed" || l.status === "error"
  ).length;

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

        {/* Task List Container - Lovable.dev Style Expandable Logs */}
        {(allLogs.length > 0 || isRunning) && (
          <div className="bg-[#F9FAFB] rounded-lg p-3 border border-border/30 relative">
            {/* Header with stats */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-foreground">
                  Execution Log
                </span>
                {allLogs.length > 0 && (
                  <span className="text-[10px] text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded">
                    {completedCount}/{allLogs.length} steps
                    {failedCount > 0 && <span className="text-red-500 ml-1">• {failedCount} failed</span>}
                  </span>
                )}
              </div>
              {isRunning && (
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-[10px] text-green-600 font-medium">
                    Live
                  </span>
                </div>
              )}
            </div>
            
            <ScrollArea ref={scrollAreaRef} className="max-h-[400px]">
              <div className="space-y-2 pr-2">
                {allLogs.map((log) => (
                  <LogDetailCard
                    key={log.id}
                    id={log.id}
                    stepName={log.step_name}
                    status={log.status}
                    toolName={log.tool_name}
                    inputData={log.input_data}
                    outputData={log.output_data}
                    errorMessage={log.error_message}
                    durationMs={log.duration_ms}
                    createdAt={log.created_at}
                  />
                ))}
                
                {isRunning && allLogs.length === 0 && (
                  <div className="flex items-center gap-2 py-3 px-2 border border-border/30 rounded-lg bg-white">
                    <CharisLoader size="xs" />
                    <span className="text-sm text-muted-foreground">Initializing workflow...</span>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Scroll to bottom button */}
            {showScrollButton && (
              <div className="absolute bottom-14 left-1/2 -translate-x-1/2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={scrollToBottom}
                  className="h-7 px-3 text-xs shadow-md border border-border/50"
                >
                  <ArrowDown className="h-3 w-3 mr-1" />
                  Scroll to latest
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Empty State */}
        {!userPrompt && allLogs.length === 0 && (
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
