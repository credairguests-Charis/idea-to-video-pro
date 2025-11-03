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
    <div className="flex flex-col h-screen overflow-hidden bg-background">
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="mb-4 flex justify-center">
            <Video className="h-16 w-16 text-primary" />
          </div>
          <h1 className="text-3xl font-bold mb-2">AI Video Generator with Sora 2</h1>
          <p className="text-muted-foreground">
            Select actors and describe the motion to create stunning AI-generated videos
          </p>
        </div>

        {/* Generation Form */}
        <Card className="max-w-3xl mx-auto">
          <CardContent className="pt-6 space-y-6">
            {/* Actor Selection */}
            <div className="space-y-2">
              <Label>Selected Actors ({selectedActors.length})</Label>
              <div className="flex flex-wrap gap-2 min-h-[60px] p-3 border rounded-md">
                {selectedActors.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No actors selected</p>
                ) : (
                  selectedActors.map((actor) => (
                    <div key={actor.id} className="relative group">
                      <img
                        src={actor.thumbnail_url}
                        alt={actor.name}
                        className="h-16 w-16 rounded-md object-cover border-2 border-primary"
                      />
                      <button
                        onClick={() => handleRemoveActor(actor.id)}
                        className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full h-5 w-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        ×
                      </button>
                      <p className="text-xs text-center mt-1 truncate w-16">{actor.name}</p>
                    </div>
                  ))
                )}
              </div>
              <Button
                variant="outline"
                onClick={() => setShowActorSelector(true)}
                className="w-full"
              >
                <Users className="h-4 w-4 mr-2" />
                {selectedActors.length === 0 ? 'Select Actors' : 'Change Actors'}
              </Button>
            </div>

            {/* Motion Prompt */}
            <div className="space-y-2">
              <Label htmlFor="prompt">Motion Prompt</Label>
              <Textarea
                id="prompt"
                placeholder="Describe the desired motion and animation for your video..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={4}
                maxLength={5000}
              />
              <p className="text-sm text-muted-foreground">
                {prompt.length}/5000 characters
              </p>
            </div>

            {/* Video Settings */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="aspectRatio">Aspect Ratio</Label>
                <Select value={aspectRatio} onValueChange={setAspectRatio}>
                  <SelectTrigger id="aspectRatio">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="portrait">Portrait (9:16)</SelectItem>
                    <SelectItem value="landscape">Landscape (16:9)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="duration">Duration</Label>
                <Select value={duration} onValueChange={setDuration}>
                  <SelectTrigger id="duration">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10 seconds</SelectItem>
                    <SelectItem value="15">15 seconds</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Remove Watermark */}
            <div className="flex items-center justify-between p-3 border rounded-md">
              <div className="space-y-0.5">
                <Label htmlFor="watermark">Remove Watermark</Label>
                <p className="text-sm text-muted-foreground">
                  Generate videos without watermarks
                </p>
              </div>
              <Switch
                id="watermark"
                checked={removeWatermark}
                onCheckedChange={setRemoveWatermark}
              />
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
                  Generate {selectedActors.length} Video{selectedActors.length !== 1 ? 's' : ''} with Sora 2
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Generation History */}
        <Card className="max-w-3xl mx-auto">
          <CardContent className="pt-6">
            <h3 className="text-lg font-semibold mb-4">Generation History</h3>
            {generations.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No generations yet. Create your first video above!
              </div>
            ) : (
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
            )}
          </CardContent>
        </Card>
      </div>

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