import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Sparkles } from "lucide-react";

interface AgentInputProps {
  onSubmit: (prompt: string) => void;
  isRunning: boolean;
}

export function AgentInput({ onSubmit, isRunning }: AgentInputProps) {
  const [prompt, setPrompt] = useState("");

  const handleSubmit = () => {
    if (!prompt.trim() || isRunning) return;
    onSubmit(prompt);
    setPrompt("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="p-3 border-t border-border/50 bg-card">
      <div className="space-y-2">
        <Textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Describe what you want to create..."
          className="min-h-[80px] resize-none bg-muted/30 border-border/50 text-sm focus-visible:ring-1"
          disabled={isRunning}
        />
        <div className="flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            {isRunning ? "Agent is running..." : "⌘+Enter to start"}
          </div>
          <Button 
            onClick={handleSubmit} 
            disabled={!prompt.trim() || isRunning}
            size="sm"
            className="h-8 px-3 text-xs gap-1.5"
          >
            {isRunning ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" />
                Running
              </>
            ) : (
              <>
                <Sparkles className="h-3 w-3" />
                Start Agent
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
