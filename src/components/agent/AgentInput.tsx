import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Sparkles } from "lucide-react";

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
    <div className="p-4 border-t border-border bg-muted/30">
      <div className="space-y-2">
        <Textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Describe your creative brief... (e.g., 'Create a UGC ad for a skincare brand targeting Gen Z')"
          className="min-h-[100px] resize-none bg-background"
          disabled={isRunning}
        />
        <div className="flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            {isRunning ? "Agent is running..." : "Press ⌘+Enter to start"}
          </div>
          <Button 
            onClick={handleSubmit} 
            disabled={!prompt.trim() || isRunning}
            className="gap-2"
          >
            <Sparkles className="h-4 w-4" />
            Start Agent
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
