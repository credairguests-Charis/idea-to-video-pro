import { useState, useCallback } from "react";
import { Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { VideoCard } from "@/components/VideoCard";
import { BottomInputPanel } from "@/components/BottomInputPanel";
import { ActorSelectionModal } from "@/components/ActorSelectionModal";
import { VideoGenerationTracker } from "@/components/VideoGenerationTracker";
import { VideoLibrary } from "@/components/VideoLibrary";

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
  mode?: 'generate' | 'library'
}

export function NewProjectArcads({ onProjectCreated, projectId, mode = 'generate' }: NewProjectArcadsProps = {}) {
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

  const handleBulkGenerate = useCallback(async (count: number) => {
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
      // Update project title from script if it's still "Untitled Project"
      if (projectId) {
        const { data: currentProject } = await supabase
          .from('projects')
          .select('title')
          .eq('id', projectId)
          .single();
        
        if (currentProject?.title === 'Untitled Project') {
          const words = script.trim().split(/\s+/);
          const titleWords = words.slice(0, 10);
          let newTitle = titleWords.join(' ');
          if (words.length > 10) {
            newTitle += '...';
          }
          if (newTitle.length > 60) {
            newTitle = newTitle.substring(0, 57) + '...';
          }
          
          await supabase
            .from('projects')
            .update({ title: newTitle, script: script })
            .eq('id', projectId);
        } else {
          await supabase
            .from('projects')
            .update({ script: script })
            .eq('id', projectId);
        }
      }
      
      const enhancedPrompt = productImage 
        ? `${script}\n\nShowcase and promote the uploaded product clearly in the generated video.`
        : script;

      // Generate multiple videos simultaneously
      const generationPromises = [];
      
      for (let i = 0; i < count; i++) {
        // If actors are selected, use them (cycle through if count > actors.length)
        if (selectedActors.length > 0) {
          const actor = selectedActors[i % selectedActors.length];
          const imageUrls = productImage 
            ? [actor.thumbnail_url, productImage.url]
            : [actor.thumbnail_url];

          generationPromises.push(
            supabase.functions.invoke('sora-create-task', {
              body: {
                prompt: enhancedPrompt,
                image_urls: imageUrls,
                aspect_ratio: aspectRatio,
                n_frames: "15",
                remove_watermark: true,
                project_id: projectId
              }
            })
          );
        } 
        // If product image but no actors
        else if (productImage) {
          generationPromises.push(
            supabase.functions.invoke('sora-create-task', {
              body: {
                prompt: enhancedPrompt,
                image_urls: [productImage.url],
                aspect_ratio: aspectRatio,
                n_frames: "15",
                remove_watermark: true,
                project_id: projectId
              }
            })
          );
        }
        // No actors or product - prompt only
        else {
          generationPromises.push(
            supabase.functions.invoke('sora-create-task', {
              body: {
                prompt: script,
                aspect_ratio: aspectRatio,
                n_frames: "15",
                remove_watermark: true,
                project_id: projectId
              }
            })
          );
        }
      }

      // Execute all generations in parallel
      const results = await Promise.allSettled(generationPromises);
      
      // Count successes and failures
      const successful = results.filter(r => r.status === 'fulfilled' && r.value.data?.success).length;
      const failed = results.length - successful;

      if (successful > 0) {
        toast({
          title: "Bulk Generation Started!",
          description: `${successful} video${successful > 1 ? 's are' : ' is'} being generated with Sora 2. ${failed > 0 ? `(${failed} failed)` : ''}`,
        });
      } else {
        throw new Error("All bulk generation requests failed");
      }

      // Reset form
      setScript("");
      setSelectedActors([]);

    } catch (error) {
      console.error('Bulk generation error:', error);
      toast({
        title: "Bulk Generation Failed",
        description: error instanceof Error ? error.message : "Failed to generate videos",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [script, selectedActors, productImage, aspectRatio, toast, projectId]);

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
      // Update project title from script if it's still "Untitled Project"
      if (projectId) {
        const { data: currentProject } = await supabase
          .from('projects')
          .select('title')
          .eq('id', projectId)
          .single();
        
        if (currentProject?.title === 'Untitled Project') {
          // Auto-generate title from script
          const words = script.trim().split(/\s+/);
          const titleWords = words.slice(0, 10);
          let newTitle = titleWords.join(' ');
          if (words.length > 10) {
            newTitle += '...';
          }
          if (newTitle.length > 60) {
            newTitle = newTitle.substring(0, 57) + '...';
          }
          
          await supabase
            .from('projects')
            .update({ title: newTitle, script: script })
            .eq('id', projectId);
        } else {
          // Just update the script
          await supabase
            .from('projects')
            .update({ script: script })
            .eq('id', projectId);
        }
      }
      
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

      // Reset form (keep product image and aspect ratio for multiple generations)
      setScript("");
      setSelectedActors([]);

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
  }, [script, selectedActors, productImage, aspectRatio, toast, projectId]);

  const handleVideoClick = (project: VideoProject) => {
    // Handle video playback/preview
    console.log('Video clicked:', project);
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#F7F7F8]">
      {/* Main Content Area */}
      <div className="flex-1 overflow-auto pb-[200px] md:pb-[200px]">
        {mode === 'generate' ? (
          <div className="flex items-center justify-center h-full pb-12 px-4">
            <div className="text-center max-w-md">
              <div className="mb-6 flex justify-center">
                <Users className="h-16 w-16 md:h-20 md:w-20 text-gray-300" />
              </div>
              <h3 className="text-lg md:text-xl font-medium text-gray-600 mb-1">
                Generate winning assets with talking actors,
              </h3>
              <p className="text-base md:text-lg text-gray-500">
                reactions and more.
              </p>
            </div>
          </div>
        ) : (
          <div className="px-2 md:px-6 pt-4 md:pt-6 pb-6">
            <VideoLibrary projectId={projectId} />
          </div>
        )}
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
        onBulkGenerate={handleBulkGenerate}
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