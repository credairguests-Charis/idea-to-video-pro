import { useState } from "react";
import { ChevronDown, ChevronRight, CheckCircle2, XCircle, Loader2, Clock, ListChecks, Brain, Zap, Search, Download, Eye, FileText, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { StreamEvent } from "@/hooks/useAgentStream";

interface StreamingLogCardProps {
  event: StreamEvent;
  isExpanded?: boolean;
}

// Tool icons mapping for the new agent tools
const TOOL_ICONS: Record<string, { icon: string; label: string; color: string }> = {
  think_and_plan: { icon: "🧠", label: "Planning", color: "purple" },
  scrape_competitor_ads: { icon: "🔥", label: "Scraping", color: "orange" },
  download_videos: { icon: "⬇️", label: "Downloading", color: "blue" },
  analyze_visuals: { icon: "👁️", label: "Analyzing", color: "cyan" },
  search_web: { icon: "🔎", label: "Searching", color: "green" },
  synthesize_report: { icon: "📊", label: "Synthesizing", color: "indigo" },
  finish: { icon: "✅", label: "Complete", color: "emerald" },
  model: { icon: "🤖", label: "Reasoning", color: "violet" },
  agent: { icon: "🚀", label: "Agent", color: "blue" },
};

export function StreamingLogCard({ event, isExpanded: defaultExpanded = false }: StreamingLogCardProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const getStatusIcon = () => {
    switch (event.type) {
      case "step_start":
      case "tool_progress":
        return <Loader2 className="h-3.5 w-3.5 text-blue-500 animate-spin" />;
      case "step_end":
        return <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />;
      case "step_error":
      case "error":
        return <XCircle className="h-3.5 w-3.5 text-red-500" />;
      case "plan_created":
        return <ListChecks className="h-3.5 w-3.5 text-purple-500" />;
      case "session_start":
        return <Sparkles className="h-3.5 w-3.5 text-indigo-500" />;
      case "session_end":
        return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />;
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
            Started
          </span>
        );
      case "session_end":
        return (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 font-medium">
            Complete
          </span>
        );
      case "tool_progress":
        return (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-medium">
            Progress
          </span>
        );
      default:
        return null;
    }
  };

  const getToolInfo = () => {
    const toolName = event.data?.toolName || event.node;
    if (toolName && TOOL_ICONS[toolName]) {
      return TOOL_ICONS[toolName];
    }
    
    // Fallback for other nodes
    if (event.node === "model") return TOOL_ICONS.model;
    if (event.node === "agent") return TOOL_ICONS.agent;
    
    return { icon: "⚙️", label: "Tool", color: "gray" };
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const getDisplayName = () => {
    // Use message if provided
    if (event.data?.message) {
      return event.data.message;
    }
    
    const step = event.data?.step || event.step || event.node || event.type;
    
    // Make step names more readable
    if (step?.startsWith("Executing:")) {
      const toolName = step.replace("Executing: ", "");
      return `Executing ${toolName}`;
    }
    if (step?.includes("Reasoning")) {
      return "Agent reasoning...";
    }
    if (step?.includes("Initializing")) {
      return "Starting agent...";
    }
    
    return step;
  };

  // Filter out token events (handled separately in chat)
  if (event.type === "token") {
    return null;
  }

  const toolInfo = getToolInfo();

  // Render plan_created event specially with execution steps
  if (event.type === "plan_created" && event.data?.plan) {
    const plan = event.data.plan;
    const steps = plan.execution_plan || plan.steps || [];
    
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
          
          <Brain className="h-3.5 w-3.5 text-purple-500" />
          
          <span className="text-xs font-medium text-purple-700 truncate flex-1">
            Execution Plan Created
          </span>
          
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-200 text-purple-800 font-medium">
            {steps.length} steps
          </span>
        </button>

        {isExpanded && (
          <div className="px-3 pb-3 pt-1 border-t border-purple-200">
            {/* Task understanding */}
            {plan.task_understanding && (
              <div className="mb-2">
                <span className="text-[10px] font-medium text-purple-600 uppercase">Understanding</span>
                <p className="text-xs text-purple-800 mt-0.5">
                  {plan.task_understanding}
                </p>
              </div>
            )}
            
            {/* Reasoning */}
            {plan.reasoning && (
              <div className="mb-2">
                <span className="text-[10px] font-medium text-purple-600 uppercase">Reasoning</span>
                <p className="text-xs text-purple-700 mt-0.5">
                  {plan.reasoning}
                </p>
              </div>
            )}
            
            {/* Execution steps */}
            {steps.length > 0 && (
              <div className="mt-2">
                <span className="text-[10px] font-medium text-purple-600 uppercase">Steps</span>
                <div className="space-y-1.5 mt-1">
                  {steps.map((step: any, idx: number) => {
                    const stepTool = step.tool || step.tool_to_use;
                    const stepToolInfo = stepTool && TOOL_ICONS[stepTool] ? TOOL_ICONS[stepTool] : null;
                    
                    return (
                      <div key={idx} className="flex items-start gap-2 text-[11px] bg-purple-100/50 rounded p-1.5">
                        <span className="text-purple-500 font-bold shrink-0">
                          {step.step || idx + 1}.
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-medium text-purple-800">{step.action}</span>
                            {stepToolInfo && (
                              <span className="text-[10px] px-1 py-0.5 rounded bg-purple-200 text-purple-700">
                                {stepToolInfo.icon} {stepTool}
                              </span>
                            )}
                          </div>
                          {step.expected_output && (
                            <p className="text-[10px] text-purple-600 mt-0.5">
                              → {step.expected_output}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            
            {/* Success criteria */}
            {plan.success_criteria && (
              <div className="mt-2 pt-2 border-t border-purple-200">
                <span className="text-[10px] font-medium text-purple-600 uppercase">Success Criteria</span>
                <p className="text-xs text-purple-700 mt-0.5">
                  ✓ {plan.success_criteria}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // Render session_end event specially
  if (event.type === "session_end") {
    return (
      <div className="bg-emerald-50 rounded-md border border-emerald-200 p-2">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <span className="text-xs font-medium text-emerald-700">Task Completed</span>
          {event.data?.durationMs && (
            <span className="text-[10px] text-emerald-600 ml-auto">
              {(event.data.durationMs / 1000).toFixed(1)}s
            </span>
          )}
        </div>
        {event.data?.iterations && (
          <p className="text-[10px] text-emerald-600 mt-1 ml-6">
            {event.data.iterations} iterations completed
          </p>
        )}
      </div>
    );
  }

  // Render error event specially
  if (event.type === "error" || event.type === "step_error") {
    return (
      <div className="bg-red-50 rounded-md border border-red-200 p-2">
        <div className="flex items-center gap-2">
          <XCircle className="h-4 w-4 text-red-600" />
          <span className="text-xs font-medium text-red-700">Error</span>
        </div>
        <p className="text-[10px] text-red-600 mt-1 ml-6">
          {event.data?.error || "An error occurred"}
        </p>
      </div>
    );
  }

  // Regular event card
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
        
        <span className="text-sm shrink-0">{toolInfo.icon}</span>
        
        <span className="text-xs text-foreground truncate flex-1">
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
          {(event.data.progress !== undefined || event.data.progressPercent !== undefined) && (
            <div className="mb-2">
              <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                <span>Progress</span>
                <span>{event.data.progress || event.data.progressPercent}%</span>
              </div>
              <div className="h-1 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${event.data.progress || event.data.progressPercent}%` }}
                />
              </div>
            </div>
          )}

          {/* Tool args display */}
          {event.data.toolArgs && (
            <div className="mb-2">
              <span className="text-[10px] font-medium text-muted-foreground uppercase">Arguments</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {Object.entries(event.data.toolArgs).map(([key, value]) => (
                  <span 
                    key={key}
                    className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground"
                  >
                    {key}: {typeof value === 'string' ? value : JSON.stringify(value)}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Result summary */}
          {event.data.result && (
            <div className="mb-2">
              <span className="text-[10px] font-medium text-muted-foreground uppercase">Result</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {Object.entries(event.data.result).map(([key, value]) => {
                  if (key === 'success') return null;
                  return (
                    <span 
                      key={key}
                      className={cn(
                        "text-[10px] px-1.5 py-0.5 rounded font-medium",
                        key === 'error' ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
                      )}
                    >
                      {key}: {typeof value === 'string' || typeof value === 'number' ? value : JSON.stringify(value)}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* Raw data (collapsed by default) */}
          <details className="mt-2">
            <summary className="text-[10px] text-muted-foreground cursor-pointer hover:text-foreground">
              View raw data
            </summary>
            <pre className="text-[10px] text-muted-foreground bg-muted/30 rounded p-2 overflow-x-auto max-h-[150px] overflow-y-auto mt-1">
              {JSON.stringify(event.data, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
}
