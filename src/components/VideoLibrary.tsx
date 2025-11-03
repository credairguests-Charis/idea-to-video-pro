import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { VideoPlayer } from "@/components/VideoPlayer";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Download, Play, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface VideoGeneration {
  id: string;
  task_id: string;
  status: string;
  result_url: string | null;
  prompt: string;
  created_at: string;
  completed_at: string | null;
}

export function VideoLibrary() {
  const [videos, setVideos] = useState<VideoGeneration[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<VideoGeneration | null>(null);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

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

  const handleDownload = async (video: VideoGeneration) => {
    if (!video.result_url) return;

    try {
      const response = await fetch(video.result_url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `video-${video.task_id}.mp4`;
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {videos.map((video) => (
          <Card key={video.id} className="overflow-hidden hover:shadow-lg transition-shadow">
            <div className="relative aspect-video bg-muted">
              {video.result_url && (
                <video
                  src={video.result_url}
                  className="w-full h-full object-cover"
                  preload="metadata"
                />
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <Button
                  size="icon"
                  variant="secondary"
                  onClick={() => handleVideoClick(video)}
                >
                  <Play className="h-5 w-5" />
                </Button>
                <Button
                  size="icon"
                  variant="secondary"
                  onClick={() => handleDownload(video)}
                >
                  <Download className="h-5 w-5" />
                </Button>
              </div>
            </div>
            <div className="p-4">
              <p className="text-sm font-medium line-clamp-2 mb-2">{video.prompt}</p>
              <p className="text-xs text-muted-foreground">
                {video.completed_at && format(new Date(video.completed_at), 'MMM d, yyyy h:mm a')}
              </p>
            </div>
          </Card>
        ))}
      </div>

      {/* Video Preview Modal */}
      <Dialog open={showVideoModal} onOpenChange={setShowVideoModal}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Video Preview</DialogTitle>
          </DialogHeader>
          
          {selectedVideo?.result_url && (
            <div className="space-y-4">
              <VideoPlayer 
                src={selectedVideo.result_url}
                className="w-full rounded-lg"
              />
              
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setShowVideoModal(false)}
                >
                  Close
                </Button>
                <Button
                  onClick={() => handleDownload(selectedVideo)}
                  className="gap-2"
                >
                  <Download className="h-4 w-4" />
                  Download Video
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
