import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export function AgentNavbar() {
  const navigate = useNavigate();

  return (
    <nav className="sticky top-0 z-50 h-[72px] border-b border-border bg-card">
      <div className="mx-auto flex h-full max-w-[1440px] items-center justify-between px-8">
        {/* Logo */}
        <div 
          className="flex items-center gap-3 cursor-pointer"
          onClick={() => navigate('/')}
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
            <span className="text-lg font-bold text-primary-foreground">C</span>
          </div>
          <span className="text-xl font-semibold text-foreground">Charis</span>
        </div>

        {/* Navigation Items */}
        <div className="hidden md:flex items-center gap-7">
          <button className="text-[0.95rem] font-medium text-foreground transition-colors hover:text-primary">
            Agents
          </button>
          <button className="text-[0.95rem] font-medium text-foreground transition-colors hover:text-primary">
            Workflows
          </button>
          <button className="text-[0.95rem] font-medium text-foreground transition-colors hover:text-primary">
            Templates
          </button>
          <button className="text-[0.95rem] font-medium text-foreground transition-colors hover:text-primary">
            Docs
          </button>
        </div>

        {/* Right CTAs */}
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            className="h-11 px-5 text-[0.95rem] font-semibold"
            onClick={() => navigate('/projects')}
          >
            Dashboard
          </Button>
          <Button 
            className="h-11 px-5 text-[0.95rem] font-semibold shadow-sm"
          >
            Create Agent
          </Button>
        </div>
      </div>
    </nav>
  );
}
