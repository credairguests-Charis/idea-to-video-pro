import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { VideoPlayer } from "@/components/VideoPlayer";
import { Download, Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface VideoGeneration {
  id: string;
  task_id: string;
  status: string;
  result_url: string | null;
  prompt: string;
  created_at: string;
  completed_at: string | null;
  fail_msg: string | null;
}

export function VideoGenerationTracker() {
  const [activeGenerations, setActiveGenerations] = useState<VideoGeneration[]>([]);
  const [completedVideo, setCompletedVideo] = useState<VideoGeneration | null>(null);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Fetch initial pending generations
    const fetchPendingGenerations = async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { data, error } = await supabase
        .from('video_generations')
        .select('*')
        .eq('user_id', user.user.id)
        .eq('status', 'waiting')
        .order('created_at', { ascending: false });

      if (!error && data) {
        setActiveGenerations(data);
      }
    };

    fetchPendingGenerations();

    // Subscribe to realtime changes
    const channel = supabase
      .channel('video-generation-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'video_generations'
        },
        async (payload) => {
          const newRecord = payload.new as VideoGeneration;
          const { data: user } = await supabase.auth.getUser();
          
          // Only handle records for current user
          if (!user.user || newRecord.user_id !== user.user.id) return;

          if (payload.eventType === 'INSERT' && newRecord.status === 'waiting') {
            setActiveGenerations(prev => [newRecord, ...prev]);
            
            toast({
              title: "Generation Started",
              description: "Your video is being generated. You'll be notified when ready.",
            });
          } else if (payload.eventType === 'UPDATE') {
            setActiveGenerations(prev => 
              prev.filter(gen => gen.task_id !== newRecord.task_id)
            );

            if (newRecord.status === 'success' && newRecord.result_url) {
              setCompletedVideo(newRecord);
              setShowVideoModal(true);
              
              toast({
                title: "✨ Video Ready!",
                description: "Your video has been generated successfully.",
              });
            } else if (newRecord.status === 'fail') {
              toast({
                title: "Generation Failed",
                description: newRecord.fail_msg || "Failed to generate video. Please try again.",
                variant: "destructive",
              });
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [toast]);

  const handleDownload = async () => {
    if (!completedVideo?.result_url) return;

    try {
      const response = await fetch(completedVideo.result_url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `video-${completedVideo.task_id}.mp4`;
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

  return (
    <>
      {/* Active Generation Progress */}
      {activeGenerations.length > 0 && (
        <div className="fixed bottom-20 right-6 z-50 w-80 bg-white rounded-lg shadow-lg border p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span className="font-medium text-sm">
              Generating {activeGenerations.length} video{activeGenerations.length > 1 ? 's' : ''}
            </span>
          </div>
          
          {activeGenerations.map((gen) => (
            <div key={gen.id} className="space-y-2">
              <p className="text-xs text-gray-600 truncate">{gen.prompt}</p>
              <Progress value={33} className="h-1.5" />
              <p className="text-xs text-gray-500">Processing...</p>
            </div>
          ))}
        </div>
      )}

      {/* Video Preview Modal */}
      <Dialog open={showVideoModal} onOpenChange={setShowVideoModal}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Your Video is Ready! 🎉</DialogTitle>
          </DialogHeader>
          
          {completedVideo?.result_url && (
            <div className="space-y-4">
              <VideoPlayer 
                src={completedVideo.result_url}
                className="w-full rounded-lg"
                autoPlay
              />
              
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setShowVideoModal(false)}
                >
                  Close
                </Button>
                <Button
                  onClick={handleDownload}
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
