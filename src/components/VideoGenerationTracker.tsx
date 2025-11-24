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
  const [batchTotal, setBatchTotal] = useState(0);
  const [batchCompleted, setBatchCompleted] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    let currentUserId: string | null = null;
    let isSubscribed = true;
    let pollInterval: NodeJS.Timeout | null = null;

    // Initialize tracker - fetch user ID once and load pending generations
    const initializeTracker = async () => {
      try {
        const { data: user } = await supabase.auth.getUser();
        if (!user.user || !isSubscribed) return;

        currentUserId = user.user.id;
        console.log('📹 VideoGenerationTracker initialized for user:', currentUserId);

        // Fetch initial pending generations
        await loadPendingGenerations(currentUserId);

        // Poll for new generations every 2 seconds to catch any that might be missed
        pollInterval = setInterval(() => {
          if (isSubscribed && currentUserId) {
            loadPendingGenerations(currentUserId);
          }
        }, 2000);
      } catch (error) {
        console.error('📹 Error initializing tracker:', error);
      }
    };

    const loadPendingGenerations = async (userId: string) => {
      try {
        const { data, error } = await supabase
          .from('video_generations')
          .select('*')
          .eq('user_id', userId)
          .in('status', ['waiting', 'processing'])
          .order('created_at', { ascending: false });

        if (error) {
          console.error('📹 Error fetching pending generations:', error);
          return;
        }

        if (data && isSubscribed) {
          console.log('📹 Pending generations:', data.length);
          
          // Set batch total if we found pending generations
          if (data.length > 0) {
            setBatchTotal(data.length);
            setBatchCompleted(0);
            setIsVisible(true);
          }
          
          setActiveGenerations(prev => {
            // Merge with existing, avoiding duplicates
            const newIds = data.map(d => d.id);
            const existingToKeep = prev.filter(p => !newIds.includes(p.id));
            return [...data, ...existingToKeep];
          });
        }
      } catch (error) {
        console.error('📹 Error loading pending generations:', error);
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
              
              // Reset counters if starting a fresh batch (previous batch was completed)
              setBatchTotal(prev => {
                setBatchCompleted(current => {
                  // If previous batch was complete, reset both counters
                  if (prev > 0 && prev === current) {
                    console.log('📹 Resetting batch counters for new generation');
                    return 0;
                  }
                  return current;
                });
                // If resetting, start at 1, otherwise increment
                return (prev > 0 && prev === batchCompleted) ? 1 : prev + 1;
              });
              
              setActiveGenerations(prev => {
                // Avoid duplicates
                if (prev.some(g => g.id === newRecord.id)) return prev;
                return [newRecord, ...prev];
              });
              
              setIsVisible(true);
              
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
              // Increment completed count
              setBatchCompleted(prev => {
                const newCompleted = prev + 1;
                console.log('📹 Video completed:', newCompleted, 'of', batchTotal);
                return newCompleted;
              });
              
              toast({
                title: "✨ Video Ready!",
                description: "Your video has been generated successfully. Check the Video Library!",
              });
            } else if (newRecord.status === 'fail') {
              // Increment completed count for failed ones too
              setBatchCompleted(prev => {
                const newCompleted = prev + 1;
                console.log('📹 Video failed:', newCompleted, 'of', batchTotal);
                return newCompleted;
              });
              
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
      if (pollInterval) clearInterval(pollInterval);
      console.log('📹 Cleaning up VideoGenerationTracker');
      supabase.removeChannel(channel);
    };
  }, [toast]);

  // Auto-hide card when all generations complete
  useEffect(() => {
    if (batchTotal > 0 && batchCompleted >= batchTotal && activeGenerations.length === 0) {
      console.log('📹 All generations complete (', batchCompleted, '/', batchTotal, '), hiding card in 1.5s');
      // Show 100% completion for 1.5 seconds before hiding
      const hideTimer = setTimeout(() => {
        console.log('📹 Fading out status card');
        setIsVisible(false);
        // Reset counters after fade-out animation completes
        const resetTimer = setTimeout(() => {
          console.log('📹 Resetting batch counters');
          setBatchTotal(0);
          setBatchCompleted(0);
        }, 500);
        return () => clearTimeout(resetTimer);
      }, 1500);
      return () => clearTimeout(hideTimer);
    }
  }, [activeGenerations.length, batchTotal, batchCompleted]);

  // Calculate overall progress
  const overallProgress = batchTotal > 0 ? Math.round((batchCompleted / batchTotal) * 100) : 0;

  return (
    <>
      {/* Active Generation Progress */}
      {isVisible && batchTotal > 0 && (
        <div className="fixed bottom-20 right-6 z-50 w-80 bg-card rounded-lg shadow-lg border p-4 space-y-3 animate-in slide-in-from-bottom-4 duration-300 transition-opacity"
             style={{ opacity: activeGenerations.length > 0 || batchCompleted < batchTotal ? 1 : 1 }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {batchCompleted >= batchTotal && batchTotal > 0 ? (
                <span className="text-green-500 font-medium">✓</span>
              ) : (
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
              )}
              <span className="font-medium text-sm">
                {batchCompleted >= batchTotal && batchTotal > 0 
                  ? 'Generation Complete!' 
                  : `Generating ${batchTotal > 1 ? `${batchTotal} videos` : 'video'}`
                }
              </span>
            </div>
            <span className="text-xs text-muted-foreground font-semibold">
              {overallProgress}%
            </span>
          </div>

          {/* Overall batch progress */}
          <div className="space-y-1">
            <Progress value={overallProgress} className="h-2" />
            <p className="text-xs text-muted-foreground text-center">
              {batchCompleted} of {batchTotal} completed
            </p>
          </div>
          
          <div className="max-h-[300px] overflow-y-auto space-y-3 pr-1">
            {activeGenerations.map((gen) => {
              const individualProgress = gen.status === 'processing' ? 66 : 33;
              return (
                <div key={gen.id} className="space-y-2 p-2 bg-muted/30 rounded-md">
                  <p className="text-xs text-foreground truncate font-medium">{gen.prompt}</p>
                  <Progress value={individualProgress} className="h-1.5" />
                  <p className="text-xs text-muted-foreground">
                    {gen.status === 'processing' ? 'Processing video...' : 'Initializing generation...'}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
