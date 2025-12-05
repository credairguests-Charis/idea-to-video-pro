import { Bell, Settings, HelpCircle, ChevronDown } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

interface AgentNavbarProps {
  workspaceTitle?: string;
  sessionId?: string;
}

export function AgentNavbar({ workspaceTitle = "Charis Agent Workspace", sessionId }: AgentNavbarProps) {
  const { user } = useAuth();

  return (
    <div className="h-14 flex items-center justify-between px-4 border-b border-border/50 bg-white">
      {/* Left side - Workspace title */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <span className="text-sm font-semibold text-primary">C</span>
        </div>
        <div className="flex items-center gap-2">
          <h1 className="text-sm font-semibold text-foreground">{workspaceTitle}</h1>
          <span className="text-xs text-muted-foreground px-2 py-0.5 bg-muted/50 rounded">
            0 rows
          </span>
        </div>
        <div className="flex items-center gap-1 ml-2">
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground">
            <ChevronDown className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Right side - Actions */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground mr-2">Feedback</span>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground">
          <Bell className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground">
          <Settings className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground">
          <HelpCircle className="h-4 w-4" />
        </Button>
        <Avatar className="h-8 w-8 ml-1">
          <AvatarImage src={user?.user_metadata?.avatar_url} />
          <AvatarFallback className="bg-orange-500 text-white text-xs">
            {user?.email?.charAt(0).toUpperCase() || "U"}
          </AvatarFallback>
        </Avatar>
      </div>
    </div>
  );
}
