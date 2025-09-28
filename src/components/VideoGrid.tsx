import { useState } from "react";
import { Play, Download, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface VideoProject {
  id: string;
  title: string;
  thumbnail: string;
  videoUrl?: string;
  duration?: string;
  status: 'completed' | 'processing' | 'failed';
}

interface VideoGridProps {
  projects: VideoProject[];
  onVideoClick?: (project: VideoProject) => void;
}

export function VideoGrid({ projects, onVideoClick }: VideoGridProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-6">
      {projects.map((project) => (
        <Card 
          key={project.id}
          className="group cursor-pointer overflow-hidden"
          onMouseEnter={() => setHoveredId(project.id)}
          onMouseLeave={() => setHoveredId(null)}
          onClick={() => onVideoClick?.(project)}
        >
          <CardContent className="p-0">
            <div className="relative aspect-[9/16] bg-muted">
              <img
                src={project.thumbnail}
                alt={project.title}
                className="w-full h-full object-cover"
              />
              
              {/* Overlay */}
              <div className={cn(
                "absolute inset-0 bg-black/50 flex items-center justify-center transition-opacity",
                hoveredId === project.id ? "opacity-100" : "opacity-0"
              )}>
                <Button size="icon" variant="secondary" className="rounded-full">
                  <Play className="w-4 h-4" />
                </Button>
              </div>

              {/* Status indicator */}
              {project.status === 'processing' && (
                <div className="absolute top-2 left-2 bg-blue-500 text-white text-xs px-2 py-1 rounded">
                  Processing...
                </div>
              )}
              
              {project.status === 'failed' && (
                <div className="absolute top-2 left-2 bg-red-500 text-white text-xs px-2 py-1 rounded">
                  Failed
                </div>
              )}

              {/* Duration */}
              {project.duration && (
                <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                  {project.duration}
                </div>
              )}

              {/* Actions */}
              <div className="absolute top-2 right-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="secondary" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      Remix
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive">
                      Remove
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            
            <div className="p-3">
              <h3 className="font-medium text-sm truncate">{project.title}</h3>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}