import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Loader2, Clock, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface AgentStepCardProps {
  stepName: string;
  status: string;
  timestamp: string;
  outputData?: any;
  errorMessage?: string | null;
  toolName?: string | null;
  durationMs?: number | null;
}

export function AgentStepCard({
  stepName,
  status,
  timestamp,
  outputData,
  errorMessage,
  toolName,
  durationMs
}: AgentStepCardProps) {
  const getStatusIcon = () => {
    switch (status) {
      case 'started':
        return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-destructive" />;
      case 'queued':
        return <Clock className="h-4 w-4 text-muted-foreground" />;
      default:
        return null;
    }
  };

  const getStatusLabel = () => {
    return stepName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <div className={cn(
      "flex items-start gap-3 p-4 rounded-lg transition-colors",
      status === 'started' ? 'bg-primary/5 border border-primary/20' : 'bg-muted/50'
    )}>
      {getStatusIcon()}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm">
            {getStatusLabel()}
          </span>
          {toolName && (
            <Badge variant="outline" className="text-xs">
              {toolName}
            </Badge>
          )}
          {durationMs && (
            <span className="text-xs text-muted-foreground">
              {durationMs}ms
            </span>
          )}
        </div>
        
        {errorMessage && (
          <p className="text-sm text-destructive mt-1">{errorMessage}</p>
        )}
        
        {outputData && status === 'completed' && (
          <details className="mt-2">
            <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
              View details
            </summary>
            <div className="mt-2 p-3 bg-background rounded text-xs overflow-x-auto">
              <pre className="whitespace-pre-wrap">
                {typeof outputData === 'string' 
                  ? outputData 
                  : JSON.stringify(outputData, null, 2)}
              </pre>
            </div>
          </details>
        )}
      </div>
      <span className="text-xs text-muted-foreground whitespace-nowrap">
        {new Date(timestamp).toLocaleTimeString()}
      </span>
    </div>
  );
}
