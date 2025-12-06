import { useState } from "react";
import { Play, ExternalLink, X, Download, Video as VideoIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { VideoPlayer } from "@/components/VideoPlayer";
import { cn } from "@/lib/utils";

interface VideoItem {
  url: string;
  thumbnailUrl?: string;
  title?: string;
  advertiser?: string;
  duration?: string;
  sourceUrl?: string;
}

interface VideoGalleryProps {
  videos: VideoItem[];
  title?: string;
  emptyMessage?: string;
  className?: string;
}

export function VideoGallery({ 
  videos, 
  title = "Downloaded Videos", 
  emptyMessage = "No videos available",
  className 
}: VideoGalleryProps) {
  const [selectedVideo, setSelectedVideo] = useState<VideoItem | null>(null);

  if (!videos || videos.length === 0) {
    return (
      <div className={cn("text-center py-8", className)}>
        <div className="w-12 h-12 mx-auto mb-3 rounded-lg bg-muted/50 flex items-center justify-center">
          <VideoIcon className="h-6 w-6 text-muted-foreground/50" />
        </div>
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      {title && (
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-foreground">{title}</h3>
          <Badge variant="secondary" className="text-xs">
            {videos.length} video{videos.length !== 1 ? "s" : ""}
          </Badge>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {videos.map((video, index) => (
          <div 
            key={index}
            className="group relative aspect-video bg-muted rounded-lg overflow-hidden cursor-pointer border border-border/30 hover:border-primary/50 transition-colors"
            onClick={() => setSelectedVideo(video)}
          >
            {/* Thumbnail or Video Preview */}
            {video.thumbnailUrl ? (
              <img 
                src={video.thumbnailUrl} 
                alt={video.title || `Video ${index + 1}`}
                className="w-full h-full object-cover"
              />
            ) : (
              <video 
                src={video.url} 
                className="w-full h-full object-cover"
                muted
                preload="metadata"
              />
            )}

            {/* Overlay */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
              <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                  <Play className="h-5 w-5 text-foreground ml-0.5" />
                </div>
              </div>
            </div>

            {/* Duration Badge */}
            {video.duration && (
              <div className="absolute bottom-2 right-2 bg-black/70 text-white text-[10px] px-1.5 py-0.5 rounded">
                {video.duration}
              </div>
            )}

            {/* Advertiser Badge */}
            {video.advertiser && (
              <div className="absolute top-2 left-2 bg-black/70 text-white text-[10px] px-1.5 py-0.5 rounded truncate max-w-[80%]">
                {video.advertiser}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Video Modal */}
      <Dialog open={!!selectedVideo} onOpenChange={() => setSelectedVideo(null)}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden">
          <DialogTitle className="sr-only">
            {selectedVideo?.title || "Video Preview"}
          </DialogTitle>
          {selectedVideo && (
            <div className="relative">
              {/* Close Button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelectedVideo(null)}
                className="absolute top-3 right-3 z-10 bg-black/50 hover:bg-black/70 text-white h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>

              {/* Video Player */}
              <VideoPlayer 
                src={selectedVideo.url} 
                className="w-full aspect-video"
                autoPlay
              />

              {/* Video Info */}
              <div className="p-4 bg-background border-t border-border/30">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-medium text-foreground">
                      {selectedVideo.title || "Competitor Ad"}
                    </h3>
                    {selectedVideo.advertiser && (
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {selectedVideo.advertiser}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {selectedVideo.sourceUrl && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(selectedVideo.sourceUrl, "_blank")}
                      >
                        <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                        Source
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(selectedVideo.url, "_blank")}
                    >
                      <Download className="h-3.5 w-3.5 mr-1.5" />
                      Download
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}