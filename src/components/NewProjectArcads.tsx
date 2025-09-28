import { useState, useCallback } from "react";
import { Users, Upload, Mic, Plus, X, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { AnimatedAIInput } from "@/components/ui/animated-ai-input";
import { ActorSelector } from "@/components/ActorSelector";
import { ActorCard } from "@/components/ActorCard";
import { AudioUpload } from "@/components/AudioUpload";
import { TTSControls } from "@/components/TTSControls";
import { VideoGrid } from "@/components/VideoGrid";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
    setShowActorSelector(false);
  }, []);

  const handleRemoveActor = useCallback((actorId: string) => {
    setSelectedActors(prev => prev.filter(actor => actor.id !== actorId));
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

  const handleGenerateTTS = useCallback(async (voice: string, language: string) => {
    if (!script.trim()) {
      toast({
        title: "Script Required",
        description: "Please enter a script to generate audio",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-tts', {
        body: { text: script, voice }
      });

      if (error) throw error;

      if (data?.audioData) {
        const audioBlob = new Blob([
          new Uint8Array(atob(data.audioData).split('').map(c => c.charCodeAt(0)))
        ], { type: 'audio/mp3' });
        const audioFile = new File([audioBlob], 'generated_audio.mp3', { type: 'audio/mp3' });
        setAudioFile(audioFile);
        toast({
          title: "TTS Generated",
          description: "Audio has been generated successfully",
        });
      }
    } catch (error) {
      console.error('TTS generation error:', error);
      toast({
        title: "TTS Generation Failed",
        description: "Failed to generate audio from text",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [script, toast]);

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

      let audioUrl = null;

      // Handle audio upload or TTS
      if (audioFile) {
        const audioPath = `${project.id}/audio/${audioFile.name}`;
        const { error: uploadError } = await supabase.storage
          .from("omnihuman-content")
          .upload(audioPath, audioFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from("omnihuman-content")
          .getPublicUrl(audioPath);

        audioUrl = publicUrl;
      } else {
        // Generate TTS first
        const { data: ttsData, error: ttsError } = await supabase.functions.invoke('generate-tts', {
          body: { text: script }
        });

        if (ttsError) throw ttsError;

        if (ttsData?.audioData) {
          const audioBlob = new Blob([
            new Uint8Array(atob(ttsData.audioData).split('').map(c => c.charCodeAt(0)))
          ], { type: 'audio/mp3' });

          const audioPath = `${project.id}/audio/generated_audio.mp3`;
          const { error: uploadError } = await supabase.storage
            .from("omnihuman-content")
            .upload(audioPath, audioBlob);

          if (uploadError) throw uploadError;

          const { data: { publicUrl } } = supabase.storage
            .from("omnihuman-content")
            .getPublicUrl(audioPath);

          audioUrl = publicUrl;
        }
      }

      // Start OmniHuman generation
      const { data: generationData, error: generationError } = await supabase.functions.invoke('generate-omnihuman', {
        body: {
          projectId: project.id,
          actorIds: selectedActors.map(actor => actor.id),
          audioUrl
        }
      });

      if (generationError) throw generationError;

      toast({
        title: "Project Created!",
        description: `${selectedActors.length} video(s) are being generated. You'll be notified when they're ready.`,
      });

      // Reset form
      setProjectTitle("");
      setScript("");
      setSelectedActors([]);
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
  }, [projectTitle, script, selectedActors, audioFile, audioSource, toast]);

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
            />
          </div>

          {/* Audio Source Selection */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Audio Source Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-2 text-sm">
                    <Mic className="w-4 h-4" />
                    {audioSource === "tts" ? "Text to Speech" : "Audio Upload"}
                    <ChevronDown className="w-3 h-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-48">
                  <DropdownMenuItem onClick={() => setAudioSource("tts")}>
                    <Mic className="w-4 h-4 mr-2" />
                    Text to Speech
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setAudioSource("upload")}>
                    <Upload className="w-4 h-4 mr-2" />
                    Audio Upload
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Audio Controls */}
              {audioSource === "upload" ? (
                <AudioUpload
                  onAudioSelected={handleAudioSelected}
                  onAudioRemoved={handleAudioRemoved}
                  disabled={isLoading}
                />
              ) : (
                <TTSControls
                  onGenerate={handleGenerateTTS}
                  disabled={isLoading}
                  isGenerating={isLoading}
                />
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowActorSelector(true)}
                className="gap-2"
              >
                <Users className="w-4 h-4" />
                Add actors
              </Button>

              <Button
                size="sm"
                onClick={handleCreateProject}
                disabled={isLoading || !projectTitle.trim() || selectedActors.length === 0}
                className="gap-2"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                Create
              </Button>
            </div>
          </div>

          {/* Character count */}
          <div className="flex justify-end mt-2">
            <span className="text-xs text-muted-foreground">
              {script.length} / 1349
            </span>
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