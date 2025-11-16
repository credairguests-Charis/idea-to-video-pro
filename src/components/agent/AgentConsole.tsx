import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Square, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

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
}

interface AgentConsoleProps {
  logs: AgentLog[];
  session: AgentSession | null;
  isRunning: boolean;
  onStop: () => void;
}

export function AgentConsole({ logs, session, isRunning, onStop }: AgentConsoleProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "running":
      case "in_progress":
        return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
      case "completed":
      case "success":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "error":
      case "failed":
        return <XCircle className="h-4 w-4 text-destructive" />;
      default:
        return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-card">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border/50 flex items-center justify-between bg-card">
        <div className="flex items-center gap-2">
          {session && (
            <Badge 
              variant={isRunning ? "default" : "secondary"}
              className="text-xs font-medium"
            >
              {session.state}
            </Badge>
          )}
          {session && session.progress !== undefined && (
            <span className="text-xs text-muted-foreground">
              {session.progress}%
            </span>
          )}
        </div>
        {isRunning && (
          <Button 
            variant="ghost" 
            size="sm"
            onClick={onStop}
            className="h-7 text-xs"
          >
            <Square className="h-3 w-3 mr-1.5" />
            Stop
          </Button>
        )}
      </div>

      {/* Logs Content - Chat Style */}
      <ScrollArea className="flex-1 px-3 py-4">
        {!session ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="text-muted-foreground text-sm">
              Start the agent to see execution logs
            </div>
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mb-2" />
            <div className="text-muted-foreground text-sm">
              Initializing agent...
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {logs.map((log) => (
              <div 
                key={log.id}
                className="group animate-fade-in"
              >
                {/* Log Entry */}
                <div className="flex gap-2">
                  <div className="flex-shrink-0 mt-1">
                    {getStatusIcon(log.status)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="text-sm font-medium text-foreground">
                        {log.step_name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    
                    {log.tool_name && (
                      <div className="text-xs text-muted-foreground mb-1">
                        Tool: <span className="font-mono">{log.tool_name}</span>
                      </div>
                    )}
                    
                    {log.error_message && (
                      <div className="mt-1.5 p-2 bg-destructive/10 border border-destructive/20 rounded text-xs text-destructive">
                        {log.error_message}
                      </div>
                    )}
                    
                    {log.output_data && (
                      <div className="mt-1.5 p-2 bg-muted/50 rounded text-xs">
                        <pre className="text-muted-foreground font-mono whitespace-pre-wrap break-words">
                          {typeof log.output_data === 'string' 
                            ? log.output_data 
                            : JSON.stringify(log.output_data, null, 2).slice(0, 200) + 
                              (JSON.stringify(log.output_data).length > 200 ? '...' : '')
                          }
                        </pre>
                      </div>
                    )}
                    
                    {log.duration_ms && (
                      <div className="text-xs text-muted-foreground mt-1">
                        {log.duration_ms}ms
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
