import { Button } from "@/components/ui/button";
import { AgentCard } from "./AgentCard";
import { Brain, TrendingUp, Video, Plus } from "lucide-react";

interface AgentWorkspaceProps {
  onCreateAgent: () => void;
}

export function AgentWorkspace({ onCreateAgent }: AgentWorkspaceProps) {
  const agents = [
    {
      name: "Competitor Research Agent",
      description: "Automatically discovers and analyzes competitor ads across multiple platforms",
      status: "active" as const,
      icon: TrendingUp,
      lastRun: "2 hours ago",
      totalRuns: 145,
    },
    {
      name: "Video Content Analyzer",
      description: "Extracts insights from video content including transcripts, hooks, and CTAs",
      status: "running" as const,
      icon: Video,
      lastRun: "Just now",
      totalRuns: 89,
    },
    {
      name: "UGC Script Generator",
      description: "Creates brand-aligned UGC scripts based on competitor analysis and trends",
      status: "idle" as const,
      icon: Brain,
      lastRun: "1 day ago",
      totalRuns: 67,
    },
  ];

  return (
    <section className="bg-background py-16">
      <div className="mx-auto max-w-[1440px] px-8">
        {/* Section Header */}
        <div className="mb-10 flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-foreground">Your Agents</h2>
            <p className="mt-2 text-muted-foreground">
              Manage and monitor your AI agents
            </p>
          </div>
          <Button 
            size="lg" 
            className="h-11 gap-2 font-semibold"
            onClick={onCreateAgent}
          >
            <Plus className="h-4 w-4" />
            New Agent
          </Button>
        </div>

        {/* Agent Grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {agents.map((agent, index) => (
            <div
              key={index}
              className="animate-fade-in"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <AgentCard {...agent} />
            </div>
          ))}
        </div>

        {/* Empty State (if no agents) */}
        {agents.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <Brain className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="mb-2 text-xl font-semibold text-foreground">
              No agents yet
            </h3>
            <p className="mb-6 max-w-sm text-muted-foreground">
              Create your first AI agent to start automating tasks
            </p>
            <Button onClick={onCreateAgent}>
              <Plus className="mr-2 h-4 w-4" />
              Create Your First Agent
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
