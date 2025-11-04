import { useState, useCallback } from "react";
import { Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { VideoCard } from "@/components/VideoCard";
import { BottomInputPanel } from "@/components/BottomInputPanel";
import { ActorSelectionModal } from "@/components/ActorSelectionModal";
import { VideoGenerationTracker } from "@/components/VideoGenerationTracker";
import { VideoLibrary } from "@/components/VideoLibrary";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface SelectedActor {
  id: string;
  name: string;
  thumbnail_url: string;
}

interface ProductImage {
  url: string;
  name: string;
  isUploading?: boolean;
}

interface VideoProject {
  id: string;
  title: string;
  thumbnail: string;
  videoUrl?: string;
  duration?: string;
  status: 'completed' | 'processing' | 'failed';
}

interface NewProjectArcadsProps {
  onProjectCreated?: (projectId: string) => void
  projectId?: string
}

export function NewProjectArcads({ onProjectCreated, projectId }: NewProjectArcadsProps = {}) {
  const [script, setScript] = useState("");
  const [selectedActors, setSelectedActors] = useState<SelectedActor[]>([]);
  const [showActorSelector, setShowActorSelector] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<"portrait" | "landscape">("portrait");
  const [isLoading, setIsLoading] = useState(false);
  const [projects, setProjects] = useState<VideoProject[]>([]);
  const [productImage, setProductImage] = useState<ProductImage | null>(null);
  const { toast } = useToast();

  // Mock project data for display
  const mockProjects: VideoProject[] = [
    { id: '1', title: 'Still watching Netflix on', thumbnail: '/actors/actor-female-1.jpg', status: 'completed', duration: '0:12' },
    { id: '2', title: 'Project 2', thumbnail: '/actors/actor-male-1.jpg', status: 'processing' },
    { id: '3', title: 'Project 3', thumbnail: '/actors/actor-female-2.jpg', status: 'completed', duration: '0:08' },
  ];

  const handleActorSelection = useCallback((actors: SelectedActor[]) => {
    setSelectedActors(actors);
    setShowActorSelector(false);
  }, []);

  const handleRemoveActor = useCallback((actorId: string) => {
    setSelectedActors(prev => prev.filter(actor => actor.id !== actorId));
  }, []);

  const handleCreateProject = useCallback(async () => {
    if (!script.trim()) {
      toast({
        title: "Content Required",
        description: "Please provide a script/prompt",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      // DISABLED: OmniHuman/TTS pipeline - migrated to Sora 2 Image-to-Video
      // Generate video using Sora 2
      
      // Enhance prompt if product image is uploaded
      const enhancedPrompt = productImage 
        ? `${script}\n\nShowcase and promote the uploaded product clearly in the generated video.`
        : script;
      
      // If actors are selected, generate one video per actor
      if (selectedActors.length > 0) {
        for (const actor of selectedActors) {
          // Build image_urls array: include actor + product if available
          const imageUrls = productImage 
            ? [actor.thumbnail_url, productImage.url]
            : [actor.thumbnail_url];

          const { data: taskData, error: taskError } = await supabase.functions.invoke('sora-create-task', {
            body: {
              prompt: enhancedPrompt,
              image_urls: imageUrls,
              aspect_ratio: aspectRatio,
              n_frames: "15",
              remove_watermark: true,
              project_id: projectId
            }
          });

          if (taskError) {
            throw new Error(`Sora 2 Error for ${actor.name}: ${taskError.message}`);
          }

          if (!taskData?.success) {
            throw new Error(`Sora 2 Error for ${actor.name}: ${taskData?.error || "Unknown error"}`);
          }
        }
        
        toast({
          title: "Generation Started!",
          description: `${selectedActors.length} video(s) are being generated with Sora 2. You'll be notified when ready.`,
        });
      } 
      // If product image is uploaded but no actors, use product image
      else if (productImage) {
        const { data: taskData, error: taskError } = await supabase.functions.invoke('sora-create-task', {
          body: {
            prompt: enhancedPrompt,
            image_urls: [productImage.url],
            aspect_ratio: aspectRatio,
            n_frames: "15",
            remove_watermark: true,
            project_id: projectId
          }
        });

        if (taskError) {
          throw new Error(`Sora 2 Error: ${taskError.message}`);
        }

        if (!taskData?.success) {
          throw new Error(`Sora 2 Error: ${taskData?.error || "Unknown error"}`);
        }
        
        toast({
          title: "Generation Started!",
          description: "Video is being generated with Sora 2. You'll be notified when ready.",
        });
      }
      // No actors or product image - generate from prompt only
      else {
        const { data: taskData, error: taskError } = await supabase.functions.invoke('sora-create-task', {
          body: {
            prompt: script,
            aspect_ratio: aspectRatio,
            n_frames: "15",
            remove_watermark: true,
            project_id: projectId
          }
        });

        if (taskError) {
          throw new Error(`Sora 2 Error: ${taskError.message}`);
        }

        if (!taskData?.success) {
          throw new Error(`Sora 2 Error: ${taskData?.error || "Unknown error"}`);
        }
        
        toast({
          title: "Generation Started!",
          description: "Video is being generated with Sora 2. You'll be notified when ready.",
        });
      }

      // Reset form
      setScript("");
      setSelectedActors([]);
      setProductImage(null);
      setAspectRatio("portrait");

    } catch (error) {
      console.error('Video generation error:', error);
      toast({
        title: "Generation Failed",
        description: error instanceof Error ? error.message : "Failed to generate video",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [script, selectedActors, productImage, aspectRatio, toast]);

  const handleVideoClick = (project: VideoProject) => {
    // Handle video playback/preview
    console.log('Video clicked:', project);
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#F7F7F8]">
      {/* Main Content Area */}
      <div className="flex-1 overflow-auto pb-[200px]">
        <Tabs defaultValue="generate" className="h-full">
          <div className="px-6 pt-6">
            <TabsList>
              <TabsTrigger value="generate">Generate</TabsTrigger>
              <TabsTrigger value="library">Video Library</TabsTrigger>
            </TabsList>
          </div>
          
          <TabsContent value="generate" className="h-full">
            <div className="flex items-center justify-center h-full pb-12">
              <div className="text-center max-w-md">
                <div className="mb-6 flex justify-center">
                  <Users className="h-20 w-20 text-gray-300" />
                </div>
                <h3 className="text-xl font-medium text-gray-600 mb-1">
                  Generate winning assets with talking actors,
                </h3>
                <p className="text-lg text-gray-500">
                  reactions and more.
                </p>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="library" className="px-6 pb-6">
            <VideoLibrary />
          </TabsContent>
        </Tabs>
      </div>

      {/* Bottom Input Panel */}
      <BottomInputPanel
        script={script}
        onScriptChange={setScript}
        selectedActors={selectedActors}
        onRemoveActor={handleRemoveActor}
        onOpenActorSelector={() => setShowActorSelector(true)}
        aspectRatio={aspectRatio}
        onAspectRatioChange={setAspectRatio}
        onSubmit={handleCreateProject}
        isLoading={isLoading}
        productImage={productImage}
        onProductImageChange={setProductImage}
      />

      {/* Actor Selection Modal */}
      <ActorSelectionModal
        open={showActorSelector}
        onClose={() => setShowActorSelector(false)}
        onSelectActors={handleActorSelection}
        selectedActors={selectedActors}
      />

      {/* Video Generation Tracker */}
      <VideoGenerationTracker />
    </div>
  );
}