import { Bell, Settings, HelpCircle, ChevronDown, Plus, Filter, Columns3 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import charisLogo from "@/assets/charis-logo-icon.png";

interface AgentNavbarProps {
  workspaceTitle?: string;
  sessionId?: string;
  rowCount?: number;
}

export function AgentNavbar({ workspaceTitle = "Charis Agent Workspace", sessionId, rowCount = 0 }: AgentNavbarProps) {
  const { user } = useAuth();

  return (
    <div className="h-12 flex items-center justify-between px-4 border-b border-border/40 bg-[#F5F5F5]">
      {/* Left side - Logo and workspace title */}
      <div className="flex items-center gap-3">
        {/* Charis Logo */}
        <img src={charisLogo} alt="Charis" className="w-7 h-7 rounded-lg" />
        
        {/* Workspace Title */}
        <div className="flex items-center gap-2">
          <h1 className="text-sm font-medium text-foreground">{workspaceTitle}</h1>
          <span className="text-xs text-muted-foreground px-1.5 py-0.5 bg-muted/40 rounded">
            {rowCount} rows
          </span>
        </div>

        {/* Action Icons */}
        <div className="flex items-center gap-0.5 ml-1">
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v8M8 12h8" />
            </svg>
          </Button>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <circle cx="12" cy="12" r="8" strokeDasharray="4 4" />
            </svg>
          </Button>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Right side - Actions and user */}
      <div className="flex items-center gap-1">
        {/* Filter/View Actions */}
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground">
          <Filter className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground">
          <Columns3 className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground">
          <Plus className="h-4 w-4" />
        </Button>

        {/* Separator */}
        <div className="w-px h-5 bg-border/50 mx-2" />

        {/* Feedback Link */}
        <span className="text-xs text-muted-foreground mr-2 cursor-pointer hover:text-foreground transition-colors">
          Feedback
        </span>

        {/* Utility Icons */}
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground relative">
          <Bell className="h-4 w-4" />
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-destructive rounded-full" />
        </Button>

        {/* User Avatar */}
        <Avatar className="h-7 w-7 ml-1 cursor-pointer">
          <AvatarImage src={user?.user_metadata?.avatar_url} />
          <AvatarFallback className="bg-orange-500 text-white text-xs font-medium">
            {user?.email?.charAt(0).toUpperCase() || "U"}
          </AvatarFallback>
        </Avatar>
      </div>
    </div>
  );
}
