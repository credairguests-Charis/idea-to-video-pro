import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Brain, TrendingUp, Video, MoreVertical } from "lucide-react";
import { LucideIcon } from "lucide-react";

interface AgentCardProps {
  name: string;
  description: string;
  status: "active" | "idle" | "running";
  icon?: LucideIcon;
  lastRun?: string;
  totalRuns?: number;
  onClick?: () => void;
}

export function AgentCard({
  name,
  description,
  status,
  icon: Icon = Brain,
  lastRun = "2 hours ago",
  totalRuns = 145,
  onClick,
}: AgentCardProps) {
  const statusConfig = {
    active: { color: "bg-success", text: "Active", badge: "default" },
    idle: { color: "bg-muted", text: "Idle", badge: "secondary" },
    running: { color: "bg-info animate-pulse", text: "Running", badge: "default" },
  };

  const config = statusConfig[status];

  return (
    <div className="group relative rounded-xl border border-border bg-card p-6 shadow-sm transition-all hover:shadow-lg hover:-translate-y-1 cursor-pointer">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-foreground">{name}</h3>
            <div className="flex items-center gap-2 mt-1">
              <div className={`h-2 w-2 rounded-full ${config.color}`}></div>
              <span className="text-xs text-muted-foreground">{config.text}</span>
            </div>
          </div>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </div>

      <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{description}</p>

      <div className="flex items-center justify-between pt-4 border-t border-border">
        <div className="flex gap-4 text-xs text-muted-foreground">
          <span>{lastRun}</span>
          <span>•</span>
          <span>{totalRuns} runs</span>
        </div>
        <Button 
          size="sm" 
          variant="outline" 
          className="h-8 px-3 text-xs font-semibold"
          onClick={onClick}
        >
          Open Agent
        </Button>
      </div>
    </div>
  );
}
