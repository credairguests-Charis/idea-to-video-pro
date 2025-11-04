import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Sparkles } from "lucide-react";

interface VideoGeneration {
  id: string;
  prompt: string;
  image_url: string | null;
  aspect_ratio: string;
  n_frames: string;
  remove_watermark: boolean | null;
}

interface RegenerateVideoDialogProps {
  video: VideoGeneration | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function RegenerateVideoDialog({ video, open, onOpenChange, onSuccess }: RegenerateVideoDialogProps) {
  const [prompt, setPrompt] = useState("");
  const [isRegenerating, setIsRegenerating] = useState(false);
  const { toast } = useToast();

  // Update prompt when video changes
  useEffect(() => {
    if (video) {
      setPrompt(video.prompt);
    }
  }, [video]);

  const handleRegenerate = async () => {
    if (!video || !prompt.trim()) {
      toast({
        title: "Error",
        description: "Please enter a prompt",
        variant: "destructive",
      });
      return;
    }

    setIsRegenerating(true);

    try {
      const { data, error } = await supabase.functions.invoke('sora-create-task', {
        body: {
          prompt: prompt.trim(),
          image_url: video.image_url,
          aspect_ratio: video.aspect_ratio,
          n_frames: video.n_frames,
          remove_watermark: video.remove_watermark ?? true,
        },
      });

      if (error) throw error;

      if (data?.success) {
        toast({
          title: "Video Generation Started",
          description: "Your video is being regenerated. You'll be notified when it's ready.",
        });
        onOpenChange(false);
        onSuccess?.();
      } else {
        throw new Error(data?.error || "Failed to start generation");
      }
    } catch (error) {
      console.error("Regeneration error:", error);
      toast({
        title: "Generation Failed",
        description: error instanceof Error ? error.message : "Failed to regenerate video",
        variant: "destructive",
      });
    } finally {
      setIsRegenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Regenerate Video
          </DialogTitle>
          <DialogDescription>
            Modify the prompt below to regenerate this video with the same settings and product image.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {video?.image_url && (
            <div className="space-y-2">
              <Label>Product Image</Label>
              <div className="relative aspect-video w-full max-w-[200px] rounded-md overflow-hidden border bg-muted">
                <img 
                  src={video.image_url} 
                  alt="Product" 
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="prompt">Video Prompt / Script</Label>
            <Textarea
              id="prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Enter your video script or prompt..."
              className="min-h-[120px] resize-none"
              disabled={isRegenerating}
            />
            <p className="text-xs text-muted-foreground">
              Settings: {video?.aspect_ratio} • {video?.n_frames} frames
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isRegenerating}
          >
            Cancel
          </Button>
          <Button
            onClick={handleRegenerate}
            disabled={isRegenerating || !prompt.trim()}
          >
            {isRegenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Regenerating...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Regenerate Video
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
