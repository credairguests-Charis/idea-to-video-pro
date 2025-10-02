import { useState, useRef, useCallback, useEffect } from "react";
import { Users, Upload, Mic, ArrowUp, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { ActorCard } from "@/components/ActorCard";
import { ActorTTSConfig } from "@/components/ActorTTSSettings";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface SelectedActor {
  id: string;
  name: string;
  thumbnail_url: string;
}

interface BottomInputPanelProps {
  script: string;
  onScriptChange: (value: string) => void;
  selectedActors: SelectedActor[];
  onRemoveActor: (actorId: string) => void;
  onOpenActorSelector: () => void;
  audioSource: "tts" | "upload";
  onAudioSourceChange: (source: "tts" | "upload") => void;
  audioFile: File | null;
  onAudioSelected: (file: File) => void;
  onAudioRemoved: () => void;
  actorTTSConfigs: Record<string, ActorTTSConfig>;
  onTTSConfigChange: (actorId: string, config: ActorTTSConfig) => void;
  onSubmit: () => void;
  isLoading: boolean;
}

export function BottomInputPanel({
  script,
  onScriptChange,
  selectedActors,
  onRemoveActor,
  onOpenActorSelector,
  audioSource,
  onAudioSourceChange,
  audioFile,
  onAudioSelected,
  onAudioRemoved,
  actorTTSConfigs,
  onTTSConfigChange,
  onSubmit,
  isLoading,
}: BottomInputPanelProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [charCount, setCharCount] = useState(0);
  const maxChars = 1500;

  useEffect(() => {
    setCharCount(script.length);
  }, [script]);

  const adjustHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    
    textarea.style.height = "72px";
    const newHeight = Math.min(textarea.scrollHeight, 300);
    textarea.style.height = `${newHeight}px`;
  }, []);

  useEffect(() => {
    adjustHeight();
  }, [script, adjustHeight]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onAudioSelected(file);
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pb-4 pointer-events-none">
      <div 
        className="w-[92%] max-w-[920px] mx-auto bg-card rounded-2xl border border-border shadow-[0_6px_20px_rgba(12,12,12,0.05)] pointer-events-auto"
      >
        {/* Header */}
        <div className="relative px-5 pt-5 pb-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs text-muted-foreground hover:text-foreground">
                <Users className="h-4 w-4" />
                Talking Actors
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="bg-background z-50">
              <DropdownMenuItem>All Actors</DropdownMenuItem>
              <DropdownMenuItem>Favorites</DropdownMenuItem>
              <DropdownMenuItem>My Clones</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          {audioSource === "tts" && (
            <span className="absolute right-5 top-5 text-xs text-muted-foreground">
              {charCount} / {maxChars}
            </span>
          )}
        </div>

        {/* Main content area */}
        <div className="px-5">
          {audioSource === "tts" ? (
            <Textarea
              ref={textareaRef}
              value={script}
              onChange={(e) => {
                if (e.target.value.length <= maxChars) {
                  onScriptChange(e.target.value);
                }
              }}
              placeholder="Write script..."
              className={cn(
                "min-h-[72px] max-h-[300px] w-full resize-none border-0 bg-transparent",
                "focus-visible:ring-0 focus-visible:ring-offset-0 text-sm",
                "placeholder:text-muted-foreground"
              )}
              disabled={isLoading}
            />
          ) : (
            <div className="min-h-[120px] flex items-center justify-center">
              {audioFile ? (
                <div className="w-full p-4 border-2 border-dashed border-border rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-muted rounded-lg p-3">
                      <Mic className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{audioFile.name}</p>
                      <p className="text-xs text-muted-foreground">Audio file uploaded</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onAudioRemoved}
                    disabled={isLoading}
                  >
                    Remove
                  </Button>
                </div>
              ) : (
                <div 
                  className="w-full p-8 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="audio/mp3,audio/mp4,audio/mpeg,audio/wav"
                    onChange={handleFileSelect}
                    className="hidden"
                    disabled={isLoading}
                  />
                  <div className="text-center">
                    <Mic className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground mb-1">
                      Upload an .mp3/.mp4 file or{" "}
                      <span className="underline">record a new one</span>
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Selected actors */}
        {selectedActors.length > 0 && (
          <div className="px-5 pb-3">
            <div className="flex flex-wrap gap-3 items-center">
              {selectedActors.map((actor) => (
                <ActorCard
                  key={actor.id}
                  actor={actor}
                  onRemove={() => onRemoveActor(actor.id)}
                  showSettings={audioSource === "tts"}
                  ttsConfig={actorTTSConfigs[actor.id]}
                  onTTSConfigChange={onTTSConfigChange}
                  disabled={isLoading}
                />
              ))}
            </div>
          </div>
        )}

        {/* Bottom bar */}
        <div className="flex items-center justify-between px-5 pb-5 pt-2 border-t border-border">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs">
                {audioSource === "tts" ? (
                  <>
                    <Mic className="h-4 w-4" />
                    Text to Speech
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    Speech to Speech
                  </>
                )}
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => onAudioSourceChange("tts")}>
                <Mic className="h-4 w-4 mr-2" />
                Text to Speech
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onAudioSourceChange("upload")}>
                <Upload className="h-4 w-4 mr-2" />
                Speech to Speech
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="flex items-center gap-2">
            {selectedActors.length > 0 && (
              <div className="flex items-center gap-1 px-2 py-1 bg-muted rounded-lg">
                <Users className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs font-medium">{selectedActors.length} Actors</span>
              </div>
            )}
            
            <Button
              variant="ghost"
              size="sm"
              onClick={onOpenActorSelector}
              className="h-8 text-xs"
              disabled={isLoading}
            >
              <Users className="h-4 w-4 mr-1" />
              Add actors
            </Button>

            <Button
              onClick={onSubmit}
              disabled={isLoading || selectedActors.length === 0 || (!script.trim() && !audioFile)}
              className="h-9 w-9 rounded-full p-0 bg-primary hover:bg-primary/90"
            >
              <ArrowUp className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
