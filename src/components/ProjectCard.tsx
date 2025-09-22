import { Project } from "@/hooks/useProjects";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { VideoPlayer } from "@/components/VideoPlayer";
import { MoreVertical, Play, Edit, Trash2, Download } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";
import { formatDistanceToNow } from "date-fns";
import { useState } from "react";

interface ProjectCardProps {
  project: Project;
  onDelete: (projectId: string) => void;
}

export function ProjectCard({ project, onDelete }: ProjectCardProps) {
  const [isVideoDialogOpen, setIsVideoDialogOpen] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500'
      case 'processing': return 'bg-yellow-500'
      case 'generating': return 'bg-blue-500'
      case 'failed': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  };

  const getGenerationStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500'
      case 'generating': return 'bg-blue-500'
      case 'pending': return 'bg-yellow-500'
      case 'failed': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  };

  const hasGeneratedVideos = project.omnihuman_video_urls && project.omnihuman_video_urls.length > 0;
  const mainVideoUrl = hasGeneratedVideos ? project.omnihuman_video_urls[0] : null;

  const handleDownload = async (videoUrl: string) => {
    try {
      const response = await fetch(videoUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `${project.title}.mp4`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  return (
    <Card className="overflow-hidden hover:shadow-xl transition-all hover:scale-105 border-0 bg-card/50">
      {/* Portrait Thumbnail/Video */}
      <div className="aspect-[9/16] bg-gradient-to-b from-muted/50 to-muted relative overflow-hidden">
        {hasGeneratedVideos ? (
          <Dialog open={isVideoDialogOpen} onOpenChange={setIsVideoDialogOpen}>
            <DialogTrigger asChild>
              <div className="relative w-full h-full cursor-pointer group">
                <video
                  src={mainVideoUrl}
                  poster={project.thumbnail_url}
                  className="w-full h-full object-cover"
                  muted
                />
                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                  <div className="bg-white/90 rounded-full p-3 group-hover:scale-110 transition-transform">
                    <Play className="h-6 w-6 text-black ml-1" />
                  </div>
                </div>
              </div>
            </DialogTrigger>
            <DialogContent className="max-w-md p-0 bg-transparent border-0">
              <VideoPlayer
                src={mainVideoUrl}
                poster={project.thumbnail_url}
                className="aspect-[9/16] max-h-[80vh]"
              />
            </DialogContent>
          </Dialog>
        ) : project.thumbnail_url ? (
          <img 
            src={project.thumbnail_url} 
            alt={project.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/30">
            <Play className="h-16 w-16 text-primary/60" />
          </div>
        )}
        
        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        
        {/* Status indicators */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          <Badge variant="secondary" className="text-xs bg-background/80 backdrop-blur-sm">
            <div className={`w-2 h-2 rounded-full mr-1 ${getStatusColor(project.status)}`} />
            {project.status}
          </Badge>
          
          {project.generation_status && (
            <Badge variant="secondary" className="text-xs bg-background/80 backdrop-blur-sm">
              <div className={`w-2 h-2 rounded-full mr-1 ${getGenerationStatusColor(project.generation_status)}`} />
              {project.generation_status}
              {project.generation_progress !== null && project.generation_progress !== undefined && (
                <span className="ml-1">({project.generation_progress}%)</span>
              )}
            </Badge>
          )}
        </div>
        
        {/* Menu button */}
        <div className="absolute top-2 right-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 bg-background/80 backdrop-blur-sm hover:bg-background/90">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
              {mainVideoUrl && (
                <DropdownMenuItem onClick={() => handleDownload(mainVideoUrl)}>
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </DropdownMenuItem>
              )}
              <DropdownMenuItem 
                className="text-destructive"
                onClick={() => onDelete(project.id)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        {/* Video count indicator */}
        {hasGeneratedVideos && project.omnihuman_video_urls.length > 1 && (
          <div className="absolute bottom-2 right-2">
            <Badge variant="secondary" className="text-xs bg-background/80 backdrop-blur-sm">
              {project.omnihuman_video_urls.length} videos
            </Badge>
          </div>
        )}
        
        {/* Bottom overlay with project info */}
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <h3 className="font-semibold text-white text-sm mb-1 truncate">
            {project.title}
          </h3>
          <div className="flex items-center gap-2 mb-1">
            {project.selected_actors && project.selected_actors.length > 0 && (
              <Badge variant="outline" className="text-xs bg-white/20 border-white/30 text-white">
                {project.selected_actors.length} actor{project.selected_actors.length !== 1 ? 's' : ''}
              </Badge>
            )}
            {project.audio_source && (
              <Badge variant="outline" className="text-xs bg-white/20 border-white/30 text-white">
                {project.audio_source === 'tts' ? 'TTS' : 'Upload'}
              </Badge>
            )}
          </div>
          <p className="text-xs text-white/80">
            Updated {formatDistanceToNow(new Date(project.updated_at))} ago
          </p>
        </div>
      </div>
    </Card>
  );
}