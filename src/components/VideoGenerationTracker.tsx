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
    let isSubscribed = true;

    // Initialize tracker - fetch user ID once and load pending generations
    const initializeTracker = async () => {
      try {
        const { data: user } = await supabase.auth.getUser();
        if (!user.user || !isSubscribed) return;

        currentUserId = user.user.id;
        console.log('📹 VideoGenerationTracker initialized for user:', currentUserId);

        // Fetch initial pending generations
        const { data, error } = await supabase
          .from('video_generations')
          .select('*')
          .eq('user_id', currentUserId)
          .in('status', ['waiting', 'processing'])
          .order('created_at', { ascending: false });

        if (error) {
          console.error('📹 Error fetching initial generations:', error);
          return;
        }

        if (data && isSubscribed) {
          console.log('📹 Initial pending generations:', data.length);
          setActiveGenerations(data);
        }
      } catch (error) {
        console.error('📹 Error initializing tracker:', error);
      }
    };

    initializeTracker();

    // Subscribe to realtime changes
    const channel = supabase
      .channel('video-generation-changes', {
        config: {
          broadcast: { self: true },
        },
      })
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'video_generations'
        },
        (payload) => {
          if (!isSubscribed) return;
          
          const newRecord = payload.new as VideoGeneration;
          const oldRecord = payload.old as VideoGeneration;
          
          // Only handle records for current user
          if (!currentUserId) return;
          if (newRecord && newRecord.user_id !== currentUserId) return;
          if (oldRecord && oldRecord.user_id !== currentUserId) return;

          console.log('📹 Real-time event:', payload.eventType, newRecord?.id || oldRecord?.id, newRecord?.status);

          if (payload.eventType === 'INSERT') {
            if (newRecord.status === 'waiting' || newRecord.status === 'processing') {
              console.log('📹 Adding to active generations:', newRecord.id);
              setActiveGenerations(prev => {
                // Avoid duplicates
                if (prev.some(g => g.id === newRecord.id)) return prev;
                return [newRecord, ...prev];
              });
              
              toast({
                title: "Generation Started",
                description: "Your video is being generated. Check the Video Library for updates.",
              });
            }
          } else if (payload.eventType === 'UPDATE') {
            // Update active generation status
            if (newRecord.status === 'waiting' || newRecord.status === 'processing') {
              console.log('📹 Updating active generation:', newRecord.id, newRecord.status);
              setActiveGenerations(prev => {
                const exists = prev.some(g => g.id === newRecord.id);
                if (exists) {
                  return prev.map(g => g.id === newRecord.id ? newRecord : g);
                }
                // Add if not exists (in case we missed the INSERT)
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
          } else if (payload.eventType === 'DELETE' && oldRecord) {
            console.log('📹 Removing deleted generation:', oldRecord.id);
            setActiveGenerations(prev => 
              prev.filter(gen => gen.id !== oldRecord.id)
            );
          }
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log('📹 Realtime subscription active');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('📹 Realtime subscription error:', err);
        } else if (status === 'TIMED_OUT') {
          console.error('📹 Realtime subscription timed out');
        } else if (status === 'CLOSED') {
          console.log('📹 Realtime subscription closed');
        }
      });

    return () => {
      isSubscribed = false;
      console.log('📹 Cleaning up VideoGenerationTracker');
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
