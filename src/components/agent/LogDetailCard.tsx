import { useState } from "react";
import { 
  ChevronDown, 
  ChevronRight, 
  Check, 
  X, 
  Clock,
  Flame,
  Video,
  Brain,
  Download,
  Smartphone,
  Search,
  AlertTriangle
} from "lucide-react";
import { CharisLoader } from "@/components/ui/charis-loader";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface LogDetailCardProps {
  id: string;
  stepName: string;
  status: string;
  toolName?: string;
  inputData?: any;
  outputData?: any;
  errorMessage?: string;
  durationMs?: number;
  createdAt: string;
}

const getToolIcon = (toolName?: string) => {
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

const getStatusBadge = (status: string) => {
  const isRunning = status === "running" || status === "in_progress" || status === "started";
  const isCompleted = status === "success" || status === "completed";
  const isFailed = status === "failed" || status === "error";
  
  if (isRunning) {
    return (
      <Badge variant="secondary" className="bg-blue-100 text-blue-700 text-[10px] font-medium">
        Running
      </Badge>
    );
  }
  if (isCompleted) {
    return (
      <Badge variant="secondary" className="bg-green-100 text-green-700 text-[10px] font-medium">
        Completed
      </Badge>
    );
  }
  if (isFailed) {
    return (
      <Badge variant="secondary" className="bg-red-100 text-red-700 text-[10px] font-medium">
        Failed
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="text-[10px] font-medium">
      {status}
    </Badge>
  );
};

const formatDuration = (ms?: number) => {
  if (!ms) return null;
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  const mins = Math.floor(ms / 60000);
  const secs = Math.floor((ms % 60000) / 1000);
  return `${mins}m ${secs}s`;
};

const formatStepName = (name: string) => {
  return name.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
};

export function LogDetailCard({
  stepName,
  status,
  toolName,
  inputData,
  outputData,
  errorMessage,
  durationMs,
  createdAt,
}: LogDetailCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const isRunning = status === "running" || status === "in_progress" || status === "started";
  const isCompleted = status === "success" || status === "completed";
  const isFailed = status === "failed" || status === "error";
  const hasDetails = Boolean(inputData || outputData || errorMessage);
  const progressPercent = inputData?.progress_percent;
  const subStep = inputData?.sub_step;

  // Extract summary info from output
  const getOutputSummary = () => {
    if (!outputData) return null;
    const summaryParts: string[] = [];
    
    if (outputData.competitors_found !== undefined) {
      summaryParts.push(`${outputData.competitors_found} competitors`);
    }
    if (outputData.total_ads !== undefined) {
      summaryParts.push(`${outputData.total_ads} ads`);
    }
    if (outputData.videos_downloaded !== undefined) {
      summaryParts.push(`${outputData.videos_downloaded} videos downloaded`);
    }
    if (outputData.videos_analyzed !== undefined) {
      summaryParts.push(`${outputData.videos_analyzed} videos analyzed`);
    }
    if (outputData.scriptsCount !== undefined) {
      summaryParts.push(`${outputData.scriptsCount} scripts`);
    }
    
    return summaryParts.length > 0 ? summaryParts.join(" • ") : null;
  };

  return (
    <div 
      className={cn(
        "border rounded-lg transition-all duration-200",
        isRunning && "border-blue-200 bg-blue-50/50",
        isCompleted && "border-border/40 bg-white",
        isFailed && "border-red-200 bg-red-50/50",
        !isRunning && !isCompleted && !isFailed && "border-border/40 bg-white"
      )}
    >
      {/* Header - Always visible */}
      <div 
        className={cn(
          "flex items-start gap-2 p-3 cursor-pointer hover:bg-muted/30 transition-colors",
          hasDetails && "cursor-pointer"
        )}
        onClick={() => hasDetails && setIsExpanded(!isExpanded)}
      >
        {/* Expand/Collapse Icon */}
        <div className="mt-0.5 text-muted-foreground">
          {hasDetails ? (
            isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )
          ) : (
            <div className="w-4" />
          )}
        </div>

        {/* Status Icon */}
        <div className="mt-0.5">
          {isRunning && <CharisLoader size="xs" />}
          {isCompleted && <Check className="h-4 w-4 text-green-600" />}
          {isFailed && <X className="h-4 w-4 text-red-500" />}
          {!isRunning && !isCompleted && !isFailed && getToolIcon(toolName)}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn(
              "text-sm font-medium",
              isRunning && "text-blue-700",
              isCompleted && "text-foreground",
              isFailed && "text-red-700"
            )}>
              {subStep || formatStepName(stepName)}
            </span>
            {getStatusBadge(status)}
            {durationMs && isCompleted && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatDuration(durationMs)}
              </span>
            )}
          </div>

          {/* Progress bar for running tasks */}
          {isRunning && progressPercent !== undefined && (
            <div className="mt-2 w-full bg-blue-200 rounded-full h-1.5">
              <div 
                className="bg-blue-600 h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          )}

          {/* Output summary for completed tasks */}
          {isCompleted && getOutputSummary() && (
            <div className="mt-1 text-xs text-muted-foreground">
              {getOutputSummary()}
            </div>
          )}

          {/* Error preview for failed tasks */}
          {isFailed && errorMessage && !isExpanded && (
            <div className="mt-1 text-xs text-red-600 truncate">
              {errorMessage}
            </div>
          )}
        </div>

        {/* Tool Badge */}
        {toolName && (
          <div className="flex-shrink-0 flex items-center gap-1.5">
            {getToolIcon(toolName)}
            <span className="text-[10px] text-muted-foreground font-medium hidden sm:inline">
              {toolName.replace(/_/g, " ").split(" ").slice(0, 2).join(" ")}
            </span>
          </div>
        )}
      </div>

      {/* Expandable Details */}
      {isExpanded && hasDetails && (
        <div className="border-t border-border/30 p-3 space-y-3 text-xs bg-muted/10">
          {/* Error Message */}
          {errorMessage && (
            <div className="bg-red-50 border border-red-200 rounded-md p-2">
              <div className="flex items-center gap-1.5 text-red-700 font-medium mb-1">
                <AlertTriangle className="h-3.5 w-3.5" />
                Error
              </div>
              <pre className="text-red-600 whitespace-pre-wrap font-mono text-[11px]">
                {errorMessage}
              </pre>
            </div>
          )}

          {/* Input Data */}
          {inputData && Object.keys(inputData).length > 0 && (
            <div>
              <div className="text-muted-foreground font-medium mb-1.5">Input</div>
              <pre className="bg-muted/30 p-2 rounded-md overflow-auto max-h-32 text-[11px] font-mono">
                {JSON.stringify(inputData, null, 2)}
              </pre>
            </div>
          )}

          {/* Output Data */}
          {outputData && Object.keys(outputData).length > 0 && (
            <div>
              <div className="text-muted-foreground font-medium mb-1.5">Output</div>
              <pre className="bg-muted/30 p-2 rounded-md overflow-auto max-h-48 text-[11px] font-mono">
                {JSON.stringify(outputData, null, 2)}
              </pre>
            </div>
          )}

          {/* Timestamp */}
          <div className="text-muted-foreground/60 text-[10px]">
            {new Date(createdAt).toLocaleTimeString()}
          </div>
        </div>
      )}
    </div>
  );
}