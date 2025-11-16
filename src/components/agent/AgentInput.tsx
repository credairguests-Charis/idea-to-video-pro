import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Sparkles, Plus, Image as ImageIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface AgentInputProps {
  onSubmit: (prompt: string) => void;
  isRunning: boolean;
}

export function AgentInput({ onSubmit, isRunning }: AgentInputProps) {
  const [prompt, setPrompt] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleImageUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      // Handle file upload logic here
      console.log("Files selected:", files);
    }
  };

  return (
    <div className="p-3 border-t border-border/50 bg-card">
      <div className="relative">
        <div className="flex items-start gap-2">
          {/* Plus Button with Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 flex-shrink-0 text-muted-foreground hover:text-foreground hover:bg-muted"
                disabled={isRunning}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuItem onClick={handleImageUpload} className="cursor-pointer">
                <ImageIcon className="h-4 w-4 mr-2" />
                Upload product images
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFileChange}
          />

          {/* Textarea and Submit Button */}
          <div className="flex-1 space-y-2">
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask Lovable..."
              className="min-h-[80px] resize-none bg-muted/30 border-border/50 text-sm focus-visible:ring-1"
              disabled={isRunning}
            />
            <div className="flex items-center justify-end">
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
      </div>
    </div>
  );
}
