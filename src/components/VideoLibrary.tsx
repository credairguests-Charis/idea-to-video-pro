import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { VideoPlayer } from "@/components/VideoPlayer";
import { RegenerateVideoDialog } from "@/components/RegenerateVideoDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Download, Play, Loader2, MoreVertical, Edit2, RotateCcw, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface VideoGeneration {
  id: string;
  task_id: string;
  status: string;
  result_url: string | null;
  prompt: string;
  title: string | null;
  aspect_ratio: string;
  thumbnail_url: string | null;
  created_at: string;
  completed_at: string | null;
  image_url: string | null;
  n_frames: string;
  remove_watermark: boolean | null;
}

export function VideoLibrary() {
  const [videos, setVideos] = useState<VideoGeneration[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<VideoGeneration | null>(null);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [regenerateVideo, setRegenerateVideo] = useState<VideoGeneration | null>(null);
  const [showRegenerateDialog, setShowRegenerateDialog] = useState(false);
  const { toast } = useToast();
  const videoRefs = useRef<{ [key: string]: HTMLVideoElement }>({});

  useEffect(() => {
    fetchVideos();
  }, []);

  const fetchVideos = async () => {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return;

    const { data, error } = await supabase
      .from('video_generations')
      .select('*')
      .eq('user_id', user.user.id)
      .eq('status', 'success')
      .not('result_url', 'is', null)
      .order('completed_at', { ascending: false });

    if (!error && data) {
      setVideos(data);
    }
    setLoading(false);
  };

  const handleVideoClick = (video: VideoGeneration) => {
    setSelectedVideo(video);
    setShowVideoModal(true);
  };

  const generateThumbnail = async (videoUrl: string, videoId: string) => {
    return new Promise<string>((resolve) => {
      const video = document.createElement('video');
      video.crossOrigin = 'anonymous';
      video.src = videoUrl;
      video.currentTime = 1; // Capture frame at 1 second
      
      video.onloadeddata = () => {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(video, 0, 0);
        const thumbnailUrl = canvas.toDataURL('image/jpeg', 0.8);
        resolve(thumbnailUrl);
      };
      
      video.onerror = () => resolve(videoUrl);
    });
  };

  const handleDownload = async (video: VideoGeneration) => {
    if (!video.result_url) return;

    try {
      const response = await fetch(video.result_url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${video.title || video.prompt || 'video'}-${video.task_id}.mp4`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Downloaded",
        description: "Video downloaded successfully",
      });
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "Failed to download video. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleRename = async (videoId: string, newTitle: string) => {
    try {
      const { error } = await supabase
        .from('video_generations')
        .update({ title: newTitle })
        .eq('id', videoId);

      if (error) throw error;

      setVideos(videos.map(v => v.id === videoId ? { ...v, title: newTitle } : v));
      setEditingId(null);
      
      toast({
        title: "Renamed",
        description: "Video renamed successfully",
      });
    } catch (error) {
      toast({
        title: "Rename Failed",
        description: "Failed to rename video. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleRegenerate = (video: VideoGeneration) => {
    setRegenerateVideo(video);
    setShowRegenerateDialog(true);
  };

  const handleDelete = async (videoId: string) => {
    try {
      const { error } = await supabase
        .from('video_generations')
        .delete()
        .eq('id', videoId);

      if (error) throw error;

      setVideos(videos.filter(v => v.id !== videoId));
      
      toast({
        title: "Deleted",
        description: "Video deleted successfully",
      });
    } catch (error) {
      toast({
        title: "Delete Failed",
        description: "Failed to delete video. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No generated videos yet</p>
      </div>
    );
  }

  return (
    <>
      <RegenerateVideoDialog
        video={regenerateVideo}
        open={showRegenerateDialog}
        onOpenChange={setShowRegenerateDialog}
        onSuccess={fetchVideos}
      />
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {videos.map((video) => {
          const isPortrait = !video.aspect_ratio || video.aspect_ratio === 'portrait' || video.aspect_ratio === '9:16';
          
          return (
            <Card key={video.id} className="overflow-hidden hover:shadow-lg transition-shadow group">
              <div className={`relative bg-muted ${isPortrait ? 'aspect-[9/16]' : 'aspect-video'}`}>
                {video.result_url && (
                  <video
                    ref={(el) => { if (el) videoRefs.current[video.id] = el; }}
                    src={video.result_url}
                    className="w-full h-full object-cover"
                    preload="metadata"
                    muted
                    playsInline
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                  <Button
                    size="icon"
                    variant="secondary"
                    onClick={() => handleVideoClick(video)}
                    className="bg-white/90 hover:bg-white"
                  >
                    <Play className="h-5 w-5 text-primary" />
                  </Button>
                </div>
                
                {/* Dropdown Menu */}
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="icon" variant="secondary" className="h-8 w-8 bg-black/60 hover:bg-black/80">
                        <MoreVertical className="h-4 w-4 text-white" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => {
                        setEditingId(video.id);
                        setEditTitle(video.title || video.prompt);
                      }}>
                        <Edit2 className="mr-2 h-4 w-4" />
                        Rename
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleRegenerate(video)}>
                        <RotateCcw className="mr-2 h-4 w-4" />
                        Regenerate
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handleDelete(video.id)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
              
              <div className="p-3 space-y-2">
                {editingId === video.id ? (
                  <div className="flex gap-2">
                    <Input
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleRename(video.id, editTitle);
                        if (e.key === 'Escape') setEditingId(null);
                      }}
                      className="h-8 text-sm"
                      autoFocus
                    />
                    <Button 
                      size="sm" 
                      onClick={() => handleRename(video.id, editTitle)}
                      className="h-8 px-3"
                    >
                      Save
                    </Button>
                  </div>
                ) : (
                  <p 
                    className="text-sm font-medium line-clamp-2 cursor-pointer hover:text-primary"
                    onClick={() => {
                      setEditingId(video.id);
                      setEditTitle(video.title || video.prompt);
                    }}
                  >
                    {video.title || video.prompt}
                  </p>
                )}
                
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs text-muted-foreground">
                    {video.completed_at && format(new Date(video.completed_at), 'MMM d, yyyy')}
                  </p>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleDownload(video)}
                    className="h-7 w-7"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Video Preview Modal */}
      <Dialog open={showVideoModal} onOpenChange={setShowVideoModal}>
        <DialogContent className="max-w-6xl p-0 gap-0 bg-black border-0">
          {selectedVideo?.result_url && (
            <div className="flex flex-col lg:flex-row h-[80vh]">
              {/* Video Section - Left */}
              <div className="flex-1 flex items-center justify-center bg-black p-4">
                <div className={selectedVideo.aspect_ratio === 'portrait' || selectedVideo.aspect_ratio === '9:16' ? 'w-full max-w-md' : 'w-full'}>
                  <VideoPlayer 
                    src={selectedVideo.result_url}
                    className="w-full h-full rounded-lg"
                  />
                </div>
              </div>
              
              {/* Details & Actions Panel - Right */}
              <div className="w-full lg:w-80 bg-background/95 backdrop-blur-sm p-6 space-y-6 overflow-y-auto">
                <div className="space-y-4">
                  {/* Title */}
                  <div>
                    <h3 className="font-semibold text-lg line-clamp-2">
                      {selectedVideo.title || selectedVideo.prompt}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      {selectedVideo.completed_at && format(new Date(selectedVideo.completed_at), 'MMM d, yyyy h:mm a')}
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="space-y-2">
                    <Button
                      variant="outline"
                      className="w-full justify-start gap-2"
                      onClick={() => handleRegenerate(selectedVideo)}
                    >
                      <RotateCcw className="h-4 w-4" />
                      Remix
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full justify-start gap-2"
                      onClick={() => handleDownload(selectedVideo)}
                    >
                      <Download className="h-4 w-4" />
                      Download
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full justify-start gap-2 text-destructive hover:text-destructive"
                      onClick={() => {
                        handleDelete(selectedVideo.id);
                        setShowVideoModal(false);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                      Remove
                    </Button>
                  </div>

                  {/* Separator */}
                  <div className="border-t" />

                  {/* Video Details */}
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Model</p>
                      <p className="text-sm">AI Gesture</p>
                    </div>
                    
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Actor</p>
                      <p className="text-sm">Custom Avatar</p>
                    </div>
                    
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Prompt</p>
                      <p className="text-sm text-foreground/80 leading-relaxed">
                        {selectedVideo.prompt}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
