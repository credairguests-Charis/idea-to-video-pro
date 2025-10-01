import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface ActorTTSConfig {
  voice: string;
  accent: string;
  language: string;
  tone: string;
}

interface ActorTTSSettingsProps {
  actorId: string;
  config: ActorTTSConfig;
  onConfigChange: (actorId: string, config: ActorTTSConfig) => void;
  disabled?: boolean;
}

const VOICE_OPTIONS = [
  { value: "alloy", label: "Alloy (Neutral)" },
  { value: "echo", label: "Echo (Male)" },
  { value: "fable", label: "Fable (British)" },
  { value: "onyx", label: "Onyx (Deep)" },
  { value: "nova", label: "Nova (Young Female)" },
  { value: "shimmer", label: "Shimmer (Soft Female)" },
];

const ACCENT_OPTIONS = [
  { value: "neutral", label: "Neutral" },
  { value: "american", label: "American" },
  { value: "british", label: "British" },
  { value: "australian", label: "Australian" },
  { value: "indian", label: "Indian" },
];

const LANGUAGE_OPTIONS = [
  { value: "en-US", label: "English (US)" },
  { value: "en-GB", label: "English (UK)" },
  { value: "es-ES", label: "Spanish" },
  { value: "fr-FR", label: "French" },
  { value: "de-DE", label: "German" },
  { value: "it-IT", label: "Italian" },
];

const TONE_OPTIONS = [
  { value: "professional", label: "Professional" },
  { value: "friendly", label: "Friendly" },
  { value: "excited", label: "Excited" },
  { value: "calm", label: "Calm" },
];

export function ActorTTSSettings({ actorId, config, onConfigChange, disabled }: ActorTTSSettingsProps) {
  const updateConfig = (key: keyof ActorTTSConfig, value: string) => {
    onConfigChange(actorId, { ...config, [key]: value });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 p-0"
          disabled={disabled}
        >
          <Settings className="h-3.5 w-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>TTS Settings</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        <div className="p-2 space-y-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium">Voice</label>
            <Select
              value={config.voice}
              onValueChange={(value) => updateConfig("voice", value)}
              disabled={disabled}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VOICE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value} className="text-xs">
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium">Accent</label>
            <Select
              value={config.accent}
              onValueChange={(value) => updateConfig("accent", value)}
              disabled={disabled}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ACCENT_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value} className="text-xs">
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium">Language</label>
            <Select
              value={config.language}
              onValueChange={(value) => updateConfig("language", value)}
              disabled={disabled}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value} className="text-xs">
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium">Tone</label>
            <Select
              value={config.tone}
              onValueChange={(value) => updateConfig("tone", value)}
              disabled={disabled}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TONE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value} className="text-xs">
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
