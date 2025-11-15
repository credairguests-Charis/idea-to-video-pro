import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Script {
  id: string;
  title: string;
  content: string;
  duration: number;
  tone: string;
}

interface ScriptApprovalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scripts: Script[];
  onApprove: (selectedScripts: string[]) => void;
  onReject: () => void;
}

export function ScriptApprovalDialog({
  open,
  onOpenChange,
  scripts,
  onApprove,
  onReject
}: ScriptApprovalDialogProps) {
  const [selectedScripts, setSelectedScripts] = useState<string[]>(scripts.map(s => s.id));

  const toggleScript = (scriptId: string) => {
    setSelectedScripts(prev =>
      prev.includes(scriptId)
        ? prev.filter(id => id !== scriptId)
        : [...prev, scriptId]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Review Generated Scripts</DialogTitle>
          <DialogDescription>
            The agent has generated {scripts.length} script(s) for your video ads. Review and approve them to proceed with video generation.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[500px] pr-4">
          <Tabs defaultValue={scripts[0]?.id} className="w-full">
            <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${scripts.length}, 1fr)` }}>
              {scripts.map((script, index) => (
                <TabsTrigger key={script.id} value={script.id}>
                  Script {index + 1}
                </TabsTrigger>
              ))}
            </TabsList>

            {scripts.map((script) => (
              <TabsContent key={script.id} value={script.id}>
                <Card>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle>{script.title}</CardTitle>
                        <CardDescription className="mt-1">
                          Duration: {script.duration}s • Tone: {script.tone}
                        </CardDescription>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id={`select-${script.id}`}
                          checked={selectedScripts.includes(script.id)}
                          onCheckedChange={() => toggleScript(script.id)}
                        />
                        <label
                          htmlFor={`select-${script.id}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          Include
                        </label>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="prose prose-sm max-w-none">
                        <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
                          {script.content}
                        </pre>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            ))}
          </Tabs>
        </ScrollArea>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={onReject}>
            Reject & Regenerate
          </Button>
          <Button 
            onClick={() => onApprove(selectedScripts)}
            disabled={selectedScripts.length === 0}
          >
            Approve {selectedScripts.length > 0 && `(${selectedScripts.length})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
