import { PromptBox } from "@/components/ui/chatgpt-prompt-input";

interface AgentInputProps {
  onSubmit: (prompt: string) => void;
  isRunning: boolean;
}

export function AgentInput({ onSubmit, isRunning }: AgentInputProps) {
  return (
    <div className="p-3 border-t border-border/50 bg-card">
      <PromptBox 
        onSubmit={onSubmit}
        disabled={isRunning}
      />
    </div>
  );
}
