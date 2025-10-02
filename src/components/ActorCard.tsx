import { Settings, X } from "lucide-react";
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
      "inline-flex items-center gap-3 bg-white border border-gray-100 rounded-xl p-3 shadow-sm",
      className
    )}>
      {/* Square avatar - 48x48 */}
      <div className="w-12 h-12 rounded-md overflow-hidden flex-shrink-0">
        <img 
          src={actor.thumbnail_url} 
          alt={actor.name}
          className="w-full h-full object-cover"
        />
      </div>
      
      {/* First name only */}
      <span className="text-sm font-medium text-gray-800 whitespace-nowrap">
        {firstName}
      </span>
      
      {/* Progress bar - takes flexible space */}
      <div className="flex-1 h-2 bg-gray-200 rounded-full mx-3 min-w-[80px]">
        <div className="h-2 rounded-full bg-gray-300" style={{ width: '0%' }} />
      </div>
      
      {/* Duration */}
      <span className="text-xs text-gray-500 whitespace-nowrap">
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
          className="h-8 w-8 p-0 text-gray-400 hover:text-gray-600 flex-shrink-0"
          onClick={onRemove}
          disabled={disabled}
          aria-label="Remove actor"
        >
          <X className="w-4 h-4" />
        </Button>
      )}
    </div>
  );
}