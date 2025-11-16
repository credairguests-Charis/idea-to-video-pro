import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface AgentLog {
  id: string;
  step_name: string;
  status: string;
  tool_name?: string;
  created_at: string;
  duration_ms?: number;
}

interface AgentSession {
  id: string;
  state: string;
  current_step?: string;
  progress?: number;
  created_at?: string;
}

interface AgentTimelineProps {
  logs: AgentLog[];
  session: AgentSession | null;
}

export function AgentTimeline({ logs, session }: AgentTimelineProps) {
  if (!session) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        No active session
      </div>
    );
  }

  // Group logs by step name to get unique steps
  const stepMap = new Map<string, AgentLog>();
  logs.forEach((log) => {
    if (!stepMap.has(log.step_name) || log.status === "success") {
      stepMap.set(log.step_name, log);
    }
  });

  const steps = Array.from(stepMap.values());
  const totalSteps = steps.length;
  const completedSteps = steps.filter((s) => s.status === "success").length;
  const overallProgress = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;

  const getStatusIcon = (status: string) => {
    if (status === "success") {
      return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    } else if (status === "in_progress") {
      return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
    }
    return <Clock className="h-4 w-4 text-muted-foreground" />;
  };

  const estimateTimeRemaining = () => {
    if (completedSteps === 0) return "Calculating...";
    
    const completedLogs = steps.filter((s) => s.status === "success" && s.duration_ms);
    if (completedLogs.length === 0) return "Calculating...";
    
    const avgDuration = completedLogs.reduce((sum, log) => sum + (log.duration_ms || 0), 0) / completedLogs.length;
    const remainingSteps = totalSteps - completedSteps;
    const estimatedMs = avgDuration * remainingSteps;
    
    if (estimatedMs < 1000) return "< 1s";
    if (estimatedMs < 60000) return `~${Math.round(estimatedMs / 1000)}s`;
    return `~${Math.round(estimatedMs / 60000)}m`;
  };

  return (
    <div className="flex flex-col h-full bg-card">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border/50">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium">Execution Timeline</h3>
          <Badge variant={session.state === "running" ? "default" : "secondary"} className="text-xs">
            {session.state}
          </Badge>
        </div>
        <div className="space-y-2">
          <Progress value={overallProgress} className="h-2" />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{completedSteps} of {totalSteps} steps completed</span>
            {session.state === "running" && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {estimateTimeRemaining()} remaining
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-3">
          {steps.map((log, index) => {
            const isLast = index === steps.length - 1;
            const isActive = log.status === "in_progress";
            const isCompleted = log.status === "success";

            return (
              <div key={log.id} className="relative">
                {/* Timeline line */}
                {!isLast && (
                  <div
                    className={`absolute left-2 top-8 bottom-0 w-0.5 ${
                      isCompleted ? "bg-green-500/30" : "bg-border"
                    }`}
                  />
                )}

                {/* Step card */}
                <div
                  className={`relative flex gap-3 p-3 rounded-lg border transition-colors ${
                    isActive
                      ? "border-primary bg-primary/5"
                      : isCompleted
                      ? "border-green-500/30 bg-green-500/5"
                      : "border-border bg-card"
                  }`}
                >
                  <div className="flex-shrink-0 mt-0.5">
                    {getStatusIcon(log.status)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <span className="text-sm font-medium">{log.step_name}</span>
                      {log.duration_ms && (
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {log.duration_ms}ms
                        </span>
                      )}
                    </div>
                    {log.tool_name && (
                      <Badge variant="outline" className="text-xs mb-1">
                        {log.tool_name}
                      </Badge>
                    )}
                    <div className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
