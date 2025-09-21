import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Volume2, Loader2 } from "lucide-react";

interface TTSControlsProps {
  onGenerate: (voice: string, language: string) => void;
  disabled?: boolean;
  isGenerating?: boolean;
}

const VOICE_OPTIONS = [
  { value: "alloy", label: "Alloy (Neutral)" },
  { value: "echo", label: "Echo (Male)" },
  { value: "fable", label: "Fable (British)" },
  { value: "onyx", label: "Onyx (Deep)" },
  { value: "nova", label: "Nova (Young Female)" },
  { value: "shimmer", label: "Shimmer (Soft Female)" },
];

const LANGUAGE_OPTIONS = [
  { value: "en-US", label: "English (US)" },
  { value: "en-GB", label: "English (UK)" },
  { value: "es-ES", label: "Spanish" },
  { value: "fr-FR", label: "French" },
  { value: "de-DE", label: "German" },
  { value: "it-IT", label: "Italian" },
  { value: "pt-BR", label: "Portuguese (Brazil)" },
  { value: "ja-JP", label: "Japanese" },
  { value: "ko-KR", label: "Korean" },
  { value: "zh-CN", label: "Chinese (Simplified)" },
];

export function TTSControls({ onGenerate, disabled, isGenerating }: TTSControlsProps) {
  const [voice, setVoice] = useState("alloy");
  const [language, setLanguage] = useState("en-US");

  const handleGenerate = () => {
    onGenerate(voice, language);
  };

  return (
    <div className="space-y-4 p-4 border border-border rounded-lg bg-card/50">
      <div className="flex items-center gap-2 mb-3">
        <Volume2 className="h-4 w-4 text-primary" />
        <Label className="text-sm font-medium">Text-to-Speech Settings</Label>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="voice-select" className="text-xs text-muted-foreground">
            Voice
          </Label>
          <Select value={voice} onValueChange={setVoice} disabled={disabled}>
            <SelectTrigger id="voice-select">
              <SelectValue placeholder="Select voice" />
            </SelectTrigger>
            <SelectContent>
              {VOICE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="language-select" className="text-xs text-muted-foreground">
            Language
          </Label>
          <Select value={language} onValueChange={setLanguage} disabled={disabled}>
            <SelectTrigger id="language-select">
              <SelectValue placeholder="Select language" />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <Button
        onClick={handleGenerate}
        disabled={disabled || isGenerating}
        className="w-full"
        variant="outline"
      >
        {isGenerating ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Generating Audio...
          </>
        ) : (
          <>
            <Volume2 className="h-4 w-4 mr-2" />
            Generate Audio from Script
          </>
        )}
      </Button>
    </div>
  );
}