import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Upload, Loader2, Video, Download, Trash2 } from "lucide-react";

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
}

export default function VideoGenerator() {
  const { user } = useAuth();
  const [imageUrl, setImageUrl] = useState("");
  const [prompt, setPrompt] = useState("");
  const [aspectRatio, setAspectRatio] = useState("landscape");
  const [duration, setDuration] = useState("10");
  const [removeWatermark, setRemoveWatermark] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generations, setGenerations] = useState<VideoGeneration[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

  useEffect(() => {
    if (user) {
      fetchGenerations();
      setupRealtimeSubscription();
    }
  }, [user]);

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel('video_generations_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'video_generations',
          filter: `user_id=eq.${user?.id}`,
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
      const { data, error } = await supabase
        .from('video_generations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setGenerations(data || []);
    } catch (error) {
      console.error('Error fetching generations:', error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleGenerate = async () => {
    if (!imageUrl || !prompt) {
      toast.error("Please provide both an image URL and a prompt");
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('sora-create-task', {
        body: {
          image_url: imageUrl,
          prompt,
          aspect_ratio: aspectRatio,
          n_frames: duration,
          remove_watermark: removeWatermark,
        },
      });

      if (error) throw error;

      toast.success("Video generation started! We'll notify you when it's ready.");
      setImageUrl("");
      setPrompt("");
      fetchGenerations();
    } catch (error: any) {
      console.error('Generation error:', error);
      toast.error(error.message || "Failed to start video generation");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('video_generations')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success("Generation deleted");
      fetchGenerations();
    } catch (error) {
      console.error('Delete error:', error);
      toast.error("Failed to delete generation");
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
    <div className="container mx-auto p-6 space-y-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-bold">AI Video Generator</h1>
        <p className="text-muted-foreground">Transform images into stunning videos with Sora 2</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create New Video</CardTitle>
          <CardDescription>Upload an image and describe the motion you want</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="imageUrl">Image URL</Label>
            <Input
              id="imageUrl"
              type="url"
              placeholder="https://example.com/image.jpg"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
            />
            <p className="text-sm text-muted-foreground">
              Must be publicly accessible (max 10MB, JPG/PNG/WEBP)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="prompt">Motion Prompt</Label>
            <Textarea
              id="prompt"
              placeholder="Describe the desired motion and animation..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={4}
              maxLength={5000}
            />
            <p className="text-sm text-muted-foreground">
              {prompt.length}/5000 characters
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="aspectRatio">Aspect Ratio</Label>
              <Select value={aspectRatio} onValueChange={setAspectRatio}>
                <SelectTrigger id="aspectRatio">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="landscape">Landscape</SelectItem>
                  <SelectItem value="portrait">Portrait</SelectItem>
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

          <div className="flex items-center justify-between">
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

          <Button
            onClick={handleGenerate}
            disabled={isGenerating || !imageUrl || !prompt}
            className="w-full"
            size="lg"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Video className="mr-2 h-4 w-4" />
                Generate Video
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Generation History</CardTitle>
          <CardDescription>Your recently generated videos</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingHistory ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : generations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No generations yet. Create your first video above!
            </div>
          ) : (
            <div className="space-y-4">
              {generations.map((gen) => (
                <Card key={gen.id}>
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
                        <p className="font-medium">{gen.prompt}</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span className={`font-medium ${getStatusColor(gen.status)}`}>
                            {gen.status.toUpperCase()}
                          </span>
                          <span>•</span>
                          <span>{gen.aspect_ratio} • {gen.n_frames}s</span>
                          <span>•</span>
                          <span>{new Date(gen.created_at).toLocaleDateString()}</span>
                        </div>
                        {gen.fail_msg && (
                          <p className="text-sm text-red-600">{gen.fail_msg}</p>
                        )}
                        {gen.status === 'waiting' && (
                          <Progress value={33} className="w-full" />
                        )}
                      </div>
                      <div className="flex gap-2">
                        {gen.result_url && (
                          <>
                            <Button variant="outline" size="sm" asChild>
                              <a href={gen.result_url} target="_blank" rel="noopener noreferrer">
                                <Video className="h-4 w-4 mr-2" />
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
  );
}
