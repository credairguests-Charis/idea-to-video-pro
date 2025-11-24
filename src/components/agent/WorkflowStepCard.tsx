import { useState } from "react";
import { ChevronDown, ChevronRight, CheckCircle2, Loader2, XCircle, Clock, Telescope, Image, Video, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { formatDistanceToNow } from "date-fns";

interface WorkflowStepCardProps {
  stepName: string;
  status: string;
  toolName?: string;
  startTime?: string;
  endTime?: string;
  duration?: number;
  inputData?: any;
  outputData?: any;
  errorMessage?: string;
  progress?: number;
}

const STEP_METADATA: Record<string, { label: string; icon: any; description: string; color: string }> = {
  deep_research: {
    label: "Deep Research",
    icon: Telescope,
    description: "Discovering competitors and Meta Ads campaigns",
    color: "text-blue-500",
  },
  meta_ads_extraction: {
    label: "Meta Ads Extraction",
    icon: Image,
    description: "Extracting ad creative data and video URLs",
    color: "text-purple-500",
  },
  video_analysis: {
    label: "Video Analysis",
    icon: Video,
    description: "Processing videos via Azure Video Indexer",
    color: "text-orange-500",
  },
  llm_synthesis: {
    label: "LLM Synthesis",
    icon: Sparkles,
    description: "Generating final insights and UGC scripts",
    color: "text-green-500",
  },
};

export function WorkflowStepCard({
  stepName,
  status,
  toolName,
  startTime,
  endTime,
  duration,
  inputData,
  outputData,
  errorMessage,
  progress,
}: WorkflowStepCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const metadata = STEP_METADATA[stepName] || {
    label: stepName.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
    icon: Sparkles,
    description: "Processing...",
    color: "text-muted-foreground",
  };

  const Icon = metadata.icon;

  const getStatusIcon = () => {
    switch (status) {
      case "running":
      case "in_progress":
        return <Loader2 className="h-5 w-5 animate-spin text-primary" />;
      case "completed":
      case "success":
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case "failed":
      case "error":
        return <XCircle className="h-5 w-5 text-destructive" />;
      default:
        return <Clock className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const isRunning = status === "running" || status === "in_progress";
  const isCompleted = status === "completed" || status === "success";
  const isFailed = status === "failed" || status === "error";

  return (
    <div className="group border border-border rounded-lg bg-card hover:bg-accent/5 transition-colors">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-start gap-3 text-left"
      >
        <div className="flex-shrink-0 mt-0.5">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </div>

        <div className={`flex-shrink-0 mt-0.5 ${metadata.color}`}>
          <Icon className="h-5 w-5" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-medium text-sm text-foreground">{metadata.label}</h3>
            {toolName && (
              <Badge variant="outline" className="text-xs">
                {toolName}
              </Badge>
            )}
            <div className="ml-auto flex items-center gap-2">
              {duration && (
                <span className="text-xs text-muted-foreground">{duration}ms</span>
              )}
              {getStatusIcon()}
            </div>
          </div>

          <p className="text-xs text-muted-foreground mb-2">{metadata.description}</p>

          {/* Progress Bar for Running Steps */}
          {isRunning && progress !== undefined && (
            <div className="space-y-1">
              <Progress value={progress} className="h-1.5" />
              <span className="text-xs text-muted-foreground">{progress}%</span>
            </div>
          )}

          {/* Timestamps */}
          {startTime && (
            <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
              <span>
                Started {formatDistanceToNow(new Date(startTime), { addSuffix: true })}
              </span>
              {endTime && (
                <span>
                  Completed {formatDistanceToNow(new Date(endTime), { addSuffix: true })}
                </span>
              )}
            </div>
          )}
        </div>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-border/50 pt-3">
          {/* Error Message */}
          {errorMessage && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
              <div className="font-medium text-sm text-destructive mb-1">Error</div>
              <p className="text-xs text-destructive/90">{errorMessage}</p>
            </div>
          )}

          {/* Input Data */}
          {inputData && Object.keys(inputData).length > 0 && (
            <div>
              <div className="text-xs font-medium text-muted-foreground mb-2">Input</div>
              <div className="p-2 bg-muted/50 rounded-md">
                <pre className="text-xs font-mono text-foreground whitespace-pre-wrap break-words">
                  {JSON.stringify(inputData, null, 2)}
                </pre>
              </div>
            </div>
          )}

          {/* Output Data */}
          {outputData && (
            <div>
              <div className="text-xs font-medium text-muted-foreground mb-2">Output</div>
              <div className="p-2 bg-muted/50 rounded-md">
                {typeof outputData === "object" ? (
                  <>
                    {/* Show summary for competitor data */}
                    {outputData.competitors && Array.isArray(outputData.competitors) && (
                      <div className="space-y-2">
                        <div className="text-sm font-medium text-foreground">
                          Found {outputData.competitors.length} competitor(s)
                        </div>
                        {outputData.competitors.map((comp: any, idx: number) => (
                          <div
                            key={idx}
                            className="p-2 bg-background/50 rounded border border-border/30"
                          >
                            <div className="font-medium text-sm text-foreground">
                              {comp.brand_name || comp.name}
                            </div>
                            {comp.meta_ads_library_url && (
                              <div className="text-xs text-muted-foreground mt-1">
                                {comp.video_ads?.length || 0} video ad(s) found
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Show synthesis results */}
                    {outputData.suggestedScripts && (
                      <div className="space-y-2">
                        <div className="text-sm font-medium text-foreground">
                          Generated {outputData.suggestedScripts.length} UGC script(s)
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {outputData.adAnalyses?.length || 0} ad(s) analyzed
                        </div>
                      </div>
                    )}

                    {/* Fallback to JSON */}
                    {!outputData.competitors && !outputData.suggestedScripts && (
                      <pre className="text-xs font-mono text-foreground whitespace-pre-wrap break-words">
                        {JSON.stringify(outputData, null, 2).slice(0, 500) +
                          (JSON.stringify(outputData).length > 500 ? "..." : "")}
                      </pre>
                    )}
                  </>
                ) : (
                  <pre className="text-xs font-mono text-foreground whitespace-pre-wrap break-words">
                    {String(outputData)}
                  </pre>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
