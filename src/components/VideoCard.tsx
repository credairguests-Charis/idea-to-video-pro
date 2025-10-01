import { Play, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface VideoCardProps {
  id: string;
  title: string;
  thumbnail: string;
  videoUrl?: string;
  duration?: string;
  status: 'completed' | 'processing' | 'failed';
  onClick?: () => void;
  className?: string;
}

export function VideoCard({ 
  title, 
  thumbnail, 
  duration,
  status,
  onClick,
  className 
}: VideoCardProps) {
  return (
    <div 
      className={cn(
        "group relative bg-card rounded-2xl overflow-hidden border border-border cursor-pointer",
        "shadow-[0_6px_20px_rgba(12,12,12,0.05)] hover:shadow-[0_8px_24px_rgba(12,12,12,0.08)]",
        "transition-all duration-200",
        className
      )}
      onClick={onClick}
    >
      {/* 9:16 aspect ratio container */}
      <div className="relative w-full" style={{ paddingBottom: "177.78%" }}>
        <div className="absolute inset-0">
          <img 
            src={thumbnail} 
            alt={title}
            className="w-full h-full object-cover"
          />
          
          {/* Overlay on hover */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200" />
          
          {/* Play button overlay */}
          {status === 'completed' && (
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <div className="bg-white/90 backdrop-blur-sm rounded-full p-4">
                <Play className="w-8 h-8 text-foreground fill-foreground" />
              </div>
            </div>
          )}
          
          {/* Processing overlay */}
          {status === 'processing' && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2" />
                <p className="text-white text-sm font-medium">Processing...</p>
              </div>
            </div>
          )}
          
          {/* Duration badge */}
          {duration && status === 'completed' && (
            <div className="absolute bottom-3 right-3 bg-black/70 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-md font-medium">
              {duration}
            </div>
          )}
        </div>
      </div>
      
      {/* Title bar */}
      <div className="p-3 flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground truncate flex-1">
          {title}
        </h3>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
          onClick={(e) => {
            e.stopPropagation();
            // Handle menu
          }}
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
