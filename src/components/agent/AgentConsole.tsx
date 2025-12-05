import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Square, CheckCircle2, XCircle, AlertCircle, Image, Search, Code, Telescope, Lightbulb, Sparkles, ArrowDown } from "lucide-react";
import { CharisLoader } from "@/components/ui/charis-loader";
import { formatDistanceToNow } from "date-fns";
import { useEffect, useRef, useState } from "react";
import { WorkflowStepCard } from "./WorkflowStepCard";
import { Progress } from "@/components/ui/progress";

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
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [isAutoScroll, setIsAutoScroll] = useState(true);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (isAutoScroll && scrollAreaRef.current) {
      const viewport = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (viewport) {
        viewport.scrollTop = viewport.scrollHeight;
      }
    }
  }, [logs, isAutoScroll]);

  // Detect when user scrolls up
  useEffect(() => {
    const viewport = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]');
    if (!viewport) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = viewport;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
      
      setShowScrollButton(!isNearBottom);
      setIsAutoScroll(isNearBottom);
    };

    viewport.addEventListener('scroll', handleScroll);
    return () => viewport.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToBottom = () => {
    const viewport = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]');
    if (viewport) {
      viewport.scrollTop = viewport.scrollHeight;
      setIsAutoScroll(true);
    }
  };

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
        return <CharisLoader size="sm" />;
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

  // Group logs by step for workflow view
  const workflowSteps = logs.reduce((acc, log) => {
    const existingStep = acc.find(s => s.step_name === log.step_name);
    if (existingStep) {
      // Update step with latest data
      if (log.status === 'completed' || log.status === 'success') {
        existingStep.status = log.status;
        existingStep.output_data = log.output_data;
        existingStep.endTime = log.created_at;
        existingStep.duration = log.duration_ms;
      } else if (log.status === 'failed' || log.status === 'error') {
        existingStep.status = log.status;
        existingStep.error_message = log.error_message;
        existingStep.endTime = log.created_at;
      }
    } else {
      acc.push({
        step_name: log.step_name,
        status: log.status,
        tool_name: log.tool_name,
        startTime: log.created_at,
        endTime: log.status === 'completed' || log.status === 'failed' ? log.created_at : undefined,
        duration: log.duration_ms,
        input_data: log.input_data,
        output_data: log.output_data,
        error_message: log.error_message,
      });
    }
    return acc;
  }, [] as any[]);

  return (
    <div className="flex-1 flex flex-col h-full bg-card relative">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border/50 flex flex-col gap-2 bg-card">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {session && (
              <Badge 
                variant={isRunning ? "default" : "secondary"}
                className="text-xs font-medium"
              >
                {session.state}
              </Badge>
            )}
            {session && session.current_step && (
              <span className="text-xs text-muted-foreground">
                {session.current_step.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
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
        
        {/* Overall Progress Bar */}
        {session && session.progress !== undefined && isRunning && (
          <div className="space-y-1">
            <Progress value={session.progress} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Progress</span>
              <span>{session.progress}%</span>
            </div>
          </div>
        )}
      </div>

      {/* Workflow Steps View */}
      <ScrollArea ref={scrollAreaRef} className="flex-1 px-4 py-4">
        {!session ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <Sparkles className="h-10 w-10 text-muted-foreground mb-3" />
            <div className="text-foreground font-medium mb-1">Ready to Start</div>
            <div className="text-muted-foreground text-sm">
              Enter your brand details below to begin competitor research
            </div>
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <CharisLoader size="lg" className="mb-3" />
            <div className="text-foreground font-medium mb-1">Initializing Workflow</div>
            <div className="text-muted-foreground text-sm">
              Setting up agent execution pipeline...
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {workflowSteps.map((step, index) => (
              <WorkflowStepCard
                key={`${step.step_name}-${index}`}
                stepName={step.step_name}
                status={step.status}
                toolName={step.tool_name}
                startTime={step.startTime}
                endTime={step.endTime}
                duration={step.duration}
                inputData={step.input_data}
                outputData={step.output_data}
                errorMessage={step.error_message}
                progress={
                  step.status === "running" && session?.progress
                    ? session.progress
                    : undefined
                }
              />
            ))}

            {/* Active Step Indicator */}
            {isRunning && session?.current_step && (
              <div className="flex items-center gap-3 p-3 bg-primary/10 border border-primary/20 rounded-lg animate-pulse">
                <CharisLoader size="md" />
                <div>
                  <div className="text-sm font-medium text-foreground">
                    {session.current_step.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                  </div>
                  <div className="text-xs text-muted-foreground">In progress...</div>
                </div>
              </div>
            )}
          </div>
        )}
      </ScrollArea>

      {/* Scroll to bottom button */}
      {showScrollButton && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-4 right-4 z-10 flex items-center justify-center w-10 h-10 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-all"
          aria-label="Scroll to bottom"
        >
          <ArrowDown className="h-5 w-5" />
        </button>
      )}
    </div>
  );
}
