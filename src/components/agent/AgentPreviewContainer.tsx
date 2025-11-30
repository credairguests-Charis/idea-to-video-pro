import { Sparkles, Brain, Zap } from "lucide-react";

export function AgentPreviewContainer() {
  return (
    <div className="w-full max-w-[480px] rounded-2xl border border-border bg-card p-6 shadow-[0_8px_32px_rgba(0,0,0,0.08)] transition-all hover:shadow-[0_12px_40px_rgba(0,0,0,0.12)]">
      {/* Preview Header */}
      <div className="mb-4 flex items-center justify-between border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <Brain className="h-4 w-4 text-primary" />
          </div>
          <span className="text-sm font-semibold text-foreground">Agent Preview</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-full bg-success animate-pulse"></div>
          <span className="text-xs text-muted-foreground">Live</span>
        </div>
      </div>

      {/* Preview Content */}
      <div className="space-y-4">
        {/* Agent Status Card */}
        <div className="rounded-xl bg-secondary/50 p-4">
          <div className="mb-3 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-foreground">Competitor Research Agent</span>
          </div>
          
          {/* Progress Steps */}
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-success text-[0.65rem] font-bold text-success-foreground">
                ✓
              </div>
              <span className="text-xs text-muted-foreground">Analyzing competitors</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-success text-[0.65rem] font-bold text-success-foreground">
                ✓
              </div>
              <span className="text-xs text-muted-foreground">Extracting video insights</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-6 w-6 animate-spin items-center justify-center rounded-full border-2 border-primary border-t-transparent">
              </div>
              <span className="text-xs font-medium text-foreground">Synthesizing findings...</span>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-border bg-card p-3">
            <div className="flex items-center gap-2">
              <Zap className="h-3.5 w-3.5 text-info" />
              <span className="text-xs text-muted-foreground">Speed</span>
            </div>
            <p className="mt-1 text-lg font-bold text-foreground">2.4s</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-3">
            <div className="flex items-center gap-2">
              <Brain className="h-3.5 w-3.5 text-success" />
              <span className="text-xs text-muted-foreground">Accuracy</span>
            </div>
            <p className="mt-1 text-lg font-bold text-foreground">98%</p>
          </div>
        </div>

        {/* Output Preview */}
        <div className="rounded-lg border border-border bg-muted/30 p-3">
          <p className="text-xs font-medium text-muted-foreground mb-2">Latest Output</p>
          <div className="space-y-1.5">
            <div className="h-2 w-full rounded-full bg-muted animate-pulse"></div>
            <div className="h-2 w-5/6 rounded-full bg-muted animate-pulse"></div>
            <div className="h-2 w-4/6 rounded-full bg-muted animate-pulse"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
