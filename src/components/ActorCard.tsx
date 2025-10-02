import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ActorTTSSettings, ActorTTSConfig } from "./ActorTTSSettings";

interface Actor {
  id: string;
  name: string;
  thumbnail_url: string;
}

interface ActorCardProps {
  actor: Actor;
  onRemove?: () => void;
  className?: string;
  showRemove?: boolean;
  showSettings?: boolean;
  ttsConfig?: ActorTTSConfig;
  onTTSConfigChange?: (actorId: string, config: ActorTTSConfig) => void;
  disabled?: boolean;
}

export function ActorCard({ 
  actor, 
  onRemove, 
  className, 
  showRemove = true,
  showSettings = false,
  ttsConfig,
  onTTSConfigChange,
  disabled = false
}: ActorCardProps) {
  // Extract first name only
  const firstName = actor.name.split(' ')[0];

  return (
    <div className={cn(
      "flex items-center gap-3 bg-card border border-border rounded-lg p-2",
      className
    )}>
      {/* Portrait avatar - 9:16 aspect ratio */}
      <div className="w-[48px] h-[64px] rounded overflow-hidden flex-shrink-0">
        <img 
          src={actor.thumbnail_url} 
          alt={actor.name}
          className="w-full h-full object-cover"
        />
      </div>
      
      {/* First name only */}
      <span className="text-sm font-medium text-foreground">
        {firstName}
      </span>
      
      {/* Separator bar */}
      <div className="w-[1px] h-4 bg-[#E9E9EA] flex-shrink-0" />
      
      {/* Duration */}
      <span className="text-xs text-muted-foreground">
        0:00
      </span>
      
      {showSettings && ttsConfig && onTTSConfigChange && (
        <ActorTTSSettings
          actorId={actor.id}
          config={ttsConfig}
          onConfigChange={onTTSConfigChange}
          disabled={disabled}
        />
      )}
      {showRemove && onRemove && (
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
          onClick={onRemove}
          disabled={disabled}
        >
          <X className="w-3 h-3" />
        </Button>
      )}
    </div>
  );
}