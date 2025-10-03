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
        "group relative bg-white rounded-lg overflow-hidden border border-gray-100 cursor-pointer w-[180px]",
        "shadow-sm hover:shadow-md transition-all duration-200",
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
              <div className="bg-white/90 backdrop-blur-sm rounded-full p-3">
                <Play className="w-6 h-6 text-gray-900 fill-gray-900" />
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
      <div className="p-2 flex items-center justify-between bg-white">
        <h3 className="text-xs font-medium text-gray-800 truncate flex-1">
          {title}
        </h3>
        <Button
          variant="ghost"
          size="sm"
          className="h-5 w-5 p-0 text-gray-400 hover:text-gray-600"
          onClick={(e) => {
            e.stopPropagation();
            // Handle menu
          }}
        >
          <MoreHorizontal className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}
