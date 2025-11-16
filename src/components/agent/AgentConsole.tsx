import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Square, CheckCircle2, XCircle, AlertCircle, Image, Search, Code, Telescope, Lightbulb, Sparkles } from "lucide-react";
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
  const getToolIcon = (toolName?: string) => {
    switch (toolName) {
      case "generateImage":
        return <Image className="h-4 w-4 text-purple-500" />;
      case "searchWeb":
        return <Search className="h-4 w-4 text-blue-500" />;
      case "writeCode":
        return <Code className="h-4 w-4 text-green-500" />;
      case "deepResearch":
        return <Telescope className="h-4 w-4 text-orange-500" />;
      case "thinkLonger":
        return <Lightbulb className="h-4 w-4 text-yellow-500" />;
      default:
        return <Sparkles className="h-4 w-4 text-primary" />;
    }
  };

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
                    {log.tool_name ? getToolIcon(log.tool_name) : getStatusIcon(log.status)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="text-sm font-medium text-foreground">
                        {log.step_name}
                      </span>
                      {log.tool_name && (
                        <Badge variant="outline" className="text-xs">
                          {log.tool_name}
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    
                    {log.error_message && (
                      <div className="mt-1.5 p-2 bg-destructive/10 border border-destructive/20 rounded text-xs text-destructive">
                        {log.error_message}
                      </div>
                    )}
                    
                    {log.output_data && (
                      <div className="mt-1.5 p-2 bg-muted/50 rounded text-xs">
                        {typeof log.output_data === "object" ? (
                          <>
                            {/* Show image if present */}
                            {log.output_data.imageUrl && (
                              <div className="mb-2">
                                <img 
                                  src={log.output_data.imageUrl} 
                                  alt="Generated" 
                                  className="max-w-full rounded-lg border border-border"
                                />
                              </div>
                            )}
                            
                            {/* Show formatted message if it's a simple object */}
                            {log.output_data.message && (
                              <p className="mb-2 whitespace-pre-wrap text-foreground">{log.output_data.message}</p>
                            )}
                            
                            {/* Show response if present (streaming content) */}
                            {log.output_data.response && (
                              <div className="mb-2">
                                <p className="whitespace-pre-wrap text-foreground">{log.output_data.response}</p>
                                {log.status === "in_progress" && (
                                  <div className="inline-flex items-center gap-1 mt-1">
                                    <div className="w-1 h-1 bg-primary rounded-full animate-pulse" />
                                    <div className="w-1 h-1 bg-primary rounded-full animate-pulse" style={{ animationDelay: "0.2s" }} />
                                    <div className="w-1 h-1 bg-primary rounded-full animate-pulse" style={{ animationDelay: "0.4s" }} />
                                  </div>
                                )}
                              </div>
                            )}
                            
                            {/* Show results if it's search results */}
                            {log.output_data.results && Array.isArray(log.output_data.results) && (
                              <div className="space-y-2">
                                {log.output_data.results.map((result: any, idx: number) => (
                                  <div key={idx} className="bg-background/50 p-2 rounded border border-border/30">
                                    <div className="font-medium mb-1 text-foreground">{result.title}</div>
                                    <div className="text-muted-foreground mb-1">{result.snippet}</div>
                                    <a 
                                      href={result.url} 
                                      target="_blank" 
                                      rel="noopener noreferrer" 
                                      className="text-primary hover:underline"
                                    >
                                      {result.url}
                                    </a>
                                  </div>
                                ))}
                              </div>
                            )}
                            
                            {/* Fallback to JSON for complex objects */}
                            {!log.output_data.imageUrl && 
                             !log.output_data.message && 
                             !log.output_data.response && 
                             !log.output_data.results && (
                              <pre className="text-muted-foreground font-mono whitespace-pre-wrap break-words">
                                {JSON.stringify(log.output_data, null, 2).slice(0, 200) + 
                                  (JSON.stringify(log.output_data).length > 200 ? '...' : '')
                                }
                              </pre>
                            )}
                          </>
                        ) : (
                          <pre className="text-muted-foreground font-mono whitespace-pre-wrap break-words">
                            {String(log.output_data)}
                          </pre>
                        )}
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
