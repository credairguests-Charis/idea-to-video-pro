import { Button } from "@/components/ui/button";
import { AgentPreviewContainer } from "./AgentPreviewContainer";
import { ArrowRight, Sparkles } from "lucide-react";

interface AgentHeroProps {
  onCreateAgent: () => void;
}

export function AgentHero({ onCreateAgent }: AgentHeroProps) {
  return (
    <section className="relative overflow-hidden border-b border-border bg-gradient-to-b from-card to-secondary/20">
      <div className="mx-auto max-w-[1440px] px-8 py-20 lg:py-28">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 items-center">
          {/* Left Column - Content */}
          <div className="space-y-6 animate-fade-in">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 shadow-sm">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-foreground">AI-Powered Automation</span>
            </div>
            
            <h1 className="text-4xl font-bold leading-tight text-foreground lg:text-5xl xl:text-6xl">
              Build intelligent agents that execute tasks for you
            </h1>
            
            <p className="text-lg text-muted-foreground lg:text-xl max-w-[560px]">
              Design, test, and deploy AI agents that act autonomously using Charis Agent Mode. 
              Research competitors, analyze trends, and generate winning content—all on autopilot.
            </p>

            <div className="flex flex-col gap-3 pt-4 sm:flex-row sm:items-center">
              <Button 
                size="lg" 
                className="h-12 px-6 text-base font-semibold shadow-lg hover:shadow-xl transition-all"
                onClick={onCreateAgent}
              >
                Create Your First Agent
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                className="h-12 px-6 text-base font-semibold"
              >
                View Templates
              </Button>
            </div>

            {/* Stats */}
            <div className="flex gap-8 pt-4 border-t border-border">
              <div>
                <p className="text-2xl font-bold text-foreground">10,000+</p>
                <p className="text-sm text-muted-foreground">Agents deployed</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">2.4s</p>
                <p className="text-sm text-muted-foreground">Avg. response time</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">98%</p>
                <p className="text-sm text-muted-foreground">Accuracy rate</p>
              </div>
            </div>
          </div>

          {/* Right Column - Preview Container */}
          <div className="flex justify-center lg:justify-end animate-fade-in" style={{ animationDelay: "150ms" }}>
            <AgentPreviewContainer />
          </div>
        </div>
      </div>
    </section>
  );
}
