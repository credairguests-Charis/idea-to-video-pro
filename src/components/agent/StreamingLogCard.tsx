import { useState } from "react";
import { ChevronDown, ChevronRight, CheckCircle2, XCircle, Loader2, Clock, ListChecks } from "lucide-react";
import { cn } from "@/lib/utils";
import { StreamEvent } from "@/hooks/useAgentStream";

interface StreamingLogCardProps {
  event: StreamEvent;
  isExpanded?: boolean;
}

export function StreamingLogCard({ event, isExpanded: defaultExpanded = false }: StreamingLogCardProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const getStatusIcon = () => {
    switch (event.type) {
      case "step_start":
        return <Loader2 className="h-3.5 w-3.5 text-blue-500 animate-spin" />;
      case "step_end":
        return <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />;
      case "step_error":
      case "error":
        return <XCircle className="h-3.5 w-3.5 text-red-500" />;
      case "plan_created":
        return <ListChecks className="h-3.5 w-3.5 text-purple-500" />;
      default:
        return <Clock className="h-3.5 w-3.5 text-muted-foreground" />;
    }
  };

  const getStatusBadge = () => {
    switch (event.type) {
      case "step_start":
        return (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 font-medium">
            Running
          </span>
        );
      case "step_end":
        return (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-100 text-green-700 font-medium">
            Done
          </span>
        );
      case "step_error":
      case "error":
        return (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-700 font-medium">
            Error
          </span>
        );
      case "plan_created":
        return (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 font-medium">
            Plan
          </span>
        );
      case "session_start":
        return (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 font-medium">
            Start
          </span>
        );
      case "session_end":
        return (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-100 text-green-700 font-medium">
            Complete
          </span>
        );
      default:
        return null;
    }
  };

  const getToolIcon = () => {
    const toolIcon = event.data?.toolIcon;
    if (toolIcon) return toolIcon;

    switch (event.node) {
      case "model":
      case "llm":
        return "🧠";
      case "thinking":
        return "💭";
      case "plan_task":
        return "📋";
      case "scrape_meta_ads":
        return "🔥";
      case "download_video":
        return "⬇️";
      case "analyze_ad_creative":
        return "👁️";
      case "search_web":
        return "🔎";
      case "complete_task":
        return "✅";
      default:
        return "⚙️";
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const getDisplayName = () => {
    const step = event.step || event.node || event.type;
    
    // Make step names more readable
    if (step?.startsWith("Executing:")) {
      return step.replace("Executing: ", "");
    }
    if (step?.startsWith("Agent Thinking")) {
      return "Thinking...";
    }
    
    return step;
  };

  // Filter out token events for the main log view (too noisy)
  if (event.type === "token") {
    return null;
  }

  // Render plan created event specially
  if (event.type === "plan_created" && event.data?.plan) {
    return (
      <div className="bg-purple-50 rounded-md border border-purple-200 overflow-hidden">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center gap-2 p-2 hover:bg-purple-100/50 transition-colors text-left"
        >
          {isExpanded ? (
            <ChevronDown className="h-3 w-3 text-purple-500 shrink-0" />
          ) : (
            <ChevronRight className="h-3 w-3 text-purple-500 shrink-0" />
          )}
          
          <ListChecks className="h-3.5 w-3.5 text-purple-500" />
          
          <span className="text-xs font-medium text-purple-700 truncate flex-1">
            Execution Plan Created
          </span>
          
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-200 text-purple-800 font-medium">
            {event.data.plan.steps?.length || 0} steps
          </span>
        </button>

        {isExpanded && (
          <div className="px-3 pb-3 pt-1 border-t border-purple-200">
            {event.data.plan.task_analysis && (
              <p className="text-xs text-purple-700 mb-2">
                {event.data.plan.task_analysis}
              </p>
            )}
            
            {event.data.plan.steps && (
              <div className="space-y-1">
                {event.data.plan.steps.map((step: any, idx: number) => (
                  <div key={idx} className="flex items-start gap-2 text-[11px]">
                    <span className="text-purple-500 font-medium">{step.step_number || idx + 1}.</span>
                    <div>
                      <span className="font-medium text-purple-800">{step.action}</span>
                      {step.tool_to_use && (
                        <span className="ml-1 text-purple-600">({step.tool_to_use})</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

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
        
        <span className="text-sm shrink-0">{getToolIcon()}</span>
        
        <span className="text-xs font-medium text-foreground truncate flex-1">
          {getDisplayName()}
        </span>
        
        {getStatusBadge()}
        
        <span className="text-[10px] text-muted-foreground shrink-0">
          {formatTime(event.timestamp)}
        </span>
      </button>

      {isExpanded && event.data && (
        <div className="px-3 pb-3 pt-1 border-t border-border/20">
          {/* Progress indicator */}
          {event.data.progressPercent !== undefined && (
            <div className="mb-2">
              <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                <span>Progress</span>
                <span>{event.data.progressPercent}%</span>
              </div>
              <div className="h-1 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${event.data.progressPercent}%` }}
                />
              </div>
            </div>
          )}

          {/* Data preview */}
          <pre className="text-[10px] text-muted-foreground bg-muted/30 rounded p-2 overflow-x-auto max-h-[200px] overflow-y-auto">
            {JSON.stringify(event.data, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
