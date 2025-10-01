import { useState, useCallback } from "react";
import { Users, Upload, Mic, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { AnimatedAIInput } from "@/components/ui/animated-ai-input";
import { ActorCard } from "@/components/ActorCard";
import { VideoGrid } from "@/components/VideoGrid";
import { ActorSelector } from "@/components/ActorSelector";
import { ActorTTSConfig } from "@/components/ActorTTSSettings";

interface SelectedActor {
  id: string;
  name: string;
  thumbnail_url: string;
}

interface VideoProject {
  id: string;
  title: string;
  thumbnail: string;
  videoUrl?: string;
  duration?: string;
  status: 'completed' | 'processing' | 'failed';
}

export function NewProjectArcads() {
  const [projectTitle, setProjectTitle] = useState("");
  const [script, setScript] = useState("");
  const [selectedActors, setSelectedActors] = useState<SelectedActor[]>([]);
  const [actorTTSConfigs, setActorTTSConfigs] = useState<Record<string, ActorTTSConfig>>({});
  const [showActorSelector, setShowActorSelector] = useState(false);
  const [audioSource, setAudioSource] = useState<"tts" | "upload">("tts");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [projects, setProjects] = useState<VideoProject[]>([]);
  const { toast } = useToast();

  // Mock project data for display
  const mockProjects: VideoProject[] = [
    { id: '1', title: 'Still watching...', thumbnail: '/actors/actor-female-1.jpg', status: 'completed', duration: '0:12' },
    { id: '2', title: 'Project 2', thumbnail: '/actors/actor-male-1.jpg', status: 'processing' },
    { id: '3', title: 'Project 3', thumbnail: '/actors/actor-female-2.jpg', status: 'completed', duration: '0:08' },
  ];

  const handleActorSelection = useCallback((actors: SelectedActor[]) => {
    setSelectedActors(actors);
    // Initialize TTS configs for new actors
    const newConfigs = { ...actorTTSConfigs };
    actors.forEach(actor => {
      if (!newConfigs[actor.id]) {
        newConfigs[actor.id] = {
          voice: "alloy",
          accent: "neutral",
          language: "en-US",
          tone: "professional"
        };
      }
    });
    setActorTTSConfigs(newConfigs);
    setShowActorSelector(false);
  }, [actorTTSConfigs]);

  const handleRemoveActor = useCallback((actorId: string) => {
    setSelectedActors(prev => prev.filter(actor => actor.id !== actorId));
    setActorTTSConfigs(prev => {
      const newConfigs = { ...prev };
      delete newConfigs[actorId];
      return newConfigs;
    });
  }, []);

  const handleAudioSelected = useCallback((file: File, duration: number) => {
    setAudioFile(file);
    toast({
      title: "Audio file selected",
      description: `Selected: ${file.name} (${duration}s)`,
    });
  }, [toast]);

  const handleAudioRemoved = useCallback(() => {
    setAudioFile(null);
    toast({
      title: "Audio file removed",
      description: "Audio file has been removed",
    });
  }, [toast]);

  const handleTTSConfigChange = useCallback((actorId: string, config: ActorTTSConfig) => {
    setActorTTSConfigs(prev => ({
      ...prev,
      [actorId]: config
    }));
  }, []);

  const handleCreateProject = useCallback(async () => {
    if (!projectTitle.trim()) {
      toast({
        title: "Title Required",
        description: "Please enter a project title",
        variant: "destructive",
      });
      return;
    }

    if (selectedActors.length === 0) {
      toast({
        title: "No Actors Selected",
        description: "Please select at least one actor",
        variant: "destructive",
      });
      return;
    }

    if (!script.trim() && !audioFile) {
      toast({
        title: "Content Required",
        description: "Please provide either a script or upload an audio file",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      // Create project in database
      const { data: project, error: projectError } = await supabase
        .from("projects")
        .insert({
          title: projectTitle,
          script: script || null,
          selected_actors: selectedActors.map(actor => actor.id),
          audio_source: audioSource,
          generation_status: "pending",
          user_id: (await supabase.auth.getUser()).data.user?.id!
        })
        .select()
        .single();

      if (projectError) throw projectError;

      // Handle audio upload or per-actor TTS generation
      if (audioFile) {
        // Audio upload mode - use same audio for all actors
        const audioPath = `${project.id}/audio/${audioFile.name}`;
        const { error: uploadError } = await supabase.storage
          .from("omnihuman-content")
          .upload(audioPath, audioFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from("omnihuman-content")
          .getPublicUrl(audioPath);

        // Start OmniHuman generation with single audio
        const { data: generationData, error: generationError } = await supabase.functions.invoke('generate-omnihuman', {
          body: {
            projectId: project.id,
            actorIds: selectedActors.map(actor => actor.id),
            audioUrl: publicUrl
          }
        });

        if (generationError) throw generationError;
      } else {
        // TTS mode - generate separate audio for each actor with their specific settings
        for (const actor of selectedActors) {
          const ttsConfig = actorTTSConfigs[actor.id];
          
          // Generate TTS with actor-specific settings
          const { data: ttsData, error: ttsError } = await supabase.functions.invoke('generate-tts', {
            body: { 
              text: script,
              voice: ttsConfig.voice,
              language: ttsConfig.language 
            }
          });

          if (ttsError) throw ttsError;

          if (ttsData?.audioData) {
            const audioBlob = new Blob([
              new Uint8Array(atob(ttsData.audioData).split('').map(c => c.charCodeAt(0)))
            ], { type: 'audio/mp3' });

            const audioPath = `${project.id}/audio/${actor.id}_generated_audio.mp3`;
            const { error: uploadError } = await supabase.storage
              .from("omnihuman-content")
              .upload(audioPath, audioBlob);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
              .from("omnihuman-content")
              .getPublicUrl(audioPath);

            // Start OmniHuman generation for this actor with their specific audio
            const { error: generationError } = await supabase.functions.invoke('generate-omnihuman', {
              body: {
                projectId: project.id,
                actorIds: [actor.id],
                audioUrl: publicUrl,
                ttsConfig
              }
            });

            if (generationError) throw generationError;
          }
        }
      }

      toast({
        title: "Project Created!",
        description: `${selectedActors.length} video(s) are being generated. You'll be notified when they're ready.`,
      });

      // Reset form
      setProjectTitle("");
      setScript("");
      setSelectedActors([]);
      setActorTTSConfigs({});
      setAudioFile(null);
      setAudioSource("tts");

    } catch (error) {
      console.error('Project creation error:', error);
      toast({
        title: "Creation Failed",
        description: error instanceof Error ? error.message : "Failed to create project",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [projectTitle, script, selectedActors, actorTTSConfigs, audioFile, audioSource, toast]);

  const handleVideoClick = (project: VideoProject) => {
    // Handle video playback/preview
    console.log('Video clicked:', project);
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Main Content Area */}
      <div className="flex-1 flex">
        {/* Projects Grid */}
        <div className="flex-1 p-6">
          {mockProjects.length > 0 ? (
            <VideoGrid projects={mockProjects} onVideoClick={handleVideoClick} />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                <Users className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium text-foreground mb-2">
                Generate winning assets with talking actors,
              </h3>
              <p className="text-muted-foreground">
                reactions and more.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Panel - Script Input */}
      <div className="border-t border-border bg-card">
        <div className="max-w-4xl mx-auto p-6">
          {/* Project Title */}
          <div className="mb-4">
            <Input
              placeholder="Project title..."
              value={projectTitle}
              onChange={(e) => setProjectTitle(e.target.value)}
              className="text-sm border-0 bg-transparent focus-visible:ring-0 px-0"
            />
          </div>

          {/* Selected Actors */}
          {selectedActors.length > 0 && (
            <div className="mb-4">
              <div className="flex flex-wrap gap-2">
                {selectedActors.map((actor) => (
                  <ActorCard
                    key={actor.id}
                    actor={actor}
                    onRemove={() => handleRemoveActor(actor.id)}
                    className="max-w-[200px]"
                    showSettings={audioSource === "tts"}
                    ttsConfig={actorTTSConfigs[actor.id]}
                    onTTSConfigChange={handleTTSConfigChange}
                    disabled={isLoading}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Script Input with AI Controls */}
          <div className="mb-4">
            <AnimatedAIInput
              value={script}
              onChange={setScript}
              onSubmit={handleCreateProject}
              placeholder="Write script..."
              disabled={isLoading}
              selectedActors={selectedActors}
              onOpenActorSelector={() => setShowActorSelector(true)}
              audioSource={audioSource}
              onAudioSourceChange={setAudioSource}
              audioFile={audioFile}
              onAudioSelected={(file) => {
                const audio = new Audio(URL.createObjectURL(file));
                audio.addEventListener('loadedmetadata', () => {
                  handleAudioSelected(file, audio.duration);
                });
              }}
              onAudioRemoved={handleAudioRemoved}
            />
          </div>
        </div>
      </div>

      {/* Actor Selection Modal */}
      {showActorSelector && (
        <ActorSelector
          onSelectActors={handleActorSelection}
          onClose={() => setShowActorSelector(false)}
          selectedActors={selectedActors}
        />
      )}
    </div>
  );
}