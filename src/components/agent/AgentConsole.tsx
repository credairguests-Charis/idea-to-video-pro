import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Square, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
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
  const [activeTab, setActiveTab] = useState("logs");

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

  const errorLogs = logs.filter(log => log.status === "error" || log.error_message);
  const toolLogs = logs.filter(log => log.tool_name);

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">Agent Console</h2>
          {session && (
            <Badge variant={isRunning ? "default" : "secondary"}>
              {session.state}
            </Badge>
          )}
        </div>
        {isRunning && (
          <Button 
            variant="destructive" 
            size="sm"
            onClick={onStop}
          >
            <Square className="h-4 w-4 mr-2" />
            Stop
          </Button>
        )}
      </div>

      {/* Progress Bar */}
      {session && session.progress !== undefined && (
        <div className="px-4 py-2 border-b border-border">
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-muted-foreground">{session.current_step || "Initializing..."}</span>
            <span className="text-muted-foreground">{session.progress}%</span>
          </div>
          <div className="h-1 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${session.progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="w-full justify-start rounded-none border-b border-border bg-transparent px-4">
          <TabsTrigger value="logs" className="relative">
            Logs
            {logs.length > 0 && (
              <Badge variant="secondary" className="ml-2 h-5 px-1.5">
                {logs.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="steps">Steps</TabsTrigger>
          <TabsTrigger value="tools">
            Tools
            {toolLogs.length > 0 && (
              <Badge variant="secondary" className="ml-2 h-5 px-1.5">
                {toolLogs.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="errors">
            Errors
            {errorLogs.length > 0 && (
              <Badge variant="destructive" className="ml-2 h-5 px-1.5">
                {errorLogs.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="logs" className="flex-1 mt-0">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-2">
              {logs.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  No logs yet. Start the agent to see activity.
                </div>
              ) : (
                logs.map((log) => (
                  <div
                    key={log.id}
                    className={cn(
                      "p-3 rounded-lg border border-border bg-card text-sm font-mono",
                      log.status === "error" && "border-destructive/50 bg-destructive/5"
                    )}
                  >
                    <div className="flex items-start gap-2">
                      {getStatusIcon(log.status)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="font-medium">{log.step_name}</span>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                          </span>
                        </div>
                        {log.tool_name && (
                          <div className="text-xs text-muted-foreground mb-1">
                            Tool: {log.tool_name}
                          </div>
                        )}
                        {log.error_message && (
                          <div className="text-xs text-destructive mt-1">
                            {log.error_message}
                          </div>
                        )}
                        {log.duration_ms && (
                          <div className="text-xs text-muted-foreground mt-1">
                            Duration: {log.duration_ms}ms
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="steps" className="flex-1 mt-0">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-2">
              {logs.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  No steps executed yet.
                </div>
              ) : (
                logs.map((log, index) => (
                  <div key={log.id} className="flex items-start gap-3">
                    <div className="flex flex-col items-center">
                      <div className={cn(
                        "w-8 h-8 rounded-full border-2 flex items-center justify-center",
                        log.status === "completed" || log.status === "success" 
                          ? "border-green-500 bg-green-500/10" 
                          : log.status === "error" || log.status === "failed"
                          ? "border-destructive bg-destructive/10"
                          : "border-primary bg-primary/10"
                      )}>
                        {getStatusIcon(log.status)}
                      </div>
                      {index < logs.length - 1 && (
                        <div className="w-0.5 h-8 bg-border" />
                      )}
                    </div>
                    <div className="flex-1 pb-4">
                      <div className="font-medium">{log.step_name}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="tools" className="flex-1 mt-0">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-2">
              {toolLogs.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  No tool executions yet.
                </div>
              ) : (
                toolLogs.map((log) => (
                  <div key={log.id} className="p-3 rounded-lg border border-border bg-card">
                    <div className="flex items-center gap-2 mb-2">
                      {getStatusIcon(log.status)}
                      <span className="font-medium text-sm">{log.tool_name}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {log.step_name}
                    </div>
                    {log.duration_ms && (
                      <div className="text-xs text-muted-foreground mt-1">
                        {log.duration_ms}ms
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="errors" className="flex-1 mt-0">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-2">
              {errorLogs.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  No errors. Everything is running smoothly! ✓
                </div>
              ) : (
                errorLogs.map((log) => (
                  <div key={log.id} className="p-3 rounded-lg border border-destructive/50 bg-destructive/5">
                    <div className="flex items-start gap-2">
                      <XCircle className="h-4 w-4 text-destructive mt-0.5" />
                      <div className="flex-1">
                        <div className="font-medium text-sm">{log.step_name}</div>
                        <div className="text-xs text-destructive mt-1">
                          {log.error_message}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}
