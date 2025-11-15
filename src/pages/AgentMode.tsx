import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, PlayCircle, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { AgentStepCard } from "@/components/agent/AgentStepCard";
import { ScriptApprovalDialog } from "@/components/agent/ScriptApprovalDialog";

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
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showScriptApproval, setShowScriptApproval] = useState(false);
  const [scripts, setScripts] = useState<any[]>([]);

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
          const updatedSession = payload.new as AgentSession;
          setSession(updatedSession);
          
          // Check if we need to show script approval dialog
          if (updatedSession.state === 'awaiting_approval' && updatedSession.metadata?.scripts) {
            setScripts(updatedSession.metadata.scripts);
            setShowScriptApproval(true);
          }
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

  const cancelAgent = async () => {
    if (!session) return;

    try {
      const { error } = await supabase.functions.invoke('agent-cancel', {
        body: { sessionId: session.id }
      });

      if (error) throw error;

      toast.success('Agent session cancelled');
      setShowCancelDialog(false);
      navigate('/app/projects');
    } catch (error) {
      console.error('Error canceling agent:', error);
      toast.error('Failed to cancel agent session');
    }
  };

  const approveScripts = async (selectedScripts: string[]) => {
    if (!session) return;

    try {
      const { error } = await supabase.functions.invoke('agent-approve-scripts', {
        body: { 
          sessionId: session.id, 
          approved: true,
          selectedScripts 
        }
      });

      if (error) throw error;

      toast.success('Scripts approved! Generating videos...');
      setShowScriptApproval(false);
    } catch (error) {
      console.error('Error approving scripts:', error);
      toast.error('Failed to approve scripts');
    }
  };

  const rejectScripts = async () => {
    if (!session) return;

    try {
      const { error } = await supabase.functions.invoke('agent-approve-scripts', {
        body: { 
          sessionId: session.id, 
          approved: false 
        }
      });

      if (error) throw error;

      toast.success('Scripts rejected. Regenerating...');
      setShowScriptApproval(false);
    } catch (error) {
      console.error('Error rejecting scripts:', error);
      toast.error('Failed to reject scripts');
    }
  };

  const getStateLabel = (state: string) => {
    return state.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const canCancel = session && !['completed', 'error', 'cancelled'].includes(session.state);

  return (
    <Layout>
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {session && (
                <Button variant="ghost" size="sm" onClick={() => setShowCancelDialog(true)}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
              )}
              <div>
                <h1 className="text-3xl font-bold">Agent Mode</h1>
                <p className="text-muted-foreground mt-1">
                  {session 
                    ? `Session #${session.id.slice(0, 8)}...`
                    : 'Autonomous AI video ad creation - from research to final videos'}
                </p>
              </div>
            </div>
            {!session ? (
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
            ) : canCancel ? (
              <Button variant="outline" onClick={() => setShowCancelDialog(true)}>
                Cancel Agent
              </Button>
            ) : null}
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
                      {logs.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                          <p>Waiting for agent to start...</p>
                        </div>
                      ) : (
                        logs.map((log) => (
                          <AgentStepCard
                            key={log.id}
                            stepName={log.step_name}
                            status={log.status}
                            timestamp={log.created_at}
                            outputData={log.output_data}
                            errorMessage={log.error_message}
                            toolName={log.tool_name}
                            durationMs={log.duration_ms}
                          />
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Agent Session?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this agent session? All progress will be lost and you'll return to the projects page.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continue Agent</AlertDialogCancel>
            <AlertDialogAction onClick={cancelAgent}>
              Yes, Cancel Session
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Script Approval Dialog */}
      {scripts.length > 0 && (
        <ScriptApprovalDialog
          open={showScriptApproval}
          onOpenChange={setShowScriptApproval}
          scripts={scripts}
          onApprove={approveScripts}
          onReject={rejectScripts}
        />
      )}
    </Layout>
  );
}