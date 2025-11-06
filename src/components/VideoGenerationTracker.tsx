import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface VideoGeneration {
  id: string;
  task_id: string;
  status: string;
  result_url: string | null;
  prompt: string;
  user_id: string;
  created_at: string;
  completed_at: string | null;
  fail_msg: string | null;
}

export function VideoGenerationTracker() {
  const [activeGenerations, setActiveGenerations] = useState<VideoGeneration[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    let currentUserId: string | null = null;

    // Initialize tracker - fetch user ID once and load pending generations
    const initializeTracker = async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      currentUserId = user.user.id;
      console.log('📹 VideoGenerationTracker initialized for user:', currentUserId);

      // Fetch initial pending generations
      const { data, error } = await supabase
        .from('video_generations')
        .select('*')
        .eq('user_id', currentUserId)
        .in('status', ['waiting', 'processing'])
        .order('created_at', { ascending: false });

      if (!error && data) {
        console.log('📹 Initial pending generations:', data.length);
        setActiveGenerations(data);
      }
    };

    initializeTracker();

    // Subscribe to realtime changes (synchronous handler for instant updates)
    const channel = supabase
      .channel('video-generation-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'video_generations'
        },
        (payload) => {
          const newRecord = payload.new as VideoGeneration;
          
          // Only handle records for current user (instant check with cached ID)
          if (!currentUserId || newRecord.user_id !== currentUserId) return;

          console.log('📹 Real-time event:', payload.eventType, newRecord.id, newRecord.status);

          if (payload.eventType === 'INSERT' && (newRecord.status === 'waiting' || newRecord.status === 'processing')) {
            console.log('📹 Adding to active generations:', newRecord.id);
            setActiveGenerations(prev => [newRecord, ...prev]);
            
            toast({
              title: "Generation Started",
              description: "Your video is being generated. Check the Video Library for updates.",
            });
          } else if (payload.eventType === 'UPDATE') {
            // Update active generation status
            if (newRecord.status === 'waiting' || newRecord.status === 'processing') {
              console.log('📹 Updating active generation:', newRecord.id, newRecord.status);
              setActiveGenerations(prev => {
                const exists = prev.some(g => g.id === newRecord.id);
                if (exists) {
                  return prev.map(g => g.id === newRecord.id ? newRecord : g);
                }
                return [newRecord, ...prev];
              });
            } else {
              // Remove from active if completed/failed
              console.log('📹 Removing from active generations:', newRecord.id, newRecord.status);
              setActiveGenerations(prev => 
                prev.filter(gen => gen.id !== newRecord.id)
              );
            }

            if (newRecord.status === 'success' && newRecord.result_url) {
              toast({
                title: "✨ Video Ready!",
                description: "Your video has been generated successfully. Check the Video Library!",
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

  return (
    <>
      {/* Active Generation Progress */}
      {activeGenerations.length > 0 && (
        <div className="fixed bottom-20 right-6 z-50 w-80 bg-card rounded-lg shadow-lg border p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span className="font-medium text-sm">
              Generating {activeGenerations.length} video{activeGenerations.length > 1 ? 's' : ''}
            </span>
          </div>
          
          {activeGenerations.map((gen) => (
            <div key={gen.id} className="space-y-2">
              <p className="text-xs text-muted-foreground truncate">{gen.prompt}</p>
              <Progress value={gen.status === 'processing' ? 66 : 33} className="h-1.5" />
              <p className="text-xs text-muted-foreground">
                {gen.status === 'processing' ? 'Processing video...' : 'Initializing...'}
              </p>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
