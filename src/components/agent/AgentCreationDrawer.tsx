import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Sparkles } from "lucide-react";

interface AgentCreationDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AgentCreationDrawer({ open, onOpenChange }: AgentCreationDrawerProps) {
  const [agentName, setAgentName] = useState("");
  const [description, setDescription] = useState("");
  const [model, setModel] = useState("gemini-2.5-flash");
  const [enabledTools, setEnabledTools] = useState({
    webSearch: true,
    videoAnalysis: true,
    imageGen: false,
    codeExecution: false,
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[480px] sm:max-w-[480px] overflow-y-auto">
        <SheetHeader className="pb-6">
          <SheetTitle className="flex items-center gap-2 text-xl">
            <Sparkles className="h-5 w-5 text-primary" />
            Create New Agent
          </SheetTitle>
          <SheetDescription>
            Configure your AI agent with custom capabilities and behavior
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6">
          {/* Agent Name */}
          <div className="space-y-2">
            <Label htmlFor="agent-name" className="text-sm font-semibold">
              Agent Name
            </Label>
            <Input
              id="agent-name"
              placeholder="e.g., Competitor Research Agent"
              value={agentName}
              onChange={(e) => setAgentName(e.target.value)}
              className="h-11"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-semibold">
              Description
            </Label>
            <Textarea
              id="description"
              placeholder="Describe what this agent does..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="resize-none"
            />
          </div>

          {/* Model Selection */}
          <div className="space-y-2">
            <Label htmlFor="model" className="text-sm font-semibold">
              AI Model
            </Label>
            <Select value={model} onValueChange={setModel}>
              <SelectTrigger id="model" className="h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gemini-2.5-flash">Gemini 2.5 Flash (Recommended)</SelectItem>
                <SelectItem value="gemini-2.5-pro">Gemini 2.5 Pro</SelectItem>
                <SelectItem value="gpt-5">GPT-5</SelectItem>
                <SelectItem value="gpt-5-mini">GPT-5 Mini</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Tools Access */}
          <div className="space-y-4">
            <Label className="text-sm font-semibold">Tools & Capabilities</Label>
            
            <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">Web Search</p>
                  <p className="text-xs text-muted-foreground">Access real-time web data</p>
                </div>
                <Switch
                  checked={enabledTools.webSearch}
                  onCheckedChange={(checked) =>
                    setEnabledTools({ ...enabledTools, webSearch: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">Video Analysis</p>
                  <p className="text-xs text-muted-foreground">Analyze video content</p>
                </div>
                <Switch
                  checked={enabledTools.videoAnalysis}
                  onCheckedChange={(checked) =>
                    setEnabledTools({ ...enabledTools, videoAnalysis: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">Image Generation</p>
                  <p className="text-xs text-muted-foreground">Create images from text</p>
                </div>
                <Switch
                  checked={enabledTools.imageGen}
                  onCheckedChange={(checked) =>
                    setEnabledTools({ ...enabledTools, imageGen: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">Code Execution</p>
                  <p className="text-xs text-muted-foreground">Run code snippets</p>
                </div>
                <Switch
                  checked={enabledTools.codeExecution}
                  onCheckedChange={(checked) =>
                    setEnabledTools({ ...enabledTools, codeExecution: checked })
                  }
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              className="flex-1 h-11"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button className="flex-1 h-11 font-semibold">Create Agent</Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
