import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, PlayCircle, XCircle, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface AgentSession {
  id: string;
  state: string;
  current_step: string | null;
  progress: number;
  metadata: any;
  created_at: string;
}

interface ExecutionLog {
  id: string;
  step_name: string;
  tool_name: string | null;
  status: string;
  input_data: any;
  output_data: any;
  error_message: string | null;
  duration_ms: number | null;
  created_at: string;
}

export default function AgentMode() {
  const navigate = useNavigate();
  const [isRunning, setIsRunning] = useState(false);
  const [session, setSession] = useState<AgentSession | null>(null);
  const [logs, setLogs] = useState<ExecutionLog[]>([]);
  const [brandContext, setBrandContext] = useState("");

  // Subscribe to session updates
  useEffect(() => {
    if (!session) return;

    const channel = supabase
      .channel('agent-session-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'agent_sessions',
          filter: `id=eq.${session.id}`
        },
        (payload) => {
          console.log('Session updated:', payload);
          setSession(payload.new as AgentSession);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'agent_execution_logs',
          filter: `session_id=eq.${session.id}`
        },
        (payload) => {
          console.log('New log:', payload);
          setLogs((prev) => [...prev, payload.new as ExecutionLog]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session?.id]);

  const startAgent = async () => {
    try {
      setIsRunning(true);
      
      const { data, error } = await supabase.functions.invoke('agent-start', {
        body: {
          brandContext: brandContext || "No specific brand context provided"
        }
      });

      if (error) throw error;

      console.log('Agent started:', data);
      toast.success('Agent started successfully!');
      
      // Fetch the created session
      const { data: sessionData, error: sessionError } = await supabase
        .from('agent_sessions')
        .select('*')
        .eq('id', data.sessionId)
        .single();

      if (sessionError) throw sessionError;
      
      setSession(sessionData);
      
      // Fetch initial logs
      const { data: logsData } = await supabase
        .from('agent_execution_logs')
        .select('*')
        .eq('session_id', data.sessionId)
        .order('created_at', { ascending: true });
      
      setLogs(logsData || []);
    } catch (error) {
      console.error('Error starting agent:', error);
      toast.error('Failed to start agent');
      setIsRunning(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'started':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'skipped':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      default:
        return null;
    }
  };

  const getStateLabel = (state: string) => {
    return state.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <Layout>
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Agent Mode</h1>
              <p className="text-muted-foreground mt-1">
                Autonomous AI video ad creation - from research to final videos
              </p>
            </div>
            {!session && (
              <Button onClick={startAgent} disabled={isRunning} size="lg">
                {isRunning ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Starting...
                  </>
                ) : (
                  <>
                    <PlayCircle className="mr-2 h-4 w-4" />
                    Start Agent
                  </>
                )}
              </Button>
            )}
          </div>

          {/* Brand Context Input */}
          {!session && (
            <Card>
              <CardHeader>
                <CardTitle>Brand Context (Optional)</CardTitle>
                <CardDescription>
                  Provide any specific information about your brand, target audience, or campaign goals.
                  The agent will use memory from previous sessions if available.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <textarea
                  className="w-full min-h-32 p-3 border rounded-md bg-background"
                  placeholder="Example: We're a sustainable fashion brand targeting millennials..."
                  value={brandContext}
                  onChange={(e) => setBrandContext(e.target.value)}
                />
              </CardContent>
            </Card>
          )}

          {/* Agent Dashboard */}
          {session && (
            <>
              {/* Progress Card */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Agent Status</CardTitle>
                      <CardDescription className="mt-1">
                        {session.current_step || getStateLabel(session.state)}
                      </CardDescription>
                    </div>
                    <Badge variant={session.state === 'error' ? 'destructive' : session.state === 'completed' ? 'default' : 'secondary'}>
                      {getStateLabel(session.state)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Progress</span>
                      <span className="font-medium">{session.progress}%</span>
                    </div>
                    <Progress value={session.progress} className="h-2" />
                  </div>
                </CardContent>
              </Card>

              {/* Execution Logs */}
              <Card>
                <CardHeader>
                  <CardTitle>Execution Log</CardTitle>
                  <CardDescription>
                    Real-time view of agent actions and decisions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-96">
                    <div className="space-y-3">
                      {logs.map((log) => (
                        <div key={log.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                          {getStatusIcon(log.status)}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">
                                {log.step_name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                              </span>
                              {log.tool_name && (
                                <Badge variant="outline" className="text-xs">
                                  {log.tool_name}
                                </Badge>
                              )}
                              {log.duration_ms && (
                                <span className="text-xs text-muted-foreground">
                                  {log.duration_ms}ms
                                </span>
                              )}
                            </div>
                            {log.error_message && (
                              <p className="text-sm text-destructive mt-1">{log.error_message}</p>
                            )}
                            {log.output_data && (
                              <details className="mt-2">
                                <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                                  View output
                                </summary>
                                <pre className="text-xs mt-2 p-2 bg-background rounded overflow-x-auto">
                                  {JSON.stringify(log.output_data, null, 2)}
                                </pre>
                              </details>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {new Date(log.created_at).toLocaleTimeString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}