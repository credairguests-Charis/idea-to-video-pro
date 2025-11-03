import { useState, useCallback, useEffect } from "react";
import { Users, Video, Download, Trash2, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ActorSelectionModal } from "@/components/ActorSelectionModal";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

interface SelectedActor {
  id: string;
  name: string;
  thumbnail_url: string;
}

interface VideoGeneration {
  id: string;
  prompt: string;
  image_url: string;
  task_id: string;
  status: string;
  result_url: string | null;
  aspect_ratio: string;
  n_frames: string;
  created_at: string;
  completed_at: string | null;
  fail_msg: string | null;
  actor_name?: string;
}

export function NewProjectArcads() {
  const [prompt, setPrompt] = useState("");
  const [selectedActors, setSelectedActors] = useState<SelectedActor[]>([]);
  const [showActorSelector, setShowActorSelector] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [generations, setGenerations] = useState<VideoGeneration[]>([]);
  const [aspectRatio, setAspectRatio] = useState("portrait");
  const [duration, setDuration] = useState("10");
  const [removeWatermark, setRemoveWatermark] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchGenerations();
    setupRealtimeSubscription();
    
    // Poll for status updates every 5 seconds
    const pollInterval = setInterval(async () => {
      const hasPending = generations.some(g => g.status === 'waiting');
      if (hasPending) {
        await supabase.functions.invoke('sora-poll-status');
      }
    }, 5000);

    return () => {
      clearInterval(pollInterval);
    };
  }, [generations]);

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel('video_generations_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'video_generations',
        },
        () => {
          fetchGenerations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const fetchGenerations = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('video_generations')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setGenerations(data || []);
    } catch (error) {
      console.error('Error fetching generations:', error);
    }
  };

  const handleActorSelection = useCallback((actors: SelectedActor[]) => {
    setSelectedActors(actors);
    setShowActorSelector(false);
  }, []);

  const handleRemoveActor = useCallback((actorId: string) => {
    setSelectedActors(prev => prev.filter(actor => actor.id !== actorId));
  }, []);

  const handleGenerate = useCallback(async () => {
    if (selectedActors.length === 0) {
      toast({
        title: "No Actors Selected",
        description: "Please select at least one actor to generate videos",
        variant: "destructive",
      });
      return;
    }

    if (!prompt.trim()) {
      toast({
        title: "Prompt Required",
        description: "Please describe the motion you want for your video",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      // Generate video for each selected actor using Sora 2
      for (const actor of selectedActors) {
        const { data, error } = await supabase.functions.invoke('sora-create-task', {
          body: {
            image_url: actor.thumbnail_url,
            prompt: `${prompt} (featuring ${actor.name})`,
            aspect_ratio: aspectRatio,
            n_frames: duration,
            remove_watermark: removeWatermark,
          },
        });

        if (error) {
          const errorMsg = data?.error || error.message || "Video generation failed";
          throw new Error(`Sora 2 Error for ${actor.name}: ${errorMsg}`);
        }
      }

      toast({
        title: "Videos Generating!",
        description: `${selectedActors.length} video(s) are being generated with Sora 2. Check below for progress.`,
      });

      // Reset form
      setPrompt("");
      setSelectedActors([]);
      
      // Refresh generations list
      fetchGenerations();

    } catch (error) {
      console.error('Video generation error:', error);
      toast({
        title: "Generation Failed",
        description: error instanceof Error ? error.message : "Failed to start video generation",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [prompt, selectedActors, aspectRatio, duration, removeWatermark, toast]);

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('video_generations')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast({
        title: "Video Deleted",
        description: "Generation has been removed",
      });
      fetchGenerations();
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: "Delete Failed",
        description: "Failed to delete generation",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'text-green-600';
      case 'fail': return 'text-red-600';
      default: return 'text-yellow-600';
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-6">
      <div className="text-center mb-8">
        <div className="mb-6 flex justify-center">
          <Users className="h-20 w-20 text-muted-foreground/40" />
        </div>
        <h1 className="text-3xl font-semibold mb-2 text-foreground">
          Generate winning assets with talking actors,
        </h1>
        <p className="text-muted-foreground">reactions and more.</p>
      </div>

        <Card className="w-full max-w-2xl">
          <CardContent className="p-6 space-y-4">
            {/* Talking Actors Dropdown */}
            <Button
              variant="outline"
              onClick={() => setShowActorSelector(true)}
              className="w-full justify-start text-left font-normal h-auto py-3"
            >
              <Users className="h-4 w-4 mr-2 flex-shrink-0" />
              <span className="flex-1">
                {selectedActors.length === 0 
                  ? 'Talking Actors' 
                  : `${selectedActors.length} Actor${selectedActors.length !== 1 ? 's' : ''} Selected`}
              </span>
            </Button>
            
            {selectedActors.length > 0 && (
              <div className="flex flex-wrap gap-2 p-2 bg-muted/50 rounded-lg">
                {selectedActors.map((actor) => (
                  <div key={actor.id} className="relative group">
                    <img
                      src={actor.thumbnail_url}
                      alt={actor.name}
                      className="h-12 w-12 rounded-md object-cover border-2 border-primary"
                    />
                    <button
                      onClick={() => handleRemoveActor(actor.id)}
                      className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full h-4 w-4 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Script Textarea */}
            <div className="space-y-2">
              <Textarea
                placeholder="Write script..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={8}
                maxLength={5000}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground text-right">
                {prompt.length} / 5000
              </p>
            </div>

            {/* Bottom Controls */}
            <div className="flex gap-3 items-center">
              {/* Aspect Ratio Dropdown */}
              <Select value={aspectRatio} onValueChange={setAspectRatio}>
                <SelectTrigger className="w-auto min-w-[160px]">
                  <Video className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Aspect Ratio" />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  <SelectItem value="portrait">9:16 – Portrait</SelectItem>
                  <SelectItem value="landscape">16:9 – Landscape</SelectItem>
                </SelectContent>
              </Select>

              {/* Add Actors Button */}
              <Button
                variant="outline"
                onClick={() => setShowActorSelector(true)}
                className="ml-auto"
              >
                <Users className="h-4 w-4 mr-2" />
                Add actors
              </Button>
            </div>

            {/* Generate Button */}
            <Button
              onClick={handleGenerate}
              disabled={isLoading || selectedActors.length === 0 || !prompt.trim()}
              className="w-full"
              size="lg"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating Videos...
                </>
              ) : (
                <>
                  <Video className="mr-2 h-4 w-4" />
                  Generate {selectedActors.length > 0 ? selectedActors.length : ''} Video{selectedActors.length !== 1 ? 's' : ''}
                </>
              )}
            </Button>
          </CardContent>
        </Card>

      {/* Generation History */}
      {generations.length > 0 && (
        <Card className="w-full max-w-2xl mt-8">
          <CardContent className="pt-6">
            <h3 className="text-lg font-semibold mb-4">Generation History</h3>
            <div className="space-y-4">
              {generations.map((gen) => (
                <Card key={gen.id} className="overflow-hidden">
                  <CardContent className="pt-6">
                    <div className="flex flex-col md:flex-row gap-4">
                      {gen.image_url && (
                        <img
                          src={gen.image_url}
                          alt="Source"
                          className="w-full md:w-32 h-32 object-cover rounded"
                        />
                      )}
                      <div className="flex-1 space-y-2">
                        <p className="font-medium line-clamp-2">{gen.prompt}</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
                          <span className={`font-medium ${getStatusColor(gen.status)}`}>
                            {gen.status.toUpperCase()}
                          </span>
                          <span>•</span>
                          <span>{gen.aspect_ratio} • {gen.n_frames}s</span>
                          <span>•</span>
                          <span>{new Date(gen.created_at).toLocaleDateString()}</span>
                        </div>
                        {gen.fail_msg && (
                          <p className="text-sm text-destructive">{gen.fail_msg}</p>
                        )}
                        {gen.status === 'waiting' && (
                          <div className="space-y-1">
                            <Progress value={33} className="w-full" />
                            <p className="text-xs text-muted-foreground">Generating with Sora 2...</p>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2 items-start">
                        {gen.result_url && (
                          <>
                            <Button variant="outline" size="sm" asChild>
                              <a href={gen.result_url} target="_blank" rel="noopener noreferrer">
                                <Video className="h-4 w-4 mr-1" />
                                View
                              </a>
                            </Button>
                            <Button variant="outline" size="sm" asChild>
                              <a href={gen.result_url} download>
                                <Download className="h-4 w-4" />
                              </a>
                            </Button>
                          </>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(gen.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actor Selection Modal */}
      <ActorSelectionModal
        open={showActorSelector}
        onClose={() => setShowActorSelector(false)}
        onSelectActors={handleActorSelection}
        selectedActors={selectedActors}
      />
    </div>
  );
}