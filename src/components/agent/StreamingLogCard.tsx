import { useState } from "react";
import { ChevronDown, ChevronRight, CheckCircle2, XCircle, Loader2, Clock, Zap, Database, Eye, Search, FileText, Cpu } from "lucide-react";
import { cn } from "@/lib/utils";
import { StreamEvent } from "@/hooks/useAgentStream";

interface StreamingLogCardProps {
  event: StreamEvent;
  isExpanded?: boolean;
}

// Map tool categories to colors
const categoryColors: Record<string, string> = {
  data_ingestion: "bg-orange-100 text-orange-700 border-orange-200",
  analysis: "bg-purple-100 text-purple-700 border-purple-200",
  research: "bg-blue-100 text-blue-700 border-blue-200",
  output: "bg-green-100 text-green-700 border-green-200",
  memory: "bg-cyan-100 text-cyan-700 border-cyan-200",
  unknown: "bg-gray-100 text-gray-700 border-gray-200",
};

// Map tool names to icons
const toolIconComponents: Record<string, React.ReactNode> = {
  scrape_meta_ads: <Zap className="h-3 w-3" />,
  download_video: <Database className="h-3 w-3" />,
  extract_frames: <FileText className="h-3 w-3" />,
  analyze_ad_creative: <Eye className="h-3 w-3" />,
  search_brand_niche: <Search className="h-3 w-3" />,
  llm_synthesis: <Cpu className="h-3 w-3" />,
  model_inference: <Cpu className="h-3 w-3" />,
};

export function StreamingLogCard({ event, isExpanded: defaultExpanded = false }: StreamingLogCardProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  // Filter out token events for the main log view (too noisy)
  if (event.type === "token") {
    return null;
  }

  const isToolEvent = event.type.startsWith("tool_");
  const toolData = event.data || {};
  const toolName = toolData.toolName || event.node || "";
  const toolIcon = toolData.toolIcon || "⚙️";
  const toolCategory = toolData.toolCategory || "unknown";
  const progress = toolData.progress || {};
  const timing = toolData.timing || {};
  const args = toolData.args || {};
  const result = toolData.result || {};

  const getStatusIcon = () => {
    switch (event.type) {
      case "tool_start":
      case "step_start":
        return <Loader2 className="h-3.5 w-3.5 text-blue-500 animate-spin" />;
      case "tool_end":
      case "step_end":
        return <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />;
      case "tool_error":
      case "step_error":
      case "error":
        return <XCircle className="h-3.5 w-3.5 text-red-500" />;
      case "tool_progress":
        return <Loader2 className="h-3.5 w-3.5 text-amber-500 animate-spin" />;
      default:
        return <Clock className="h-3.5 w-3.5 text-muted-foreground" />;
    }
  };

  const getStatusBadge = () => {
    const baseClasses = "text-[10px] px-1.5 py-0.5 rounded font-medium";
    
    switch (event.type) {
      case "tool_start":
      case "step_start":
        return (
          <span className={cn(baseClasses, "bg-blue-100 text-blue-700")}>
            Running
          </span>
        );
      case "tool_end":
      case "step_end":
        return (
          <span className={cn(baseClasses, "bg-green-100 text-green-700")}>
            Done
          </span>
        );
      case "tool_error":
      case "step_error":
      case "error":
        return (
          <span className={cn(baseClasses, "bg-red-100 text-red-700")}>
            Error
          </span>
        );
      case "tool_progress":
        return (
          <span className={cn(baseClasses, "bg-amber-100 text-amber-700")}>
            {progress.percent ? `${progress.percent}%` : "In Progress"}
          </span>
        );
      default:
        return null;
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const getDisplayName = () => {
    if (toolData.toolDescription) return toolData.toolDescription;
    if (event.step) return event.step;
    if (toolName) return toolName.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
    return event.type;
  };

  return (
    <div className="bg-white rounded-md border border-border/30 overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-2 p-2 hover:bg-muted/30 transition-colors text-left"
      >
        {isExpanded ? (
          <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
        )}
        
        {getStatusIcon()}
        
        <span className="text-sm shrink-0">{toolIcon}</span>
        
        <span className="text-xs font-medium text-foreground truncate flex-1">
          {getDisplayName()}
        </span>

        {/* Category badge for tool events */}
        {isToolEvent && toolCategory !== "unknown" && (
          <span className={cn(
            "text-[9px] px-1 py-0.5 rounded border shrink-0",
            categoryColors[toolCategory] || categoryColors.unknown
          )}>
            {toolCategory.replace("_", " ")}
          </span>
        )}
        
        {getStatusBadge()}

        {/* Duration badge */}
        {timing.durationMs && (
          <span className="text-[10px] text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded shrink-0">
            {formatDuration(timing.durationMs)}
          </span>
        )}
        
        <span className="text-[10px] text-muted-foreground shrink-0">
          {formatTime(event.timestamp)}
        </span>
      </button>

      {isExpanded && (
        <div className="px-3 pb-3 pt-1 border-t border-border/20 space-y-2">
          {/* Progress indicator */}
          {progress.percent !== undefined && (
            <div>
              <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                <span>{progress.subStep || "Progress"}</span>
                <span>{progress.percent}%</span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div 
                  className={cn(
                    "h-full transition-all duration-300",
                    event.type === "tool_end" || event.type === "step_end" 
                      ? "bg-green-500" 
                      : "bg-primary"
                  )}
                  style={{ width: `${progress.percent}%` }}
                />
              </div>
              {progress.current !== undefined && progress.total !== undefined && (
                <div className="text-[10px] text-muted-foreground mt-0.5">
                  {progress.current} of {progress.total}
                </div>
              )}
            </div>
          )}

          {/* Tool Arguments */}
          {Object.keys(args).length > 0 && (
            <div>
              <div className="text-[10px] font-medium text-muted-foreground mb-1">Arguments</div>
              <div className="flex flex-wrap gap-1">
                {Object.entries(args).map(([key, value]) => (
                  <span 
                    key={key}
                    className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-100"
                  >
                    {key}: {typeof value === "string" ? value : JSON.stringify(value)}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Tool Result */}
          {Object.keys(result).length > 0 && (
            <div>
              <div className="text-[10px] font-medium text-muted-foreground mb-1">Result</div>
              <div className="flex flex-wrap gap-1">
                {Object.entries(result).map(([key, value]) => (
                  <span 
                    key={key}
                    className="text-[10px] bg-green-50 text-green-700 px-1.5 py-0.5 rounded border border-green-100"
                  >
                    {key}: {typeof value === "boolean" ? (value ? "✓" : "✗") : String(value)}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Timing info */}
          {timing.durationMs && (
            <div className="text-[10px] text-muted-foreground">
              ⏱️ Duration: {formatDuration(timing.durationMs)}
            </div>
          )}

          {/* Error message */}
          {toolData.error && (
            <div className="text-[10px] text-red-600 bg-red-50 p-2 rounded border border-red-100">
              ❌ {toolData.error}
            </div>
          )}

          {/* Raw data preview (collapsed by default for verbose data) */}
          {event.data && Object.keys(event.data).length > 5 && (
            <details className="text-[10px]">
              <summary className="text-muted-foreground cursor-pointer hover:text-foreground">
                View raw data
              </summary>
              <pre className="text-muted-foreground bg-muted/30 rounded p-2 overflow-x-auto max-h-[150px] overflow-y-auto mt-1">
                {JSON.stringify(event.data, null, 2)}
              </pre>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
