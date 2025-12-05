import { useState, useRef, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Check, Image, FileText, X, Globe } from "lucide-react";
import { CharisLoader } from "@/components/ui/charis-loader";
import charisLogo from "@/assets/charis-logo-icon.png";
import { PromptInputBox } from "@/components/ui/ai-prompt-box";

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
}

export function AgentChatPanel({ logs, isRunning, userPrompt, onSubmit }: AgentChatPanelProps) {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [attachedUrls, setAttachedUrls] = useState<AttachedUrl[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll task list
  useEffect(() => {
    if (scrollRef.current) {
      const viewport = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (viewport) {
        viewport.scrollTop = viewport.scrollHeight;
      }
    }
  }, [logs]);

  const removeFile = (fileId: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const removeUrl = (urlId: string) => {
    setAttachedUrls(prev => prev.filter(u => u.id !== urlId));
  };

  // Convert logs to task items
  const taskItems = logs.map((log) => ({
    id: log.id,
    icon: log.status === "success" || log.status === "completed" ? "check" : 
          log.status === "running" || log.status === "in_progress" ? "loading" : "search",
    text: log.step_name.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
    status: log.status,
  }));

  const getTaskIcon = (icon: string, status: string) => {
    if (status === "running" || status === "in_progress") {
      return <CharisLoader size="xs" />;
    }
    if (status === "success" || status === "completed") {
      return <Check className="h-3.5 w-3.5 text-green-600" />;
    }
    return <Search className="h-3.5 w-3.5 text-muted-foreground" />;
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
              ) : logs.length > 0 ? (
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
            <div className="flex items-center gap-2 mb-2.5">
              <span className="text-xs font-medium text-foreground">
                Build<span className="text-primary">ing</span> <span className="text-primary">Agent</span> task list
              </span>
            </div>
            
            <ScrollArea ref={scrollRef} className="max-h-[240px]">
              <div className="space-y-0.5">
                {taskItems.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center gap-2 py-1.5 px-1.5 rounded text-muted-foreground"
                  >
                    {getTaskIcon(task.icon, task.status)}
                    <span className="text-sm truncate">
                      {task.text}
                    </span>
                  </div>
                ))}
                
                {isRunning && (
                  <div className="flex items-center gap-2 py-1.5 px-1.5">
                    <CharisLoader size="xs" />
                    <span className="text-sm text-muted-foreground">Processing...</span>
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
          placeholder="Ask Charis"
          disabled={isRunning}
        />
      </div>
    </div>
  );
}
