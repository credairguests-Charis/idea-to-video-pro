import { useState, useRef, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Loader2, Check, Plus, Link2, ArrowUp } from "lucide-react";
import charisLogo from "@/assets/charis-logo-icon.png";

interface AgentLog {
  id: string;
  step_name: string;
  status: string;
  tool_name?: string;
  input_data?: any;
  output_data?: any;
  error_message?: string;
  duration_ms?: number;
  created_at: string;
}

interface AgentChatPanelProps {
  logs: AgentLog[];
  isRunning: boolean;
  userPrompt?: string;
  onSubmit: (brandData: any) => void;
}

export function AgentChatPanel({ logs, isRunning, userPrompt, onSubmit }: AgentChatPanelProps) {
  const [inputValue, setInputValue] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll task list
  useEffect(() => {
    if (scrollRef.current) {
      const viewport = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (viewport) {
        viewport.scrollTop = viewport.scrollHeight;
      }
    }
  }, [logs]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isRunning) return;

    onSubmit({
      prompt: inputValue.trim(),
      brandName: "Agent Query",
      competitorQuery: inputValue.trim(),
    });
    setInputValue("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // Convert logs to task items
  const taskItems = logs.map((log) => ({
    id: log.id,
    icon: log.status === "success" || log.status === "completed" ? "check" : 
          log.status === "running" || log.status === "in_progress" ? "loading" : "search",
    text: log.step_name.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
    status: log.status,
  }));

  const getTaskIcon = (icon: string, status: string) => {
    if (status === "running" || status === "in_progress") {
      return <Loader2 className="h-3.5 w-3.5 text-muted-foreground animate-spin" />;
    }
    if (status === "success" || status === "completed") {
      return <Check className="h-3.5 w-3.5 text-green-600" />;
    }
    return <Search className="h-3.5 w-3.5 text-muted-foreground" />;
  };

  return (
    <div className="flex flex-col h-full bg-white border-r border-border/40">
      {/* Chat Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* User Message Bubble */}
        {userPrompt && (
          <div className="bg-[#F3F4F6] rounded-lg p-3.5 text-sm text-foreground leading-relaxed">
            {userPrompt}
          </div>
        )}

        {/* Agent Response */}
        {userPrompt && (
          <div className="space-y-3">
            {/* Agent Header */}
            <div className="flex items-center gap-2">
              <img src={charisLogo} alt="Charis" className="w-5 h-5 rounded" />
              <span className="text-sm font-medium text-foreground">Charis</span>
            </div>
            
            {/* Agent Message */}
            <div className="text-sm text-foreground leading-relaxed">
              {isRunning ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Processing your request...
                </span>
              ) : logs.length > 0 ? (
                "I've completed the analysis. Check the results on the right panel."
              ) : (
                "I'll build a targeted list based on your criteria."
              )}
            </div>
          </div>
        )}

        {/* Task List Container */}
        {(taskItems.length > 0 || isRunning) && (
          <div className="bg-[#F9FAFB] rounded-lg p-3 border border-border/30">
            <div className="flex items-center gap-2 mb-2.5">
              <span className="text-xs font-medium text-foreground">
                Build<span className="text-primary">ing</span> <span className="text-primary">Agent</span> task list
              </span>
            </div>
            
            <ScrollArea ref={scrollRef} className="max-h-[240px]">
              <div className="space-y-0.5">
                {taskItems.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center gap-2 py-1.5 px-1.5 rounded text-muted-foreground"
                  >
                    {getTaskIcon(task.icon, task.status)}
                    <span className="text-sm truncate">
                      {task.text}
                    </span>
                  </div>
                ))}
                
                {isRunning && (
                  <div className="flex items-center gap-2 py-1.5 px-1.5">
                    <Loader2 className="h-3.5 w-3.5 text-primary animate-spin" />
                    <span className="text-sm text-muted-foreground">Processing...</span>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Empty State */}
        {!userPrompt && taskItems.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center px-6 py-12">
            <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
              <Search className="h-7 w-7 text-primary" />
            </div>
            <h3 className="text-base font-medium text-foreground mb-1.5">Start a conversation</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Ask Charis to analyze competitors, research trends, or generate insights.
            </p>
          </div>
        )}
      </div>

      {/* Bottom Input - Sticky */}
      <div className="p-3 bg-[#F9FAFB] border-t border-border/30">
        <form onSubmit={handleSubmit}>
          <div className="relative bg-white rounded-lg border border-border/50 shadow-sm">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Plan, search, or enrich your data..."
              disabled={isRunning}
              rows={1}
              className="w-full px-3.5 py-3 pr-24 text-sm bg-transparent resize-none focus:outline-none placeholder:text-muted-foreground/60 disabled:opacity-50 min-h-[44px]"
            />
            <div className="absolute right-2 bottom-2 flex items-center gap-1">
              <button
                type="button"
                className="p-1.5 rounded hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground"
                title="Add file"
              >
                <Plus className="h-4 w-4" />
              </button>
              <button
                type="button"
                className="p-1.5 rounded hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground"
                title="Add link"
              >
                <Link2 className="h-4 w-4" />
              </button>
              <button
                type="submit"
                disabled={!inputValue.trim() || isRunning}
                className="w-7 h-7 rounded-full bg-foreground flex items-center justify-center hover:bg-foreground/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                title="Send"
              >
                <ArrowUp className="h-4 w-4 text-background" />
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
